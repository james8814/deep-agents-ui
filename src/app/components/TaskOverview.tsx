"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle, Clock, Circle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoItem } from "@/app/types/types";

/**
 * TaskOverview — 任务概览组件（方案 D）
 *
 * 简洁展示任务列表 + 进度条，可折叠。
 * 不嵌套日志，纯展示 todo 状态。
 */

interface TaskOverviewProps {
  todos: TodoItem[];
  className?: string;
}

const STATUS_ICON: Record<TodoItem["status"], React.ReactNode> = {
  completed: <CheckCircle size={14} className="flex-shrink-0 text-green-600 dark:text-green-400" />,
  in_progress: <Clock size={14} className="flex-shrink-0 animate-pulse text-primary" />,
  pending: <Circle size={14} className="flex-shrink-0 text-muted-foreground" />,
};

const STATUS_LABEL: Record<TodoItem["status"], string> = {
  completed: "已完成",
  in_progress: "进行中",
  pending: "待处理",
};

export const TaskOverview = React.memo<TaskOverviewProps>(
  ({ todos, className }) => {
    const [collapsed, setCollapsed] = useState(false);

    const { completedCount, progress } = useMemo(() => {
      if (todos.length === 0) return { completedCount: 0, progress: 0 };
      const done = todos.filter((t) => t.status === "completed").length;
      return { completedCount: done, progress: Math.round((done / todos.length) * 100) };
    }, [todos]);

    if (todos.length === 0) return null;

    return (
      <div className={cn("border-b border-border", className)}>
        {/* 头部 — 可折叠 */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "展开任务概览" : "收起任务概览"}
          className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-accent"
        >
          <ChevronDown
            size={14}
            className={cn(
              "flex-shrink-0 text-muted-foreground transition-transform duration-200",
              collapsed && "-rotate-90"
            )}
          />
          <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            任务概览
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {completedCount}/{todos.length}
          </span>
        </button>

        {/* 任务列表 — 折叠动画 */}
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out"
          style={{ gridTemplateRows: collapsed ? "0fr" : "1fr" }}
        >
          <div className="overflow-hidden">
            <div className="space-y-0.5 px-4 pb-3">
              {todos.map((todo, index) => (
                <div
                  key={`${todo.id}-${index}`}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5"
                >
                  {STATUS_ICON[todo.status]}
                  <span
                    className={cn(
                      "flex-1 truncate text-sm",
                      todo.status === "in_progress"
                        ? "font-medium text-foreground"
                        : todo.status === "completed"
                        ? "text-muted-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {todo.content}
                  </span>
                  <span className="flex-shrink-0 text-[11px] text-muted-foreground">
                    {STATUS_LABEL[todo.status]}
                  </span>
                </div>
              ))}

              {/* 进度条 */}
              <div className="mt-2 flex items-center gap-2 px-2">
                <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

TaskOverview.displayName = "TaskOverview";
