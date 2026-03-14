/**
 * @deprecated This module is part of System A (ThemeContext + applyCSSVariables).
 * Typography is now defined in design-system.css (Azune v5.26 spec).
 * Will be removed in Phase 1-3 component migration.
 *
 * Typography System - Complete typography definitions and utilities
 * Mapped from Liquid Iris Design System (v5.26)
 */

import { designTokens } from "./designTokens";

/**
 * Typography scales and styles
 */
export const typographySystem = {
  // ============================================================================
  // FONT FAMILIES
  // ============================================================================
  fontFamilies: {
    sans: designTokens.typography.fontFamilies.sans,
    mono: designTokens.typography.fontFamilies.mono,
  },

  // ============================================================================
  // HEADING STYLES
  // ============================================================================
  headings: {
    h1: {
      fontSize: "2rem", // 32px
      fontWeight: 700,
      lineHeight: 1.33,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "1.75rem", // 28px
      fontWeight: 700,
      lineHeight: 1.33,
      letterSpacing: "-0.015em",
    },
    h3: {
      fontSize: "1.5rem", // 24px
      fontWeight: 700,
      lineHeight: 1.33,
      letterSpacing: "-0.01em",
    },
    h4: {
      fontSize: "1.25rem", // 20px
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: "-0.005em",
    },
    h5: {
      fontSize: "1.125rem", // 18px
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: "1rem", // 16px
      fontWeight: 600,
      lineHeight: 1.5,
    },
  },

  // ============================================================================
  // BODY TEXT STYLES
  // ============================================================================
  body: {
    lg: {
      fontSize: "1.125rem", // 18px
      fontWeight: 400,
      lineHeight: 1.7,
      letterSpacing: "0em",
    },
    base: {
      fontSize: "1rem", // 16px
      fontWeight: 400,
      lineHeight: 1.57,
      letterSpacing: "0em",
    },
    sm: {
      fontSize: "0.9375rem", // 15px
      fontWeight: 400,
      lineHeight: 1.57,
      letterSpacing: "0em",
    },
    xs: {
      fontSize: "0.875rem", // 14px
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: "0em",
    },
  },

  // ============================================================================
  // LABEL STYLES
  // ============================================================================
  labels: {
    lg: {
      fontSize: "0.9375rem", // 15px
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: "0em",
    },
    base: {
      fontSize: "0.875rem", // 14px
      fontWeight: 500,
      lineHeight: 1.4,
      letterSpacing: "0em",
    },
    sm: {
      fontSize: "0.8125rem", // 13px
      fontWeight: 500,
      lineHeight: 1.38,
      letterSpacing: "0.01em",
    },
    xs: {
      fontSize: "0.75rem", // 12px
      fontWeight: 500,
      lineHeight: 1.33,
      letterSpacing: "0.02em",
    },
  },

  // ============================================================================
  // CODE/MONO STYLES
  // ============================================================================
  code: {
    base: {
      fontSize: "0.875rem", // 14px
      fontWeight: 500,
      lineHeight: 1.6,
      letterSpacing: "0em",
      fontFamily: designTokens.typography.fontFamilies.mono,
    },
    sm: {
      fontSize: "0.8125rem", // 13px
      fontWeight: 500,
      lineHeight: 1.6,
      letterSpacing: "0em",
      fontFamily: designTokens.typography.fontFamilies.mono,
    },
  },

  // ============================================================================
  // CAPTION STYLES
  // ============================================================================
  captions: {
    base: {
      fontSize: "0.75rem", // 12px
      fontWeight: 400,
      lineHeight: 1.33,
      letterSpacing: "0em",
    },
    strong: {
      fontSize: "0.75rem", // 12px
      fontWeight: 500,
      lineHeight: 1.33,
      letterSpacing: "0em",
    },
  },

  // ============================================================================
  // DISPLAY STYLES (Large text for emphasis)
  // ============================================================================
  display: {
    xl: {
      fontSize: "3rem", // 48px
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.03em",
    },
    lg: {
      fontSize: "2.25rem", // 36px
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.025em",
    },
    md: {
      fontSize: "1.875rem", // 30px
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: "-0.02em",
    },
    sm: {
      fontSize: "1.5rem", // 24px
      fontWeight: 600,
      lineHeight: 1.33,
      letterSpacing: "-0.01em",
    },
  },

  // ============================================================================
  // UTILITY CLASSES (Tailwind compatible)
  // ============================================================================
  utilities: {
    // Display classes
    "display-xl": {
      fontSize: "3rem",
      lineHeight: 1.2,
      fontWeight: 700,
    },
    "display-lg": {
      fontSize: "2.25rem",
      lineHeight: 1.2,
      fontWeight: 700,
    },
    "display-md": {
      fontSize: "1.875rem",
      lineHeight: 1.3,
      fontWeight: 700,
    },
    "display-sm": {
      fontSize: "1.5rem",
      lineHeight: 1.33,
      fontWeight: 600,
    },

    // Text classes
    "text-h1": {
      fontSize: "2rem",
      lineHeight: 1.33,
      fontWeight: 700,
    },
    "text-h2": {
      fontSize: "1.75rem",
      lineHeight: 1.33,
      fontWeight: 700,
    },
    "text-h3": {
      fontSize: "1.5rem",
      lineHeight: 1.33,
      fontWeight: 700,
    },
    "text-h4": {
      fontSize: "1.25rem",
      lineHeight: 1.4,
      fontWeight: 600,
    },
    "text-h5": {
      fontSize: "1.125rem",
      lineHeight: 1.4,
      fontWeight: 600,
    },
    "text-h6": {
      fontSize: "1rem",
      lineHeight: 1.5,
      fontWeight: 600,
    },

    // Body text
    "text-body-lg": {
      fontSize: "1.125rem",
      lineHeight: 1.7,
      fontWeight: 400,
    },
    "text-body-base": {
      fontSize: "1rem",
      lineHeight: 1.57,
      fontWeight: 400,
    },
    "text-body-sm": {
      fontSize: "0.9375rem",
      lineHeight: 1.57,
      fontWeight: 400,
    },
    "text-body-xs": {
      fontSize: "0.875rem",
      lineHeight: 1.5,
      fontWeight: 400,
    },

    // Labels
    "label-lg": {
      fontSize: "0.9375rem",
      lineHeight: 1.4,
      fontWeight: 500,
    },
    "label-base": {
      fontSize: "0.875rem",
      lineHeight: 1.4,
      fontWeight: 500,
    },
    "label-sm": {
      fontSize: "0.8125rem",
      lineHeight: 1.38,
      fontWeight: 500,
    },
    "label-xs": {
      fontSize: "0.75rem",
      lineHeight: 1.33,
      fontWeight: 500,
    },

    // Code
    "text-code-base": {
      fontSize: "0.875rem",
      lineHeight: 1.6,
      fontWeight: 500,
      fontFamily: designTokens.typography.fontFamilies.mono,
    },
    "text-code-sm": {
      fontSize: "0.8125rem",
      lineHeight: 1.6,
      fontWeight: 500,
      fontFamily: designTokens.typography.fontFamilies.mono,
    },

    // Captions
    "caption-base": {
      fontSize: "0.75rem",
      lineHeight: 1.33,
      fontWeight: 400,
    },
    "caption-strong": {
      fontSize: "0.75rem",
      lineHeight: 1.33,
      fontWeight: 500,
    },

    // Truncate
    truncate: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    "line-clamp-1": {
      display: "-webkit-box",
      WebkitLineClamp: 1,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },
    "line-clamp-2": {
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },
    "line-clamp-3": {
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
    },
  },
} as const;

