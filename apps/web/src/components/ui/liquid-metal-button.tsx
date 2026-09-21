"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../lib/utils";

export type LiquidMetalVariant = "primary" | "cyan" | "gold" | "silver";
export type LiquidMetalSize = "sm" | "md" | "lg";

export interface LiquidMetalButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: LiquidMetalVariant;
  size?: LiquidMetalSize;
  label?: string;
  icon?: React.ReactNode;
  viewMode?: "text" | "icon" | "both";
  loading?: boolean;
  fullWidth?: boolean;
  href?: string;
}

interface Ripple {
  x: number;
  y: number;
  id: number;
}

const THEME_CONFIGS: Record<
  LiquidMetalVariant,
  {
    glow: string;
    border: string;
    borderHover: string;
    bodyGradient: string;
    accent: string;
    chrome: string;
    ambientGlow: string;
    textColor: string;
  }
> = {
  primary: {
    glow: "rgba(77, 142, 255, 0.4)",
    border: "rgba(77, 142, 255, 0.45)",
    borderHover: "rgba(0, 229, 255, 0.7)",
    bodyGradient: "linear-gradient(180deg, #1d273e 0%, #0d121f 100%)",
    accent: "rgba(0, 229, 255, 0.9)",
    chrome: "rgba(255, 255, 255, 0.95)",
    ambientGlow: "0 0 24px rgba(77, 142, 255, 0.35)",
    textColor: "#FFFFFF",
  },
  cyan: {
    glow: "rgba(0, 229, 255, 0.4)",
    border: "rgba(0, 229, 255, 0.5)",
    borderHover: "rgba(125, 240, 255, 0.8)",
    bodyGradient: "linear-gradient(180deg, #0e2433 0%, #06131c 100%)",
    accent: "rgba(0, 229, 255, 0.95)",
    chrome: "rgba(255, 255, 255, 0.95)",
    ambientGlow: "0 0 24px rgba(0, 229, 255, 0.4)",
    textColor: "#E0FBFF",
  },
  gold: {
    glow: "rgba(245, 158, 11, 0.45)",
    border: "rgba(245, 158, 11, 0.55)",
    borderHover: "rgba(251, 191, 36, 0.8)",
    bodyGradient: "linear-gradient(180deg, #2a200e 0%, #130e06 100%)",
    accent: "rgba(245, 158, 11, 0.95)",
    chrome: "rgba(255, 243, 204, 0.95)",
    ambientGlow: "0 0 26px rgba(245, 158, 11, 0.4)",
    textColor: "#FFFBEB",
  },
  silver: {
    glow: "rgba(226, 232, 240, 0.3)",
    border: "rgba(226, 232, 240, 0.4)",
    borderHover: "rgba(255, 255, 255, 0.75)",
    bodyGradient: "linear-gradient(180deg, #1e2430 0%, #0f131a 100%)",
    accent: "rgba(203, 213, 225, 0.9)",
    chrome: "rgba(255, 255, 255, 0.95)",
    ambientGlow: "0 0 20px rgba(226, 232, 240, 0.25)",
    textColor: "#F8FAFC",
  },
};

const SIZE_CONFIGS: Record<
  LiquidMetalSize,
  {
    height: number;
    fontSize: string;
    paddingX: number;
    iconSize: number;
  }
> = {
  sm: { height: 36, fontSize: "13px", paddingX: 16, iconSize: 14 },
  md: { height: 44, fontSize: "14px", paddingX: 22, iconSize: 16 },
  lg: { height: 52, fontSize: "15px", paddingX: 28, iconSize: 18 },
};

/**
 * Liquid Metal Button Component (21st.dev inspired)
 * Delivers dynamic 3D depth, fluid metallic refraction sheen, interactive click ripples,
 * and tactile press physics, customized to Merit Circle cyber-financial aesthetics.
 */
