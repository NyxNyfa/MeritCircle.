import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  bordered?: boolean;
  glow?: boolean;
  liquid?: boolean;
  variant?: "default" | "liquid" | "elevated" | "glow" | "gold" | "cyan";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  elevated = false,
  bordered = true,
  glow = false,
  liquid = true,
  variant,
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

  const isLiquid = variant === "liquid" || liquid;
  const isGold = variant === "gold";
  const isCyan = variant === "cyan";

  const cardStyle: React.CSSProperties = {
    backgroundColor: isLiquid
      ? "rgba(16, 20, 32, 0.65)"
      : elevated
      ? "#1B2030"
      : "#141824",
    borderRadius: "16px",
    padding: paddingValues[padding],
    border: bordered ? "1px solid rgba(255, 255, 255, 0.1)" : "none",
    boxShadow: glow
      ? "0 0 24px rgba(77, 142, 255, 0.25), 0 8px 32px rgba(0, 0, 0, 0.45)"
      : undefined,
    fontFamily: "'Inter', sans-serif",
    color: "#E0E2EF",
    backdropFilter: isLiquid ? "blur(20px) saturate(180%)" : undefined,
    WebkitBackdropFilter: isLiquid ? "blur(20px) saturate(180%)" : undefined,
    ...style,
  };

  const variantClass = isGold
    ? "mc-liquid-gold"
    : isCyan
    ? "mc-liquid-cyan"
    : isLiquid
    ? "mc-liquid-glass"
    : "mc-card";

  return (
    <div
      style={cardStyle}
      className={`mc-card ${variantClass} ${glow ? "mc-glow-primary" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const LiquidCard: React.FC<CardProps> = (props) => (
  <Card liquid variant="liquid" {...props} />
);
