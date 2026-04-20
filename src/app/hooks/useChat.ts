"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  thread: _thread,
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
  const client = useClient();
  const token = useClientToken();

  // 辅助函数：将 token 添加到 config.configurable
  // 供后端 AuthMiddleware 读取，实现用户身份验证
  const getConfigWithToken = useCallback(
    (baseConfig?: Record<string, unknown>) => {
      // 默认配置：timeout 和 recursion_limit
      const defaultConfig: Record<string, unknown> = {
        timeout: 60_000, // ✅ 60 seconds timeout for LLM API calls
        recursion_limit: 1000, // ✅ Align with backend config.yaml
      };

      // 合并默认配置、baseConfig 和 token
      const config: Record<string, unknown> = {
        ...defaultConfig,
        ...baseConfig,
      };

      // 无 token 时直接返回配置，避免不必要的对象分配
      if (!token) {
        return config;
      }

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
        /failed to fetch|network\s*error|abort|timeout|timed\s*out|ECONNREFUSED|ERR_CONNECTION/i.test(
          msg
        );

      if (isAuthError) {
        // P1-4 补丁 1: 认证错误派发 auth-error 事件
        // (原注释"由 AuthContext 处理"是假处理——AuthProvider 现已订阅该事件)
        console.debug("[useChat] 认证错误,派发 auth-error:", msg);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth-error"));
        }
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

  // SubAgent 实时进度日志（custom 事件驱动）
  const [realtimeSubagentLogs, setRealtimeSubagentLogs] = useState<
    Record<string, Array<{ type: string; tool_name?: string; content_preview?: string; step_type?: string }>>
  >({});
  const realtimeSubagentLogMessageCountRef = useRef<Record<string, number>>({});

  const stream = useStream<StateType>({
    assistantId: activeAssistant?.assistant_id || "",
    client: client ?? undefined,
    threadId: threadId ?? null,
    onThreadId: (newThreadId) => {
      setTimeout(() => {
        if (externalThreadId == null) {
          setInternalThreadId(newThreadId);
        }
      }, 100);
    },
    onFinish: () => {
      // 不清空实时日志 — subagent_logs state 持久化接管尚未实现（DeepAgents 已知缺失）
      // 保留 realtimeSubagentLogs 供右侧工作台在 run 结束后仍可查看
      realtimeSubagentLogMessageCountRef.current = {};
      onHistoryRevalidate?.();
    },
    onError: (error) => {
      realtimeSubagentLogMessageCountRef.current = {};
      handleStreamError(error);
    },
    onCreated: () => {
      onHistoryRevalidate?.();
    },
    // SubAgent 实时进度：DeepAgents stream_writer 发送 custom 事件
    onCustomEvent: (event: any) => {
      if (event?.type === "subagent_progress") {
        const key = event.subagent_type || "unknown";
        const messageCount =
          typeof event.message_count === "number" ? event.message_count : undefined;
        const prevCount = realtimeSubagentLogMessageCountRef.current[key];
        const shouldReset =
          messageCount !== undefined && prevCount !== undefined && messageCount < prevCount;
        if (messageCount !== undefined) {
          realtimeSubagentLogMessageCountRef.current[key] = messageCount;
        }
        setRealtimeSubagentLogs((prev) => {
          const existing = shouldReset ? [] : prev[key] || [];
          const next = [
            ...existing,
            {
              type: event.step_type || "progress",
              tool_name: event.tool_name,
              content_preview: event.content_preview,
              step_type: event.step_type,
            },
          ];
          return {
            ...prev,
            [key]: next.length > 200 ? next.slice(-200) : next,
          };
        });
      }
    },
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
      // 新消息发送时清空上一轮的实时日志和轮询 todos
      setRealtimeSubagentLogs({});
      realtimeSubagentLogMessageCountRef.current = {};
      setPollingTodos(null);

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
      // [P0-4 修复] 增强 checkpoint 获取的健壮性
      // 🔧 修复 React #321: 移除 useMemo (Hooks 不能在普通函数内调用)
      const currentCheckpoint = (() => {
        if (!stream.history || stream.history.length === 0) {
          console.warn('[useChat] stream.history is empty, checkpoint will be null');
          return null;
        }
        const lastEntry = stream.history.at(-1);
        if (!lastEntry?.checkpoint) {
          console.warn('[useChat] Last history entry has no checkpoint');
          return null;
        }
        return lastEntry.checkpoint;
      })();

      stream.submit(
        { messages: [newMessage] },
        {
          optimisticValues: (prev) => {
            // 🔧 防御性检查：处理 prev 为空或 prev.messages 不是数组的情况
            const prevMessages = Array.isArray(prev?.messages) ? prev.messages : [];
            // [P0-3 修复] 保留所有状态字段，防止闪烁
            return {
              messages: [...prevMessages, newMessage],
              files: prev?.files ?? {},
              subagent_logs: prev?.subagent_logs ?? {},
              todos: prev?.todos ?? [],
              subagents: prev?.subagents ?? {},
            };
          },
          config: getConfigWithToken(
            (activeAssistant?.config as Record<string, unknown>) ?? {
              recursion_limit: 1000, // ✅ Align with backend config.yaml
              timeout: 60_000, // ✅ 60 seconds timeout for LLM API calls
            }
          ),
          // ✅ 传递 checkpoint，让后端从上一个 checkpoint 恢复消息历史
          checkpoint: currentCheckpoint,
          // 🔧 修复：添加 streamMode 配置以获取完整状态（包含 subagent_logs）
          // 使用 "values" + "messages" 组合模式，确保 subagent_logs 自动推送到 stream.values
          // 注意："updates" 模式不会自动更新 stream.values，必须用 "values" 模式
          streamMode: ["values", "messages", "custom"],
          // 🔧 修复 SSE 断连导致后端取消 run：SubAgent 长时间执行时浏览器会关闭空闲连接，
          // 默认 on_disconnect="cancel" 会直接终止后端 run。改为 "continue" 让后端继续执行。
          onDisconnect: "continue",
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
          streamMode: ["values", "messages", "custom"],
          onDisconnect: "continue",
        });
      } else {
        stream.submit(
          { messages },
          {
            config: getConfigWithToken(
              activeAssistant?.config as Record<string, unknown>
            ),
            interruptBefore: ["tools"],
            streamMode: ["values", "messages", "custom"],
            onDisconnect: "continue",
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
        streamMode: ["values", "messages", "custom"],
        onDisconnect: "continue",
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
      stream.submit(
        null,
        {
          command: { resume: value },
          // 🔧 修复 HIL 中断状态不同步：添加 streamMode 配置
          // 使用 "values" + "messages" 组合模式，确保：
          // 1. 后端清除 __interrupt__ 字段后，前端 stream.values 自动更新
          // 2. stream.interrupt getter 能正确读取最新状态（应为 undefined）
          // 3. HIL banner 正确消失，Agent 继续执行
          streamMode: ["values", "messages", "custom"],
          onDisconnect: "continue",
        }
      );
      // Update thread list when resuming from interrupt
      onHistoryRevalidate?.();
    },
    [stream, onHistoryRevalidate]
  );

  const stopStream = useCallback(() => {
    stream.stop();
    // 轮询期间：取消后端 run + 停止轮询
    if (pollingRef.current && threadId && client) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
      setIsPolling(false);
      client.runs.list(threadId, { limit: 1 }).then((runs: any[]) => {
        const run = runs[0];
        if (run?.status === "running" || run?.status === "pending") {
          client!.runs.cancel(threadId!, run.run_id);
        }
      }).catch(() => {});
    }
  }, [stream, threadId, client]);

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
        onDisconnect: "continue",
      }
    );
    onHistoryRevalidate?.();
  }, [stream, activeAssistant?.config, onHistoryRevalidate, getConfigWithToken]);

  const filesFromStream = stream.values.files ?? {};

  // 🔧 修复无限循环：移除 stream.messages useEffect 监控
  // 原因：stream.messages 是数组，引用频繁变化导致无限重渲染
  // 如需调试，使用 React DevTools 或手动 console.log

  // 🔧 修复无限循环：移除 console.log

  // ✅ 修复 ISSUE-004: 正确处理 SDK messages 覆盖问题
  // 问题：SDK 在 streaming 时，stream.messages 会从 [用户消息] 变成 [AI回复]
  // 解决：使用 Map 按 id 去重，保留所有见过的消息

  const messagesMap = useRef<Map<string, Message>>(new Map());
  const prevThreadIdRef = useRef<string | null>(null);

  // 当 threadId 改变时，清空 Map
  // 🔧 修复: 确保在 threadId 变化时正确清空消息
  useEffect(() => {
    const hasChanged = threadId !== prevThreadIdRef.current;
    const isNewThread = threadId === null;

    // 当 threadId 发生变化，或者是创建新会话（null），都清空消息
    if (hasChanged || (isNewThread && messagesMap.current.size > 0)) {
      messagesMap.current.clear();
      prevThreadIdRef.current = threadId;
    }
  }, [threadId]);

  // 🔧 修复无限循环：稳定 useMemo 依赖
  // 原因：stream.messages 数组引用频繁变化
  // 解决：只在消息数量或 ID 集合变化时重新计算
  const messages = useMemo(() => {
    // 🔧 诊断日志：检查 stream 数据源（详细版）
    if (process.env.NODE_ENV === 'development') {
      const lastStreamMsg = stream.messages[stream.messages.length - 1];
      const lastValuesMsg = (stream.values.messages || [])[(stream.values.messages || []).length - 1];

      if (lastStreamMsg?.type === 'ai' || lastValuesMsg?.type === 'ai') {
        console.log('[useChat] 诊断 - AI 消息对比:', JSON.stringify({
          streamMsg: lastStreamMsg ? {
            id: lastStreamMsg.id,
            type: lastStreamMsg.type,
            hasToolCalls: !!(lastStreamMsg as any).tool_calls?.length,
            toolCallsCount: (lastStreamMsg as any).tool_calls?.length || 0,
            toolCalls: (lastStreamMsg as any).tool_calls || [],
            hasAdditionalKwargs: !!(lastStreamMsg as any).additional_kwargs?.tool_calls?.length,
            additionalKwargsToolCalls: (lastStreamMsg as any).additional_kwargs?.tool_calls || [],
          } : null,
          valuesMsg: lastValuesMsg ? {
            id: lastValuesMsg.id,
            type: lastValuesMsg.type,
            hasToolCalls: !!(lastValuesMsg as any).tool_calls?.length,
            toolCallsCount: (lastValuesMsg as any).tool_calls?.length || 0,
            toolCalls: (lastValuesMsg as any).tool_calls || [],
            hasAdditionalKwargs: !!(lastValuesMsg as any).additional_kwargs?.tool_calls?.length,
            additionalKwargsToolCalls: (lastValuesMsg as any).additional_kwargs?.tool_calls || [],
          } : null,
        }, null, 2));
      }
    }

    // 将 SDK messages 添加到 Map（去重）
    stream.messages.forEach((msg) => {
      if (msg.id) {
        // 🔧 修复：LangGraph SDK 在流式传输期间可能返回空内容或缺失 tool_calls
        // 检查 stream.values.messages 中是否有完整内容作为回退
        let finalMsg = msg;

        // 🔧 修复 tool_calls 不显示问题：合并 stream.values.messages 中的 tool_calls
        // 问题：stream.messages 可能不包含 tool_calls，而 stream.values.messages 中有
        const valuesMessages = stream.values.messages || [];
        const completeMsg = valuesMessages.find((m: any) => m.id === msg.id);

        const hasEmptyContent = !msg.content || (typeof msg.content === 'string' && msg.content.trim() === '');
        const hasNoToolCalls = msg.type === 'ai' && !(msg as any).tool_calls?.length;
        const hasToolCallsInValues = completeMsg && (completeMsg as any).tool_calls?.length > 0;

        // 如果内容为空，或 AI 消息缺少 tool_calls 但 values 中有，使用 values 中的消息
        if ((hasEmptyContent || hasNoToolCalls) && completeMsg) {
          if (hasEmptyContent && completeMsg.content) {
            finalMsg = completeMsg;
          } else if (hasNoToolCalls && hasToolCallsInValues) {
            // 合并 tool_calls：保留原消息内容，补充 tool_calls
            finalMsg = {
              ...msg,
              tool_calls: (completeMsg as any).tool_calls,
              additional_kwargs: {
                ...msg.additional_kwargs,
                tool_calls: (completeMsg as any).tool_calls,
              },
            };
            console.debug('[useChat] 补充 tool_calls 从 stream.values.messages:', {
              msgId: msg.id,
              toolCallsCount: (completeMsg as any).tool_calls?.length || 0,
            });
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

  // 🔧 SSE 断连轮询兜底：当 SSE 断连但后端仍在运行时，轮询检测完成
  const wasStreamLoadingRef = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  // 轮询期间的 state 覆盖（SSE 断连时 stream.values 停止更新）
  const [pollingTodos, setPollingTodos] = useState<TodoItem[] | null>(null);

  // 检测 SSE 断连（isLoading: true → false）并启动轮询
  useEffect(() => {
    const wasLoading = wasStreamLoadingRef.current;
    wasStreamLoadingRef.current = stream.isLoading;

    // 只在 true → false 转换时触发，且未在轮询中
    if (wasLoading && !stream.isLoading && !pollingRef.current && threadId && client) {
      client.runs.list(threadId, { limit: 1 }).then((runs: any[]) => {
        const latestRun = runs[0];
        // 方案 3: 区分 SSE 断连 vs 真正的 interrupt
        if (latestRun?.status === "interrupted") {
          // 真正的 interrupt（如 submit_deliverable HIL），不需要轮询
          // 前端 useStream 会正确处理 interrupt 状态
          return;
        }
        if (latestRun?.status === "running" || latestRun?.status === "pending") {
          // SSE 断连但后端仍在运行 — 启动轮询
          setIsPolling(true);
          pollingRef.current = setInterval(async () => {
            try {
              const currentRuns = await client!.runs.list(threadId!, { limit: 1 });
              const run = currentRuns[0];
              if (run?.status !== "running" && run?.status !== "pending") {
                clearInterval(pollingRef.current!);
                pollingRef.current = null;
                setIsPolling(false);
                setPollingTodos(null);
                window.location.reload();
              } else {
                // 轮询期间拉取最新 state 更新 todos
                try {
                  const state = await client!.threads.getState(threadId!);
                  const latestTodos = (state as any)?.values?.todos;
                  if (Array.isArray(latestTodos)) {
                    setPollingTodos(latestTodos);
                  }
                } catch {
                  // state 拉取失败不影响轮询
                }
              }
            } catch (err: unknown) {
              // P1-4 补丁 2: 检测 401/403 → 停止轮询 + 派发 auth-error
              // (原实现吞掉所有错误,token 失效时会死循环轮询)
              const msg = err instanceof Error ? err.message : String(err);
              if (/401|403|unauthorized|forbidden/i.test(msg)) {
                clearInterval(pollingRef.current!);
                pollingRef.current = null;
                setIsPolling(false);
                setPollingTodos(null);
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("auth-error"));
                }
                return;
              }
              // 非 401 继续轮询(网络抖动等)
            }
          }, 15_000);
        }
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream.isLoading]);

  // 清理轮询 + 实时日志 + 轮询 todos on thread change or unmount
  useEffect(() => {
    setRealtimeSubagentLogs({});
    realtimeSubagentLogMessageCountRef.current = {};
    setPollingTodos(null);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setIsPolling(false);
      }
    };
  }, [threadId]);

  return {
    stream,
    todos: pollingTodos ?? stream.values.todos ?? [],
    files: filesFromStream,
    subagent_logs: stream.values.subagent_logs ?? {},
    realtimeSubagentLogs,
    subagents: stream.values.subagents ?? {},
    email: stream.values.email,
    ui: stream.values.ui,
    setFiles,
    messages, // ✅ 使用合并后的 messages
    isLoading: stream.isLoading || isPolling,
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
