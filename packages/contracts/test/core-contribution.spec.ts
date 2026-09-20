import { expect } from "chai";
import { ethers } from "hardhat";
import { MeritCircleCore } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MeritCircleCore — Contribution Payments", () => {
  let core: MeritCircleCore;
  let admin: HardhatEthersSigner;
  let settler: HardhatEthersSigner;
  let pauser: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const CONTRIBUTION_AMOUNT = ethers.parseEther("0.001");
  const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));
  const PAUSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PAUSER_ROLE"));

  beforeEach(async () => {
    [admin, settler, pauser, user1, user2, user3, outsider] =
      await ethers.getSigners();

    const CoreFactory = await ethers.getContractFactory("MeritCircleCore");
    core = (await CoreFactory.deploy()) as unknown as MeritCircleCore;
    await core.waitForDeployment();

    // Grant roles
    await core.grantRole(SETTLER_ROLE, settler.address);
    await core.grantRole(PAUSER_ROLE, pauser.address);

    // Create Pool 1: 3 members, 3 cycles, 0.001 BNB
    await core.createPool("Starter Pool", 0, CONTRIBUTION_AMOUNT, 3, 3, 10, 0, 1);

    // Register Group 1 with user1, user2, user3
    await core
      .connect(settler)
      .registerGroup(1, 101, [user1.address, user2.address, user3.address]);
  });

  it("member can pay exact contribution amount", async () => {
    const tx = await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });

    await expect(tx)
      .to.emit(core, "ContributionPaid")
      .withArgs(
        1,
        1,
        user1.address,
        CONTRIBUTION_AMOUNT,
        (await ethers.provider.getBlock("latest"))?.timestamp
      );

    expect(await core.hasPaidCycle(1, 1, user1.address)).to.be.true;
    expect(await core.getGroupBalance(1)).to.equal(CONTRIBUTION_AMOUNT);
  });

  it("non-member cannot pay", async () => {
    await expect(
      core
        .connect(outsider)
        .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT })
    ).to.be.revertedWith("Not a group member");
  });

  it("wrong amount is rejected", async () => {
    // Underpayment
    await expect(
      core
        .connect(user1)
        .payContribution(1, 1, { value: ethers.parseEther("0.0005") })
    ).to.be.revertedWith("Incorrect contribution amount");

    // Overpayment
    await expect(
      core
        .connect(user1)
        .payContribution(1, 1, { value: ethers.parseEther("0.002") })
    ).to.be.revertedWith("Incorrect contribution amount");
  });

  it("double payment for same cycle is rejected", async () => {
    await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });

    await expect(
      core
        .connect(user1)
        .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT })
    ).to.be.revertedWith("Already paid for cycle");
  });

  it("multiple members paying increases groupBalance correctly", async () => {
    await core
      .connect(user1)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    expect(await core.getGroupBalance(1)).to.equal(CONTRIBUTION_AMOUNT);

    await core
      .connect(user2)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    expect(await core.getGroupBalance(1)).to.equal(CONTRIBUTION_AMOUNT * 2n);

    await core
      .connect(user3)
      .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT });
    expect(await core.getGroupBalance(1)).to.equal(CONTRIBUTION_AMOUNT * 3n);
  });

  it("payment is rejected when contract paused", async () => {
    await core.connect(pauser).pause();

    await expect(
      core
        .connect(user1)
        .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT })
    ).to.be.revertedWith("Pausable: paused");

    // Unpause allows payments again
    await core.connect(pauser).unpause();
    await expect(
      core
        .connect(user1)
        .payContribution(1, 1, { value: CONTRIBUTION_AMOUNT })
    ).to.not.be.reverted;
  });

  it("payment is rejected when group does not exist", async () => {
    await expect(
      core
        .connect(user1)
        .payContribution(999, 1, { value: CONTRIBUTION_AMOUNT })
    ).to.be.revertedWith("Group does not exist");
  });

  it("payment is rejected when cycle is invalid", async () => {
    // Cycle 0
    await expect(
      core
        .connect(user1)
        .payContribution(1, 0, { value: CONTRIBUTION_AMOUNT })
    ).to.be.revertedWith("Invalid cycle");

    // Cycle > cycleCount (3)
    await expect(
      core
        .connect(user1)
        .payContribution(1, 4, { value: CONTRIBUTION_AMOUNT })
    ).to.be.revertedWith("Invalid cycle");
  });
});
