// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title XAUToken — the XAUConnect protocol token
/// @notice Utility token: fee-payment discounts, launchpad fee currency, and
///         — once XAUConnect ships its own L1/L2 — the native gas token.
/// @dev Fixed max supply of 1B; owner (treasury multisig) mints up to the cap
///      according to the published emission schedule.
///      [own-network provisioning] On the future XAU chain this contract is
///      superseded by the native coin; bridge escrow can burn/mint here.
contract XAUToken is ERC20, ERC20Permit, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000e18;

    error MaxSupplyExceeded();

    constructor(address treasury)
        ERC20("XAUConnect", "XAU")
        ERC20Permit("XAUConnect")
        Ownable(treasury)
    {
        // Genesis allocation: 10% to treasury for liquidity seeding.
        _mint(treasury, 100_000_000e18);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
    }
}
