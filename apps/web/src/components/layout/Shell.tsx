"use client";

import React, { useState, useEffect } from "react";
import { color, spacing } from "@merit-circle/ui";
import { Navbar } from "./Navbar";
import { Topbar } from "./Topbar";

export interface ShellProps {
  children: React.ReactNode;
  activeHref?: string;
}

export const Shell: React.FC<ShellProps> = ({ children, activeHref = "/dashboard" }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("mc_sidebar_open");
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
            localStorage.setItem("mc_sidebar_open", String(next));
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
        localStorage.setItem("mc_sidebar_open", String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: color.background.app,
        color: color.text.primary,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Collapsible Sidebar Container */}
      <div
        style={{
          width: sidebarOpen ? "260px" : "0px",
          opacity: sidebarOpen ? 1 : 0,
          overflow: "hidden",
          transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
          flexShrink: 0,
        }}
      >
        <div style={{ width: "260px", height: "100%" }}>
          <Navbar activeHref={activeHref} />
        </div>
      </div>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          transition: "all 0.3s ease",
        }}
      >
        <Topbar sidebarOpen={sidebarOpen} onToggleSidebar={handleToggle} activeHref={activeHref} />
        <main
          style={{
            flex: 1,
            padding: spacing["8"],
            maxWidth: "1280px",
            width: "100%",
            margin: "0 auto",
            boxSizing: "border-box",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
