import React from "react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  actionText?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Terjadi Kesalahan",
  message,
  onRetry,
  actionText = "Coba Lagi",
}) => {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px 24px",
    borderRadius: "22px",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div role="alert" style={containerStyle} className="mc-error-state">
      <div style={{ marginBottom: "12px", color: "#EF4444", display: "flex", justifyContent: "center" }}>
        <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#EF4444", margin: "0 0 6px" }}>{title}</h3>
      <p style={{ fontSize: "14px", color: "#C2C6D6", maxWidth: "360px", margin: "0 0 20px" }}>{message}</p>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
