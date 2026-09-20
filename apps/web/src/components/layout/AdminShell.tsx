"use client";

import React from "react";
import { color, radius, spacing, Badge } from "@merit-circle/ui";
import { useAuth } from "../../hooks/useAuth";
import { Topbar } from "./Topbar";

export interface AdminShellProps {
  children: React.ReactNode;
  activeHref?: string;
}

interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👥" },
  { label: "Pools", href: "/admin/pools", icon: "🪙" },
  { label: "Groups", href: "/admin/groups", icon: "🔄" },
  { label: "Auctions", href: "/admin/auctions", icon: "⚡" },
  { label: "Reputation", href: "/admin/reputation", icon: "⭐" },
  { label: "Audit Logs", href: "/admin/audit", icon: "📜" },
];

export const AdminShell: React.FC<AdminShellProps> = ({ children, activeHref = "/admin" }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("mc_admin_sidebar_open");
      if (saved !== null) {
        setSidebarOpen(saved === "true");
      }
    } catch {}

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarOpen((prev) => {
          const next = !prev;
          try {
            localStorage.setItem("mc_admin_sidebar_open", String(next));
          } catch {}
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggle = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("mc_admin_sidebar_open", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: color.background.app,
        color: color.text.primary,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top Banner for Admin & Safety Label */}
      <div
        style={{
          backgroundColor: "#1c1917",
          borderBottom: "1px solid #dc2626",
          padding: "8px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#ef4444", fontWeight: 700 }}>● ADMIN CONSOLE</span>
          <span style={{ color: color.text.secondary }}>|</span>
          <span style={{ color: color.text.muted }}>
            BNB Testnet Only • All admin actions are authorization-protected and audit-logged.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Badge variant={isAdmin ? "info" : "warning"}>
            {isAdmin ? "ADMIN ROLE ACTIVE" : "AUTHENTICATION REQUIRED"}
          </Badge>
          <a
            href="/dashboard"
            style={{
              color: color.brand.primary,
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "12px",
            }}
          >
            ← Exit to App
          </a>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Collapsible Admin Sidebar Container */}
        <div
          style={{
            width: sidebarOpen ? "260px" : "0px",
            opacity: sidebarOpen ? 1 : 0,
            overflow: "hidden",
            transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
            flexShrink: 0,
          }}
        >
          <aside
            style={{
              width: "260px",
              backgroundColor: color.background.surface,
              borderRight: `1px solid ${color.border.subtle}`,
              display: "flex",
              flexDirection: "column",
              minHeight: "calc(100vh - 37px)",
              padding: `${spacing["6"]} ${spacing["4"]}`,
              boxSizing: "border-box",
            }}
          >
            {/* Brand Header */}
            <div style={{ marginBottom: spacing["8"], padding: `0 ${spacing["2"]}`, display: "flex", alignItems: "center" }}>
              <a
                href="/admin"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  textDecoration: "none",
                  color: color.text.primary,
                }}
              >
              <div style={{ position: "relative" }}>
                <img
                  src="/logo.png"
                  alt="Merit Circle Logo"
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    boxShadow: "0 0 16px rgba(239, 68, 68, 0.4)",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: "-2px",
                    right: "-2px",
                    backgroundColor: "#ef4444",
                    borderRadius: "50%",
                    width: "12px",
                    height: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "8px",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    border: "2px solid #141824",
                  }}
                >
                  ⚡
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.3px" }}>
                  Merit Circle
                </div>
                <div style={{ fontSize: "11px", color: color.text.muted, fontWeight: 500 }}>
                  Admin Control Panel
                </div>
              </div>
            </a>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = activeHref === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: `${spacing["3"]} ${spacing["4"]}`,
                    borderRadius: radius.md,
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#FFFFFF" : color.text.secondary,
                    backgroundColor: isActive ? "rgba(239, 68, 68, 0.15)" : "transparent",
                    border: isActive ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid transparent",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && <Badge variant="neutral">{item.badge}</Badge>}
                </a>
              );
            })}
          </nav>

          {/* Return link at bottom */}
          <div style={{ paddingTop: spacing["4"], borderTop: `1px solid ${color.border.subtle}` }}>
            <a
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: `${spacing["3"]} ${spacing["4"]}`,
                borderRadius: radius.md,
                textDecoration: "none",
                fontSize: "13px",
                color: color.text.muted,
                transition: "color 0.15s ease",
              }}
            >
              <span>🏠</span>
              <span>Back to User App</span>
            </a>
          </div>
        </aside>
      </div>

        {/* Admin Main Body */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, transition: "all 0.3s ease" }}>
          <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={handleToggle} activeHref={activeHref} />
          <main
            style={{
              flex: 1,
              padding: spacing["8"],
              maxWidth: "1380px",
              width: "100%",
              margin: "0 auto",
              boxSizing: "border-box",
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};
