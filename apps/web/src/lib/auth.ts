/**
 * Merit Circle Authentication and Session Management
 */

export interface AuthUser {
  id: string;
  walletAddress: string;
  role?: string;
  username: string | null;
  email: string | null;
  isEmailVerified: boolean;
  avatarUrl: string | null;
  xUrl: string | null;
  telegramUrl: string | null;
  discordHandle: string | null;
  reputationPoints: number;
  tier: number;
  createdAt: string;
  updatedAt: string;
}

const TOKEN_KEY = "merit_circle_auth_token";
const USER_KEY = "merit_circle_auth_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch {
    // ignore
  }
}

export function clearSession(): void {
  removeToken();
  setStoredUser(null);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}
