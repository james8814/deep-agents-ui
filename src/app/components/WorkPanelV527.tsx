"use client";

import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatContext } from "@/providers/ChatProvider";
import type { LogEntry } from "@/app/types/subagent";
import { Loader2 } from "lucide-react";

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
  /** 面板是否可见 (用于自动滚动重置) */
  isVisible?: boolean;
}

export const WorkPanelV527 = React.memo<WorkPanelV527Props>(
  ({ onClose: _onClose, subagentLogs: externalSubagentLogs, isVisible = true }) => {
    const { todos, files = {}, isLoading, subagents, subagent_logs: contextSubagentLogs } = useChatContext();

    // 🔧 修复 Issue 1: 当 subagent_logs 更新时，通知自动滚动 hook
    // 注意：必须在组件顶部定义，确保在其他 useEffect 之前初始化
    const {
      containerRef: scrollContainerRef,
      autoScrollEnabled,
      newLogsCount,
      handleScroll,
      scrollToLatest,
      onNewLog,
    } = useAutoScrollControl({
      bottomThreshold: 50,
      behavior: "smooth",
      isVisible,
    });

    // 🔧 调试日志：检查 subagent_logs 状态
    useEffect(() => {
      console.log('[WorkPanelV527] contextSubagentLogs:', contextSubagentLogs ? Object.keys(contextSubagentLogs).length + ' entries' : 'null/undefined');
      if (contextSubagentLogs) {
        Object.entries(contextSubagentLogs).forEach(([key, logs]) => {
          console.log(`[WorkPanelV527]   - ${key.substring(0, 12)}...: ${logs.length} logs`);
        });
      }
    }, [contextSubagentLogs]);

    // 优先使用 props，fallback 到 context（修复 ISSUE-003）
    // 🔧 修复：将 subagentLogs 包装在 useMemo 中，避免每次渲染都创建新对象
    const subagentLogs = useMemo(() =>
      externalSubagentLogs ?? contextSubagentLogs ?? {},
      [externalSubagentLogs, contextSubagentLogs]
    );

    // 🔧 修复 Issue 1: 当 subagent_logs 更新时，通知自动滚动 hook
    const prevLogsCountRef = useRef<number>(0);

    useEffect(() => {
      // 计算当前日志总数
      const totalLogs = Object.values(subagentLogs).reduce((sum, logs) => sum + logs.length, 0);
      const prevCount = prevLogsCountRef.current;

      // 如果有新日志，通知滚动 hook
      if (totalLogs > prevCount && totalLogs > 0) {
        onNewLog();
      }

      prevLogsCountRef.current = totalLogs;
    }, [subagentLogs, onNewLog]);

    // 提取当前执行信息
    const currentExecutionInfo = useMemo(() => {
      if (!isLoading || !contextSubagentLogs) return { step: null, tool: null };

      // 从 subagent_logs 中提取当前工具
      const logEntries = Object.values(contextSubagentLogs).flat();
      const latestToolCall = logEntries.find(entry => entry.type === 'tool_call');

      return {
        step: null,
        tool: latestToolCall?.tool_name || null,
      };
    }, [isLoading, contextSubagentLogs]);

    // 🔧 修复无限循环：移除组件体内的 console.log
    // 原因：console.log 在组件体内会在每次渲染时执行
    // 如需调试，使用 React DevTools 或 useEffect

    // 模式检测（设计基准 Section 2.2）
    const { mode } = usePanelMode({ todos, files, subagentLogs });

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

    // 面板级别折叠状态 (用于 Progress Header 的收起/展开按钮)
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

    // 滚动到高亮
    const { scrollToTask, containerRef: highlightContainerRef } =
      useScrollToHighlight({
        behavior: "smooth",
        offset: -20,
      });

    // 按任务 ID 分组日志
    // 说明：subagent_logs 的 key 是 tool_call_id，每个 tool_call 对应一个 SubAgent 执行
    // 由于后端未提供 task_id → tool_call_id 的映射关系，我们采用简化策略：
    // 1. 如果有 subagents 状态，尝试通过 subagent 的 taskToolCallId 建立映射
    // 2. 否则将所有日志合并，按时间顺序显示
    const logsByTaskId = useMemo(() => {
      const result: Record<string, LogEntry[]> = {};

      // 方案 1: 尝试通过 subagents 状态建立映射
      // subagents 结构：{ [subagentId]: { id, name, taskToolCallId?, logs? } }
      if (subagents && Object.keys(subagents).length > 0) {
        // 遍历 subagents，尝试提取日志
        Object.values(subagents).forEach((subagent: any) => {
          const toolCallId = subagent.id || subagent.toolCallId;
          if (toolCallId && subagentLogs[toolCallId]) {
            // 如果 subagent 有 taskToolCallId，尝试建立与 todo 的关联
            const taskToolCallId = subagent.taskToolCallId;
            if (taskToolCallId) {
              result[taskToolCallId] = [
                ...(result[taskToolCallId] || []),
                ...subagentLogs[toolCallId],
              ];
            } else {
              // 否则使用 subagent id 作为 key
              result[toolCallId] = subagentLogs[toolCallId];
            }
          }
        });
      }

      // 方案 2: 如果 subagents 为空，直接使用 subagent_logs 的所有日志
      // 按 tool_call_id 分组，每个 tool_call_id 对应一个 SubAgent 执行
      if (Object.keys(result).length === 0 && subagentLogs) {
        // 将日志按 tool_call_id 分组
        Object.entries(subagentLogs).forEach(([toolCallId, logs]) => {
          result[toolCallId] = logs;
        });
      }

      return result;
    }, [subagentLogs, subagents]);

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
        {/* Execution Status Bar - 整合自 ChatInterface */}
        {isLoading && (
          <div className="flex h-9 items-center gap-3 border-b border-border bg-accent/50 px-4 py-2 text-sm">
            <Loader2
              size={14}
              className="animate-spin text-primary"
            />
            <div className="flex flex-1 items-center gap-2 truncate">
              <span className="font-medium text-foreground">
                {currentExecutionInfo.step || "Running agent"}
              </span>
              {currentExecutionInfo.tool && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {currentExecutionInfo.tool}
                  </span>
                </>
              )}
            </div>
            <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
              运行中...
            </span>
          </div>
        )}

        {/* Progress Header */}
        <PanelProgressHeader
          todos={todos}
          collapsed={isPanelCollapsed}
          onToggleCollapse={() => setIsPanelCollapsed((prev) => !prev)}
        />

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
            {(() => {
              // 🔧 修复 Issue 4: 当没有任务但有日志时，也应该显示日志
              // 检查是否有未映射到任务的日志
              const taskIds = new Set(tasksWithIndex.map(t => t.id));
              const unmappedLogs = Object.entries(logsByTaskId).filter(
                ([key]) => !taskIds.has(key)
              );

              // 筛选器逻辑：根据选中的任务过滤显示
              if (selectedTaskId === null) {
                // 选中"全部"，显示所有任务
                return (
                  <>
                    {/* 首先显示所有任务及其日志 */}
                    {tasksWithIndex.map((task) => (
                      <StepGroup
                        key={task.id}
                        taskId={task.id}
                        taskContent={task.content}
                        status={task.status}
                        logs={logsByTaskId[task.id] || []}
                        collapsed={isCollapsed(task.id, task.status === "in_progress")}
                        highlighted={false}
                        onToggleCollapse={handleToggleCollapse(task.id)}
                      />
                    ))}
                    {/* 然后显示未映射到任务的日志 */}
                    {unmappedLogs.map(([toolCallId, logs]) => (
                      <StepGroup
                        key={toolCallId}
                        taskId={toolCallId}
                        taskContent={`SubAgent 执行 (${toolCallId.substring(0, 8)}...)`}
                        status="completed"
                        logs={logs}
                        collapsed={false}
                        highlighted={false}
                        onToggleCollapse={() => {}}
                      />
                    ))}
                    {/* 如果既没有任务也没有日志，显示空状态 */}
                    {tasksWithIndex.length === 0 && unmappedLogs.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <p className="text-sm">暂无工作日志</p>
                        <p className="text-xs mt-1">开始对话以查看任务进度</p>
                      </div>
                    )}
                  </>
                );
              } else {
                // 选中特定任务，只显示该任务
                const task = tasksWithIndex.find((t) => t.id === selectedTaskId);
                if (task) {
                  return (
                    <StepGroup
                      key={task.id}
                      taskId={task.id}
                      taskContent={task.content}
                      status={task.status}
                      logs={logsByTaskId[task.id] || []}
                      collapsed={isCollapsed(task.id, task.status === "in_progress")}
                      highlighted
                      onToggleCollapse={handleToggleCollapse(task.id)}
                    />
                  );
                }
                return null;
              }
            })()}
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
