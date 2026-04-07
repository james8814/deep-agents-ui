"use client";

import React, { useMemo, useCallback, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatContext } from "@/providers/ChatProvider";
import type { LogEntry } from "@/app/types/subagent";
import { pairedLogs } from "@/app/types/subagent";
import { TOOL_NAME_MAPPING } from "@/app/utils/toolNames";

// 方案 D 组件
import { TaskOverview } from "./TaskOverview";
import { LogCard } from "./LogCard";
import { ChatModeEmptyState } from "./ChatModeEmptyState";
import { ScrollToLatestButton } from "./ScrollToLatestButton";

// Hooks
import { usePanelMode } from "@/app/hooks/usePanelMode";
import { useAutoScrollControl } from "@/app/hooks/useAutoScrollControl";
import { Activity, Bot, Brain, Search, PenTool, FileCheck, Presentation, BarChart3, FileText } from "lucide-react";

// SubAgent 角色配置
const SUBAGENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  research_agent: { icon: Search, color: "text-blue-400", label: "研究代理" },
  writing_agent: { icon: PenTool, color: "text-green-400", label: "写作代理" },
  reflection_agent: { icon: FileCheck, color: "text-yellow-400", label: "反思代理" },
  analysis_agent: { icon: BarChart3, color: "text-purple-400", label: "分析代理" },
  design_agent: { icon: Brain, color: "text-pink-400", label: "设计代理" },
  document_agent: { icon: FileText, color: "text-cyan-400", label: "文档代理" },
  presentation_designer_agent: { icon: Presentation, color: "text-orange-400", label: "演示文稿设计代理" },
  deep_research_agent: { icon: Search, color: "text-indigo-400", label: "深度研究代理" },
};

function getAgentConfig(type: string) {
  return SUBAGENT_CONFIG[type] || { icon: Bot, color: "text-muted-foreground", label: TOOL_NAME_MAPPING[type]?.displayName || type };
}

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
  /** SubAgent 实时进度日志（custom 事件驱动，键为 subagent_type） */
  realtimeSubagentLogs?: Record<string, Array<{ type: string; tool_name?: string; content_preview?: string; step_type?: string }>>;
  isVisible?: boolean;
}

