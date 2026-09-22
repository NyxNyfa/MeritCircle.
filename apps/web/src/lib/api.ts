/**
 * Merit Circle Typed API Client
 * Connects frontend to backend modules (Phase 09, 10, 11)
 */

import { getToken, clearSession } from "./auth";

const API_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public errorCode: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearSession();
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    let errorMsg = `Request failed with status ${res.status}`;
    let code = `HTTP_${res.status}`;

    if (data) {
      if (typeof data === "string") {
        errorMsg = data;
      } else if (typeof data === "object") {
        if (data.error) {
          if (typeof data.error === "string") {
            errorMsg = data.error;
          } else if (typeof data.error === "object") {
            if (data.error.message && typeof data.error.message === "string") {
              errorMsg = data.error.message;
            }
            if (data.error.code && typeof data.error.code === "string") {
              code = data.error.code;
            }
          }
        } else if (data.message && typeof data.message === "string") {
          errorMsg = data.message;
        }

        if (data.code && typeof data.code === "string") {
          code = data.code;
        }
      }
    }

    throw new ApiError(res.status, code, errorMsg, data);
  }

  return data as T;
}

/* =========================================================================
 * 1. AUTH & PROFILE (Phase 09)
 * ========================================================================= */

export async function requestNonce(walletAddress: string): Promise<{ nonce: string; expiresAt: string }> {
  return fetchApi<{ nonce: string; expiresAt: string }>("/api/auth/nonce", {
    method: "POST",
    body: JSON.stringify({ walletAddress }),
  });
}

export async function verifyWallet(
  walletAddress: string,
  signature: string,
  nonce: string
): Promise<{ token: string; user: any }> {
  return fetchApi<{ token: string; user: any }>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ walletAddress, signature, nonce }),
  });
}

export async function getSession(): Promise<{ user: any }> {
  return fetchApi<{ user: any }>("/api/auth/session", {
    method: "GET",
  });
}

export async function logout(): Promise<void> {
  try {
    await fetchApi("/api/auth/logout", { method: "POST" });
  } finally {
    clearSession();
  }
}

export interface UserProfileResponse {
  id?: string;
  username: string | null;
  email: string | null;
  emailVerifiedAt: string | null;
  avatarUrl: string | null;
  xUrl: string | null;
  telegramUrl: string | null;
  discordHandle: string | null;
  walletAddress: string;
  role?: string;
  reputationPoints?: number;
  tier?: number;
  profile?: UserProfileResponse;
}

export async function getProfile(): Promise<UserProfileResponse> {
  return fetchApi<UserProfileResponse>("/api/profile", {
    method: "GET",
  });
}

export async function updateProfile(data: {
  username?: string;
  email?: string;
  avatarUrl?: string;
  xUrl?: string;
  telegramUrl?: string;
  discordHandle?: string;
}): Promise<UserProfileResponse> {
  return fetchApi<UserProfileResponse>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function requestEmailVerification(
  email: string
): Promise<{ success?: boolean; expiresInMinutes?: number; devCode?: string; message?: string }> {
  return fetchApi<{ success?: boolean; expiresInMinutes?: number; devCode?: string; message?: string }>(
    "/api/email/verify/request",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    }
  );
}

