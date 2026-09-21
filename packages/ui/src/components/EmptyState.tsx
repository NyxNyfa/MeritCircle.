import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "📭",
  title,
  description,
  action,
}) => {
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "48px 24px",
    borderRadius: "22px",
    backgroundColor: "rgba(20, 24, 36, 0.5)",
    border: "1px dashed rgba(255, 255, 255, 0.1)",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={containerStyle} className="mc-empty-state">
      <div style={{ fontSize: "36px", marginBottom: "16px" }}>{icon}</div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#E0E2EF", margin: "0 0 6px" }}>{title}</h3>
      {description && (
        <p style={{ fontSize: "14px", color: "#8C909F", maxWidth: "360px", margin: "0 0 20px" }}>{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
};
