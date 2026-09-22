"use client";

import { useState, useEffect, useCallback } from "react";
import { getMyReputation, getMyReputationHistory } from "../lib/api";
import { getErrorMessage } from "../lib/error";
import { useAuth } from "./useAuth";

export interface ReputationState {
  points: number;
  tier: number;
  maxActiveGroups: number;
  history: any[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useReputation(): ReputationState {
  const { isAuthenticated, user } = useAuth();
  const [points, setPoints] = useState<number>(0);
  const [tier, setTier] = useState<number>(1);
  const [maxActiveGroups, setMaxActiveGroups] = useState<number>(1);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReputation = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPoints(0);
      setTier(1);
      setMaxActiveGroups(1);
      setHistory([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [repRes, histRes] = await Promise.all([
        getMyReputation(),
        getMyReputationHistory().catch(() => ({ events: [] })),
      ]);

      const userPoints = (repRes as any).points ?? repRes.reputationPoints ?? 0;
      setPoints(userPoints);
      setTier(repRes.tier ?? 1);
      setMaxActiveGroups(repRes.maxActiveGroups ?? 1);
      setHistory(histRes?.events || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, user?.walletAddress]);

  useEffect(() => {
    fetchReputation();
  }, [fetchReputation]);

  return {
    points,
    tier,
    maxActiveGroups,
    history,
    isLoading,
    error,
    refresh: fetchReputation,
  };
}
