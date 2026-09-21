"use client";

import React, { useEffect } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(11, 14, 23, 0.85)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
  };

  const dialogStyle: React.CSSProperties = {
    backgroundColor: "#141824",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "24px",
    width: "100%",
    maxWidth: "480px",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
    overflow: "hidden",
    fontFamily: "'Inter', sans-serif",
    color: "#E0E2EF",
  };

  const headerStyle: React.CSSProperties = {
    padding: "20px 24px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  const bodyStyle: React.CSSProperties = {
    padding: "24px",
    maxHeight: "70vh",
    overflowY: "auto",
  };

  const footerStyle: React.CSSProperties = {
    padding: "16px 24px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    backgroundColor: "#0B0E17",
  };

  return (
    <div style={overlayStyle} onClick={onClose} aria-modal="true" role="dialog">
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div>
            {title && <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>{title}</h2>}
            {description && <p style={{ fontSize: "13px", color: "#8C909F", margin: "4px 0 0" }}>{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            style={{
              background: "transparent",
              border: "none",
              color: "#8C909F",
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>
        <div style={bodyStyle}>{children}</div>
        {footer && <div style={footerStyle}>{footer}</div>}
      </div>
    </div>
  );
};
