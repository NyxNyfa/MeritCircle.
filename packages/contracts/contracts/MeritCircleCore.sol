// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MeritCircleCore
 * @dev Core smart contract foundation for Merit Circle arisan protocol on BNB Smart Chain Testnet.
 * Manages pools, group formations, member registration, contribution payments,
 * liquidity auctions, reward carryover, and final cycle full settlement (no final surplus).
 * No collateral, reserve, or KYC logic is present.
 */
contract MeritCircleCore is AccessControl, Pausable, ReentrancyGuard {
    // ─── Roles ───────────────────────────────────────────────────────────────────

    bytes32 public constant POOL_CREATOR_ROLE = keccak256("POOL_CREATOR_ROLE");
    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ─── Structs ─────────────────────────────────────────────────────────────────

    struct Pool {
        string name;
        uint8 mode; // 0 = BASIC, 1 = AUCTION
        uint256 contributionAmount;
        uint8 groupSize;
        uint8 cycleCount;
        uint8 paymentWindowDays;
        uint8 cycleDurationDays;
        uint16 maxDiscountBps;
        uint8 minimumTier;
        bool active;
    }

    struct Group {
        uint256 poolId;
        uint256 groupNumber;
        uint256 startDate;
        uint8 memberCount;
        uint8 currentCycle;
        bool exists;
        bool completed;
        bool paused;
    }

    struct AuctionState {
        bool exists;
        bool open;
        bool closed;
        address bestBidder;
        uint256 bestBidAmount;
    }

    // ─── State Variables ─────────────────────────────────────────────────────────

    uint256 public nextPoolId = 1;
    uint256 public nextGroupId = 1;

    mapping(uint256 => Pool) public pools;
    mapping(uint256 => Group) public groups;

    mapping(uint256 => address[]) public groupMembers;
    mapping(uint256 => mapping(address => bool)) public isMember;

    // groupId => cycleNumber => user => hasPaid
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasPaid;
    // groupId => balance
    mapping(uint256 => uint256) public groupBalance;

    // poolId => groupNumber => used
    mapping(uint256 => mapping(uint256 => bool)) public groupNumberUsed;

    // Phase 08 Storage additions:
    // groupId => user => hasReceivedPayout
    mapping(uint256 => mapping(address => bool)) public hasReceivedPayout;
    // groupId => carriedReward
    mapping(uint256 => uint256) public carriedReward;
    // groupId => cycle => AuctionState
    mapping(uint256 => mapping(uint256 => AuctionState)) public auctions;

    // ─── Events ──────────────────────────────────────────────────────────────────

    event PoolCreated(
        uint256 indexed poolId,
        string name,
        uint8 mode,
        uint256 contributionAmount,
        uint8 groupSize,
        uint8 cycleCount
    );

    event GroupRegistered(
        uint256 indexed groupId,
        uint256 indexed poolId,
        uint256 groupNumber,
        uint256 startDate
    );

    event ContributionPaid(
        uint256 indexed groupId,
        uint256 indexed cycle,
        address indexed payer,
        uint256 amount,
        uint256 timestamp
    );

    event AuctionOpened(
        uint256 indexed groupId,
        uint256 indexed cycle
    );

    event AuctionClosed(
        uint256 indexed groupId,
        uint256 indexed cycle
    );

    event BidSubmitted(
        uint256 indexed groupId,
        uint256 indexed cycle,
        address indexed bidder,
        uint256 payoutAmount
    );

    event AuctionCycleSettled(
        uint256 indexed groupId,
        uint256 indexed cycle,
        address indexed winner,
        uint256 rewardPool,
        uint256 payout,
        uint256 carriedReward
    );

    event BasicCycleSettled(
        uint256 indexed groupId,
        uint256 indexed cycle,
        address indexed recipient,
        uint256 rewardPool
    );

    event FinalCycleSettled(
        uint256 indexed groupId,
        uint256 indexed cycle,
        address indexed recipient,
        uint256 finalRewardPool
    );

    // ─── Constructor ─────────────────────────────────────────────────────────────

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(POOL_CREATOR_ROLE, msg.sender);
        _grantRole(SETTLER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
    }

    // ─── Pool Management ─────────────────────────────────────────────────────────

    /**
     * @notice Creates a new arisan pool catalog entry.
     * @param name Pool display name
     * @param mode 0 = BASIC, 1 = AUCTION
     * @param contributionAmount Native tBNB wei amount per member per cycle
     * @param groupSize Total members required
     * @param cycleCount Total cycles (must equal groupSize)
     * @param paymentWindowDays Payment window duration in days
     * @param maxDiscountBps Maximum discount in bps (0 for BASIC)
     * @param minimumTier Minimum reputation tier required (1-5)
     */
    function createPool(
        string memory name,
        uint8 mode,
        uint256 contributionAmount,
        uint8 groupSize,
        uint8 cycleCount,
        uint8 paymentWindowDays,
        uint16 maxDiscountBps,
        uint8 minimumTier
    ) external onlyRole(POOL_CREATOR_ROLE) returns (uint256 poolId) {
        require(bytes(name).length > 0, "Empty pool name");
        require(mode == 0 || mode == 1, "Invalid pool mode");
        require(contributionAmount > 0, "Contribution must be > 0");
        require(groupSize >= 2, "Group size must be >= 2");
        require(cycleCount == groupSize, "Cycle count must equal group size");
        require(paymentWindowDays > 0, "Payment window must be > 0");

        poolId = nextPoolId++;
        pools[poolId] = Pool({
            name: name,
            mode: mode,
            contributionAmount: contributionAmount,
            groupSize: groupSize,
            cycleCount: cycleCount,
            paymentWindowDays: paymentWindowDays,
            cycleDurationDays: 30,
            maxDiscountBps: maxDiscountBps,
            minimumTier: minimumTier,
            active: true
        });

        emit PoolCreated(
            poolId,
            name,
            mode,
            contributionAmount,
            groupSize,
            cycleCount
        );
    }

    // ─── Group Management ────────────────────────────────────────────────────────

    /**
     * @notice Registers a formed arisan group with its verified members.
     * @param poolId The ID of the pool
     * @param groupNumber Sequential group number within this pool
     * @param members Array of member addresses
     */
    function registerGroup(
        uint256 poolId,
        uint256 groupNumber,
        address[] memory members
    ) external onlyRole(SETTLER_ROLE) returns (uint256 groupId) {
        Pool memory pool = pools[poolId];
        require(bytes(pool.name).length > 0, "Pool does not exist");
        require(pool.active, "Pool is not active");
        require(members.length == pool.groupSize, "Invalid member count");
        require(!groupNumberUsed[poolId][groupNumber], "Group number already used");

        for (uint256 i = 0; i < members.length; i++) {
            require(members[i] != address(0), "Zero address member");
            for (uint256 j = i + 1; j < members.length; j++) {
                require(members[i] != members[j], "Duplicate member in group");
            }
        }

        groupId = nextGroupId++;
        groupNumberUsed[poolId][groupNumber] = true;

        groups[groupId] = Group({
            poolId: poolId,
            groupNumber: groupNumber,
            startDate: block.timestamp,
            memberCount: uint8(members.length),
            currentCycle: 1,
            exists: true,
            completed: false,
            paused: false
        });

        for (uint256 i = 0; i < members.length; i++) {
            groupMembers[groupId].push(members[i]);
            isMember[groupId][members[i]] = true;
        }

        emit GroupRegistered(
            groupId,
            poolId,
            groupNumber,
            block.timestamp
        );
    }

    // ─── Contribution Payments ───────────────────────────────────────────────────

    /**
     * @notice Pay the periodic cycle contribution in native tBNB.
     * @param groupId The ID of the group
     * @param cycle The cycle number (1-indexed)
     */
    function payContribution(
        uint256 groupId,
        uint256 cycle
    ) external payable nonReentrant whenNotPaused {
        Group memory group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(!group.completed, "Group is completed");
        require(!group.paused, "Group is paused");

        Pool memory pool = pools[group.poolId];
        require(cycle >= 1 && cycle <= pool.cycleCount, "Invalid cycle");
        require(cycle == group.currentCycle, "Invalid current cycle");
        require(isMember[groupId][msg.sender], "Not a group member");
        require(!hasPaid[groupId][cycle][msg.sender], "Already paid for cycle");
        require(msg.value == pool.contributionAmount, "Incorrect contribution amount");

        hasPaid[groupId][cycle][msg.sender] = true;
        groupBalance[groupId] += msg.value;

        emit ContributionPaid(
            groupId,
            cycle,
            msg.sender,
            msg.value,
            block.timestamp
        );
    }

    // ─── Auction Lifecycle ───────────────────────────────────────────────────────

    /**
     * @notice Opens auction for a non-final cycle in an AUCTION pool.
     * @param groupId The ID of the group
     * @param cycle The cycle number to auction
     */
    function openAuction(
        uint256 groupId,
        uint256 cycle
    ) external onlyRole(SETTLER_ROLE) {
        Group memory group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(!group.completed, "Group is completed");

        Pool memory pool = pools[group.poolId];
        require(pool.mode == 1, "Not an auction pool");
        require(cycle < pool.cycleCount, "Cannot auction final cycle");
        require(cycle == group.currentCycle, "Invalid auction cycle");

        AuctionState storage auction = auctions[groupId][cycle];
        require(!auction.open, "Auction already open");
        require(!auction.closed, "Auction already closed");

        auction.exists = true;
        auction.open = true;

        emit AuctionOpened(groupId, cycle);
    }

    /**
     * @notice Closes active auction for settlement evaluation.
     * @param groupId The ID of the group
     * @param cycle The cycle number
     */
    function closeAuction(
        uint256 groupId,
        uint256 cycle
    ) external onlyRole(SETTLER_ROLE) {
        AuctionState storage auction = auctions[groupId][cycle];
        require(auction.exists, "Auction does not exist");
        require(auction.open, "Auction not open");
        require(!auction.closed, "Auction already closed");

        auction.open = false;
        auction.closed = true;

        emit AuctionClosed(groupId, cycle);
    }

    /**
     * @notice Submit a discount bid (desired payout amount) for the current cycle auction.
     * Lowest valid payoutAmount wins. If equal, earliest bid stays.
     * @param groupId The ID of the group
     * @param cycle Active cycle
     * @param payoutAmount Desired payout in wei (must be >= minPayout and <= rewardPool)
     */
    function submitBid(
        uint256 groupId,
        uint256 cycle,
        uint256 payoutAmount
    ) external whenNotPaused {
        Group memory group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(!group.completed, "Group is completed");

        Pool memory pool = pools[group.poolId];
        require(pool.mode == 1, "Not an auction pool");
        require(cycle < pool.cycleCount, "Cannot auction final cycle");
        require(cycle == group.currentCycle, "Invalid auction cycle");

        AuctionState storage auction = auctions[groupId][cycle];
        require(!auction.closed, "Auction is closed");
        require(auction.open, "Auction is not open");

        require(isMember[groupId][msg.sender], "Not a group member");
        require(hasPaid[groupId][cycle][msg.sender], "Member has not paid current cycle");
        require(!hasReceivedPayout[groupId][msg.sender], "Member already received payout");

        uint256 rewardPool = getExpectedRewardPool(groupId);
        uint256 minPayout = getMinimumPayout(groupId);

        require(payoutAmount > 0, "Payout amount must be > 0");
        require(payoutAmount <= rewardPool, "Bid exceeds reward pool");
        require(payoutAmount >= minPayout, "Bid below minimum payout");

        if (auction.bestBidder == address(0)) {
            auction.bestBidder = msg.sender;
            auction.bestBidAmount = payoutAmount;
        } else if (payoutAmount < auction.bestBidAmount) {
            auction.bestBidder = msg.sender;
            auction.bestBidAmount = payoutAmount;
        }
        // If payoutAmount == auction.bestBidAmount, keep earlier bid

        emit BidSubmitted(groupId, cycle, msg.sender, payoutAmount);
    }

    // ─── Settlement Functions ────────────────────────────────────────────────────

    /**
     * @notice Settles a non-final cycle in an AUCTION pool with the winning bidder.
     * Carries remaining reward over to subsequent cycles.
     */
    function settleAuctionCycle(
        uint256 groupId,
        uint256 cycle
    ) external onlyRole(SETTLER_ROLE) nonReentrant {
        Group storage group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(!group.completed, "Group is completed");

        Pool memory pool = pools[group.poolId];
        require(pool.mode == 1, "Not an auction pool");
        require(cycle == group.currentCycle, "Invalid cycle");
        require(cycle < pool.cycleCount, "Cannot settle auction on final cycle");

        AuctionState memory auction = auctions[groupId][cycle];
        require(auction.closed, "Auction is not closed");
        require(auction.bestBidder != address(0), "No valid bids");
        require(auction.bestBidAmount > 0, "Invalid best bid amount");
        require(!hasReceivedPayout[groupId][auction.bestBidder], "Winner already received payout");
        require(allMembersPaid(groupId, cycle), "Not all members paid");

        uint256 rewardPool = getExpectedRewardPool(groupId);
        require(groupBalance[groupId] >= rewardPool, "Insufficient group balance");
        uint256 payout = auction.bestBidAmount;
        require(payout <= rewardPool, "Payout exceeds reward pool");

        uint256 remainingReward = rewardPool - payout;

        // Effects
        group.currentCycle += 1;
        hasReceivedPayout[groupId][auction.bestBidder] = true;
        groupBalance[groupId] -= payout;
        carriedReward[groupId] = remainingReward;

        // Interaction
        (bool sent, ) = payable(auction.bestBidder).call{value: payout}("");
        require(sent, "Payout transfer failed");

        emit AuctionCycleSettled(
            groupId,
            cycle,
            auction.bestBidder,
            rewardPool,
            payout,
            remainingReward
        );
    }

    /**
     * @notice Settles a non-final cycle in a BASIC pool (or auction fallback when no bids).
     * Distributes full reward pool to designated recipient.
     */
    function settleBasicCycle(
        uint256 groupId,
        uint256 cycle,
        address recipient
    ) external onlyRole(SETTLER_ROLE) nonReentrant {
        Group storage group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(!group.completed, "Group is completed");

        Pool memory pool = pools[group.poolId];
        require(cycle == group.currentCycle, "Invalid cycle");
        require(cycle < pool.cycleCount, "Cannot settle non-final on final cycle");
        require(isMember[groupId][recipient], "Recipient not a member");
        require(!hasReceivedPayout[groupId][recipient], "Recipient already received payout");
        require(allMembersPaid(groupId, cycle), "Not all members paid");

        if (pool.mode == 1) {
            // Auction fallback
            AuctionState memory auction = auctions[groupId][cycle];
            require(auction.exists && auction.closed, "Auction not closed");
            require(auction.bestBidder == address(0), "Auction has winning bidder");
        }

        uint256 rewardPool = getExpectedRewardPool(groupId);
        require(groupBalance[groupId] >= rewardPool, "Insufficient group balance");

        // Effects
        group.currentCycle += 1;
        hasReceivedPayout[groupId][recipient] = true;
        groupBalance[groupId] -= rewardPool;
        carriedReward[groupId] = 0;

        // Interaction
        (bool sent, ) = payable(recipient).call{value: rewardPool}("");
        require(sent, "Reward transfer failed");

        emit BasicCycleSettled(
            groupId,
            cycle,
            recipient,
            rewardPool
        );
    }

    /**
     * @notice Settles final cycle for either BASIC or AUCTION pool.
     * Transfers 100% of remaining group balance to the last recipient.
     * Enforces NO FINAL SURPLUS (carriedReward = 0 and groupBalance = 0).
     */
    function settleFinalCycle(
        uint256 groupId,
        uint256 cycle,
        address recipient
    ) external onlyRole(SETTLER_ROLE) nonReentrant {
        Group storage group = groups[groupId];
        require(group.exists, "Group does not exist");
        require(!group.completed, "Group is completed");

        Pool memory pool = pools[group.poolId];
        require(cycle == group.currentCycle, "Invalid cycle");
        require(cycle == pool.cycleCount, "Not final cycle");
        require(isMember[groupId][recipient], "Recipient not a member");
        require(!hasReceivedPayout[groupId][recipient], "Recipient already received payout");
        require(allMembersPaid(groupId, cycle), "Not all members paid");
        require(groupBalance[groupId] > 0, "No group balance to settle");

        uint256 finalRewardPool = groupBalance[groupId];

        // Effects
        group.currentCycle += 1;
        group.completed = true;
        hasReceivedPayout[groupId][recipient] = true;
        carriedReward[groupId] = 0;
        groupBalance[groupId] = 0;

        // Interaction
        (bool sent, ) = payable(recipient).call{value: finalRewardPool}("");
        require(sent, "Final payout transfer failed");

        emit FinalCycleSettled(
            groupId,
            cycle,
            recipient,
            finalRewardPool
        );
    }

    // ─── Pause Controls ──────────────────────────────────────────────────────────

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ─── View Helpers ────────────────────────────────────────────────────────────

    function getPool(uint256 poolId) external view returns (Pool memory) {
        require(bytes(pools[poolId].name).length > 0, "Pool does not exist");
        return pools[poolId];
    }

    function getGroup(uint256 groupId) external view returns (Group memory) {
        require(groups[groupId].exists, "Group does not exist");
        return groups[groupId];
    }

    function getGroupMembers(uint256 groupId) external view returns (address[] memory) {
        require(groups[groupId].exists, "Group does not exist");
        return groupMembers[groupId];
    }

    function getGroupBalance(uint256 groupId) external view returns (uint256) {
        return groupBalance[groupId];
    }

    function hasPaidCycle(
        uint256 groupId,
        uint256 cycle,
        address user
    ) external view returns (bool) {
        return hasPaid[groupId][cycle][user];
    }

    function getExpectedRewardPool(uint256 groupId) public view returns (uint256) {
        require(groups[groupId].exists, "Group does not exist");
        Pool memory pool = pools[groups[groupId].poolId];
        return carriedReward[groupId] + (uint256(pool.groupSize) * pool.contributionAmount);
    }

    function getMinimumPayout(uint256 groupId) public view returns (uint256) {
        require(groups[groupId].exists, "Group does not exist");
        Pool memory pool = pools[groups[groupId].poolId];
        uint256 rewardPool = getExpectedRewardPool(groupId);
        return (rewardPool * (10000 - uint256(pool.maxDiscountBps))) / 10000;
    }

    function allMembersPaid(uint256 groupId, uint256 cycle) public view returns (bool) {
        require(groups[groupId].exists, "Group does not exist");
        address[] memory members = groupMembers[groupId];
        for (uint256 i = 0; i < members.length; i++) {
            if (!hasPaid[groupId][cycle][members[i]]) {
                return false;
            }
        }
        return true;
    }

    function getAuction(uint256 groupId, uint256 cycle) external view returns (AuctionState memory) {
        return auctions[groupId][cycle];
    }
}
