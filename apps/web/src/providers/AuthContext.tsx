"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthUser, getToken, getStoredUser, setStoredUser, clearSession, setToken } from "../lib/auth";
import { requestNonce, verifyWallet, getSession, logout as apiLogout, getProfile } from "../lib/api";
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

  // Initial session restoration
  useEffect(() => {
    const existingToken = getToken();
    const existingUser = getStoredUser();

    if (existingToken) {
      setTokenState(existingToken);
      if (existingUser) {
        setUser(existingUser);
      }
      // Re-validate session with backend
      getSession()
        .then((res) => {
          if (res?.user) {
            setUser(res.user);
            setStoredUser(res.user);
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
  }, []);

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

      return true;
    } catch (err: any) {
      setError(err?.message || "Login failed");
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

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!getToken()) return;
    try {
      const res = await getProfile();
      if (res?.profile) {
        setUser((prev) => {
          const updated = prev ? { ...prev, ...res.profile } : (res.profile as AuthUser);
          setStoredUser(updated);
          return updated;
        });
      }
    } catch {
      // ignore
    }
  }, []);

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
