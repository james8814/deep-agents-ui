"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * AzuneWordmark Component
 *
 * AZUNE brand wordmark - 精准匹配设计文件
 * 设计文件: docs/brand/azune_wordmark.svg
 *
 * 设计参数:
 * - 字母高度: 110px (y: -55 to 55)
 * - stroke-width: 5.5px
 * - stroke-linecap: round
 * - stroke-linejoin: round
 * - 圆环: 外圆 r=14, 内圆 r=7, 位于 A 的几何中心 (0, 0)
 * - E 字母: 紫色呼应圆环
 *
 * 坐标系统:
 * - A: x = -126
 * - Z: x = -52
 * - U: x = 14
 * - N: x = 80
 * - E: x = 142
 */

export interface AzuneWordmarkProps {
  /** Logo 高度（像素） */
  height?: number;
  /** 颜色模式: auto(自动检测) | light(浅色模式) | dark(深色模式) */
  variant?: "light" | "dark" | "auto";
  /** 额外 CSS 类名 */
  className?: string;
  /** 无障碍标签 */
  ariaLabel?: string;
}

// 设计常量
const DESIGN = {
  // 字母尺寸
  LETTER_HEIGHT: 110, // y: -55 to 55
  STROKE_WIDTH: 5.5,
  // 圆环参数（实体圆环 + 透明中心）
  RING_OUTER_RADIUS: 14,
  RING_INNER_RADIUS: 7,
  RING_CENTER_Y: 0, // A 的几何中心
  // 字母 x 坐标
  POS_A: -126,
  POS_Z: -52,
  POS_U: 14,
  POS_N: 80,
  POS_E: 142,
  // viewBox
  VIEWBOX_X: -180,
  VIEWBOX_Y: -60,
  VIEWBOX_WIDTH: 560,
  VIEWBOX_HEIGHT: 120,
} as const;

// 颜色配置 — 对齐 docs/brand/wordmark/ 设计稿
const COLORS = {
  dark: {
    // 深色背景（深色模式） — azune_wordmark.svg
    letter: "#FFFFFF", // 白色字母
    accent: "#8B5CF6", // 紫色圆环和 E
  },
  light: {
    // 浅色背景（浅色模式） — azune_wordmark_light.svg
    letter: "#0A0A12", // 深色字母（设计稿原值）
    accent: "#8B5CF6", // 紫色圆环和 E（设计稿 light/dark 同色）
  },
} as const;

// 生成唯一 ID
let instanceCounter = 0;

