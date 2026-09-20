import { expect } from "chai";
import { ethers } from "hardhat";
import { MeritCircleCore } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MeritCircleCore — Auction Bidding", () => {
  let core: MeritCircleCore;
  let admin: HardhatEthersSigner;
  let settler: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const CONTRIBUTION_AMOUNT = ethers.parseEther("0.001");
  const MAX_DISCOUNT_BPS = 1000; // 10% max discount
  const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));

  beforeEach(async () => {
    [admin, settler, user1, user2, user3, outsider] = await ethers.getSigners();

    const CoreFactory = await ethers.getContractFactory("MeritCircleCore");
    core = (await CoreFactory.deploy()) as unknown as MeritCircleCore;
    await core.waitForDeployment();

    await core.grantRole(SETTLER_ROLE, settler.address);

    // Pool 1: AUCTION pool (mode = 1)
    // 3 members, 3 cycles, 0.001 BNB contribution, maxDiscountBps = 1000
    await core.createPool(
      "Trusted Auction Circle",
      1, // AUCTION
      CONTRIBUTION_AMOUNT,
      3,
      3,
      10,
      MAX_DISCOUNT_BPS,
      4
    );

    // Register Group 1
    await core
      .connect(settler)
      .registerGroup(1, 101, [user1.address, user2.address, user3.address]);

    // Pool 2: BASIC pool (mode = 0)
    await core.createPool(
      "Starter Basic Circle",
      0, // BASIC
      CONTRIBUTION_AMOUNT,
      3,
      3,
      10,
      0,
      1
    );

    // Register Group 2 (basic)
    await core
      .connect(settler)
      .registerGroup(2, 102, [user1.address, user2.address, user3.address]);
  });

  it("non-auction pool cannot open auction", async () => {
    // Group 2 is in BASIC pool
    await expect(
      core.connect(settler).openAuction(2, 1)
    ).to.be.revertedWith("Not an auction pool");
  });

  it("final cycle cannot open auction", async () => {
    // Cycle 3 is final cycle (groupSize = 3, cycleCount = 3)
    await expect(
      core.connect(settler).openAuction(1, 3)
    ).to.be.revertedWith("Cannot auction final cycle");
  });

  it("openAuction only SETTLER_ROLE", async () => {
    await expect(
      core.connect(outsider).openAuction(1, 1)
    ).to.be.reverted;

    await expect(core.connect(settler).openAuction(1, 1))
      .to.emit(core, "AuctionOpened")
      .withArgs(1, 1);
  });

  it("closeAuction only SETTLER_ROLE", async () => {
    await core.connect(settler).openAuction(1, 1);

    await expect(
      core.connect(outsider).closeAuction(1, 1)
    ).to.be.reverted;

    await expect(core.connect(settler).closeAuction(1, 1))
      .to.emit(core, "AuctionClosed")
      .withArgs(1, 1);
  });

  it("submitBid rejects when auction not open", async () => {
    // User pays first
    await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });

    await expect(
      core.connect(user1).submitBid(1, 1, ethers.parseEther("0.0028"))
    ).to.be.revertedWith("Auction is not open");
  });

  it("submitBid rejects when auction closed", async () => {
    await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });

    await core.connect(settler).openAuction(1, 1);
    await core.connect(settler).closeAuction(1, 1);

    await expect(
      core.connect(user1).submitBid(1, 1, ethers.parseEther("0.0028"))
    ).to.be.revertedWith("Auction is closed");
  });

  it("submitBid rejects non-member", async () => {
    await core.connect(settler).openAuction(1, 1);

    await expect(
      core.connect(outsider).submitBid(1, 1, ethers.parseEther("0.0028"))
    ).to.be.revertedWith("Not a group member");
  });

  it("submitBid rejects member who has not paid", async () => {
    await core.connect(settler).openAuction(1, 1);

    // user1 has not paid
    await expect(
      core.connect(user1).submitBid(1, 1, ethers.parseEther("0.0028"))
    ).to.be.revertedWith("Member has not paid current cycle");
  });

  it("submitBid rejects payout above reward pool", async () => {
    await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(settler).openAuction(1, 1);

    // Expected reward pool = 3 * 0.001 = 0.003 BNB
    const aboveReward = ethers.parseEther("0.0031");
    await expect(
      core.connect(user1).submitBid(1, 1, aboveReward)
    ).to.be.revertedWith("Bid exceeds reward pool");
  });

  it("submitBid rejects payout below minimum payout", async () => {
    await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(settler).openAuction(1, 1);

    // Expected reward pool = 0.003 BNB
    // maxDiscountBps = 1000 (10%) => minPayout = 0.0027 BNB
    const belowMin = ethers.parseEther("0.0026");
    await expect(
      core.connect(user1).submitBid(1, 1, belowMin)
    ).to.be.revertedWith("Bid below minimum payout");
  });

  it("valid bid sets best bid and emits event", async () => {
    await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(settler).openAuction(1, 1);

    const validBid = ethers.parseEther("0.0028");
    await expect(core.connect(user1).submitBid(1, 1, validBid))
      .to.emit(core, "BidSubmitted")
      .withArgs(1, 1, user1.address, validBid);

    const auction = await core.getAuction(1, 1);
    expect(auction.bestBidder).to.equal(user1.address);
    expect(auction.bestBidAmount).to.equal(validBid);
  });

  it("lower bid replaces best bid", async () => {
    await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core
      .connect(user2)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(settler).openAuction(1, 1);

    // User 1 bids 0.0029 BNB
    await core.connect(user1).submitBid(1, 1, ethers.parseEther("0.0029"));

    // User 2 bids 0.00275 BNB (better discount / lower payout)
    await core.connect(user2).submitBid(1, 1, ethers.parseEther("0.00275"));

    const auction = await core.getAuction(1, 1);
    expect(auction.bestBidder).to.equal(user2.address);
    expect(auction.bestBidAmount).to.equal(ethers.parseEther("0.00275"));
  });

  it("equal bid does not replace earliest best bid", async () => {
    await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core
      .connect(user2)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    await core.connect(settler).openAuction(1, 1);

    // User 1 bids 0.0028 BNB first
    await core.connect(user1).submitBid(1, 1, ethers.parseEther("0.0028"));

    // User 2 bids same 0.0028 BNB later
    await core.connect(user2).submitBid(1, 1, ethers.parseEther("0.0028"));

    // Earliest bidder stays
    const auction = await core.getAuction(1, 1);
    expect(auction.bestBidder).to.equal(user1.address);
    expect(auction.bestBidAmount).to.equal(ethers.parseEther("0.0028"));
  });
});
