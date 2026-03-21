"use client";

import { useCallback } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import {
  type Message,
  type Assistant,
  type Checkpoint,
} from "@langchain/langgraph-sdk";

// Type for multimodal message content
// Supports: text, image_url (for images), file (for documents)
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | {
      type: "file";
      source: { type: "base64"; media_type: string; data: string };
      filename?: string;
    };

/**
 * 文件附件定义（改进方案 A）
 * 用于直接传递用户上传的文件信息，避免从文本中提取虚拟路径
 *
 * @property path - 虚拟路径，格式: /uploads/{user_id}/{filename}
 * @property filename - 原始文件名
 * @property size - 文件大小（字节）- 可选
 */
export interface FileAttachment {
  path: string; // 虚拟路径: /uploads/{uuid}/{filename}
  filename: string; // 原始文件名
  size?: number; // 文件大小（可选）
}

export type MultimodalContent = string | ContentBlock[];
import { v4 as uuidv4 } from "uuid";
import type { UseStreamThread } from "@langchain/langgraph-sdk/react";
import type { TodoItem } from "@/app/types/types";
import { useClient, useClientToken } from "@/providers/ClientProvider";
import { useQueryState } from "nuqs";

export type LogEntry = {
  type: "tool_call" | "tool_result";
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: string;
  tool_call_id?: string;
  status?: "success" | "error";
};

export type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
  subagent_logs?: Record<string, LogEntry[]>;
  subagents?: Record<string, any>;
  email?: {
    id?: string;
    subject?: string;
    page_content?: string;
  };
  ui?: any;
};

