"use client";

import React, { useRef, useState, useCallback } from "react";
import { ChevronDown, CheckCircle, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodoItem } from "@/app/types/types";

/**
 * TaskProgressPanel - v5.27 任务进度面板
 *
 * 设计规格:
 * - 任务数 ≥ 2 时显示面板
 * - 任务数 ≤ 1 时隐藏面板
 * - 点击标签高亮对应 Step Group + 滚动到视图
 * - 支持下拉菜单快速切换
 */

export type TaskStatus = "pending" | "in_progress" | "completed";

export interface TaskWithIndex extends TodoItem {
  index: number;
}

interface TaskProgressPanelProps {
  /** 任务列表 */
  tasks: TaskWithIndex[];
  /** 当前选中的任务 ID (null = 全部) */
  selectedTaskId: string | null;
  /** 选中任务回调 */
  onSelectTask: (taskId: string | null) => void;
}

// 状态图标组件
function TaskStatusIcon({ status }: { status: TaskStatus }) {
  switch (status) {
    case "completed":
      return (
        <CheckCircle
          size={12}
          className="text-[var(--ok)]"
        />
      );
    case "in_progress":
      return (
        <Clock
          size={12}
          className="animate-pulse text-[var(--brand)]"
        />
      );
    case "pending":
    default:
      return (
        <Circle
          size={12}
          className="text-[var(--t4)]"
        />
      );
  }
}

export const TaskProgressPanel = React.memo<TaskProgressPanelProps>(
  ({ tasks, selectedTaskId, onSelectTask }) => {
    // 设计规格: 任务数 ≤ 1 时隐藏面板
    if (tasks.length <= 1) {
      return null;
    }

    return (
      <div className="flex items-center gap-1.5 border-b border-[var(--b1)] bg-[var(--bg1)] px-4 py-2">
        {/* 下拉菜单 */}
        <TaskFilterDropdown
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelect={onSelectTask}
        />

        {/* 分隔符 */}
        <span className="mx-1 text-xs text-[var(--t4)]">|</span>

        {/* 任务标签列表 */}
        <div className="scrollbar-none flex items-center gap-1 overflow-x-auto">
          {tasks.filter(task => task && task.id).map((task, index) => {
            // 🔧 修复 React key prop 错误: 使用组合 key 确保唯一性
            const key = task.id || `task-${index}-${task.content?.substring(0, 10) || 'unknown'}`;

            return (
              <TaskFilterTag
                key={key}
                task={task}
                isSelected={selectedTaskId === task.id}
                onClick={() => onSelectTask(task.id)}
              />
            );
          })}
        </div>
      </div>
    );
  }
);

TaskProgressPanel.displayName = "TaskProgressPanel";

// --- 子组件 ---

interface TaskFilterDropdownProps {
  tasks: TaskWithIndex[];
  selectedTaskId: string | null;
  onSelect: (taskId: string | null) => void;
}

function TaskFilterDropdown({
  tasks,
  selectedTaskId,
  onSelect,
}: TaskFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const label = selectedTask ? selectedTask.content : "全部";

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // 在函数内部定义 allOptions，避免作为 useCallback 依赖
      const allOptions = [
        { id: null, content: "全部", status: null },
        ...tasks.map((t) => ({ id: t.id, content: t.content, status: t.status })),
      ];

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setIsOpen(true);
          setFocusedIndex((prev) => Math.min(prev + 1, allOptions.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (isOpen && focusedIndex >= 0) {
            onSelect(allOptions[focusedIndex].id);
            setIsOpen(false);
            buttonRef.current?.focus();
          } else {
            setIsOpen(true);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
      }
    },
    [isOpen, focusedIndex, onSelect, tasks]
  );

  // 选择选项
  const handleSelect = useCallback(
    (taskId: string | null) => {
      onSelect(taskId);
      setIsOpen(false);
      buttonRef.current?.focus();
    },
    [onSelect]
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        className={cn(
          "flex items-center gap-1 rounded-[var(--r-sm)] px-2 py-1",
          "text-xs font-medium transition-colors",
          "hover:bg-[var(--bg3)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-opacity-50",
          selectedTaskId ? "text-[var(--t1)]" : "text-[var(--t3)]"
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="筛选任务"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      >
        <span className="max-w-[80px] truncate">{label}</span>
        <ChevronDown
          size={12}
          className={cn(
            "text-[var(--t4)] transition-transform duration-150",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* 下拉菜单 */}
      <div
        ref={listRef}
        className={cn(
          "absolute left-0 top-full z-[var(--z-dropdown)] mt-1",
          "min-w-[140px] py-1",
          "rounded-[var(--r-md)] border border-[var(--b1)] bg-[var(--bg2)]",
          "shadow-[var(--shadow-lg)]",
          "transition-all duration-150 ease-out",
          isOpen
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-1 opacity-0"
        )}
        role="listbox"
        aria-activedescendant={
          focusedIndex >= 0 ? `option-${focusedIndex}` : undefined
        }
      >
        {/* 全部选项 */}
        <button
          id="option-0"
          onClick={() => handleSelect(null)}
          className={cn(
            "w-full px-3 py-1.5 text-left text-xs",
            "transition-colors",
            focusedIndex === 0 && "bg-[var(--bg3)]",
            "hover:bg-[var(--bg3)]",
            !selectedTaskId
              ? "font-medium text-[var(--brand)]"
              : "text-[var(--t2)]"
          )}
          role="option"
          aria-selected={!selectedTaskId}
        >
          全部
        </button>

        {/* 分隔线 */}
        <div className="my-1 border-t border-[var(--b1)]" />

        {/* 任务列表 */}
        {tasks.filter(task => task && task.id).map((task, index) => {
          // 🔧 修复 React key prop 错误: 使用组合 key 确保唯一性
          const key = task.id || `task-${index}-${task.content?.substring(0, 10) || 'unknown'}`;

          return (
            <button
              key={key}
              id={`option-${index + 1}`}
              onClick={() => handleSelect(task.id)}
              className={cn(
                "w-full px-3 py-1.5 text-left text-xs",
                "transition-colors",
                focusedIndex === index + 1 && "bg-[var(--bg3)]",
                "hover:bg-[var(--bg3)]",
                "flex items-center gap-2",
                selectedTaskId === task.id
                  ? "font-medium text-[var(--brand)]"
                  : "text-[var(--t2)]"
              )}
              role="option"
              aria-selected={selectedTaskId === task.id}
            >
              <TaskStatusIcon status={task.status} />
              <span className="flex-1 truncate">{task.content}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface TaskFilterTagProps {
  task: TaskWithIndex;
  isSelected: boolean;
  onClick: () => void;
}

function TaskFilterTag({ task, isSelected, onClick }: TaskFilterTagProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-[var(--r-sm)] px-2 py-1",
        "text-xs font-medium transition-all duration-150 ease-out",
        "border border-transparent",
        "hover:bg-[var(--bg3)]",
        "focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-opacity-50",
        isSelected
          ? "border-[var(--brand)] bg-[var(--brand-glow-10)] text-[var(--brand)]"
          : "text-[var(--t3)]"
      )}
      aria-pressed={isSelected}
      aria-label={`筛选任务: ${task.content}`}
    >
      <TaskStatusIcon status={task.status} />
      <span className="max-w-[100px] truncate">{task.content}</span>
    </button>
  );
}

export default TaskProgressPanel;
