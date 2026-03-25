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
  ({ messages, isLoading, interrupt, stream, onResumeInterrupt }) => {
    const bubbleItems = useMemo(() => {
      // 转换消息
      const items = convertMessagesToBubbles(messages, isLoading, interrupt);

      // 🔧 修复：不要过滤空内容的消息！
      // 原因：流式输出期间，AI 消息的 content 可能暂时为空
      // 如果过滤掉，会导致消息不显示
      // 改为：仅在非 loading 状态且 content 确实为空时才考虑过滤
      const filteredItems = items.filter((item) => {
        // 保留所有 user 消息
        if (item.role === "user") return true;
        // 始终保留 AI 消息 - 即使内容为空也应该显示
        // 因为流式输出期间内容可能暂时为空，但消息仍需显示
        if (item.role === "ai") return true;
        // 其他角色需要内容
        return item.content && item.content.trim() !== "";
      });

      return filteredItems;
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
            const item = bubbleItems.find((b) => b.key === info.key) as
              | ConvertedBubbleItem
              | undefined;
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
