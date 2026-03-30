"use client";

import React, { useMemo, useCallback, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatContext } from "@/providers/ChatProvider";
import type { LogEntry } from "@/app/types/subagent";
import { pairedLogs } from "@/app/types/subagent";

// 方案 D 组件
import { TaskOverview } from "./TaskOverview";
import { LogCard } from "./LogCard";
import { ChatModeEmptyState } from "./ChatModeEmptyState";
import { ScrollToLatestButton } from "./ScrollToLatestButton";

// Hooks
import { usePanelMode } from "@/app/hooks/usePanelMode";
import { useAutoScrollControl } from "@/app/hooks/useAutoScrollControl";
import { Activity } from "lucide-react";

/**
 * WorkPanelV527 — 方案 D 重构
 *
 * 两个独立区域:
 * 1. TaskOverview: 任务列表 + 进度条（可折叠）
 * 2. 执行日志: 全部 subagent_logs 按时间线展示为 LogCard
 *
 * Chat 模式: 无任务且无日志时显示空状态
 * Work 模式: 有任务或有日志时显示工作面板
 */

interface WorkPanelV527Props {
  onClose?: () => void;
  subagentLogs?: Record<string, LogEntry[]>;
  isVisible?: boolean;
}

export const WorkPanelV527 = React.memo<WorkPanelV527Props>(
  ({ onClose: _onClose, subagentLogs: externalSubagentLogs, isVisible = true }) => {
    const {
      todos,
      files = {},
      isLoading,
      subagent_logs: contextSubagentLogs,
    } = useChatContext();

    // 自动滚动
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

    // 日志数据源
    const subagentLogs = useMemo(
      () => externalSubagentLogs ?? contextSubagentLogs ?? {},
      [externalSubagentLogs, contextSubagentLogs]
    );

    // 日志更新时触发自动滚动
    const prevLogsCountRef = useRef<number>(0);
    useEffect(() => {
      const totalLogs = Object.values(subagentLogs).reduce(
        (sum, logs) => sum + logs.length,
        0
      );
      if (totalLogs > prevLogsCountRef.current && totalLogs > 0) {
        onNewLog();
      }
      prevLogsCountRef.current = totalLogs;
    }, [subagentLogs, onNewLog]);

    // 模式检测
    const { mode } = usePanelMode({ todos, files, subagentLogs });

    // 合并所有日志 → 配对 → 按时间线排列
    const pairedLogCards = useMemo(() => {
      const allLogs: LogEntry[] = Object.values(subagentLogs).flat();
      return pairedLogs(allLogs);
    }, [subagentLogs]);

    // Ref 赋值
    const setRef = useCallback(
      (el: HTMLDivElement | null) => {
        scrollContainerRef.current = el;
      },
      [scrollContainerRef]
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
        {/* 区域 1: 任务概览 */}
        {todos.length > 0 && <TaskOverview todos={todos} />}

        {/* 区域 2: 执行日志 */}
        <ScrollArea
          ref={setRef}
          onScroll={handleScroll}
          className="min-h-0 flex-1"
        >
          {pairedLogCards.length > 0 ? (
            <div className="space-y-2 p-3">
              {pairedLogCards.map((pair, index) => (
                <LogCard
                  key={pair.call.tool_call_id || `log-${index}`}
                  call={pair.call}
                  result={pair.result}
                />
              ))}
            </div>
          ) : (
            /* 空状态 — 有任务但无日志 */
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Activity
                size={28}
                className="mb-3 text-muted-foreground/50"
                strokeWidth={1.5}
              />
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Agent 正在工作，执行步骤将在此显示..."
                  : "开始对话后，Agent 的工作步骤将在此显示"}
              </p>
            </div>
          )}
        </ScrollArea>

        {/* 回到最新 */}
        {!autoScrollEnabled && (
          <ScrollToLatestButton
            onClick={scrollToLatest}
            newLogsCount={newLogsCount}
            hasNew={newLogsCount > 0}
          />
        )}
      </div>
    );
  }
);

WorkPanelV527.displayName = "WorkPanelV527";
export default WorkPanelV527;
