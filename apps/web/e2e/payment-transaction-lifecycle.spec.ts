import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { ContributionItem } from "../src/components/payment/PaymentCard";

type PaymentScenario = "success" | "rejected" | "reverted" | "backend-error" | "pending";

const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
const transactionHash = `0x${"a".repeat(64)}`;
const contractAddress = "0x71a41e2993ecF330Ebb7D22C2F752a606d992A8C";
const user = {
  id: "user-payment-e2e",
  walletAddress,
  role: "USER",
  username: "payment_tester",
  email: "payment@example.com",
  isEmailVerified: true,
  avatarUrl: null,
  xUrl: null,
  telegramUrl: null,
  discordHandle: null,
  reputationPoints: 200,
  tier: 2,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const contribution: ContributionItem = {
  id: "contribution-payment-e2e",
  groupId: "group-payment-e2e",
  contractGroupId: "2",
  groupNumber: 2,
  groupCurrentCycle: 1,
  cycleId: "cycle-payment-e2e-1",
  cycleNumber: 1,
  cycleStatus: "PAYMENT_OPEN",
  isPayable: true,
  poolName: "Starter Circle (Newcomer)",
  poolMode: "BASIC",
  externalPoolId: "START-1",
  amountWei: "800000000000000",
  dueDate: "2027-01-01T00:00:00.000Z",
  status: "PENDING",
};

const responseHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

async function captureScreenshot(page: Page, name: string) {
  const screenshotDir = process.env.PLAYWRIGHT_SCREENSHOT_DIR;
  if (screenshotDir) {
    await page.screenshot({
      path: path.join(screenshotDir, `${name}.png`),
      fullPage: true,
    });
  }
}

async function installPaymentScenario(page: Page, scenario: PaymentScenario) {
  let contributionStatus: ContributionItem["status"] = "PENDING";
  let confirmRequests = 0;
  let fallbackConfirmRequests = 0;

  await page.addInitScript(
    ({ address, hash, paymentScenario }) => {
      (window as any).__paymentMetrics = {
        sendTransactions: 0,
        receiptRequests: 0,
        confirmRequests: 0,
      };

      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          if (method === "eth_accounts") return [address];
          if (method === "eth_chainId") return "0x61";
          if (method === "eth_sendTransaction") {
            const metrics = (window as any).__paymentMetrics;
            metrics.sendTransactions += 1;
            if (paymentScenario === "rejected") {
              const error = new Error("User denied transaction signature.");
              (error as any).code = 4001;
              throw error;
            }
            return hash;
          }
          if (method === "eth_getTransactionReceipt") {
            const metrics = (window as any).__paymentMetrics;
            metrics.receiptRequests += 1;
            if (paymentScenario === "pending" && metrics.receiptRequests === 1) {
              return null;
            }
            return {
              transactionHash: hash,
              status: paymentScenario === "reverted" ? "0x0" : "0x1",
              blockNumber: "0x1234",
            };
          }
          throw new Error(`Unsupported wallet method: ${method}`);
        },
      };
    },
    {
      address: walletAddress,
      hash: transactionHash,
      paymentScenario: scenario,
    }
  );

  await page.route("**/*", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) {
      await route.continue();
      return;
    }
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: responseHeaders });
      return;
    }

    let status = 200;
    let payload: unknown;

    if (path === "/api/auth/session") {
      payload = { user };
    } else if (path === "/api/profile") {
      payload = { profile: user };
    } else if (path === "/api/reputation/me") {
      payload = {
        points: 200,
        reputationPoints: 200,
        tier: 2,
        maxActiveGroups: 3,
      };
    } else if (path === "/api/reputation/me/history") {
      payload = { events: [] };
    } else if (path === "/api/contributions/me") {
      payload = {
        contributions: [
          {
            ...contribution,
            status: contributionStatus,
            txHash: contributionStatus.startsWith("PAID") ? transactionHash : null,
          },
        ],
      };
    } else if (path === "/api/payments/payment-intent") {
      payload = {
        intent: {
          id: contribution.id,
          contributionId: contribution.id,
          cycleId: contribution.cycleId,
          contractGroupId: contribution.contractGroupId,
          contractAddress,
          contributionAmountWei: contribution.amountWei,
        },
      };
    } else if (
      path === "/api/payments/confirm" ||
      path === "/api/contributions/confirm"
    ) {
      confirmRequests += 1;
      if (scenario === "backend-error" && confirmRequests === 1) {
        status = 503;
        payload = {
          error: {
            code: "PAYMENT_CONFIRMATION_UNAVAILABLE",
            message: "Backend verification is temporarily unavailable",
          },
        };
      } else {
        contributionStatus = "PAID_ON_TIME";
        payload = {
          contributionId: contribution.id,
          status: "PAID_ON_TIME",
          contribution: {
            id: contribution.id,
            contributionId: contribution.id,
            status: "PAID_ON_TIME",
          },
          payment: {
            txHash: transactionHash,
            status: "PAID_ON_TIME",
          },
        };
      }
    } else if (path === "/api/contributions/confirm") {
      fallbackConfirmRequests += 1;
      status = 500;
      payload = {
        error: {
          code: "UNEXPECTED_FALLBACK_CONFIRM",
          message: "Fallback confirmation must not be called",
        },
      };
    } else {
      status = 404;
      payload = { error: { code: "NOT_FOUND", message: "Not found" } };
    }

    await route.fulfill({
      status,
      headers: responseHeaders,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  return {
    getConfirmRequests: () => confirmRequests,
    getFallbackConfirmRequests: () => fallbackConfirmRequests,
    getSendTransactions: () =>
      page.evaluate(
        () => (window as any).__paymentMetrics.sendTransactions as number
      ),
    getReceiptRequests: () =>
      page.evaluate(
        () => (window as any).__paymentMetrics.receiptRequests as number
      ),
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ token, storedUser }) => {
      window.localStorage.setItem("merit_circle_auth_token", token);
      window.localStorage.setItem("merit_circle_auth_user", JSON.stringify(storedUser));
    },
    { token: "payment-e2e-token", storedUser: user }
  );
});