export const AzuneWordmark = React.memo<AzuneWordmarkProps>(
  function AzuneWordmark({
    height = 40,
    variant = "auto",
    className,
    ariaLabel = "AZUNE",
  }) {
    // 生成唯一 ID（避免多个组件实例时 mask ID 冲突）
    const [instanceId] = React.useState(() => `azune-${++instanceCounter}`);

    // 计算宽度（保持宽高比）
    const width = height * (DESIGN.VIEWBOX_WIDTH / DESIGN.VIEWBOX_HEIGHT);

    // 检测当前主题 — 基于 html 元素的 .dark/.light class（跟随手动切换）
    const detect = React.useCallback((): "light" | "dark" => {
      if (typeof window === "undefined") return "dark";
      const html = document.documentElement;
      if (html.classList.contains("dark")) return "dark";
      if (html.classList.contains("light")) return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }, []);

    // 惰性初始化：避免 light 模式用户首次渲染闪现 dark Wordmark
    const [resolvedVariant, setResolvedVariant] = React.useState<
      "light" | "dark"
    >(detect);

    React.useEffect(() => {
      if (variant !== "auto") return;

      setResolvedVariant(detect());

      // 监听 html class 变化（用户手动切换主题时触发）
      let prevIsDark = document.documentElement.classList.contains("dark");
      const observer = new MutationObserver(() => {
        const nowDark = document.documentElement.classList.contains("dark");
        if (nowDark !== prevIsDark) {
          prevIsDark = nowDark;
          setResolvedVariant(detect());
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      // 同时监听系统偏好变化
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      const onSystemChange = () => setResolvedVariant(detect());
      mql.addEventListener("change", onSystemChange);

      return () => {
        observer.disconnect();
        mql.removeEventListener("change", onSystemChange);
      };
    }, [variant, detect]);

    // 确定最终颜色模式
    const effectiveVariant = variant === "auto" ? resolvedVariant : variant;
    const colors = COLORS[effectiveVariant];
    const maskId = `${instanceId}-${effectiveVariant}`;

    return (
      <svg
        viewBox={`${DESIGN.VIEWBOX_X} ${DESIGN.VIEWBOX_Y} ${DESIGN.VIEWBOX_WIDTH} ${DESIGN.VIEWBOX_HEIGHT}`}
        width={width}
        height={height}
        xmlns="http://www.w3.org/2000/svg"
        className={cn("inline-block", className)}
        role="img"
        aria-label={ariaLabel}
        suppressHydrationWarning
      >
        <defs>
          {/* 圆环镂空遮罩 - 白色区域显示，黑色区域透明 */}
          <mask id={maskId}>
            {/* 白色矩形作为底 - 全部可见 */}
            <rect
              x="-100"
              y="-100"
              width="200"
              height="200"
              fill="white"
            />
            {/* 黑色圆 - 挖空（透明） */}
            <circle
              cx="0"
              cy={DESIGN.RING_CENTER_Y}
              r={DESIGN.RING_INNER_RADIUS}
              fill="black"
            />
          </mask>
        </defs>

        <g>
          {/* ===== A 字母 ===== */}
          <g transform={`translate(${DESIGN.POS_A}, 0)`}>
            {/* A 的两条腿 */}
            <line
              x1="-34"
              y1="55"
              x2="0"
              y2="-55"
              stroke={colors.letter}
              strokeWidth={DESIGN.STROKE_WIDTH}
              strokeLinecap="round"
            />
            <line
              x1="34"
              y1="55"
              x2="0"
              y2="-55"
              stroke={colors.letter}
              strokeWidth={DESIGN.STROKE_WIDTH}
              strokeLinecap="round"
            />
            {/* 实体圆环 - 使用 mask 实现真正的镂空 */}
            <circle
              cx="0"
              cy={DESIGN.RING_CENTER_Y}
              r={DESIGN.RING_OUTER_RADIUS}
              fill={colors.accent}
              mask={`url(#${maskId})`}
            />
          </g>

          {/* ===== Z 字母 ===== */}
          <g transform={`translate(${DESIGN.POS_Z}, 0)`}>
            <path
              d="M-26 -55 L26 -55 L-26 55 L26 55"
              fill="none"
              stroke={colors.letter}
              strokeWidth={DESIGN.STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* ===== U 字母 ===== */}
          <g transform={`translate(${DESIGN.POS_U}, 0)`}>
            <path
              d="M-26 -55 L-26 28 Q-26 55 0 55 Q26 55 26 28 L26 -55"
              fill="none"
              stroke={colors.letter}
              strokeWidth={DESIGN.STROKE_WIDTH}
              strokeLinecap="round"
            />
          </g>

          {/* ===== N 字母 ===== */}
          <g transform={`translate(${DESIGN.POS_N}, 0)`}>
            <path
              d="M-26 -55 L-26 55 L26 -55 L26 55"
              fill="none"
              stroke={colors.letter}
              strokeWidth={DESIGN.STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* ===== E 字母（紫色呼应圆环）===== */}
          <g transform={`translate(${DESIGN.POS_E}, 0)`}>
            <path
              d="M18 -55 L-22 -55 L-22 55 L18 55"
              fill="none"
              stroke={colors.accent}
              strokeWidth={DESIGN.STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="-22"
              y1="0"
              x2="14"
              y2="0"
              stroke={colors.accent}
              strokeWidth={DESIGN.STROKE_WIDTH}
              strokeLinecap="round"
            />
          </g>
        </g>
      </svg>
    );
  }
);

AzuneWordmark.displayName = "AzuneWordmark";

export default AzuneWordmark;
