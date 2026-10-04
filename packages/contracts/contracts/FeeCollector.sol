// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";

/// @title FeeCollector — XAUConnect protocol fee vault & configuration
/// @notice Single per-chain source of truth for all protocol fees:
///         - swap fee (25–75 bps, charged by AggregatorRouter)
///         - LP fee (0–100 bps, charged by LiquidityZap)
///         - bonding-curve fee (0–200 bps, charged by Launchpad)
///         - flat launch & listing fees in native coin
///         Collected fees accumulate here until withdrawn by treasury.
/// @dev UUPS upgradeable. Roles:
///      DEFAULT_ADMIN_ROLE — upgrade + role management
///      FEE_MANAGER_ROLE   — fee parameter changes (admin dashboard hot-config)
///      WITHDRAWER_ROLE    — treasury withdrawals
contract FeeCollector is Initializable, UUPSUpgradeable, AccessControlUpgradeable, IFeeCollector {
    using SafeERC20 for IERC20;

    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");
    bytes32 public constant WITHDRAWER_ROLE = keccak256("WITHDRAWER_ROLE");

    /// @notice Hard protocol bounds — mirrored in the shared utils fees.ts (admin dashboard).
    uint16 public constant SWAP_FEE_MIN_BPS = 0;
    uint16 public constant SWAP_FEE_MAX_BPS = 10_000;
    uint16 public constant LP_FEE_MAX_BPS = 100;
    uint16 public constant CURVE_FEE_MAX_BPS = 200;

    uint16 public override swapFeeBps;
    uint16 public override lpFeeBps;
    uint16 public override curveFeeBps;
    uint256 public override launchFeeNative;
    uint256 public override listingFeeNative;

    /// @notice Lifetime fees per kind per token — powers revenue analytics.
    mapping(FeeKind => mapping(address => uint256)) public totalCollected;

    /// @notice Default destination for treasury withdrawals (protocol fee-collector hot wallet).
    address public withdrawalRecipient;

    event FeeReceived(FeeKind indexed kind, address indexed token, uint256 amount, address payer);
    event WithdrawalRecipientUpdated(address indexed recipient);
    event SwapFeeUpdated(uint16 bps);
    event LpFeeUpdated(uint16 bps);
    event CurveFeeUpdated(uint16 bps);
    event LaunchFeeUpdated(uint256 amount);
    event ListingFeeUpdated(uint256 amount);
    event Withdrawal(address indexed token, address indexed to, uint256 amount);

    error FeeOutOfBounds();
    error NativeAmountMismatch();
    error ZeroAddress();

    /// @dev Native coin marker shared across the suite.
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) external initializer {
        if (admin == address(0)) revert ZeroAddress();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FEE_MANAGER_ROLE, admin);
        _grantRole(WITHDRAWER_ROLE, admin);

        swapFeeBps = 30; // 0.30% default
        lpFeeBps = 10; // 0.10%
        curveFeeBps = 100; // 1.00%
        launchFeeNative = 0.01 ether;
        listingFeeNative = 0.005 ether;
    }

    // ── Fee intake ─────────────────────────────────────────────────────────

    /// @inheritdoc IFeeCollector
    function notifyFee(FeeKind kind, address token, uint256 amount, address payer)
        external
        payable
        override
    {
        if (token == NATIVE) {
            if (msg.value != amount) revert NativeAmountMismatch();
        }
        // ERC20 fees must already sit in this contract (transferred by caller
        // in the same tx); accounting is event/aggregate based.
        totalCollected[kind][token] += amount;
        emit FeeReceived(kind, token, amount, payer);
    }

    receive() external payable {}

    // ── Configuration (admin dashboard) ────────────────────────────────────

    function setSwapFeeBps(uint16 bps) external onlyRole(FEE_MANAGER_ROLE) {
        if (bps < SWAP_FEE_MIN_BPS || bps > SWAP_FEE_MAX_BPS) revert FeeOutOfBounds();
        swapFeeBps = bps;
        emit SwapFeeUpdated(bps);
    }

    function setLpFeeBps(uint16 bps) external onlyRole(FEE_MANAGER_ROLE) {
        if (bps > LP_FEE_MAX_BPS) revert FeeOutOfBounds();
        lpFeeBps = bps;
        emit LpFeeUpdated(bps);
    }

    function setCurveFeeBps(uint16 bps) external onlyRole(FEE_MANAGER_ROLE) {
        if (bps > CURVE_FEE_MAX_BPS) revert FeeOutOfBounds();
        curveFeeBps = bps;
        emit CurveFeeUpdated(bps);
    }

    function setLaunchFeeNative(uint256 amount) external onlyRole(FEE_MANAGER_ROLE) {
        launchFeeNative = amount;
        emit LaunchFeeUpdated(amount);
    }

    function setListingFeeNative(uint256 amount) external onlyRole(FEE_MANAGER_ROLE) {
        listingFeeNative = amount;
        emit ListingFeeUpdated(amount);
    }

    // ── Treasury withdrawals ───────────────────────────────────────────────

    function setWithdrawalRecipient(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert ZeroAddress();
        withdrawalRecipient = recipient;
        emit WithdrawalRecipientUpdated(recipient);
    }

    /// @notice Withdraw to the configured protocol fee-collector wallet.
    function withdrawToRecipient(address token, uint256 amount) external onlyRole(WITHDRAWER_ROLE) {
        if (withdrawalRecipient == address(0)) revert ZeroAddress();
        withdraw(token, payable(withdrawalRecipient), amount);
    }

    function withdraw(address token, address payable to, uint256 amount)
        public
        onlyRole(WITHDRAWER_ROLE)
    {
        if (to == address(0)) revert ZeroAddress();
        if (withdrawalRecipient != address(0) && to != withdrawalRecipient) revert ZeroAddress();
        if (token == NATIVE) {
            (bool ok,) = to.call{value: amount}("");
            require(ok, "FeeCollector: native transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
        emit Withdrawal(token, to, amount);
    }

    // ── UUPS ───────────────────────────────────────────────────────────────

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
