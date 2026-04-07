"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type { SubAgent } from "@/app/types/types";
import { cn } from "@/lib/utils";
import { getToolDisplayName } from "@/app/utils/toolNames";

interface SubAgentIndicatorProps {
  subAgent: SubAgent;
  onClick: () => void;
  isExpanded?: boolean;
}

export const SubAgentIndicator = React.memo<SubAgentIndicatorProps>(
  ({ subAgent, onClick, isExpanded = true }) => {
    const [elapsed, setElapsed] = useState(0);
    const startRef = useRef<number>(Date.now());

    // Elapsed time for active sub-agents
    useEffect(() => {
      if (subAgent.status === "active" || subAgent.status === "pending") {
        startRef.current = Date.now();
        const interval = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [subAgent.status]);

    const statusIcon = (() => {
      switch (subAgent.status) {
        case "active":
          return (
            <Loader2
              size={14}
              className="animate-spin text-primary"
            />
          );
        case "completed":
          return (
            <CheckCircle
              size={14}
              className="text-success/80"
            />
          );
        case "error":
          return (
            <XCircle
              size={14}
              className="text-destructive"
            />
          );
        default:
          return (
            <Clock
              size={14}
              className="text-muted-foreground"
            />
          );
      }
    })();

    const statusText = (() => {
      switch (subAgent.status) {
        case "active":
          return `Running... ${elapsed}s`;
        case "completed":
          return `Completed${elapsed > 0 ? ` in ${elapsed}s` : ""}`;
        case "error":
          return "Failed";
        default:
          return "Pending";
      }
    })();

    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 overflow-hidden rounded-lg border px-3 py-1.5",
          subAgent.status === "active"
            ? "border-primary/30 bg-primary/5 dark:border-primary/40 dark:bg-primary/10"
            : subAgent.status === "error"
            ? "border-destructive/30 bg-destructive/5 dark:border-destructive/40 dark:bg-destructive/10"
            : "border-border bg-card"
        )}
      >
        {statusIcon}
        <span className="text-sm font-medium text-foreground">
          {getToolDisplayName(subAgent.subAgentName, subAgent.subAgentName)}
        </span>
        <span className="text-xs text-muted-foreground">{statusText}</span>
      </div>
    );
  }
);

SubAgentIndicator.displayName = "SubAgentIndicator";
