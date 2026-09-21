"use client";

import React, { useEffect, useState } from "react";
import { color, radius, spacing, Card, Button, LoadingState, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { useAuth } from "../../hooks/useAuth";
import { getMyGroups, getGroupCycles, getCycleAuction } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import { AuctionCard, AuctionData } from "../../components/auction/AuctionCard";

function AuctionHubContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [auctions, setAuctions] = useState<AuctionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAuctions = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Get user groups
      const groupsRes = await getMyGroups();
      const groups = groupsRes.groups || [];

      const auctionList: AuctionData[] = [];

      // 2. Query auction for active cycle in each auction group
      for (const grp of groups) {
        if (grp.mode === "AUCTION") {
          try {
            const cyclesRes = await getGroupCycles(grp.id);
            const currentCycle = (cyclesRes.cycles || []).find(
              (c: any) => c.cycleNumber === grp.currentCycleNumber
            );

            if (currentCycle) {
              const auctionRes = await getCycleAuction(currentCycle.id);
              if (auctionRes?.auction) {
                auctionList.push({
                  id: auctionRes.auction.id,
                  cycleId: currentCycle.id,
                  groupId: grp.id,
                  cycleNumber: currentCycle.cycleNumber,
                  totalCycles: grp.totalCycles || 5,
                  status: auctionRes.auction.status,
                  carriedRewardWei: auctionRes.carriedRewardWei || "0",
                  baseRewardWei: auctionRes.auction.baseRewardWei || "0",
                  totalRewardPoolWei: auctionRes.totalRewardPoolWei || "0",
                  maxDiscountBps: auctionRes.auction.maxDiscountBps || 2000,
                  minimumPayoutWei: auctionRes.auction.minimumPayoutWei || "0",
                  isFinalCycle: auctionRes.isFinalCycle || false,
                });
              }
            }
          } catch {
            // Group might not have opened auction yet
          }
        }
      }

      setAuctions(auctionList);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, [isAuthenticated]);

  if (!isAuthenticated && !authLoading) {
    return (
      <Shell activeHref="/auction">
        <EmptyState
          title="Wallet Not Connected"
          description="Silakan hubungkan dompet Anda untuk mengakses ruang lelang siklus arisan."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                window.location.href = "/connect";
              }}
            >
              Connect Wallet
            </Button>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell activeHref="/auction">
      <div style={{ marginBottom: spacing["6"] }}>
        <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, marginBottom: "8px" }}>
          Auction Bidding Hub
        </h1>
        <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
          Ajukan penawaran diskon untuk memajukan giliran penerimaan dana arisan. Surplus diskon
          diteruskan sebagai carried reward ke siklus selanjutnya.
        </p>
      </div>

      {isLoading ? (
        <LoadingState message="Memeriksa ruang lelang aktif..." />
      ) : error ? (
        <Card
          style={{
            backgroundColor: color.status.errorBackground,
            border: `1px solid ${color.status.error}`,
            color: color.status.error,
            padding: spacing["6"],
            textAlign: "center",
          }}
        >
          {error}
        </Card>
      ) : auctions.length === 0 ? (
        <EmptyState
          title="Tidak Ada Lelang Aktif"
          description="Anda belum bergabung ke dalam Auction Pool yang sedang berada pada fase lelang, atau siklus saat ini berada di luar jendela hari ke-11 s.d. 25."
          action={
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                window.location.href = "/pools";
              }}
            >
              Lihat Pool Lelang
            </Button>
          }
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing["6"] }}>
          {auctions.map((auc) => (
            <AuctionCard key={auc.id} auction={auc} onBidSuccess={loadAuctions} />
          ))}
        </div>
      )}
    </Shell>
  );
}

export default function AuctionPage() {
  return (
    <AppProviders>
      <AuctionHubContent />
    </AppProviders>
  );
}
