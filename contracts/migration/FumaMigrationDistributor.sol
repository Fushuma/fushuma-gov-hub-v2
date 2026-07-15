// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FumaMigrationDistributor
 * @notice Multi-asset Merkle airdrop distributor for the Fushuma chain
 *         migration. For each migrated asset (native FUMA plus selected
 *         ERC-20s) the owner publishes a Merkle root produced by the snapshot
 *         toolkit in this repo (src/lib/snapshot). Holders — or anyone acting
 *         on their behalf — then claim their migrated balance by presenting a
 *         Merkle proof; funds always route to the address encoded in the leaf.
 *
 * @dev Leaf encoding is identical to `@openzeppelin/merkle-tree`'s
 *      StandardMerkleTree and to src/lib/snapshot/merkle.ts:
 *
 *          leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))))
 *
 *      Internal nodes use commutative (sorted-pair) hashing, matching OZ's
 *      `MerkleProof`. The native asset is addressed by the sentinel
 *      `NATIVE` = address(0).
 *
 *      Design notes:
 *        - One root + one claimed-map per asset, so a proof for one asset can
 *          never be replayed against another.
 *        - Roots are set once and can be finalized (locked) by the owner
 *          before opening claims, removing the ability to change allocations.
 *        - Checks-Effects-Interactions plus a reentrancy guard: an account is
 *          marked claimed before any transfer.
 *        - ERC-20 transfers tolerate non-standard tokens (e.g. USDT) that do
 *          not return a bool.
 *        - Unclaimed funds can only be swept after an owner-set deadline, so
 *          the owner cannot rug an active claim window.
 */
contract FumaMigrationDistributor {
    /// @dev Sentinel asset id for native FUMA on the new chain.
    address public constant NATIVE = address(0);

    address public owner;

    /// @notice Merkle root per asset.
    mapping(address => bytes32) public merkleRoot;
    /// @notice Whether an asset's root has been locked against further changes.
    mapping(address => bool) public rootFinalized;
    /// @notice Whether an (asset, account) allocation has been claimed.
    mapping(address => mapping(address => bool)) public claimed;

    /// @notice Unix time after which the owner may sweep unclaimed funds. 0 = never.
    uint256 public claimDeadline;

    uint256 private _locked = 1;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event RootSet(address indexed asset, bytes32 root);
    event RootFinalized(address indexed asset, bytes32 root);
    event ClaimDeadlineSet(uint256 deadline);
    event Claimed(address indexed asset, address indexed account, uint256 amount);
    event Swept(address indexed asset, address indexed to, uint256 amount);

    error NotOwner();
    error Reentrancy();
    error ZeroAddress();
    error RootAlreadyFinalized();
    error RootNotSet();
    error AlreadyClaimed();
    error InvalidProof();
    error NativeTransferFailed();
    error TokenTransferFailed();
    error DeadlineNotSet();
    error DeadlineNotReached();
    error DeadlineInPast();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier nonReentrant() {
        if (_locked != 1) revert Reentrancy();
        _locked = 2;
        _;
        _locked = 1;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    /// @notice Accept native FUMA funding for the distribution.
    receive() external payable {}

    // --------------------------------------------------------------------- //
    // Admin
    // --------------------------------------------------------------------- //

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Publish or update the Merkle root for an asset. Reverts once the
     *         root has been finalized.
     * @param asset ERC-20 address, or NATIVE (address(0)) for native FUMA.
     * @param root  Merkle root from the snapshot bundle for this asset.
     */
    function setRoot(address asset, bytes32 root) external onlyOwner {
        if (rootFinalized[asset]) revert RootAlreadyFinalized();
        merkleRoot[asset] = root;
        emit RootSet(asset, root);
    }

    /// @notice Lock an asset's root so allocations can no longer change.
    function finalizeRoot(address asset) external onlyOwner {
        if (merkleRoot[asset] == bytes32(0)) revert RootNotSet();
        rootFinalized[asset] = true;
        emit RootFinalized(asset, merkleRoot[asset]);
    }

    /// @notice Set the time after which unclaimed funds may be swept.
    function setClaimDeadline(uint256 deadline) external onlyOwner {
        if (deadline != 0 && deadline <= block.timestamp) revert DeadlineInPast();
        claimDeadline = deadline;
        emit ClaimDeadlineSet(deadline);
    }

    // --------------------------------------------------------------------- //
    // Claiming
    // --------------------------------------------------------------------- //

    /**
     * @notice Claim a migrated balance. Callable by anyone; funds always go to
     *         `account`. Idempotent-safe: a second claim for the same
     *         (asset, account) reverts with AlreadyClaimed.
     * @param asset   ERC-20 address, or NATIVE for native FUMA.
     * @param account The address entitled to the allocation (leaf address).
     * @param amount  The allocation amount (leaf amount, base units).
     * @param proof   Merkle proof for leaf(account, amount).
     */
    function claim(
        address asset,
        address account,
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant {
        bytes32 root = merkleRoot[asset];
        if (root == bytes32(0)) revert RootNotSet();
        if (claimed[asset][account]) revert AlreadyClaimed();

        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
        if (!_verify(proof, root, leaf)) revert InvalidProof();

        // Effects before interactions.
        claimed[asset][account] = true;
        emit Claimed(asset, account, amount);

        if (asset == NATIVE) {
            (bool ok, ) = payable(account).call{value: amount}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            _safeTransfer(asset, account, amount);
        }
    }

    /// @notice Convenience view: whether (asset, account) has claimed.
    function isClaimed(address asset, address account) external view returns (bool) {
        return claimed[asset][account];
    }

    // --------------------------------------------------------------------- //
    // Sweep (post-deadline only)
    // --------------------------------------------------------------------- //

    /**
     * @notice Sweep remaining balance of an asset to `to`, only after the
     *         claim deadline has passed. Guards against rugging an active
     *         claim window.
     */
    function sweep(address asset, address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (claimDeadline == 0) revert DeadlineNotSet();
        if (block.timestamp <= claimDeadline) revert DeadlineNotReached();

        if (asset == NATIVE) {
            (bool ok, ) = payable(to).call{value: amount}("");
            if (!ok) revert NativeTransferFailed();
        } else {
            _safeTransfer(asset, to, amount);
        }
        emit Swept(asset, to, amount);
    }

    // --------------------------------------------------------------------- //
    // Internal
    // --------------------------------------------------------------------- //

    /// @dev OZ-compatible commutative Merkle proof verification.
    function _verify(bytes32[] calldata proof, bytes32 root, bytes32 leaf)
        internal
        pure
        returns (bool)
    {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computed = _hashPair(computed, proof[i]);
        }
        return computed == root;
    }

    /// @dev keccak256 of the two nodes sorted ascending (commutative).
    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? _efficientHash(a, b) : _efficientHash(b, a);
    }

    function _efficientHash(bytes32 a, bytes32 b) internal pure returns (bytes32 value) {
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }

    /// @dev ERC-20 transfer that tolerates tokens returning no value.
    function _safeTransfer(address token, address to, uint256 amount) internal {
        (bool ok, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, amount) // transfer(address,uint256)
        );
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TokenTransferFailed();
    }
}
