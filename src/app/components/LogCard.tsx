"use client";

import React, { useState } from "react";
import { CheckCircle, XCircle, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@/app/types/subagent";
import { getToolDisplayName } from "@/app/utils/toolNames";

/**
 * LogCard — 执行日志卡片（方案 D）
 *
 * 每张卡片展示一个工具调用的完整信息：
 * - 工具名称（可读中文名）
 * - 输入参数（解析为人类可读的内容）
 * - 输出结果（如果有）
 * - 执行状态
 *
 * 长内容自动折叠（>5 行），支持展开。
 */

interface LogCardProps {
  call: LogEntry;
  result?: LogEntry;
  className?: string;
}

// 内容行数阈值 — 超过时自动折叠
const COLLAPSE_LINE_THRESHOLD = 5;

export const LogCard = React.memo<LogCardProps>(
  ({ call, result, className }) => {
    const [expanded, setExpanded] = useState(false);

    const toolName = call.tool_name || "unknown";
    const displayName = getToolDisplayName(toolName, toolName);
    const status = result?.status || (result ? "success" : undefined);
    const isRunning = !result;
    const isError = status === "error";

    // 解析输入内容
    const inputContent = formatInput(toolName, call.tool_input);
    // 解析输出内容
    const outputContent = result?.tool_output
      ? formatOutput(result.tool_output)
      : null;

    // 判断是否需要折叠
    const fullContent = [inputContent, outputContent].filter(Boolean).join("\n\n");
    const lineCount = fullContent.split("\n").length;
    const needsCollapse = lineCount > COLLAPSE_LINE_THRESHOLD;
    const isCollapsed = needsCollapse && !expanded;

    return (
      <div
        className={cn(
          "rounded-lg px-3 py-2.5 transition-colors duration-150",
          isError
            ? "border-l-2 border-l-destructive bg-destructive/5"
            : isRunning
            ? "border-l-2 border-l-primary bg-primary/5"
            : "bg-muted/40",
          className
        )}
      >
        {/* 工具名称 + 状态 */}
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-mono text-xs font-semibold text-primary">
            {displayName}
          </span>
          <StatusBadge status={status} isRunning={isRunning} />
        </div>

        {/* 内容区 */}
        <div
          className={cn(
            "text-sm leading-relaxed text-foreground",
            isCollapsed && "line-clamp-5"
          )}
        >
          {/* 输入 */}
          {inputContent && (
            <div className="whitespace-pre-wrap break-words">
              {inputContent}
            </div>
          )}

          {/* 输出 */}
          {outputContent && (
            <div className="mt-2 whitespace-pre-wrap break-words border-t border-border/50 pt-2 text-muted-foreground">
              {outputContent}
            </div>
          )}

          {/* 错误信息 */}
          {isError && result?.tool_output && (
            <div className="mt-2 whitespace-pre-wrap break-words text-sm text-destructive">
              {result.tool_output}
            </div>
          )}
        </div>

        {/* 展开/折叠 */}
        {needsCollapse && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronDown
              size={12}
              className={cn(
                "transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
            {expanded ? "收起" : "展开更多"}
          </button>
        )}
      </div>
    );
  }
);

LogCard.displayName = "LogCard";

/**
 * 状态标识
 */
function StatusBadge({
  status,
  isRunning,
}: {
  status?: string;
  isRunning: boolean;
}) {
  if (isRunning) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-primary">
        <Loader2 size={10} className="animate-spin" />
        执行中
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-destructive">
        <XCircle size={10} />
        失败
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400">
      <CheckCircle size={10} />
      完成
    </span>
  );
}

/**
 * 格式化工具输入为人类可读文本
 */
function formatInput(
  toolName: string,
  input?: Record<string, unknown> | string | unknown[]
): string {
  if (!input) return "";

  // 字符串直接返回
  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return formatInput(toolName, parsed);
    } catch {
      return input;
    }
  }

  // 数组处理
  if (Array.isArray(input)) {
    return input.map((item) => String(item)).join("\n");
  }

  const obj = input as Record<string, unknown>;

  // 工具特定格式化
  switch (toolName) {
    case "search":
      if (obj.queries) {
        const queries = Array.isArray(obj.queries) ? obj.queries : [obj.queries];
        return `查询: ${queries.join(", ")}`;
      }
      if (obj.query) return `查询: ${obj.query}`;
      break;

    case "write_file":
      if (obj.file_path) {
        const path = String(obj.file_path);
        const content = obj.content ? String(obj.content) : "";
        if (content.length > 200) {
          return `写入: ${path}\n${content.substring(0, 200)}...`;
        }
        return content ? `写入: ${path}\n${content}` : `写入: ${path}`;
      }
      break;

    case "read_file":
      if (obj.file_path) {
        const path = String(obj.file_path);
        const parts = [];
        if (obj.offset !== undefined) parts.push(`offset=${obj.offset}`);
        if (obj.limit !== undefined) parts.push(`limit=${obj.limit}`);
        return parts.length > 0
          ? `读取: ${path} [${parts.join(", ")}]`
          : `读取: ${path}`;
      }
      break;

    case "think_tool":
      if (obj.reflection) return String(obj.reflection);
      break;

    case "write_todos":
      if (obj.todos && Array.isArray(obj.todos)) {
        return (obj.todos as Array<{ content?: string; status?: string }>)
          .map((t) => `• ${t.content || ""}${t.status ? ` (${t.status})` : ""}`)
          .join("\n");
      }
      break;

    case "fetch_content":
      if (obj.urls) {
        const urls = Array.isArray(obj.urls) ? obj.urls : [obj.urls];
        return `抓取:\n${urls.map((u) => `  ${u}`).join("\n")}`;
      }
      break;

    case "task":
      if (obj.description) return String(obj.description);
      break;

    case "submit_deliverable":
      if (obj.deliverable_path) {
        const summary = obj.quality_check_summary
          ? `\n${obj.quality_check_summary}`
          : "";
        return `提交交付物: ${obj.deliverable_path}${summary}`;
      }
      break;
  }

  // 通用: 尝试常见字段
  const commonFields = [
    "query", "text", "message", "content", "description",
    "instruction", "prompt", "command",
  ];
  for (const field of commonFields) {
    if (obj[field]) return String(obj[field]);
  }

  // 兜底: 格式化显示关键字段
  const entries = Object.entries(obj).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return entries
    .slice(0, 5)
    .map(([k, v]) => {
      const val = typeof v === "string" ? v : JSON.stringify(v);
      return `${k}: ${val.length > 100 ? val.substring(0, 100) + "..." : val}`;
    })
    .join("\n");
}

/**
 * 格式化工具输出为人类可读文本
 */
function formatOutput(output: string): string {
  if (!output) return "";

  try {
    const parsed = JSON.parse(output);
    if (typeof parsed === "string") return parsed;
    if (parsed.content) return String(parsed.content);
    if (parsed.result) return String(parsed.result);
    if (parsed.response) return String(parsed.response);
    if (parsed.summary) return String(parsed.summary);
    // 对象/数组格式化
    const formatted = JSON.stringify(parsed, null, 2);
    return formatted.length > 500
      ? formatted.substring(0, 500) + "\n..."
      : formatted;
  } catch {
    // 纯文本
    return output.length > 500 ? output.substring(0, 500) + "..." : output;
  }
}
