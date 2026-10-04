// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {IUniswapV2Router02} from "./interfaces/IUniswapV2.sol";
import {LaunchedToken} from "./tokens/LaunchedToken.sol";

/// @title Launchpad — pump.fun-style bonding-curve fair launches
/// @notice Flow:
///         1. `createLaunch` deploys a fixed-supply token held by the curve
///            (CURVE_SUPPLY sellable + LP_RESERVE held back for graduation).
///         2. Anyone buys/sells against a constant-product virtual curve;
///            the protocol skims `curveFeeBps` (default 1%) on every trade.
///         3. When the curve accumulates `graduationTarget` native, anyone can
///            `graduate`: remaining native + LP_RESERVE tokens are deposited
///            into the configured V2 DEX (PancakeSwap/Uniswap), and the LP
///            tokens are burned (liquidity locked forever).
/// @dev Curve math: x*y=k with x = virtualNative + realNative and
///      y = curve tokens remaining. Virtual reserve makes the starting price
///      non-zero and the curve smooth, exactly like pump.fun.
contract Launchpad is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    address public constant LP_BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint256 private constant BPS = 10_000;

    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18;
    uint256 public constant CURVE_SUPPLY = 800_000_000e18;
    uint256 public constant LP_RESERVE = 200_000_000e18;

    IFeeCollector public feeCollector;
    /// @notice DEX router used for graduation liquidity (e.g. PancakeSwap V2).
    IUniswapV2Router02 public graduationRouter;
    /// @notice Virtual native reserve seeding the curve price.
    uint256 public virtualNative;
    /// @notice Real native accumulated before a launch can graduate.
    uint256 public graduationTarget;

    struct Curve {
        address creator;
        uint128 realNative; // native held by this curve
        uint128 tokenReserve; // curve tokens still unsold (y)
        bool graduated;
        uint64 createdAt;
    }

    mapping(address => Curve) public curves;
    address[] public allLaunches;

    event LaunchCreated(
        address indexed token, address indexed creator, string name, string symbol, string metadataURI
    );
    event CurveBuy(
        address indexed token, address indexed buyer, uint256 nativeIn, uint256 fee, uint256 tokensOut
    );
    event CurveSell(
        address indexed token, address indexed seller, uint256 tokensIn, uint256 fee, uint256 nativeOut
    );
    event Graduated(address indexed token, uint256 nativeLiquidity, uint256 tokenLiquidity);
    event ParamsUpdated(uint256 virtualNative, uint256 graduationTarget);

    error InsufficientLaunchFee();
    error UnknownCurve();
    error AlreadyGraduated();
    error NotReadyToGraduate();
    error SlippageExceeded();
    error InvalidAmount();
    error ZeroAddress();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin,
        address feeCollector_,
        address graduationRouter_,
        uint256 virtualNative_,
        uint256 graduationTarget_
    ) external initializer {
        if (admin == address(0) || feeCollector_ == address(0)) revert ZeroAddress();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        feeCollector = IFeeCollector(feeCollector_);
        graduationRouter = IUniswapV2Router02(graduationRouter_);
        virtualNative = virtualNative_;
        graduationTarget = graduationTarget_;
    }

    // ── Launch ─────────────────────────────────────────────────────────────

    /// @notice Deploy a bonding-curve token. Launch fee in native, excess
    ///         is treated as the creator's initial buy.
    function createLaunch(
        string calldata name,
        string calldata symbol,
        string calldata metadataURI
    ) external payable nonReentrant returns (address token) {
        uint256 launchFee = feeCollector.launchFeeNative();
        if (msg.value < launchFee) revert InsufficientLaunchFee();
        feeCollector.notifyFee{value: launchFee}(
            IFeeCollector.FeeKind.LAUNCH, NATIVE, launchFee, msg.sender
        );

        token = address(
            new LaunchedToken(name, symbol, TOTAL_SUPPLY, address(this), msg.sender, metadataURI)
        );
        curves[token] = Curve({
            creator: msg.sender,
            realNative: 0,
            tokenReserve: uint128(CURVE_SUPPLY),
            graduated: false,
            createdAt: uint64(block.timestamp)
        });
        allLaunches.push(token);
        emit LaunchCreated(token, msg.sender, name, symbol, metadataURI);

        // Optional dev first-buy with the remaining value.
        uint256 remainder = msg.value - launchFee;
        if (remainder > 0) {
            _buy(token, remainder, 0);
        }
    }

    // ── Trading ────────────────────────────────────────────────────────────

    function buy(address token, uint256 minTokensOut) external payable nonReentrant {
        if (msg.value == 0) revert InvalidAmount();
        _buy(token, msg.value, minTokensOut);
    }

    function _buy(address token, uint256 nativeIn, uint256 minTokensOut) private {
        Curve storage c = _activeCurve(token);

        uint256 fee = (nativeIn * feeCollector.curveFeeBps()) / BPS;
        feeCollector.notifyFee{value: fee}(IFeeCollector.FeeKind.CURVE, NATIVE, fee, msg.sender);
        uint256 netIn = nativeIn - fee;

        uint256 x = virtualNative + c.realNative;
        uint256 y = c.tokenReserve;
        uint256 k = x * y;
        uint256 tokensOut = y - (k / (x + netIn));
        if (tokensOut < minTokensOut) revert SlippageExceeded();
        if (tokensOut > y) tokensOut = y;

        c.realNative += uint128(netIn);
        c.tokenReserve = uint128(y - tokensOut);

        IERC20(token).safeTransfer(msg.sender, tokensOut);
        emit CurveBuy(token, msg.sender, nativeIn, fee, tokensOut);
    }

    function sell(address token, uint256 tokensIn, uint256 minNativeOut) external nonReentrant {
        if (tokensIn == 0) revert InvalidAmount();
        Curve storage c = _activeCurve(token);

        IERC20(token).safeTransferFrom(msg.sender, address(this), tokensIn);

        uint256 x = virtualNative + c.realNative;
        uint256 y = c.tokenReserve;
        uint256 k = x * y;
        uint256 grossOut = x - (k / (y + tokensIn));
        // The curve can never pay out more real native than it holds.
        if (grossOut > c.realNative) grossOut = c.realNative;

        uint256 fee = (grossOut * feeCollector.curveFeeBps()) / BPS;
        uint256 netOut = grossOut - fee;
        if (netOut < minNativeOut) revert SlippageExceeded();

        c.realNative -= uint128(grossOut);
        c.tokenReserve = uint128(y + tokensIn);

        feeCollector.notifyFee{value: fee}(IFeeCollector.FeeKind.CURVE, NATIVE, fee, msg.sender);
        (bool ok,) = msg.sender.call{value: netOut}("");
        require(ok, "Launchpad: native transfer failed");

        emit CurveSell(token, msg.sender, tokensIn, fee, netOut);
    }

    // ── Quotes (frontend helpers) ──────────────────────────────────────────

    function quoteBuy(address token, uint256 nativeIn) external view returns (uint256 tokensOut) {
        Curve storage c = curves[token];
        uint256 netIn = nativeIn - (nativeIn * feeCollector.curveFeeBps()) / BPS;
        uint256 x = virtualNative + c.realNative;
        uint256 y = c.tokenReserve;
        tokensOut = y - ((x * y) / (x + netIn));
    }

    function quoteSell(address token, uint256 tokensIn) external view returns (uint256 nativeOut) {
        Curve storage c = curves[token];
        uint256 x = virtualNative + c.realNative;
        uint256 y = c.tokenReserve;
        uint256 grossOut = x - ((x * y) / (y + tokensIn));
        if (grossOut > c.realNative) grossOut = c.realNative;
        nativeOut = grossOut - (grossOut * feeCollector.curveFeeBps()) / BPS;
    }

    /// @notice Curve progress toward graduation in bps (10000 = ready).
    function graduationProgressBps(address token) external view returns (uint256) {
        Curve storage c = curves[token];
        if (graduationTarget == 0) return 0;
        uint256 progress = (uint256(c.realNative) * BPS) / graduationTarget;
        return progress > BPS ? BPS : progress;
    }

    // ── Graduation ─────────────────────────────────────────────────────────

    /// @notice Permissionless: once the target is met, migrate liquidity to
    ///         the graduation DEX and burn the LP tokens (locked forever).
    function graduate(address token) external nonReentrant {
        Curve storage c = _activeCurve(token);
        if (c.realNative < graduationTarget) revert NotReadyToGraduate();
        c.graduated = true;

        uint256 nativeLiquidity = c.realNative;
        c.realNative = 0;

        // Graduation fee on the migrated native liquidity.
        uint256 fee = (nativeLiquidity * feeCollector.curveFeeBps()) / BPS;
        feeCollector.notifyFee{value: fee}(
            IFeeCollector.FeeKind.GRADUATION, NATIVE, fee, msg.sender
        );
        nativeLiquidity -= fee;

        IERC20(token).forceApprove(address(graduationRouter), LP_RESERVE);
        graduationRouter.addLiquidityETH{value: nativeLiquidity}(
            token,
            LP_RESERVE,
            0, // first liquidity for this pair — price set by the deposit
            0,
            LP_BURN_ADDRESS,
            block.timestamp
        );

        // Burn unsold curve inventory so circulating supply stays honest.
        uint256 unsold = c.tokenReserve;
        c.tokenReserve = 0;
        if (unsold > 0) {
            IERC20(token).safeTransfer(LP_BURN_ADDRESS, unsold);
        }

        emit Graduated(token, nativeLiquidity, LP_RESERVE);
    }

    // ── Admin ──────────────────────────────────────────────────────────────

    function setParams(uint256 virtualNative_, uint256 graduationTarget_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        virtualNative = virtualNative_;
        graduationTarget = graduationTarget_;
        emit ParamsUpdated(virtualNative_, graduationTarget_);
    }

    function setGraduationRouter(address router) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (router == address(0)) revert ZeroAddress();
        graduationRouter = IUniswapV2Router02(router);
    }

    function launchCount() external view returns (uint256) {
        return allLaunches.length;
    }

    function _activeCurve(address token) private view returns (Curve storage c) {
        c = curves[token];
        if (c.creator == address(0)) revert UnknownCurve();
        if (c.graduated) revert AlreadyGraduated();
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    receive() external payable {}
}