export const WorkPanelV527 = React.memo<WorkPanelV527Props>(
  ({ onClose: _onClose, subagentLogs: externalSubagentLogs, realtimeSubagentLogs, isVisible = true }) => {
    const {
      todos,
      files = {},
      isLoading,
      messages,
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

    // 日志数据源：持久化日志优先，执行中使用实时日志
    // 设计依据：LangGraph 并行 tool call 由 asyncio.gather 收集，
    // 所有并行 SubAgent 的 persistent logs 在同一个 values 事件中一次性到达，
    // 不存在"A 完成有 persistent、B 未完成只有 realtime"的中间状态。
    const subagentLogs = useMemo(() => {
      const persistent = externalSubagentLogs ?? contextSubagentLogs ?? {};
      if (Object.keys(persistent).length > 0) return persistent;

      // SubAgent 执行中：将实时日志转换为 LogEntry 格式
      // 使用与左侧 ChatMessage SubAgent 展开面板相同的精密配对逻辑
      if (!realtimeSubagentLogs || Object.keys(realtimeSubagentLogs).length === 0) return {};
      const result: Record<string, LogEntry[]> = {};
      for (const [key, events] of Object.entries(realtimeSubagentLogs)) {
        const logs: LogEntry[] = [];
        let currentId: string | null = null;
        let counter = 0;

        for (const e of events) {
          if (e.step_type === "tool_call") {
            // 新的工具调用 — 创建 call entry
            counter += 1;
            currentId = `rt_${key}:${counter}`;
            logs.push({
              type: "tool_call",
              tool_name: e.tool_name,
              tool_call_id: currentId,
            });
            continue;
          }

          // tool_result 或 progress — 确保有对应的 call entry
          if (!currentId) {
            counter += 1;
            currentId = `rt_${key}:${counter}`;
            logs.push({
              type: "tool_call",
              tool_name: e.tool_name || e.step_type || "progress",
              tool_call_id: currentId,
            });
          }

          logs.push({
            type: "tool_result",
            tool_name: e.tool_name,
            tool_output: e.content_preview,
            tool_call_id: currentId,
            status: "success",
          });
        }
        if (logs.length > 0) result[`realtime_${key}`] = logs;
      }
      return result;
    }, [externalSubagentLogs, contextSubagentLogs, realtimeSubagentLogs]);

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

    // 按 SubAgent 分组：每个 key 独立配对
    const groupedLogs = useMemo(() => {
      const groups: Array<{
        agentType: string;
        taskDescription?: string;
        status: "pending" | "running" | "completed";
        pairs: Array<{ call: LogEntry; result?: LogEntry }>;
      }> = [];

      // 从 messages 提取 task toolCalls 的顺序和描述
      const taskOrder: Array<{ subagentType: string; description: string; status: string }> = [];
      for (const msg of messages) {
        const tc = (msg as any).tool_calls || [];
        for (const t of tc) {
          if (t.name === "task" && t.args?.subagent_type) {
            taskOrder.push({
              subagentType: t.args.subagent_type,
              description: typeof t.args.description === "string" ? t.args.description.slice(0, 120) : "",
              status: t.status || "completed",
            });
          }
        }
      }

      // 按 subagentLogs 的 key 分组配对
      for (const [key, logs] of Object.entries(subagentLogs)) {
        const agentType = key.replace(/^realtime_/, "");
        const pairs = pairedLogs(logs);
        if (pairs.length === 0) continue;

        // 匹配 task 描述
        const matchingTask = taskOrder.find((t) => t.subagentType === agentType);
        const hasRunningStep = pairs.some((p) => !p.result);

        groups.push({
          agentType,
          taskDescription: matchingTask?.description,
          status: hasRunningStep ? "running" : "completed",
          pairs,
        });
      }

      // 补充已分派但尚无日志的 SubAgent（pending 状态）
      for (const task of taskOrder) {
        if (!groups.some((g) => g.agentType === task.subagentType) && task.status !== "completed") {
          groups.push({
            agentType: task.subagentType,
            taskDescription: task.description,
            status: "pending",
            pairs: [],
          });
        }
      }

      return groups;
    }, [subagentLogs, messages]);

    // 向后兼容：扁平列表用于模式检测
    const pairedLogCards = useMemo(() => {
      return groupedLogs.flatMap((g) => g.pairs);
    }, [groupedLogs]);

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
          {groupedLogs.length > 0 ? (
            <div className="space-y-1 p-3">
              {groupedLogs.map((group, gi) => {
                const config = getAgentConfig(group.agentType);
                const Icon = config.icon;
                const statusLabel = group.status === "running" ? "执行中" : group.status === "pending" ? "等待中" : "已完成";
                const statusColor = group.status === "running" ? "text-blue-400" : group.status === "pending" ? "text-muted-foreground" : "text-green-400";
                return (
                  <div key={`group-${gi}-${group.agentType}`}>
                    {/* SubAgent 分组头 */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg border border-border/30 bg-muted/40 px-3 py-2 backdrop-blur-sm">
                      <Icon size={16} className={config.color} />
                      <span className="flex-1 truncate text-xs font-semibold">{config.label}</span>
                      <span className={`text-[10px] font-medium ${statusColor}`}>{statusLabel}</span>
                    </div>
                    {/* 任务描述 */}
                    {group.taskDescription && (
                      <div className="mx-3 mt-1 mb-1.5 rounded border-l-2 border-primary/30 bg-primary/5 px-2.5 py-1.5">
                        <p className="line-clamp-2 text-[11px] text-muted-foreground">{group.taskDescription}</p>
                      </div>
                    )}
                    {/* 工具步骤 */}
                    {group.pairs.length > 0 ? (
                      <div className="mb-3 space-y-1.5 pl-2">
                        {group.pairs.map((pair, pi) => (
                          <LogCard
                            key={pair.call.tool_call_id || `log-${gi}-${pi}`}
                            call={pair.call}
                            result={pair.result}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="mb-3 flex items-center gap-2 px-3 py-2">
                        <Activity size={12} className="animate-spin text-muted-foreground/50" />
                        <span className="text-[11px] text-muted-foreground">等待执行...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
              <Activity size={28} className="mb-3 text-muted-foreground/50" strokeWidth={1.5} />
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
