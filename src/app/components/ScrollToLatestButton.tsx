"use client";

import React from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ScrollToLatestButton - v5.27 回到最新按钮
 *
 * 设计规格:
 * - 底部居中浮动
 * - 胶囊形 + brand 背景
 * - 显示新日志数量
 * - 入场/退出动画 200ms
 * - 有新日志时脉冲动画
 *
 * 显示条件:
 * - autoScrollEnabled === false
 */

interface ScrollToLatestButtonProps {
  /** 点击回调 */
  onClick: () => void;
  /** 新日志数量 */
  newLogsCount?: number;
  /** 是否有新日志 (触发脉冲动画) */
  hasNew?: boolean;
  /** 自定义类名 */
  className?: string;
}

export const ScrollToLatestButton = React.memo<ScrollToLatestButtonProps>(
  ({ onClick, newLogsCount = 0, hasNew = false, className }) => {
    // 文案
    const label =
      newLogsCount > 0 ? `${newLogsCount} 条新日志 · 点击回到最新` : "回到最新";

    return (
      <button
        onClick={onClick}
        className={cn(
          // 布局
          "fixed bottom-4 left-1/2 -translate-x-1/2",
          "h-9 min-w-[200px] px-4",
          "flex items-center justify-center gap-2",
          // 外观
          "bg-[var(--brand)] text-white",
          "rounded-full", // 胶囊形
          "text-[13px] font-medium",
          "shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
          // 动画
          "animate-[slideUp_200ms_ease-out]",
          "transition-[background,transform] duration-150 ease-out",
          "hover:bg-[var(--brand-d)]",
          "active:scale-[0.98]",
          // 交互
          "cursor-pointer",
          "z-[var(--z-sticky)]",
          // 有新日志时的脉冲动画
          hasNew &&
            "animate-[slideUp_200ms_ease-out,highlightPulse_2s_ease-in-out_infinite]",
          className
        )}
        aria-label="滚动到最新日志"
      >
        <ArrowDown size={14} />
        <span>{label}</span>
      </button>
    );
  }
);

ScrollToLatestButton.displayName = "ScrollToLatestButton";

export default ScrollToLatestButton;
