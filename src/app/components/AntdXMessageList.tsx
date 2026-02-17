"use client";

import React, { useMemo } from "react";
import { Bubble } from "@ant-design/x";
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
      return convertMessagesToBubbles(messages, isLoading, interrupt);
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

    return (
      <Bubble.List
        items={bubbleItems}
        role={roleConfig}
        autoScroll
      />
    );
  }
);

AntdXMessageList.displayName = "AntdXMessageList";
