import React from "react";

export type AlertType = "info" | "success" | "warning" | "error";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  title?: string;
  icon?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  type = "info",
  title,
  icon,
  children,
  className = "",
  style,
  ...props
}) => {
  const typeConfig: Record<AlertType, { bg: string; border: string; text: string; defaultIcon: string }> = {
    info: { bg: "rgba(59, 130, 246, 0.1)", border: "#3B82F6", text: "#7BD0FF", defaultIcon: "ℹ️" },
    success: { bg: "rgba(0, 229, 153, 0.1)", border: "#00E599", text: "#00E599", defaultIcon: "✓" },
    warning: { bg: "rgba(245, 158, 11, 0.1)", border: "#F59E0B", text: "#F59E0B", defaultIcon: "⚠️" },
    error: { bg: "rgba(239, 68, 68, 0.1)", border: "#EF4444", text: "#EF4444", defaultIcon: "✕" },
  };

  const current = typeConfig[type];

  const alertStyle: React.CSSProperties = {
    display: "flex",
    gap: "12px",
    alignItems: "flex-start",
    backgroundColor: current.bg,
    borderLeft: `4px solid ${current.border}`,
    borderTop: "1px solid rgba(255, 255, 255, 0.06)",
    borderRight: "1px solid rgba(255, 255, 255, 0.06)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    borderRadius: "14px",
    padding: "12px 16px",
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    color: "#E0E2EF",
    ...style,
  };

  return (
    <div role="alert" style={alertStyle} className={`mc-alert mc-alert--${type} ${className}`} {...props}>
      <span style={{ fontSize: "16px", lineHeight: 1 }} aria-hidden="true">
        {icon || current.defaultIcon}
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {title && <span style={{ fontWeight: 600, color: current.text }}>{title}</span>}
        <div style={{ color: "#C2C6D6" }}>{children}</div>
      </div>
    </div>
  );
};