export async function confirmEmailVerification(code: string): Promise<{ success: boolean; emailVerified: boolean }> {
  return fetchApi<{ success: boolean; emailVerified: boolean }>("/api/email/verify/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

/* =========================================================================
 * 2. REPUTATION (Phase 09)
 * ========================================================================= */

export async function getMyReputation(): Promise<{
  reputationPoints: number;
  tier: number;
  maxActiveGroups: number;
}> {
  return fetchApi<{
    reputationPoints: number;
    tier: number;
    maxActiveGroups: number;
  }>("/api/reputation/me", {
    method: "GET",
  });
}

export async function getMyReputationHistory(): Promise<{ events: any[] }> {
  return fetchApi<{ events: any[] }>("/api/reputation/history", {
    method: "GET",
  });
}

/* =========================================================================
 * 3. POOLS & GROUPS (Phase 10)
 * ========================================================================= */

export async function getPools(): Promise<{ pools: any[] }> {
  return fetchApi<{ pools: any[] }>("/api/pools", {
    method: "GET",
  });
}

export async function getPool(poolId: string): Promise<{ pool: any }> {
  return fetchApi<{ pool: any }>(`/api/pools/${poolId}`, {
    method: "GET",
  });
}

export async function joinPool(poolId: string): Promise<{ membership: any; group?: any }> {
  return fetchApi<{ membership: any; group?: any }>(`/api/pools/${poolId}/join`, {
    method: "POST",
  });
}

export async function getMyGroups(): Promise<{ groups: any[] }> {
  return fetchApi<{ groups: any[] }>("/api/groups", {
    method: "GET",
  });
}

export async function getGroup(groupId: string): Promise<{ group: any }> {
  return fetchApi<{ group: any }>(`/api/groups/${groupId}`, {
    method: "GET",
  });
}

export async function getGroupCycles(groupId: string): Promise<{ cycles: any[] }> {
  return fetchApi<{ cycles: any[] }>(`/api/groups/${groupId}/cycles`, {
    method: "GET",
  });
}

export async function getCycle(cycleId: string): Promise<{ cycle: any }> {
  return fetchApi<{ cycle: any }>(`/api/cycles/${cycleId}`, {
    method: "GET",
  });
}

/* =========================================================================
 * 4. CONTRIBUTIONS & PAYMENTS (Phase 10)
 * ========================================================================= */

export async function getMyContributions(): Promise<{ contributions: any[] }> {
  return fetchApi<{ contributions: any[] }>("/api/contributions", {
    method: "GET",
  });
}

export async function createPaymentIntent(contributionId: string): Promise<{ intent: any }> {
  return fetchApi<{ intent: any }>("/api/payments/payment-intent", {
    method: "POST",
    body: JSON.stringify({ contributionId }),
  });
}

export async function confirmContribution(
  paymentIntentId: string,
  txHash: string
): Promise<{ contribution: any; payment: any }> {
  return fetchApi<{ contribution: any; payment: any }>("/api/payments/confirm", {
    method: "POST",
    body: JSON.stringify({ paymentIntentId, txHash }),
  });
}

/* =========================================================================
 * 5. AUCTION, SETTLEMENT & REWARD LEDGER (Phase 11)
 * ========================================================================= */

export async function getCycleAuction(cycleId: string): Promise<{
  auction: any;
  carriedRewardWei: string;
  totalRewardPoolWei: string;
  isFinalCycle: boolean;
}> {
  return fetchApi<{
    auction: any;
    carriedRewardWei: string;
    totalRewardPoolWei: string;
    isFinalCycle: boolean;
  }>(`/api/cycles/${cycleId}/auction`, {
    method: "GET",
  });
}

export async function submitBid(
  auctionId: string,
  discountBps: number
): Promise<{ bid: any }> {
  return fetchApi<{ bid: any }>(`/api/auctions/${auctionId}/bids`, {
    method: "POST",
    body: JSON.stringify({ discountBps }),
  });
}

export async function getAuctionBids(auctionId: string): Promise<{ bids: any[] }> {
  return fetchApi<{ bids: any[] }>(`/api/auctions/${auctionId}/bids`, {
    method: "GET",
  });
}

export async function getAuctionResult(auctionId: string): Promise<{
  auction: any;
  winningBid: any;
  settlement: any;
}> {
  return fetchApi<{
    auction: any;
    winningBid: any;
    settlement: any;
  }>(`/api/auctions/${auctionId}/result`, {
    method: "GET",
  });
}

export async function getRewardLedger(groupId: string): Promise<{ entries: any[] }> {
  return fetchApi<{ entries: any[] }>(`/api/groups/${groupId}/reward-ledger`, {
    method: "GET",
  });
}

export async function openAuction(cycleId: string): Promise<{ auction: any }> {
  return fetchApi<{ auction: any }>(`/api/cycles/${cycleId}/auction/open`, {
    method: "POST",
  });
}

export async function closeAuction(cycleId: string): Promise<{ auction: any }> {
  return fetchApi<{ auction: any }>(`/api/cycles/${cycleId}/auction/close`, {
    method: "POST",
  });
}

export async function settleCycle(cycleId: string): Promise<{ settlement: any }> {
  return fetchApi<{ settlement: any }>(`/api/cycles/${cycleId}/settle`, {
    method: "POST",
  });
}

/* =========================================================================
 * 5. ADMIN PANEL (Phase 13)
 * ========================================================================= */

export async function getAdminOverview(): Promise<{
  totalUsers: number;
  totalPools: number;
  formingGroups: number;
  activeGroups: number;
  completedGroups: number;
  paymentOpenCycles: number;
  auctionOpenCycles: number;
  pendingContributions: number;
  paidContributions: number;
  lateContributions: number;
  recentAuditLogs: any[];
}> {
  return fetchApi("/api/admin/overview", { method: "GET" });
}

export async function getAdminUsers(): Promise<{ users: any[] }> {
  return fetchApi("/api/admin/users", { method: "GET" });
}

export async function getAdminUser(userId: string): Promise<{ user: any }> {
  return fetchApi(`/api/admin/users/${userId}`, { method: "GET" });
}

export async function adjustUserReputation(
  userId: string,
  points: number,
  reason: string
): Promise<{
  userId: string;
  reputationPoints: number;
  tier: number;
  pointsDelta: number;
  reason: string;
}> {
  return fetchApi(`/api/admin/users/${userId}/reputation/adjust`, {
    method: "POST",
    body: JSON.stringify({ points, reason }),
  });
}

export async function getAdminPools(): Promise<{ pools: any[] }> {
  return fetchApi("/api/admin/pools", { method: "GET" });
}

export async function createAdminPool(poolData: any): Promise<{ pool: any }> {
  return fetchApi("/api/admin/pools", {
    method: "POST",
    body: JSON.stringify(poolData),
  });
}

export async function patchAdminPool(
  poolId: string,
  data: { status?: string; description?: string }
): Promise<{ pool: any }> {
  return fetchApi(`/api/admin/pools/${poolId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getAdminGroups(): Promise<{ groups: any[] }> {
  return fetchApi("/api/admin/groups", { method: "GET" });
}

export async function getAdminGroup(groupId: string): Promise<{ group: any }> {
  return fetchApi(`/api/admin/groups/${groupId}`, { method: "GET" });
}

export async function fillDemoGroup(
  groupId: string,
  prefix = "demo"
): Promise<{
  group: any;
  demoMembersAdded: number;
  status: string;
}> {
  return fetchApi(`/api/admin/groups/${groupId}/fill-demo`, {
    method: "POST",
    body: JSON.stringify({ prefix }),
  });
}

export async function getAdminAuditLogs(
  limit = 50,
  offset = 0
): Promise<{
  total: number;
  limit: number;
  offset: number;
  auditLogs: any[];
}> {
  return fetchApi(`/api/admin/audit-logs?limit=${limit}&offset=${offset}`, {
    method: "GET",
  });
}
