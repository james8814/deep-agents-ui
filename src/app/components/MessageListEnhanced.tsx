"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Message } from "@langchain/langgraph-sdk";
import { Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "./MarkdownContent";
import type { ToolCall } from "@/app/types/types";

interface CodeBlockMeta {
  language?: string;
  filename?: string;
}

interface MessageItemEnhancedProps {
  message: Message;
  toolCalls?: ToolCall[];
  isLoading?: boolean;
  isStreaming?: boolean;
  showAvatar?: boolean;
  onEditAndResend?: (content: string) => void;
  onViewToolCall?: (toolCall: ToolCall) => void;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

// Code block component with copy functionality
const CodeBlock: React.FC<CodeBlockProps> = React.memo(
  ({ code, language = "plaintext", filename }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(code);
      setIsCopied(true);

      // Analytics
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag("event", "code_block_copied", {
          language,
          code_length: code.length,
        });
      }

      setTimeout(() => setIsCopied(false), 2000);
    }, [code, language]);

    return (
      <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/40">
        {/* Header with language badge and filename */}
        {(language || filename) && (
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/60 px-3 py-2">
            <div className="flex items-center gap-2">
              {filename && (
                <span
                  className="text-xs font-semibold text-foreground"
                  title={filename}
                >
                  {filename}
                </span>
              )}
              {language && (
                <span
                  className={cn(
                    "inline-block rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    "bg-muted text-muted-foreground"
                  )}
                >
                  {language}
                </span>
              )}
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-all",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-accent/50",
                isCopied && "text-green-600 dark:text-green-400"
              )}
              title="Copy code to clipboard"
              aria-label={`Copy ${language} code`}
            >
              {isCopied ? (
                <>
                  <Check
                    size={12}
                    className="mr-1 inline"
                  />
                  Copied
                </>
              ) : (
                <>
                  <Copy
                    size={12}
                    className="mr-1 inline"
                  />
                  Copy
                </>
              )}
            </button>
          </div>
        )}

        {/* Code content */}
        <div className="overflow-x-auto">
          <pre className="m-0 whitespace-pre-wrap break-words p-3 font-mono text-xs leading-6 text-foreground">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    );
  }
);

CodeBlock.displayName = "CodeBlock";

// Collapsible long message component
interface CollapsibleMessageProps {
  content: string;
  maxLines?: number;
}

const CollapsibleMessage: React.FC<CollapsibleMessageProps> = React.memo(
  ({ content, maxLines = 20 }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const lines = content.split("\n");
    const isLong = lines.length > maxLines;
    const displayContent = isExpanded
      ? content
      : lines.slice(0, maxLines).join("\n");
    const hiddenLineCount = lines.length - maxLines;

    if (!isLong) {
      return <MarkdownContent content={content} />;
    }

    return (
      <div className="space-y-2">
        <div
          className={cn(
            "prose prose-sm dark:prose-invert max-w-none",
            !isExpanded && "max-h-[400px] overflow-hidden"
          )}
        >
          <MarkdownContent content={displayContent} />
        </div>

        {!isExpanded && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent" />
        )}

        <button
          onClick={() => {
            setIsExpanded(!isExpanded);

            // Analytics
            if (typeof window !== "undefined" && (window as any).gtag) {
              (window as any).gtag("event", "message_expanded", {
                line_count: lines.length,
                expanded: !isExpanded,
              });
            }
          }}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-1 rounded-md",
            "border border-border/50 bg-muted/30 px-3 py-2",
            "text-xs font-medium text-muted-foreground hover:text-foreground",
            "transition-colors hover:bg-muted/50"
          )}
          aria-expanded={isExpanded}
          aria-controls="message-content"
        >
          {isExpanded ? (
            <>
              <ChevronUp size={14} />
              Show less ({maxLines} lines)
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              Show more ({hiddenLineCount} more lines)
            </>
          )}
        </button>
      </div>
    );
  }
);

CollapsibleMessage.displayName = "CollapsibleMessage";

// Main message list component
export const MessageListEnhanced = React.memo<{
  messages: Message[];
  isLoading?: boolean;
  onEditAndResend?: (content: string) => void;
}>(({ messages, isLoading, onEditAndResend }) => {
  const processedMessages = useMemo(() => {
    return messages.map((msg) => {
      let content = "";
      const toolCalls: ToolCall[] = [];

      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        content = msg.content
          .map((block: any) => {
            if (block.type === "text" && block.text) {
              return block.text;
            }
            return "";
          })
          .filter(Boolean)
          .join("\n");
      }

      return {
        id: msg.id,
        type: msg.type,
        content,
        toolCalls,
        timestamp: msg.name ? new Date(msg.name).getTime() : Date.now(),
      };
    });
  }, [messages]);

  return (
    <div className="flex flex-col gap-4 space-y-3">
      {processedMessages.map((msg, idx) => {
        const isUser = msg.type === "human";
        const isLast = idx === processedMessages.length - 1;

        return (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-4 py-2",
                isUser
                  ? "text-primary-foreground bg-primary"
                  : "bg-muted/50 text-foreground"
              )}
            >
              <div className="space-y-2">
                <CollapsibleMessage
                  content={msg.content}
                  maxLines={20}
                />

                {isLoading && isLast && !isUser && (
                  <div className="flex items-center gap-1">
                    <span className="bg-current/60 inline-block h-2 w-2 animate-pulse rounded-full" />
                    <span
                      className="bg-current/40 inline-block h-2 w-2 animate-pulse rounded-full"
                      style={{ animationDelay: "0.2s" }}
                    />
                    <span
                      className="bg-current/20 inline-block h-2 w-2 animate-pulse rounded-full"
                      style={{ animationDelay: "0.4s" }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

MessageListEnhanced.displayName = "MessageListEnhanced";

export { CodeBlock, CollapsibleMessage };
