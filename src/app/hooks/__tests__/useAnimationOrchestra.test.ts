/**
 * useAnimationOrchestra Hook 单元测试
 *
 * 本测试套件验证动画编排系统的核心功能：
 * - 步骤执行顺序（顺序 vs 并发）
 * - 延迟和时长计算
 * - 条件判断
 * - 生命周期回调
 * - prefers-reduced-motion 支持
 * - 播放控制（play/pause/stop）
 *
 * 测试策略：使用 jest.useFakeTimers() 控制 setTimeout，
 * 使用 mock requestAnimationFrame 控制 RAF 调度。
 */

import { renderHook, act } from '@testing-library/react';
import { useAnimationOrchestra, type AnimationScene } from '../useAnimationOrchestra';

// Mock requestAnimationFrame / cancelAnimationFrame
let rafCallbacks: Map<number, FrameRequestCallback>;
let rafIdCounter: number;

beforeEach(() => {
  jest.useFakeTimers();
  rafCallbacks = new Map();
  rafIdCounter = 0;

  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    const id = ++rafIdCounter;
    rafCallbacks.set(id, cb);
    return id;
  });

  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
    rafCallbacks.delete(id);
  });

  // Mock performance.now to return a controllable value
  jest.spyOn(performance, 'now').mockReturnValue(0);

  // Default: prefers-reduced-motion = false
  jest.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false,
    media: '',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Flush all pending RAF callbacks (simulates one animation frame) */
function flushRAF(time: number = 0) {
  (performance.now as jest.Mock).mockReturnValue(time);
  const callbacks = new Map(rafCallbacks);
  rafCallbacks.clear();
  callbacks.forEach((cb) => cb(time));
}

