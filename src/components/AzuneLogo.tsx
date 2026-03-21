"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * AzuneLogo Component
 *
 * A reusable logo component that adapts to dark/light themes.
 * Based on v5.26 design spec:
 * - A letter: Height 110px, Width 68px, Stroke 5.5px
 * - Ring: r=8, stroke=2px
 * - Dot: r=2.2
 *
 * Gradient: cyan → brand → brand-d
 */

export interface AzuneLogoProps {
  /** Logo size in pixels */
  size?: 36 | 64 | 72 | 80;
  /** Color variant: auto (theme-aware), dark, or light */
  variant?: "auto" | "dark" | "light";
  /** Enable floating animation */
  animated?: boolean;
  /** Show "Azune" text next to logo */
  showText?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
}

// Size-to-viewport mapping for SVG viewBox scaling
// Ring: solid fill with transparent center (donut shape) - larger for visibility
const SIZE_CONFIG: Record<
  number,
  {
    viewBox: string;
    strokeWidth: number;
    ringOuterRadius: number;
    ringInnerRadius: number;
  }
> = {
  36: {
    viewBox: "0 0 36 36",
    strokeWidth: 1.5,
    ringOuterRadius: 3.5,
    ringInnerRadius: 1.8,
  },
  64: {
    viewBox: "0 0 64 64",
    strokeWidth: 2.5,
    ringOuterRadius: 6,
    ringInnerRadius: 3,
  },
  72: {
    viewBox: "0 0 72 72",
    strokeWidth: 2.8,
    ringOuterRadius: 7,
    ringInnerRadius: 3.5,
  },
  80: {
    viewBox: "0 0 80 80",
    strokeWidth: 3.2,
    ringOuterRadius: 8,
    ringInnerRadius: 4,
  },
};

// v5.26 color palette
const COLORS = {
  dark: {
    letter: "#FFFFFF",
    ring: "#8B5CF6", // violet-500
    dot: "#8B5CF6",
    gradient: "linear-gradient(135deg, #38BDF8, #7C6BF0, #5B4BC7)",
  },
  light: {
    letter: "#1A1A2A",
    ring: "#6D28D9", // violet-700
    dot: "#6D28D9",
    gradient: "linear-gradient(135deg, #38BDF8, #6558D3, #4F3FB3)",
  },
};

export const AzuneLogo = React.memo<AzuneLogoProps>(
  ({
    size = 36,
    variant = "auto",
    animated = false,
    showText = false,
    className,
    ariaLabel = "Azune Logo",
  }) => {
    const config = SIZE_CONFIG[size];
    const isLarge = size >= 64;

    // Determine colors based on variant
    // For "auto", we use CSS variables that adapt to theme
    const useCssVars = variant === "auto";
    const colors =
      variant === "dark"
        ? COLORS.dark
        : variant === "light"
        ? COLORS.light
        : null;

    // Calculate A letter dimensions (scaled from 200px base)
    const scale = size / 200;
    const letterHeight = 110 * scale;
    const letterWidth = 34 * scale;

    return (
      <div
        className={cn(
          "inline-flex items-center justify-center gap-2",
          className
        )}
        style={{
          ...(animated && {
            animation: "logoFloat 3s ease-in-out infinite",
          }),
        }}
        role="img"
        aria-label={ariaLabel}
      >
        {/* Logo container with gradient background */}
        <div
          className={cn(
            "relative flex items-center justify-center rounded-xl",
            isLarge && "shadow-lg"
          )}
          style={{
            width: size,
            height: size,
            background: useCssVars
              ? "linear-gradient(135deg, var(--color-cyan, #38BDF8), var(--color-primary, #7C6BF0), var(--color-primary-active, #5B4BC7))"
              : colors?.gradient,
            boxShadow: isLarge
              ? "0 8px 32px rgba(124, 107, 240, 0.4)"
              : undefined,
          }}
        >
          {/* SVG Logo */}
          <svg
            viewBox={config.viewBox}
            width={size * 0.6}
            height={size * 0.6}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <title>{ariaLabel}</title>
            <g transform={`translate(${size / 2}, ${size / 2})`}>
              {/* A letter - left leg */}
              <line
                x1={-letterWidth * 0.5}
                y1={letterHeight * 0.5}
                x2={0}
                y2={-letterHeight * 0.5}
                stroke={useCssVars ? "currentColor" : colors?.letter}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                style={useCssVars ? { color: "white" } : undefined}
              />
              {/* A letter - right leg */}
              <line
                x1={letterWidth * 0.5}
                y1={letterHeight * 0.5}
                x2={0}
                y2={-letterHeight * 0.5}
                stroke={useCssVars ? "currentColor" : colors?.letter}
                strokeWidth={config.strokeWidth}
                strokeLinecap="round"
                style={useCssVars ? { color: "white" } : undefined}
              />
              {/* Solid ring (donut shape) - outer circle filled, inner circle transparent */}
              <circle
                cx={0}
                cy={0}
                r={config.ringOuterRadius}
                fill={
                  useCssVars ? "var(--color-primary, #8B5CF6)" : colors?.ring
                }
              />
              {/* Inner circle - transparent (same as background color to create donut effect) */}
              <circle
                cx={0}
                cy={0}
                r={config.ringInnerRadius}
                fill="transparent"
              />
            </g>
          </svg>

          {/* Glow effect for large sizes */}
          {isLarge && (
            <div
              className="absolute inset-0 -z-10 rounded-xl opacity-30 blur-xl"
              style={{
                background: useCssVars
                  ? "linear-gradient(135deg, var(--color-cyan, #38BDF8), var(--color-primary, #7C6BF0))"
                  : colors?.gradient,
              }}
            />
          )}
        </div>

        {/* Optional text */}
        {showText && (
          <span
            className="font-bold tracking-tight"
            style={{
              fontSize: size * 0.35,
              fontFamily: "'DM Sans', 'Inter', sans-serif",
              letterSpacing: "-0.05em",
              color: useCssVars ? "var(--text-primary)" : colors?.letter,
            }}
          >
            Azune
          </span>
        )}
      </div>
    );
  }
);

AzuneLogo.displayName = "AzuneLogo";

export default AzuneLogo;

// Add keyframes to global scope if not already defined
// This should be added to globals.css:
// @keyframes logoFloat {
//   0%, 100% { transform: translateY(0); }
//   50% { transform: translateY(-4px); }
// }
