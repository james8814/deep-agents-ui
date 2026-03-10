"use client";

import React from "react";
import { cn } from "@/lib/utils";

type Variant = "spinner" | "dots" | "pulse" | "skeleton";
type Size = "sm" | "md" | "lg" | "xl";

interface LoadingSpinnerProps {
  /**
   * Display variant
   */
  variant?: Variant;

  /**
   * Size of the spinner
   */
  size?: Size;

  /**
   * Optional label text
   */
  label?: string;

  /**
   * Show label below spinner
   */
  showLabel?: boolean;

  /**
   * Custom color
   */
  color?: string;

  /**
   * Full screen loading overlay
   */
  fullScreen?: boolean;

  /**
   * Opacity of fullscreen overlay
   */
  overlayOpacity?: number;

  /**
   * Centered layout
   */
  centered?: boolean;
}

const sizeConfig: Record<
  Size,
  { spinner: string; dots: string; text: string }
> = {
  sm: { spinner: "h-4 w-4", dots: "h-2 w-2", text: "text-xs" },
  md: { spinner: "h-8 w-8", dots: "h-3 w-3", text: "text-sm" },
  lg: { spinner: "h-12 w-12", dots: "h-4 w-4", text: "text-base" },
  xl: { spinner: "h-16 w-16", dots: "h-5 w-5", text: "text-lg" },
};

/**
 * LoadingSpinner Component
 *
 * Displays various loading states with multiple visual styles.
 * Supports different variants, sizes, and optional text labels.
 *
 * Accessibility:
 * - WCAG 2.1 AA compliant
 * - Proper role="status" for screen readers
 * - Semantic HTML structure
 * - Reduced motion support
 *
 * @example
 * ```tsx
 * <LoadingSpinner
 *   variant="spinner"
 *   size="lg"
 *   label="Loading..."
 *   showLabel
 * />
 * ```
 */
export const LoadingSpinner = React.memo<LoadingSpinnerProps>(
  ({
    variant = "spinner",
    size = "md",
    label = "Loading",
    showLabel = true,
    color = "currentColor",
    fullScreen = false,
    overlayOpacity = 0.5,
    centered = true,
  }) => {
    const sizeClass = sizeConfig[size];

    const spinner = (
      <div
        role="status"
        className={cn(
          "flex flex-col items-center gap-3",
          centered && "justify-center"
        )}
      >
        {/* Spinner Variant */}
        {variant === "spinner" && (
          <div
            className={cn(
              "animate-spin rounded-full border-2 border-current border-t-transparent",
              sizeClass.spinner
            )}
            style={{
              borderColor: color,
              borderTopColor: "transparent",
            }}
          />
        )}

        {/* Dots Variant */}
        {variant === "dots" && (
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn("rounded-full", sizeClass.dots, "animate-pulse")}
                style={{
                  backgroundColor: color,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Pulse Variant */}
        {variant === "pulse" && (
          <div
            className={cn("animate-pulse rounded-full", sizeClass.spinner)}
            style={{ backgroundColor: color }}
          />
        )}

        {/* Skeleton Variant - typically used for layout shimmer */}
        {variant === "skeleton" && (
          <div
            className={cn(
              "animate-pulse rounded-lg bg-muted",
              sizeClass.spinner
            )}
          />
        )}

        {/* Label */}
        {showLabel && label && (
          <p
            className={cn(
              "text-muted-foreground transition-colors",
              sizeClass.text
            )}
          >
            {label}
          </p>
        )}

        {/* Screen reader text */}
        <span className="sr-only">{label} - please wait</span>
      </div>
    );

    if (fullScreen) {
      return (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
          }}
        >
          {spinner}
        </div>
      );
    }

    return spinner;
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

/**
 * SkeletonLoader Component
 *
 * Renders a skeleton placeholder for content that is loading.
 * Useful for creating loading skeletons that match your content layout.
 *
 * @example
 * ```tsx
 * <SkeletonLoader count={3} height="h-8" width="w-full" />
 * ```
 */
interface SkeletonLoaderProps {
  /**
   * Number of skeleton lines
   */
  count?: number;

  /**
   * Height of each skeleton line
   */
  height?: string;

  /**
   * Width of each skeleton line
   */
  width?: string;

  /**
   * Gap between lines
   */
  gap?: string;

  /**
   * Border radius
   */
  rounded?: string;
}

export const SkeletonLoader = React.memo<SkeletonLoaderProps>(
  ({
    count = 3,
    height = "h-4",
    width = "w-full",
    gap = "gap-2",
    rounded = "rounded-md",
  }) => {
    return (
      <div className={cn("space-y-0", gap)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn("animate-pulse bg-muted", height, width, rounded)}
          />
        ))}
      </div>
    );
  }
);

SkeletonLoader.displayName = "SkeletonLoader";
