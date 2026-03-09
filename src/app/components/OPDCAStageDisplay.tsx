"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Eye,
  Lightbulb,
  Zap,
  CheckCircle,
  Repeat2,
  Circle,
} from "lucide-react";

type OPDCAStage = "observe" | "plan" | "do" | "check" | "adapt" | "idle";

interface OPDCAStageDisplayProps {
  /**
   * Current OPDCA stage
   */
  stage: OPDCAStage;

  /**
   * Display variant
   */
  variant?: "full" | "compact" | "minimal";

  /**
   * Show stage description
   */
  showDescription?: boolean;

  /**
   * Custom class names
   */
  className?: string;
}

const stageConfig: Record<OPDCAStage, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  textColor: string;
  order: number;
}> = {
  observe: {
    label: "Observe",
    description: "Gathering information and analyzing current state",
    icon: <Eye className="h-4 w-4" />,
    color: "bg-blue-500",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-600 dark:text-blue-400",
    order: 1,
  },
  plan: {
    label: "Plan",
    description: "Creating strategy and setting objectives",
    icon: <Lightbulb className="h-4 w-4" />,
    color: "bg-purple-500",
    bgColor: "bg-purple-500/10",
    textColor: "text-purple-600 dark:text-purple-400",
    order: 2,
  },
  do: {
    label: "Do",
    description: "Executing planned actions",
    icon: <Zap className="h-4 w-4" />,
    color: "bg-green-500",
    bgColor: "bg-green-500/10",
    textColor: "text-green-600 dark:text-green-400",
    order: 3,
  },
  check: {
    label: "Check",
    description: "Evaluating results and gathering feedback",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "bg-orange-500",
    bgColor: "bg-orange-500/10",
    textColor: "text-orange-600 dark:text-orange-400",
    order: 4,
  },
  adapt: {
    label: "Adapt",
    description: "Reflecting and adjusting approach",
    icon: <Repeat2 className="h-4 w-4" />,
    color: "bg-red-500",
    bgColor: "bg-red-500/10",
    textColor: "text-red-600 dark:text-red-400",
    order: 5,
  },
  idle: {
    label: "Idle",
    description: "Waiting for user input or next action",
    icon: <Circle className="h-4 w-4" />,
    color: "bg-gray-500",
    bgColor: "bg-gray-500/10",
    textColor: "text-gray-600 dark:text-gray-400",
    order: 0,
  },
};

/**
 * OPDCAStageDisplay Component
 *
 * Displays the current OPDCA (Observe-Plan-Do-Check-Adapt) workflow stage.
 * Used to show where the agent is in its decision-making process.
 *
 * Accessibility:
 * - WCAG 2.1 AA compliant
 * - Proper ARIA labels
 * - Color + icon for clarity
 * - Descriptive text
 *
 * @example
 * ```tsx
 * <OPDCAStageDisplay
 *   stage="plan"
 *   variant="full"
 *   showDescription
 * />
 * ```
 */
