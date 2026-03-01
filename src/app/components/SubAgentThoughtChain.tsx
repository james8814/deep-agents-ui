"use client";

import React, { useMemo } from "react";
import { ThoughtChain } from "@ant-design/x";
import type { ThoughtChainProps } from "@ant-design/x";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { SubAgent } from "@/app/types/types";
import { AntdXMarkdown } from "@/app/components/AntdXMarkdown";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import { useFeatureFlag } from "@/lib/featureFlags";

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
    }, [subAgents, isLoading, expandedSubAgentId, onToggleExpand, useAntdxMarkdown]);

    if (!items.length) return null;

    return (
      <div className="w-full">
        <ThoughtChain items={items} line="dashed" />
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
  const map: Record<SubAgent["status"], "loading" | "success" | "error" | "abort"> = {
    pending: "loading",
    active: "loading",
    completed: "success",
    error: "error",
  };
  return map[status] || "loading";
}

/**
 * SubAgent content component (Input/Output display)
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
    () =>
      subAgent.output ? extractContent(subAgent.output) : "",
    [subAgent.output]
  );

  return (
    <div className="mt-2 space-y-3">
      {/* Input Section */}
      <div>
        <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
          Input
        </h4>
        <div className="rounded-md border border-border bg-surface p-3">
          {useAntdxMarkdown ? (
            <AntdXMarkdown content={inputContent} />
          ) : (
            <MarkdownContent content={inputContent} />
          )}
        </div>
      </div>

      {/* Output Section */}
      {subAgent.output && (
        <div>
          <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
            Output
          </h4>
          <div className="rounded-md border border-border bg-surface p-3">
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
