// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {IDexAdapter} from "./interfaces/IDexAdapter.sol";

/// @title AggregatorRouter — XAUConnect's fee-capturing swap entrypoint
/// @notice Every aggregated swap flows through here:
///         1. pull input from the user (ERC20 or native)
///         2. skim the protocol swap fee (25–75 bps, FeeCollector-configured)
///         3. forward the net input to the chosen venue adapter
///            (Uniswap V2/V3, PancakeSwap, QuickSwap, Sushi, ... — one adapter
///            per protocol family, registered by id)
///         4. enforce the user's global minAmountOut via balance delta
/// @dev UUPS upgradeable; adapters are called (never delegatecalled) so a
///      malicious adapter cannot touch router storage. Adding a venue is a
///      single `setAdapter` call — mirrors `DEXES` in the shared utils package.
contract AggregatorRouter is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADAPTER_MANAGER_ROLE = keccak256("ADAPTER_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    uint256 private constant BPS = 10_000;

    IFeeCollector public feeCollector;
    /// @notice adapter id (e.g. keccak256("uniswap-v2")) => adapter contract
    mapping(bytes32 => address) public adapters;

    event AdapterSet(bytes32 indexed id, address adapter);
    event SwapExecuted(
        bytes32 indexed adapterId,
        address indexed user,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 protocolFee,
        uint256 amountOut
    );

    error DeadlineExpired();
    error UnknownAdapter();
    error InvalidAmount();
    error NativeValueMismatch();
    error InsufficientOutput();
    error ZeroAddress();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin, address feeCollector_) external initializer {
        if (admin == address(0) || feeCollector_ == address(0)) revert ZeroAddress();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADAPTER_MANAGER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        feeCollector = IFeeCollector(feeCollector_);
    }

    // ── Adapter registry ───────────────────────────────────────────────────

    function setAdapter(bytes32 id, address adapter) external onlyRole(ADAPTER_MANAGER_ROLE) {
        adapters[id] = adapter; // zero address disables the venue
        emit AdapterSet(id, adapter);
    }

    // ── Swap ───────────────────────────────────────────────────────────────

    /// @notice Execute an aggregated swap through a registered venue.
    /// @param adapterId   registered venue adapter id
    /// @param tokenIn     input token (NATIVE pseudo-address for the coin)
    /// @param tokenOut    output token
    /// @param amountIn    gross input amount (fee is skimmed from this)
    /// @param minAmountOut global slippage floor on the user's received amount
    /// @param adapterData venue-specific routing data (e.g. encoded path)
    /// @param deadline    unix deadline
    function swap(
        bytes32 adapterId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata adapterData,
        uint256 deadline
    ) external payable nonReentrant whenNotPaused returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert DeadlineExpired();
        if (amountIn == 0) revert InvalidAmount();
        address adapter = adapters[adapterId];
        if (adapter == address(0)) revert UnknownAdapter();

        uint256 fee = (amountIn * feeCollector.swapFeeBps()) / BPS;
        uint256 netIn = amountIn - fee;

        uint256 balanceBefore = _balanceOf(tokenOut, msg.sender);

        if (tokenIn == NATIVE) {
            if (msg.value != amountIn) revert NativeValueMismatch();
            feeCollector.notifyFee{value: fee}(IFeeCollector.FeeKind.SWAP, NATIVE, fee, msg.sender);
            amountOut = IDexAdapter(adapter).swap{value: netIn}(
                tokenIn, tokenOut, netIn, minAmountOut, msg.sender, adapterData
            );
        } else {
            if (msg.value != 0) revert NativeValueMismatch();
            // Pull fee directly into the collector, net input into the adapter.
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(feeCollector), fee);
            feeCollector.notifyFee(IFeeCollector.FeeKind.SWAP, tokenIn, fee, msg.sender);
            IERC20(tokenIn).safeTransferFrom(msg.sender, adapter, netIn);
            amountOut = IDexAdapter(adapter).swap(
                tokenIn, tokenOut, netIn, minAmountOut, msg.sender, adapterData
            );
        }

        // Defense in depth: verify the user actually received >= minAmountOut,
        // independent of what the adapter reports.
        uint256 received = _balanceOf(tokenOut, msg.sender) - balanceBefore;
        if (received < minAmountOut) revert InsufficientOutput();

        emit SwapExecuted(adapterId, msg.sender, tokenIn, tokenOut, amountIn, fee, received);
        return received;
    }

    function _balanceOf(address token, address account) private view returns (uint256) {
        if (token == NATIVE) return account.balance;
        return IERC20(token).balanceOf(account);
    }

    // ── Emergency controls ─────────────────────────────────────────────────

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ── UUPS ───────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    receive() external payable {}
}
