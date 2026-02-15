"use client";

import React, {
  useState,
  useRef,
  useCallback,
  useMemo,
  FormEvent,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Square,
  ArrowUp,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { FileUploadZone, UploadButton, FileChipData } from "./FileUploadZone";
import { ChatMessage } from "@/app/components/ChatMessage";
import { ExecutionStatusBar } from "@/app/components/ExecutionStatusBar";
import type {
  ToolCall,
  ActionRequest,
  ReviewConfig,
  FileMetadata,
} from "@/app/types/types";
import { Assistant, Message } from "@langchain/langgraph-sdk";
import { extractStringFromMessageContent } from "@/app/utils/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { cn } from "@/lib/utils";
import { useStickToBottom } from "use-stick-to-bottom";
import { useInterruptNotification } from "@/app/hooks/useInterruptNotification";
import { FileViewDialog } from "@/app/components/FileViewDialog";
import { useQueryState } from "nuqs";

interface ChatInterfaceProps {
  assistant: Assistant | null;
}

export const ChatInterface = React.memo<ChatInterfaceProps>(({ assistant }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputPanelRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<FileChipData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedHeight, setExpandedHeight] = useState<number | null>(null);
  const { scrollRef, contentRef } = useStickToBottom();
  const [threadId] = useQueryState("threadId");
  const [, setContextPanel] = useQueryState("context");
  const [, setContextTab] = useQueryState("contextTab");

  // File viewing and delivery card state
  const [fileMetadata, setFileMetadata] = useState<Map<string, FileMetadata>>(new Map());
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [showDelivery, setShowDelivery] = useState(false);
  const prevFilesRef = useRef<Record<string, string>>({});
  const wasLoadingRef = useRef(false);

  // Height constants
  const LINE_HEIGHT = 24; // leading-6 = 24px
  const MIN_HEIGHT = 44; // Single line min height
  const AUTO_MAX_LINES = 8; // Max lines before auto-expand stops
  const AUTO_MAX_HEIGHT = MIN_HEIGHT + (AUTO_MAX_LINES - 1) * LINE_HEIGHT; // ~212px
  const TOOLBAR_HEIGHT = 44; // Toolbar + padding

  // Calculate expanded height (fill remaining space in the middle column)
  useEffect(() => {
    if (isExpanded && containerRef.current && inputPanelRef.current) {
      const containerHeight = containerRef.current.clientHeight;
      // Expanded height = container height - toolbar height - some margin
      const calculatedHeight = containerHeight - TOOLBAR_HEIGHT - 16;
      setExpandedHeight(Math.max(calculatedHeight, MIN_HEIGHT));
    } else {
      setExpandedHeight(null);
    }
  }, [isExpanded]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (isExpanded && expandedHeight) {
      // Expanded mode: use fixed expanded height
      textarea.style.height = `${expandedHeight}px`;
      textarea.style.overflowY = "auto";
    } else {
      // Auto-expand mode: calculate based on content
      textarea.style.height = "auto";
      const newHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), AUTO_MAX_HEIGHT);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > AUTO_MAX_HEIGHT ? "auto" : "hidden";
    }
  }, [input, isExpanded, expandedHeight, AUTO_MAX_HEIGHT, MIN_HEIGHT]);

  // Reset to compact mode when input is cleared
  useEffect(() => {
    if (!input.trim()) {
      setIsExpanded(false);
    }
  }, [input]);

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
    regenerateLastMessage,
    files,
    setFiles,
  } = useChatContext();

  // Notify user when interrupt occurs on background tab
  useInterruptNotification(interrupt);

  // Track file metadata when files change
  useEffect(() => {
    const currentFilePaths = new Set(Object.keys(files));

    setFileMetadata((prev) => {
      const newMetadata = new Map(prev);

      // Add metadata for new files
      Object.keys(files).forEach((path) => {
        if (!prevFilesRef.current[path]) {
          // New file added
          const ext = path.split(".").pop() || "";
          newMetadata.set(path, {
            path,
            name: path.split("/").pop() || path,
            directory: path.split("/").slice(0, -1).join("/"),
            addedAt: Date.now(),
            size: files[path].length,
            extension: ext,
          });
        }
      });

      // Remove metadata for deleted files
      prev.forEach((_, path) => {
        if (!currentFilePaths.has(path)) {
          newMetadata.delete(path);
        }
      });

      return newMetadata;
    });

    prevFilesRef.current = files;
  }, [files]);

  // Detect task completion for delivery cards
  useEffect(() => {
    if (isLoading) {
      // Reset when new task starts
      setShowDelivery(false);
    } else if (wasLoadingRef.current) {
      // Task just completed
      setShowDelivery(true);
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading]);

  const submitDisabled = isLoading || !assistant;

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      if (e) {
        e.preventDefault();
      }
      const messageText = input.trim();
      if (!messageText || isLoading || !assistant) return;

      // Build content - text + image blocks (only images are supported by the SDK)
      const imageFiles = attachedFiles.filter((f): f is FileChipData & { data: string } =>
        f.type.startsWith("image/") && typeof f.data === "string"
      );
      const content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> =
        imageFiles.length > 0
          ? [
              { type: "text", text: messageText },
              ...imageFiles.map((file) => ({
                type: "image_url" as const,
                image_url: { url: file.data },
              })),
            ]
          : messageText;

      sendMessage(content);
      setInput("");
      setAttachedFiles([]);
    },
    [input, isLoading, sendMessage, setInput, assistant, attachedFiles]
  );

  const triggerUpload = useCallback(() => {
    uploadInputRef.current?.click();
  }, []);

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

  const handleEditAndResend = useCallback(
    (newContent: string) => {
      sendMessage(newContent);
    },
    [sendMessage]
  );

  const handleViewFile = useCallback((path: string) => {
    setViewingFile(path);
  }, []);

  const handleViewAllFiles = useCallback(() => {
    // Open ContextPanel with Files tab
    setContextPanel("1");
    setContextTab("files");
  }, [setContextPanel, setContextTab]);

  const handleSaveFile = useCallback(
    async (fileName: string, content: string) => {
      await setFiles({ ...files, [fileName]: content });
      setViewingFile(null);
    },
    [files, setFiles]
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
    <div ref={containerRef} className="flex flex-1 flex-col overflow-hidden">
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
                      isLastAiMessage={isLastMessage && data.message.type === "ai"}
                      onRegenerate={regenerateLastMessage}
                      onEditAndResend={data.message.type === "human" ? handleEditAndResend : undefined}
                      files={isLastMessage ? files : undefined}
                      fileMetadata={fileMetadata}
                      onViewFile={handleViewFile}
                      onViewAllFiles={handleViewAllFiles}
                      showDeliveryCards={isLastMessage && showDelivery && data.message.type === "ai"}
                      threadId={threadId ?? undefined}
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

      {/* Input Panel */}
      <div ref={inputPanelRef} className="flex-shrink-0 bg-background p-4 pt-2">
        <div
          className={cn(
            "mx-auto flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm",
            "w-full max-w-[1024px] transition-all duration-200 ease-out"
          )}
        >
          <form
            onSubmit={handleSubmit}
            className="flex flex-col"
          >
            {/* File Upload Zone */}
            <FileUploadZone
              files={attachedFiles}
              onFilesChange={setAttachedFiles}
              disabled={isLoading || !!interrupt}
              inputRef={uploadInputRef}
            />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isLoading
                  ? "Running..."
                  : interrupt
                  ? "Agent is waiting for approval above ↑"
                  : "Write your message..."
              }
              disabled={!!interrupt}
              className={cn(
                "w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground/50",
                interrupt && "cursor-not-allowed opacity-50"
              )}
              rows={1}
            />

            {/* Toolbar: Upload + Expand + Hints + Button */}
            <div className="flex items-center justify-between border-t border-border/50 px-3 py-2">
              {/* Left: Upload + Expand button + hint */}
              <div className="flex items-center gap-2">
                <UploadButton
                  onClick={triggerUpload}
                  disabled={isLoading || !!interrupt}
                />
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  disabled={!input.trim()}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors",
                    "hover:bg-accent hover:text-foreground",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    isExpanded && "bg-accent text-foreground"
                  )}
                  title={isExpanded ? "Collapse to 8 lines" : "Expand to 16 lines"}
                >
                  {isExpanded ? (
                    <Minimize2 size={14} />
                  ) : (
                    <Maximize2 size={14} />
                  )}
                </button>
                <span className="text-[10px] text-muted-foreground/60">
                  Shift+Enter
                </span>
              </div>

              {/* Right: Char count + Send button */}
              <div className="flex items-center gap-3">
                {input.length > 500 && (
                  <span className="text-[10px] tabular-nums text-muted-foreground/60">
                    {input.length.toLocaleString()}
                  </span>
                )}
                <Button
                  type={isLoading ? "button" : "submit"}
                  variant={isLoading ? "destructive" : "default"}
                  size="sm"
                  onClick={isLoading ? stopStream : undefined}
                  disabled={!isLoading && (submitDisabled || !input.trim())}
                  className="h-7 px-3 text-xs"
                >
                  {isLoading ? (
                    <>
                      <Square size={12} className="mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <ArrowUp size={14} className="mr-1" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* File viewer dialog */}
      {viewingFile && files[viewingFile] && (
        <FileViewDialog
          file={{ path: viewingFile, content: files[viewingFile] }}
          onSaveFile={handleSaveFile}
          onClose={() => setViewingFile(null)}
          editDisabled={isLoading || !!interrupt}
        />
      )}
    </div>
  );
});

ChatInterface.displayName = "ChatInterface";
