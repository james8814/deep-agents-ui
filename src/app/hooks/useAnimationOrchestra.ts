'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 动画编排系统的核心数据类型定义
 */

export interface AnimationStep {
  /**
   * 步骤的唯一标识符
   */
  name: string;

  /**
   * 动画延迟时间（毫秒）
   * 相对于编排开始时刻的偏移
   */
  delay: number;

  /**
   * 动画持续时间（毫秒）
   */
  duration: number;

  /**
   * 步骤执行的条件判断函数
   * 返回 false 时跳过该步骤
   */
  condition?: () => boolean;

  /**
   * 步骤开始时的回调函数
   * 在延迟后、持续时间开始时调用
   */
  onStart?: () => void;

  /**
   * 步骤结束时的回调函数
   * 在延迟 + 持续时间后调用
   */
  onEnd?: () => void;

  /**
   * 步骤进度监听函数（可选）
   * 在动画过程中定期调用，传入当前进度 0-1
   */
  onProgress?: (progress: number) => void;
}

export interface AnimationScene {
  /**
   * 场景的唯一标识符
   */
  name: string;

  /**
   * 是否并发执行所有步骤
   * true: 所有步骤同时开始，延迟各自独立
   * false: 步骤顺序执行，每个步骤等待前一个完成后才开始
   */
  concurrent: boolean;

  /**
   * 该场景中的所有动画步骤
   */
  steps: AnimationStep[];

  /**
   * 场景开始时的回调函数
   */
  onSceneStart?: () => void;

  /**
   * 场景结束时的回调函数
   */
  onSceneEnd?: () => void;

  /**
   * 是否在用户系统设置要求减少运动时禁用此场景
   * 默认: true (尊重 prefers-reduced-motion)
   */
  respectReducedMotion?: boolean;
}

export interface UseAnimationOrchestraReturn {
  /**
   * 当前是否正在动画执行中
   */
  isAnimating: boolean;

  /**
   * 启动编排动画
   */
  play: () => void;

  /**
   * 暂停编排动画
   */
  pause: () => void;

  /**
   * 停止编排动画并重置
   */
  stop: () => void;

  /**
   * 获取当前场景的总时长（毫秒）
   */
  getTotalDuration: () => number;

  /**
   * 获取当前编排的进度（0-1）
   */
  getProgress: () => number;

  /**
   * 监听动画帧更新
   * 可用于构建进度条或实时反馈
   */
  onFrame?: (callback: (progress: number, elapsed: number) => void) => void;
}

/**
 * useAnimationOrchestra Hook
 *
 * 统一管理应用内的动画编排，解决多个组件动画的协调问题。
 *
 * 核心功能：
 * 1. 支持步骤级动画编排（顺序或并发）
 * 2. 灵活的延迟和条件控制
 * 3. 尊重用户的 prefers-reduced-motion 设置
 * 4. 完整的生命周期回调（start/progress/end）
 * 5. 播放控制（play/pause/stop）
 * 6. 性能优化（使用 requestAnimationFrame 而非 setInterval）
 *
 * @param scene - 动画场景定义
 * @returns 动画控制对象
 *
 * @example
 * ```tsx
 * const messageScene: AnimationScene = {
 *   name: 'MessageAppears',
 *   concurrent: false,
 *   steps: [
 *     {
 *       name: 'MessageSlideUp',
 *       delay: 0,
 *       duration: 300,
 *       onStart: () => addClass(messageEl, 'animate-slideUp'),
 *       onEnd: () => removeClass(messageEl, 'animate-slideUp'),
 *     },
 *     {
 *       name: 'AutoScroll',
 *       delay: 50,
 *       duration: 200,
 *       condition: () => !isManuallyScrolled,
 *       onStart: () => scrollToBottom(),
 *     },
 *   ],
 * };
 *
 * const { isAnimating, play, getTotalDuration } = useAnimationOrchestra(messageScene);
 *
 * useEffect(() => {
 *   play();
 * }, [newMessage]);
 * ```
 */