test("user rejection keeps the contribution pending and never calls backend confirmation", async ({ page }) => {
  const counters = await installPaymentScenario(page, "rejected");
  await page.goto("/pay");

  const card = page.getByTestId(`payment-card-${contribution.id}`);
  await expect(card.getByTestId("payment-status")).toHaveText("PAYMENT OPEN");
  await card.getByTestId("payment-button").click();

  await expect(page.getByTestId("payment-error")).toContainText(
    "Transaksi dibatalkan oleh pengguna"
  );
  await expect(page.getByTestId("payment-error")).toContainText(
    "Tidak ada pembayaran yang dicatat"
  );
  await expect(page.getByTestId("payment-success")).toHaveCount(0);
  await expect(card.getByTestId("payment-status")).toHaveText("PAYMENT OPEN");
  await expect(card.getByTestId("payment-button")).toBeEnabled();
  await expect.poll(() => counters.getConfirmRequests()).toBe(0);
  await expect.poll(() => counters.getFallbackConfirmRequests()).toBe(0);
  await expect(page.getByRole("heading", { name: /Riwayat Setoran Selesai/ })).toHaveCount(0);
  await captureScreenshot(page, "payment-user-rejected");
});

test("on-chain reverted receipt stays unpaid and never calls backend confirmation", async ({ page }) => {
  const counters = await installPaymentScenario(page, "reverted");
  await page.goto("/pay");

  const card = page.getByTestId(`payment-card-${contribution.id}`);
  await card.getByTestId("payment-button").click();

  await expect(page.getByTestId("payment-error")).toContainText(
    "Transaksi on-chain gagal/revert"
  );
  await expect(page.getByTestId("payment-error")).toContainText(
    "Tidak ada pembayaran yang dicatat"
  );
  await expect(page.getByTestId("payment-error")).toContainText(transactionHash);
  await expect(page.getByTestId("payment-success")).toHaveCount(0);
  await expect(card.getByTestId("payment-status")).toHaveText("PAYMENT OPEN");
  await expect(card.getByTestId("payment-button")).toBeEnabled();
  await expect.poll(() => counters.getConfirmRequests()).toBe(0);
  await expect.poll(() => counters.getFallbackConfirmRequests()).toBe(0);
  await expect(page.getByRole("heading", { name: /Riwayat Setoran Selesai/ })).toHaveCount(0);
  await captureScreenshot(page, "payment-receipt-reverted");
});

