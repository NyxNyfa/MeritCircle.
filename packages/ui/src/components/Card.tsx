import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  bordered?: boolean;
  glow?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  elevated = false,
  bordered = true,
  glow = false,
  padding = "md",
  children,
  className = "",
  style,
  ...props
}) => {
  const paddingValues = {
    none: "0",
    sm: "12px",
    md: "20px",
    lg: "28px",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: elevated ? "#1B2030" : "#141824",
    borderRadius: "16px",
    padding: paddingValues[padding],
    border: bordered ? "1px solid rgba(255, 255, 255, 0.08)" : "none",
    boxShadow: glow
      ? "0 0 24px rgba(77, 142, 255, 0.15), 0 4px 20px rgba(0, 0, 0, 0.4)"
      : "0 4px 20px rgba(0, 0, 0, 0.4)",
    fontFamily: "'Inter', sans-serif",
    color: "#E0E2EF",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    ...style,
  };

  return (
    <div style={cardStyle} className={`mc-card ${className}`} {...props}>
      {children}
    </div>
  );
};
