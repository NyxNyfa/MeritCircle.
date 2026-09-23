import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { MeritCircleCore } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  calculateLateDays,
  calculateLatePenalty,
  clampReputationPoints,
  calculateBaseReward,
} from "../../domain/src";

describe("Academic Simulation Suite — 10 Iterasi Sistem Merit Circle", function () {
  this.timeout(120000); // 2 minutes max for all 10 simulations

  let admin: HardhatEthersSigner;
  let settler: HardhatEthersSigner;
  let members: HardhatEthersSigner[];

  const CONTRIBUTION_AMOUNT = ethers.parseEther("0.01"); // 0.01 BNB per member
  const GROUP_SIZE = 10;
  const CYCLE_COUNT = 10;
  const PAYMENT_WINDOW_DAYS = 10;
  const MAX_DISCOUNT_BPS = 1000; // 10% max discount
  const MINIMUM_TIER = 4;
  const SETTLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("SETTLER_ROLE"));

  before(async () => {
    const signers = await ethers.getSigners();
    admin = signers[0];
    settler = signers[1];
    members = signers.slice(2, 2 + GROUP_SIZE);
    expect(members.length).to.equal(GROUP_SIZE);
  });

  async function deployCoreAndPool(): Promise<{ core: MeritCircleCore; poolId: bigint }> {
    const CoreFactory = await ethers.getContractFactory("MeritCircleCore");
    const core = (await CoreFactory.deploy()) as unknown as MeritCircleCore;
    await core.waitForDeployment();
    await core.grantRole(SETTLER_ROLE, settler.address);

    await core.createPool(
      "Academic Research 10-Circle",
      1, // AUCTION mode
      CONTRIBUTION_AMOUNT,
      GROUP_SIZE,
      CYCLE_COUNT,
      PAYMENT_WINDOW_DAYS,
      MAX_DISCOUNT_BPS,
      MINIMUM_TIER
    );

    return { core, poolId: 1n };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SKENARIO 1: Ideal / Normal Circle (10 Iterasi)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Skenario 1: Ideal / Normal Circle (10 Iterasi Penuh)", () => {
    const ITERATIONS = 10;

    it(`menjalankan ${ITERATIONS} iterasi siklus penuh 10 anggota x 10 siklus tanpa bug (Completion Rate 100%, 0 Defisit)`, async () => {
      let totalCompletedGroups = 0;
      let totalGasConsumed = 0n;

      for (let iter = 1; iter <= ITERATIONS; iter++) {
        const { core, poolId } = await deployCoreAndPool();
        const groupId = 1n;

        // Register Group
        const regTx = await core
          .connect(settler)
          .registerGroup(poolId, BigInt(iter), members.map((m) => m.address));
        const regReceipt = await regTx.wait();
        totalGasConsumed += regReceipt ? regReceipt.gasUsed : 0n;

        // Cycles 1 to 9 (Auction Cycles)
        for (let cycle = 1; cycle <= 9; cycle++) {
          // 1. All 10 members pay contribution on time
          for (const member of members) {
            const payTx = await core
              .connect(member)
              .payContribution(groupId, cycle, { value: CONTRIBUTION_AMOUNT });
            const payReceipt = await payTx.wait();
            totalGasConsumed += payReceipt ? payReceipt.gasUsed : 0n;
          }

          // 2. Settler opens auction
          const openTx = await core.connect(settler).openAuction(groupId, cycle);
          const openReceipt = await openTx.wait();
          totalGasConsumed += openReceipt ? openReceipt.gasUsed : 0n;

          // 3. Member (cycle - 1) submits discount bid (5% discount)
          const bidder = members[cycle - 1];
          const expectedReward = await core.getExpectedRewardPool(groupId);
          const bidPayout = (expectedReward * 95n) / 100n; // 5% discount

          const bidTx = await core.connect(bidder).submitBid(groupId, cycle, bidPayout);
          const bidReceipt = await bidTx.wait();
          totalGasConsumed += bidReceipt ? bidReceipt.gasUsed : 0n;

          // 4. Settler closes auction and settles cycle
          const closeTx = await core.connect(settler).closeAuction(groupId, cycle);
          const closeReceipt = await closeTx.wait();
          totalGasConsumed += closeReceipt ? closeReceipt.gasUsed : 0n;

          const settleTx = await core.connect(settler).settleAuctionCycle(groupId, cycle);
          const settleReceipt = await settleTx.wait();
          totalGasConsumed += settleReceipt ? settleReceipt.gasUsed : 0n;

          // Verify winner received payout and carried reward increased
          const hasWon = await core.hasReceivedPayout(groupId, bidder.address);
          expect(hasWon).to.be.true;

          const carried = await core.carriedReward(groupId);
          expect(carried).to.be.greaterThan(0n);

          // 5. Time travel: Advance 30 days to next cycle
          await time.increase(30 * 24 * 3600);
        }

        // Cycle 10 (Final Cycle: Full Payout, NO FINAL SURPLUS)
        const finalCycle = 10;
        for (const member of members) {
          const payTx = await core
            .connect(member)
            .payContribution(groupId, finalCycle, { value: CONTRIBUTION_AMOUNT });
          const payReceipt = await payTx.wait();
          totalGasConsumed += payReceipt ? payReceipt.gasUsed : 0n;
        }

        const finalRecipient = members[9]; // The 10th member
        const finalSettleTx = await core
          .connect(settler)
          .settleFinalCycle(groupId, finalCycle, finalRecipient.address);
        const finalReceipt = await finalSettleTx.wait();
        totalGasConsumed += finalReceipt ? finalReceipt.gasUsed : 0n;

        // Verify Final Settlement Invariants:
        const group = await core.getGroup(groupId);
        expect(group.completed).to.be.true;

        const balance = await core.getGroupBalance(groupId);
        expect(balance).to.equal(0n); // STRICTLY 0

        const carriedAfterFinal = await core.carriedReward(groupId);
        expect(carriedAfterFinal).to.equal(0n); // ZERO FINAL SURPLUS

        for (const member of members) {
          const received = await core.hasReceivedPayout(groupId, member.address);
          expect(received).to.be.true;
        }

        totalCompletedGroups++;
      }

      expect(totalCompletedGroups).to.equal(ITERATIONS);
      const avgGasPerSimulation = totalGasConsumed / BigInt(ITERATIONS);
      console.log(
        `\n[Skenario 1] Selesai: ${totalCompletedGroups}/${ITERATIONS} iterasi berhasil tuntas (100%).`
      );
      console.log(`[Skenario 1] Rata-rata Gas per Siklus Penuh: ${avgGasPerSimulation.toString()}`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SKENARIO 2: Keterlambatan Pembayaran (Late Payment with Time Travel - 10 Iterasi)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Skenario 2: Keterlambatan Pembayaran & Penalti Reputasi (10 Iterasi)", () => {
    const ITERATIONS = 10;

    it(`menjalankan ${ITERATIONS} iterasi simulasi keterlambatan melewati masa tenggang (Time Travel 16 hari), mencatat penalti -60 poin, dan tuntas 100%`, async () => {
      let totalCompletedGroups = 0;
      let totalLatePenalties = 0;

      for (let iter = 1; iter <= ITERATIONS; iter++) {
        const { core, poolId } = await deployCoreAndPool();
        const groupId = 1n;

        await core
          .connect(settler)
          .registerGroup(poolId, BigInt(iter), members.map((m) => m.address));

        // Anggota 0..7 bayar tepat waktu di hari ke-3
        await time.increase(3 * 24 * 3600);
        for (let i = 0; i < 8; i++) {
          await core.connect(members[i]).payContribution(groupId, 1, { value: CONTRIBUTION_AMOUNT });
        }

        // Anggota 8 lalai (terlambat): Majukan waktu melewati Payment Window (10 hari) ke Hari ke-16
        // Tambahan 13 hari -> total 3 + 13 = 16 hari dari awal siklus
        await time.increase(13 * 24 * 3600);

        // Evaluasi Keterlambatan via Domain Engine
        const currentCycleDay = 16;
        const daysLate = calculateLateDays(currentCycleDay, PAYMENT_WINDOW_DAYS);
        expect(daysLate).to.equal(6); // 16 - 10 = 6 hari telat

        const penaltyPoints = calculateLatePenalty(daysLate);
        expect(penaltyPoints).to.equal(60); // 6 * 10 = 60 poin penalti
        totalLatePenalties += penaltyPoints;

        // Anggota 8 membayar iurannya setelah terkena penalti
        await core.connect(members[8]).payContribution(groupId, 1, { value: CONTRIBUTION_AMOUNT });

        // Anggota 9 juga membayar
        await core.connect(members[9]).payContribution(groupId, 1, { value: CONTRIBUTION_AMOUNT });

        // Siklus 1 berhasil diselesaikan
        await core.connect(settler).openAuction(groupId, 1);
        const bidPayout = ethers.parseEther("0.095");
        await core.connect(members[0]).submitBid(groupId, 1, bidPayout);
        await core.connect(settler).closeAuction(groupId, 1);
        await core.connect(settler).settleAuctionCycle(groupId, 1);

        // Majukan waktu dan selesaikan siklus 2 sampai 10
        for (let cycle = 2; cycle <= 9; cycle++) {
          await time.increase(30 * 24 * 3600);
          for (const member of members) {
            await core.connect(member).payContribution(groupId, cycle, { value: CONTRIBUTION_AMOUNT });
          }
          await core.connect(settler).openAuction(groupId, cycle);
          const expected = await core.getExpectedRewardPool(groupId);
          await core.connect(members[cycle - 1]).submitBid(groupId, cycle, (expected * 95n) / 100n);
          await core.connect(settler).closeAuction(groupId, cycle);
          await core.connect(settler).settleAuctionCycle(groupId, cycle);
        }

        // Final Cycle 10
        await time.increase(30 * 24 * 3600);
        for (const member of members) {
          await core.connect(member).payContribution(groupId, 10, { value: CONTRIBUTION_AMOUNT });
        }
        await core.connect(settler).settleFinalCycle(groupId, 10, members[9].address);

        const group = await core.getGroup(groupId);
        expect(group.completed).to.be.true;
        totalCompletedGroups++;
      }

      expect(totalCompletedGroups).to.equal(ITERATIONS);
      expect(totalLatePenalties / ITERATIONS).to.equal(60);

      console.log(
        `\n[Skenario 2] Selesai: ${totalCompletedGroups}/${ITERATIONS} iterasi berhasil tuntas (100%).`
      );
      console.log(`[Skenario 2] Rata-rata Penalti Terlambat Tercatat: -60 Poin per Kasus.`);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SKENARIO 3: Anggota Kabur / Early-Draw Default & Carryover Buffer (10 Iterasi)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Skenario 3: Anggota Kabur (Early-Draw Default) & Ketahanan Kas (10 Iterasi)", () => {
    const ITERATIONS = 10;

    it(`menjalankan ${ITERATIONS} iterasi default: pemenang putaran 1 kabur di putaran 2, carryover buffer melindungi kas, dan kontrak mencegah unbacked payout`, async () => {
      let totalProtectedCases = 0;
      let totalDeficitAmount = 0n;
      let totalBufferAmount = 0n;

      for (let iter = 1; iter <= ITERATIONS; iter++) {
        const { core, poolId } = await deployCoreAndPool();
        const groupId = 1n;

        await core
          .connect(settler)
          .registerGroup(poolId, BigInt(iter), members.map((m) => m.address));

        // 1. Putaran 1: Semua 10 anggota membayar
        for (const member of members) {
          await core.connect(member).payContribution(groupId, 1, { value: CONTRIBUTION_AMOUNT });
        }

        // 2. Pemenang nakal (members[9]) memenangkan lelang putaran 1 dengan diskon 10% (max discount)
        const rogueMember = members[9];
        await core.connect(settler).openAuction(groupId, 1);

        const baseReward = calculateBaseReward(GROUP_SIZE, CONTRIBUTION_AMOUNT); // 0.10 BNB
        const discountPayout = (baseReward * 90n) / 100n; // 0.09 BNB (diskon 10%)

        await core.connect(rogueMember).submitBid(groupId, 1, discountPayout);
        await core.connect(settler).closeAuction(groupId, 1);
        await core.connect(settler).settleAuctionCycle(groupId, 1);

        // Kas kontrak sekarang memiliki saldo carryover buffer sebesar 0.01 BNB
        const carryoverBuffer = await core.carriedReward(groupId);
        expect(carryoverBuffer).to.equal(ethers.parseEther("0.01"));

        // 3. TIME TRAVEL: Majukan waktu 30 hari ke putaran ke-2
        await time.increase(30 * 24 * 3600);

        // 4. Putaran 2: 9 Anggota jujur (members[0..8]) tetap membayar iuran
        for (let i = 0; i < 9; i++) {
          await core.connect(members[i]).payContribution(groupId, 2, { value: CONTRIBUTION_AMOUNT });
        }

        // 5. Pemenang nakal KABUR (tidak bayar)!
        // Time travel melewati batas waktu iuran (10 hari) dan batas siklus (30 hari)
        await time.increase(30 * 24 * 3600);

        // Evaluasi Solvensi & Perlindungan Kas:
        const missingContribution = CONTRIBUTION_AMOUNT; // 0.01 BNB defisit dari rogue member
        const currentBalance = await core.getGroupBalance(groupId);
        // Saldo tersisa = carryover buffer (0.01) + 9 iuran anggota jujur (0.09) = 0.10 BNB
        expect(currentBalance).to.equal(ethers.parseEther("0.10"));

        // Efektivitas Buffer: Buffer menutup 100% dari defisit kontribusi yang hilang!
        const bufferCoverageRatio = (carryoverBuffer * 100n) / missingContribution;
        expect(bufferCoverageRatio).to.be.at.least(100n);

        totalDeficitAmount += missingContribution;
        totalBufferAmount += carryoverBuffer;

        // Kontrak memproteksi kas: settlement normal dilarang karena ada anggota yang belum bayar
        const allPaid = await core.allMembersPaid(groupId, 2);
        expect(allPaid).to.be.false;

        await core.connect(settler).openAuction(groupId, 2);
        const cycle2MinPayout = await core.getMinimumPayout(groupId);
        await core.connect(members[0]).submitBid(groupId, 2, cycle2MinPayout);
        await core.connect(settler).closeAuction(groupId, 2);

        // Mencoba settle siklus saat anggota kabur WAJIB DITOLAK oleh smart contract
        await expect(
          core.connect(settler).settleAuctionCycle(groupId, 2)
        ).to.be.revertedWith("Not all members paid");

        // Evaluasi Penalti untuk Anggota Kabur via Domain
        const maxPenalty = calculateLatePenalty(30);
        expect(maxPenalty).to.equal(100); // Penalti maksimal -100 poin
        const updatedReputation = clampReputationPoints(100 - maxPenalty); // Turun ke 0
        expect(updatedReputation).to.equal(0);

        totalProtectedCases++;
      }

      expect(totalProtectedCases).to.equal(ITERATIONS);
      console.log(
        `\n[Skenario 3] Selesai: ${totalProtectedCases}/${ITERATIONS} kasus default berhasil terlindungi.`
      );
      console.log(
        `[Skenario 3] Carryover Buffer Berhasil Menutup Defisit: ${
          (totalBufferAmount * 100n) / totalDeficitAmount
        }%`
      );
    });
  });
});
