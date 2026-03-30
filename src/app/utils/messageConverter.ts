import type { Message } from "@langchain/langgraph-sdk";
import type { ToolCall } from "@/app/types/types";
import { extractStringFromMessageContent } from "./utils";

/**
 * Extended Bubble type with custom properties for Ant Design X
 * Uses extraInfo to store custom data (Ant Design X official support)
 */
export interface ConvertedBubbleItem {
  key: string;
  role: "user" | "ai";
  content: string;
  typing?: { effect: "fade-in" | "typing" } | false;
  extraInfo?: {
    toolCalls?: ToolCall[];
    isStreaming?: boolean;
    status?: string;
    isLast?: boolean;
  };
}

interface ProcessedMessage {
  message: Message;
  toolCalls: ToolCall[];
}

/**
 * Convert LangGraph Message list to Ant Design X Bubble format
 */
export function convertMessagesToBubbles(
  messages: Message[],
  isLoading: boolean,
  interrupt?: unknown
): ConvertedBubbleItem[] {
  const processed = processMessagesWithTools(messages, interrupt);

  // 🔧 修复: 过滤掉没有内容的消息（空消息气泡）
  // 同时保留有 toolCalls 的消息（即使内容为空）
  const filtered = processed.filter((data) => {
    const content = extractStringFromMessageContent(data.message);
    const hasToolCalls = data.toolCalls && data.toolCalls.length > 0;
    // 保留：有内容 或 有 toolCalls 的消息
    return content.trim() !== "" || hasToolCalls;
  });

  return filtered.map((data, index) => {
    const isLast = index === filtered.length - 1;
    const isStreaming = isLoading && isLast && data.message.type === "ai";
    const content = extractStringFromMessageContent(data.message);

    return {
      key: data.message.id || `msg-${index}`,
      role: data.message.type === "human" ? "user" : "ai",
      content: content,
      typing:
        data.message.type === "ai" && !isStreaming
          ? { effect: "fade-in" }
          : false,
      extraInfo: {
        toolCalls: data.toolCalls,
        isStreaming,
        status: getMessageStatus(data, interrupt),
        isLast,
      },
    };
  });
}

function processMessagesWithTools(
  messages: Message[],
  interrupt?: unknown
): ProcessedMessage[] {
  const messageMap = new Map<string, ProcessedMessage>();

  // 🔧 修复 ISSUE-005: 从 interrupt 对象中提取被中断的 tool_call_id
  // interrupt 结构可能是：
  // { value: { action_requests: [...], review_configs: [...] } } (submit_deliverable 等 HIL)
  // { value: { tool_call_id: "xxx", ... } } (普通 tool 中断)
  // { tool_call_id: "xxx", ... }
  const hasActionRequests = (() => {
    if (!interrupt || typeof interrupt !== "object") return false;
    const interruptValue = (interrupt as any).value;
    return !!(interruptValue && typeof interruptValue === "object" &&
              Array.isArray(interruptValue.action_requests) &&
              interruptValue.action_requests.length > 0);
  })();

  // 提取被中断的 tool_call_id（如果有的话）
  const interruptedToolCallId = hasActionRequests ? null : (() => {
    if (!interrupt || typeof interrupt !== "object") return null;

    // 尝试从 interrupt.value 中获取
    const interruptValue = (interrupt as any).value;
    if (interruptValue && typeof interruptValue === "object") {
      return interruptValue.tool_call_id || interruptValue.toolCallId;
    }

    // 或者直接从 interrupt 中获取
    return (interrupt as any).tool_call_id || (interrupt as any).toolCallId;
  })();

  // 🔧 修复：当有 action_requests 时，标记所有 pending tool call 为 interrupted
  // 因为无法精确匹配到具体是哪个 tool call_id（interrupt 没有这个字段）

  messages.forEach((message, messageIndex) => {
    if (message.type === "ai") {
      const toolCalls = extractToolCalls(message);

      messageMap.set(message.id!, {
        message,
        toolCalls: toolCalls.map((tc, tcIndex) => {
          // 🔧 修复 ISSUE-006: 优先使用 tool call 的实际状态，而不是硬编码 "pending"
          // LangGraph SDK 在 tool_calls 中提供了 status 字段
          const actualStatus = tc.status || "pending";

          // 🔧 修复: 使用 hasActionRequests 或 tool_call_id 匹配来判断 interrupt 状态
          // 当有 action_requests 时（submit_deliverable 等 HIL），所有 pending tool call 都需要用户审批
          const shouldBeInterrupted = hasActionRequests
            ? actualStatus === "pending" || actualStatus === "interrupted" // 标记所有 pending 为 interrupted
            : (interrupt && tc.id === interruptedToolCallId);

          return {
            ...tc,
            // 仅在需要中断时覆盖状态，否则使用实际状态
            status: shouldBeInterrupted ? "interrupted" : actualStatus,
          };
        }),
      });
    } else if (message.type === "tool") {
      const toolCallId = message.tool_call_id;
      if (!toolCallId) return;

      for (const [, data] of messageMap.entries()) {
        const tcIndex = data.toolCalls.findIndex((tc) => tc.id === toolCallId);
        if (tcIndex !== -1) {
          data.toolCalls[tcIndex] = {
            ...data.toolCalls[tcIndex],
            status: "completed",
            result: extractStringFromMessageContent(message),
          };
          break;
        }
      }
    } else if (message.type === "human") {
      messageMap.set(message.id!, {
        message,
        toolCalls: [],
      });
    }
  });

  return Array.from(messageMap.values());
}