export function useAnimationOrchestra(
  scene: AnimationScene
): UseAnimationOrchestraReturn {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const timeoutRefsRef = useRef<NodeJS.Timeout[]>([]);
  const frameRefsRef = useRef<number[]>([]);
  const startTimeRef = useRef<number | null>(null);
  const elapsedTimeRef = useRef<number>(0);
  const progressCallbackRef = useRef<(progress: number, elapsed: number) => void | null>(null);

  // 检查用户是否要求减少运动
  const shouldReduceMotion = (): boolean => {
    if (typeof window === 'undefined') return false;
    if (scene.respectReducedMotion === false) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  // 计算场景总时长
  const getTotalDuration = (): number => {
    if (scene.steps.length === 0) return 0;

    if (scene.concurrent) {
      // 并发模式：取所有步骤的最大时长
      return Math.max(...scene.steps.map((step) => step.delay + step.duration), 0);
    } else {
      // 顺序模式：求和所有步骤的时长
      return scene.steps.reduce((sum, step) => sum + step.delay + step.duration, 0);
    }
  };

  // 计算当前进度 (0-1)
  const getProgress = (): number => {
    const totalDuration = getTotalDuration();
    if (totalDuration === 0) return 1;
    return Math.min(elapsedTimeRef.current / totalDuration, 1);
  };

  // 清理所有计时器和帧
  const cleanup = (): void => {
    timeoutRefsRef.current.forEach((timeout) => clearTimeout(timeout));
    frameRefsRef.current.forEach((frameId) => cancelAnimationFrame(frameId));
    timeoutRefsRef.current = [];
    frameRefsRef.current = [];
    startTimeRef.current = null;
    elapsedTimeRef.current = 0;
  };

  // 执行单个步骤
  const executeStep = (step: AnimationStep, sceneStartTime: number): void => {
    // 检查条件
    if (step.condition?.() === false) {
      return;
    }

    // 延迟后执行 onStart
    const startTimeout = setTimeout(() => {
      if (!isAnimating) return;
      try {
        step.onStart?.();
      } catch (error) {
        // ✅ 错误处理：记录错误但继续执行动画
        console.error(
          `[AnimationError] Step "${step.name}" onStart failed:`,
          error
        );
      }
    }, step.delay);

    timeoutRefsRef.current.push(startTimeout);

    // 在延迟 + 持续时间后执行 onEnd
    const endTimeout = setTimeout(() => {
      if (!isAnimating) return;
      try {
        step.onEnd?.();
      } catch (error) {
        // ✅ 错误处理：记录错误但继续执行动画
        console.error(
          `[AnimationError] Step "${step.name}" onEnd failed:`,
          error
        );
      }
    }, step.delay + step.duration);

    timeoutRefsRef.current.push(endTimeout);

    // 如果有进度监听，使用 requestAnimationFrame 监测
    if (step.onProgress) {
      const stepStartTime = sceneStartTime + step.delay;
      const stepEndTime = stepStartTime + step.duration;

      const updateProgress = (): void => {
        const now = performance.now();

        if (now < stepStartTime) {
          // 步骤还未开始
          frameRefsRef.current.push(requestAnimationFrame(updateProgress));
          return;
        }

        if (now >= stepEndTime) {
          // 步骤已完成
          try {
            step.onProgress?.(1);
          } catch (error) {
            console.error(
              `[AnimationError] Step "${step.name}" onProgress failed:`,
              error
            );
          }
          return;
        }

        // 计算进度
        const stepProgress = (now - stepStartTime) / step.duration;
        try {
          step.onProgress?.(Math.min(stepProgress, 1));
        } catch (error) {
          console.error(
            `[AnimationError] Step "${step.name}" onProgress failed:`,
            error
          );
        }

        frameRefsRef.current.push(requestAnimationFrame(updateProgress));
      };

      frameRefsRef.current.push(requestAnimationFrame(updateProgress));
    }
  };

  // 播放动画
  const play = (): void => {
    if (isAnimating) return;

    // 如果用户要求减少运动，立即调用所有 onEnd 回调
    if (shouldReduceMotion()) {
      scene.steps.forEach((step) => {
        if (step.condition?.() !== false) {
          step.onStart?.();
          step.onEnd?.();
        }
      });
      scene.onSceneStart?.();
      scene.onSceneEnd?.();
      return;
    }

    cleanup();
    setIsAnimating(true);
    setIsPaused(false);

    const sceneStartTime = performance.now();
    startTimeRef.current = sceneStartTime;
    elapsedTimeRef.current = 0;

    scene.onSceneStart?.();

    // 执行所有步骤
    scene.steps.forEach((step) => {
      executeStep(step, sceneStartTime);
    });

    // 监测整个场景的进度
    const monitorProgress = (): void => {
      if (!isAnimating) return;

      const now = performance.now();
      elapsedTimeRef.current = now - sceneStartTime;
      const progress = getProgress();

      progressCallbackRef.current?.(progress, elapsedTimeRef.current);

      // 如果场景未完成，继续监测
      if (progress < 1) {
        frameRefsRef.current.push(requestAnimationFrame(monitorProgress));
      } else {
        // 场景完成
        setIsAnimating(false);
        scene.onSceneEnd?.();
      }
    };

    frameRefsRef.current.push(requestAnimationFrame(monitorProgress));
  };

  // 暂停动画
  const pause = (): void => {
    if (!isAnimating) return;
    setIsPaused(true);
    cleanup();
  };

  // 停止动画
  const stop = (): void => {
    setIsAnimating(false);
    setIsPaused(false);
    cleanup();
  };

  // 注册帧更新监听
  const onFrame = (callback: (progress: number, elapsed: number) => void): void => {
    progressCallbackRef.current = callback;
  };

  // 清理副作用
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    isAnimating,
    play,
    pause,
    stop,
    getTotalDuration,
    getProgress,
    onFrame,
  };
}
