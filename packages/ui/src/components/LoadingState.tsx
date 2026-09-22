import React from "react";

export interface LoadingStateProps {
  type?: "spinner" | "skeleton-card" | "skeleton-text";
  message?: string;
  count?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  type = "spinner",
  message = "Memuat data...",
  count = 3,
}) => {
  if (type === "spinner") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
          gap: "12px",
          color: "#8C909F",
          fontFamily: "'Inter', sans-serif",
          fontSize: "14px",
        }}
      >
        <svg
          width={28}
          height={28}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#4D8EFF"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: "spin 1s linear infinite" }}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span>{message}</span>
      </div>
    );
  }

  if (type === "skeleton-card") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            style={{
              height: "160px",
              borderRadius: "16px",
              backgroundColor: "#141824",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            height: "20px",
            borderRadius: "4px",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            width: `${100 - i * 15}%`,
          }}
        />
      ))}
    </div>
  );
};
