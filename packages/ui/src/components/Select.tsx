import React from "react";

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  helperText,
  disabled,
  id,
  className = "",
  style,
  ...props
}) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);

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

  const selectStyle: React.CSSProperties = {
    backgroundColor: "#0B0E17",
    border: error ? "1px solid #EF4444" : "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    padding: "0 12px",
    height: "44px",
    color: "#E0E2EF",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  return (
    <div style={containerStyle} className={`mc-select-container ${className}`}>
      {label && (
        <label htmlFor={selectId} style={labelStyle}>
          {label}
        </label>
      )}
      <select
        id={selectId}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        style={selectStyle}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ fontSize: "12px", color: "#EF4444" }}>{error}</span>
      )}
      {!error && helperText && (
        <span style={{ fontSize: "12px", color: "#8C909F" }}>{helperText}</span>
      )}
    </div>
  );
};