export function useChat({
  activeAssistant,
  onHistoryRevalidate,
  thread,
}: {
  activeAssistant: Assistant | null;
  onHistoryRevalidate?: () => void;
  thread?: UseStreamThread<StateType>;
}) {
  const [threadId, setThreadId] = useQueryState("threadId");
  const client = useClient();
  const token = useClientToken();

  // 辅助函数：将 token 添加到 config.configurable
  // 供后端 AuthMiddleware 读取，实现用户身份验证
  const getConfigWithToken = useCallback(
    (baseConfig?: Record<string, unknown>) => {
      // 无 token 时直接返回原配置，避免不必要的对象分配
      if (!token) {
        return baseConfig;
      }

      const config = baseConfig ? { ...baseConfig } : {};
      const configurable = config.configurable
        ? { ...(config.configurable as Record<string, unknown>) }
        : {};

      // 将 token 放入 configurable 中，供后端 AuthMiddleware 读取
      configurable.access_token = token;

      return {
        ...config,
        configurable,
      };
    },
    [token]
  );

  // 智能错误处理：区分认证/网络错误和未知错误
  const handleStreamError = useCallback(
    (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      const isAuthError = /401|403|unauthorized|forbidden/i.test(msg);
      const isNetworkError =
        /failed to fetch|network\s*error|abort|timeout|ECONNREFUSED|ERR_CONNECTION/i.test(
          msg
        );

      if (isAuthError) {
        // 认证错误由 AuthContext 统一处理，降级为 debug 日志
        console.debug("[useChat] 认证错误（由 AuthContext 处理）:", msg);
      } else if (isNetworkError) {
        // 网络错误会自动重连，降级为 debug 日志
        console.debug("[useChat] 网络错误（将自动重连）:", msg);
      } else if (/BlockingError|internal error occurred/i.test(msg)) {
        // 服务端 BlockingError：后端存在同步阻塞 I/O 操作，需后端排查
        console.warn(
          "[useChat] 服务端内部错误（BlockingError），请检查后端日志:",
          msg
        );
      } else {
        // 未知错误保留 error 级别
        console.error("[useChat] Stream 错误:", error);
      }
      // 无论何种错误都刷新 thread 列表
      onHistoryRevalidate?.();
    },
    [onHistoryRevalidate]
  );

  const stream = useStream<StateType>({
    assistantId: activeAssistant?.assistant_id || "",
    client: client ?? undefined,
    threadId: threadId ?? null,
    onThreadId: setThreadId,
    // Revalidate thread list when stream finishes, errors, or creates new thread
    onFinish: onHistoryRevalidate,
    onError: handleStreamError,
    onCreated: onHistoryRevalidate,
    fetchStateHistory: true,
  });

  /**
   * 发送消息（改进方案 A：数据流优先设计）
   *
   * 支持两种调用方式：
   * 1. sendMessage("文本消息") - 纯文本，不含附件
   * 2. sendMessage("文本消息", [{path: "...", filename: "..."}]) - 带文件附件
   *
   * 关键改进：
   * - 直接接受文件信息参数，无需从文本中提取
   * - 避免虚拟路径重复
   * - 无脆弱的正则表达式
   * - 完整的类型安全
   */
  const sendMessage = useCallback(
    (content: MultimodalContent, fileAttachments?: FileAttachment[]) => {
      // 将内容转换为适当的消息内容格式
      let messageContent: Message["content"];

      // 如果是字符串，保持原样
      if (typeof content === "string") {
        messageContent = content;
      } else {
        // 否则转换为内容格式
        messageContent = content as Message["content"];
      }

      const attachments = fileAttachments || [];

      // 创建消息对象
      const newMessage: Message = {
        id: uuidv4(),
        type: "human",
        content: messageContent,
      };

      // ✅ 改进：仅当有附件时才添加 additional_kwargs
      // 这样避免了对没有文件的消息进行不必要的处理
      if (attachments.length > 0) {
        newMessage.additional_kwargs = {
          attachments: attachments.map((att) => ({
            path: att.path,
            filename: att.filename,
            ...(att.size !== undefined && { size: att.size }),
          })),
        };
        console.debug(
          "[useChat] 发送消息，包含 %d 个文件附件",
          attachments.length,
          attachments.map((a) => `${a.filename} (${a.path})`)
        );
      }

      // 提交消息到流
      stream.submit(
        { messages: [newMessage] },
        {
          optimisticValues: (prev) => ({
            messages: [...(prev.messages ?? []), newMessage],
          }),
          config: getConfigWithToken(
            (activeAssistant?.config as Record<string, unknown>) ?? {
              recursion_limit: 200,
            }
          ),
        }
      );

      // 立即刷新线程列表
      onHistoryRevalidate?.();
    },
    [stream, activeAssistant?.config, onHistoryRevalidate, getConfigWithToken]
  );

  const runSingleStep = useCallback(
    (
      messages: Message[],
      checkpoint?: Checkpoint,
      isRerunningSubagent?: boolean,
      optimisticMessages?: Message[]
    ) => {
      if (checkpoint) {
        stream.submit(undefined, {
          ...(optimisticMessages
            ? { optimisticValues: { messages: optimisticMessages } }
            : {}),
          config: getConfigWithToken(
            activeAssistant?.config as Record<string, unknown>
          ),
          checkpoint: checkpoint,
          ...(isRerunningSubagent
            ? { interruptAfter: ["tools"] }
            : { interruptBefore: ["tools"] }),
        });
      } else {
        stream.submit(
          { messages },
          {
            config: getConfigWithToken(
              activeAssistant?.config as Record<string, unknown>
            ),
            interruptBefore: ["tools"],
          }
        );
      }
    },
    [stream, activeAssistant?.config, getConfigWithToken]
  );

  const setFiles = useCallback(
    async (files: Record<string, string>) => {
      if (!threadId) return;
      // TODO: missing a way how to revalidate the internal state
      // I think we do want to have the ability to externally manage the state
      await client.threads.updateState(threadId, { values: { files } });
    },
    [client, threadId]
  );

  const continueStream = useCallback(
    (hasTaskToolCall?: boolean) => {
      stream.submit(undefined, {
        config: getConfigWithToken({
          ...((activeAssistant?.config as Record<string, unknown>) || {}),
          recursion_limit: 200,
        } as Record<string, unknown>),
        ...(hasTaskToolCall
          ? { interruptAfter: ["tools"] }
          : { interruptBefore: ["tools"] }),
      });
      // Update thread list when continuing stream
      onHistoryRevalidate?.();
    },
    [stream, activeAssistant?.config, onHistoryRevalidate, getConfigWithToken]
  );

  const markCurrentThreadAsResolved = useCallback(() => {
    stream.submit(null, { command: { goto: "__end__", update: null } });
    // Update thread list when marking thread as resolved
    onHistoryRevalidate?.();
  }, [stream, onHistoryRevalidate]);

  const resumeInterrupt = useCallback(
    (value: any) => {
      stream.submit(null, { command: { resume: value } });
      // Update thread list when resuming from interrupt
      onHistoryRevalidate?.();
    },
    [stream, onHistoryRevalidate]
  );

  const stopStream = useCallback(() => {
    stream.stop();
  }, [stream]);

  const regenerateLastMessage = useCallback(() => {
    // Find the last human message to re-submit
    const lastHumanIdx = [...stream.messages]
      .reverse()
      .findIndex((m) => m.type === "human");
    if (lastHumanIdx === -1) return;

    const actualIdx = stream.messages.length - 1 - lastHumanIdx;
    const lastHuman = stream.messages[actualIdx];
    const content =
      typeof lastHuman.content === "string" ? lastHuman.content : "";

    if (!content) return;

    // Re-submit the same message
    const newMessage: Message = { id: uuidv4(), type: "human", content };
    stream.submit(
      { messages: [newMessage] },
      {
        optimisticValues: (prev) => ({
          messages: [...(prev.messages ?? []), newMessage],
        }),
        config: getConfigWithToken(
          (activeAssistant?.config as Record<string, unknown>) ?? {
            recursion_limit: 200,
          }
        ),
      }
    );
    onHistoryRevalidate?.();
  }, [stream, activeAssistant?.config, onHistoryRevalidate, getConfigWithToken]);

  // Debug logging for files state tracking (disabled in production)
  const filesFromStream = stream.values.files ?? {};
  if (Object.keys(filesFromStream).length > 0) {
    if (process.env.NODE_ENV === "development") {
      console.log("[useChat] Received files from stream:", {
        count: Object.keys(filesFromStream).length,
        files: Object.keys(filesFromStream),
      });
    }
  }

  return {
    stream,
    todos: stream.values.todos ?? [],
    files: filesFromStream,
    subagent_logs: stream.values.subagent_logs ?? {},
    subagents: stream.values.subagents ?? {},
    email: stream.values.email,
    ui: stream.values.ui,
    setFiles,
    messages: stream.messages,
    isLoading: stream.isLoading,
    isThreadLoading: stream.isThreadLoading,
    interrupt: stream.interrupt,
    getMessagesMetadata: stream.getMessagesMetadata,
    sendMessage,
    runSingleStep,
    continueStream,
    stopStream,
    markCurrentThreadAsResolved,
    resumeInterrupt,
    regenerateLastMessage,
  };
}
