"use client";

import React from "react";
import { ChevronDown, CheckCircle, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@/app/types/subagent";
import type { TodoItem } from "@/app/types/types";
import { useRelativeTime } from "@/app/hooks/useRelativeTime";

/**
 * StepGroup - v5.27 工作日志按任务分组组件
 *
 * 设计规格:
 * - 按任务分组显示日志
 * - 支持折叠/展开 (250ms Grid 过渡动画)
 * - 支持高亮状态 (左边框 + 背景渐变)
 * - 折叠状态记忆到 localStorage
 * - 100% 复用现有 ToolCard 组件
 *
 * 交互行为:
 * - 点击头部: 切换折叠/展开
 * - 高亮模式: 左边框 3px + 背景渐变 + 脉冲动画
 */

export type StepGroupStatus = TodoItem["status"];

interface StepGroupProps {
  /** 任务 ID (用于 data-task-id 属性) */
  taskId: string;
  /** 任务内容 (显示在头部) */
  taskContent: string;
  /** 任务状态 */
  status: StepGroupStatus;
  /** 日志条目列表 */
  logs: LogEntry[];
  /** 任务开始时间 (用于显示相对时间) */
  startTime?: number | Date | null;
  /** 是否折叠 */
  collapsed?: boolean;
  /** 是否高亮 */
  highlighted?: boolean;
  /** 折叠状态切换回调 */
  onToggleCollapse?: () => void;
  /** 自定义类名 */
  className?: string;
}

// 状态配置
const STATUS_CONFIG: Record<
  StepGroupStatus,
  { icon: React.ReactNode; label: string }
> = {
  completed: {
    icon: (
      <CheckCircle
        size={14}
        className="text-[var(--ok)]"
      />
    ),
    label: "已完成",
  },
  in_progress: {
    icon: (
      <Clock
        size={14}
        className="animate-pulse text-[var(--brand)]"
      />
    ),
    label: "进行中",
  },
  pending: {
    icon: (
      <Circle
        size={14}
        className="text-[var(--t4)]"
      />
    ),
    label: "待处理",
  },
};

export const StepGroup = React.memo<StepGroupProps>(
  ({
    taskId,
    taskContent,
    status,
    logs,
    startTime,
    collapsed = false,
    highlighted = false,
    onToggleCollapse,
    className,
  }) => {
    const config = STATUS_CONFIG[status];
    const logCount = logs.length;

    // 相对时间显示
    const relativeTime = useRelativeTime(startTime ?? null);

    return (
      <div
        data-task-id={taskId}
        className={cn(
          "relative rounded-[var(--r-md)] transition-all duration-200 ease-out",
          highlighted ? "step-group--highlighted" : "step-group",
          className
        )}
      >
        {/* 头部 */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2.5",
            "rounded-[var(--r-md)]",
            "transition-colors duration-150 ease-out hover:bg-[var(--bg3)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-opacity-50"
          )}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "展开" : "折叠"}任务: ${taskContent}`}
        >
          {/* 折叠图标 */}
          <ChevronDown
            size={14}
            className={cn(
              "step-group__chevron text-[var(--t4)] transition-transform duration-200 ease-out",
              collapsed && "step-group--collapsed"
            )}
          />

          {/* 状态图标 */}
          {config.icon}

          {/* 任务名称 */}
          <span className="flex-1 truncate text-left text-sm font-medium text-[var(--t1)]">
            {taskContent}
          </span>

          {/* 元信息 */}
          <div className="flex items-center gap-2 text-xs text-[var(--t4)]">
            <span>{relativeTime}</span>
            {logCount > 0 && (
              <span className="text-[var(--t3)]">{logCount} 条日志</span>
            )}
          </div>
        </button>

        {/* 内容区 (折叠动画) */}
        <div
          className={cn(
            "step-group__content",
            collapsed && "step-group--collapsed"
          )}
        >
          <div className="step-group__content-inner">
            {/* 日志列表 */}
            {logCount > 0 && (
              <div className="space-y-2 px-3 pb-3">
                {logs.map((log, index) => {
                  // 为 tool_call 和 tool_result 生成唯一的 key
                  // 格式：tool_call_id-type-index（避免配对的 tool_call/tool_result 有相同的 key）
                  const keyId = log.tool_call_id
                    ? `${log.tool_call_id}-${log.type}-${index}`
                    : `log-${index}`;
                  return (
                    <LogEntryRow
                      key={keyId}
                      log={log}
                      index={index}
                    />
                  );
                })}
              </div>
            )}

            {/* 空状态 */}
            {logCount === 0 && (
              <div className="px-3 pb-3 text-center text-xs text-[var(--t4)]">
                暂无日志
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

StepGroup.displayName = "StepGroup";

// --- 子组件: 日志条目行 ---

interface LogEntryRowProps {
  log: LogEntry;
  index: number;
}

const LogEntryRow = React.memo<LogEntryRowProps>(({ log, index }) => {
  const toolName = log.tool_name || "unknown";

  // 使用智能文本提取
  const displayText = extractTextContent(
    toolName,
    log.tool_input,
    log.tool_output,
    80
  );

  return (
    <div className="flex items-start gap-2 py-1.5 text-xs">
      {/* 序号 */}
      <span className="w-5 flex-shrink-0 text-right text-[var(--t4)]">
        {index + 1}.
      </span>

      {/* 工具名称 */}
      <span className="flex-shrink-0 font-medium text-[var(--brand)]">
        {toolName}
      </span>

      {/* 智能解析后的文本内容 */}
      {displayText && (
        <span className="flex-1 truncate text-[var(--t3)]">
          {displayText}
        </span>
      )}

      {/* 状态图标 */}
      {log.status === "success" && (
        <CheckCircle
          size={12}
          className="flex-shrink-0 text-[var(--ok)]"
        />
      )}
      {log.status === "error" && (
        <span className="flex-shrink-0 text-[var(--err)]">✕</span>
      )}
    </div>
  );
});

LogEntryRow.displayName = "LogEntryRow";

// --- 工具函数 ---

/**
 * 智能解析工具输入/输出，提取纯文本内容
 *
 * 处理以下场景:
 * - write_todos: 提取 todos 列表内容
 * - think_tool: 提取 reflection 内容
 * - write_file: 提取 file_path 和内容摘要
 * - read_file: 提取 file_path 和读取范围
 * - 其他: 提取关键字段
 * - JSON 字符串: 自动解析后再提取
 */
function extractTextContent(
  toolName: string,
  toolInput?: Record<string, unknown> | string | unknown[],
  toolOutput?: string,
  maxLength = 80
): string {
  // 0. 如果 toolInput 是字符串，尝试解析为 JSON 对象或数组
  let inputObj: Record<string, unknown> | unknown[] | undefined;
  if (typeof toolInput === "string") {
    try {
      inputObj = JSON.parse(toolInput);
    } catch {
      // 不是有效 JSON，直接截断显示
      return truncateText(toolInput, maxLength);
    }
  } else {
    inputObj = toolInput as Record<string, unknown> | unknown[] | undefined;
  }

  // 0a. 如果解析后是数组，直接处理（如 search 工具的 queries 数组）
  if (Array.isArray(inputObj)) {
    if (toolName === "search") {
      // search 工具的数组直接是查询列表
      return truncateText(inputObj.join(", "), maxLength);
    }
    // 其他工具的数组，尝试连接为字符串
    const joined = inputObj.map(item => String(item)).join(", ");
    return truncateText(joined, maxLength);
  }

  // 1. 如果有 tool_output，优先使用输出内容（通常是结果文本）
  if (toolOutput) {
    try {
      // 尝试解析 JSON 输出
      const parsed = JSON.parse(toolOutput);
      if (typeof parsed === "string") {
        return truncateText(parsed, maxLength);
      }
      if (parsed.content) {
        return truncateText(parsed.content, maxLength);
      }
      if (parsed.result) {
        return truncateText(parsed.result, maxLength);
      }
      if (parsed.response) {
        return truncateText(parsed.response, maxLength);
      }
      if (parsed.summary) {
        return truncateText(parsed.summary, maxLength);
      }
    } catch {
      // 不是 JSON，直接使用文本
      return truncateText(toolOutput, maxLength);
    }
  }

  // 2. 解析 tool_input，提取关键信息
  if (!inputObj) return "";

  // write_todos - 提取 todos 内容列表
  if (toolName === "write_todos" && inputObj.todos) {
    const todos = inputObj.todos as Array<{ content?: string; status?: string }>;
    const contents = todos.map(t => t.content).filter(Boolean).join(", ");
    return contents ? `更新任务: ${contents}` : "";
  }

  // think_tool - 提取 reflection 内容
  if (toolName === "think_tool" && inputObj.reflection) {
    return truncateText(inputObj.reflection as string, maxLength);
  }

  // write_file - 提取文件路径和内容摘要
  if (toolName === "write_file" && inputObj.file_path) {
    const filePath = inputObj.file_path as string;
    const content = inputObj.content as string;
    const preview = content ? `: ${truncateText(content, 40)}` : "";
    return `${filePath}${preview}`;
  }

  // read_file - 提取文件路径和读取范围
  if (toolName === "read_file" && inputObj.file_path) {
    const filePath = inputObj.file_path as string;
    const offset = inputObj.offset;
    const limit = inputObj.limit;
    if (offset !== undefined || limit !== undefined) {
      return `${filePath} [offset=${offset ?? 0}, limit=${limit ?? "all"}]`;
    }
    return filePath;
  }

  // task 工具 - 提取任务描述
  if (toolName === "task" && inputObj.description) {
    return truncateText(inputObj.description as string, maxLength);
  }

  // default_tool - 提取 description
  if (toolName === "default_tool" && inputObj.description) {
    return truncateText(inputObj.description as string, maxLength);
  }

  // search - 提取查询内容
  if (toolName === "search" && inputObj?.query) {
    return truncateText(inputObj.query as string, maxLength);
  }
  if (toolName === "search" && inputObj?.queries) {
    const queries = Array.isArray(inputObj.queries) ? inputObj.queries : [inputObj.queries];
    return truncateText(queries.join(", "), maxLength);
  }

  // fetch_content - 提取 URL 列表
  if (toolName === "fetch_content" && inputObj?.urls) {
    const urls = Array.isArray(inputObj.urls) ? inputObj.urls : [inputObj.urls];
    const urlPreview = urls.map((u: string) => u.split('/').slice(0, 3).join('/') + '...').join(", ");
    return `抓取：${urlPreview}`;
  }

  // subagent 工具 - 提取子代理任务
  if (toolName === "subagent" || toolName?.includes("subagent")) {
    if (inputObj?.description) {
      return truncateText(inputObj.description as string, maxLength);
    }
    if (inputObj?.instruction) {
      return truncateText(inputObj.instruction as string, maxLength);
    }
    if (inputObj?.task) {
      return truncateText(inputObj.task as string, maxLength);
    }
  }

  // 其他工具 - 尝试提取常见字段
  const commonFields = ["query", "text", "message", "command", "action", "name", "filename", "prompt", "content"];
  for (const field of commonFields) {
    if (inputObj[field]) {
      return truncateText(String(inputObj[field]), maxLength);
    }
  }

  // fallback: 提取前 3 个键值对
  const entries = Object.entries(inputObj).slice(0, 3);
  const summary = entries
    .map(([k, v]) => `${k}: ${truncateText(String(v), 20)}`)
    .join(", ");
  return summary || "[无参数]";
}

/**
 * 截断文本
 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export default StepGroup;
