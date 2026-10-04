// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {IUniswapV2Router02, IUniswapV2Factory, IUniswapV2Pair} from "./interfaces/IUniswapV2.sol";

/// @title LiquidityZap — aggregated LP provisioning with protocol fee capture
/// @notice Users add/remove liquidity on ANY whitelisted UniswapV2-family DEX
///         through XAUConnect; the protocol skims `lpFeeBps` (default 0.10%)
///         from the deposited / withdrawn amounts.
/// @dev Router whitelist prevents griefing with malicious "router" contracts.
contract LiquidityZap is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 private constant BPS = 10_000;

    IFeeCollector public immutable feeCollector;
    mapping(address => bool) public allowedRouters;

    event RouterAllowed(address indexed router, bool allowed);
    event LiquidityAdded(
        address indexed user,
        address indexed router,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity,
        uint256 feeA,
        uint256 feeB
    );
    event LiquidityRemoved(
        address indexed user,
        address indexed router,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 feeA,
        uint256 feeB
    );

    error RouterNotAllowed();
    error PairNotFound();

    constructor(address feeCollector_, address owner_) Ownable(owner_) {
        feeCollector = IFeeCollector(feeCollector_);
    }

    function setRouterAllowed(address router, bool allowed) external onlyOwner {
        allowedRouters[router] = allowed;
        emit RouterAllowed(router, allowed);
    }

    /// @notice Add liquidity through a whitelisted DEX router. The LP fee is
    ///         skimmed from both legs before depositing.
    function addLiquidity(
        address router,
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    ) external nonReentrant returns (uint256 usedA, uint256 usedB, uint256 liquidity) {
        if (!allowedRouters[router]) revert RouterNotAllowed();

        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountB);

        uint16 feeBps = feeCollector.lpFeeBps();
        uint256 feeA = (amountA * feeBps) / BPS;
        uint256 feeB = (amountB * feeBps) / BPS;
        _payFee(tokenA, feeA);
        _payFee(tokenB, feeB);

        uint256 netA = amountA - feeA;
        uint256 netB = amountB - feeB;
        IERC20(tokenA).forceApprove(router, netA);
        IERC20(tokenB).forceApprove(router, netB);

        (usedA, usedB, liquidity) = IUniswapV2Router02(router).addLiquidity(
            tokenA, tokenB, netA, netB, amountAMin, amountBMin, msg.sender, deadline
        );

        // Refund unused remainders.
        if (netA > usedA) IERC20(tokenA).safeTransfer(msg.sender, netA - usedA);
        if (netB > usedB) IERC20(tokenB).safeTransfer(msg.sender, netB - usedB);

        emit LiquidityAdded(msg.sender, router, tokenA, tokenB, usedA, usedB, liquidity, feeA, feeB);
    }

    /// @notice Remove liquidity; the LP fee is skimmed from both outputs.
    function removeLiquidity(
        address router,
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    ) external nonReentrant returns (uint256 outA, uint256 outB) {
        if (!allowedRouters[router]) revert RouterNotAllowed();

        address factory = IUniswapV2Router02(router).factory();
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        if (pair == address(0)) revert PairNotFound();

        IUniswapV2Pair(pair).transferFrom(msg.sender, address(this), liquidity);
        IERC20(pair).forceApprove(router, liquidity);

        (uint256 grossA, uint256 grossB) = IUniswapV2Router02(router).removeLiquidity(
            tokenA, tokenB, liquidity, amountAMin, amountBMin, address(this), deadline
        );

        uint16 feeBps = feeCollector.lpFeeBps();
        uint256 feeA = (grossA * feeBps) / BPS;
        uint256 feeB = (grossB * feeBps) / BPS;
        _payFee(tokenA, feeA);
        _payFee(tokenB, feeB);

        outA = grossA - feeA;
        outB = grossB - feeB;
        IERC20(tokenA).safeTransfer(msg.sender, outA);
        IERC20(tokenB).safeTransfer(msg.sender, outB);

        emit LiquidityRemoved(msg.sender, router, tokenA, tokenB, outA, outB, feeA, feeB);
    }

    function _payFee(address token, uint256 amount) private {
        if (amount == 0) return;
        IERC20(token).safeTransfer(address(feeCollector), amount);
        feeCollector.notifyFee(IFeeCollector.FeeKind.LP, token, amount, msg.sender);
    }
}
