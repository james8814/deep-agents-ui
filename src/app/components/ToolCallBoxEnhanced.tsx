"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  Terminal,
  AlertCircle,
  Loader2,
  CircleCheckBigIcon,
  StopCircle,
  Shield,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCall, ActionRequest, ReviewConfig } from "@/app/types/types";
import { cn } from "@/lib/utils";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { ToolApprovalInterrupt } from "@/app/components/ToolApprovalInterrupt";
import { ToolArgsRenderer } from "@/app/components/tool-renderers";
import { ViewImageResult } from "@/app/components/ViewImageResult";

interface RiskBadgeConfig {
  level: "low" | "medium" | "high" | "critical";
  label: string;
  description?: string;
}

interface ToolCallBoxEnhancedProps {
  toolCall: ToolCall;
  uiComponent?: any;
  stream?: any;
  graphId?: string;
  actionRequest?: ActionRequest;
  reviewConfig?: ReviewConfig;
  onResume?: (value: any) => void;
  isLoading?: boolean;
  riskLevel?: "low" | "medium" | "high" | "critical";
  executionTime?: number;
  showCopyButton?: boolean;
}

// Tool-specific risk assessment
const TOOL_RISK_MAP: Record<string, RiskBadgeConfig> = {
  read_file: { level: "low", label: "Read-only" },
  write_file: {
    level: "high",
    label: "Write Risk",
    description: "Modifies files",
  },
  delete_file: {
    level: "critical",
    label: "Delete Risk",
    description: "Removes files",
  },
  execute_command: {
    level: "critical",
    label: "Execute Risk",
    description: "Runs system commands",
  },
  search_web: { level: "low", label: "Safe" },
  api_call: {
    level: "medium",
    label: "API Call",
    description: "External API request",
  },
};

const getRiskLevel = (toolName: string): RiskBadgeConfig => {
  return TOOL_RISK_MAP[toolName] || { level: "medium", label: "Tool" };
};

const getRiskColor = (level: string) => {
  switch (level) {
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300 dark:border-orange-700";
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700";
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700";
  }
};

const getRiskIcon = (level: string) => {
  switch (level) {
    case "critical":
      return <AlertTriangle size={12} />;
    case "high":
      return <AlertCircle size={12} />;
    case "medium":
      return <Info size={12} />;
    case "low":
      return <Shield size={12} />;
    default:
      return null;
  }
};

