'use client';

/**
 * MessageListAnimated 组件
 *
 * 在原有 MessageList 的基础上增加级联动画支持。
 * 当多条消息出现时（如 AI 响应包含多条消息或工具调用），
 * 使用 useAnimationOrchestra 实现"级联"效果：
 * - 每条消息相隔 50ms 出现
 * - 创建视觉上的流动感和完整性
 *
 * 这个组件管理多条消息的动画编排，
 * 每条消息可以使用 ChatMessageAnimated 或普通 ChatMessage。
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useAnimationOrchestra, type AnimationScene, type AnimationStep } from '@/app/hooks/useAnimationOrchestra';
import { Message } from '@langchain/langgraph-sdk';
import type { ToolCall } from '@/app/types/types';

/**
 * MessageListAnimated Props
 */
interface MessageListAnimatedProps {
  /**
   * 消息列表
   */
  messages: Message[];

  /**
   * 工具调用映射（可选）
   */
  toolCallsMap?: Record<string, ToolCall[]>;

  /**
   * 是否正在加载
   */
  isLoading?: boolean;

  /**
   * 是否正在流式传输
   */
  isStreaming?: boolean;

  /**
   * 是否启用级联动画
   */
  enableCascadeAnimation?: boolean;

  /**
   * 级联动画中，每条消息之间的延迟（毫秒）
   * 默认: 50ms
   */
  cascadeDelay?: number;

  /**
   * 单条消息的动画时长（毫秒）
   * 默认: 300ms
   */
  messageAnimationDuration?: number;

  /**
   * 渲染单条消息的函数
   * 用户需要提供此函数来自定义消息渲染
   */
  renderMessage: (message: Message, index: number, isAnimating: boolean) => React.ReactNode;

  /**
   * 级联动画完成的回调
   */
  onCascadeAnimationComplete?: () => void;

  /**
   * 容器 CSS 类名
   */
  className?: string;

  /**
   * 消息列表属性（用于 CSS 选择器）
   */
  'data-message-list'?: string;
}

/**
 * 创建级联动画场景
 *
 * 根据消息数量动态生成动画步骤，每条消息相隔一定延迟
 */
function createCascadeAnimationScene(
  messageElements: HTMLElement[],
  cascadeDelay: number = 50,
  messageDuration: number = 300,
  onComplete?: () => void
): AnimationScene {
  const steps: AnimationStep[] = messageElements.map((element, index) => ({
    name: `Message_${index}_SlideUp`,
    delay: index * cascadeDelay, // 每条消息相隔 cascadeDelay
    duration: messageDuration,
    onStart: () => {
      // 应用初始样式
      element.style.opacity = '0';
      element.style.transform = 'translateY(16px)';
      element.style.transition = `opacity ${messageDuration}ms var(--ease-out), transform ${messageDuration}ms var(--ease-out)`;
    },
    onEnd: () => {
      // 移除过渡，保持最终状态
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
      element.style.transition = 'none';
    },
  }));

  return {
    name: 'MessageListCascade',
    concurrent: true, // 并发模式：所有消息同时开始，各自有延迟
    steps,
    onSceneStart: () => {
      if (typeof window !== 'undefined' && (window as any).__ANIMATION_DEBUG__) {
        console.log(`[Animation] Cascade animation started for ${messageElements.length} messages`);
      }
    },
    onSceneEnd: () => {
      if (typeof window !== 'undefined' && (window as any).__ANIMATION_DEBUG__) {
        console.log('[Animation] Cascade animation completed');
      }
      onComplete?.();
    },
    respectReducedMotion: true,
  };
}

/**
 * MessageListAnimated 组件
 *
 * 使用方式：
 * ```tsx
 * <MessageListAnimated
 *   messages={messages}
 *   enableCascadeAnimation={true}
 *   cascadeDelay={50}
 *   renderMessage={(msg, index, isAnimating) => (
 *     <ChatMessageAnimated key={msg.id} message={msg} {...} />
 *   )}
 * />
 * ```
 */
