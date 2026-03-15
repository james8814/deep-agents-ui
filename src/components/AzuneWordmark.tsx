"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * AzuneWordmark Component
 *
 * AZUNE brand wordmark with icon + letterforms.
 * Based on brand spec:
 * - Icon: A letter with precision ring (stroke: 5.5px)
 * - Letters: Z-U-N-E drawn with strokes (stroke: 5.5px)
 * - Ring: r=8, stroke=2px
 * - Dot: r=2.2
 */

export interface AzuneWordmarkProps {
  /** Logo height in pixels */
  height?: number;
  /** Color variant */
  variant?: "light" | "dark" | "gradient";
  /** Additional CSS classes */
  className?: string;
  /** Accessible label */
  ariaLabel?: string;
}

export const AzuneWordmark = React.memo<AzuneWordmarkProps>(function AzuneWordmark({
  height = 40,
  variant = "gradient",
  className,
  ariaLabel = "AZUNE",
}) {
  // Fixed dimensions based on brand spec
  // Base viewBox: 500 x 110 (enough space for icon + Z-U-N-E letters)
  const viewBoxWidth = 500;
  const viewBoxHeight = 110;
  const width = height * (viewBoxWidth / viewBoxHeight);

  // Colors based on variant
  const getColors = () => {
    switch (variant) {
      case "light":
        return {
          stroke: "#FFFFFF",
          ring: "#8B5CF6",
          dot: "#8B5CF6",
        };
      case "dark":
        return {
          stroke: "#1A1A2A",
          ring: "#6D28D9",
          dot: "#6D28D9",
        };
      case "gradient":
      default:
        return {
          stroke: "url(#wordmarkGradient)",
          ring: "#38BDF8",
          dot: "#38BDF8",
        };
    }
  };

  const colors = getColors();

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {variant === "gradient" && (
          <linearGradient id="wordmarkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#7C6BF0" />
            <stop offset="100%" stopColor="#5B4BC7" />
          </linearGradient>
        )}
      </defs>

      <g transform="translate(60, 55)">
        {/* Icon: A with precision ring */}
        <g transform="translate(0, 0)">
          {/* A legs */}
          <line
            x1="-34"
            y1="55"
            x2="0"
            y2="-55"
            stroke={colors.stroke}
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.95"
          />
          <line
            x1="34"
            y1="55"
            x2="0"
            y2="-55"
            stroke={colors.stroke}
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.95"
          />
          {/* Precision ring */}
          <circle
            cx="0"
            cy="3"
            r="8"
            fill="none"
            stroke={colors.ring}
            strokeWidth="2"
            opacity="0.9"
          />
          {/* Bullseye dot */}
          <circle cx="0" cy="3" r="2.2" fill={colors.dot} opacity="0.9" />
        </g>

        {/* Letter: Z */}
        <g transform="translate(90, 0)">
          <path
            d="M-26 -55 L26 -55 L-26 55 L26 55"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </g>

        {/* Letter: U */}
        <g transform="translate(170, 0)">
          <path
            d="M-26 -55 L-26 28 Q-26 55 0 55 Q26 55 26 28 L26 -55"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.95"
          />
        </g>

        {/* Letter: N */}
        <g transform="translate(250, 0)">
          <path
            d="M-26 -55 L-26 55 L26 -55 L26 55"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </g>

        {/* Letter: E */}
        <g transform="translate(330, 0)">
          <path
            d="M18 -55 L-22 -55 L-22 55 L18 55"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
          <line
            x1="-22"
            y1="0"
            x2="14"
            y2="0"
            stroke={colors.stroke}
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.95"
          />
        </g>
      </g>
    </svg>
  );
});

AzuneWordmark.displayName = "AzuneWordmark";

export default AzuneWordmark;
