"use client";

import React, { useMemo, useState } from "react";
import { ThoughtChain } from "@ant-design/x";
import type { ThoughtChainProps } from "@ant-design/x";
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react";
import type { SubAgent } from "@/app/types/types";
import type { LogEntry } from "@/app/types/subagent";
import { pairedLogs } from "@/app/types/subagent";
import { AntdXMarkdown } from "@/app/components/AntdXMarkdown";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import { useFeatureFlag } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

interface SubAgentThoughtChainProps {
  subAgents: SubAgent[];
  isLoading?: boolean;
  expandedSubAgentId: string | null;
  onToggleExpand: (id: string) => void;
}

export const SubAgentThoughtChain = React.memo<SubAgentThoughtChainProps>(
  ({ subAgents, isLoading, expandedSubAgentId, onToggleExpand }) => {
    const useAntdxMarkdown = useFeatureFlag("USE_ANTDX_MARKDOWN");

    // Map sub-agent status to ThoughtChain status
    const items: ThoughtChainProps["items"] = useMemo(() => {
      return subAgents.map((sa) => {
        const isExpanded = expandedSubAgentId === sa.id;
        const isProcessing = isLoading && sa.status === "active";

        return {
          key: sa.id,
          title: sa.subAgentName || sa.name,
          status: isProcessing ? "loading" : mapSubAgentStatus(sa.status),
          description: sa.status === "active" ? "Processing..." : undefined,
          icon: isExpanded ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          ),
          onClick: () => onToggleExpand(sa.id),
          collapsible: true,
          content: isExpanded ? (
            <SubAgentContent
              subAgent={sa}
              useAntdxMarkdown={useAntdxMarkdown}
            />
          ) : undefined,
          blink: isProcessing,
        };
      });
    }, [
      subAgents,
      isLoading,
      expandedSubAgentId,
      onToggleExpand,
      useAntdxMarkdown,
    ]);

    if (!items.length) return null;

    return (
      <div className="w-full">
        <ThoughtChain
          items={items}
          line="dashed"
        />
      </div>
    );
  }
);

SubAgentThoughtChain.displayName = "SubAgentThoughtChain";

/**
 * Map SubAgent status to ThoughtChain status
 * ThoughtChain supports: 'loading' | 'success' | 'error' | 'abort'
 */
function mapSubAgentStatus(
  status: SubAgent["status"]
): "loading" | "success" | "error" | "abort" {
  const map: Record<
    SubAgent["status"],
    "loading" | "success" | "error" | "abort"
  > = {
    pending: "loading",
    active: "loading",
    completed: "success",
    error: "error",
  };
  return map[status] || "loading";
}

/**
 * Single tool step row — shows tool name + expandable input/output
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
        className={cn(
          "flex w-full items-center gap-2 px-2 py-1.5 text-left",
          hasDetails && "hover:bg-muted/50"
        )}
      >
        {success ? (
          <CheckCircle size={11} className="flex-shrink-0 text-green-500" />
        ) : (
          <AlertCircle size={11} className="flex-shrink-0 text-red-500" />
        )}
        <span className="flex-1 truncate font-medium text-primary">
          {pair.call.tool_name || "unknown"}
        </span>
        {hasDetails && (
          <ChevronDown
            size={10}
            className={cn(
              "ml-auto flex-shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        )}
      </button>

      {expanded && hasDetails && (
        <div className="space-y-1.5 border-t border-border px-2 py-1.5">
          {pair.call.tool_input &&
            Object.keys(pair.call.tool_input).length > 0 && (
              <div>
                <span className="text-[10px] text-muted-foreground">输入</span>
                <pre className="mt-0.5 max-h-28 overflow-x-auto whitespace-pre-wrap rounded bg-muted p-1 text-[10px]">
                  {JSON.stringify(pair.call.tool_input, null, 2)}
                </pre>
              </div>
            )}
          {pair.result?.tool_output && (
            <div>
              <span className="text-[10px] text-muted-foreground">输出</span>
              <div className="mt-0.5 line-clamp-5 whitespace-pre-wrap rounded bg-muted p-1 text-[10px]">
                {pair.result.tool_output}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * SubAgent content component (Input / Steps / Output display)
 */
function SubAgentContent({
  subAgent,
  useAntdxMarkdown,
}: {
  subAgent: SubAgent;
  useAntdxMarkdown: boolean;
}) {
  const extractContent = (content: Record<string, unknown>): string => {
    if (typeof content === "string") return content;
    if (content && typeof content === "object" && "content" in content) {
      return String((content as { content: unknown }).content || "");
    }
    // Try to get text from messages array
    if ("messages" in content && Array.isArray(content.messages)) {
      const msg = content.messages[0];
      if (msg && typeof msg === "object" && "content" in msg) {
        const msgContent = (msg as { content?: unknown }).content;
        if (typeof msgContent === "string") return msgContent;
        if (Array.isArray(msgContent)) {
          return msgContent
            .map((item: any) => item.text || item.content || "")
            .join("\n");
        }
      }
    }
    return JSON.stringify(content, null, 2);
  };

  const inputContent = useMemo(
    () => extractContent(subAgent.input),
    [subAgent.input]
  );
  const outputContent = useMemo(
    () => (subAgent.output ? extractContent(subAgent.output) : ""),
    [subAgent.output]
  );

  const logPairs = useMemo(
    () => (subAgent.logs && subAgent.logs.length > 0 ? pairedLogs(subAgent.logs) : []),
    [subAgent.logs]
  );

  return (
    <div className="mt-2 space-y-3">
      {/* Input Section */}
      <div>
        <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
          Input
        </h4>
        <div className="bg-surface rounded-md border border-border p-3">
          {useAntdxMarkdown ? (
            <AntdXMarkdown content={inputContent} />
          ) : (
            <MarkdownContent content={inputContent} />
          )}
        </div>
      </div>

      {/* Execution Steps Section — shown when subagent_logs data is available */}
      {logPairs.length > 0 && (
        <div>
          <h4 className="text-primary/70 mb-1.5 text-xs font-semibold uppercase tracking-wider">
            执行步骤 ({logPairs.length})
          </h4>
          <div className="space-y-1">
            {logPairs.map((pair, idx) => (
              <LogEntryRow key={pair.call.tool_call_id ?? idx} pair={pair} />
            ))}
          </div>
        </div>
      )}

      {/* Output Section */}
      {subAgent.output && (
        <div>
          <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
            Output
          </h4>
          <div className="rounded-md border border-border bg-muted p-3">
            {useAntdxMarkdown ? (
              <AntdXMarkdown content={outputContent} />
            ) : (
              <MarkdownContent content={outputContent} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
