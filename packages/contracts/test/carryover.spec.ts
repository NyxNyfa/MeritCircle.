import { expect } from "chai";
import { ethers } from "hardhat";
import { MeritCircleCore } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MeritCircleCore — Reward Carryover", () => {
  let core: MeritCircleCore;
  let admin: HardhatEthersSigner;
  let settler: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;

  // Exact carryover specification numbers:
  // groupSize = 3, contribution = 1000 wei, maxDiscountBps = 1000
  const CONTRIBUTION_WEI = 1000n;
  const MAX_DISCOUNT_BPS = 1000;
  const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));

  beforeEach(async () => {
    [admin, settler, user1, user2, user3] = await ethers.getSigners();

    const CoreFactory = await ethers.getContractFactory("MeritCircleCore");
    core = (await CoreFactory.deploy()) as unknown as MeritCircleCore;
    await core.waitForDeployment();

    await core.grantRole(SETTLER_ROLE, settler.address);

    // AUCTION pool: 3 members, 3 cycles, 1000 wei contribution
    await core.createPool(
      "Carryover Test Circle",
      1,
      CONTRIBUTION_WEI,
      3,
      3,
      10,
      MAX_DISCOUNT_BPS,
      4
    );

    await core
      .connect(settler)
      .registerGroup(1, 101, [user1.address, user2.address, user3.address]);
  });

  it("carries surplus from Cycle 1 to Cycle 2 correctly per PRD scenario", async () => {
    // ─── Cycle 1 ─────────────────────────────────────────────────────────────
    // All 3 pay 1000 wei
    await core.connect(user1).payContribution(1, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(1, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(1, 1, { value: CONTRIBUTION_WEI });

    // Reward pool = 3000 wei
    expect(await core.getExpectedRewardPool(1)).to.equal(3000n);

    // Open auction, user1 bids 2700 wei (10% discount)
    await core.connect(settler).openAuction(1, 1);
    await core.connect(user1).submitBid(1, 1, 2700n);
    await core.connect(settler).closeAuction(1, 1);

    // Settle Cycle 1:
    // Payout = 2700 wei, carried = 300 wei
    await core.connect(settler).settleAuctionCycle(1, 1);
    expect(await core.carriedReward(1)).to.equal(300n);

    // Group current cycle is now 2
    expect((await core.getGroup(1)).currentCycle).to.equal(2);

    // ─── Cycle 2 ─────────────────────────────────────────────────────────────
    // Expected reward pool is now: carried (300) + base (3000) = 3300 wei
    expect(await core.getExpectedRewardPool(1)).to.equal(3300n);

    // All 3 pay Cycle 2 contribution
    await core.connect(user1).payContribution(1, 2, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(1, 2, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(1, 2, { value: CONTRIBUTION_WEI });

    // Open auction for Cycle 2, user2 bids 3000 wei
    await core.connect(settler).openAuction(1, 2);
    await core.connect(user2).submitBid(1, 2, 3000n);
    await core.connect(settler).closeAuction(1, 2);

    // Settle Cycle 2:
    // RewardPool = 3300 wei, Payout = 3000 wei, carried = 300 wei
    await core.connect(settler).settleAuctionCycle(1, 2);

    // Assert after cycle 2: carriedReward = 300 wei
    expect(await core.carriedReward(1)).to.equal(300n);
    expect((await core.getGroup(1)).currentCycle).to.equal(3);
  });

  it("basic pool settlement leaves carriedReward = 0", async () => {
    // Create BASIC pool
    await core.createPool(
      "Basic Pool",
      0,
      CONTRIBUTION_WEI,
      3,
      3,
      10,
      0,
      1
    );
    await core
      .connect(settler)
      .registerGroup(2, 201, [user1.address, user2.address, user3.address]);

    // All pay Cycle 1
    await core.connect(user1).payContribution(2, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(2, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(2, 1, { value: CONTRIBUTION_WEI });

    // Settle basic cycle 1
    await core.connect(settler).settleBasicCycle(2, 1, user1.address);

    // Carried reward is 0
    expect(await core.carriedReward(2)).to.equal(0n);
  });
});