export const ToolCallBoxEnhanced = React.memo<ToolCallBoxEnhancedProps>(
  ({
    toolCall,
    uiComponent,
    stream,
    graphId,
    actionRequest,
    reviewConfig,
    onResume,
    isLoading,
    riskLevel,
    executionTime,
    showCopyButton = true,
  }) => {
    const [isExpanded, setIsExpanded] = useState(() => {
      // Auto-expand if has UI component, action request, or interrupted status
      if (!!uiComponent || !!actionRequest) return true;
      if (toolCall.status === "interrupted") return true;
      return false;
    });
    const [isCopied, setIsCopied] = useState(false);

    const { name, args, result, status } = useMemo(() => {
      return {
        name: toolCall.name || "Unknown Tool",
        args: toolCall.args || {},
        result: toolCall.result,
        status: toolCall.status || "completed",
      };
    }, [toolCall]);

    // Auto-expand when actionRequest becomes available or status changes to interrupted
    useEffect(() => {
      if (actionRequest || status === "interrupted") {
        setIsExpanded(true);
      }
    }, [actionRequest, status]);

    const risk = useMemo(
      () =>
        riskLevel
          ? ({ level: riskLevel } as RiskBadgeConfig)
          : getRiskLevel(name),
      [name, riskLevel]
    );

    const statusIcon = useMemo(() => {
      switch (status) {
        case "completed":
          return (
            <CircleCheckBigIcon
              size={16}
              className="text-green-600 dark:text-green-400"
            />
          );
        case "error":
          return (
            <AlertCircle
              size={16}
              className="text-destructive"
            />
          );
        case "pending":
          return (
            <Loader2
              size={16}
              className="animate-spin text-blue-600 dark:text-blue-400"
            />
          );
        case "interrupted":
          return (
            <StopCircle
              size={16}
              className="text-warning"
            />
          );
        default:
          return (
            <Terminal
              size={16}
              className="text-muted-foreground"
            />
          );
      }
    }, [status]);

    const toggleExpanded = useCallback(() => {
      setIsExpanded((prev) => !prev);

      // Analytics
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "tool_call_expanded", {
          tool_name: name,
          expanded: !isExpanded,
        });
      }
    }, [name, isExpanded]);

    const handleCopyArgs = useCallback(() => {
      const argString = JSON.stringify(args, null, 2);
      navigator.clipboard.writeText(argString);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);

      // Analytics
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "tool_args_copied", {
          tool_name: name,
        });
      }
    }, [args, name]);

    const hasContent = result || Object.keys(args).length > 0;

    return (
      <div
        className={cn(
          "w-full overflow-hidden rounded-lg border transition-all duration-200",
          status === "interrupted"
            ? "border-warning/50 bg-warning/5 ring-warning/20 ring-2"
            : isExpanded && hasContent
            ? "border-border bg-accent/30"
            : "border-border/50 hover:border-border hover:bg-accent/10"
        )}
        role="region"
        aria-label={`Tool call: ${name}`}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpanded}
          disabled={!hasContent}
          className={cn(
            "flex w-full items-center justify-between gap-2 border-none px-3 py-2.5 text-left outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "disabled:cursor-default"
          )}
          aria-expanded={isExpanded && hasContent ? true : false}
          aria-controls={`tool-content-${toolCall.id}`}
        >
          <div className="flex w-full items-center justify-between gap-3">
            {/* Left: Status icon + Tool name */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex-shrink-0">{statusIcon}</div>
              <span className="truncate text-[15px] font-medium tracking-[-0.6px] text-foreground">
                {name}
              </span>
            </div>

            {/* Middle: Risk badge */}
            {risk && (
              <div
                className={cn(
                  "flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  getRiskColor(risk.level)
                )}
                title={risk.description}
              >
                {getRiskIcon(risk.level)}
                <span>{risk.label}</span>
              </div>
            )}

            {/* Right: Execution time + Expand arrow */}
            <div className="flex items-center gap-2">
              {executionTime !== undefined && executionTime !== null && (
                <span className="flex-shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {executionTime < 1000
                    ? `${executionTime}ms`
                    : `${(executionTime / 1000).toFixed(1)}s`}
                </span>
              )}
              {hasContent &&
                (isExpanded ? (
                  <ChevronUp
                    size={16}
                    className="flex-shrink-0 text-muted-foreground"
                  />
                ) : (
                  <ChevronDown
                    size={16}
                    className="flex-shrink-0 text-muted-foreground"
                  />
                ))}
            </div>
          </div>
        </Button>

        {/* Expanded content */}
        {isExpanded && hasContent && (
          <div
            id={`tool-content-${toolCall.id}`}
            className="border-t border-border/30 px-4 pb-4 pt-3"
          >
            {uiComponent && stream && graphId ? (
              <div className="mt-2">
                <LoadExternalComponent
                  key={uiComponent.id}
                  stream={stream}
                  message={uiComponent}
                  namespace={graphId}
                  meta={{ status, args, result: result ?? "No Result Yet" }}
                />
              </div>
            ) : actionRequest && onResume ? (
              // Tool approval UI for interrupts
              <div className="mt-2">
                <ToolApprovalInterrupt
                  actionRequest={actionRequest}
                  reviewConfig={reviewConfig}
                  onResume={onResume}
                  isLoading={isLoading}
                />
              </div>
            ) : (
              <>
                {Object.keys(args).length > 0 && (
                  <div className="mt-2">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Arguments
                      </h4>
                      {showCopyButton && (
                        <button
                          onClick={handleCopyArgs}
                          className={cn(
                            "text-[10px] font-medium transition-colors",
                            isCopied
                              ? "text-green-600 dark:text-green-400"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          title="Copy arguments to clipboard"
                        >
                          {isCopied ? "Copied!" : "Copy"}
                        </button>
                      )}
                    </div>
                    <ToolArgsRenderer
                      name={name}
                      args={args}
                    />
                  </div>
                )}

                {result && (
                  <div className="mt-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Result
                    </h4>
                    {name === "view_image" &&
                    typeof result === "object" &&
                    result !== null ? (
                      <ViewImageResult result={result} />
                    ) : (
                      <div className="overflow-x-auto rounded-sm border border-border bg-muted/40">
                        <pre className="m-0 whitespace-pre-wrap break-all p-2 font-mono text-xs leading-7 text-foreground">
                          {typeof result === "string"
                            ? result
                            : JSON.stringify(result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

ToolCallBoxEnhanced.displayName = "ToolCallBoxEnhanced";
