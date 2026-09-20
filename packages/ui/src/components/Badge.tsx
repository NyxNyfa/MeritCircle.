import React from "react";

export type BadgeVariant = "info" | "success" | "warning" | "danger" | "neutral";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "info",
  size = "md",
  dot = false,
  children,
  className = "",
  style,
  ...props
}) => {
  const variantColors: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
    info: { bg: "rgba(59, 130, 246, 0.12)", text: "#7BD0FF", dot: "#3B82F6" },
    success: { bg: "rgba(0, 229, 153, 0.12)", text: "#00E599", dot: "#00E599" },
    warning: { bg: "rgba(245, 158, 11, 0.12)", text: "#F59E0B", dot: "#F59E0B" },
    danger: { bg: "rgba(239, 68, 68, 0.12)", text: "#EF4444", dot: "#EF4444" },
    neutral: { bg: "rgba(255, 255, 255, 0.08)", text: "#C2C6D6", dot: "#8C909F" },
  };

  const currentTheme = variantColors[variant];

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    borderRadius: "9999px",
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif",
    lineHeight: 1,
    padding: size === "sm" ? "4px 8px" : "6px 12px",
    fontSize: size === "sm" ? "11px" : "12px",
    backgroundColor: currentTheme.bg,
    color: currentTheme.text,
    border: `1px solid ${currentTheme.bg}`,
    ...style,
  };

  return (
    <span role="status" style={baseStyle} className={`mc-badge mc-badge--${variant} ${className}`} {...props}>
      {dot && (
        <span
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: currentTheme.dot,
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};
