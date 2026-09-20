import React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  error?: string;
  helperText?: string;
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  prefixNode,
  suffixNode,
  disabled,
  id,
  className = "",
  style,
  ...props
}) => {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "100%",
    fontFamily: "'Inter', sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "#C2C6D6",
  };

  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#0B0E17",
    border: error ? "1px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    padding: "0 12px",
    height: "44px",
    transition: "border-color 0.15s ease",
    opacity: disabled ? 0.6 : 1,
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#E0E2EF",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    cursor: disabled ? "not-allowed" : "text",
    ...style,
  };

  return (
    <div style={containerStyle} className={`mc-input-container ${className}`}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
        </label>
      )}
      <div style={wrapperStyle}>
        {prefixNode && <span style={{ marginRight: "8px", color: "#8C909F" }}>{prefixNode}</span>}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          style={inputStyle}
          {...props}
        />
        {suffixNode && <span style={{ marginLeft: "8px", color: "#8C909F", fontSize: "13px" }}>{suffixNode}</span>}
      </div>
      {error && (
        <span id={`${inputId}-error`} style={{ fontSize: "12px", color: "#EF4444" }}>
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={`${inputId}-helper`} style={{ fontSize: "12px", color: "#8C909F" }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
