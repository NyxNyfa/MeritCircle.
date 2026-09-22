"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthUser, getToken, getStoredUser, setStoredUser, clearSession, setToken } from "../lib/auth";
import { requestNonce, verifyWallet, getSession, logout as apiLogout, getProfile, getMyReputation } from "../lib/api";
import { getErrorMessage } from "../lib/error";
import { useWallet } from "./WalletContext";

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithWallet: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, sign, connect } = useWallet();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!getToken()) return;
    try {
      const [res, repRes] = await Promise.all([
        getProfile().catch(() => null),
        getMyReputation().catch(() => null),
      ]);
      const p = (res as any)?.profile || res;
      const pts =
        repRes?.points ??
        repRes?.reputationPoints ??
        p?.reputationPoints ??
        (p as any)?.points ??
        0;
      const tr = repRes?.tier ?? p?.tier ?? 1;

      if (p && (p.walletAddress || p.username !== undefined || p.id)) {
        setUser((prev) => {
          const isSameUser = Boolean(prev && p.id && prev.id === p.id);
          const updated: AuthUser = {
            id: p.id || (isSameUser ? prev?.id : "") || "",
            walletAddress: p.walletAddress || (isSameUser ? prev?.walletAddress : "") || "",
            role: p.role || (isSameUser ? prev?.role : "USER") || "USER",
            username: p.username !== undefined ? p.username : (isSameUser ? prev?.username : null) ?? null,
            email: p.email !== undefined ? p.email : (isSameUser ? prev?.email : null) ?? null,
            isEmailVerified: Boolean(p.emailVerifiedAt),
            avatarUrl: p.avatarUrl !== undefined ? p.avatarUrl : (isSameUser ? prev?.avatarUrl : null) ?? null,
            xUrl: p.xUrl !== undefined ? p.xUrl : (isSameUser ? prev?.xUrl : null) ?? null,
            telegramUrl: p.telegramUrl !== undefined ? p.telegramUrl : (isSameUser ? prev?.telegramUrl : null) ?? null,
            discordHandle: p.discordHandle !== undefined ? p.discordHandle : (isSameUser ? prev?.discordHandle : null) ?? null,
            reputationPoints: pts,
            tier: tr,
            createdAt: (isSameUser ? prev?.createdAt : null) || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setStoredUser(updated);
          return updated;
        });
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync wallet account changes from MetaMask/provider
  useEffect(() => {
    if (address && user?.walletAddress) {
      if (address.toLowerCase() !== user.walletAddress.toLowerCase()) {
        clearSession();
        setTokenState(null);
        setUser(null);
      }
    }
  }, [address, user?.walletAddress]);

  // Initial session restoration
  useEffect(() => {
    const existingToken = getToken();
    const existingUser = getStoredUser();

    if (existingToken) {
      setTokenState(existingToken);
      if (existingUser) {
        setUser(existingUser);
      }
      // Re-validate session with backend and sync complete profile
      getSession()
        .then((res) => {
          if (res?.user) {
            refreshProfile();
          }
        })
        .catch(() => {
          // Token invalid or expired
          clearSession();
          setTokenState(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [refreshProfile]);

  const loginWithWallet = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      let walletAddr = address;
      if (!walletAddr) {
        walletAddr = await connect();
      }
      if (!walletAddr) {
        throw new Error("Wallet not connected");
      }

      // 1. Request nonce from backend
      const { nonce } = await requestNonce(walletAddr);

      // 2. Sign nonce with connected wallet
      const signature = await sign(nonce);

      // 3. Verify signature with backend
      const verifyRes = await verifyWallet(walletAddr, signature, nonce);

      setToken(verifyRes.token);
      setStoredUser(verifyRes.user);
      setTokenState(verifyRes.token);
      setUser(verifyRes.user);

      // Sync full profile & reputation immediately
      await refreshProfile();

      return true;
    } catch (err: any) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await apiLogout();
    } catch {
      // ignore
    } finally {
      clearSession();
      setTokenState(null);
      setUser(null);
      setIsLoading(false);
    }
  };

  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        error,
        loginWithWallet,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
