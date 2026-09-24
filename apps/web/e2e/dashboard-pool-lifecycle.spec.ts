import { expect, test, type Page } from "@playwright/test";
import type { GroupData, UserGroupsResponse } from "../src/lib/api";

const walletAddress = "0x1234567890abcdef1234567890abcdef12345678";
const user = {
  id: "user-dashboard-e2e",
  walletAddress,
  role: "USER",
  username: "dashboard_tester",
  email: "dashboard@example.com",
  isEmailVerified: true,
  avatarUrl: null,
  xUrl: null,
  telegramUrl: null,
  discordHandle: null,
  reputationPoints: 800,
  tier: 4,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const activeGroup: GroupData = {
  id: "group-lifecycle-1",
  groupNumber: 7,
  poolId: "pool-trust-1",
  poolName: "Trusted Auction Pool",
  poolMode: "AUCTION",
  mode: "AUCTION",
  status: "ACTIVE",
  memberStatus: "ACTIVE",
  isMemberReleased: false,
  isGroupCompleted: false,
  currentCycle: 2,
  currentCycleNumber: 2,
  totalCycles: 3,
  membersCount: 3,
  maxMembers: 3,
  carriedRewardWei: "2000000000000000",
  completedAt: null,
  nextPaymentDueDate: "2026-10-01T00:00:00.000Z",
};

const completedGroup: GroupData = {
  ...activeGroup,
  status: "COMPLETED",
  memberStatus: "COMPLETED",
  isMemberReleased: true,
  isGroupCompleted: true,
  currentCycle: 4,
  currentCycleNumber: 4,
  completedAt: "2026-09-24T12:00:00.000Z",
  nextPaymentDueDate: undefined,
};

async function mockApi(
  page: Page,
  getGroups: () => UserGroupsResponse,
  shouldFailContributions: () => boolean = () => false
) {
  const responseHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };

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

    let payload: unknown;

    if (path === "/api/auth/session") {
      payload = { user };
    } else if (path === "/api/profile") {
      payload = { profile: user };
    } else if (path === "/api/reputation/me") {
      payload = { points: 800, reputationPoints: 800, tier: 4, maxActiveGroups: 3 };
    } else if (path === "/api/reputation/me/history") {
      payload = { events: [] };
    } else if (path === "/api/groups/me") {
      payload = getGroups();
    } else if (path === "/api/contributions/me" && shouldFailContributions()) {
      payload = { error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable" } };
      await route.fulfill({
        status: 503,
        headers: responseHeaders,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
      return;
    } else if (path === "/api/contributions/me") {
      payload = { contributions: [] };
    } else {
      payload = { error: { code: "NOT_FOUND", message: "Not found" } };
      await route.fulfill({
        status: 404,
        headers: responseHeaders,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: responseHeaders,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ token, storedUser }) => {
      window.localStorage.setItem("merit_circle_auth_token", token);
      window.localStorage.setItem("merit_circle_auth_user", JSON.stringify(storedUser));
    },
    { token: "dashboard-e2e-token", storedUser: user }
  );
});

test("moves a fully settled pool from Active Pools to Completed History", async ({ page }) => {
  let failContributions = false;
  let groupsResponse: UserGroupsResponse = {
    groups: [activeGroup],
    activeGroups: [activeGroup],
    completedGroups: [],
  };

  await mockApi(page, () => groupsResponse, () => failContributions);
  await page.goto("/dashboard");

  const activeTab = page.getByRole("tab", { name: /Active Pools/ });
  const historyTab = page.getByRole("tab", { name: /History \/ Completed/ });
  const groupCard = page.getByTestId(`group-card-${activeGroup.id}`);

  await expect(activeTab).toHaveAttribute("aria-selected", "true");
  await expect(activeTab).toHaveText("Active Pools (1)");
  await expect(groupCard).toBeVisible();
  await expect(groupCard).toHaveAttribute("data-group-status", "ACTIVE");
  await expect(groupCard).toContainText("Current Cycle: 2 of 3");
  await expect(groupCard).toContainText("0.002 tBNB");

  groupsResponse = {
    groups: [completedGroup],
    activeGroups: [],
    completedGroups: [completedGroup],
  };
  failContributions = true;

  await page.reload();

  await expect(historyTab).toHaveAttribute("aria-selected", "true");
  await expect(historyTab).toHaveText("History / Completed (1)");
  await expect(groupCard).toBeVisible();
  await expect(groupCard).toHaveAttribute("data-group-status", "COMPLETED");
  await expect(groupCard).toContainText("All 3 cycles completed");
  await expect(groupCard).toContainText("All cycles settled");
  await expect(groupCard).not.toContainText("Current Cycle: 4 of 3");

  await activeTab.click();
  await expect(activeTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("active-groups-empty")).toBeVisible();
  await expect(groupCard).toHaveCount(0);
});
