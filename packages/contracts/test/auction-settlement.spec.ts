import { expect } from "chai";
import { ethers } from "hardhat";
import { MeritCircleCore } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MeritCircleCore — Auction Settlement", () => {
  let core: MeritCircleCore;
  let admin: HardhatEthersSigner;
  let settler: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const CONTRIBUTION_AMOUNT = ethers.parseEther("0.001");
  const MAX_DISCOUNT_BPS = 1000; // 10%
  const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));

  beforeEach(async () => {
    [admin, settler, user1, user2, user3, outsider] = await ethers.getSigners();

    const CoreFactory = await ethers.getContractFactory("MeritCircleCore");
    core = (await CoreFactory.deploy()) as unknown as MeritCircleCore;
    await core.waitForDeployment();

    await core.grantRole(SETTLER_ROLE, settler.address);

    // Pool 1: AUCTION pool (mode = 1), 3 members, 3 cycles
    await core.createPool(
      "Trusted Auction Circle",
      1,
      CONTRIBUTION_AMOUNT,
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

  it("settleAuctionCycle rejects if auction not closed", async () => {
    // Open auction and submit bid without closing
    await core.connect(user1).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(settler).openAuction(1, 1);
    await core.connect(user1).submitBid(1, 1, ethers.parseEther("0.0028"));

    await expect(
      core.connect(settler).settleAuctionCycle(1, 1)
    ).to.be.revertedWith("Auction is not closed");
  });

  it("settleAuctionCycle rejects if no best bid", async () => {
    await core.connect(user1).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(settler).openAuction(1, 1);
    await core.connect(settler).closeAuction(1, 1);

    await expect(
      core.connect(settler).settleAuctionCycle(1, 1)
    ).to.be.revertedWith("No valid bids");
  });

  it("settleAuctionCycle rejects if not all members paid", async () => {
    // Only user1 and user2 pay, user3 does not
    await core.connect(user1).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(user2).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });

    await core.connect(settler).openAuction(1, 1);
    await core.connect(user1).submitBid(1, 1, ethers.parseEther("0.0028"));
    await core.connect(settler).closeAuction(1, 1);

    await expect(
      core.connect(settler).settleAuctionCycle(1, 1)
    ).to.be.revertedWith("Not all members paid");
  });

  it("settleAuctionCycle executes successfully: sends payout, updates carry, marks winner, advances cycle", async () => {
    // All 3 members pay
    await core.connect(user1).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(user2).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(user3).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });

    // Open, bid, close
    await core.connect(settler).openAuction(1, 1);
    const winningPayout = ethers.parseEther("0.0027");
    await core.connect(user2).submitBid(1, 1, winningPayout);
    await core.connect(settler).closeAuction(1, 1);

    const initialUser2Balance = await ethers.provider.getBalance(user2.address);

    // Settle
    const tx = await core.connect(settler).settleAuctionCycle(1, 1);

    // Verify event
    // Reward pool = 3 * 0.001 = 0.003 BNB
    // Carried = 0.003 - 0.0027 = 0.0003 BNB
    await expect(tx)
      .to.emit(core, "AuctionCycleSettled")
      .withArgs(
        1,
        1,
        user2.address,
        ethers.parseEther("0.003"),
        winningPayout,
        ethers.parseEther("0.0003")
      );

    // Winner received payout
    const finalUser2Balance = await ethers.provider.getBalance(user2.address);
    expect(finalUser2Balance - initialUser2Balance).to.equal(winningPayout);

    // Check states
    expect(await core.hasReceivedPayout(1, user2.address)).to.be.true;
    expect(await core.carriedReward(1)).to.equal(ethers.parseEther("0.0003"));

    const group = await core.getGroup(1);
    expect(group.currentCycle).to.equal(2);
  });

  it("settleAuctionCycle rejects if winner already received payout", async () => {
    // Cycle 1: All pay, user1 wins and receives payout
    await core.connect(user1).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(user2).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(user3).payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });

    await core.connect(settler).openAuction(1, 1);
    await core.connect(user1).submitBid(1, 1, ethers.parseEther("0.0028"));
    await core.connect(settler).closeAuction(1, 1);
    await core.connect(settler).settleAuctionCycle(1, 1);

    // Cycle 2: user1 cannot even submit bid
    await core.connect(user1).payContribution(1, 2, { value: CONTRIBUTION_AMOUNT });
    await core.connect(settler).openAuction(1, 2);

    await expect(
      core.connect(user1).submitBid(1, 2, ethers.parseEther("0.0028"))
    ).to.be.revertedWith("Member already received payout");
  });
});
