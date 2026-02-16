"use client";

import React from "react";
import { ThoughtChain } from "@ant-design/x";
import type { ToolCall } from "@/app/types/types";
import { ToolArgsRenderer } from "./tool-renderers";
import { InterruptActions } from "./InterruptActions";

// ThoughtChain status type: 'loading' | 'success' | 'error' | 'abort'
type ThoughtChainItemStatus = "loading" | "success" | "error" | "abort";

interface ToolCallFooterProps {
  toolCalls: ToolCall[];
  isLoading?: boolean;
  interrupt?: unknown;
  stream?: unknown;
  onResumeInterrupt?: (value: unknown) => void;
}

/**
 * Map ToolCall status to ThoughtChain status
 * ThoughtChain only supports: 'loading' | 'success' | 'error' | 'abort'
 */
function mapToolCallStatus(status: ToolCall["status"]): ThoughtChainItemStatus {
  const map: Record<string, ThoughtChainItemStatus> = {
    pending: "loading",      // pending -> loading
    completed: "success",    // completed -> success
    interrupted: "loading",  // interrupted -> loading (waiting for user action)
    error: "error",          // error -> error
  };
  return map[status] || "loading";
}

export const ToolCallFooter = React.memo<ToolCallFooterProps>(
  ({ toolCalls, isLoading, interrupt, stream, onResumeInterrupt }) => {
    const items = toolCalls.map((tc) => ({
      key: tc.id,
      title: tc.name,
      status: mapToolCallStatus(tc.status),
      description: tc.status === "pending" ? "Processing..." : undefined,
      collapsible: tc.status === "completed",
      content: (
        <div className="space-y-2">
          <ToolArgsRenderer name={tc.name} args={tc.args} />
          {tc.result && (
            <div className="rounded bg-muted p-2 text-xs">
              <pre className="whitespace-pre-wrap">{tc.result}</pre>
            </div>
          )}
          {tc.status === "interrupted" && onResumeInterrupt && (
            <InterruptActions
              onApprove={(value) => onResumeInterrupt(value)}
              onReject={() => onResumeInterrupt({ goto: "__end__" })}
            />
          )}
        </div>
      ),
    }));

    if (!items.length) return null;

    return (
      <div className="mt-3 border-t border-border pt-3">
        <ThoughtChain items={items} line="dashed" />
      </div>
    );
  }
);

ToolCallFooter.displayName = "ToolCallFooter";
