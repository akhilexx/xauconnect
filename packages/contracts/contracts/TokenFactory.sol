// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IFeeCollector} from "./interfaces/IFeeCollector.sol";
import {LaunchedToken} from "./tokens/LaunchedToken.sol";

/// @title TokenFactory — one-click ERC-20 deployer (standard launches)
/// @notice Deploys honest fixed-supply tokens for a flat native launch fee.
///         Bonding-curve fair launches live in Launchpad.sol instead.
/// @dev UUPS upgradeable. The deployed tokens themselves are immutable.
contract TokenFactory is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable
{
    address public constant NATIVE = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    IFeeCollector public feeCollector;

    struct LaunchInfo {
        address token;
        address creator;
        uint64 createdAt;
        string metadataURI;
    }

    LaunchInfo[] public launches;
    mapping(address => address[]) public tokensByCreator;

    event TokenCreated(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        string metadataURI,
        uint256 launchFeePaid
    );

    error InsufficientLaunchFee();
    error EmptyParams();
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
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        feeCollector = IFeeCollector(feeCollector_);
    }

    /// @notice Deploy a new fixed-supply ERC-20. The launch fee (native coin,
    ///         FeeCollector-configured) must be attached; excess is refunded.
    /// @param totalSupply full supply in base units (18 decimals)
    /// @param metadataURI ipfs:// metadata JSON (logo, description, socials)
    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        string calldata metadataURI
    ) external payable nonReentrant returns (address token) {
        if (bytes(name).length == 0 || bytes(symbol).length == 0 || totalSupply == 0) {
            revert EmptyParams();
        }
        uint256 fee = feeCollector.launchFeeNative();
        if (msg.value < fee) revert InsufficientLaunchFee();

        feeCollector.notifyFee{value: fee}(IFeeCollector.FeeKind.LAUNCH, NATIVE, fee, msg.sender);

        token = address(
            new LaunchedToken(name, symbol, totalSupply, msg.sender, msg.sender, metadataURI)
        );

        launches.push(
            LaunchInfo({
                token: token,
                creator: msg.sender,
                createdAt: uint64(block.timestamp),
                metadataURI: metadataURI
            })
        );
        tokensByCreator[msg.sender].push(token);

        emit TokenCreated(token, msg.sender, name, symbol, totalSupply, metadataURI, fee);

        // Refund any overpayment.
        uint256 refund = msg.value - fee;
        if (refund > 0) {
            (bool ok,) = msg.sender.call{value: refund}("");
            require(ok, "TokenFactory: refund failed");
        }
    }

    function launchCount() external view returns (uint256) {
        return launches.length;
    }

    function creatorTokenCount(address creator) external view returns (uint256) {
        return tokensByCreator[creator].length;
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
