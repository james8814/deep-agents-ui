"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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
  externalThreadId,
}: {
  activeAssistant: Assistant | null;
  onHistoryRevalidate?: () => void;
  thread?: UseStreamThread<StateType>;
  externalThreadId?: string | null;
}) {
  // 如果传入了 externalThreadId，使用它；否则使用内部的 useQueryState
  const [internalThreadId, setInternalThreadId] = useQueryState("threadId");
  // 🔧 修复：使用外部传入的 threadId，避免和 page.tsx 的 threadId 冲突
  const threadId = externalThreadId !== undefined ? externalThreadId : internalThreadId;
  const setThreadId = externalThreadId !== undefined
    ? ((_id: string | null) => { /* external set handled by parent */ })
    : setInternalThreadId;
  const client = useClient();
  const token = useClientToken();

  // 🔍 监控 threadId 变化
  const prevThreadId = useRef<string | null>(null);
  useEffect(() => {
    if (threadId !== prevThreadId.current) {
      prevThreadId.current = threadId;
    }
  }, [threadId]);

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
    onThreadId: (newThreadId) => {
      // 🔧 修复：只有使用内部 threadId 时才更新
      if (externalThreadId === undefined) {
        setInternalThreadId(newThreadId);
      }
    },
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

      // 🔧【P0 修复】消息历史累积问题 - 传递 checkpoint 以从上一个状态恢复
      // 问题：不传递 checkpoint 时，每次运行都从头开始，导致消息历史无法累积
      // 解决：从 stream.history 获取当前 checkpoint，在 submit 时传递
      // 参考：LangGraph SDK 内部使用 branchContext.threadHead?.checkpoint
      // 注意：stream.history 是时间顺序数组，.at(-1) 是最新状态（threadHead）
      const currentCheckpoint = stream.history?.at(-1)?.checkpoint ?? null;

      stream.submit(
        { messages: [newMessage] },
        {
          optimisticValues: (prev) => {
            // 🔧 防御性检查：处理 prev 为空或 prev.messages 不是数组的情况
            const prevMessages = Array.isArray(prev?.messages) ? prev.messages : [];
            return {
              messages: [...prevMessages, newMessage],
            };
          },
          config: getConfigWithToken(
            (activeAssistant?.config as Record<string, unknown>) ?? {
              recursion_limit: 200,
            }
          ),
          // ✅ 传递 checkpoint，让后端从上一个 checkpoint 恢复消息历史
          checkpoint: currentCheckpoint,
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
        optimisticValues: (prev) => {
          // 🔧 防御性检查：处理 prev 为空或 prev.messages 不是数组的情况
          const prevMessages = Array.isArray(prev?.messages) ? prev.messages : [];
          return {
            messages: [...prevMessages, newMessage],
          };
        },
        config: getConfigWithToken(
          (activeAssistant?.config as Record<string, unknown>) ?? {
            recursion_limit: 200,
          }
        ),
      }
    );
    onHistoryRevalidate?.();
  }, [stream, activeAssistant?.config, onHistoryRevalidate, getConfigWithToken]);

  // 🔧 修复无限循环：移除 subagent_logs console.log
  // 原因：每次渲染都执行，导致性能问题
  // 如需调试，使用 React DevTools 或条件化日志

  // 🔧 修复无限循环：移除 files console.log
  // 原因：每次渲染都执行，导致性能问题
  const filesFromStream = stream.values.files ?? {};

  // 🔧 修复无限循环：移除 stream.messages useEffect 监控
  // 原因：stream.messages 是数组，引用频繁变化导致无限重渲染
  // 如需调试，使用 React DevTools 或手动 console.log

  // 🔧 修复无限循环：移除 console.log

  // ✅ 修复 ISSUE-004: 正确处理 SDK messages 覆盖问题
  // 问题：SDK 在 streaming 时，stream.messages 会从 [用户消息] 变成 [AI回复]
  // 解决：使用 Map 按 id 去重，保留所有见过的消息

  const messagesMap = useRef<Map<string, Message>>(new Map());
  // ⚠️ prevThreadId 已在上面定义（第 92 行），用于监控 threadId 变化

  // 当 threadId 改变时，清空 Map
  useEffect(() => {
    if (threadId !== prevThreadId.current) {
      messagesMap.current.clear();
      prevThreadId.current = threadId;
    }
  }, [threadId]);

  // 🔧 修复无限循环：稳定 useMemo 依赖
  // 原因：stream.messages 数组引用频繁变化
  // 解决：只在消息数量或 ID 集合变化时重新计算
  const messages = useMemo(() => {
    // 将 SDK messages 添加到 Map（去重）
    stream.messages.forEach((msg) => {
      if (msg.id) {
        // 🔧 修复：LangGraph SDK 在流式传输期间可能返回空内容
        // 检查 stream.values.messages 中是否有完整内容作为回退
        let finalMsg = msg;
        if (!msg.content || (typeof msg.content === 'string' && msg.content.trim() === '')) {
          // 检查 stream.values 中是否有该消息的完整版本
          const valuesMessages = stream.values.messages || [];
          const completeMsg = valuesMessages.find((m: any) => m.id === msg.id);
          if (completeMsg && completeMsg.content) {
            finalMsg = completeMsg;
          }
        }
        messagesMap.current.set(msg.id, finalMsg);
      }
    });

    // 从 Map 生成消息列表，保持插入顺序
    const allMessages = Array.from(messagesMap.current.values());

    // 🔧 仅在开发环境且消息数量变化时记录日志
    if (process.env.NODE_ENV === 'development') {
      const prevSize = messagesMap.current.size;
      const newSize = allMessages.length;
      if (prevSize !== newSize) {
        console.log("[useChat] messages updated:", {
          count: newSize,
          types: allMessages.map(m => m.type).join(', '),
        });
      }
    }

    return allMessages;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.messages.length, stream.messages.map(m => m.id).join(','), stream.isLoading]);

  return {
    stream,
    todos: stream.values.todos ?? [],
    files: filesFromStream,
    subagent_logs: stream.values.subagent_logs ?? {},
    subagents: stream.values.subagents ?? {},
    email: stream.values.email,
    ui: stream.values.ui,
    setFiles,
    messages, // ✅ 使用合并后的 messages
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
