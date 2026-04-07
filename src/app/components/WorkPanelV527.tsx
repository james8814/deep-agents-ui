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
import { Activity, Bot, Brain, Search, PenTool, FileCheck, Presentation, BarChart3, FileText, Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { getToolDisplayName } from "@/app/utils/toolNames";

// SubAgent 角色配置
const SUBAGENT_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  research_agent: { icon: Search, color: "text-blue-400", bgColor: "bg-blue-400/15", label: "研究代理" },
  writing_agent: { icon: PenTool, color: "text-green-400", bgColor: "bg-green-400/15", label: "写作代理" },
  reflection_agent: { icon: FileCheck, color: "text-yellow-400", bgColor: "bg-yellow-400/15", label: "反思代理" },
  analysis_agent: { icon: BarChart3, color: "text-purple-400", bgColor: "bg-purple-400/15", label: "分析代理" },
  design_agent: { icon: Brain, color: "text-pink-400", bgColor: "bg-pink-400/15", label: "设计代理" },
  document_agent: { icon: FileText, color: "text-cyan-400", bgColor: "bg-cyan-400/15", label: "文档代理" },
  presentation_designer_agent: { icon: Presentation, color: "text-orange-400", bgColor: "bg-orange-400/15", label: "演示文稿设计代理" },
  deep_research_agent: { icon: Search, color: "text-indigo-400", bgColor: "bg-indigo-400/15", label: "深度研究代理" },
};

function getAgentConfig(type: string) {
  return SUBAGENT_CONFIG[type] || { icon: Bot, color: "text-muted-foreground", bgColor: "bg-muted", label: TOOL_NAME_MAPPING[type]?.displayName || type };
}

// 工具步骤名称人性化
function humanizeToolName(raw: string | undefined): string {
  if (!raw) return "处理中";
  const display = getToolDisplayName(raw);
  if (display !== raw) return display;
  // 常见工具名直接映射
  const map: Record<string, string> = {
    progress: "准备中",
    deep_research: "深度研究",
    multi_source_research: "多源研究",
    think_tool: "思考分析",
    query_academic: "学术搜索",
    query_tech: "技术搜索",
    query_intelligence: "商业情报搜索",
    wikipedia_summary: "维基百科查询",
  };
  return map[raw] || raw;
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

    // Ref 赋值 — ScrollArea 的 ref 指向 Root，但实际滚动元素是内部 Viewport
    const setRef = useCallback(
      (el: HTMLDivElement | null) => {
        // 找到真正的滚动容器 (Radix Viewport)
        const viewport = el?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement | null;
        scrollContainerRef.current = viewport || el;
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
            <div className="space-y-5 overflow-hidden px-3 py-3">
              {groupedLogs.map((group, gi) => {
                const config = getAgentConfig(group.agentType);
                const Icon = config.icon;
                const StatusIcon = group.status === "running" ? Loader2 : group.status === "completed" ? CheckCircle2 : Activity;
                const statusColor = group.status === "running" ? "text-blue-400" : group.status === "pending" ? "text-muted-foreground" : "text-green-400";
                return (
                  <div key={`group-${gi}-${group.agentType}`}>
                    {/* ── 主 Agent 委派（右对齐气泡） ── */}
                    {group.taskDescription && (
                      <div className="mb-3 flex justify-end">
                        <div className="flex max-w-[88%] items-start gap-2">
                          <div className="min-w-0">
                            <p className="mb-1 text-right text-xs text-primary/70">产品教练</p>
                            <div className="overflow-hidden rounded-2xl rounded-tr-sm bg-primary/15 px-3.5 py-2.5">
                              <p className="break-words text-xs leading-relaxed text-foreground/90">
                                委派 <span className={`font-semibold ${config.color}`}>{config.label}</span> 执行任务
                              </p>
                              <p className="mt-1.5 line-clamp-3 break-words text-xs leading-relaxed text-foreground/60">{group.taskDescription}</p>
                            </div>
                          </div>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20">
                            <Sparkles size={14} className="text-primary" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── SubAgent 回复（左对齐气泡） ── */}
                    <div className="flex items-start gap-2">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                        <Icon size={14} className={config.color} />
                      </div>
                      <div className="min-w-0 max-w-[90%]">
                        <div className="mb-1 flex items-center gap-2">
                          <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                          <span className={`flex items-center gap-1 text-xs ${statusColor}`}>
                            <StatusIcon size={12} className={group.status === "running" ? "animate-spin" : ""} />
                            {group.status === "running" ? "工作中..." : group.status === "completed" ? "已完成" : "等待中"}
                          </span>
                        </div>
                        <div className="overflow-hidden rounded-2xl rounded-tl-sm border border-border/20 bg-muted/25 px-3.5 py-2.5">
                          {group.pairs.length > 0 ? (
                            <div className="space-y-1.5">
                              {group.pairs.map((pair, pi) => {
                                const toolName = humanizeToolName(pair.call.tool_name);
                                const hasResult = !!pair.result;
                                const isError = pair.result?.status === "error" || pair.result?.tool_output?.includes('"error"');
                                return (
                                  <div key={pair.call.tool_call_id || `s-${gi}-${pi}`}>
                                    <div className="flex items-center gap-2 py-0.5">
                                      {hasResult ? (
                                        isError ? (
                                          <span className="text-xs text-red-400">✗</span>
                                        ) : (
                                          <span className="text-xs text-green-400">✓</span>
                                        )
                                      ) : (
                                        <Loader2 size={12} className="animate-spin text-blue-400" />
                                      )}
                                      <span className="text-xs text-foreground/80">{toolName}</span>
                                    </div>
                                    {pair.result?.tool_output && (
                                      <p className="ml-5 line-clamp-2 break-all text-xs leading-relaxed text-muted-foreground/50">
                                        {pair.result.tool_output.slice(0, 150)}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Loader2 size={12} className="animate-spin text-muted-foreground/40" />
                              <span className="text-xs text-muted-foreground/60">正在启动...</span>
                            </div>
                          )}
                          {group.status === "completed" && group.pairs.length > 0 && (
                            <div className="mt-2 border-t border-border/10 pt-2">
                              <span className="text-xs text-green-400/70">✓ 已完成 {group.pairs.length} 个步骤</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {gi < groupedLogs.length - 1 && (
                      <div className="my-3 border-t border-border/10" />
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
