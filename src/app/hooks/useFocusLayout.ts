"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@langchain/langgraph-sdk";
import type { ImperativePanelGroupHandle } from "react-resizable-panels";
import { isAgentStreamingText } from "@/app/utils/utils";

/**
 * useFocusLayout — 会话面板自适应焦点布局 Hook
 *
 * 状态机: idle → dialog ↔ working → idle
 * 唯一触发源: 主 Agent 文字流 (isAgentStreamingText)
 *
 * @see docs/01-architecture/FOCUS_LAYOUT_IMPLEMENTATION_PLAN.md
 */

// ─── 布局常量 ───

const LAYOUTS_2 = {
  dialog: [70, 30],
  working: [30, 70],
};

const LAYOUTS_3 = {
  dialog: [20, 55, 25],
  working: [20, 20, 60],
};

const DEFAULT_WORKING_DELAY = 2000;

// ─── 类型 ───

type FocusState = "idle" | "dialog" | "working";

interface UseFocusLayoutOptions {
  isLoading: boolean;
  messages: Message[];
  panelGroupRef: React.RefObject<ImperativePanelGroupHandle | null>;
  isProgrammaticRef: React.MutableRefObject<boolean>;
  isManualOverrideRef: React.MutableRefObject<boolean>;
  contextPanelOpen: boolean;
  openContextPanel: () => void;
  hasSidebar: boolean;
  threadId: string | null;
  workingDelay?: number;
}

// ─── Hook ───

export function useFocusLayout({
  isLoading,
  messages,
  panelGroupRef,
  isProgrammaticRef,
  isManualOverrideRef,
  contextPanelOpen,
  openContextPanel,
  hasSidebar,
  threadId,
  workingDelay = DEFAULT_WORKING_DELAY,
}: UseFocusLayoutOptions): void {
  const focusStateRef = useRef<FocusState>("idle");
  const workingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userClosedManuallyRef = useRef(false);
  const prevContextOpenRef = useRef(contextPanelOpen);

  // ─── 工具函数 ───

  function getLayout(state: "dialog" | "working") {
    return hasSidebar
      ? (state === "dialog" ? LAYOUTS_3.dialog : LAYOUTS_3.working)
      : (state === "dialog" ? LAYOUTS_2.dialog : LAYOUTS_2.working);
  }

  function shouldAutoResize(): boolean {
    return typeof window !== "undefined" && window.innerWidth >= 768;
  }

  function applyLayout(layout: number[]) {
    if (!shouldAutoResize()) return;
    if (isManualOverrideRef.current) return;
    isProgrammaticRef.current = true;
    panelGroupRef.current?.setLayout(layout);
  }

  function clearWorkingTimer() {
    if (workingTimerRef.current) {
      clearTimeout(workingTimerRef.current);
      workingTimerRef.current = null;
    }
  }

  // ─── Thread 切换重置 ───

  useEffect(() => {
    focusStateRef.current = "idle";
    isManualOverrideRef.current = false;
    userClosedManuallyRef.current = false;
    clearWorkingTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // ─── 用户手动关闭检测 ───

  useEffect(() => {
    if (prevContextOpenRef.current && !contextPanelOpen) {
      userClosedManuallyRef.current = true;
    }
    if (!prevContextOpenRef.current && contextPanelOpen) {
      userClosedManuallyRef.current = false;
      isManualOverrideRef.current = false; // 用户主动打开 = 恢复自动
    }
    prevContextOpenRef.current = contextPanelOpen;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextPanelOpen]);

  // ─── 核心状态机 ───

  useEffect(() => {
    const prevState = focusStateRef.current;
    const streaming = isAgentStreamingText(messages);

    if (!isLoading) {
      // ─── Agent 停止工作 → idle ───
      if (prevState !== "idle") {
        focusStateRef.current = "idle";
        clearWorkingTimer();
        // idle 时恢复 dialog 布局（同时兜底 autoSaveId 持久化）
        if (contextPanelOpen) {
          applyLayout(getLayout("dialog"));
        }
      }
      return;
    }

    // ─── isLoading = true ───

    if (streaming) {
      // ─── 检测到 AI 文字流 → dialog ───
      if (prevState !== "dialog") {
        focusStateRef.current = "dialog";
        clearWorkingTimer();
        if (contextPanelOpen) {
          applyLayout(getLayout("dialog"));
        }
      }
    } else {
      // ─── 无文字流 ───
      if (prevState === "working") {
        // 已经在 working，保持
        return;
      }
      // idle 或 dialog → 启动 working 定时器
      if (workingTimerRef.current) return; // 已有定时器运行中
      workingTimerRef.current = setTimeout(() => {
        workingTimerRef.current = null;
        // 2s 后仍然 isLoading 且无文字流 → 进入 working
        focusStateRef.current = "working";

        if (!contextPanelOpen && !userClosedManuallyRef.current) {
          // 自动打开工作台
          openContextPanel();
          // 面板挂载后设置布局
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              applyLayout(getLayout("working"));
            });
          });
        } else if (contextPanelOpen) {
          applyLayout(getLayout("working"));
        }
      }, workingDelay);
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, messages, contextPanelOpen]);

  // ─── beforeunload 兜底：确保 localStorage 保存的是 dialog 比例 ───

  useEffect(() => {
    const handler = () => {
      const layout = getLayout("dialog");
      panelGroupRef.current?.setLayout(layout);
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      clearWorkingTimer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSidebar]);
}
