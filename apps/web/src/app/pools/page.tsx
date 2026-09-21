"use client";

import React, { useState } from "react";
import { color, radius, spacing, Button, Card, LoadingState, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { usePools } from "../../hooks/usePools";
import { useAuth } from "../../hooks/useAuth";
import { PoolCard, PoolData } from "../../components/pool/PoolCard";
import { JoinPoolModal } from "../../components/pool/JoinPoolModal";

function PoolsMarketplaceContent() {
  const { pools, isLoading, error, refresh } = usePools();
  const { user } = useAuth();

  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "BASIC" | "AUCTION" | "ELIGIBLE">("ALL");
  const [selectedPool, setSelectedPool] = useState<PoolData | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const filteredPools = pools.filter((p) => {
    if (selectedFilter === "BASIC") return p.mode === "BASIC";
    if (selectedFilter === "AUCTION") return p.mode === "AUCTION";
    if (selectedFilter === "ELIGIBLE") {
      const userTier = user?.tier || 1;
      return p.minimumTier <= userTier && p.isActive;
    }
    return true;
  });

  const handleJoinClick = (pool: PoolData) => {
    setSelectedPool(pool);
    setIsJoinModalOpen(true);
  };

  return (
    <Shell activeHref="/pools">
      {/* Header & Filter Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: spacing["6"],
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, marginBottom: "8px" }}>
            ROSCA Pool Marketplace
          </h1>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            Pilih dan bergabunglah dengan kelompok arisan bergilir berbasis reputasi dan model lelang.
          </p>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            backgroundColor: color.background.card,
            padding: "4px",
            borderRadius: radius.md,
            border: `1px solid ${color.border.subtle}`,
          }}
        >
          {(
            [
              { id: "ALL", label: "All Pools" },
              { id: "BASIC", label: "🪙 Basic" },
              { id: "AUCTION", label: "⚡ Auction" },
              { id: "ELIGIBLE", label: "Eligible for Me" },
            ] as const
          ).map((tab) => {
            const isActive = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: radius.sm,
                  border: "none",
                  backgroundColor: isActive ? color.brand.primary : "transparent",
                  color: isActive ? "#FFFFFF" : color.text.secondary,
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <LoadingState message="Memuat daftar pool..." />
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
          Failed to load pools: {error}
        </Card>
      ) : filteredPools.length === 0 ? (
        <EmptyState
          title="Tidak Ada Pool Ditemukan"
          description="Tidak ada pool yang cocok dengan filter yang dipilih saat ini."
          action={
            <Button
              variant="liquid-metal"
              size="md"
              onClick={() => setSelectedFilter("ALL")}
            >
              Reset Filter
            </Button>
          }
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: spacing["6"],
          }}
        >
          {filteredPools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} onJoinClick={handleJoinClick} />
          ))}
        </div>
      )}

      {/* Join Confirmation Modal */}
      <JoinPoolModal
        pool={selectedPool}
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={() => {
          refresh();
          window.location.href = "/dashboard";
        }}
      />
    </Shell>
  );
}

export default function PoolsPage() {
  return (
    <AppProviders>
      <PoolsMarketplaceContent />
    </AppProviders>
  );
}
