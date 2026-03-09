/**
 * Color System - Complete color palette mapping
 * Maps design tokens to CSS variables and utility classes
 */

import { designTokens, type ThemeMode } from './designTokens';

/**
 * CSS Variables mapping for light mode
 */
export const lightModeColors = {
  // Brand
  '--brand-gradient': designTokens.brand.gradient,
  '--brand-gradient-subtle': designTokens.brand.gradientSubtle,

  // Primary Colors
  '--color-primary': designTokens.light.primary,
  '--color-primary-hover': designTokens.light.primaryHover,
  '--color-primary-active': designTokens.light.primaryActive,
  '--color-primary-subtle': designTokens.light.primarySubtle,

  // Surfaces
  '--surface-base': designTokens.surfaces.light.base,
  '--surface-raised': designTokens.surfaces.light.raised,
  '--surface-card': designTokens.surfaces.light.card,
  '--surface-sidebar': designTokens.surfaces.light.sidebar,
  '--surface-overlay': designTokens.surfaces.light.overlay,

  // Text
  '--text-primary': designTokens.text.light.primary,
  '--text-secondary': designTokens.text.light.secondary,
  '--text-tertiary': designTokens.text.light.tertiary,
  '--text-disabled': designTokens.text.light.disabled,
  '--text-on-primary': designTokens.text.light.onPrimary,

  // Borders
  '--border-subtle': designTokens.borders.light.subtle,
  '--border-default': designTokens.borders.light.default,
  '--border-strong': designTokens.borders.light.strong,
  '--border-focus': designTokens.borders.light.focus,

  // Status
  '--color-success': designTokens.status.light.success,
  '--color-success-bg': designTokens.status.light.successBg,
  '--color-warning': designTokens.status.light.warning,
  '--color-warning-bg': designTokens.status.light.warningBg,
  '--color-error': designTokens.status.light.error,
  '--color-error-bg': designTokens.status.light.errorBg,
  '--color-info': designTokens.status.light.info,
  '--color-info-bg': designTokens.status.light.infoBg,

  // OPDCA Stages
  '--opdca-observe': designTokens.opdca.observe,
  '--opdca-plan': designTokens.opdca.plan,
  '--opdca-do': designTokens.opdca.do,
  '--opdca-check': designTokens.opdca.check,
  '--opdca-adapt': designTokens.opdca.adapt,

  // SubAgents
  '--agent-research': designTokens.subagents.research,
  '--agent-analysis': designTokens.subagents.analysis,
  '--agent-design': designTokens.subagents.design,
  '--agent-writing': designTokens.subagents.writing,
  '--agent-document': designTokens.subagents.document,
  '--agent-reflection': designTokens.subagents.reflection,

  // Shadows
  '--shadow-xs': designTokens.shadows.light.xs,
  '--shadow-sm': designTokens.shadows.light.sm,
  '--shadow-md': designTokens.shadows.light.md,
  '--shadow-lg': designTokens.shadows.light.lg,
  '--shadow-xl': designTokens.shadows.light.xl,
} as const;

/**
 * CSS Variables mapping for dark mode
 */
export const darkModeColors = {
  // Brand
  '--brand-gradient': designTokens.brand.gradient,
  '--brand-gradient-subtle': designTokens.brand.gradientSubtle,

  // Primary Colors
  '--color-primary': designTokens.dark.primary,
  '--color-primary-hover': designTokens.dark.primaryHover,
  '--color-primary-active': designTokens.dark.primaryActive,
  '--color-primary-subtle': designTokens.dark.primarySubtle,

  // Surfaces
  '--surface-base': designTokens.surfaces.dark.base,
  '--surface-raised': designTokens.surfaces.dark.raised,
  '--surface-card': designTokens.surfaces.dark.card,
  '--surface-sidebar': designTokens.surfaces.dark.sidebar,
  '--surface-overlay': designTokens.surfaces.dark.overlay,

  // Text
  '--text-primary': designTokens.text.dark.primary,
  '--text-secondary': designTokens.text.dark.secondary,
  '--text-tertiary': designTokens.text.dark.tertiary,
  '--text-disabled': designTokens.text.dark.disabled,
  '--text-on-primary': designTokens.text.dark.onPrimary,

  // Borders
  '--border-subtle': designTokens.borders.dark.subtle,
  '--border-default': designTokens.borders.dark.default,
  '--border-strong': designTokens.borders.dark.strong,
  '--border-focus': designTokens.borders.dark.focus,

  // Status
  '--color-success': designTokens.status.dark.success,
  '--color-success-bg': designTokens.status.dark.successBg,
  '--color-warning': designTokens.status.dark.warning,
  '--color-warning-bg': designTokens.status.dark.warningBg,
  '--color-error': designTokens.status.dark.error,
  '--color-error-bg': designTokens.status.dark.errorBg,
  '--color-info': designTokens.status.dark.info,
  '--color-info-bg': designTokens.status.dark.infoBg,

  // OPDCA Stages
  '--opdca-observe': designTokens.opdca.observe,
  '--opdca-plan': designTokens.opdca.plan,
  '--opdca-do': designTokens.opdca.do,
  '--opdca-check': designTokens.opdca.check,
  '--opdca-adapt': designTokens.opdca.adapt,

  // SubAgents
  '--agent-research': designTokens.subagents.research,
  '--agent-analysis': designTokens.subagents.analysis,
  '--agent-design': designTokens.subagents.design,
  '--agent-writing': designTokens.subagents.writing,
  '--agent-document': designTokens.subagents.document,
  '--agent-reflection': designTokens.subagents.reflection,

  // Shadows
  '--shadow-xs': designTokens.shadows.dark.xs,
  '--shadow-sm': designTokens.shadows.dark.sm,
  '--shadow-md': designTokens.shadows.dark.md,
  '--shadow-lg': designTokens.shadows.dark.lg,
  '--shadow-xl': designTokens.shadows.dark.xl,
} as const;

