import React from "react";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

const defaultEmptyIcon = (
  <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#8C909F" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = defaultEmptyIcon,
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
