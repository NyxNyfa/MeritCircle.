#!/usr/bin/env node
// scripts/full-validation.mjs
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const LIVE = args.includes("--live");
const API_URL = (process.env.LIVE_API_URL || "").replace(/\/$/, "");
const WEB_URL = (process.env.LIVE_WEB_URL || "").replace(/\/$/, "");

const results = [];
let failCount = 0;

function record(stage, name, ok, detail = "") {
  results.push({ stage, name, ok, detail });
  if (!ok) failCount++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${stage} | ${name}${detail ? " | " + detail : ""}`);
}

function run(cmd, argsList, opts = {}) {
  const r = spawnSync(cmd, argsList, {
    cwd: opts.cwd || ROOT,
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  return { code: r.status ?? 1, stdout: r.stdout || "", stderr: r.stderr || "" };
}

function pnpmAny(filters, script, cwd) {
  let last = { code: 1, stderr: "no matching package" };
  for (const f of filters) {
    const r = run("pnpm", ["--filter", f, "run", "--if-present", script], { cwd });
    if (r.code === 0) return r;
    if (!/No projects matched/i.test(r.stderr)) return r;
    last = r;
  }
  return last;
}

function readAll(dir) {
  let out = "";
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out += readAll(p);
    else if (/\.(ts|tsx|sol|prisma)$/.test(e.name)) out += fs.readFileSync(p, "utf8");
  }
  return out;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    try { return { __status: res.status, ...JSON.parse(text) }; }
    catch { return { __status: res.status, __text: text }; }
  } catch (e) {
    return { __status: 0, __error: String(e) };
  }
}

async function main() {
  console.log("=== MERIT CIRCLE FULL VALIDATION ===");
  console.log(`Mode: ${LIVE ? "LOCAL + LIVE" : "LOCAL"}\n`);

  // V01 — Files & structure
  const files = [
    "docs/PRD.md",
    "docs/loop/RULES.md",
    "apps/backend/prisma/schema.prisma",
    "apps/backend/prisma/seed-demo.ts",
    "packages/contracts/contracts/MeritCircleCore.sol",
    "packages/domain/src/index.ts",
    "apps/web/src/lib/error.ts",
    "packages/contracts/test/academic-simulation.spec.ts",
    "apps/backend/test/spec-conformance.test.ts",
  ];
  for (const f of files) record("V01", `file exists: ${f}`, fs.existsSync(path.join(ROOT, f)));

  // V02 — Root typecheck
  const tc = run("pnpm", ["run", "--if-present", "typecheck"]);
  record("V02", "root typecheck", tc.code === 0, tc.code === 0 ? "" : (tc.stderr || tc.stdout).slice(0, 200));

  // V03 — Domain tests
  const dom = pnpmAny(["@merit-circle/domain", "*domain*"], "test");
  record("V03", "domain tests", dom.code === 0, dom.code === 0 ? "" : (dom.stderr || dom.stdout).slice(0, 200));

  // V04 — Prisma schema
  const backendDir = path.join(ROOT, "apps/backend");
  const pv = run("pnpm", ["exec", "prisma", "validate"], { cwd: backendDir });
  record("V04", "prisma validate", pv.code === 0, pv.code === 0 ? "" : (pv.stderr || pv.stdout).slice(0, 200));

  // V05 — Backend tests
  const bt = pnpmAny(["@merit-circle/backend", "*backend*"], "test");
  record("V05", "backend tests", bt.code === 0, bt.code === 0 ? "" : (bt.stderr || bt.stdout).slice(0, 200));

  // V06 — Contract compile + tests
  const cc = pnpmAny(["@merit-circle/contracts", "*contracts*"], "compile");
  record("V06", "contract compile", cc.code === 0, cc.code === 0 ? "" : (cc.stderr || cc.stdout).slice(0, 200));
  const ct = pnpmAny(["@merit-circle/contracts", "*contracts*"], "test");
  record("V06", "contract tests", ct.code === 0, ct.code === 0 ? "" : (ct.stderr || ct.stdout).slice(0, 200));

  // V07 — Web build
  const wb = pnpmAny(["@merit-circle/web", "*web*"], "build");
  record("V07", "web build", wb.code === 0, wb.code === 0 ? "" : (wb.stderr || wb.stdout).slice(0, 200));

  // V08 — Security sweep
  const contractSrc = fs.existsSync("packages/contracts/contracts/MeritCircleCore.sol")
    ? fs.readFileSync("packages/contracts/contracts/MeritCircleCore.sol", "utf8") : "";
  record("V08", "no finalSurplus in contract", !/finalSurplus/i.test(contractSrc));
  const schema = fs.existsSync("apps/backend/prisma/schema.prisma")
    ? fs.readFileSync("apps/backend/prisma/schema.prisma", "utf8") : "";
  record("V08", "no Float wei in schema", !/Float\s+\w*[Ww]ei/.test(schema));
  const webSrc = readAll("apps/web/src");
  record("V08", "no PRIVATE_KEY in frontend", !/PRIVATE_KEY/.test(webSrc));
  record("V08", "error helper exists", fs.existsSync("apps/web/src/lib/error.ts"));

  // V09 — Business rules presence
  const backendSrc = readAll("apps/backend/src");
  record("V09", "final settlement / carryover logic", /remainingCarryRewardWei|calculateFinalSettlement/.test(backendSrc));
  record("V09", "minimum payout validation", /minimumPayout|getMinimumPayout/.test(backendSrc));
  record("V09", "join gate email verified", /emailVerified/.test(backendSrc));
  record("V09", "admin role guard", /ADMIN/.test(backendSrc));
  record("V09", "audit log usage", /AuditLog|auditLog/.test(backendSrc));

  // V10/V11 — Live checks (optional)
  if (LIVE && API_URL) {
    const health = await fetchJson(`${API_URL}/health`);
    record("V10", "live backend /health", health.__status === 200, `status=${health.__status}`);
    const pools = await fetchJson(`${API_URL}/api/pools`);
    record("V10", "live pools list", pools.__status === 200 && Array.isArray(pools.pools) && pools.pools.length > 0, `status=${pools.__status}`);
  } else if (LIVE) {
    record("V10", "LIVE_API_URL provided", false, "set $env:LIVE_API_URL first");
  }

  if (LIVE && WEB_URL) {
    try {
      const res = await fetch(WEB_URL, { signal: AbortSignal.timeout(15000) });
      const html = await res.text();
      record("V11", "live web 200", res.status === 200, `status=${res.status}`);
      record("V11", "live web contains Merit", /merit/i.test(html));
    } catch (e) {
      record("V11", "live web reachable", false, String(e).slice(0, 120));
    }
  } else if (LIVE) {
    record("V11", "LIVE_WEB_URL provided", false, "set $env:LIVE_WEB_URL first");
  }

  // Report
  const dir = path.join(ROOT, "docs/validation");
  fs.mkdirSync(dir, { recursive: true });
  const lines = [
    "# Full Validation Report — Merit Circle",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Mode: ${LIVE ? "LOCAL + LIVE" : "LOCAL"}`,
    "",
    "| Stage | Check | Result | Detail |",
    "|---|---|---|---|",
    ...results.map(r => `| ${r.stage} | ${r.name} | ${r.ok ? "PASS" : "FAIL"} | ${r.detail || "-"} |`),
    "",
    `Total: ${results.length} | PASS: ${results.length - failCount} | FAIL: ${failCount}`,
    "",
    failCount === 0 ? "## Verdict: ALL GREEN ✅" : "## Verdict: NEEDS FIX ❌",
  ];
  fs.writeFileSync(path.join(dir, "FULL_VALIDATION_REPORT.md"), lines.join("\n"));

  console.log(`\n=== SUMMARY: ${results.length - failCount}/${results.length} PASS ===`);
  console.log(`Report: docs/validation/FULL_VALIDATION_REPORT.md`);
  process.exit(failCount === 0 ? 0 : 1);
}

main();