/**
 * Get typography styles for a given scale
 */
export function getTypographyScale(
  scale: keyof typeof typographySystem.headings
) {
  return typographySystem.headings[
    scale as keyof typeof typographySystem.headings
  ];
}

/**
 * Get body text styles
 */
export function getBodyTextStyle(size: keyof typeof typographySystem.body) {
  return typographySystem.body[size];
}

/**
 * Get label styles
 */
export function getLabelStyle(size: keyof typeof typographySystem.labels) {
  return typographySystem.labels[size];
}

/**
 * Get code styles
 */
export function getCodeStyle(size: keyof typeof typographySystem.code) {
  return typographySystem.code[size];
}

/**
 * Get display styles
 */
export function getDisplayStyle(size: keyof typeof typographySystem.display) {
  return typographySystem.display[size];
}

/**
 * CSS variables for typography
 */
export const typographyCSSVariables = {
  "--font-sans": designTokens.typography.fontFamilies.sans,
  "--font-mono": designTokens.typography.fontFamilies.mono,

  "--font-size-xs": designTokens.typography.fontSizes.xs,
  "--font-size-sm": designTokens.typography.fontSizes.sm,
  "--font-size-base": designTokens.typography.fontSizes.base,
  "--font-size-md": designTokens.typography.fontSizes.md,
  "--font-size-lg": designTokens.typography.fontSizes.lg,
  "--font-size-xl": designTokens.typography.fontSizes.xl,
  "--font-size-2xl": designTokens.typography.fontSizes["2xl"],
  "--font-size-3xl": designTokens.typography.fontSizes["3xl"],

  "--line-height-tight": `${designTokens.typography.lineHeights.tight}`,
  "--line-height-snug": `${designTokens.typography.lineHeights.snug}`,
  "--line-height-normal": `${designTokens.typography.lineHeights.normal}`,
  "--line-height-relaxed": `${designTokens.typography.lineHeights.relaxed}`,
  "--line-height-loose": `${designTokens.typography.lineHeights.loose}`,

  "--font-weight-normal": `${designTokens.typography.fontWeights.normal}`,
  "--font-weight-medium": `${designTokens.typography.fontWeights.medium}`,
  "--font-weight-semibold": `${designTokens.typography.fontWeights.semibold}`,
  "--font-weight-bold": `${designTokens.typography.fontWeights.bold}`,
} as const;

export type TypographyScale = keyof typeof typographySystem.headings;
export type BodySize = keyof typeof typographySystem.body;
export type LabelSize = keyof typeof typographySystem.labels;
export type DisplaySize = keyof typeof typographySystem.display;
