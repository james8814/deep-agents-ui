"use client";

import React from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ChatModeEmptyState - v5.27 聊天模式空状态
 *
 * 设计规格:
 * - 无任务时显示友好的空状态提示
 * - 提供示例任务引导用户
 * - 渐入动画 150ms fade
 *
 * 显示条件:
 * - todos.length === 0
 */

interface ChatModeEmptyStateProps {
  /** 自定义类名 */
  className?: string;
  /** 点击示例任务回调 */
  onExampleClick?: () => void;
}

export const ChatModeEmptyState = React.memo<ChatModeEmptyStateProps>(
  ({ className, onExampleClick }) => {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center",
          "animate-[fadeIn_150ms_ease-out]",
          className
        )}
      >
        {/* 图标 */}
        <div className="mb-4 rounded-[var(--r-lg)] bg-[var(--bg3)] p-4">
          <MessageSquare
            size={32}
            className="text-[var(--brand)]"
            strokeWidth={1.5}
          />
        </div>

        {/* 标题 */}
        <h3 className="mb-2 text-sm font-semibold text-[var(--t1)]">
          聊天模式
        </h3>

        {/* 描述 */}
        <p className="mb-6 max-w-[280px] text-xs leading-relaxed text-[var(--t3)]">
          当你提出需要多步骤处理的复杂任务时，
          <br />
          Agent 会自动创建任务清单并展示工作进度。
        </p>

        {/* 示例任务按钮 */}
        {onExampleClick && (
          <button
            onClick={onExampleClick}
            className={cn(
              "group flex items-center gap-2 px-4 py-2.5",
              "rounded-[var(--r-md)] border border-[var(--b1)]",
              "bg-[var(--bg2)] hover:bg-[var(--bg3)]",
              "transition-all duration-150 ease-out",
              "hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]"
            )}
          >
            <Sparkles
              size={14}
              className="text-[var(--brand)]"
            />
            <span className="text-xs font-medium text-[var(--t2)] group-hover:text-[var(--t1)]">
              试试复杂任务示例
            </span>
          </button>
        )}

        {/* 提示文字 */}
        <p className="mt-4 text-[10px] text-[var(--t4)]">
          例如: "帮我分析三个竞品并生成 PRD"
        </p>
      </div>
    );
  }
);

ChatModeEmptyState.displayName = "ChatModeEmptyState";

export default ChatModeEmptyState;
