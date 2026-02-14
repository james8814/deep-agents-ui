"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type { SubAgent } from "@/app/types/types";
import { cn } from "@/lib/utils";

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
          return <Loader2 size={14} className="animate-spin text-blue-500" />;
        case "completed":
          return <CheckCircle size={14} className="text-success/80" />;
        case "error":
          return <XCircle size={14} className="text-destructive" />;
        default:
          return <Clock size={14} className="text-muted-foreground" />;
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
          "w-fit max-w-[70vw] overflow-hidden rounded-lg border",
          subAgent.status === "active"
            ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
            : subAgent.status === "error"
              ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30"
              : "border-border bg-card"
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="flex w-full items-center justify-between gap-3 border-none px-4 py-2.5 text-left shadow-none"
        >
          <div className="flex items-center gap-2">
            {statusIcon}
            <span className="text-[14px] font-semibold tracking-tight text-foreground">
              {subAgent.subAgentName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{statusText}</span>
            {isExpanded ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </div>
        </Button>
      </div>
    );
  }
);

SubAgentIndicator.displayName = "SubAgentIndicator";
