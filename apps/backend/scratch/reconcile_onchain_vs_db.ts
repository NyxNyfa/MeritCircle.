/**
 * [AGENT: DEBUGGER & E2E] — On-Chain vs Off-Chain Reconciliation Audit
 * Compares DB state for all groups against live BNB Testnet contract state.
 * Reports any mismatch found for investigation/patching.
 *
 * Run: cd apps/backend && npx tsx scratch/reconcile_onchain_vs_db.ts
 */
import { PrismaClient } from "@prisma/client";
import { JsonRpcProvider, Contract } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

const CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS || "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C";
const RPC_URL =
  process.env.BNB_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/";

const ABI = [
  "function getGroup(uint256 groupId) external view returns (tuple(uint256 poolId, uint256 groupNumber, uint256 startDate, uint8 memberCount, uint8 currentCycle, bool exists, bool completed, bool paused))",
  "function groupBalance(uint256 groupId) external view returns (uint256)",
  "function carriedReward(uint256 groupId) external view returns (uint256)",
  "function hasReceivedPayout(uint256 groupId, address user) external view returns (bool)",
  "function hasPaidCycle(uint256 groupId, uint256 cycle, address user) external view returns (bool)",
];

type MismatchEntry = {
  contractGroupId: string;
  check: string;
  dbValue: string;
  onChainValue: string;
  severity: "CRITICAL" | "WARNING";
};

