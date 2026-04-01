"use client";

/**
 * ChatMessageAnimated 组件
 *
 * 在原有 ChatMessage 的基础上增加动画支持。
 * 当消息第一次出现时，使用 useAnimationOrchestra 进行协调动画：
 * 1. 消息向上滑入 + 淡入（300ms）
 * 2. 自动滚动到底部（延迟 50ms，持续 200ms）
 *
 * 这个组件是对原有 ChatMessage.tsx 的包装，
 * 保持所有原有功能不变，仅添加动画层。
 */

import React, { useEffect, useRef, useCallback } from "react";
import {
  useAnimationOrchestra,
  type AnimationScene,
} from "@/app/hooks/useAnimationOrchestra";
import type { Message } from "@langchain/langgraph-sdk";

// ✅ FIX: React.lazy 提升到模块级别，避免每次渲染重建
const ChatMessage = React.lazy(() =>
  import("./ChatMessage").then((mod) => ({
    default: mod.ChatMessage,
  }))
);
import type {
  ToolCall,
  ActionRequest,
  ReviewConfig,
  FileMetadata,
  AttachmentSummary,
} from "@/app/types/types";
import type { LogEntry } from "@/app/types/subagent";

/**
 * ChatMessage 的 Props（从原组件复制）
 */
interface ChatMessageAnimatedProps {
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
  allDeliverablePaths?: string[];
  threadId?: string;
  schemaVersion?: string;
  attachmentSummaries?: AttachmentSummary[];
  cancellationReason?: string;
  timeoutSeconds?: number;
  subagentLogs?: Record<string, LogEntry[]>;
  /**
   * 新增 props：是否启用动画
   */
  enableAnimation?: boolean;
  /**
   * 新增 props：滚动到消息底部的回调
   */
  onAnimationComplete?: () => void;
}

/**
 * 创建消息出现的动画场景
 * 接收 ref 对象（而非 ref.current 值），确保回调执行时读取实际 DOM 节点
 */
function createMessageAnimationScene(
  elementRef: React.RefObject<HTMLElement | null>,
  onScrollEnd?: () => void
): AnimationScene {
  return {
    name: "MessageAppears",
    concurrent: false, // 顺序执行：先消息出现，再滚动
    steps: [
      {
        name: "MessageSlideUpAndFadeIn",
        delay: 0,
        duration: 300, // 对应 --dur-normal (250ms，此处取 300ms 留余量)
        onStart: () => {
          const el = elementRef.current;
          if (!el) return;
          // 设置初始状态：隐藏 + 向下偏移
          el.style.opacity = "0";
          el.style.transform = "translateY(16px)";
          // 应用过渡
          el.style.transition =
            "opacity 300ms var(--ease-out), transform 300ms var(--ease-out)";
        },
        onEnd: () => {
          const el = elementRef.current;
          if (!el) return;
          // 移除过渡，保持最终状态
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          el.style.transition = "none";
        },
      },
      {
        name: "AutoScroll",
        delay: 50, // 消息滑入过程中开始滚动（创建自然的流动感）
        duration: 200, // 平滑滚动到底部
        condition: () => {
          return true;
        },
        onStart: () => {
          const el = elementRef.current;
          if (!el?.parentElement) return;
          const container = el.closest("[data-message-list]") as HTMLElement;
          if (!container) return;

          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        },
        onEnd: () => {
          onScrollEnd?.();
        },
      },
    ],
    onSceneStart: () => {
      // 场景开始时的日志（用于调试）
      if (
        typeof window !== "undefined" &&
        (window as any).__ANIMATION_DEBUG__
      ) {
        console.log("[Animation] Message animation started");
      }
    },
    onSceneEnd: () => {
      // 场景结束时的日志
      if (
        typeof window !== "undefined" &&
        (window as any).__ANIMATION_DEBUG__
      ) {
        console.log("[Animation] Message animation completed");
      }
    },
    // 自动尊重用户的 prefers-reduced-motion 设置
    respectReducedMotion: true,
  };
}

/**
 * ChatMessageAnimated 组件
 *
 * 这是一个高阶组件（HOC），包装原有的 ChatMessage 组件，
 * 并在消息首次出现时应用动画。
 *
 * 使用方式：
 * ```tsx
 * <ChatMessageAnimated
 *   message={msg}
 *   toolCalls={[]}
 *   enableAnimation={true}
 *   onAnimationComplete={() => console.log('done')}
 * />
 * ```
 */
export const ChatMessageAnimated = React.forwardRef<
  HTMLDivElement,
  ChatMessageAnimatedProps
>(
  (
    { enableAnimation = true, onAnimationComplete, ...chatMessageProps },
    forwardedRef
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const hasAnimatedRef = useRef(false);

    // H3 FIX: callback ref 合并 forwardedRef 和 containerRef
    const mergedRef = useCallback(
      (node: HTMLDivElement | null) => {
        containerRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          (
            forwardedRef as React.MutableRefObject<HTMLDivElement | null>
          ).current = node;
        }
      },
      [forwardedRef]
    );

    const getAnimationScene = useCallback((): AnimationScene => {
      return createMessageAnimationScene(containerRef, onAnimationComplete);
    }, [onAnimationComplete]);

    const animationScene = React.useMemo(
      () => getAnimationScene(),
      [getAnimationScene]
    );

    const { play } = useAnimationOrchestra(animationScene);

    useEffect(() => {
      if (!enableAnimation || !containerRef.current) return;
      if (hasAnimatedRef.current) return;

      const animationTimer = requestAnimationFrame(() => {
        hasAnimatedRef.current = true;
        play();
      });

      return () => cancelAnimationFrame(animationTimer);
    }, [enableAnimation, play, chatMessageProps.message.id]);

    return (
      <div
        ref={mergedRef}
        // 用于 CSS 过渡
        style={{
          // 初始状态（如果启用动画）
          ...(enableAnimation && {
            opacity: 0,
            transform: "translateY(16px)",
          }),
        }}
      >
        <React.Suspense fallback={<div>Loading message...</div>}>
          <ChatMessage {...chatMessageProps} />
        </React.Suspense>
      </div>
    );
  }
);

ChatMessageAnimated.displayName = "ChatMessageAnimated";
