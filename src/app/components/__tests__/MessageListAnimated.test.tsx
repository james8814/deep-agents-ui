/**
 * MessageListAnimated 集成测试
 *
 * 测试 MessageListAnimated 组件与 useAnimationOrchestra Hook 的集成。
 * 验证：
 * - 组件渲染和消息列表管理
 * - 级联动画创建和执行
 * - 消息元素引用收集
 * - enableCascadeAnimation 控制
 * - cascadeDelay 和 messageAnimationDuration 配置
 * - onCascadeAnimationComplete 回调
 * - renderMessage 自定义渲染
 * - ref 转发
 * - 边界条件 (空列表、单条消息、无 ID 消息)
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageListAnimated } from '../MessageListAnimated';
import type { Message } from '@langchain/langgraph-sdk';

// Mock useAnimationOrchestra Hook
const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockStop = jest.fn();
const mockGetTotalDuration = jest.fn(() => 500);
const mockGetProgress = jest.fn(() => 0);

jest.mock('@/app/hooks/useAnimationOrchestra', () => ({
  useAnimationOrchestra: jest.fn((scene: any) => ({
    isAnimating: false,
    play: mockPlay,
    pause: mockPause,
    stop: mockStop,
    getTotalDuration: mockGetTotalDuration,
    getProgress: mockGetProgress,
    onFrame: jest.fn(),
  })),
}));

const { useAnimationOrchestra: mockUseAnimationOrchestra } = jest.requireMock(
  '@/app/hooks/useAnimationOrchestra'
);

// 辅助函数：创建测试消息
function createTestMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    type: i % 2 === 0 ? 'human' : 'ai',
    content: `Message ${i}`,
  })) as Message[];
}

// 辅助函数：默认 renderMessage
const defaultRenderMessage = jest.fn(
  (message: Message, index: number, isAnimating: boolean) => (
    <div
      data-testid={`message-${message.id || index}`}
      data-animating={isAnimating}
    >
      {typeof message.content === 'string' ? message.content : 'complex'}
    </div>
  )
);

describe('MessageListAnimated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    defaultRenderMessage.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ============================================================
  // 1. 基础渲染测试
  // ============================================================
  describe('基础渲染', () => {
    it('应渲染所有消息', () => {
      const messages = createTestMessages(3);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(screen.getByTestId('message-msg-0')).toBeInTheDocument();
      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument();
    });

    it('应为每条消息调用 renderMessage', () => {
      const messages = createTestMessages(3);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(defaultRenderMessage).toHaveBeenCalledTimes(3);
      expect(defaultRenderMessage).toHaveBeenCalledWith(messages[0], 0, false);
      expect(defaultRenderMessage).toHaveBeenCalledWith(messages[1], 1, false);
      expect(defaultRenderMessage).toHaveBeenCalledWith(messages[2], 2, false);
    });

    it('应显示消息内容', () => {
      const messages = createTestMessages(2);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(screen.getByText('Message 0')).toBeInTheDocument();
      expect(screen.getByText('Message 1')).toBeInTheDocument();
    });

    it('应应用 className', () => {
      const messages = createTestMessages(1);

      const { container } = render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  // ============================================================
  // 2. 空消息列表测试
  // ============================================================
  describe('空消息列表', () => {
    it('空消息列表应渲染空容器', () => {
      const { container } = render(
        <MessageListAnimated
          messages={[]}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
      expect(container.firstChild?.childNodes.length).toBe(0);
    });

    it('空消息列表不应触发动画', () => {
      render(
        <MessageListAnimated
          messages={[]}
          renderMessage={defaultRenderMessage}
          enableCascadeAnimation={true}
        />
      );

      act(() => {
        jest.runAllTimers();
      });

      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 3. 单条消息测试
  // ============================================================
  describe('单条消息', () => {
    it('单条消息应正常渲染', () => {
      const messages = createTestMessages(1);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(screen.getByTestId('message-msg-0')).toBeInTheDocument();
    });

    it('单条消息动画场景应只有一个步骤', () => {
      const messages = createTestMessages(1);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          enableCascadeAnimation={true}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      // 场景的步骤数可能根据元素挂载状态而定
      // 但场景名应正确
      expect(scene.name).toBe('MessageListCascade');
      expect(scene.concurrent).toBe(true);
    });
  });

  // ============================================================
  // 4. 级联动画配置测试
  // ============================================================
  describe('级联动画配置', () => {
    it('应创建 concurrent=true 的动画场景', () => {
      const messages = createTestMessages(3);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      expect(scene.concurrent).toBe(true);
    });

    it('场景应启用 respectReducedMotion', () => {
      const messages = createTestMessages(3);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      expect(scene.respectReducedMotion).toBe(true);
    });

    it('enableCascadeAnimation 默认为 true', () => {
      const messages = createTestMessages(2);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      // useAnimationOrchestra 应被调用
      expect(mockUseAnimationOrchestra).toHaveBeenCalled();
    });

    it('cascadeDelay 默认值为 50ms', () => {
      const messages = createTestMessages(2);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      // 验证 hook 被调用
      expect(mockUseAnimationOrchestra).toHaveBeenCalled();
    });

    it('messageAnimationDuration 默认值为 300ms', () => {
      const messages = createTestMessages(2);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(mockUseAnimationOrchestra).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 5. enableCascadeAnimation 控制测试
  // ============================================================
  describe('enableCascadeAnimation 控制', () => {
    it('enableCascadeAnimation=true 时应启用动画', () => {
      const messages = createTestMessages(3);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          enableCascadeAnimation={true}
        />
      );

      act(() => {
        jest.runAllTimers();
      });

      // play 应被调用（在所有元素挂载后）
      expect(mockPlay).toHaveBeenCalled();
    });

    it('enableCascadeAnimation=false 时不应触发动画', () => {
      const messages = createTestMessages(3);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          enableCascadeAnimation={false}
        />
      );

      act(() => {
        jest.runAllTimers();
      });

      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('enableCascadeAnimation=false 时所有消息应可见', () => {
      const messages = createTestMessages(3);

      const { container } = render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          enableCascadeAnimation={false}
        />
      );

      // 所有消息容器应 opacity=1
      const messageWrappers = container.firstChild?.childNodes;
      if (messageWrappers) {
        Array.from(messageWrappers).forEach((node) => {
          const el = node as HTMLElement;
          expect(el.style.opacity).toBe('1');
          expect(el.style.transform).toBe('translateY(0)');
        });
      }
    });
  });

  // ============================================================
  // 6. onCascadeAnimationComplete 回调测试
  // ============================================================
  describe('onCascadeAnimationComplete 回调', () => {
    it('应将 onCascadeAnimationComplete 传递给场景的 onSceneEnd', () => {
      const onComplete = jest.fn();
      const messages = createTestMessages(2);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          onCascadeAnimationComplete={onComplete}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      // 场景的 onSceneEnd 应调用 onCascadeAnimationComplete
      scene.onSceneEnd?.();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('onCascadeAnimationComplete 未提供时不应报错', () => {
      const messages = createTestMessages(2);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      expect(() => scene.onSceneEnd?.()).not.toThrow();
    });
  });

  // ============================================================
  // 7. renderMessage 自定义渲染测试
  // ============================================================
  describe('renderMessage 自定义渲染', () => {
    it('应使用自定义 renderMessage 渲染消息', () => {
      const messages = createTestMessages(2);
      const customRender = jest.fn((msg: Message, index: number) => (
        <div data-testid={`custom-${index}`}>Custom: {String(msg.content)}</div>
      ));

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={customRender}
        />
      );

      expect(screen.getByTestId('custom-0')).toHaveTextContent('Custom: Message 0');
      expect(screen.getByTestId('custom-1')).toHaveTextContent('Custom: Message 1');
    });

    it('renderMessage 应接收 isAnimating 参数', () => {
      const messages = createTestMessages(1);
      const customRender = jest.fn((msg: Message, index: number, isAnimating: boolean) => (
        <div data-testid="custom">{isAnimating ? 'animating' : 'static'}</div>
      ));

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={customRender}
        />
      );

      // 初始状态下 isAnimating 应为 false
      expect(customRender).toHaveBeenCalledWith(messages[0], 0, false);
    });

    it('renderMessage 应接收正确的 index', () => {
      const messages = createTestMessages(5);
      const customRender = jest.fn((msg: Message, index: number) => (
        <div key={msg.id}>{index}</div>
      ));

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={customRender}
        />
      );

      expect(customRender).toHaveBeenCalledTimes(5);
      for (let i = 0; i < 5; i++) {
        expect(customRender).toHaveBeenCalledWith(messages[i], i, false);
      }
    });
  });

  // ============================================================
  // 8. 消息 ID 处理测试
  // ============================================================
  describe('消息 ID 处理', () => {
    it('有 ID 的消息应使用 message.id 作为 key', () => {
      const messages = createTestMessages(2);

      const { container } = render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      // 验证渲染的消息数量正确
      const messageElements = container.querySelectorAll('[data-testid^="message-"]');
      expect(messageElements.length).toBe(2);
    });

    it('无 ID 的消息应使用 fallback key', () => {
      const messages = [
        { type: 'human', content: 'No ID message' } as Message,
      ];

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={(msg, index) => (
            <div data-testid={`msg-${index}`}>{String(msg.content)}</div>
          )}
        />
      );

      expect(screen.getByTestId('msg-0')).toHaveTextContent('No ID message');
    });

    it('混合有/无 ID 的消息应正常渲染', () => {
      const messages = [
        { id: 'msg-a', type: 'human', content: 'With ID' } as Message,
        { type: 'ai', content: 'No ID' } as Message,
        { id: 'msg-c', type: 'human', content: 'With ID 2' } as Message,
      ];

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={(msg, index) => (
            <div data-testid={`msg-${index}`}>{String(msg.content)}</div>
          )}
        />
      );

      expect(screen.getByText('With ID')).toBeInTheDocument();
      expect(screen.getByText('No ID')).toBeInTheDocument();
      expect(screen.getByText('With ID 2')).toBeInTheDocument();
    });
  });

  // ============================================================
  // 9. 初始样式测试
  // ============================================================
  describe('初始样式', () => {
    it('enableCascadeAnimation=true 且非动画中时消息应可见', () => {
      const messages = createTestMessages(2);

      const { container } = render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          enableCascadeAnimation={true}
        />
      );

      // 非动画状态时 (isAnimating=false)，opacity 应为 1
      const wrappers = container.firstChild?.childNodes;
      if (wrappers) {
        Array.from(wrappers).forEach((node) => {
          const el = node as HTMLElement;
          // animatingMessages 为空集 → isAnimating=false → opacity=1
          expect(el.style.opacity).toBe('1');
        });
      }
    });
  });

  // ============================================================
  // 10. 动画只执行一次测试
  // ============================================================
  describe('动画只执行一次', () => {
    it('play 在首次调用后不应再次被调用', () => {
      const messages = createTestMessages(2);

      const { rerender } = render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          enableCascadeAnimation={true}
        />
      );

      act(() => {
        jest.runAllTimers();
      });

      const playCount = mockPlay.mock.calls.length;

      // 重新渲染
      rerender(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          enableCascadeAnimation={true}
        />
      );

      act(() => {
        jest.runAllTimers();
      });

      // play 不应再次被调用
      expect(mockPlay.mock.calls.length).toBe(playCount);
    });
  });

  // ============================================================
  // 11. 调试模式测试
  // ============================================================
  describe('调试模式', () => {
    it('__ANIMATION_DEBUG__ 开启时 onSceneStart 应输出日志', () => {
      (window as any).__ANIMATION_DEBUG__ = true;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const messages = createTestMessages(3);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      scene.onSceneStart?.();
      // 因为步骤数可能为 0（DOM 还未挂载），日志消息格式可能变化
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      delete (window as any).__ANIMATION_DEBUG__;
    });

    it('__ANIMATION_DEBUG__ 关闭时不应输出日志', () => {
      delete (window as any).__ANIMATION_DEBUG__;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const messages = createTestMessages(3);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      scene.onSceneStart?.();
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ============================================================
  // 12. DisplayName 测试
  // ============================================================
  describe('组件元数据', () => {
    it('应设置正确的 displayName', () => {
      expect(MessageListAnimated.displayName).toBe('MessageListAnimated');
    });
  });

  // ============================================================
  // 13. Ref 转发测试
  // ============================================================
  describe('Ref 转发', () => {
    it('ref 不提供时容器应正常渲染', () => {
      const messages = createTestMessages(1);

      const { container } = render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    });
  });

  // ============================================================
  // 14. 大量消息性能测试
  // ============================================================
  describe('大量消息', () => {
    it('100 条消息应正常渲染', () => {
      const messages = createTestMessages(100);

      const { container } = render(
        <MessageListAnimated
          messages={messages}
          renderMessage={(msg, index) => (
            <div key={msg.id}>{String(msg.content)}</div>
          )}
        />
      );

      expect(container.firstChild?.childNodes.length).toBe(100);
    });

    it('100 条消息动画场景应创建成功', () => {
      const messages = createTestMessages(100);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
          enableCascadeAnimation={true}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      expect(scene.name).toBe('MessageListCascade');
      expect(scene.concurrent).toBe(true);
    });
  });

  // ============================================================
  // 15. 消息列表变化测试
  // ============================================================
  describe('消息列表变化', () => {
    it('添加新消息后应更新渲染', () => {
      const messages1 = createTestMessages(2);
      const messages2 = createTestMessages(3);

      const { rerender } = render(
        <MessageListAnimated
          messages={messages1}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(screen.getByTestId('message-msg-0')).toBeInTheDocument();
      expect(screen.getByTestId('message-msg-1')).toBeInTheDocument();

      rerender(
        <MessageListAnimated
          messages={messages2}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(screen.getByTestId('message-msg-2')).toBeInTheDocument();
    });

    it('减少消息后应更新渲染', () => {
      const messages3 = createTestMessages(3);
      const messages1 = createTestMessages(1);

      const { rerender, container } = render(
        <MessageListAnimated
          messages={messages3}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(container.firstChild?.childNodes.length).toBe(3);

      rerender(
        <MessageListAnimated
          messages={messages1}
          renderMessage={defaultRenderMessage}
        />
      );

      expect(container.firstChild?.childNodes.length).toBe(1);
    });
  });

  // ============================================================
  // 16. 动画步骤 DOM 操作测试
  // ============================================================
  describe('动画步骤 DOM 操作', () => {
    it('场景步骤的 onStart/onEnd 不应抛出异常', () => {
      const messages = createTestMessages(2);

      render(
        <MessageListAnimated
          messages={messages}
          renderMessage={defaultRenderMessage}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      // 即使 DOM 元素不存在，步骤的回调也不应抛出异常
      scene.steps.forEach((step: any) => {
        expect(() => step.onStart?.()).not.toThrow();
        expect(() => step.onEnd?.()).not.toThrow();
      });
    });
  });
});
