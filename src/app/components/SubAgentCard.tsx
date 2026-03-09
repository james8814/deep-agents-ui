"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  Wrench,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import type { SubAgentDisplayData, ToolCallDisplay } from "@/app/types/subagent";

interface SubAgentCardProps {
  subagent: SubAgentDisplayData;
  className?: string;
  expandedHeight?: number; // 可配置高度
}

/**
 * 状态配置映射 (增强版)
 */
const STATUS_CONFIG: Record<
  string,
  {
    bgClass: string;
    textClass: string;
    icon: typeof Clock;
    label: string;
  }
> = {
  pending: {
    bgClass: "bg-secondary/50",
    textClass: "text-secondary-foreground",
    icon: Clock,
    label: "等待中",
  },
  running: {
    bgClass: "bg-primary/10",
    textClass: "text-primary",
    icon: Loader2,
    label: "执行中",
  },
  complete: {
    bgClass: "bg-green-500/10",
    textClass: "text-green-600 dark:text-green-400",
    icon: CheckCircle,
    label: "已完成",
  },
  error: {
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
    icon: XCircle,
    label: "错误",
  },
};

/**
 * SubAgent 状态徽章
 */
function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const { bgClass, textClass, icon: Icon, label } = config;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${bgClass} ${textClass}`}
    >
      {status === "running" && <Icon className="animate-spin" size={12} />}
      {status !== "running" && <Icon size={12} />}
      {label}
    </span>
  );
}

/**
 * 单个工具调用展示 (增强版: 支持展开/收起)
 */
function ToolCallItem({
  toolCall,
  maxArgLength = 150,
}: {
  toolCall: ToolCallDisplay;
  maxArgLength?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const { display: argsDisplay, truncated } = useMemo(() => {
    try {
      const jsonStr = JSON.stringify(toolCall.args, null, 0);
      if (jsonStr.length <= maxArgLength) {
        return { display: jsonStr, truncated: false };
      }
      return {
        display: expanded ? jsonStr : jsonStr.slice(0, maxArgLength) + "...",
        truncated: true,
      };
    } catch {
      return { display: "[无法序列化]", truncated: false };
    }
  }, [toolCall.args, maxArgLength, expanded]);

  return (
    <div className="flex items-start gap-2 border-b border-border/30 py-2 last:border-0">
      <Wrench size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{toolCall.name}</div>
        <div className="max-w-full truncate font-mono text-xs text-muted-foreground">
          {argsDisplay}
        </div>
        {truncated && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronRight size={12} className="mr-1" />
                收起
              </>
            ) : (
              <>
                <ChevronDown size={12} className="mr-1" />
                展开 ({JSON.stringify(toolCall.args).length} 字符)
              </>
            )}
          </Button>
        )}
        {toolCall.result && (
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            → {toolCall.result}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 错误信息展示
 */
function ErrorDisplay({ error }: { error?: string }) {
  const [showDetail, setShowDetail] = useState(false);

  if (!error) return null;

  return (
    <div className="mt-2 rounded-md bg-destructive/10 p-2">
      <div className="flex items-start gap-2">
        <AlertTriangle
          size={14}
          className="mt-0.5 flex-shrink-0 text-destructive"
        />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-destructive">执行出错</div>
          <div
            className={`mt-1 text-xs text-destructive/80 ${
              showDetail ? "whitespace-pre-wrap break-all" : "line-clamp-2"
            }`}
          >
            {error}
          </div>
          {error.length > 100 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-destructive"
              onClick={() => setShowDetail(!showDetail)}
            >
              <ExternalLink size={12} className="mr-1" />
              {showDetail ? "收起详情" : "查看详情"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SubAgent 卡片组件 (使用现有 UI 组件)
 */
export const SubAgentCard: React.FC<SubAgentCardProps> = ({
  subagent,
  className,
  expandedHeight = 160,
}) => {
  const borderColor = useMemo(() => {
    switch (subagent.status) {
      case "running":
        return "border-l-primary/50";
      case "complete":
        return "border-l-green-500/50";
      case "error":
        return "border-l-destructive/50";
      default:
        return "border-l-border";
    }
  }, [subagent.status]);

  const hasToolCalls = subagent.toolCalls && subagent.toolCalls.length > 0;
  const hasError = subagent.status === "error" && subagent.error;

  return (
    <div
      className={`rounded-lg border border-border bg-card ${borderColor} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">{subagent.name}</span>
        </div>
        <StatusBadge status={subagent.status} />
      </div>

      {/* Content */}
      {(hasToolCalls || hasError) && (
        <div className="px-4 py-2">
          {hasError && <ErrorDisplay error={subagent.error} />}
          {hasToolCalls && (
            <ScrollArea className={`h-[${expandedHeight}px]`}>
              {subagent.toolCalls.map((tc, idx) => (
                <ToolCallItem key={tc.id || `tc-${idx}`} toolCall={tc} />
              ))}
            </ScrollArea>
          )}
          {subagent.result && !hasError && (
            <div className="mt-2 rounded-md bg-muted/50 p-2">
              <div className="line-clamp-3 text-xs text-muted-foreground">
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

/**
 * 连接状态指示器
 */
export function ConnectionStatus({
  isConnected,
  isReconnecting,
}: {
  isConnected: boolean;
  isReconnecting?: boolean;
}) {
  if (isConnected) return null;

  return (
    <div className="flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
      {isReconnecting ? (
        <>
          <Loader2 className="animate-spin" size={14} />
          <span>正在重连...</span>
        </>
      ) : (
        <>
          <AlertTriangle size={14} />
          <span>连接已断开</span>
        </>
      )}
    </div>
  );
}
