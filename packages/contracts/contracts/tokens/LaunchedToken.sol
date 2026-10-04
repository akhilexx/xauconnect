// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title LaunchedToken — ERC-20 deployed by the XAUConnect TokenFactory/Launchpad
/// @notice Honest, fixed-supply token: no owner, no mint, no blacklist, no
///         transfer tax — everything is minted at construction. Metadata
///         (logo, description, socials) lives at `metadataURI` on IPFS.
contract LaunchedToken is ERC20, ERC20Permit {
    /// @notice Creator wallet recorded for provenance / dev-wallet tracking.
    address public immutable creator;
    /// @notice ipfs:// URI with the launchpad metadata JSON.
    string public metadataURI;

    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address mintTo,
        address creator_,
        string memory metadataURI_
    ) ERC20(name_, symbol_) ERC20Permit(name_) {
        creator = creator_;
        metadataURI = metadataURI_;
        _mint(mintTo, totalSupply_);
    }
}
