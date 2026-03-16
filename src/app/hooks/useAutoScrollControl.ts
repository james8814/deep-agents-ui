"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * useAutoScrollControl - 自动滚动控制 Hook
 *
 * v5.27 智能自动滚动交互
 * - 新日志自动滚动到底部
 * - 用户向上滚动时停止自动滚动
 * - 显示"回到最新"按钮 + 新日志计数
 * - 点击按钮或手动滚动到底部恢复自动滚动
 * - 面板展开时重置为自动滚动
 *
 * 竞品对标: Slack, Discord, WhatsApp, GitHub Actions
 */

interface UseAutoScrollControlOptions {
  /** 距离底部的阈值 (像素), 小于此值视为"在底部" */
  bottomThreshold?: number;
  /** 滚动行为 */
  behavior?: ScrollBehavior;
  /** 新日志数量变化回调 */
  onNewLogsCountChange?: (count: number) => void;
  /** 面板可见性 (用于在面板展开时重置滚动) */
  isVisible?: boolean;
}

interface UseAutoScrollControlReturn {
  /** 容器 Ref (需要绑定到可滚动容器) */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** 是否启用自动滚动 */
  autoScrollEnabled: boolean;
  /** 新日志数量 */
  newLogsCount: number;
  /** 滚动事件处理函数 */
  handleScroll: () => void;
  /** 新日志到达时的处理函数 */
  onNewLog: () => void;
  /** 滚动到最新 */
  scrollToLatest: () => void;
  /** 手动启用/禁用自动滚动 */
  setAutoScrollEnabled: (enabled: boolean) => void;
}

export function useAutoScrollControl(
  options: UseAutoScrollControlOptions = {}
): UseAutoScrollControlReturn {
  const {
    bottomThreshold = 50,
    behavior = "smooth",
    onNewLogsCountChange,
    isVisible = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [newLogsCount, setNewLogsCount] = useState(0);

  // 节流滚动处理
  const scrollTimeoutRef = useRef<number | null>(null);

  // 上一次可见性状态
  const prevIsVisibleRef = useRef(isVisible);

  /**
   * 检查是否在底部
   */
  const checkIsAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom < bottomThreshold;
  }, [bottomThreshold]);

  /**
   * 滚动事件处理
   */
  const handleScroll = useCallback(() => {
    // 节流处理
    if (scrollTimeoutRef.current) {
      return;
    }

    scrollTimeoutRef.current = window.setTimeout(() => {
      scrollTimeoutRef.current = null;

      const isAtBottom = checkIsAtBottom();

      if (isAtBottom && !autoScrollEnabled) {
        // 用户滚动到底部，自动恢复
        setAutoScrollEnabled(true);
        setNewLogsCount(0);
        onNewLogsCountChange?.(0);
      } else if (!isAtBottom && autoScrollEnabled) {
        // 用户向上滚动，停止自动滚动
        setAutoScrollEnabled(false);
      }
    }, 100);
  }, [autoScrollEnabled, checkIsAtBottom, onNewLogsCountChange]);

  /**
   * 滚动到底部
   */
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
  }, [behavior]);

  /**
   * 新日志到达时的处理
   */
  const onNewLog = useCallback(() => {
    if (autoScrollEnabled) {
      // 自动滚动到底部
      scrollToBottom();
    } else {
      // 累计新日志数量
      setNewLogsCount((prev) => {
        const newCount = prev + 1;
        onNewLogsCountChange?.(newCount);
        return newCount;
      });
    }
  }, [autoScrollEnabled, scrollToBottom, onNewLogsCountChange]);

  /**
   * 点击"回到最新"按钮
   */
  const scrollToLatest = useCallback(() => {
    scrollToBottom();
    setAutoScrollEnabled(true);
    setNewLogsCount(0);
    onNewLogsCountChange?.(0);
  }, [scrollToBottom, onNewLogsCountChange]);

  /**
   * 面板可见性变化时重置滚动状态
   * 设计规格: 面板收起再展开时，重置为自动滚动
   */
  useEffect(() => {
    // 从不可见变为可见时，重置滚动状态
    if (isVisible && !prevIsVisibleRef.current) {
      setAutoScrollEnabled(true);
      setNewLogsCount(0);
      onNewLogsCountChange?.(0);

      // 延迟滚动到底部，等待 DOM 更新
      setTimeout(() => {
        scrollToBottom();
      }, 50);
    }
    prevIsVisibleRef.current = isVisible;
  }, [isVisible, scrollToBottom, onNewLogsCountChange]);

  // 清理节流定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    autoScrollEnabled,
    newLogsCount,
    handleScroll,
    onNewLog,
    scrollToLatest,
    setAutoScrollEnabled,
  };
}

export default useAutoScrollControl;
