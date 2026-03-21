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
 * 设计基准：v5.26_RIGHT_SIDEBAR_DESIGN_FINAL_V2.md Section 2.2
 * 检测逻辑：
 * - todos.length >= 2 → 工作模式
 * - subagent_logs.keys().length > 0 → 工作模式
 * - files.keys().length >= 1 → 工作模式
 * - 否则 → 聊天模式
 *
 * @param todos - 任务列表
 * @param files - 文件交付物
 * @param subagentLogs - 子代理日志
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

export interface UsePanelModeInput {
  /** 任务列表 */
  todos: TodoItem[];
  /** 文件交付物 */
  files?: Record<string, unknown>;
  /** 子代理日志 */
  subagentLogs?: Record<string, unknown>;
}

export function usePanelMode({ todos, files = {}, subagentLogs = {} }: UsePanelModeInput): UsePanelModeReturn {
  return useMemo(() => {
    // 设计基准 Section 2.2 模式检测规则
    const isWorkMode =
      todos.length >= 2 ||
      Object.keys(subagentLogs).length > 0 ||
      Object.keys(files).length >= 1;

    const mode: PanelMode = isWorkMode ? "work" : "chat";
    const hasTasks = isWorkMode;
    const taskCount = todos.length;

    const inProgressCount = todos.filter(
      (t) => t.status === "in_progress"
    ).length;
    const completedCount = todos.filter((t) => t.status === "completed").length;

    return {
      mode,
      hasTasks,
      taskCount,
      inProgressCount,
      completedCount,
    };
  }, [todos, files, subagentLogs]);
}

export default usePanelMode;