export const OPDCAStageDisplay = React.memo<OPDCAStageDisplayProps>(
  ({
    stage,
    variant = "full",
    showDescription = false,
    className,
  }) => {
    const config = stageConfig[stage];

    // Minimal variant - just the icon and label
    if (variant === "minimal") {
      return (
        <div
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
            config.bgColor,
            config.textColor,
            className
          )}
          role="status"
          aria-label={`Current stage: ${config.label}`}
        >
          {config.icon}
          <span>{config.label}</span>
        </div>
      );
    }

    // Compact variant - includes label and subtle description
    if (variant === "compact") {
      return (
        <div
          className={cn("flex items-start gap-2 rounded-lg p-2", className)}
          role="status"
          aria-label={`Current stage: ${config.label}`}
        >
          <div
            className={cn(
              "flex-shrink-0 rounded-md p-1.5 mt-0.5",
              config.bgColor,
              config.textColor
            )}
          >
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{config.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {config.description}
            </p>
          </div>
        </div>
      );
    }

    // Full variant - complete card layout
    return (
      <div
        className={cn(
          "rounded-lg border border-border/50 bg-card/50 p-4",
          className
        )}
        role="status"
        aria-label={`Current stage: ${config.label}`}
      >
        {/* Header with icon and title */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className={cn(
              "flex-shrink-0 rounded-lg p-2.5",
              config.bgColor,
              config.textColor
            )}
          >
            {config.icon}
          </div>
          <div className="flex-1">
            <h3 className={cn("font-semibold text-sm", config.textColor)}>
              {config.label}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stage {config.order} of 5
            </p>
          </div>
        </div>

        {/* Description */}
        {showDescription && (
          <>
            <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
              {config.description}
            </p>

            {/* Progress indicator */}
            <div className="flex gap-1">
              {["observe", "plan", "do", "check", "adapt"].map((s) => {
                const sConfig = stageConfig[s as OPDCAStage];
                const isActive = s === stage;
                const isPassed = sConfig.order < stageConfig[stage].order;

                return (
                  <div
                    key={s}
                    className={cn(
                      "flex-1 h-2 rounded-full transition-all",
                      isActive && sConfig.color,
                      isPassed && sConfig.color + " opacity-50",
                      !isActive && !isPassed && "bg-muted"
                    )}
                    aria-label={sConfig.label}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  }
);

OPDCAStageDisplay.displayName = "OPDCAStageDisplay";

/**
 * OPDCATimeline Component
 *
 * Shows all OPDCA stages in a horizontal timeline layout.
 * Useful for visualizing the entire workflow progression.
 *
 * @example
 * ```tsx
 * <OPDCATimeline currentStage="plan" />
 * ```
 */
interface OPDCATimelineProps {
  /**
   * Current stage
   */
  currentStage: OPDCAStage;

  /**
   * Completed stages
   */
  completedStages?: OPDCAStage[];

  /**
   * Show labels
   */
  showLabels?: boolean;

  /**
   * Compact layout
   */
  compact?: boolean;
}

export const OPDCATimeline = React.memo<OPDCATimelineProps>(
  ({ currentStage, completedStages = [], showLabels = true, compact = false }) => {
    const stages: OPDCAStage[] = [
      "observe",
      "plan",
      "do",
      "check",
      "adapt",
    ];

    return (
      <div
        className={cn(
          "flex items-center gap-2",
          compact ? "gap-1" : "gap-3"
        )}
        role="progressbar"
        aria-valuenow={stageConfig[currentStage].order}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-label={`Workflow progress: ${currentStage}`}
      >
        {stages.map((stage, index) => {
          const config = stageConfig[stage];
          const isActive = stage === currentStage;
          const isCompleted = completedStages.includes(stage);
          const isFuture = stageConfig[stage].order > stageConfig[currentStage].order;

          return (
            <div
              key={stage}
              className="flex items-center gap-2 flex-1"
            >
              {/* Stage dot/icon */}
              <div
                className={cn(
                  "flex-shrink-0 rounded-full p-1.5 transition-all",
                  isActive && cn(config.bgColor, config.textColor, "ring-2 ring-offset-2 ring-current"),
                  isCompleted && !isActive && "bg-green-500/10 text-green-600 dark:text-green-400",
                  isFuture && "bg-muted text-muted-foreground",
                  compact ? "h-7 w-7 flex items-center justify-center text-xs" : "h-8 w-8 flex items-center justify-center"
                )}
              >
                {isCompleted && !isActive ? (
                  <span className="text-lg">✓</span>
                ) : (
                  config.icon
                )}
              </div>

              {/* Label */}
              {showLabels && !compact && (
                <span
                  className={cn(
                    "text-xs font-medium transition-colors",
                    isActive && config.textColor,
                    isCompleted && !isActive && "text-green-600 dark:text-green-400",
                    isFuture && "text-muted-foreground"
                  )}
                >
                  {config.label}
                </span>
              )}

              {/* Connector line */}
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 transition-all",
                    (isActive || isCompleted) && (completedStages.includes(stages[index + 1]) || stages[index + 1] === currentStage)
                      ? "bg-green-500"
                      : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

OPDCATimeline.displayName = "OPDCATimeline";
