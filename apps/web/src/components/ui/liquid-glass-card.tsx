"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

export interface LiquidCardProps extends React.ComponentProps<"div"> {
  glow?: boolean;
  bordered?: boolean;
  interactive?: boolean;
}

/**
 * Global SVG filter that produces organic refraction and liquid glass distortion.
 * Mount once in root layout or alongside LiquidCard.
 */
export function GlassFilter() {
  return (
    <svg className="hidden" aria-hidden="true" style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          {/* Generate subtle turbulent noise for liquid distortion */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.02 0.02"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />

          {/* Blur the turbulence pattern */}
          <feGaussianBlur
            in="turbulence"
            stdDeviation="2"
            result="blurredNoise"
          />

          {/* Displace the source graphic with the noise */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="40"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />

          {/* Apply overall blur on the final result */}
          <feGaussianBlur in="displaced" stdDeviation="2" result="finalBlur" />

          {/* Output the composite */}
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * Liquid Glass Card component based on 21st.dev / designali-in liquid-glass-card.
 * Features refractive liquid specular highlights, glowing inner bevels,
 * and high-depth glassmorphic elevation.
 */
export function LiquidCard({
  className,
  glow = false,
  bordered = true,
  interactive = true,
  children,
  style,
  ...props
}: LiquidCardProps) {
  return (
    <div className="relative group">
      <div
        data-slot="liquid-card"
        style={{
          backdropFilter: 'blur(20px) saturate(180%) url("#container-glass")',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          ...style,
        }}
        className={cn(
          "mc-liquid-glass rounded-2xl transition-all duration-300",
          "bg-slate-900/60 text-slate-100",
          bordered && "border border-white/10",
          glow && "shadow-[0_0_30px_rgba(77,142,255,0.25)]",
          interactive && "hover:-translate-y-1 hover:border-blue-400/40 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(77,142,255,0.2)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
      <GlassFilter />
    </div>
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 p-6 pb-3", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-lg font-bold tracking-tight text-white", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-slate-400 leading-relaxed", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  );
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0 mt-auto", className)}
      {...props}
    />
  );
}

export default LiquidCard;
