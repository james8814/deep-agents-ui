"use client";

import { useMemo } from "react";
import type { TodoItem } from "@/app/types/types";

/**
 * usePanelMode - 面板模式检测 Hook
 *
 * v5.27 右侧边栏模式切换
 * - chat: 聊天模式 (无任务)
 * - work: 工作模式 (有任务)
 *
 * @param todos - 任务列表
 * @returns { mode, hasTasks }
 */

export type PanelMode = "chat" | "work";

export interface UsePanelModeReturn {
  /** 当前模式 */
  mode: PanelMode;
  /** 是否有任务 */
  hasTasks: boolean;
  /** 任务数量 */
  taskCount: number;
  /** 进行中任务数量 */
  inProgressCount: number;
  /** 已完成任务数量 */
  completedCount: number;
}

export function usePanelMode(todos: TodoItem[]): UsePanelModeReturn {
  return useMemo(() => {
    const taskCount = todos.length;
    const hasTasks = taskCount > 0;
    const mode: PanelMode = hasTasks ? "work" : "chat";

    const inProgressCount = todos.filter(
      (t) => t.status === "in_progress"
    ).length;
    const completedCount = todos.filter(
      (t) => t.status === "completed"
    ).length;

    return {
      mode,
      hasTasks,
      taskCount,
      inProgressCount,
      completedCount,
    };
  }, [todos]);
}

export default usePanelMode;