export const MessageListAnimated = React.forwardRef<
  HTMLDivElement,
  MessageListAnimatedProps
>(
  (
    {
      messages,
      enableCascadeAnimation = true,
      cascadeDelay = 50,
      messageAnimationDuration = 300,
      renderMessage,
      onCascadeAnimationComplete,
      className = '',
      ...containerProps
    },
    forwardedRef
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const messageRefsRef = useRef<Map<string, HTMLElement>>(new Map());
    const hasAnimatedRef = useRef(false);
    const [animatingMessages, setAnimatingMessages] = React.useState<Set<string>>(
      new Set()
    );

    // 收集消息元素引用
    const setMessageRef = useCallback((messageId: string | undefined, element: HTMLElement | null) => {
      if (!messageId) return;
      if (element) {
        messageRefsRef.current.set(messageId, element);
      } else {
        messageRefsRef.current.delete(messageId);
      }
    }, []);

    // 创建级联动画
    const animationScene = React.useMemo(() => {
      const elements = messages
        .map((msg) => msg.id ? messageRefsRef.current.get(msg.id) : undefined)
        .filter((el): el is HTMLElement => el !== undefined);

      return createCascadeAnimationScene(
        elements,
        cascadeDelay,
        messageAnimationDuration,
        onCascadeAnimationComplete
      );
    }, [messages, cascadeDelay, messageAnimationDuration, onCascadeAnimationComplete]);

    const { play, getTotalDuration } = useAnimationOrchestra(animationScene);

    // 触发级联动画
    useEffect(() => {
      if (!enableCascadeAnimation) return;
      if (messages.length === 0) return;
      if (hasAnimatedRef.current) return;

      // 等待所有消息元素挂载
      const checkTimer = setTimeout(() => {
        const allElementsMounted = messages.every(
          (msg) => msg.id && messageRefsRef.current.has(msg.id)
        );

        if (allElementsMounted) {
          hasAnimatedRef.current = true;
          // 标记正在动画的消息
          setAnimatingMessages(new Set(messages.map((m) => m.id).filter((id): id is string => id !== undefined)));
          play();

          // 动画完成后清除标记
          const totalDuration = getTotalDuration();
          setTimeout(() => {
            setAnimatingMessages(new Set());
          }, totalDuration);
        }
      }, 0);

      return () => clearTimeout(checkTimer);
    }, [enableCascadeAnimation, messages, play, getTotalDuration]);

    return (
      <div
        ref={containerRef}
        className={className}
        {...containerProps}
      >
        {messages.map((message, index) => {
          const messageId = message.id || `message-${index}`;
          const isAnimating = animatingMessages.has(messageId);

          return (
            <div
              key={messageId}
              ref={(el) => {
                if (el) setMessageRef(messageId, el);
              }}
              style={{
                // 初始状态（用于动画）
                opacity: enableCascadeAnimation && isAnimating ? 0 : 1,
                transform: enableCascadeAnimation && isAnimating ? 'translateY(16px)' : 'translateY(0)',
              }}
            >
              {renderMessage(message, index, isAnimating)}
            </div>
          );
        })}
      </div>
    );
  }
);

MessageListAnimated.displayName = 'MessageListAnimated';

/**
 * 使用示例
 *
 * ```tsx
 * // 在 ChatInterface 或类似组件中使用
 * import { MessageListAnimated } from '@/app/components/MessageListAnimated';
 * import { ChatMessageAnimated } from '@/app/components/ChatMessageAnimated';
 *
 * export function ChatInterface() {
 *   const { messages, stream } = useChat();
 *
 *   return (
 *     <MessageListAnimated
 *       messages={messages}
 *       enableCascadeAnimation={true}
 *       cascadeDelay={50}
 *       messageAnimationDuration={300}
 *       data-message-list="true"
 *       renderMessage={(message, index) => (
 *         <ChatMessageAnimated
 *           key={message.id}
 *           message={message}
 *           toolCalls={stream?.values?.toolCalls || []}
 *           enableAnimation={true}
 *         />
 *       )}
 *     />
 *   );
 * }
 * ```
 */
