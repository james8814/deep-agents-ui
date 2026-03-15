"use client";

import { useState, useCallback, useMemo } from "react";
import type { TodoItem } from "@/app/types/types";

/**
 * useTaskSelection - 任务选中状态管理 Hook
 *
 * v5.27 任务进度面板专用
 * - 管理当前选中的任务 ID
 * - 提供选中/取消选中方法
 * - 计算当前进行中的任务 (默认选中)
 *
 * @param todos - 任务列表
 * @returns { selectedTaskId, setSelectedTaskId, selectTask, clearSelection, tasks }
 */

interface UseTaskSelectionOptions {
  /** 是否自动选中进行中的任务 */
  autoSelectInProgress?: boolean;
}

interface UseTaskSelectionReturn {
  /** 当前选中的任务 ID */
  selectedTaskId: string | null;
  /** 直接设置选中的任务 ID */
  setSelectedTaskId: (id: string | null) => void;
  /** 选中指定任务 */
  selectTask: (taskId: string) => void;
  /** 清除选中状态 (切换到"全部"模式) */
  clearSelection: () => void;
  /** 任务列表 (带序号) */
  tasks: (TodoItem & { index: number })[];
  /** 是否有多个任务 */
  hasMultipleTasks: boolean;
}

export function useTaskSelection(
  todos: TodoItem[],
  options: UseTaskSelectionOptions = {}
): UseTaskSelectionReturn {
  const { autoSelectInProgress = true } = options;

  // 选中的任务 ID
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 带序号的任务列表
  const tasks = useMemo(
    () => todos.map((todo, index) => ({ ...todo, index })),
    [todos]
  );

  // 是否有多个任务
  const hasMultipleTasks = todos.length >= 2;

  // 选中任务
  const selectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  // 清除选中
  const clearSelection = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  return {
    selectedTaskId,
    setSelectedTaskId,
    selectTask,
    clearSelection,
    tasks,
    hasMultipleTasks,
  };
}

/**
 * 获取任务状态图标
 */
export function getTaskStatusIcon(status: TodoItem["status"]): string {
  switch (status) {
    case "completed":
      return "✅";
    case "in_progress":
      return "●";
    case "pending":
    default:
      return "○";
  }
}

/**
 * 获取任务状态颜色类名
 */
export function getTaskStatusColor(status: TodoItem["status"]): string {
  switch (status) {
    case "completed":
      return "text-[var(--ok)]";
    case "in_progress":
      return "text-[var(--brand)]";
    case "pending":
    default:
      return "text-[var(--t4)]";
  }
}
