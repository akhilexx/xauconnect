// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev Mock LP token mint/burnable by the mock router.
contract MockPair is ERC20 {
    address public immutable router;

    constructor() ERC20("Mock LP", "MLP") {
        router = msg.sender;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == router, "only router");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == router, "only router");
        _burn(from, amount);
    }
}

/// @title MockDexRouter — UniswapV2Router02-compatible test double
/// @dev Swaps at a configurable fixed rate (default 1:1) from pre-funded
///      inventory; acts as its own factory; LP accounting is proportional.
contract MockDexRouter {
    using SafeERC20 for IERC20;

    address public immutable weth;
    /// @dev output = input * rateBps / 10000
    uint256 public rateBps = 10_000;

    struct PoolState {
        MockPair pair;
        uint256 reserveA;
        uint256 reserveB;
    }

    mapping(bytes32 => PoolState) public pools;

    constructor(address weth_) {
        weth = weth_;
    }

    receive() external payable {}

    function setRateBps(uint256 bps) external {
        rateBps = bps;
    }

    function WETH() external view returns (address) {
        return weth;
    }

    function factory() external view returns (address) {
        return address(this);
    }

    function getPair(address tokenA, address tokenB) external view returns (address) {
        return address(pools[_key(tokenA, tokenB)].pair);
    }

    // ── Swaps ──────────────────────────────────────────────────────────────

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external
        view
        returns (uint256[] memory amounts)
    {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = (amountIn * rateBps) / 10_000;
    }

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 out = (amountIn * rateBps) / 10_000;
        require(out >= amountOutMin, "MockRouter: slippage");
        IERC20(path[path.length - 1]).safeTransfer(to, out);
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = out;
    }

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external payable returns (uint256[] memory amounts) {
        uint256 out = (msg.value * rateBps) / 10_000;
        require(out >= amountOutMin, "MockRouter: slippage");
        IERC20(path[path.length - 1]).safeTransfer(to, out);
        amounts = new uint256[](path.length);
        amounts[0] = msg.value;
        amounts[path.length - 1] = out;
    }

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        IERC20(path[0]).safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 out = (amountIn * rateBps) / 10_000;
        require(out >= amountOutMin, "MockRouter: slippage");
        (bool ok,) = to.call{value: out}("");
        require(ok, "MockRouter: eth send failed");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = out;
    }

    // ── Liquidity ──────────────────────────────────────────────────────────

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256,
        uint256,
        address to,
        uint256
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        IERC20(tokenA).safeTransferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).safeTransferFrom(msg.sender, address(this), amountBDesired);
        PoolState storage p = _pool(tokenA, tokenB);
        p.reserveA += amountADesired;
        p.reserveB += amountBDesired;
        liquidity = amountADesired; // simplistic LP accounting for tests
        p.pair.mint(to, liquidity);
        return (amountADesired, amountBDesired, liquidity);
    }

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256,
        uint256,
        address to,
        uint256
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amountTokenDesired);
        PoolState storage p = _pool(token, weth);
        p.reserveA += amountTokenDesired;
        p.reserveB += msg.value;
        liquidity = msg.value;
        p.pair.mint(to, liquidity);
        return (amountTokenDesired, msg.value, liquidity);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256,
        uint256,
        address to,
        uint256
    ) external returns (uint256 amountA, uint256 amountB) {
        PoolState storage p = pools[_key(tokenA, tokenB)];
        uint256 totalLp = p.pair.totalSupply();
        amountA = (p.reserveA * liquidity) / totalLp;
        amountB = (p.reserveB * liquidity) / totalLp;
        p.pair.burn(msg.sender, liquidity);
        p.reserveA -= amountA;
        p.reserveB -= amountB;
        IERC20(tokenA).safeTransfer(to, amountA);
        IERC20(tokenB).safeTransfer(to, amountB);
    }

    function _pool(address tokenA, address tokenB) private returns (PoolState storage p) {
        bytes32 key = _key(tokenA, tokenB);
        p = pools[key];
        if (address(p.pair) == address(0)) {
            p.pair = new MockPair();
        }
    }

    function _key(address tokenA, address tokenB) private pure returns (bytes32) {
        (address a, address b) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return keccak256(abi.encodePacked(a, b));
    }
}
