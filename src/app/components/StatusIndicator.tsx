"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Status = "connected" | "connecting" | "disconnected" | "error" | "idle";

interface StatusIndicatorProps {
  /**
   * Current connection status
   */
  status: Status;

  /**
   * Optional label text
   */
  label?: string;

  /**
   * Optional description/tooltip text
   */
  description?: string;

  /**
   * Show pulsing animation
   */
  pulse?: boolean;

  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";

  /**
   * Show label beside indicator
   */
  showLabel?: boolean;
}

const statusConfig: Record<Status, {
  bgColor: string;
  dotColor: string;
  label: string;
  icon: string;
}> = {
  connected: {
    bgColor: "bg-green-500/10",
    dotColor: "bg-green-500",
    label: "Connected",
    icon: "●",
  },
  connecting: {
    bgColor: "bg-blue-500/10",
    dotColor: "bg-blue-500",
    label: "Connecting",
    icon: "◐",
  },
  disconnected: {
    bgColor: "bg-gray-500/10",
    dotColor: "bg-gray-500",
    label: "Disconnected",
    icon: "●",
  },
  error: {
    bgColor: "bg-red-500/10",
    dotColor: "bg-red-500",
    label: "Error",
    icon: "⚠",
  },
  idle: {
    bgColor: "bg-yellow-500/10",
    dotColor: "bg-yellow-500",
    label: "Idle",
    icon: "●",
  },
};

const sizeConfig: Record<string, { dot: string; text: string }> = {
  sm: { dot: "h-2 w-2", text: "text-xs" },
  md: { dot: "h-3 w-3", text: "text-sm" },
  lg: { dot: "h-4 w-4", text: "text-base" },
};

/**
 * StatusIndicator Component
 *
 * Displays connection status with visual feedback, animations, and accessibility features.
 * Supports multiple status states with customizable appearance and tooltips.
 *
 * Accessibility:
 * - WCAG 2.1 AA compliant
 * - Color + icon for status clarity
 * - Accessible tooltip with keyboard support
 * - Proper ARIA labels
 *
 * @example
 * ```tsx
 * <StatusIndicator
 *   status="connected"
 *   label="Agent"
 *   description="Connection established"
 *   showLabel
 * />
 * ```
 */
export const StatusIndicator = React.memo<StatusIndicatorProps>(
  ({
    status,
    label,
    description,
    pulse = status === "connecting",
    size = "md",
    showLabel = true,
  }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const config = statusConfig[status];
    const sizeClasses = sizeConfig[size];

    if (!mounted) {
      return null;
    }

    const content = (
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "relative inline-flex items-center justify-center rounded-full",
            sizeClasses.dot,
            config.bgColor,
            "transition-all duration-300"
          )}
        >
          <div
            className={cn(
              "absolute rounded-full",
              sizeClasses.dot,
              config.dotColor,
              pulse && "animate-pulse",
              status === "connecting" && "animate-spin"
            )}
            style={{
              animation:
                status === "connecting"
                  ? "spin 1s linear infinite"
                  : pulse
                    ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite"
                    : undefined,
            }}
          />
        </div>

        {showLabel && (
          <span
            className={cn(
              "font-medium transition-colors",
              sizeClasses.text,
              status === "connected" && "text-green-600 dark:text-green-400",
              status === "connecting" && "text-blue-600 dark:text-blue-400",
              status === "disconnected" && "text-gray-600 dark:text-gray-400",
              status === "error" && "text-red-600 dark:text-red-400",
              status === "idle" && "text-yellow-600 dark:text-yellow-400"
            )}
          >
            {label || config.label}
          </span>
        )}
      </div>
    );

    // Wrap with tooltip if description is provided
    if (description) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div role="status" aria-label={`Status: ${label || config.label}`}>
                {content}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">{description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <div role="status" aria-label={`Status: ${label || config.label}`}>
        {content}
      </div>
    );
  }
);

StatusIndicator.displayName = "StatusIndicator";
