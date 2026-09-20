"use client";

import React, { useEffect, useState } from "react";
import {
  color,
  radius,
  spacing,
  Button,
  Card,
  LoadingState,
  ErrorState,
  Badge,
} from "@merit-circle/ui";
import { AppProviders } from "../../../providers/AppProviders";
import { AdminShell } from "../../../components/layout/AdminShell";
import { getAdminAuditLogs } from "../../../lib/api";

interface AuditItem {
  id: string;
  actorUserId: string | null;
  actorType: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: any | null;
  createdAt: string;
}

function AdminAuditContent() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const limit = 20;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (currentOffset: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminAuditLogs(limit, currentOffset);
      setLogs(res.auditLogs || []);
      setTotal(res.total || 0);
      setOffset(currentOffset);
    } catch (err: any) {
      setError(err?.message || "Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
  }, []);

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <AdminShell activeHref="/admin/audit">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: spacing["6"],
        }}
      >
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, margin: 0, marginBottom: "6px" }}>
            Audit Trail & Safety Log
          </h1>
          <p style={{ color: color.text.secondary, margin: 0, fontSize: "14px" }}>
            Immutable chronological record of administrative actions, cycle settlements, and demo interventions.
          </p>
        </div>

        <Button variant="secondary" onClick={() => fetchLogs(offset)} disabled={isLoading}>
          🔄 Refresh
        </Button>
      </div>

      {isLoading && <LoadingState message="Querying immutable audit logs..." />}

      {error && (
        <ErrorState
          title="Audit Log Query Error"
          message={error}
          onRetry={() => fetchLogs(offset)}
        />
      )}

      {!isLoading && !error && (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${color.border.subtle}`, color: color.text.muted, textAlign: "left" }}>
                  <th style={{ padding: "12px 10px" }}>TIMESTAMP</th>
                  <th style={{ padding: "12px 10px" }}>ACTOR TYPE</th>
                  <th style={{ padding: "12px 10px" }}>ACTION</th>
                  <th style={{ padding: "12px 10px" }}>ENTITY TYPE</th>
                  <th style={{ padding: "12px 10px" }}>ENTITY ID</th>
                  <th style={{ padding: "12px 10px" }}>METADATA</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "30px", textAlign: "center", color: color.text.muted }}>
                      No audit log entries found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${color.border.subtle}` }}>
                      <td style={{ padding: "12px 10px", color: color.text.secondary, whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <Badge variant={log.actorType === "ADMIN" ? "warning" : "neutral"}>
                          {log.actorType}
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <Badge variant="info">{log.action}</Badge>
                      </td>
                      <td style={{ padding: "12px 10px", fontWeight: 600 }}>
                        {log.entityType}
                      </td>
                      <td style={{ padding: "12px 10px", fontFamily: "monospace", fontSize: "11px", color: color.text.muted }}>
                        {log.entityId ? `#${log.entityId.slice(-8)}` : "—"}
                      </td>
                      <td style={{ padding: "12px 10px", maxWidth: "320px" }}>
                        <pre
                          style={{
                            margin: 0,
                            fontFamily: "monospace",
                            fontSize: "11px",
                            backgroundColor: "rgba(255, 255, 255, 0.04)",
                            padding: "6px",
                            borderRadius: radius.sm,
                            overflowX: "auto",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                            color: color.text.secondary,
                          }}
                        >
                          {log.metadata ? JSON.stringify(log.metadata, null, 2) : "None"}
                        </pre>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {total > limit && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: spacing["4"],
                paddingTop: spacing["4"],
                borderTop: `1px solid ${color.border.subtle}`,
                fontSize: "13px",
              }}
            >
              <div style={{ color: color.text.muted }}>
                Showing {offset + 1}–{Math.min(offset + limit, total)} of {total} events (Page {currentPage} of {totalPages})
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={offset <= 0}
                  onClick={() => fetchLogs(Math.max(0, offset - limit))}
                >
                  ← Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={offset + limit >= total}
                  onClick={() => fetchLogs(offset + limit)}
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </AdminShell>
  );
}

export default function AdminAuditPage() {
  return (
    <AppProviders>
      <AdminAuditContent />
    </AppProviders>
  );
}
