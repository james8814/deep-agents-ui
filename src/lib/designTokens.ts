/**
 * Design Tokens - Global design system constants
 * Mapped from Liquid Iris Design System (v5.26)
 *
 * Token Hierarchy:
 * Global Tokens (raw values) → Semantic Tokens (aliases) → Component Tokens (usage)
 */

export const designTokens = {
  // ============================================================================
  // 1. BRAND COLORS
  // ============================================================================
  brand: {
    gradient: 'linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)',
    gradientSubtle: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))',
  },

  // ============================================================================
  // 2. PRIMARY COLORS (Purple Family)
  // ============================================================================
  light: {
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    primaryActive: '#5B21B6',
    primarySubtle: '#F5F3FF',
  },

  dark: {
    primary: '#8B5CF6',
    primaryHover: '#A78BFA',
    primaryActive: '#7C3AED',
    primarySubtle: 'rgba(139, 92, 246, 0.15)',
  },

  // ============================================================================
  // 3. SURFACE COLORS (Light Mode)
  // ============================================================================
  surfaces: {
    light: {
      base: '#FFFFFF',
      raised: '#FAFAF9',
      card: '#FFFFFF',
      sidebar: '#F5F5F4',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    dark: {
      base: '#0A0A12',
      raised: '#12121E',
      card: '#1A1A2E',
      sidebar: '#12121E',
      elevated: '#24243A',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
  },

  // ============================================================================
  // 4. TEXT COLORS
  // ============================================================================
  text: {
    light: {
      primary: '#1A1816',
      secondary: '#5C5650',
      tertiary: '#8A8580',
      disabled: '#A9A59F',
      onPrimary: '#FFFFFF',
    },
    dark: {
      primary: 'rgba(255, 255, 255, 0.95)',
      secondary: 'rgba(255, 255, 255, 0.70)',
      tertiary: 'rgba(255, 255, 255, 0.50)',
      disabled: 'rgba(255, 255, 255, 0.30)',
      onPrimary: '#FFFFFF',
    },
  },

  // ============================================================================
  // 5. BORDERS
  // ============================================================================
  borders: {
    light: {
      subtle: 'rgba(0, 0, 0, 0.04)',
      default: 'rgba(0, 0, 0, 0.08)',
      strong: 'rgba(0, 0, 0, 0.14)',
      focus: '#7C3AED',
    },
    dark: {
      subtle: 'rgba(255, 255, 255, 0.04)',
      default: 'rgba(255, 255, 255, 0.08)',
      strong: 'rgba(255, 255, 255, 0.14)',
      focus: '#8B5CF6',
    },
  },

  // ============================================================================
  // 6. STATUS COLORS
  // ============================================================================
  status: {
    light: {
      success: '#22C55E',
      successBg: '#F0FDF4',
      warning: '#F59E0B',
      warningBg: '#FFFBEB',
      error: '#EF4444',
      errorBg: '#FEF2F2',
      info: '#7C3AED',
      infoBg: '#F5F3FF',
    },
    dark: {
      success: '#10B981',
      successBg: 'rgba(16, 185, 129, 0.10)',
      warning: '#FBBF24',
      warningBg: 'rgba(251, 191, 36, 0.10)',
      error: '#F87171',
      errorBg: 'rgba(248, 113, 113, 0.10)',
      info: '#A78BFA',
      infoBg: 'rgba(139, 92, 246, 0.10)',
    },
  },

  // ============================================================================
  // 7. OPDCA STAGE COLORS
  // ============================================================================
  opdca: {
    observe: '#06B6D4',  // Cyan
    plan: '#6366F1',      // Violet
    do: '#10B981',        // Emerald
    check: '#F59E0B',     // Amber
    adapt: '#EC4899',     // Pink
  },

  // ============================================================================
  // 8. SUBAGENT COLORS
  // ============================================================================
  subagents: {
    research: '#06B6D4',
    analysis: '#6366F1',
    design: '#EC4899',
    writing: '#F59E0B',
    document: '#10B981',
    reflection: '#8B5CF6',
  },

  // ============================================================================
  // 9. TYPOGRAPHY
  // ============================================================================
  typography: {
    fontFamilies: {
      sans: '"Inter", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, -apple-system, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", "SF Mono", monospace',
    },
    fontSizes: {
      xs: '0.75rem',    // 12px
      sm: '0.8125rem',  // 13px
      base: '0.875rem', // 14px
      md: '0.9375rem',  // 15px
      lg: '1rem',       // 16px
      xl: '1.125rem',   // 18px
      '2xl': '1.25rem', // 20px
      '3xl': '1.5rem',  // 24px
    },
    lineHeights: {
      tight: 1.33,
      snug: 1.5,
      normal: 1.57,
      relaxed: 1.7,
      loose: 1.8,
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // ============================================================================
  // 10. SPACING (Base 4px grid)
  // ============================================================================
  spacing: {
    '0': '0',
    '0.5': '2px',
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
  },

  // ============================================================================
  // 11. BORDER RADIUS
  // ============================================================================
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
    '2xl': '16px',
    full: '9999px',
  },

  // ============================================================================
  // 12. SHADOWS
  // ============================================================================
  shadows: {
    light: {
      xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
      sm: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
    },
    dark: {
      xs: 'none',
      sm: 'none',
      md: 'none',
      lg: 'none',
      xl: 'none',
    },
  },

  // ============================================================================
  // 13. MOTION
  // ============================================================================
  motion: {
    durations: {
      instant: '50ms',
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.25, 0.1, 0.25, 1.0)',
      in: 'cubic-bezier(0.42, 0, 1.0, 1.0)',
      out: 'cubic-bezier(0, 0, 0.58, 1.0)',
      inOut: 'cubic-bezier(0.42, 0, 0.58, 1.0)',
    },
  },

  // ============================================================================
  // 14. Z-INDEX
  // ============================================================================
  zIndex: {
    base: 0,
    raised: 1,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    toast: 60,
    max: 9999,
  },

  // ============================================================================
  // 15. BREAKPOINTS
  // ============================================================================
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // ============================================================================
  // 16. COMPONENT TOKENS
  // ============================================================================
  components: {
    // Button
    button: {
      primary: {
        light: {
          bg: 'linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)',
          bgHover: 'linear-gradient(135deg, #7C3AED, #9F67FF, #F43F5E)',
          text: '#FFFFFF',
        },
        dark: {
          bg: 'linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)',
          bgHover: 'linear-gradient(135deg, #7C3AED, #9F67FF, #F43F5E)',
          text: '#FFFFFF',
        },
      },
      secondary: {
        light: {
          bg: 'transparent',
          border: 'rgba(0, 0, 0, 0.08)',
          text: '#1A1816',
        },
        dark: {
          bg: 'transparent',
          border: 'rgba(255, 255, 255, 0.08)',
          text: 'rgba(255, 255, 255, 0.95)',
        },
      },
      sizes: {
        sm: {
          height: '32px',
          padding: '8px 12px',
        },
        md: {
          height: '36px',
          padding: '8px 16px',
        },
        lg: {
          height: '40px',
          padding: '12px 20px',
        },
      },
    },

    // Chat Message
    message: {
      light: {
        userBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.10), rgba(236, 72, 153, 0.06))',
        userBorder: '1px solid rgba(139, 92, 246, 0.15)',
        userText: '#1A1816',
        aiBg: 'transparent',
        aiText: '#1A1816',
      },
      dark: {
        userBg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.10))',
        userBorder: '1px solid rgba(139, 92, 246, 0.20)',
        userText: 'rgba(255, 255, 255, 0.95)',
        aiBg: 'transparent',
        aiText: 'rgba(255, 255, 255, 0.95)',
      },
      radius: '12px',
      padding: '12px 16px',
      fontSize: '0.9375rem',
      lineHeight: 1.7,
    },

    // Input
    input: {
      light: {
        bg: '#FFFFFF',
        border: 'rgba(0, 0, 0, 0.08)',
        text: '#1A1816',
        placeholder: '#8A8580',
      },
      dark: {
        bg: '#1A1A2E',
        border: 'rgba(255, 255, 255, 0.08)',
        text: 'rgba(255, 255, 255, 0.95)',
        placeholder: 'rgba(255, 255, 255, 0.50)',
      },
      radius: '8px',
      padding: '8px 12px',
    },

    // Card
    card: {
      light: {
        bg: '#FFFFFF',
        border: 'rgba(0, 0, 0, 0.08)',
      },
      dark: {
        bg: '#1A1A2E',
        border: 'rgba(255, 255, 255, 0.08)',
      },
      radius: '12px',
      padding: '16px',
    },
  },
} as const;

// ============================================================================
// Helper function to get tokens based on theme
// ============================================================================
export function getTokens(isDark: boolean) {
  return {
    surfaces: isDark ? designTokens.surfaces.dark : designTokens.surfaces.light,
    text: isDark ? designTokens.text.dark : designTokens.text.light,
    borders: isDark ? designTokens.borders.dark : designTokens.borders.light,
    status: isDark ? designTokens.status.dark : designTokens.status.light,
    shadows: isDark ? designTokens.shadows.dark : designTokens.shadows.light,
  };
}

// ============================================================================
// Type exports
// ============================================================================
export type DesignTokens = typeof designTokens;
export type ThemeMode = 'light' | 'dark';
