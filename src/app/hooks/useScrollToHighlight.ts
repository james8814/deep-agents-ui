"use client";

import { useCallback, useRef } from "react";

/**
 * useScrollToHighlight - 滚动到高亮区域 Hook
 *
 * v5.27 任务进度面板专用
 * - 点击任务标签后平滑滚动到对应的 Step Group
 * - 居中显示高亮区域
 * - 使用 data-task-id 属性定位元素
 *
 * @returns { scrollToTask, containerRef }
 */

interface UseScrollToHighlightOptions {
  /** 滚动行为 */
  behavior?: ScrollBehavior;
  /** 居中偏移量 (像素) */
  offset?: number;
}

interface UseScrollToHighlightReturn {
  /** 滚动到指定任务的高亮区域 */
  scrollToTask: (taskId: string) => void;
  /** 容器 Ref (需要绑定到可滚动容器) */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useScrollToHighlight(
  options: UseScrollToHighlightOptions = {}
): UseScrollToHighlightReturn {
  const { behavior = "smooth", offset = 0 } = options;
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 滚动到指定任务的高亮区域
   * @param taskId - 任务 ID (对应 data-task-id 属性)
   */
  const scrollToTask = useCallback(
    (taskId: string) => {
      const container = containerRef.current;
      if (!container) {
        console.debug("[useScrollToHighlight] 容器未挂载");
        return;
      }

      // 查找目标元素
      const targetElement = container.querySelector(
        `[data-task-id="${taskId}"]`
      );
      if (!targetElement) {
        console.debug(`[useScrollToHighlight] 未找到 taskId=${taskId} 的元素`);
        return;
      }

      // 计算滚动位置 (居中显示)
      const containerRect = container.getBoundingClientRect();
      const targetRect = targetElement.getBoundingClientRect();

      // 计算居中滚动位置
      const scrollTop =
        container.scrollTop +
        targetRect.top -
        containerRect.top -
        containerRect.height / 2 +
        targetRect.height / 2 +
        offset;

      // 平滑滚动
      container.scrollTo({
        top: Math.max(0, scrollTop),
        behavior,
      });

      console.debug(`[useScrollToHighlight] 滚动到 taskId=${taskId}`);
    },
    [behavior, offset]
  );

  return {
    scrollToTask,
    containerRef,
  };
}

export default useScrollToHighlight;
