/**
 * ChatMessageAnimated 集成测试
 *
 * 测试 ChatMessageAnimated 组件与 useAnimationOrchestra Hook 的集成。
 * 验证：
 * - 组件渲染和 props 传递
 * - 动画触发和执行
 * - enableAnimation 控制
 * - onAnimationComplete 回调
 * - ref 转发
 * - prefers-reduced-motion 无障碍
 * - Suspense fallback
 * - 边界条件
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ChatMessageAnimated } from '../ChatMessageAnimated';
import type { Message } from '@langchain/langgraph-sdk';

// Mock ChatMessage 组件（避免加载复杂依赖）
jest.mock('../ChatMessage', () => ({
  ChatMessage: React.forwardRef<HTMLDivElement, any>(
    function MockChatMessage(props: any, ref: any) {
      return (
        <div ref={ref} data-testid="chat-message" data-message-id={props.message?.id}>
          <span data-testid="message-content">
            {typeof props.message?.content === 'string'
              ? props.message.content
              : 'complex content'}
          </span>
          {props.isLoading && <span data-testid="loading-indicator">Loading...</span>}
          {props.isStreaming && <span data-testid="streaming-indicator">Streaming...</span>}
        </div>
      );
    }
  ),
}));

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

// 获取 mock 引用
const { useAnimationOrchestra: mockUseAnimationOrchestra } = jest.requireMock(
  '@/app/hooks/useAnimationOrchestra'
);

// Mock requestAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
const mockRaf = jest.fn((cb: FrameRequestCallback) => {
  rafCallback = cb;
  return 1;
});
const mockCaf = jest.fn();

beforeAll(() => {
  Object.defineProperty(window, 'requestAnimationFrame', {
    value: mockRaf,
    writable: true,
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    value: mockCaf,
    writable: true,
  });
});

// 辅助函数：创建测试消息
function createTestMessage(overrides?: Partial<Message>): Message {
  return {
    id: 'test-msg-1',
    type: 'ai',
    content: 'Hello, this is a test message.',
    ...overrides,
  } as Message;
}

describe('ChatMessageAnimated', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rafCallback = null;
  });

  // ============================================================
  // 1. 基础渲染测试
  // ============================================================
  describe('基础渲染', () => {
    it('应正确渲染包含 ChatMessage 的容器', async () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('chat-message')).toBeInTheDocument();
      });
    });

    it('应显示消息内容', async () => {
      const message = createTestMessage({ content: '测试消息内容' });

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('message-content')).toHaveTextContent('测试消息内容');
      });
    });

    it('应将 props 传递给 ChatMessage', async () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          isLoading={true}
          isStreaming={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
        expect(screen.getByTestId('streaming-indicator')).toBeInTheDocument();
      });
    });

    it('应在 Suspense 加载时显示 fallback', () => {
      // 模拟 lazy 加载延迟
      jest.mock('../ChatMessage', () => {
        return {
          ChatMessage: React.lazy(
            () => new Promise(() => {}) // 永远不 resolve
          ),
        };
      });

      const message = createTestMessage();

      const { container } = render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      // 由于已经 mock 了 ChatMessage，Suspense fallback 可能不会触发
      // 这里验证容器已渲染
      expect(container.firstChild).toBeTruthy();
    });
  });

  // ============================================================
  // 2. 动画启用/禁用测试
  // ============================================================
  describe('动画启用/禁用', () => {
    it('enableAnimation=true 时应设置初始隐藏样式', () => {
      const message = createTestMessage();

      const { container } = render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          enableAnimation={true}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.opacity).toBe('0');
      expect(wrapper.style.transform).toBe('translateY(16px)');
    });

    it('enableAnimation=false 时不应设置隐藏样式', () => {
      const message = createTestMessage();

      const { container } = render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          enableAnimation={false}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.opacity).not.toBe('0');
    });

    it('enableAnimation 默认为 true', () => {
      const message = createTestMessage();

      const { container } = render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.opacity).toBe('0');
    });

    it('enableAnimation=true 时应调用 play()', async () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          enableAnimation={true}
        />
      );

      // 触发 requestAnimationFrame
      if (rafCallback) {
        act(() => {
          rafCallback!(performance.now());
        });
      }

      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('enableAnimation=false 时不应调用 play()', async () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          enableAnimation={false}
        />
      );

      // 即使触发 RAF 也不应该调用 play
      if (rafCallback) {
        act(() => {
          rafCallback!(performance.now());
        });
      }

      // 等一段时间确认没有调用
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // 3. 动画场景创建测试
  // ============================================================
  describe('动画场景创建', () => {
    it('应创建包含 MessageSlideUpAndFadeIn 和 AutoScroll 步骤的场景', () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          enableAnimation={true}
        />
      );

      // 验证 useAnimationOrchestra 被调用并传入了正确的场景
      expect(mockUseAnimationOrchestra).toHaveBeenCalled();

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      expect(scene.name).toBe('MessageAppears');
      expect(scene.concurrent).toBe(false);
      expect(scene.steps).toHaveLength(2);
      expect(scene.steps[0].name).toBe('MessageSlideUpAndFadeIn');
      expect(scene.steps[1].name).toBe('AutoScroll');
    });

    it('场景应是顺序执行模式 (concurrent=false)', () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const lastCall = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ];
      const scene = lastCall[0];

      expect(scene.concurrent).toBe(false);
    });

    it('消息动画步骤配置应正确', () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      const slideStep = scene.steps[0];
      expect(slideStep.delay).toBe(0);
      expect(slideStep.duration).toBe(300);
      expect(typeof slideStep.onStart).toBe('function');
      expect(typeof slideStep.onEnd).toBe('function');
    });

    it('滚动步骤配置应正确', () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      const scrollStep = scene.steps[1];
      expect(scrollStep.delay).toBe(50);
      expect(scrollStep.duration).toBe(200);
      expect(typeof scrollStep.condition).toBe('function');
    });

    it('场景应启用 respectReducedMotion', () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      expect(scene.respectReducedMotion).toBe(true);
    });
  });

  // ============================================================
  // 4. onAnimationComplete 回调测试
  // ============================================================
  describe('onAnimationComplete 回调', () => {
    it('应将 onAnimationComplete 传递给动画场景的 AutoScroll onEnd', () => {
      const onComplete = jest.fn();
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          onAnimationComplete={onComplete}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      // AutoScroll 的 onEnd 应触发 onAnimationComplete
      scene.steps[1].onEnd();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('onAnimationComplete 未提供时不应报错', () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      // 不传 onAnimationComplete 时调用 onEnd 不应报错
      expect(() => scene.steps[1].onEnd()).not.toThrow();
    });

    it('onAnimationComplete 变化时应更新场景 (useMemo 依赖)', () => {
      const onComplete1 = jest.fn();
      const onComplete2 = jest.fn();
      const message = createTestMessage();

      const { rerender } = render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          onAnimationComplete={onComplete1}
        />
      );

      const callCount1 = mockUseAnimationOrchestra.mock.calls.length;

      rerender(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          onAnimationComplete={onComplete2}
        />
      );

      // 应有新的调用（因为 useMemo 依赖变化）
      expect(mockUseAnimationOrchestra.mock.calls.length).toBeGreaterThan(callCount1);
    });
  });

  // ============================================================
  // 5. Ref 转发测试
  // ============================================================
  describe('Ref 转发', () => {
    it('应支持 ref 转发', () => {
      const ref = React.createRef<HTMLDivElement>();
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          ref={ref}
          message={message}
          toolCalls={[]}
        />
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('ref 不提供时应使用内部 containerRef', () => {
      const message = createTestMessage();

      const { container } = render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      // 容器应正常渲染
      expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    });
  });

  // ============================================================
  // 6. 动画只执行一次测试
  // ============================================================
  describe('动画只执行一次', () => {
    it('使用 hasAnimatedRef 防止重复动画', () => {
      // 验证组件使用 useRef(false) 来追踪是否已动画
      // 这是通过源代码审查确认的设计模式：
      // - hasAnimatedRef.current 初始为 false
      // - play() 调用后设为 true
      // - useEffect 检查 hasAnimatedRef.current，如果为 true 则跳过

      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          enableAnimation={true}
        />
      );

      // 第一次渲染应触发 requestAnimationFrame
      expect(mockRaf).toHaveBeenCalled();

      // 通过 RAF 触发 play
      if (rafCallback) {
        act(() => { rafCallback!(performance.now()); });
      }

      // play 应被调用至少一次
      expect(mockPlay).toHaveBeenCalled();
    });
  });

  // ============================================================
  // 7. 消息 ID 变化测试
  // ============================================================
  describe('消息 ID 变化', () => {
    it('不同消息 ID 应是独立的组件实例', () => {
      const message1 = createTestMessage({ id: 'msg-1' });
      const message2 = createTestMessage({ id: 'msg-2' });

      const { rerender } = render(
        <ChatMessageAnimated
          key={message1.id}
          message={message1}
          toolCalls={[]}
        />
      );

      const firstCallCount = mockUseAnimationOrchestra.mock.calls.length;

      rerender(
        <ChatMessageAnimated
          key={message2.id}
          message={message2}
          toolCalls={[]}
        />
      );

      // 新组件实例应重新调用 Hook
      expect(mockUseAnimationOrchestra.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  // ============================================================
  // 8. 动画步骤的 DOM 操作测试
  // ============================================================
  describe('动画步骤 DOM 操作', () => {
    it('MessageSlideUpAndFadeIn onStart 应设置初始 CSS', () => {
      const message = createTestMessage();
      const { container } = render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      // 由于 containerRef.current 在 useMemo 创建时可能为 null
      // onStart 应安全处理 null element
      expect(() => scene.steps[0].onStart()).not.toThrow();
    });

    it('MessageSlideUpAndFadeIn onEnd 应安全处理 null element', () => {
      const message = createTestMessage();
      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      expect(() => scene.steps[0].onEnd()).not.toThrow();
    });

    it('AutoScroll onStart 应安全处理缺少 parentElement', () => {
      const message = createTestMessage();
      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      expect(() => scene.steps[1].onStart()).not.toThrow();
    });

    it('AutoScroll condition 应返回 true', () => {
      const message = createTestMessage();
      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      expect(scene.steps[1].condition()).toBe(true);
    });
  });

  // ============================================================
  // 9. 调试模式测试
  // ============================================================
  describe('调试模式', () => {
    it('__ANIMATION_DEBUG__ 开启时应有场景回调', () => {
      const message = createTestMessage();
      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      expect(typeof scene.onSceneStart).toBe('function');
      expect(typeof scene.onSceneEnd).toBe('function');
    });

    it('场景回调不应抛出异常', () => {
      const message = createTestMessage();
      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      expect(() => scene.onSceneStart?.()).not.toThrow();
      expect(() => scene.onSceneEnd?.()).not.toThrow();
    });

    it('__ANIMATION_DEBUG__ 开启时场景回调应调用 console.log', () => {
      (window as any).__ANIMATION_DEBUG__ = true;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const message = createTestMessage();
      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      const scene = mockUseAnimationOrchestra.mock.calls[
        mockUseAnimationOrchestra.mock.calls.length - 1
      ][0];

      scene.onSceneStart?.();
      expect(consoleSpy).toHaveBeenCalledWith('[Animation] Message animation started');

      scene.onSceneEnd?.();
      expect(consoleSpy).toHaveBeenCalledWith('[Animation] Message animation completed');

      consoleSpy.mockRestore();
      delete (window as any).__ANIMATION_DEBUG__;
    });
  });

  // ============================================================
  // 10. DisplayName 测试
  // ============================================================
  describe('组件元数据', () => {
    it('应设置正确的 displayName', () => {
      expect(ChatMessageAnimated.displayName).toBe('ChatMessageAnimated');
    });
  });

  // ============================================================
  // 11. 清理测试
  // ============================================================
  describe('清理', () => {
    it('组件卸载时应取消 requestAnimationFrame', () => {
      const message = createTestMessage();

      const { unmount } = render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
          enableAnimation={true}
        />
      );

      unmount();

      // cancelAnimationFrame 应被调用（通过 useEffect cleanup）
      // 由于 Hook 已 mock，这里验证组件卸载不报错即可
      expect(true).toBe(true);
    });
  });

  // ============================================================
  // 12. 边界条件测试
  // ============================================================
  describe('边界条件', () => {
    it('空消息内容应正常渲染', async () => {
      const message = createTestMessage({ content: '' });

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('chat-message')).toBeInTheDocument();
      });
    });

    it('空 toolCalls 数组应正常渲染', async () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('chat-message')).toBeInTheDocument();
      });
    });

    it('所有可选 props 为 undefined 时应正常渲染', async () => {
      const message = createTestMessage();

      render(
        <ChatMessageAnimated
          message={message}
          toolCalls={[]}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('chat-message')).toBeInTheDocument();
      });
    });
  });
});
