// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IDexAdapter} from "../interfaces/IDexAdapter.sol";
import {IUniswapV2Router02} from "../interfaces/IUniswapV2.sol";

/// @title UniswapV2Adapter — venue adapter for every UniswapV2-family DEX
/// @notice One deployment per venue (Uniswap V2, PancakeSwap V2, SushiSwap,
///         QuickSwap, BiSwap, ApeSwap, Trader Joe V1, Pangolin, Camelot,
///         Aerodrome-compat, BaseSwap...) — they all share the
///         UniswapV2Router02 ABI, so only the router address differs.
/// @dev Stateless between calls; never holds funds past a tx. Only callable
///      usefully by the AggregatorRouter which transfers input beforehand.
contract UniswapV2Adapter is IDexAdapter {
    using SafeERC20 for IERC20;

    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    IUniswapV2Router02 public immutable dexRouter;
    address public immutable wrappedNative;

    error EmptyPath();

    constructor(address router_) {
        dexRouter = IUniswapV2Router02(router_);
        wrappedNative = IUniswapV2Router02(router_).WETH();
    }

    /// @inheritdoc IDexAdapter
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        bytes calldata data
    ) external payable override returns (uint256 amountOut) {
        address[] memory path = _resolvePath(tokenIn, tokenOut, data);
        uint256 deadline = block.timestamp; // router enforces the user deadline

        if (tokenIn == NATIVE) {
            uint256[] memory ethInAmounts = dexRouter.swapExactETHForTokens{value: msg.value}(
                minAmountOut, path, recipient, deadline
            );
            return ethInAmounts[ethInAmounts.length - 1];
        }

        IERC20(tokenIn).forceApprove(address(dexRouter), amountIn);

        if (tokenOut == NATIVE) {
            uint256[] memory ethOutAmounts =
                dexRouter.swapExactTokensForETH(amountIn, minAmountOut, path, recipient, deadline);
            return ethOutAmounts[ethOutAmounts.length - 1];
        }

        uint256[] memory tokenAmounts =
            dexRouter.swapExactTokensForTokens(amountIn, minAmountOut, path, recipient, deadline);
        return tokenAmounts[tokenAmounts.length - 1];
    }

    /// @dev Path priority: explicit path from `data`, else direct hop with
    ///      native legs mapped to the wrapped token.
    function _resolvePath(address tokenIn, address tokenOut, bytes calldata data)
        private
        view
        returns (address[] memory path)
    {
        if (data.length > 0) {
            path = abi.decode(data, (address[]));
            if (path.length < 2) revert EmptyPath();
            return path;
        }
        path = new address[](2);
        path[0] = tokenIn == NATIVE ? wrappedNative : tokenIn;
        path[1] = tokenOut == NATIVE ? wrappedNative : tokenOut;
    }
}
