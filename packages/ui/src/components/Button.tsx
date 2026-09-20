import React from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
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
    sm: { height: "32px", padding: "0 12px", fontSize: "12px", borderRadius: "6px" },
    md: { height: "40px", padding: "0 16px", fontSize: "14px", borderRadius: "8px" },
    lg: { height: "48px", padding: "0 24px", fontSize: "16px", borderRadius: "10px" },
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      backgroundColor: "#4D8EFF",
      color: "#FFFFFF",
      border: "none",
      boxShadow: "0 0 16px rgba(77, 142, 255, 0.3)",
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

  const baseStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.6 : 1,
    transition: "all 0.15s ease-in-out",
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
      className={`mc-button mc-button--${variant} ${className}`}
      {...props}
    >
      {loading && <span className="mc-spinner" aria-hidden="true">⏳</span>}
      {!loading && leftIcon}
      <span>{children}</span>
      {!loading && rightIcon}
    </button>
  );
};
