"use client";

import React, { useId } from "react";
import { cn } from "../../lib/utils";

export interface LiquidRadioOption<T extends string = string> {
  value: T;
  label: string;
}

export interface LiquidRadioGroupProps<T extends string = string> {
  options: readonly LiquidRadioOption<T>[] | LiquidRadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  name?: string;
}

/**
 * SVG distortion filter creating fluid liquid-glass refraction effect.
 */
export function GlassFilter() {
  return (
    <svg
      className="hidden"
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter
          id="radio-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="30"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="2" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Liquid glass radio component with fluid sliding indicator and specular reflections.
 */
export function LiquidRadioGroup<T extends string = string>({
  options,
  value,
  onChange,
  className,
  name,
}: LiquidRadioGroupProps<T>) {
  const autoName = useId();
  const groupName = name || `liquid-radio-${autoName}`;
  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value)
  );

  return (
    <div
      className={cn(
        "relative inline-flex items-center p-1 rounded-full",
        className
      )}
      style={{
        backgroundColor: "rgba(12, 16, 28, 0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(255, 255, 255, 0.09)",
        boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.35)",
      }}
    >
      <GlassFilter />

      {/* Grid wrapper for options */}
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Animated Fluid Liquid-Glass Active Indicator */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${100 / options.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
            transition: "transform 340ms cubic-bezier(0.16, 1, 0.3, 1)",
            borderRadius: "9999px",
            background:
              "linear-gradient(135deg, rgba(77, 142, 255, 0.32) 0%, rgba(0, 229, 255, 0.22) 100%)",
            boxShadow:
              "0 0 20px rgba(77, 142, 255, 0.42), inset 0 1px 1px rgba(255, 255, 255, 0.6), inset 0 -1px 2px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.32)",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {/* Glass Distortion Texture Layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "9999px",
              filter: 'url("#radio-glass")',
              opacity: 0.85,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Option Items */}
        {options.map((opt) => {
          const isSelected = opt.value === value;
          const inputId = `${groupName}-${opt.value}`;

          return (
            <label
              key={opt.value}
              htmlFor={inputId}
              style={{
                position: "relative",
                zIndex: 2,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "6px 18px",
                fontSize: "13px",
                fontWeight: isSelected ? 700 : 500,
                color: isSelected ? "#FFFFFF" : "rgba(255, 255, 255, 0.55)",
                cursor: "pointer",
                userSelect: "none",
                whiteSpace: "nowrap",
                transition: "color 200ms ease",
                textShadow: isSelected
                  ? "0 0 12px rgba(77, 142, 255, 0.6)"
                  : "none",
              }}
            >
              <input
                id={inputId}
                type="radio"
                name={groupName}
                value={opt.value}
                checked={isSelected}
                onChange={() => onChange(opt.value)}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: "hidden",
                  clip: "rect(0, 0, 0, 0)",
                  whiteSpace: "nowrap",
                  border: 0,
                }}
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
