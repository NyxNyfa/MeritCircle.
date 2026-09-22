import React from "react";

export type AlertType = "info" | "success" | "warning" | "error";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  title?: string;
  icon?: React.ReactNode;
}

const alertIcons: Record<AlertType, React.ReactNode> = {
  info: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </svg>
  ),
  success: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  warning: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  error: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18" />
      <line x1="6" x2="18" y1="6" y2="18" />
    </svg>
  ),
};

export const Alert: React.FC<AlertProps> = ({
  type = "info",
  title,
  icon,
  children,
  className = "",
  style,
  ...props
}) => {
  const typeConfig: Record<AlertType, { bg: string; border: string; text: string; defaultIcon: React.ReactNode }> = {
    info: { bg: "rgba(59, 130, 246, 0.1)", border: "#3B82F6", text: "#7BD0FF", defaultIcon: alertIcons.info },
    success: { bg: "rgba(0, 229, 153, 0.1)", border: "#00E599", text: "#00E599", defaultIcon: alertIcons.success },
    warning: { bg: "rgba(245, 158, 11, 0.1)", border: "#F59E0B", text: "#F59E0B", defaultIcon: alertIcons.warning },
    error: { bg: "rgba(239, 68, 68, 0.1)", border: "#EF4444", text: "#EF4444", defaultIcon: alertIcons.error },
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