export function LiquidMetalButton({
  variant = "primary",
  size = "md",
  label,
  icon,
  viewMode = "both",
  loading = false,
  disabled = false,
  fullWidth = false,
  href,
  onClick,
  children,
  className,
  style,
  ...props
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);
  const speedRef = useRef(0.6);
  const animFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const theme = THEME_CONFIGS[variant];
  const sizeConfig = SIZE_CONFIGS[size];
  const isDisabled = disabled || loading;

  // Fluid Metallic Canvas Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isActive = true;

    const resize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      canvas.width = Math.max(rect.width * dpr, 100);
      canvas.height = Math.max(rect.height * dpr, 40);
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);

    const render = () => {
      if (!isActive) return;
      timeRef.current += 0.02 * speedRef.current;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // 1. Fluid Metallic Gradient Angle
      const angle = (timeRef.current * 0.4) % (Math.PI * 2);
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.max(w, h) * 0.8;

      const x0 = cx - Math.cos(angle) * r;
      const y0 = cy - Math.sin(angle) * r;
      const x1 = cx + Math.cos(angle) * r;
      const y1 = cy + Math.sin(angle) * r;

      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);

      if (variant === "gold") {
        gradient.addColorStop(0, "rgba(245, 158, 11, 0.15)");
        gradient.addColorStop(0.3, "rgba(251, 191, 36, 0.55)");
        gradient.addColorStop(0.5, "rgba(255, 248, 220, 0.95)");
        gradient.addColorStop(0.7, "rgba(217, 119, 6, 0.6)");
        gradient.addColorStop(1, "rgba(245, 158, 11, 0.15)");
      } else if (variant === "cyan") {
        gradient.addColorStop(0, "rgba(0, 229, 255, 0.15)");
        gradient.addColorStop(0.3, "rgba(6, 182, 212, 0.6)");
        gradient.addColorStop(0.5, "rgba(240, 253, 255, 0.95)");
        gradient.addColorStop(0.7, "rgba(0, 229, 255, 0.65)");
        gradient.addColorStop(1, "rgba(8, 145, 178, 0.15)");
      } else if (variant === "silver") {
        gradient.addColorStop(0, "rgba(148, 163, 184, 0.2)");
        gradient.addColorStop(0.3, "rgba(203, 213, 225, 0.6)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
        gradient.addColorStop(0.7, "rgba(148, 163, 184, 0.5)");
        gradient.addColorStop(1, "rgba(71, 85, 105, 0.2)");
      } else {
        // Primary Electric Blue & Cyan
        gradient.addColorStop(0, "rgba(77, 142, 255, 0.2)");
        gradient.addColorStop(0.25, "rgba(0, 229, 255, 0.55)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.95)");
        gradient.addColorStop(0.75, "rgba(77, 142, 255, 0.65)");
        gradient.addColorStop(1, "rgba(43, 91, 199, 0.2)");
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // 2. Dynamic Molten Highlights (sine wave refraction line)
      ctx.lineWidth = Math.max(w * 0.015, 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.beginPath();
      for (let x = 0; x <= w; x += 10) {
        const wave = Math.sin(x * 0.03 + timeRef.current * 1.5) * (h * 0.18);
        const y = h * 0.5 + wave;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isActive = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
    };
  }, [variant]);

  const handleMouseEnter = () => {
    if (isDisabled) return;
    setIsHovered(true);
    speedRef.current = 1.2;
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    speedRef.current = 0.6;
  };

  const handleClick = (e: React.MouseEvent<any>) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }

    // Temporary surge in fluid metallic motion
    speedRef.current = 2.6;
    setTimeout(() => {
      speedRef.current = isHovered ? 1.2 : 0.6;
    }, 350);

    // Spawn localized radiating ripple
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newRipple = { x, y, id: rippleIdRef.current++ };

      setRipples((prev) => [...prev, newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);
    }

    onClick?.(e);
  };

  const displayText = label || children;
  const showIcon = icon && (viewMode === "icon" || viewMode === "both");
  const showText = displayText && (viewMode === "text" || viewMode === "both");

  const content = (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => !isDisabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      style={{
        perspective: "1000px",
        perspectiveOrigin: "50% 50%",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        userSelect: "none",
        ...style,
      }}
      className={cn("group select-none", className)}
    >
      {/* 3D Perspective Wrapper */}
      <div
        style={{
          position: "relative",
          height: `${sizeConfig.height}px`,
          width: fullWidth ? "100%" : "auto",
          borderRadius: "9999px",
          transformStyle: "preserve-3d",
          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease",
          transform: isPressed ? "translateY(2px) scale(0.985)" : isHovered ? "translateY(-1.5px)" : "none",
          boxShadow: isPressed
            ? "0 2px 8px rgba(0, 0, 0, 0.6)"
            : isHovered
            ? `0 12px 32px rgba(0, 0, 0, 0.6), ${theme.ambientGlow}`
            : `0 4px 18px rgba(0, 0, 0, 0.45), ${theme.ambientGlow}`,
        }}
      >
        {/* Layer 1 (Z: 0px): Metallic Sheen Border & Fluid Canvas */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            overflow: "hidden",
            padding: "1.5px",
            background: isHovered ? theme.borderHover : theme.border,
            transition: "background 0.3s ease",
            transform: "translateZ(0px)",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              borderRadius: "9999px",
              opacity: isHovered ? 0.9 : 0.65,
              transition: "opacity 0.3s ease",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Layer 2 (Z: 10px): Brushed Metallic Core Pill */}
        <div
          style={{
            position: "absolute",
            inset: "2px",
            borderRadius: "9999px",
            background: theme.bodyGradient,
            boxShadow: isPressed
              ? "inset 0 3px 6px rgba(0, 0, 0, 0.7), inset 0 1px 2px rgba(0, 0, 0, 0.5)"
              : "inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.6)",
            transform: "translateZ(10px)",
            transition: "box-shadow 0.15s ease",
            pointerEvents: "none",
          }}
        />

        {/* Layer 3 (Z: 20px): Foreground Typography & Icons */}
        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: `0 ${sizeConfig.paddingX}px`,
            color: theme.textColor,
            fontSize: sizeConfig.fontSize,
            fontWeight: 700,
            letterSpacing: "0.2px",
            transform: "translateZ(20px)",
            zIndex: 30,
            pointerEvents: "none",
            textShadow: "0 1px 3px rgba(0, 0, 0, 0.7)",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? (
            <span
              style={{
                display: "inline-block",
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                borderTopColor: "#FFFFFF",
                animation: "spin 0.8s linear infinite",
              }}
            />
          ) : (
            <>
              {showIcon && icon}
              {showText && <span>{displayText}</span>}
            </>
          )}
        </div>

        {/* Layer 4 (Z: 25px): Radiating Click Ripples */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "9999px",
            overflow: "hidden",
            pointerEvents: "none",
            transform: "translateZ(25px)",
            zIndex: 40,
          }}
        >
          {ripples.map((ripple) => (
            <span
              key={ripple.id}
              style={{
                position: "absolute",
                left: `${ripple.x}px`,
                top: `${ripple.y}px`,
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 70%)",
                transform: "translate(-50%, -50%) scale(0)",
                animation: "mc-ripple-anim 0.6s ease-out forwards",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={isDisabled ? undefined : href}
        onClick={handleClick}
        style={{ textDecoration: "none", display: fullWidth ? "block" : "inline-block" }}
        tabIndex={isDisabled ? -1 : 0}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={props.type || "button"}
      disabled={isDisabled}
      onClick={handleClick}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        margin: 0,
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
        cursor: isDisabled ? "not-allowed" : "pointer",
        outline: "none",
      }}
      {...props}
    >
      {content}
    </button>
  );
}

export default LiquidMetalButton;
