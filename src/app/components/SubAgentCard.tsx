"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader,
} from "lucide-react";
import type { SubAgentDisplayData } from "@/app/types/subagent";
import { pairedLogs } from "@/app/types/subagent";
import type { LogEntry } from "@/app/types/subagent";
import { cn } from "@/lib/utils";

interface SubAgentCardProps {
  subagent: SubAgentDisplayData;
  expandedHeight?: number;
}

const STATUS_ICONS = {
  pending: <Clock className="h-4 w-4" />,
  running: <Loader className="h-4 w-4 animate-spin" />,
  success: <CheckCircle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
};

const STATUS_COLORS = {
  pending: "text-muted-foreground",
  running: "text-primary animate-pulse",
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
};

const STATUS_LABELS = {
  pending: "Pending",
  running: "Running",
  success: "Complete",
  error: "Error",
};

/**
 * Single tool step row — expandable input/output display
 */
function LogEntryRow({
  pair,
}: {
  pair: { call: LogEntry; result?: LogEntry };
}) {
  const [expanded, setExpanded] = useState(false);
  const success = !pair.result || pair.result.status !== "error";
  const hasDetails =
    (pair.call.tool_input && Object.keys(pair.call.tool_input).length > 0) ||
    !!pair.result?.tool_output;

  return (
    <div className="rounded border border-border bg-background text-xs">
      <button
        onClick={() => hasDetails && setExpanded((v) => !v)}
        aria-expanded={hasDetails ? expanded : undefined}
        className={cn(
          "flex w-full items-center gap-2 px-2 py-1.5 text-left",
          hasDetails && "hover:bg-muted/50"
        )}
      >
        {success ? (
          <CheckCircle
            size={11}
            className="flex-shrink-0 text-green-600 dark:text-green-400"
          />
        ) : (
          <AlertCircle
            size={11}
            className="flex-shrink-0 text-red-600 dark:text-red-400"
          />
        )}
        <span className="flex-1 truncate font-medium text-primary">
          {pair.call.tool_name || "unknown"}
        </span>
        {hasDetails && (
          <ChevronDown
            size={10}
            className={cn(
              "ml-auto flex-shrink-0 text-muted-foreground transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        )}
      </button>

      {hasDetails && (
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          aria-hidden={!expanded}
          style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="space-y-1.5 border-t border-border px-2 py-1.5">
              {pair.call.tool_input &&
                Object.keys(pair.call.tool_input).length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground">
                      输入
                    </span>
                    <pre className="mt-0.5 max-h-28 overflow-x-auto whitespace-pre-wrap rounded bg-muted p-1 text-[10px]">
                      {JSON.stringify(pair.call.tool_input, null, 2)}
                    </pre>
                  </div>
                )}
              {pair.result?.tool_output && (
                <div>
                  <span className="text-[10px] text-muted-foreground">
                    输出
                  </span>
                  <div className="mt-0.5 line-clamp-5 whitespace-pre-wrap rounded bg-muted p-1 text-[10px]">
                    {pair.result.tool_output}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SubAgentCard: React.FC<SubAgentCardProps> = ({
  subagent,
  expandedHeight = 300,
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusColor = STATUS_COLORS[subagent.status];
  const statusLabel = STATUS_LABELS[subagent.status];

  const elapsedTime = subagent.startedAt
    ? Math.round((new Date().getTime() - subagent.startedAt.getTime()) / 1000)
    : 0;

  const logPairs =
    subagent.logs && subagent.logs.length > 0 ? pairedLogs(subagent.logs) : [];

  const stepCount =
    logPairs.length > 0 ? logPairs.length : subagent.toolCalls?.length ?? 0;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/30">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="w-full p-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className={`flex items-center ${statusColor}`}>
              {STATUS_ICONS[subagent.status]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {subagent.name}
              </div>
              <div className={`text-xs ${statusColor}`}>{statusLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {elapsedTime > 0 && (
              <span className="text-xs text-muted-foreground">
                {elapsedTime}s
              </span>
            )}
            {stepCount > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                {stepCount} 步
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        aria-hidden={!expanded}
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div
            className="space-y-2 overflow-y-auto border-t border-border bg-muted/20 p-2.5"
            style={{ maxHeight: expanded ? `${expandedHeight}px` : undefined }}
          >
            {/* Execution Steps Section (from subagent_logs) */}
            {logPairs.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">
                  执行步骤 ({logPairs.length})
                </div>
                <div className="space-y-1">
                  {logPairs.map((pair, idx) => (
                    <LogEntryRow
                      key={pair.call.tool_call_id ?? idx}
                      pair={pair}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Fallback: Legacy Tool Calls (when no subagent_logs available) */}
            {logPairs.length === 0 && subagent.toolCalls?.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold text-muted-foreground">
                  Tools
                </div>
                <div className="space-y-1">
                  {subagent.toolCalls.map((call, idx) => (
                    <div
                      key={idx}
                      className="rounded bg-background p-1.5 text-xs"
                    >
                      <div className="mb-0.5 font-medium text-primary">
                        {call.name}
                      </div>
                      {call.args && Object.keys(call.args).length > 0 && (
                        <div className="truncate text-muted-foreground">
                          {JSON.stringify(call.args).substring(0, 100)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Section */}
            {subagent.error && (
              <div className="rounded bg-red-100 p-1.5 dark:bg-red-900/20">
                <div className="mb-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                  Error
                </div>
                <div className="break-words text-xs text-red-600 dark:text-red-400">
                  {subagent.error}
                </div>
              </div>
            )}

            {/* Result Section */}
            {subagent.result && (
              <div className="rounded bg-green-100 p-1.5 dark:bg-green-900/20">
                <div className="mb-0.5 text-xs font-medium text-green-600 dark:text-green-400">
                  Result
                </div>
                <div className="line-clamp-3 break-words text-xs text-green-600 dark:text-green-400">
                  {subagent.result}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

SubAgentCard.displayName = "SubAgentCard";

export default SubAgentCard;
