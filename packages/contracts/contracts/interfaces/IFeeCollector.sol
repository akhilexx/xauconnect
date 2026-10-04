// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title IFeeCollector — protocol fee vault interface
/// @notice Shared by AggregatorRouter, LiquidityZap, TokenFactory and Launchpad.
interface IFeeCollector {
    enum FeeKind {
        SWAP,
        LP,
        LAUNCH,
        LISTING,
        CURVE,
        GRADUATION
    }

    function swapFeeBps() external view returns (uint16);

    function lpFeeBps() external view returns (uint16);

    function curveFeeBps() external view returns (uint16);

    function launchFeeNative() external view returns (uint256);

    function listingFeeNative() external view returns (uint256);

    /// @notice Record a fee payment. Native fees must be attached as msg.value;
    ///         ERC20 fees must already be transferred to the collector.
    function notifyFee(FeeKind kind, address token, uint256 amount, address payer)
        external
        payable;
}
