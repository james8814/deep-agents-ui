"use client";

import React, { useMemo, useState, useEffect } from "react";
import { ListTodo, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoItem } from "@/app/types/types";

/**
 * PanelProgressHeader - v5.27 简化版进度头部
 *
 * 从 v5.26 的 7 元素简化为 4 元素:
 * 1. 任务图标 + 名称 (合并)
 * 2. 任务状态 (带颜色过渡动画)
 * 3. 进度条 (渐变填充)
 * 4. 耗时 (可选)
 *
 * 移除: OPDCA 阶段徽章 (用户心智负担)
 */

interface PanelProgressHeaderProps {
  todos: TodoItem[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  startTime?: number;
}

// 状态文案映射
const STATUS_LABELS: Record<TodoItem["status"], string> = {
  pending: "待处理",
  in_progress: "进行中",
  completed: "已完成",
};

// 状态颜色类名 (CSS 变量)
const STATUS_COLORS: Record<TodoItem["status"], string> = {
  pending: "text-[var(--t4)]",
  in_progress: "text-[var(--brand)]",
  completed: "text-[var(--ok)]",
};

export const PanelProgressHeader = React.memo<PanelProgressHeaderProps>(
  ({ todos, collapsed = false, onToggleCollapse, startTime }) => {
    // 计算当前进行中的任务
    const currentTask = useMemo(() => {
      return todos.find((t) => t.status === "in_progress") || todos[0];
    }, [todos]);

    // 计算进度百分比
    const progress = useMemo(() => {
      if (todos.length === 0) return 0;
      const completed = todos.filter((t) => t.status === "completed").length;
      return Math.round((completed / todos.length) * 100);
    }, [todos]);

    // 耗时实时更新 (每秒刷新)
    const [elapsedTime, setElapsedTime] = useState<string | null>(null);

    useEffect(() => {
      if (!startTime) {
        setElapsedTime(null);
        return;
      }

      const updateElapsedTime = () => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        if (seconds < 60) {
          setElapsedTime(`${seconds}s`);
        } else {
          const minutes = Math.floor(seconds / 60);
          if (minutes < 60) {
            setElapsedTime(`${minutes}m`);
          } else {
            const hours = Math.floor(minutes / 60);
            setElapsedTime(`${hours}h ${minutes % 60}m`);
          }
        }
      };

      // 立即更新一次
      updateElapsedTime();

      // 每秒更新
      const interval = setInterval(updateElapsedTime, 1000);

      return () => clearInterval(interval);
    }, [startTime]);

    // 判断是否全部完成
    const allCompleted = todos.length > 0 && todos.every(t => t.status === 'completed');

    // 无任务时不显示
    if (!currentTask) return null;

    return (
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--b1)]">
        {/* 左侧: 任务图标 + 名称 */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ListTodo size={16} className="text-[var(--brand)] flex-shrink-0" />
          <span className="text-sm font-semibold text-[var(--t1)] truncate">
            {currentTask.content}
          </span>
        </div>

        {/* 分隔符 */}
        <span className="text-[var(--t4)] text-xs">·</span>

        {/* 状态 (带过渡动画) */}
        <span
          className={cn(
            "text-xs font-medium transition-colors duration-150 ease-out",
            STATUS_COLORS[currentTask.status]
          )}
          data-status={currentTask.status}
        >
          {STATUS_LABELS[currentTask.status]}
        </span>

        {/* 进度条 */}
        <div className="flex-1 max-w-[120px] h-[3px] bg-[var(--bg3)] rounded-[2px] overflow-hidden">
          <div
            className={cn(
              "h-full rounded-[2px] transition-all duration-250 ease-out",
              allCompleted
                ? "bg-gradient-to-r from-[var(--ok)] to-[#4ade80]"
                : "bg-gradient-to-r from-[var(--brand)] to-[var(--cyan)]"
            )}
            style={{ width: `${progress}%` }}
            data-status={allCompleted ? 'completed' : undefined}
          />
        </div>

        {/* 耗时 */}
        {elapsedTime && (
          <span className="text-xs text-[var(--t3)] tabular-nums">
            {elapsedTime}
          </span>
        )}

        {/* 收起/展开按钮 */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-[var(--r-sm)] hover:bg-[var(--bg3)] transition-colors"
            aria-label={collapsed ? "展开面板" : "收起面板"}
          >
            {collapsed ? (
              <ChevronDown size={16} className="text-[var(--t3)]" />
            ) : (
              <ChevronUp size={16} className="text-[var(--t3)]" />
            )}
          </button>
        )}
      </div>
    );
  }
);

PanelProgressHeader.displayName = "PanelProgressHeader";

export default PanelProgressHeader;
