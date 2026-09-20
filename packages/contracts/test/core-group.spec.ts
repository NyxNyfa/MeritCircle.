import { expect } from "chai";
import { ethers } from "hardhat";
import { MeritCircleCore } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("MeritCircleCore — Group & Pool Management", () => {
  let core: MeritCircleCore;
  let admin: HardhatEthersSigner;
  let settler: HardhatEthersSigner;
  let pauser: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;
  let user3: HardhatEthersSigner;
  let outsider: HardhatEthersSigner;

  const POOL_CREATOR_ROLE = ethers.keccak256(
    ethers.toUtf8Bytes("POOL_CREATOR_ROLE")
  );
  const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));

  beforeEach(async () => {
    [admin, settler, pauser, user1, user2, user3, outsider] =
      await ethers.getSigners();

    const CoreFactory = await ethers.getContractFactory("MeritCircleCore");
    core = (await CoreFactory.deploy()) as unknown as MeritCircleCore;
    await core.waitForDeployment();

    // Grant roles
    await core.grantRole(SETTLER_ROLE, settler.address);
  });

  describe("Pool Creation", () => {
    it("admin/pool creator can create pool", async () => {
      const tx = await core.createPool(
        "Citizen Circle A",
        0, // BASIC
        ethers.parseEther("0.001"),
        3,
        3,
        10,
        0,
        2
      );

      await expect(tx)
        .to.emit(core, "PoolCreated")
        .withArgs(1, "Citizen Circle A", 0, ethers.parseEther("0.001"), 3, 3);

      const pool = await core.getPool(1);
      expect(pool.name).to.equal("Citizen Circle A");
      expect(pool.mode).to.equal(0);
      expect(pool.contributionAmount).to.equal(ethers.parseEther("0.001"));
      expect(pool.groupSize).to.equal(3);
      expect(pool.cycleCount).to.equal(3);
      expect(pool.paymentWindowDays).to.equal(10);
      expect(pool.active).to.be.true;
    });

    it("non-admin without POOL_CREATOR_ROLE cannot create pool", async () => {
      await expect(
        core
          .connect(outsider)
          .createPool(
            "Fake Pool",
            0,
            ethers.parseEther("0.001"),
            3,
            3,
            10,
            0,
            1
          )
      ).to.be.reverted;
    });

    it("pool validation works — rejects invalid parameters", async () => {
      // Empty name
      await expect(
        core.createPool("", 0, ethers.parseEther("0.001"), 3, 3, 10, 0, 1)
      ).to.be.revertedWith("Empty pool name");

      // Invalid mode (not 0 or 1)
      await expect(
        core.createPool(
          "Test",
          2,
          ethers.parseEther("0.001"),
          3,
          3,
          10,
          0,
          1
        )
      ).to.be.revertedWith("Invalid pool mode");

      // Zero contribution
      await expect(
        core.createPool("Test", 0, 0, 3, 3, 10, 0, 1)
      ).to.be.revertedWith("Contribution must be > 0");

      // Group size < 2
      await expect(
        core.createPool(
          "Test",
          0,
          ethers.parseEther("0.001"),
          1,
          1,
          10,
          0,
          1
        )
      ).to.be.revertedWith("Group size must be >= 2");

      // cycleCount != groupSize
      await expect(
        core.createPool(
          "Test",
          0,
          ethers.parseEther("0.001"),
          3,
          5,
          10,
          0,
          1
        )
      ).to.be.revertedWith("Cycle count must equal group size");

      // paymentWindowDays == 0
      await expect(
        core.createPool(
          "Test",
          0,
          ethers.parseEther("0.001"),
          3,
          3,
          0,
          0,
          1
        )
      ).to.be.revertedWith("Payment window must be > 0");
    });
  });

  describe("Group Registration", () => {
    beforeEach(async () => {
      await core.createPool(
        "Citizen Circle A",
        0,
        ethers.parseEther("0.001"),
        3,
        3,
        10,
        0,
        2
      );
    });

    it("settler can register group", async () => {
      const members = [user1.address, user2.address, user3.address];
      const tx = await core
        .connect(settler)
        .registerGroup(1, 101, members);

      await expect(tx)
        .to.emit(core, "GroupRegistered")
        .withArgs(1, 1, 101, (await ethers.provider.getBlock("latest"))?.timestamp);

      const group = await core.getGroup(1);
      expect(group.poolId).to.equal(1);
      expect(group.groupNumber).to.equal(101);
      expect(group.memberCount).to.equal(3);
      expect(group.exists).to.be.true;
      expect(group.completed).to.be.false;

      const storedMembers = await core.getGroupMembers(1);
      expect(storedMembers).to.deep.equal(members);

      expect(await core.isMember(1, user1.address)).to.be.true;
      expect(await core.isMember(1, outsider.address)).to.be.false;
    });

    it("non-settler cannot register group", async () => {
      const members = [user1.address, user2.address, user3.address];
      await expect(
        core.connect(outsider).registerGroup(1, 101, members)
      ).to.be.reverted;
    });

    it("register group rejects invalid pool", async () => {
      const members = [user1.address, user2.address, user3.address];
      await expect(
        core.connect(settler).registerGroup(999, 101, members)
      ).to.be.revertedWith("Pool does not exist");
    });

    it("register group rejects wrong member count", async () => {
      const twoMembers = [user1.address, user2.address];
      await expect(
        core.connect(settler).registerGroup(1, 101, twoMembers)
      ).to.be.revertedWith("Invalid member count");
    });

    it("register group rejects duplicate groupNumber for same pool", async () => {
      const members = [user1.address, user2.address, user3.address];
      await core.connect(settler).registerGroup(1, 101, members);

      await expect(
        core.connect(settler).registerGroup(1, 101, members)
      ).to.be.revertedWith("Group number already used");
    });

    it("register group rejects duplicate member", async () => {
      const dupeMembers = [user1.address, user1.address, user3.address];
      await expect(
        core.connect(settler).registerGroup(1, 101, dupeMembers)
      ).to.be.revertedWith("Duplicate member in group");
    });

    it("group and members are stored correctly", async () => {
      const members = [user1.address, user2.address, user3.address];
      await core.connect(settler).registerGroup(1, 202, members);

      const group = await core.getGroup(1);
      expect(group.poolId).to.equal(1);
      expect(group.groupNumber).to.equal(202);

      const groupMembersList = await core.getGroupMembers(1);
      expect(groupMembersList.length).to.equal(3);
      expect(groupMembersList[0]).to.equal(user1.address);
      expect(groupMembersList[1]).to.equal(user2.address);
      expect(groupMembersList[2]).to.equal(user3.address);
    });
  });
});
