"use client";

import React, { useMemo } from "react";
import { Bubble } from "@ant-design/x";
import { MessageCircle } from "lucide-react";
import type { Message } from "@langchain/langgraph-sdk";
import {
  convertMessagesToBubbles,
  type ConvertedBubbleItem,
} from "@/app/utils/messageConverter";
import { BubbleMarkdown } from "./BubbleMarkdown";
import { ToolCallFooter } from "./ToolCallFooter";

interface AntdXMessageListProps {
  messages: Message[];
  isLoading: boolean;
  interrupt?: unknown;
  stream?: unknown;
  onEditAndResend?: (content: string) => void;
  onResumeInterrupt?: (value: unknown) => void;
}

export const AntdXMessageList = React.memo<AntdXMessageListProps>(
  ({
    messages,
    isLoading,
    interrupt,
    stream,
    onResumeInterrupt,
  }) => {
    const bubbleItems = useMemo(() => {
      // 过滤掉空内容的消息，避免渲染空的气泡
      return convertMessagesToBubbles(messages, isLoading, interrupt).filter(
        (item) => item.content && item.content.trim() !== ""
      );
    }, [messages, isLoading, interrupt]);

    const roleConfig = useMemo(
      () => ({
        ai: {
          placement: "start" as const,
          variant: "filled" as const,
          contentRender: (content: string) => (
            <BubbleMarkdown content={content} />
          ),
          footer: (_content: unknown, info: { key?: string | number }) => {
            const item = bubbleItems.find(
              (b) => b.key === info.key
            ) as ConvertedBubbleItem | undefined;
            const toolCalls = item?.extraInfo?.toolCalls;
            const isStreaming = item?.extraInfo?.isStreaming;
            if (!toolCalls?.length) return null;

            return (
              <ToolCallFooter
                toolCalls={toolCalls}
                isLoading={isLoading && isStreaming}
                interrupt={interrupt}
                stream={stream}
                onResumeInterrupt={onResumeInterrupt}
              />
            );
          },
        },
        user: {
          placement: "end" as const,
          variant: "outlined" as const,
        },
      }),
      [bubbleItems, isLoading, interrupt, stream, onResumeInterrupt]
    );

    // 空状态
    const showEmptyState = bubbleItems.length === 0 && !isLoading;

    return (
      <>
        {showEmptyState && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-4 text-sm text-muted-foreground">
              开始对话，向 AI 助手提问
            </p>
          </div>
        )}
        <Bubble.List
          items={bubbleItems}
          role={roleConfig}
          autoScroll
        />
      </>
    );
  }
);

AntdXMessageList.displayName = "AntdXMessageList";
