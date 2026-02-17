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

  return processed.map((data, index) => {
    const isLast = index === processed.length - 1;
    const isStreaming = isLoading && isLast && data.message.type === "ai";

    return {
      key: data.message.id || `msg-${index}`,
      role: data.message.type === "human" ? "user" : "ai",
      content: extractStringFromMessageContent(data.message),
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

  messages.forEach((message) => {
    if (message.type === "ai") {
      const toolCalls = extractToolCalls(message);
      messageMap.set(message.id!, {
        message,
        toolCalls: toolCalls.map((tc) => ({
          ...tc,
          status: interrupt ? "interrupted" : "pending",
        })),
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
          args: (func?.arguments || tcObj.args || {}) as Record<string, unknown>,
          status: "pending" as const,
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
            status: "pending" as const,
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
