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
    borderRadius: "16px",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div role="alert" style={containerStyle} className="mc-error-state">
      <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
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