test("backend confirmation retry rechecks the same successful receipt without sending a second wallet transaction", async ({ page }) => {
  const counters = await installPaymentScenario(page, "backend-error");
  await page.goto("/pay");

  const card = page.getByTestId(`payment-card-${contribution.id}`);
  await card.getByTestId("payment-button").click();

  await expect(page.getByTestId("payment-error")).toContainText(
    "Backend verification is temporarily unavailable"
  );
  await expect(card.getByTestId("payment-button")).toHaveText(
    "Periksa Status / Konfirmasi Ulang"
  );
  await expect(card.getByTestId("payment-status")).toHaveText("PAYMENT OPEN");
  await expect.poll(() => counters.getConfirmRequests()).toBe(1);
  await expect.poll(() => counters.getSendTransactions()).toBe(1);
  await page.reload();
  await expect(page.getByTestId(`payment-card-${contribution.id}`).getByTestId("payment-button")).toHaveText(
    "Periksa Status / Konfirmasi Ulang"
  );

  await page.getByTestId(`payment-card-${contribution.id}`).getByTestId("payment-button").click();

  await expect.poll(() => counters.getConfirmRequests()).toBe(2);
  await expect.poll(() => counters.getSendTransactions()).toBe(0);
  await expect(
    page.getByRole("heading", { name: /Riwayat Setoran Selesai \(1\)/ })
  ).toBeVisible();
  await expect(page.getByTestId(`payment-card-${contribution.id}`)).toHaveAttribute(
    "data-payment-status",
    "paid"
  );
  await expect
    .poll(() =>
      page.evaluate(
        (id) => window.localStorage.getItem(`merit_circle_payment_attempt_${id}`),
        contribution.id
      )
    )
    .toBeNull();
});

test("pending receipt stays pending until a successful receipt is available", async ({ page }) => {
  const counters = await installPaymentScenario(page, "pending");
  await page.goto("/pay");

  const card = page.getByTestId(`payment-card-${contribution.id}`);
  await card.getByTestId("payment-button").click();

  await expect.poll(() => counters.getSendTransactions()).toBe(1);
  await expect
    .poll(() =>
      page.evaluate(
        (id) => window.localStorage.getItem(`merit_circle_payment_attempt_${id}`),
        contribution.id
      )
    )
    .not.toBeNull();
  await page.reload();
  await expect(page.getByTestId(`payment-card-${contribution.id}`).getByTestId("payment-button")).toHaveText(
    "Periksa Status / Konfirmasi Ulang"
  );
  await page.getByTestId(`payment-card-${contribution.id}`).getByTestId("payment-button").click();

  await expect.poll(() => counters.getReceiptRequests()).toBeGreaterThanOrEqual(2);
  await expect.poll(() => counters.getConfirmRequests()).toBe(1);
  await expect.poll(() => counters.getSendTransactions()).toBe(0);
  await expect(page.getByTestId("payment-success")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Riwayat Setoran Selesai \(1\)/ })
  ).toBeVisible();
  await expect(page.getByTestId(`payment-card-${contribution.id}`)).toHaveAttribute(
    "data-payment-status",
    "paid"
  );
});

test("successful receipt is confirmed by backend before the UI shows paid", async ({ page }) => {
  const counters = await installPaymentScenario(page, "success");
  await page.goto("/pay");

  const card = page.getByTestId(`payment-card-${contribution.id}`);
  await card.getByTestId("payment-button").click();

  await expect.poll(() => counters.getConfirmRequests()).toBe(1);
  await expect(page.getByTestId("payment-error")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: /Riwayat Setoran Selesai \(1\)/ })
  ).toBeVisible();
  await expect(page.getByTestId(`payment-card-${contribution.id}`)).toHaveAttribute(
    "data-payment-status",
    "paid"
  );
  await expect(page.getByTestId("payment-button")).toHaveCount(0);
  await captureScreenshot(page, "payment-success");
});

test("cycle 1 active contribution never shows waiting for cycle 1", async ({ page }) => {
  await installPaymentScenario(page, "success");
  await page.goto("/pay");

  const card = page.getByTestId(`payment-card-${contribution.id}`);
  const button = card.getByTestId("payment-button");
  await expect(button).not.toContainText("Menunggu Siklus #1");
  await expect(button).toContainText("Pay");
});

