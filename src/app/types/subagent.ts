/**
 * SubAgent 类型定义 (v1.2 增强版)
 *
 * 符合 DeepAgent 团队评审建议:
 * - 多重名称回退机制
 * - 健壮的字段访问 (可选链)
 * - 错误状态支持
 * - 文本截断功能
 */
import type { SubagentStatus } from "@langchain/langgraph-sdk/react";

/**
 * 工具调用展示数据
 */
export interface ToolCallDisplay {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
}

/**
 * SubAgent 展示数据 (增强版)
 */
export interface SubAgentDisplayData {
  id: string;
  name: string;
  status: SubagentStatus;
  toolCalls: ToolCallDisplay[];
  result?: string;
  startedAt: Date | null;
  error?: string; // 新增: 错误信息
}

/**
 * SubAgent 名称获取 (多重回退)
 * 优先级: subagent.name → subagent.toolCall.args.subagent_type → "SubAgent #N"
 */
export function getSubAgentName(
  subagent: {
    name?: string;
    toolCall?: { args?: { subagent_type?: string } };
    id?: string;
  },
  index: number
): string {
  // 优先级 1: 直接的 name 属性
  if (subagent.name) {
    return subagent.name;
  }
  // 优先级 2: toolCall.args.subagent_type
  if (subagent.toolCall?.args?.subagent_type) {
    return subagent.toolCall.args.subagent_type;
  }
  // 优先级 3: 回退到 "SubAgent #N"
  return `SubAgent #${index + 1}`;
}

/**
 * 截断工具调用参数 (防止大 JSON 导致 UI 卡顿)
 */
export function truncateArgs(
  args: Record<string, unknown>,
  maxLength: number = 200
): { display: string; truncated: boolean } {
  try {
    const jsonStr = JSON.stringify(args);
    if (jsonStr.length <= maxLength) {
      return { display: jsonStr, truncated: false };
    }
    return {
      display: jsonStr.slice(0, maxLength) + "...",
      truncated: true,
    };
  } catch {
    return { display: "[无法序列化]", truncated: false };
  }
}

/**
 * 安全提取错误信息
 */
export function extractErrorInfo(subagent: {
  error?: unknown;
  status?: string;
}): string | undefined {
  if (subagent.status === "error" && subagent.error) {
    if (typeof subagent.error === "string") {
      return subagent.error;
    }
    if (subagent.error instanceof Error) {
      return subagent.error.message;
    }
    // 尝试从对象中提取错误消息
    const errorObj = subagent.error as Record<string, unknown>;
    if (errorObj.message) {
      return String(errorObj.message);
    }
    return String(subagent.error);
  }
  return undefined;
}

/**
 * 从 SDK 数据转换为展示数据 (增强版)
 */
export function transformSubagentData(
  subagent: any,
  index: number
): SubAgentDisplayData {
  // 安全提取字段
  const toolCalls = Array.isArray(subagent.toolCalls)
    ? subagent.toolCalls.map((tc: any) => ({
        id: tc.call?.id || tc.id || `tc-${Math.random()}`,
        name: tc.call?.name || tc.name || "unknown",
        args: tc.call?.args || tc.args || {},
        result: tc.result ?? undefined,
      }))
    : [];

  return {
    id: subagent.id || `subagent-${index}`,
    name: getSubAgentName(subagent, index),
    status: subagent.status || "pending",
    toolCalls,
    result: subagent.result ?? undefined,
    startedAt: subagent.startedAt ? new Date(subagent.startedAt) : null,
    error: extractErrorInfo(subagent),
  };
}

/**
 * 按开始时间升序排序 SubAgent 列表
 */
export function sortSubAgentsByTime(
  subagents: SubAgentDisplayData[]
): SubAgentDisplayData[] {
  return [...subagents].sort((a, b) => {
    if (!a.startedAt && !b.startedAt) return 0;
    if (!a.startedAt) return -1;
    if (!b.startedAt) return 1;
    return a.startedAt.getTime() - b.startedAt.getTime();
  });
}

// 重新导出类型，方便使用
export type { SubagentStatus };