describe('useAnimationOrchestra', () => {
  // ============================================================================
  // 分组 1: 基础功能
  // ============================================================================

  describe('基础功能', () => {
    it('应该成功初始化 Hook', () => {
      const scene: AnimationScene = {
        name: 'TestScene',
        concurrent: false,
        steps: [],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      expect(result.current).toBeDefined();
      expect(result.current.isAnimating).toBe(false);
      expect(typeof result.current.play).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.stop).toBe('function');
    });

    it('play() 应该开始动画', () => {
      const scene: AnimationScene = {
        name: 'TestScene',
        concurrent: false,
        steps: [{ name: 'S', delay: 0, duration: 100 }],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      expect(result.current.isAnimating).toBe(true);
    });

    it('stop() 应该停止动画', () => {
      const scene: AnimationScene = {
        name: 'TestScene',
        concurrent: false,
        steps: [{ name: 'S', delay: 0, duration: 100 }],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      expect(result.current.isAnimating).toBe(true);

      act(() => {
        result.current.stop();
      });

      expect(result.current.isAnimating).toBe(false);
    });

    it('pause() 应该暂停动画', () => {
      const scene: AnimationScene = {
        name: 'TestScene',
        concurrent: false,
        steps: [{ name: 'S', delay: 0, duration: 100 }],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      expect(result.current.isAnimating).toBe(true);

      act(() => {
        result.current.pause();
      });

      expect(result.current.isAnimating).toBe(false);
    });

    it('play() 不应重复启动', () => {
      const onStart = jest.fn();
      const scene: AnimationScene = {
        name: 'TestScene',
        concurrent: false,
        steps: [{ name: 'S', delay: 0, duration: 100, onStart }],
        onSceneStart: jest.fn(),
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
        result.current.play(); // 第二次调用应被忽略
      });

      // onSceneStart 只调用一次
      expect(scene.onSceneStart).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 分组 2: 时长计算
  // ============================================================================

  describe('时长计算', () => {
    it('空步骤列表应该返回 0 时长', () => {
      const scene: AnimationScene = {
        name: 'EmptyScene',
        concurrent: false,
        steps: [],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));
      expect(result.current.getTotalDuration()).toBe(0);
    });

    it('单个步骤应该正确计算时长', () => {
      const scene: AnimationScene = {
        name: 'SingleStepScene',
        concurrent: false,
        steps: [{ name: 'Step1', delay: 50, duration: 300 }],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));
      expect(result.current.getTotalDuration()).toBe(350);
    });

    it('顺序模式应该求和所有步骤时长', () => {
      const scene: AnimationScene = {
        name: 'SequentialScene',
        concurrent: false,
        steps: [
          { name: 'Step1', delay: 0, duration: 100 },
          { name: 'Step2', delay: 50, duration: 150 },
          { name: 'Step3', delay: 0, duration: 200 },
        ],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));
      expect(result.current.getTotalDuration()).toBe(500);
    });

    it('并发模式应该取最大步骤时长', () => {
      const scene: AnimationScene = {
        name: 'ConcurrentScene',
        concurrent: true,
        steps: [
          { name: 'Step1', delay: 0, duration: 100 },
          { name: 'Step2', delay: 50, duration: 200 },
          { name: 'Step3', delay: 100, duration: 100 },
        ],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));
      expect(result.current.getTotalDuration()).toBe(250);
    });
  });

  // ============================================================================
  // 分组 3: 步骤执行（顺序模式）
  // ============================================================================

  describe('步骤执行 - 顺序模式', () => {
    it('应该按延迟执行步骤的 onStart 和 onEnd 回调', () => {
      const execution: string[] = [];

      const scene: AnimationScene = {
        name: 'SequentialScene',
        concurrent: false,
        steps: [
          {
            name: 'Step1',
            delay: 0,
            duration: 50,
            onStart: () => execution.push('Step1-Start'),
            onEnd: () => execution.push('Step1-End'),
          },
          {
            name: 'Step2',
            delay: 0,
            duration: 50,
            onStart: () => execution.push('Step2-Start'),
            onEnd: () => execution.push('Step2-End'),
          },
        ],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      // Step1 onStart: delay=0
      act(() => {
        jest.advanceTimersByTime(0);
      });
      expect(execution).toContain('Step1-Start');
      expect(execution).toContain('Step2-Start');

      // Step1 onEnd: delay + duration = 50
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(execution).toContain('Step1-End');
      expect(execution).toContain('Step2-End');
    });

    it('应该在步骤延迟后执行 onStart', () => {
      const onStart = jest.fn();

      const scene: AnimationScene = {
        name: 'DelayedScene',
        concurrent: false,
        steps: [{ name: 'Step1', delay: 100, duration: 50, onStart }],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      // 还没到 delay 时间
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(onStart).not.toHaveBeenCalled();

      // 到达 delay
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(onStart).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 分组 4: 步骤执行（并发模式）
  // ============================================================================

  describe('步骤执行 - 并发模式', () => {
    it('应该按各自延迟并发执行步骤', () => {
      const execution: string[] = [];

      const scene: AnimationScene = {
        name: 'ConcurrentScene',
        concurrent: true,
        steps: [
          { name: 'Step1', delay: 0, duration: 100, onStart: () => execution.push('Step1') },
          { name: 'Step2', delay: 50, duration: 100, onStart: () => execution.push('Step2') },
          { name: 'Step3', delay: 100, duration: 100, onStart: () => execution.push('Step3') },
        ],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      // delay=0 时 Step1 应执行
      act(() => { jest.advanceTimersByTime(0); });
      expect(execution).toEqual(['Step1']);

      // delay=50 时 Step2 应执行
      act(() => { jest.advanceTimersByTime(50); });
      expect(execution).toEqual(['Step1', 'Step2']);

      // delay=100 时 Step3 应执行
      act(() => { jest.advanceTimersByTime(50); });
      expect(execution).toEqual(['Step1', 'Step2', 'Step3']);
    });
  });

  // ============================================================================
  // 分组 5: 条件判断
  // ============================================================================

  describe('条件判断', () => {
    it('condition 返回 false 时应该跳过步骤', () => {
      const execution: string[] = [];

      const scene: AnimationScene = {
        name: 'ConditionalScene',
        concurrent: false,
        steps: [
          { name: 'Step1', delay: 0, duration: 50, onStart: () => execution.push('Step1') },
          { name: 'Step2', delay: 0, duration: 50, condition: () => false, onStart: () => execution.push('Step2') },
          { name: 'Step3', delay: 0, duration: 50, onStart: () => execution.push('Step3') },
        ],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
        jest.advanceTimersByTime(100);
      });

      expect(execution).toContain('Step1');
      expect(execution).not.toContain('Step2');
      expect(execution).toContain('Step3');
    });

    it('condition 返回 true 时应该执行步骤', () => {
      const onStart = jest.fn();

      const scene: AnimationScene = {
        name: 'ConditionalScene',
        concurrent: false,
        steps: [
          { name: 'Step1', delay: 0, duration: 50, condition: () => true, onStart },
        ],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
        jest.advanceTimersByTime(0);
      });

      expect(onStart).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 分组 6: 生命周期回调
  // ============================================================================

  describe('生命周期回调', () => {
    it('应该在场景开始时调用 onSceneStart', () => {
      const onSceneStart = jest.fn();

      const scene: AnimationScene = {
        name: 'LifecycleScene',
        concurrent: false,
        steps: [{ name: 'Step1', delay: 0, duration: 50 }],
        onSceneStart,
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      expect(onSceneStart).toHaveBeenCalledTimes(1);
    });

    it('应该在场景结束时调用 onSceneEnd', () => {
      const onSceneEnd = jest.fn();
      const totalDuration = 50; // delay(0) + duration(50)

      const scene: AnimationScene = {
        name: 'LifecycleScene',
        concurrent: false,
        steps: [{ name: 'Step1', delay: 0, duration: totalDuration }],
        onSceneEnd,
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      // 推进时间超过总时长并刷新 RAF
      act(() => {
        jest.advanceTimersByTime(totalDuration + 10);
        flushRAF(totalDuration + 10);
      });

      expect(onSceneEnd).toHaveBeenCalledTimes(1);
    });

    it('错误回调不应中断动画', () => {
      const onEnd = jest.fn();

      const scene: AnimationScene = {
        name: 'ErrorScene',
        concurrent: false,
        steps: [
          {
            name: 'Step1',
            delay: 0,
            duration: 50,
            onStart: () => { throw new Error('test error'); },
            onEnd,
          },
        ],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      // 不应抛出
      act(() => {
        result.current.play();
        jest.advanceTimersByTime(50);
      });

      expect(onEnd).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 分组 7: 进度追踪
  // ============================================================================

  describe('进度追踪', () => {
    it('getProgress() 初始应返回 1 (空步骤)', () => {
      const scene: AnimationScene = {
        name: 'EmptyScene',
        concurrent: false,
        steps: [],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));
      expect(result.current.getProgress()).toBe(1);
    });

    it('getProgress() 在动画开始后应返回 0-1 之间的值', () => {
      const scene: AnimationScene = {
        name: 'ProgressScene',
        concurrent: false,
        steps: [{ name: 'Step1', delay: 0, duration: 100 }],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      const progress = result.current.getProgress();
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // 分组 8: 清理和内存管理
  // ============================================================================

  describe('清理和内存管理', () => {
    it('卸载 Hook 时应该清理计时器', () => {
      const scene: AnimationScene = {
        name: 'CleanupScene',
        concurrent: false,
        steps: [{ name: 'Step1', delay: 0, duration: 1000 }],
      };

      const { result, unmount } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      expect(result.current.isAnimating).toBe(true);

      // 卸载不应抛出
      unmount();

      // 推进时间确保计时器已被清理，不会触发错误
      act(() => {
        jest.advanceTimersByTime(2000);
      });
    });

    it('stop() 应该清理所有挂起的计时器', () => {
      const execution: string[] = [];

      const scene: AnimationScene = {
        name: 'StopScene',
        concurrent: false,
        steps: [
          { name: 'Step1', delay: 0, duration: 100, onStart: () => execution.push('Step1-Start') },
          { name: 'Step2', delay: 200, duration: 100, onStart: () => execution.push('Step2-Start') },
        ],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
        jest.advanceTimersByTime(0); // Step1 fires
      });

      expect(execution).toContain('Step1-Start');

      act(() => {
        result.current.stop();
        jest.advanceTimersByTime(300); // Step2 should NOT fire
      });

      expect(execution).not.toContain('Step2-Start');
    });
  });

  // ============================================================================
  // 分组 9: prefers-reduced-motion
  // ============================================================================

  describe('prefers-reduced-motion', () => {
    it('减少运动时应立即调用所有 onStart/onEnd', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      const execution: string[] = [];

      const scene: AnimationScene = {
        name: 'ReducedMotionScene',
        concurrent: false,
        steps: [
          {
            name: 'Step1',
            delay: 100,
            duration: 300,
            onStart: () => execution.push('Start'),
            onEnd: () => execution.push('End'),
          },
        ],
        onSceneStart: () => execution.push('SceneStart'),
        onSceneEnd: () => execution.push('SceneEnd'),
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      // 所有回调应立即执行，不需要等待延迟
      expect(execution).toContain('Start');
      expect(execution).toContain('End');
      expect(execution).toContain('SceneStart');
      expect(execution).toContain('SceneEnd');

      // 动画不应启动
      expect(result.current.isAnimating).toBe(false);
    });

    it('respectReducedMotion=false 时应忽略 reduce 设置', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: true,
        media: '',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      });

      const scene: AnimationScene = {
        name: 'ForceAnimationScene',
        concurrent: false,
        respectReducedMotion: false,
        steps: [{ name: 'Step1', delay: 0, duration: 100 }],
      };

      const { result } = renderHook(() => useAnimationOrchestra(scene));

      act(() => {
        result.current.play();
      });

      // 动画应正常启动
      expect(result.current.isAnimating).toBe(true);
    });
  });
});

/**
 * 集成测试：多个场景协调
 */
describe('useAnimationOrchestra 集成测试', () => {
  it('应该支持多个独立的场景', () => {
    const execution: string[] = [];

    const scene1: AnimationScene = {
      name: 'Scene1',
      concurrent: false,
      steps: [{ name: 'Step1', delay: 0, duration: 50, onStart: () => execution.push('S1') }],
    };

    const scene2: AnimationScene = {
      name: 'Scene2',
      concurrent: false,
      steps: [{ name: 'Step1', delay: 0, duration: 50, onStart: () => execution.push('S2') }],
    };

    const { result: result1 } = renderHook(() => useAnimationOrchestra(scene1));
    const { result: result2 } = renderHook(() => useAnimationOrchestra(scene2));

    act(() => {
      result1.current.play();
      result2.current.play();
      jest.advanceTimersByTime(0);
    });

    expect(execution).toContain('S1');
    expect(execution).toContain('S2');
  });
});
