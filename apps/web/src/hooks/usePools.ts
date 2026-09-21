"use client";

import { useState, useEffect, useCallback } from "react";
import { getPools } from "../lib/api";
import { getErrorMessage } from "../lib/error";

export function usePools() {
  const [pools, setPools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPools = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPools();
      setPools(res.pools || []);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPools();
  }, [fetchPools]);

  return { pools, isLoading, error, refresh: fetchPools };
}
