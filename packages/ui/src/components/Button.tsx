import React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success"
  | "liquid-metal"
  | "liquid-gold"
  | "liquid-cyan";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  liquidMetal?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  liquidMetal = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  className = "",
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: { height: "34px", padding: "0 14px", fontSize: "12px", borderRadius: "9999px" },
    md: { height: "42px", padding: "0 18px", fontSize: "14px", borderRadius: "9999px" },
    lg: { height: "50px", padding: "0 26px", fontSize: "15px", borderRadius: "9999px" },
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: "#4D8EFF",
      color: "#FFFFFF",
      border: "none",
      boxShadow: "0 0 16px rgba(77, 142, 255, 0.3)",
    },
    "liquid-metal": {
      color: "#FFFFFF",
    },
    "liquid-gold": {
      color: "#FFFBEB",
    },
    "liquid-cyan": {
      color: "#E0FBFF",
    },
    secondary: {
      backgroundColor: "#1B2030",
      color: "#E0E2EF",
      border: "1px solid rgba(255, 255, 255, 0.12)",
    },
    outline: {
      backgroundColor: "transparent",
      color: "#E0E2EF",
      border: "1px solid rgba(255, 255, 255, 0.16)",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "#C2C6D6",
      border: "none",
    },
    danger: {
      backgroundColor: "#EF4444",
      color: "#FFFFFF",
      border: "none",
    },
    success: {
      backgroundColor: "#00E599",
      color: "#0B0E17",
      border: "none",
      fontWeight: 600,
    },
  };

  const isLiquidMetal =
    liquidMetal ||
    variant === "liquid-metal" ||
    variant === "liquid-gold" ||
    variant === "liquid-cyan";

  const liquidClass =
    variant === "liquid-gold"
      ? "mc-btn-liquid-gold"
      : variant === "liquid-cyan"
      ? "mc-btn-liquid-cyan"
      : isLiquidMetal
      ? "mc-btn-liquid-metal"
      : "";

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.6 : 1,
    transition: "all 0.18s ease-in-out",
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style,
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      style={baseStyle}
      className={`mc-button mc-button--${variant} ${liquidClass} ${className}`.trim()}
      {...props}
    >
      {loading && (
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mc-spinner"
          style={{ animation: "spin 1s linear infinite" }}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {!loading && leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
};