/**
 * Apply CSS variables to element
 */
export function applyCSSVariables(
  element: HTMLElement,
  colors: Record<string, string>
): void {
  Object.entries(colors).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });
}

/**
 * Get theme-aware color
 */
export function getThemeColor(
  colorKey: string,
  isDark: boolean
): string {
  const colors = isDark ? darkModeColors : lightModeColors;
  return (colors as Record<string, string>)[`--${colorKey}`] || '';
}

/**
 * Color palette for reference
 */
export const colorPalette = {
  // Brand Spectrum
  brand: {
    cyan: '#06B6D4',
    violet: '#8B5CF6',
    pink: '#EC4899',
  },

  // Purple Family (Primary)
  purple: {
    '50': '#F5F3FF',
    '100': '#EDE9FE',
    '200': '#DDD6FE',
    '300': '#C4B5FD',
    '400': '#A78BFA',
    '500': '#8B5CF6',
    '600': '#7C3AED',
    '700': '#6D28D9',
    '800': '#5B21B6',
    '900': '#4C1D95',
  },

  // Grays
  gray: {
    '50': '#F9FAFB',
    '100': '#F3F4F6',
    '200': '#E5E7EB',
    '300': '#D1D5DB',
    '400': '#9CA3AF',
    '500': '#6B7280',
    '600': '#4B5563',
    '700': '#374151',
    '800': '#1F2937',
    '900': '#111827',
  },

  // Status Colors
  success: {
    light: '#22C55E',
    dark: '#10B981',
  },
  warning: {
    light: '#F59E0B',
    dark: '#FBBF24',
  },
  error: {
    light: '#EF4444',
    dark: '#F87171',
  },
  info: {
    light: '#7C3AED',
    dark: '#A78BFA',
  },
} as const;

/**
 * Semantic color aliases
 */
export const semanticColors = {
  // Surface hierarchy
  surfaces: {
    base: '--surface-base',
    raised: '--surface-raised',
    card: '--surface-card',
    sidebar: '--surface-sidebar',
    overlay: '--surface-overlay',
  },

  // Text hierarchy
  text: {
    primary: '--text-primary',
    secondary: '--text-secondary',
    tertiary: '--text-tertiary',
    disabled: '--text-disabled',
    onPrimary: '--text-on-primary',
  },

  // Interactive
  interactive: {
    primary: '--color-primary',
    primaryHover: '--color-primary-hover',
    primaryActive: '--color-primary-active',
    primarySubtle: '--color-primary-subtle',
  },

  // Borders
  borders: {
    subtle: '--border-subtle',
    default: '--border-default',
    strong: '--border-strong',
    focus: '--border-focus',
  },

  // Status
  status: {
    success: '--color-success',
    successBg: '--color-success-bg',
    warning: '--color-warning',
    warningBg: '--color-warning-bg',
    error: '--color-error',
    errorBg: '--color-error-bg',
    info: '--color-info',
    infoBg: '--color-info-bg',
  },

  // OPDCA
  opdca: {
    observe: '--opdca-observe',
    plan: '--opdca-plan',
    do: '--opdca-do',
    check: '--opdca-check',
    adapt: '--opdca-adapt',
  },

  // SubAgents
  agents: {
    research: '--agent-research',
    analysis: '--agent-analysis',
    design: '--agent-design',
    writing: '--agent-writing',
    document: '--agent-document',
    reflection: '--agent-reflection',
  },
} as const;

/**
 * Convert theme mode to colors
 */
export function getColorsByTheme(isDark: boolean) {
  return isDark ? darkModeColors : lightModeColors;
}

export type ColorKey = keyof typeof lightModeColors;
export type ThemeColors = typeof lightModeColors | typeof darkModeColors;
