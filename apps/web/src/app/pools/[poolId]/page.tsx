"use client";

import React, { useEffect, useState } from "react";
import { color, radius, spacing, Card, Badge, Button, LoadingState } from "@merit-circle/ui";
import { AppProviders } from "../../../providers/AppProviders";
import { Shell } from "../../../components/layout/Shell";
import { getPool } from "../../../lib/api";
import { getErrorMessage } from "../../../lib/error";
import { formatWeiToBnb, formatTier } from "../../../lib/format";
import { useAuth } from "../../../hooks/useAuth";
import { JoinPoolModal } from "../../../components/pool/JoinPoolModal";
import { ZapIcon, CoinsIcon, CheckIcon, XIcon } from "../../../components/layout/Icons";

function PoolDetailContent({ poolId }: { poolId?: string }) {
  const { user, isAuthenticated } = useAuth();
  const [pool, setPool] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  useEffect(() => {
    // In client router, poolId can be extracted from pathname
    const id = poolId || (typeof window !== "undefined" ? window.location.pathname.split("/").pop() : "");
    if (!id) return;

    getPool(id)
      .then((res) => {
        setPool(res.pool);
      })
      .catch((err) => {
        setError(getErrorMessage(err));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [poolId]);

  if (isLoading) {
    return (
      <Shell activeHref="/pools">
        <LoadingState message="Memuat detail parameter pool..." />
      </Shell>
    );
  }

  if (error || !pool) {
    return (
      <Shell activeHref="/pools">
        <Card
          style={{
            backgroundColor: color.status.errorBackground,
            border: `1px solid ${color.status.error}`,
            color: color.status.error,
            padding: spacing["6"],
            textAlign: "center",
          }}
        >
          {error || "Pool not found"}
        </Card>
      </Shell>
    );
  }

  const isAuction = pool.mode === "AUCTION";
  const userTier = user?.tier || 1;
  const isTierEligible = userTier >= pool.minimumTier;
  const isProfileComplete = Boolean(user?.username && user?.isEmailVerified);
  const isJoinable = isAuthenticated && isTierEligible && isProfileComplete && pool.isActive;

  return (
    <Shell activeHref="/pools">
      <div style={{ marginBottom: spacing["6"] }}>
        <a href="/pools" style={{ fontSize: "13px", color: color.text.muted, textDecoration: "none" }}>
          ← Back to Pool Marketplace
        </a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: spacing["8"] }}>
        {/* Detail Body */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: spacing["2"] }}>
            <Badge variant={isAuction ? "info" : "neutral"} style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              {isAuction ? <ZapIcon size={12} /> : <CoinsIcon size={12} />}
              <span>{isAuction ? "AUCTION ROSCA" : "BASIC ROSCA"}</span>
            </Badge>
            <span style={{ fontSize: "13px", color: color.text.muted }}>
              Requires {formatTier(pool.minimumTier)}
            </span>
          </div>

          <h1 style={{ fontSize: "32px", fontWeight: 800, margin: 0, marginBottom: spacing["4"] }}>
            {pool.name}
          </h1>

          <p style={{ fontSize: "15px", color: color.text.secondary, lineHeight: 1.6, marginBottom: spacing["6"] }}>
            {pool.description || "Komunitas simpan pinjam bergilir terdesentralisasi berbasis BNB Smart Chain Testnet."}
          </p>

          {/* Key Parameters Table */}
          <Card
            style={{
              backgroundColor: color.background.card,
              border: `1px solid ${color.border.subtle}`,
              padding: spacing["6"],
              marginBottom: spacing["6"],
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, marginBottom: spacing["4"] }}>
              Parameter Spesifikasi Pool
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: `1px solid ${color.border.subtle}` }}>
                <span style={{ color: color.text.muted }}>Contribution Per Cycle:</span>
                <span style={{ fontWeight: 700, color: color.brand.accentElectric }}>
                  {formatWeiToBnb(pool.contributionAmountWei)}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: `1px solid ${color.border.subtle}` }}>
                <span style={{ color: color.text.muted }}>Group Capacity:</span>
                <span style={{ fontWeight: 600 }}>{pool.groupSize} Anggota</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: `1px solid ${color.border.subtle}` }}>
                <span style={{ color: color.text.muted }}>Total Cycle Duration:</span>
                <span style={{ fontWeight: 600 }}>{pool.cycleCount} Siklus</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: `1px solid ${color.border.subtle}` }}>
                <span style={{ color: color.text.muted }}>Payment Window:</span>
                <span style={{ fontWeight: 600 }}>{pool.paymentWindowDays} Hari pertama per siklus</span>
              </div>

              {isAuction && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "10px", borderBottom: `1px solid ${color.border.subtle}` }}>
                    <span style={{ color: color.text.muted }}>Auction Window:</span>
                    <span style={{ fontWeight: 600 }}>{pool.auctionWindowDays} Hari</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: color.text.muted }}>Maximum Bid Discount:</span>
                    <span style={{ fontWeight: 700, color: color.brand.accentCyan }}>
                      {pool.maxDiscountBps / 100}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Auction Pool Rules Notice */}
          {isAuction && (
            <Card
              style={{
                backgroundColor: color.background.cardElevated,
                border: `1px solid ${color.border.subtle}`,
                padding: spacing["6"],
              }}
            >
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, marginBottom: spacing["3"], color: color.brand.accentElectric, display: "flex", alignItems: "center", gap: "6px" }}>
                <ZapIcon size={16} />
                <span>Peraturan Siklus Lelang & Siklus Final</span>
              </h3>
              <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: color.text.secondary, lineHeight: 1.6 }}>
                <li>Lelang diskon hanya dibuka pada siklus non-final (siklus 1 s.d. {pool.cycleCount - 1}).</li>
                <li>Surplus diskon diteruskan sebagai <strong>carried reward</strong> bagi peserta berikutnya.</li>
                <li><strong>Siklus Final:</strong> Penerima terakhir menerima 100% full reward pool tanpa lelang dan tanpa potongan diskon.</li>
                <li><strong>Full Final Payout:</strong> Seluruh dana tersisa disalurkan tuntas kepada peserta penutup tanpa potongan protokol.</li>
              </ul>
            </Card>
          )}
        </div>

        {/* Join Sidebar */}
        <div>
          <Card
            style={{
              backgroundColor: color.background.card,
              border: `1px solid ${color.border.subtle}`,
              padding: spacing["6"],
              borderRadius: radius.lg,
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, marginBottom: spacing["2"] }}>
              Bergabung ke Pool Ini
            </h3>
            <p style={{ fontSize: "13px", color: color.text.secondary, marginBottom: spacing["6"] }}>
              Setelah bergabung, Anda akan dipasangkan ke dalam kelompok yang sedang dibentuk.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: spacing["6"], fontSize: "13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "inline-flex", color: isAuthenticated ? color.status.success : color.text.muted }}>
                  {isAuthenticated ? <CheckIcon size={14} /> : <XIcon size={14} />}
                </span>
                <span style={{ color: isAuthenticated ? color.status.success : color.text.muted }}>
                  Dompet Terhubung
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "inline-flex", color: user?.username ? color.status.success : color.text.muted }}>
                  {user?.username ? <CheckIcon size={14} /> : <XIcon size={14} />}
                </span>
                <span style={{ color: user?.username ? color.status.success : color.text.muted }}>
                  Username Ditetapkan
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "inline-flex", color: user?.isEmailVerified ? color.status.success : color.text.muted }}>
                  {user?.isEmailVerified ? <CheckIcon size={14} /> : <XIcon size={14} />}
                </span>
                <span style={{ color: user?.isEmailVerified ? color.status.success : color.text.muted }}>
                  Email Terverifikasi
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ display: "inline-flex", color: isTierEligible ? color.status.success : color.text.muted }}>
                  {isTierEligible ? <CheckIcon size={14} /> : <XIcon size={14} />}
                </span>
                <span style={{ color: isTierEligible ? color.status.success : color.text.muted }}>
                  Tier Memenuhi Syarat (Min. Tier {pool.minimumTier})
                </span>
              </div>
            </div>

            <Button
              variant={isJoinable ? "liquid-metal" : "secondary"}
              size="lg"
              disabled={!isJoinable}
              onClick={() => setIsJoinModalOpen(true)}
              style={{ width: "100%" }}
            >
              {isJoinable ? "Konfirmasi Masuk Pool" : "Persyaratan Belum Terpenuhi"}
            </Button>
          </Card>
        </div>
      </div>

      <JoinPoolModal
        pool={pool}
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        onSuccess={() => {
          window.location.href = "/dashboard";
        }}
      />
    </Shell>
  );
}

export default function PoolDetailPage() {
  return (
    <AppProviders>
      <PoolDetailContent />
    </AppProviders>
  );
}
