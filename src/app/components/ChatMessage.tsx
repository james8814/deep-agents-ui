"use client";

import React, { useMemo, useState, useCallback } from "react";
import { SubAgentIndicator } from "@/app/components/SubAgentIndicator";
import { SubAgentThoughtChain } from "@/app/components/SubAgentThoughtChain";
import { ToolCallBox } from "@/app/components/ToolCallBox";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import { AntdXMarkdown } from "@/app/components/AntdXMarkdown";
import { DeliveryCard } from "@/app/components/DeliveryCard";
import { useFeatureFlag } from "@/lib/featureFlags";
import type {
  SubAgent,
  ToolCall,
  ActionRequest,
  ReviewConfig,
  FileMetadata,
  AttachmentSummary,
} from "@/app/types/types";
import { isSchemaVersionCompatible } from "@/app/types/types";
import { Message } from "@langchain/langgraph-sdk";
import {
  extractSubAgentContent,
  extractStringFromMessageContent,
  copyToClipboard,
} from "@/app/utils/utils";
import {
  Copy,
  Check,
  RefreshCw,
  Pencil,
  X,
  Image,
  FileText,
  AlertCircle,
  Clock,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatMessageProps {
  message: Message;
  toolCalls: ToolCall[];
  isLoading?: boolean;
  isStreaming?: boolean;
  actionRequestsMap?: Map<string, ActionRequest>;
  reviewConfigsMap?: Map<string, ReviewConfig>;
  ui?: any[];
  stream?: any;
  onResumeInterrupt?: (value: any) => void;
  graphId?: string;
  isLastAiMessage?: boolean;
  onRegenerate?: () => void;
  onEditAndResend?: (newContent: string) => void;
  files?: Record<string, string>;
  fileMetadata?: Map<string, FileMetadata>;
  onViewFile?: (path: string) => void;
  onViewAllFiles?: () => void;
  showDeliveryCards?: boolean;
  threadId?: string;
  // Phase 2.5 support
  schemaVersion?: string;
  attachmentSummaries?: AttachmentSummary[];
  cancellationReason?: string;
  timeoutSeconds?: number;
}

// Stable no-op function to avoid creating new references on each render
const NOOP = () => {};

// Helper to check if content is multimodal (array of content blocks)
const isMultimodalContent = (
  content: unknown
): content is Array<{
  type: string;
  text?: string;
  image_url?: { url: string };
  source?: { type: string; media_type: string; data: string };
  filename?: string;
}> => {
  return Array.isArray(content);
};

export const ChatMessage = React.memo<ChatMessageProps>(
  ({
    message,
    toolCalls,
    isLoading,
    isStreaming,
    actionRequestsMap,
    reviewConfigsMap,
    ui,
    stream,
    onResumeInterrupt,
    graphId,
    isLastAiMessage,
    onRegenerate,
    onEditAndResend,
    files,
    fileMetadata,
    onViewFile,
    onViewAllFiles,
    showDeliveryCards,
    threadId,
    schemaVersion,
    attachmentSummaries,
    cancellationReason,
    timeoutSeconds,
  }) => {
    const useAntdxMarkdown = useFeatureFlag("USE_ANTDX_MARKDOWN");
    const useAntdxSubAgent = useFeatureFlag("USE_ANTDX_SUB_AGENT");
    const isUser = message.type === "human";
    const messageContent = extractStringFromMessageContent(message);
    const hasContent = messageContent && messageContent.trim() !== "";
    const hasToolCalls = toolCalls.length > 0;

    // Edit state for user messages
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(messageContent);
    const subAgents = useMemo(() => {
      return toolCalls
        .filter((toolCall: ToolCall) => {
          return (
            toolCall.name === "task" &&
            toolCall.args["subagent_type"] &&
            toolCall.args["subagent_type"] !== "" &&
            toolCall.args["subagent_type"] !== null
          );
        })
        .map((toolCall: ToolCall) => {
          const subagentType = (toolCall.args as Record<string, unknown>)[
            "subagent_type"
          ] as string;
          return {
            id: toolCall.id,
            name: toolCall.name,
            subAgentName: subagentType,
            input: toolCall.args,
            output: toolCall.result ? { result: toolCall.result } : undefined,
            status: toolCall.status,
          } as SubAgent;
        });
    }, [toolCalls]);

    // Memoize delivery files to prevent unnecessary re-renders
    // Sort by creation time (newest first) and take last 3 files
    const deliveryFiles = useMemo(() => {
      if (!files) return [];
      const fileEntries = Object.entries(files).map(([path, content]) => ({
        path,
        content,
        metadata: fileMetadata?.get(path),
        shareUrl: threadId
          ? `${
              typeof window !== "undefined" ? window.location.origin : ""
            }/threads/${threadId}/files/${encodeURIComponent(path)}`
          : undefined,
      }));

      // Sort by addedAt time (newest first)
      return fileEntries
        .sort((a, b) => {
          const timeA = a.metadata?.addedAt || 0;
          const timeB = b.metadata?.addedAt || 0;
          return timeB - timeA; // Descending order (newest first)
        })
        .slice(0, 3); // Take last 3 (most recent)
    }, [files, fileMetadata, threadId]);

    const [_setExpandedSubAgents] = useState<Record<string, boolean>>({});
    const [expandedSubAgentId, setExpandedSubAgentId] = useState<string | null>(
      null
    );
    const isSubAgentExpanded = useCallback(
      (id: string) => expandedSubAgentId === id,
      [expandedSubAgentId]
    );
    const toggleSubAgent = useCallback((id: string) => {
      setExpandedSubAgentId((currentId) => (currentId === id ? null : id));
    }, []);

    // Copy button state
    const [copied, setCopied] = useState(false);
    const handleCopy = useCallback(() => {
      copyToClipboard(messageContent).then((ok) => {
        if (ok) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      });
    }, [messageContent]);

    return (
      <div
        className={cn(
          "flex w-full max-w-full overflow-x-hidden",
          isUser && "flex-row-reverse"
        )}
      >
        <div
          className={cn(
            "min-w-0 max-w-full",
            isUser ? "max-w-[70%]" : "group w-full"
          )}
        >
          {/* Edit button for user messages - shows on hover */}
          {isUser && hasContent && !isLoading && !isEditing && (
            <button
              onClick={() => {
                setIsEditing(true);
                setEditContent(messageContent);
              }}
              className="absolute -left-8 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
              title="Edit message"
            >
              <Pencil size={12} />
            </button>
          )}

          {/* Editing UI for user messages */}
          {isUser && isEditing ? (
            <div className="mt-4 w-full max-w-[100%]">
              <textarea
                name="edit-message"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm"
                rows={3}
                autoFocus
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1 rounded-md px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
                >
                  <X size={12} />
                  Cancel
                </button>
                <Button
                  size="sm"
                  onClick={() => {
                    onEditAndResend?.(editContent);
                    setIsEditing(false);
                  }}
                  disabled={!editContent.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          ) : hasContent ? (
            <div className={cn("group relative flex items-end gap-0")}>
              <div
                className={cn(
                  "mt-4 overflow-hidden break-words text-sm font-normal leading-[150%]",
                  isUser
                    ? "rounded-xl rounded-br-none border border-border px-3 py-2 text-foreground"
                    : "text-primary"
                )}
                style={
                  isUser
                    ? { backgroundColor: "var(--color-user-message-bg)" }
                    : undefined
                }
              >
                {isUser ? (
                  isMultimodalContent(message.content) ? (
                    <div className="space-y-2">
                      {/* Text parts */}
                      {message.content
                        .filter((b) => b.type === "text")
                        .map((block, i) => (
                          <div
                            key={i}
                            className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed"
                          >
                            {block.text}
                          </div>
                        ))}
                      {/* Image/file attachment indicators */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.content
                          .filter(
                            (b) => b.type === "image_url" || b.type === "file"
                          )
                          .map((block, i) => {
                            if (block.type === "image_url") {
                              return (
                                <div
                                  key={i}
                                  className="flex items-center gap-2 rounded border border-border bg-muted/50 px-2 py-1 text-sm"
                                >
                                  <Image
                                    size={14}
                                    className="text-muted-foreground"
                                  />
                                  <span>Image attachment</span>
                                </div>
                              );
                            }
                            // File attachment with filename
                            const filename =
                              (block as { filename?: string }).filename ||
                              "File";
                            const _mediaType =
                              (block as { source?: { media_type?: string } })
                                .source?.media_type || "";
                            const fileExt =
                              filename.split(".").pop()?.toUpperCase() ||
                              "FILE";
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-2 rounded border border-border bg-muted/50 px-2 py-1 text-sm"
                              >
                                <FileText
                                  size={14}
                                  className="text-muted-foreground"
                                />
                                <span
                                  className="max-w-[150px] truncate"
                                  title={filename}
                                >
                                  {filename}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({fileExt})
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  ) : (
                    <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {messageContent}
                    </p>
                  )
                ) : hasContent ? (
                  useAntdxMarkdown ? (
                    <AntdXMarkdown
                      content={messageContent}
                      isStreaming={isStreaming}
                    />
                  ) : (
                    <MarkdownContent
                      content={messageContent}
                      isStreaming={isStreaming}
                    />
                  )
                ) : null}
              </div>

              {/* Copy button — hover triggered, all messages with content */}
              {hasContent && !isStreaming && (
                <button
                  onClick={handleCopy}
                  className={cn(
                    "absolute -top-0 flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground opacity-0 shadow-sm transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100",
                    isUser ? "-left-16" : "right-0"
                  )}
                  title="Copy message"
                >
                  {copied ? (
                    <>
                      <Check
                        size={12}
                        className="text-success"
                      />
                      <span>已复制到剪贴板</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>复制</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : null}

          {/* Regenerate button for last AI message */}
          {!isUser &&
            isLastAiMessage &&
            !isLoading &&
            !isStreaming &&
            hasContent &&
            onRegenerate && (
              <div className="mt-2 flex gap-1">
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <RefreshCw size={12} />
                  重新生成回复
                </button>
              </div>
            )}

          {/* Schema version warning */}
          {schemaVersion && !isSchemaVersionCompatible(schemaVersion) && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle
                size={16}
                className="mt-0.5 flex-shrink-0"
              />
              <div>
                <p className="font-semibold">Schema Version Incompatible</p>
                <p className="text-xs">
                  Message uses schema v{schemaVersion}. Some features may not
                  display correctly.
                </p>
              </div>
            </div>
          )}

          {/* Cancellation/Timeout info */}
          {(cancellationReason || timeoutSeconds !== undefined) && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle
                size={16}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1">
                {cancellationReason && (
                  <p className="font-semibold">
                    Tool Execution Cancelled: {cancellationReason}
                  </p>
                )}
                {timeoutSeconds !== undefined && (
                  <p className="flex items-center gap-1 text-xs">
                    <Clock size={12} />
                    Timeout after {timeoutSeconds}s
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Attachment summaries */}
          {attachmentSummaries && attachmentSummaries.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                File Attachments
              </p>
              {attachmentSummaries.map((attachment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border border-border bg-muted/50 p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate font-medium"
                      title={attachment.path}
                    >
                      {attachment.path.split("/").pop()}
                    </p>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>
                        {(attachment.size_bytes / 1024).toFixed(2)} KB
                      </span>
                      <span>{attachment.mime_type}</span>
                      {attachment.hash_sha256 && (
                        <span
                          title={attachment.hash_sha256}
                          className="truncate"
                        >
                          SHA256: {attachment.hash_sha256.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-2 flex flex-shrink-0 gap-1">
                    {attachment.preview_url && (
                      <a
                        href={attachment.preview_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded p-1 hover:bg-accent"
                        title="Preview"
                      >
                        <Image size={14} />
                      </a>
                    )}
                    {attachment.download_url && (
                      <a
                        href={attachment.download_url}
                        download
                        className="rounded p-1 hover:bg-accent"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasToolCalls && (
            <div className="mt-4 flex w-full flex-col">
              {toolCalls.map((toolCall: ToolCall) => {
                if (toolCall.name === "task") return null;
                const toolCallGenUiComponent = ui?.find(
                  (u) => u.metadata?.tool_call_id === toolCall.id
                );
                const actionRequest = actionRequestsMap?.get(toolCall.name);
                const reviewConfig = reviewConfigsMap?.get(toolCall.name);
                return (
                  <ToolCallBox
                    key={toolCall.id}
                    toolCall={toolCall}
                    uiComponent={toolCallGenUiComponent}
                    stream={stream}
                    graphId={graphId}
                    actionRequest={actionRequest}
                    reviewConfig={reviewConfig}
                    onResume={onResumeInterrupt}
                    isLoading={isLoading}
                  />
                );
              })}
            </div>
          )}
          {!isUser && subAgents.length > 0 && (
            <div className="flex w-fit max-w-full flex-col gap-4">
              {useAntdxSubAgent ? (
                /* Ant Design X ThoughtChain implementation */
                <SubAgentThoughtChain
                  subAgents={subAgents}
                  isLoading={isLoading}
                  expandedSubAgentId={expandedSubAgentId}
                  onToggleExpand={toggleSubAgent}
                />
              ) : (
                /* Legacy SubAgentIndicator implementation */
                <div className="flex w-fit max-w-full flex-col gap-4">
                  {subAgents.map((subAgent) => (
                    <div
                      key={subAgent.id}
                      className="flex w-full flex-col gap-2"
                    >
                      <div className="flex items-end gap-2">
                        <div className="w-[calc(100%-100px)]">
                          <SubAgentIndicator
                            subAgent={subAgent}
                            onClick={() => toggleSubAgent(subAgent.id)}
                            isExpanded={isSubAgentExpanded(subAgent.id)}
                          />
                        </div>
                      </div>
                      {isSubAgentExpanded(subAgent.id) && (
                        <div className="w-full max-w-full">
                          <div className="rounded-md border border-border bg-muted p-4">
                            <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
                              Input
                            </h4>
                            <div className="mb-4">
                              {useAntdxMarkdown ? (
                                <AntdXMarkdown
                                  content={extractSubAgentContent(
                                    subAgent.input
                                  )}
                                />
                              ) : (
                                <MarkdownContent
                                  content={extractSubAgentContent(
                                    subAgent.input
                                  )}
                                />
                              )}
                            </div>
                            {subAgent.output && (
                              <>
                                <h4 className="text-primary/70 mb-2 text-xs font-semibold uppercase tracking-wider">
                                  Output
                                </h4>
                                {useAntdxMarkdown ? (
                                  <AntdXMarkdown
                                    content={extractSubAgentContent(
                                      subAgent.output
                                    )}
                                  />
                                ) : (
                                  <MarkdownContent
                                    content={extractSubAgentContent(
                                      subAgent.output
                                    )}
                                  />
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Delivery cards - show for AI messages with delivered files */}
          {message.type === "ai" &&
            showDeliveryCards &&
            deliveryFiles.length > 0 && (
              <DeliveryCard
                files={deliveryFiles}
                onViewFile={onViewFile || NOOP}
                onViewAll={onViewAllFiles}
              />
            )}
        </div>
      </div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";