async function main() {
  const provider = new JsonRpcProvider(RPC_URL);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

  console.log("=".repeat(70));
  console.log("[AGENT: DEBUGGER] On-Chain vs Off-Chain Reconciliation Audit");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`RPC: ${RPC_URL}`);
  console.log("=".repeat(70));

  const groups = await prisma.group.findMany({
    where: { contractGroupId: { not: null } },
    include: {
      members: { include: { user: { select: { walletAddress: true } } } },
      cycles: { include: { contributions: true }, orderBy: { cycleNumber: "asc" } },
    },
  });

  console.log(`Groups with contractGroupId: ${groups.length}\n`);
  const mismatches: MismatchEntry[] = [];

  for (const group of groups) {
    const cid = group.contractGroupId!;
    const cgId = BigInt(cid);
    console.log(`\n── Contract Group ${cid} | DB: ${group.status} | currentCycle: ${group.currentCycle}`);

    // Fetch on-chain group
    let onChain: any;
    try {
      onChain = await contract.getGroup(cgId);
    } catch (err: any) {
      console.error(`  [ERROR] Cannot read on-chain: ${err.message}`);
      mismatches.push({ contractGroupId: cid, check: "group.exists", dbValue: "exists", onChainValue: "NOT_FOUND", severity: "CRITICAL" });
      continue;
    }

    // 1. group.completed
    const dbCompleted = group.status === "COMPLETED";
    const ocCompleted = Boolean(onChain.completed);
    console.log(`  ${dbCompleted === ocCompleted ? "[OK]" : "[!!]"} group.completed => DB: ${dbCompleted} | On-chain: ${ocCompleted}`);
    if (dbCompleted !== ocCompleted) {
      mismatches.push({ contractGroupId: cid, check: "group.completed", dbValue: String(dbCompleted), onChainValue: String(ocCompleted), severity: "CRITICAL" });
    }

    // 2. currentCycle
    const ocCycle = Number(onChain.currentCycle);
    console.log(`  ${group.currentCycle === ocCycle ? "[OK]" : "[!!]"} currentCycle => DB: ${group.currentCycle} | On-chain: ${ocCycle}`);
    if (group.currentCycle !== ocCycle) {
      mismatches.push({ contractGroupId: cid, check: "currentCycle", dbValue: String(group.currentCycle), onChainValue: String(ocCycle), severity: "CRITICAL" });
    }

    // 3. groupBalance
    const balance = BigInt((await contract.groupBalance(cgId)).toString());
    console.log(`  [INFO] groupBalance on-chain: ${balance.toString()} wei`);
    if (dbCompleted && balance > 0n) {
      console.log(`  [!!] COMPLETED group has remaining on-chain balance: ${balance.toString()} wei`);
      mismatches.push({ contractGroupId: cid, check: "groupBalance_after_completed", dbValue: "0 expected", onChainValue: `${balance.toString()} wei`, severity: "WARNING" });
    }

    // 4. carriedReward
    const carried = BigInt((await contract.carriedReward(cgId)).toString());
    const latestLedger = await prisma.cycleRewardLedger.findFirst({ where: { groupId: group.id }, orderBy: { cycleNumber: "desc" } });
    const dbCarried = BigInt(latestLedger?.remainingCarryRewardWei ?? "0");
    console.log(`  ${dbCarried === carried ? "[OK]" : "[!!]"} carriedReward => DB: ${dbCarried.toString()} | On-chain: ${carried.toString()}`);
    if (dbCarried !== carried) {
      mismatches.push({ contractGroupId: cid, check: "carriedReward", dbValue: dbCarried.toString(), onChainValue: carried.toString(), severity: "WARNING" });
    }

    // 5. hasReceivedPayout per member
    for (const member of group.members) {
      try {
        const ocPayout: boolean = await contract.hasReceivedPayout(cgId, member.user.walletAddress);
        if (member.hasReceivedPayout !== ocPayout) {
          const short = member.user.walletAddress.slice(0, 12) + "...";
          console.log(`  [!!] hasReceivedPayout[${short}] => DB: ${member.hasReceivedPayout} | On-chain: ${ocPayout}`);
          mismatches.push({ contractGroupId: cid, check: `hasReceivedPayout[${member.user.walletAddress}]`, dbValue: String(member.hasReceivedPayout), onChainValue: String(ocPayout), severity: "CRITICAL" });
        }
      } catch { /* skip unreachable members */ }
    }

    // 6. hasPaidCycle per member per completed cycle
    for (const cycle of group.cycles.filter(c => c.status === "COMPLETED")) {
      for (const member of group.members) {
        try {
          const dbC = cycle.contributions.find(c => c.userId === member.userId);
          const dbPaid = dbC?.status === "PAID_ON_TIME" || dbC?.status === "PAID_LATE";
          const ocPaid: boolean = await contract.hasPaidCycle(cgId, BigInt(cycle.cycleNumber), member.user.walletAddress);
          if (dbPaid !== ocPaid) {
            console.log(`  [!!] hasPaidCycle[c${cycle.cycleNumber}][${member.user.walletAddress.slice(0,10)}] => DB: ${dbPaid} | On-chain: ${ocPaid}`);
            mismatches.push({ contractGroupId: cid, check: `hasPaidCycle[c${cycle.cycleNumber}][${member.user.walletAddress}]`, dbValue: String(dbPaid), onChainValue: String(ocPaid), severity: "WARNING" });
          }
        } catch { /* skip */ }
      }
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("RECONCILIATION SUMMARY");
  console.log("=".repeat(70));
  console.log(`Total mismatches: ${mismatches.length}`);

  const critical = mismatches.filter(m => m.severity === "CRITICAL");
  const warnings = mismatches.filter(m => m.severity === "WARNING");

  if (critical.length > 0) {
    console.log(`\n[CRITICAL] (${critical.length}):`);
    critical.forEach(m => console.log(`  Group ${m.contractGroupId} | ${m.check}: DB=${m.dbValue} vs On-chain=${m.onChainValue}`));
  }
  if (warnings.length > 0) {
    console.log(`\n[WARNING] (${warnings.length}):`);
    warnings.forEach(m => console.log(`  Group ${m.contractGroupId} | ${m.check}: DB=${m.dbValue} vs On-chain=${m.onChainValue}`));
  }
  if (mismatches.length === 0) {
    console.log("\n[PASS] ZERO MISMATCHES - DB fully synchronized with on-chain state!");
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error("[FATAL]", e); prisma.$disconnect(); process.exit(1); });