function extractToolCalls(message: Message): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  const additionalToolCalls = message.additional_kwargs?.tool_calls;
  if (Array.isArray(additionalToolCalls)) {
    toolCalls.push(
      ...additionalToolCalls.map((tc: unknown) => {
        const tcObj = tc as Record<string, unknown>;
        const func = tcObj.function as Record<string, unknown> | undefined;
        return {
          id: String(tcObj.id || `tc-${Date.now()}`),
          name: String(func?.name || tcObj.name || "unknown"),
          args: (func?.arguments || tcObj.args || {}) as Record<
            string,
            unknown
          >,
          // 🔧 修复: 读取 LangGraph 返回的实际状态，而不是硬编码 "pending"
          status: ((tcObj.status || func?.status) as ToolCall["status"]) || "pending",
          result: (tcObj.result || func?.result) as string | undefined,
        };
      })
    );
  }

  const messageToolCalls = (message as Record<string, unknown>).tool_calls;
  if (Array.isArray(messageToolCalls) && messageToolCalls.length) {
    toolCalls.push(
      ...messageToolCalls
        .filter((tc: unknown) => {
          const tcObj = tc as Record<string, unknown>;
          return tcObj.name && tcObj.name !== "";
        })
        .map((tc: unknown) => {
          const tcObj = tc as Record<string, unknown>;
          return {
            id: String(tcObj.id || `tc-${Date.now()}`),
            name: String(tcObj.name),
            args: (tcObj.args || {}) as Record<string, unknown>,
            // 🔧 修复 ISSUE-006: 读取 LangGraph 返回的实际状态，而不是硬编码 "pending"
            // LangGraph SDK 在 tool_calls 中提供了 status 字段：
            // - "pending": 工具调用已创建，等待执行
            // - "completed": 工具调用已完成，结果在 result 字段
            // - "error": 工具调用失败
            status: (tcObj.status as ToolCall["status"]) || "pending",
            // 同时读取 result 字段（如果有）
            result: tcObj.result as string | undefined,
          };
        })
    );
  }

  return toolCalls;
}

function getMessageStatus(data: ProcessedMessage, interrupt?: unknown): string {
  if (interrupt && data.toolCalls.some((tc) => tc.status === "interrupted")) {
    return "interrupted";
  }
  if (data.toolCalls.some((tc) => tc.status === "pending")) {
    return "pending";
  }
  return "completed";
}
