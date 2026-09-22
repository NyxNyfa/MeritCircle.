"use client";

import React, { useState } from "react";
import { color, radius, spacing, Button, Card, LoadingState, EmptyState } from "@merit-circle/ui";
import { AppProviders } from "../../providers/AppProviders";
import { Shell } from "../../components/layout/Shell";
import { usePools } from "../../hooks/usePools";
import { useAuth } from "../../hooks/useAuth";
import { PoolCard, PoolData } from "../../components/pool/PoolCard";
import { JoinPoolModal } from "../../components/pool/JoinPoolModal";
import { LiquidRadioGroup } from "../../components/ui/liquid-radio";

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
      const userTier = Math.max(1, user?.tier || 1);
      const isPoolActive = p.isActive !== undefined ? p.isActive : p.status === "ACTIVE";
      return p.minimumTier <= userTier && isPoolActive;
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

        {/* Liquid Glass Filter Radio Group */}
        <LiquidRadioGroup<"ALL" | "BASIC" | "AUCTION" | "ELIGIBLE">
          value={selectedFilter}
          onChange={(val) => setSelectedFilter(val)}
          options={[
            { value: "ALL", label: "All Pools" },
            { value: "BASIC", label: "Basic ROSCA" },
            { value: "AUCTION", label: "Auction ROSCA" },
            { value: "ELIGIBLE", label: "Eligible for Me" },
          ]}
        />
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
