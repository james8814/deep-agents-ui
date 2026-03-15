"use client";

import React, { useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatContext } from "@/providers/ChatProvider";
import type { LogEntry } from "@/app/types/subagent";

// v5.27 Components
import { TaskProgressPanel, TaskWithIndex } from "./TaskProgressPanel";
import { StepGroup } from "./StepGroup";
import { ChatModeEmptyState } from "./ChatModeEmptyState";
import { ScrollToLatestButton } from "./ScrollToLatestButton";
import { PanelProgressHeader } from "./PanelProgressHeader";

// v5.27 Hooks
import { usePanelMode } from "@/app/hooks/usePanelMode";
import { useTaskSelection } from "@/app/hooks/useTaskSelection";
import { useCollapseState } from "@/app/hooks/useCollapseState";
import { useAutoScrollControl } from "@/app/hooks/useAutoScrollControl";
import { useScrollToHighlight } from "@/app/hooks/useScrollToHighlight";

/**
 * WorkPanelV527 - v5.27 右侧边栏工作面板
 *
 * 设计规格:
 * - 自动检测 chat/work 模式
 * - Work 模式: 显示 Progress Header + Task Progress Panel + Step Groups
 * - Chat 模式: 显示空状态
 * - 智能自动滚动控制
 * - 任务筛选高亮 (无数据过滤)
 */

interface WorkPanelV527Props {
  /** 关闭回调 (保留用于未来集成) */
  onClose?: () => void;
  /** 子代理日志 */
  subagentLogs?: Record<string, LogEntry[]>;
}

export const WorkPanelV527 = React.memo<WorkPanelV527Props>(
  ({ onClose: _onClose, subagentLogs = {} }) => {
    const { todos, isLoading } = useChatContext();

    // 模式检测
    const { mode } = usePanelMode(todos);

    // 任务选择状态
    const {
      selectedTaskId,
      selectTask,
      clearSelection,
      tasks: tasksFromSelection,
    } = useTaskSelection(todos, { autoSelectInProgress: false });

    // 类型转换: useTaskSelection 返回的是 TodoItem & { index: number }，与 TaskWithIndex 兼容
    const tasksWithIndex = tasksFromSelection as TaskWithIndex[];

    // 折叠状态
    const { isCollapsed, toggleCollapse } = useCollapseState({
      storageKeyPrefix: "work-panel-v527-",
    });

    // 自动滚动控制
    const {
      containerRef: scrollContainerRef,
      autoScrollEnabled,
      newLogsCount,
      handleScroll,
      scrollToLatest,
    } = useAutoScrollControl({
      bottomThreshold: 50,
      behavior: "smooth",
    });

    // 滚动到高亮
    const { scrollToTask, containerRef: highlightContainerRef } =
      useScrollToHighlight({
        behavior: "smooth",
        offset: -20,
      });

    // 按任务 ID 分组日志 (简化版 - 实际需要更复杂的映射逻辑)
    const logsByTaskId = useMemo(() => {
      const result: Record<string, LogEntry[]> = {};
      // TODO: 实现真实的 task_id -> log 映射
      // 目前 subagent_logs 使用 tool_call_id 作为 key
      // 需要通过 current_task_id 或其他方式建立映射
      return result;
    }, [subagentLogs]);

    // 处理任务选择
    const handleSelectTask = useCallback(
      (taskId: string | null) => {
        if (taskId === null) {
          clearSelection();
        } else {
          selectTask(taskId);
          // 滚动到高亮区域
          scrollToTask(taskId);
        }
      },
      [selectTask, clearSelection, scrollToTask]
    );

    // 处理折叠切换
    const handleToggleCollapse = useCallback(
      (taskId: string) => () => {
        toggleCollapse(taskId);
      },
      [toggleCollapse]
    );

    // 合并 refs
    const setRefs = useCallback(
      (el: HTMLDivElement | null) => {
        scrollContainerRef.current = el;
        highlightContainerRef.current = el;
      },
      [scrollContainerRef, highlightContainerRef]
    );

    // Chat 模式
    if (mode === "chat") {
      return (
        <div className="flex h-full flex-col">
          <ChatModeEmptyState />
        </div>
      );
    }

    // Work 模式
    return (
      <div className="flex h-full flex-col">
        {/* Progress Header */}
        <PanelProgressHeader todos={todos} />

        {/* Task Progress Panel (任务数 ≥ 2 时显示) */}
        <TaskProgressPanel
          tasks={tasksWithIndex}
          selectedTaskId={selectedTaskId}
          onSelectTask={handleSelectTask}
        />

        {/* Step Groups 容器 */}
        <ScrollArea
          ref={setRefs}
          onScroll={handleScroll}
          className="flex-1"
        >
          <div className="space-y-2 p-3">
            {tasksWithIndex.map((task) => (
              <StepGroup
                key={task.id}
                taskId={task.id}
                taskContent={task.content}
                status={task.status}
                logs={logsByTaskId[task.id] || []}
                collapsed={isCollapsed(task.id, task.status === "in_progress")}
                highlighted={selectedTaskId === task.id}
                onToggleCollapse={handleToggleCollapse(task.id)}
              />
            ))}
          </div>
        </ScrollArea>

        {/* 回到最新按钮 */}
        {!autoScrollEnabled && (
          <ScrollToLatestButton
            onClick={scrollToLatest}
            newLogsCount={newLogsCount}
            hasNew={newLogsCount > 0}
          />
        )}

        {/* Loading 指示器 */}
        {isLoading && (
          <div className="border-t border-[var(--b1)] px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-[var(--t3)]">
              <div className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand)]" />
              <span>处理中...</span>
            </div>
          </div>
        )}
      </div>
    );
  }
);

WorkPanelV527.displayName = "WorkPanelV527";

export default WorkPanelV527;
