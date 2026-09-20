import { expect } from "chai";
import { ethers } from "hardhat";
import { MeritCircleCore } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MeritCircleCore — Final Cycle Settlement (No Final Surplus)", () => {
  let core: MeritCircleCore;
  let admin: HardhatEthersSigner;
  let settler: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;

  const CONTRIBUTION_WEI = 1000n;
  const MAX_DISCOUNT_BPS = 1000;
  const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));

  beforeEach(async () => {
    [admin, settler, user1, user2, user3] = await ethers.getSigners();

    const CoreFactory = await ethers.getContractFactory("MeritCircleCore");
    core = (await CoreFactory.deploy()) as unknown as MeritCircleCore;
    await core.waitForDeployment();

    await core.grantRole(SETTLER_ROLE, settler.address);

    // AUCTION Pool: 3 members, 3 cycles, 1000 wei contribution
    await core.createPool(
      "Final Cycle Auction Circle",
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

  it("completes 3 full cycles with carryover and drains group balance in final cycle (NO FINAL SURPLUS)", async () => {
    // ─── Cycle 1 ─────────────────────────────────────────────────────────────
    await core.connect(user1).payContribution(1, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(1, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(1, 1, { value: CONTRIBUTION_WEI });

    await core.connect(settler).openAuction(1, 1);
    await core.connect(user1).submitBid(1, 1, 2700n);
    await core.connect(settler).closeAuction(1, 1);
    await core.connect(settler).settleAuctionCycle(1, 1);

    expect(await core.carriedReward(1)).to.equal(300n);

    // ─── Cycle 2 ─────────────────────────────────────────────────────────────
    await core.connect(user1).payContribution(1, 2, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(1, 2, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(1, 2, { value: CONTRIBUTION_WEI });

    await core.connect(settler).openAuction(1, 2);
    await core.connect(user2).submitBid(1, 2, 3000n);
    await core.connect(settler).closeAuction(1, 2);
    await core.connect(settler).settleAuctionCycle(1, 2);

    expect(await core.carriedReward(1)).to.equal(300n);

    // ─── Cycle 3 (Final) ─────────────────────────────────────────────────────
    // Final cycle cannot open auction
    await expect(
      core.connect(settler).openAuction(1, 3)
    ).to.be.revertedWith("Cannot auction final cycle");

    // All members pay Cycle 3
    await core.connect(user1).payContribution(1, 3, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(1, 3, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(1, 3, { value: CONTRIBUTION_WEI });

    // Group balance before settlement:
    // Total deposited: 3 * 3 * 1000 = 9000 wei
    // Paid out: 2700 + 3000 = 5700 wei
    // Remaining in balance: 3300 wei
    expect(await core.getGroupBalance(1)).to.equal(3300n);

    // Settle final cycle to user3 (the only remaining member without payout)
    const initialUser3Balance = await ethers.provider.getBalance(user3.address);
    const tx = await core.connect(settler).settleFinalCycle(1, 3, user3.address);

    await expect(tx)
      .to.emit(core, "FinalCycleSettled")
      .withArgs(1, 3, user3.address, 3300n);

    const finalUser3Balance = await ethers.provider.getBalance(user3.address);
    expect(finalUser3Balance - initialUser3Balance).to.equal(3300n);

    // CRITICAL ASSERTIONS:
    // 1. carriedReward MUST be 0
    expect(await core.carriedReward(1)).to.equal(0n);
    // 2. groupBalance MUST be 0
    expect(await core.getGroupBalance(1)).to.equal(0n);
    // 3. group MUST be completed
    const group = await core.getGroup(1);
    expect(group.completed).to.be.true;
    expect(await core.hasReceivedPayout(1, user3.address)).to.be.true;
  });

  it("final cycle rejects non-final cycle call", async () => {
    // Current cycle is 1
    await core.connect(user1).payContribution(1, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(1, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(1, 1, { value: CONTRIBUTION_WEI });

    await expect(
      core.connect(settler).settleFinalCycle(1, 1, user1.address)
    ).to.be.revertedWith("Not final cycle");
  });

  it("final cycle rejects member who already received payout", async () => {
    // Advance to Cycle 3 where user1 already received payout
    await core.connect(user1).payContribution(1, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(1, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(1, 1, { value: CONTRIBUTION_WEI });

    await core.connect(settler).openAuction(1, 1);
    await core.connect(user1).submitBid(1, 1, 2700n);
    await core.connect(settler).closeAuction(1, 1);
    await core.connect(settler).settleAuctionCycle(1, 1);

    await core.connect(user1).payContribution(1, 2, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(1, 2, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(1, 2, { value: CONTRIBUTION_WEI });

    await core.connect(settler).openAuction(1, 2);
    await core.connect(user2).submitBid(1, 2, 3000n);
    await core.connect(settler).closeAuction(1, 2);
    await core.connect(settler).settleAuctionCycle(1, 2);

    await core.connect(user1).payContribution(1, 3, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(1, 3, { value: CONTRIBUTION_WEI });
    await core.connect(user3).payContribution(1, 3, { value: CONTRIBUTION_WEI });

    // Trying to settle final cycle to user1 (who already won in cycle 1)
    await expect(
      core.connect(settler).settleFinalCycle(1, 3, user1.address)
    ).to.be.revertedWith("Recipient already received payout");
  });

  it("basic pool full lifecycle: non-final pays full reward, final cycle leaves balance 0", async () => {
    // Create BASIC pool: 2 members, 2 cycles
    await core.createPool(
      "Basic 2-Member Pool",
      0,
      CONTRIBUTION_WEI,
      2,
      2,
      10,
      0,
      1
    );
    await core
      .connect(settler)
      .registerGroup(2, 201, [user1.address, user2.address]);

    // Cycle 1 (non-final):
    await core.connect(user1).payContribution(2, 1, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(2, 1, { value: CONTRIBUTION_WEI });

    await core.connect(settler).settleBasicCycle(2, 1, user1.address);
    expect(await core.carriedReward(2)).to.equal(0n);
    expect(await core.getGroupBalance(2)).to.equal(0n);

    // Cycle 2 (final):
    await core.connect(user1).payContribution(2, 2, { value: CONTRIBUTION_WEI });
    await core.connect(user2).payContribution(2, 2, { value: CONTRIBUTION_WEI });

    await core.connect(settler).settleFinalCycle(2, 2, user2.address);
    expect(await core.carriedReward(2)).to.equal(0n);
    expect(await core.getGroupBalance(2)).to.equal(0n);

    const group = await core.getGroup(2);
    expect(group.completed).to.be.true;
  });
});
