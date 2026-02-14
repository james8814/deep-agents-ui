"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

interface ExecutionStatusBarProps {
  isLoading: boolean;
  /** Current step/node name extracted from stream metadata */
  currentStep?: string | null;
  /** Current tool being called */
  currentTool?: string | null;
}

export const ExecutionStatusBar = React.memo<ExecutionStatusBarProps>(
  ({ isLoading, currentStep, currentTool }) => {
    const [elapsed, setElapsed] = useState(0);
    const startTimeRef = useRef<number | null>(null);

    // Track elapsed time
    useEffect(() => {
      if (isLoading) {
        startTimeRef.current = Date.now();
        setElapsed(0);
        const interval = setInterval(() => {
          if (startTimeRef.current) {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
          }
        }, 1000);
        return () => clearInterval(interval);
      } else {
        startTimeRef.current = null;
        setElapsed(0);
      }
    }, [isLoading]);

    if (!isLoading) return null;

    const formatElapsed = (seconds: number): string => {
      if (seconds < 60) return `${seconds}s`;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    return (
      <div className="flex h-9 items-center gap-3 border-b border-border bg-accent/50 px-4 py-2 text-sm">
        <Loader2 size={14} className="animate-spin text-primary" />
        <div className="flex flex-1 items-center gap-2 truncate">
          <span className="font-medium text-foreground">
            {currentStep || "Running agent"}
          </span>
          {currentTool && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {currentTool}
              </span>
            </>
          )}
        </div>
        <span className="flex-shrink-0 tabular-nums text-xs text-muted-foreground">
          {formatElapsed(elapsed)}
        </span>
      </div>
    );
  }
);

ExecutionStatusBar.displayName = "ExecutionStatusBar";
