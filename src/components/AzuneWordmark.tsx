"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * AzuneWordmark Component
 *
 * AZUNE brand wordmark matching design spec exactly.
 * Based on: docs/brand/_archive/azune_wordmark_v1.svg
 *
 * Design Spec:
 * - viewBox: 800 x 400
 * - Center: (400, 200)
 * - Icon (A) + Z-U-N-E letters
 * - stroke-width: 5.5px
 * - stroke-linecap: round
 * - stroke-linejoin: round
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
  // The actual letter height in design is 110px (from y=-55 to y=55)
  // ViewBox should be tighter around the actual content: x from -180 to 380, y from -60 to 60
  const viewBoxWidth = 560; // 380 - (-180)
  const viewBoxHeight = 120; // 60 - (-60)
  const width = height * (viewBoxWidth / viewBoxHeight);

  // Colors based on variant
  // Design spec: letters are white, only ring and dot are accent color
  const getLetterColor = () => {
    switch (variant) {
      case "light":
        return "#FFFFFF";
      case "dark":
        return "#1A1A2A";
      case "gradient":
      default:
        return "#FFFFFF"; // Letters should be white, not gradient
    }
  };

  const getRingColor = () => {
    switch (variant) {
      case "light":
        return "#8B5CF6";
      case "dark":
        return "#6D28D9";
      case "gradient":
      default:
        return "#8B5CF6";
    }
  };

  const getDotColor = () => {
    switch (variant) {
      case "light":
        return "#8B5CF6";
      case "dark":
        return "#6D28D9";
      case "gradient":
      default:
        return "#8B5CF6";
    }
  };

  const letterColor = getLetterColor();
  const ringColor = getRingColor();
  const dotColor = getDotColor();

  return (
    <svg
      viewBox="-180 -60 560 120"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className={cn("inline-block", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {/* No gradient needed - letters are white, only ring/dot are accent */}
      </defs>

      <g>
        {/* Icon (A) - Ring at y=-3 (geometric center of A) */}
        <g transform="translate(-126, 0)">
          {/* A legs */}
          <line
            x1="-34"
            y1="55"
            x2="0"
            y2="-55"
            stroke={letterColor}
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.95"
          />
          <line
            x1="34"
            y1="55"
            x2="0"
            y2="-55"
            stroke={letterColor}
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
            stroke={ringColor}
            strokeWidth="2"
            opacity="0.9"
          />
          {/* Bullseye dot */}
          <circle cx="0" cy="3" r="2.2" fill={dotColor} opacity="0.9" />
        </g>

        {/* Z */}
        <g transform="translate(-52, 0)">
          <path
            d="M-26 -55 L26 -55 L-26 55 L26 55"
            fill="none"
            stroke={letterColor}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </g>

        {/* U */}
        <g transform="translate(14, 0)">
          <path
            d="M-26 -55 L-26 28 Q-26 55 0 55 Q26 55 26 28 L26 -55"
            fill="none"
            stroke={letterColor}
            strokeWidth="5.5"
            strokeLinecap="round"
            opacity="0.95"
          />
        </g>

        {/* N */}
        <g transform="translate(80, 0)">
          <path
            d="M-26 -55 L-26 55 L26 -55 L26 55"
            fill="none"
            stroke={letterColor}
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.95"
          />
        </g>

        {/* E */}
        <g transform="translate(140, 0)">
          <path
            d="M18 -55 L-22 -55 L-22 55 L18 55"
            fill="none"
            stroke={letterColor}
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
            stroke={letterColor}
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
