"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Square,
  ArrowUp,
  AlertCircle,
} from "lucide-react";
import { ChatMessage } from "@/app/components/ChatMessage";
import { ExecutionStatusBar } from "@/app/components/ExecutionStatusBar";
import type {
  ToolCall,
  ActionRequest,
  ReviewConfig,
} from "@/app/types/types";
import { Assistant, Message } from "@langchain/langgraph-sdk";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { useStickToBottom } from "use-stick-to-bottom";
import { useInterruptNotification } from "@/app/hooks/useInterruptNotification";

interface ChatInterfaceProps {
  assistant: Assistant | null;
}

export const ChatInterface = React.memo<ChatInterfaceProps>(({ assistant }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [input, setInput] = useState("");
  const { scrollRef, contentRef } = useStickToBottom();

  const {
    stream,
    messages,
    ui,
    isLoading,
    isThreadLoading,
    interrupt,
    sendMessage,
    stopStream,
    resumeInterrupt,
  } = useChatContext();

  // Notify user when interrupt occurs on background tab
  useInterruptNotification(interrupt);

  const submitDisabled = isLoading || !assistant;

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      const messageText = input.trim();
      if (!messageText || isLoading || submitDisabled) return;
      sendMessage(messageText);
      setInput("");
    },
    [input, isLoading, sendMessage, setInput, submitDisabled]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (submitDisabled) return;
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, submitDisabled]
  );

  // TODO: can we make this part of the hook?
  const processedMessages = useMemo(() => {
    /*
     1. Loop through all messages
     2. For each AI message, add the AI message, and any tool calls to the messageMap
     3. For each tool message, find the corresponding tool call in the messageMap and update the status and output
    */
    const messageMap = new Map<
      string,
      { message: Message; toolCalls: ToolCall[] }
    >();
    messages.forEach((message: Message) => {
      if (message.type === "ai") {
        const toolCallsInMessage: Array<{
          id?: string;
          function?: { name?: string; arguments?: unknown };
          name?: string;
          type?: string;
          args?: unknown;
          input?: unknown;
        }> = [];
        if (
          message.additional_kwargs?.tool_calls &&
          Array.isArray(message.additional_kwargs.tool_calls)
        ) {
          toolCallsInMessage.push(...message.additional_kwargs.tool_calls);
        } else if (message.tool_calls && Array.isArray(message.tool_calls)) {
          toolCallsInMessage.push(
            ...message.tool_calls.filter(
              (toolCall: { name?: string }) => toolCall.name !== ""
            )
          );
        } else if (Array.isArray(message.content)) {
          const toolUseBlocks = message.content.filter(
            (block: { type?: string }) => block.type === "tool_use"
          );
          toolCallsInMessage.push(...toolUseBlocks);
        }
        const toolCallsWithStatus = toolCallsInMessage.map(
          (toolCall: {
            id?: string;
            function?: { name?: string; arguments?: unknown };
            name?: string;
            type?: string;
            args?: unknown;
            input?: unknown;
          }) => {
            const name =
              toolCall.function?.name ||
              toolCall.name ||
              toolCall.type ||
              "unknown";
            const args =
              toolCall.function?.arguments ||
              toolCall.args ||
              toolCall.input ||
              {};
            return {
              id: toolCall.id || `tool-${Math.random()}`,
              name,
              args,
              status: interrupt ? "interrupted" : ("pending" as const),
            } as ToolCall;
          }
        );
        messageMap.set(message.id!, {
          message,
          toolCalls: toolCallsWithStatus,
        });
      } else if (message.type === "tool") {
        const toolCallId = message.tool_call_id;
        if (!toolCallId) {
          return;
        }
        for (const [, data] of messageMap.entries()) {
          const toolCallIndex = data.toolCalls.findIndex(
            (tc: ToolCall) => tc.id === toolCallId
          );
          if (toolCallIndex === -1) {
            continue;
          }
          data.toolCalls[toolCallIndex] = {
            ...data.toolCalls[toolCallIndex],
            status: "completed" as const,
            result: extractStringFromMessageContent(message),
          };
          break;
        }
      } else if (message.type === "human") {
        messageMap.set(message.id!, {
          message,
          toolCalls: [],
        });
      }
    });
    const processedArray = Array.from(messageMap.values());
    return processedArray.map((data, index) => {
      const prevMessage = index > 0 ? processedArray[index - 1].message : null;
      return {
        ...data,
        showAvatar: data.message.type !== prevMessage?.type,
      };
    });
  }, [messages, interrupt]);

  // Parse out any action requests or review configs from the interrupt
  const actionRequestsMap: Map<string, ActionRequest> | null = useMemo(() => {
    const actionRequests =
      interrupt?.value && (interrupt.value as any)["action_requests"];
    if (!actionRequests) return new Map<string, ActionRequest>();
    return new Map(actionRequests.map((ar: ActionRequest) => [ar.name, ar]));
  }, [interrupt]);

  const reviewConfigsMap: Map<string, ReviewConfig> | null = useMemo(() => {
    const reviewConfigs =
      interrupt?.value && (interrupt.value as any)["review_configs"];
    if (!reviewConfigs) return new Map<string, ReviewConfig>();
    return new Map(
      reviewConfigs.map((rc: ReviewConfig) => [rc.actionName, rc])
    );
  }, [interrupt]);

  // Extract current execution info for the status bar
  const currentExecutionInfo = useMemo(() => {
    if (!isLoading) return { step: null, tool: null };

    // Check if the last message is an AI message with tool calls in progress
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.type === "ai" && lastMsg.tool_calls?.length) {
      const pendingTool = lastMsg.tool_calls.find(
        (tc: { name?: string }) => tc.name && tc.name !== ""
      );
      if (pendingTool) {
        return {
          step: null,
          tool: pendingTool.name,
        };
      }
    }

    return { step: null, tool: null };
  }, [isLoading, messages]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        ref={scrollRef}
      >
        <div
          className="mx-auto w-full max-w-[1024px] px-6 pb-6 pt-4"
          ref={contentRef}
        >
          {isThreadLoading ? (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              {processedMessages.map((data, index) => {
                const messageUi = ui?.filter(
                  (u: any) => u.metadata?.message_id === data.message.id
                );
                const isLastMessage = index === processedMessages.length - 1;
                return (
                  <div key={data.message.id} data-last-message={isLastMessage ? "" : undefined}>
                    <ChatMessage
                      message={data.message}
                      toolCalls={data.toolCalls}
                      isLoading={isLoading}
                      isStreaming={isLoading && isLastMessage && data.message.type === "ai"}
                      actionRequestsMap={
                        isLastMessage ? actionRequestsMap : undefined
                      }
                      reviewConfigsMap={
                        isLastMessage ? reviewConfigsMap : undefined
                      }
                      ui={messageUi}
                      stream={stream}
                      onResumeInterrupt={resumeInterrupt}
                      graphId={assistant?.graph_id}
                    />
                  </div>
                );
              })}
              {/* Streaming indicator — shows when agent is loading but no AI content yet */}
              {isLoading && processedMessages.length > 0 && (() => {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg?.type === "ai") {
                  const content = extractStringFromMessageContent(lastMsg);
                  if (!content?.trim()) {
                    return (
                      <div className="mt-4 flex items-start gap-2 px-1">
                        <div className="flex items-center gap-1.5 rounded-lg px-3 py-2">
                          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/60" />
                          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/40" style={{ animationDelay: "0.2s" }} />
                          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/20" style={{ animationDelay: "0.4s" }} />
                        </div>
                      </div>
                    );
                  }
                }
                return null;
              })()}
            </>
          )}
        </div>
      </div>

      <ExecutionStatusBar
        isLoading={isLoading}
        currentStep={currentExecutionInfo.step}
        currentTool={currentExecutionInfo.tool}
      />

      {/* Interrupt Banner — shows when agent needs human approval */}
      {interrupt && (
        <div className="flex items-center gap-3 border-b border-orange-300/30 bg-orange-50 px-4 py-2.5 dark:border-orange-500/20 dark:bg-orange-950/30">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
            <AlertCircle size={14} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1 text-sm">
            <span className="font-medium text-orange-800 dark:text-orange-200">
              Action required
            </span>
            <span className="ml-1 text-orange-600 dark:text-orange-400">
              — The agent is waiting for your approval above
            </span>
          </div>
          <button
            onClick={() => {
              // Scroll to the interrupt tool call
              const lastMessage = document.querySelector("[data-last-message]");
              lastMessage?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="flex-shrink-0 rounded-md border border-orange-300 bg-white px-3 py-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-50 dark:border-orange-600 dark:bg-orange-900/50 dark:text-orange-300"
          >
            Review
          </button>
        </div>
      )}

      <div className="flex-shrink-0 bg-background">
        <div
          className={cn(
            "mx-4 mb-6 flex flex-shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-background",
            "mx-auto w-[calc(100%-32px)] max-w-[1024px] transition-colors duration-200 ease-in-out"
          )}
        >
          <form
            onSubmit={handleSubmit}
            className="flex flex-col"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Running..." : "Write your message..."}
              className="font-inherit field-sizing-content flex-1 resize-none border-0 bg-transparent px-[18px] pb-[13px] pt-[14px] text-sm leading-7 text-primary outline-none placeholder:text-tertiary"
              rows={1}
            />
            <div className="flex justify-between gap-2 p-3">
              <div className="flex justify-end gap-2">
                <Button
                  type={isLoading ? "button" : "submit"}
                  variant={isLoading ? "destructive" : "default"}
                  onClick={isLoading ? stopStream : handleSubmit}
                  disabled={!isLoading && (submitDisabled || !input.trim())}
                >
                  {isLoading ? (
                    <>
                      <Square size={14} />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <ArrowUp size={18} />
                      <span>Send</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
