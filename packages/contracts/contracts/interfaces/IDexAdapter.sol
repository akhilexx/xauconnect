// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IDexAdapter — uniform venue adapter for the AggregatorRouter
/// @notice One adapter per DEX family (UniswapV2-style, UniswapV3, ...).
///         The router transfers the (fee-netted) input to the adapter, then
///         calls `swap`; the adapter must deliver `tokenOut` to `recipient`.
interface IDexAdapter {
    /// @param tokenIn  ERC20 input or the native pseudo-address (0xEeee…EEeE)
    /// @param tokenOut ERC20 output or the native pseudo-address
    /// @param amountIn input amount already held by (or sent to) the adapter
    /// @param minAmountOut venue-level slippage floor
    /// @param recipient final receiver of tokenOut
    /// @param data venue-specific encoding (e.g. abi.encode(address[] path))
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient,
        bytes calldata data
    ) external payable returns (uint256 amountOut);
}
