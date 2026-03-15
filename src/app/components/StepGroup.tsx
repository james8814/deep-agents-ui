"use client";

import React, { useMemo } from "react";
import { ChevronDown, CheckCircle, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@/app/types/subagent";
import type { TodoItem } from "@/app/types/types";

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
    icon: <CheckCircle size={14} className="text-[var(--ok)]" />,
    label: "已完成",
  },
  in_progress: {
    icon: <Clock size={14} className="text-[var(--brand)] animate-pulse" />,
    label: "进行中",
  },
  pending: {
    icon: <Circle size={14} className="text-[var(--t4)]" />,
    label: "待处理",
  },
};

export const StepGroup = React.memo<StepGroupProps>(
  ({
    taskId,
    taskContent,
    status,
    logs,
    collapsed = false,
    highlighted = false,
    onToggleCollapse,
    className,
  }) => {
    const config = STATUS_CONFIG[status];
    const logCount = logs.length;

    // 相对时间显示 (简化版)
    const relativeTime = useMemo(() => {
      return "刚刚"; // TODO: 实现真正的相对时间
    }, []);

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
            "w-full flex items-center gap-3 px-3 py-2.5",
            "rounded-[var(--r-md)]",
            "hover:bg-[var(--bg3)] transition-colors duration-150 ease-out",
            "focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-opacity-50"
          )}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? "展开" : "折叠"}任务: ${taskContent}`}
        >
          {/* 折叠图标 */}
          <ChevronDown
            size={14}
            className={cn(
              "text-[var(--t4)] transition-transform duration-200 ease-out step-group__chevron",
              collapsed && "step-group--collapsed"
            )}
          />

          {/* 状态图标 */}
          {config.icon}

          {/* 任务名称 */}
          <span className="flex-1 text-left text-sm font-medium text-[var(--t1)] truncate">
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
              <div className="px-3 pb-3 space-y-2">
                {logs.map((log, index) => (
                  <LogEntryRow
                    key={`${log.tool_call_id || index}`}
                    log={log}
                    index={index}
                  />
                ))}
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
  const isToolCall = log.type === "tool_call";
  const toolName = log.tool_name || "unknown";

  return (
    <div className="flex items-start gap-2 py-1.5 text-xs">
      {/* 序号 */}
      <span className="text-[var(--t4)] w-5 text-right flex-shrink-0">
        {index + 1}.
      </span>

      {/* 工具名称 */}
      <span className="text-[var(--brand)] font-medium flex-shrink-0">
        {toolName}
      </span>

      {/* 简短参数预览 */}
      {isToolCall && log.tool_input && (
        <span className="text-[var(--t3)] truncate flex-1">
          {truncateToolInput(log.tool_input)}
        </span>
      )}

      {/* 状态图标 */}
      {log.status === "success" && (
        <CheckCircle size={12} className="text-[var(--ok)] flex-shrink-0" />
      )}
      {log.status === "error" && (
        <span className="text-[var(--err)] flex-shrink-0">✕</span>
      )}
    </div>
  );
});

LogEntryRow.displayName = "LogEntryRow";

// --- 工具函数 ---

/**
 * 截断工具输入参数
 */
function truncateToolInput(
  input: Record<string, unknown>,
  maxLength = 60
): string {
  try {
    const str = JSON.stringify(input);
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + "...";
  } catch {
    return "[无法序列化]";
  }
}

export default StepGroup;
