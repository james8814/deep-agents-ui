"use client";

import React, { useState } from "react";
import { ChevronDown, CheckCircle, AlertCircle, Clock, Loader } from "lucide-react";
import type { SubAgentDisplayData } from "@/app/types/subagent";

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
  success: "text-green-500",
  error: "text-red-500",
};

const STATUS_LABELS = {
  pending: "Pending",
  running: "Running",
  success: "Complete",
  error: "Error",
};

const SubAgentCard: React.FC<SubAgentCardProps> = ({ subagent, expandedHeight = 120 }) => {
  const [expanded, setExpanded] = useState(false);
  const statusColor = STATUS_COLORS[subagent.status];
  const statusLabel = STATUS_LABELS[subagent.status];

  const elapsedTime = subagent.startedAt
    ? Math.round(((new Date().getTime() - subagent.startedAt.getTime()) / 1000))
    : 0;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-muted/30">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`flex items-center ${statusColor}`}>
              {STATUS_ICONS[subagent.status]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{subagent.name}</div>
              <div className={`text-xs ${statusColor}`}>{statusLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {elapsedTime > 0 && (
              <span className="text-xs text-muted-foreground">{elapsedTime}s</span>
            )}
            {subagent.toolCalls?.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground">
                {subagent.toolCalls.length} tools
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div
          className="border-t border-border p-2.5 space-y-2 bg-muted/20 overflow-y-auto"
          style={{ maxHeight: `${expandedHeight}px` }}
        >
          {/* Tool Calls Section */}
          {subagent.toolCalls?.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">Tools</div>
              <div className="space-y-1">
                {subagent.toolCalls.map((call, idx) => (
                  <div key={idx} className="rounded bg-background p-1.5 text-xs">
                    <div className="font-medium text-primary mb-0.5">{call.name}</div>
                    {call.args && Object.keys(call.args).length > 0 && (
                      <div className="text-muted-foreground truncate">
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
            <div className="rounded bg-red-500/10 p-1.5">
              <div className="text-xs font-medium text-red-600 mb-0.5">Error</div>
              <div className="text-xs text-red-600 break-words">
                {subagent.error}
              </div>
            </div>
          )}

          {/* Result Section */}
          {subagent.result && (
            <div className="rounded bg-green-500/10 p-1.5">
              <div className="text-xs font-medium text-green-600 mb-0.5">Result</div>
              <div className="text-xs text-green-600 break-words line-clamp-3">
                {subagent.result}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

SubAgentCard.displayName = "SubAgentCard";

export default SubAgentCard;
