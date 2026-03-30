"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getToolDisplayName } from "@/app/utils/toolNames";

/**
 * Agent 执行状态指示器
 *
 * 显示当前 Agent 的执行状态和正在执行的工具名称
 */

interface AgentExecutionIndicatorProps {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 当前执行的工具名称（代码名称） */
  currentTool?: string;
  /** 已完成的工具数量 */
  completedTools?: number;
  /** 总工具数量 */
  totalTools?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * Agent 执行状态指示器组件
 *
 * 功能：
 * 1. 显示加载动画（isLoading=true 时）
 * 2. 显示当前执行的工具名称（可读的中文名称）
 * 3. 显示进度（已完成的工具数量 / 总工具数量）
 *
 * @example
 * <AgentExecutionIndicator
 *   isLoading={true}
 *   currentTool="search"
 *   completedTools={2}
 *   totalTools={5}
 * />
 */
export function AgentExecutionIndicator({
  isLoading,
  currentTool,
  completedTools,
  totalTools,
  className,
}: AgentExecutionIndicatorProps) {
  // 如果不在加载状态，不显示任何内容
  if (!isLoading) {
    return null;
  }

  // 获取可读的工具名称
  const toolDisplayName = currentTool
    ? getToolDisplayName(currentTool)
    : "正在思考";

  // 计算进度百分比
  const progress =
    completedTools !== undefined && totalTools !== undefined && totalTools > 0
      ? Math.round((completedTools / totalTools) * 100)
      : undefined;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label="Agent 执行状态"
    >
      {/* 加载动画 */}
      <Loader2 className="h-5 w-5 animate-spin text-primary" />

      {/* 状态文本 */}
      <div className="flex flex-col gap-1">
        {/* 主状态 */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {toolDisplayName}
          </span>

          {/* 进度指示 */}
          {progress !== undefined && (
            <span className="text-xs text-muted-foreground">
              ({completedTools}/{totalTools})
            </span>
          )}
        </div>

        {/* 进度条 */}
        {progress !== undefined && (
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 简化版执行指示器（仅显示加载动画和文本）
 *
 * @example
 * <SimpleExecutionIndicator isLoading={true} message="正在执行工具..." />
 */
export function SimpleExecutionIndicator({
  isLoading,
  message = "正在执行",
  className,
}: {
  isLoading: boolean;
  message?: string;
  className?: string;
}) {
  if (!isLoading) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm text-muted-foreground",
        className
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{message}</span>
    </div>
  );
}