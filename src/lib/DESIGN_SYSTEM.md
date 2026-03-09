# Design System Integration Documentation

## Overview

This document covers the complete design system implementation for Deep Agents UI, based on the **Liquid Iris Design System (v5.26)**.

The design system provides:
- **Token-based design** with centralized CSS variables
- **Theme switching** (light/dark mode) with persistence
- **Type-safe design utilities** in TypeScript
- **Production-ready** components with full backward compatibility

---

## Architecture

### Layer 1: Design Tokens (`designTokens.ts`)

Raw design values organized by category:

```typescript
import { designTokens } from '@/lib/designTokens';

// Access tokens
designTokens.light.primary           // '#7C3AED'
designTokens.dark.primary            // '#8B5CF6'
designTokens.typography.fontSizes.lg // '1rem'
designTokens.spacing['4']             // '16px'
designTokens.opdca.observe            // '#06B6D4'
```

**Categories:**
- Brand (gradients, color spectrum)
- Primary Colors (light/dark variants)
- Surfaces (backgrounds for different contexts)
- Text (hierarchy and states)
- Borders (subtlety levels)
- Status (success, warning, error, info)
- OPDCA Stages (workflow colors)
- SubAgent Colors (agent type colors)
- Typography (fonts, sizes, weights)
- Spacing (4px grid system)
- Border Radius
- Shadows
- Motion (durations, easing)
- Z-Index
- Breakpoints
- Component Tokens (pre-composed styles)

### Layer 2: Color System (`colorSystem.ts`)

Maps tokens to CSS variables with theme awareness:

```typescript
import { lightModeColors, darkModeColors, getThemeColor } from '@/lib/colorSystem';

// Get theme-aware color
const primaryColor = getThemeColor('color-primary', isDark);

// Access all colors for a theme
const colors = isDark ? darkModeColors : lightModeColors;
```

### Layer 3: Typography System (`typographySystem.ts`)

Typography scales and utility classes:

```typescript
import { typographySystem, getBodyTextStyle } from '@/lib/typographySystem';

// Get typography scale
const h1Style = typographySystem.headings.h1;
// { fontSize: '2rem', fontWeight: 700, lineHeight: 1.33, ... }

// Get body text
const bodyStyle = getBodyTextStyle('lg');
```

### Layer 4: Theme Context (`ThemeContext.tsx`)

Manages theme state and provides global CSS variables:

```typescript
'use client';
import { ThemeContextProvider } from '@/contexts/ThemeContext';

export default function RootLayout({ children }) {
  return (
    <ThemeContextProvider>
      {children}
    </ThemeContextProvider>
  );
}
```

### Layer 5: Theme Hooks (`hooks/useTheme.ts`)

React hooks for consuming theme in components:

```typescript
import { useTheme, useThemeColor, useThemeColors } from '@/hooks/useTheme';

function MyComponent() {
  const { isDark, toggleTheme } = useTheme();
  const primaryColor = useThemeColor('color-primary');
  const allColors = useThemeColors();

  return <button onClick={toggleTheme}>Toggle</button>;
}
```

---

## Setup & Integration

### 1. Add Theme Provider to Layout

```typescript
// src/app/layout.tsx
import { ThemeContextProvider } from '@/contexts/ThemeContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ThemeContextProvider defaultTheme="light">
          {children}
        </ThemeContextProvider>
      </body>
    </html>
  );
}
```

### 2. CSS Variables Auto-Applied

The `ThemeContextProvider` automatically:
1. Detects system preference (dark/light)
2. Loads saved theme from localStorage
3. Applies CSS variables to `document.documentElement`
4. Adds `dark` class to html/body elements
5. Updates meta theme-color tag

No additional CSS imports needed!

### 3. Use in Components

```typescript
// Option A: Use hooks
import { useTheme } from '@/hooks/useTheme';

function Component() {
  const { isDark, mode, setTheme } = useTheme();
  return <button onClick={() => setTheme('dark')}>Dark</button>;
}

// Option B: Use CSS variables
function Component() {
  return (
    <div style={{ color: 'var(--text-primary)' }}>
      Content
    </div>
  );
}

// Option C: Use Tailwind classes (with custom config)
function Component() {
  return <div className="text-primary bg-surface-base">Content</div>;
}
```

---

## Available Hooks

### `useTheme()`

Main theme hook - returns theme context.

```typescript
const { mode, isDark, setTheme, toggleTheme } = useTheme();
```

**Returns:**
- `mode: 'light' | 'dark'` - Current theme
- `isDark: boolean` - Convenience flag
- `setTheme(mode)` - Set specific theme
- `toggleTheme()` - Toggle between light/dark
- `systemPreference` - OS preference
- `useSystemPreference` - Follow OS setting
- `setUseSystemPreference(boolean)` - Enable/disable OS sync

### `useThemeColor(colorKey)`

Get theme-aware color by CSS variable name.

```typescript
const primary = useThemeColor('color-primary');
// Light: '#7C3AED', Dark: '#8B5CF6'
```

### `useThemeColors()`

Get all theme colors for current mode.

```typescript
const colors = useThemeColors();
// { '--color-primary': '#7C3AED', '--text-primary': '#1A1816', ... }
```

### `useThemeMode()`

Convenience hook for theme state.

```typescript
const { isDark, isLight, mode, toggle, setToDark, setToLight } = useThemeMode();
```

### `useSystemThemePreference()`

Manage system preference sync.

```typescript
const { systemPreference, useSystemPreference, setUseSystemPreference } = useSystemThemePreference();
```

### `useThemeListener(callback)`

Listen for theme changes anywhere in app.

```typescript
useThemeListener((isDark, mode) => {
  console.log('Theme changed to:', mode);
});
```

### `useResponsive()`

Responsive design helper.

```typescript
const { breakpoint, isMobile, isTablet, isDesktop } = useResponsive();
```

### `useTypography()`

Access typography scales.

```typescript
const { heading, body, label, display } = useTypography();
const h1Style = heading('h1');
const bodyStyle = body('base');
```

### `useThemeState()`

Combined theme state hook.

```typescript
const {
  mode, isDark, colors, toggleTheme,
  systemPreference, useSystemPreference,
} = useThemeState();
```

### `useLocalStorage<T>(key, defaultValue)`

Simple localStorage hook.

```typescript
const [savedValue, setSavedValue] = useLocalStorage('my-key', 'default');
```

---

## CSS Variables Reference

### Colors (Light Mode)

```css
/* Primary */
--color-primary: #7C3AED
--color-primary-hover: #6D28D9
--color-primary-active: #5B21B6
--color-primary-subtle: #F5F3FF

/* Surfaces */
--surface-base: #FFFFFF
--surface-raised: #FAFAF9
--surface-card: #FFFFFF
--surface-sidebar: #F5F5F4

/* Text */
--text-primary: #1A1816
--text-secondary: #5C5650
--text-tertiary: #8A8580
--text-disabled: #A9A59F

/* Borders */
--border-subtle: rgba(0,0,0,0.04)
--border-default: rgba(0,0,0,0.08)
--border-strong: rgba(0,0,0,0.14)
--border-focus: #7C3AED

/* Status */
--color-success: #22C55E
--color-warning: #F59E0B
--color-error: #EF4444
--color-info: #7C3AED
```

### Dark Mode

Same structure, different values:
- `--color-primary: #8B5CF6`
- `--surface-base: #0A0A12`
- `--text-primary: rgba(255,255,255,0.95)`
- etc.

### Typography

```css
--font-sans: "Inter", "PingFang SC", ...
--font-mono: "JetBrains Mono", "Fira Code", ...

--font-size-xs: 0.75rem
--font-size-sm: 0.8125rem
--font-size-base: 0.875rem
--font-size-lg: 1rem
--font-size-xl: 1.125rem
--font-size-2xl: 1.25rem
--font-size-3xl: 1.5rem

--line-height-tight: 1.33
--line-height-snug: 1.5
--line-height-normal: 1.57
--line-height-relaxed: 1.7

--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

### Spacing (4px Grid)

```css
--space-0: 0
--space-0.5: 2px
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

### Motion

```css
--duration-instant: 50ms
--duration-fast: 100ms
--duration-normal: 200ms
--duration-slow: 300ms
--duration-slower: 500ms

--ease-default: cubic-bezier(0.25, 0.1, 0.25, 1.0)
--ease-in: cubic-bezier(0.42, 0, 1.0, 1.0)
--ease-out: cubic-bezier(0, 0, 0.58, 1.0)
--ease-in-out: cubic-bezier(0.42, 0, 0.58, 1.0)
```

### Special Colors

```css
/* OPDCA Stages */
--opdca-observe: #06B6D4
--opdca-plan: #6366F1
--opdca-do: #10B981
--opdca-check: #F59E0B
--opdca-adapt: #EC4899

/* SubAgents */
--agent-research: #06B6D4
--agent-analysis: #6366F1
--agent-design: #EC4899
--agent-writing: #F59E0B
--agent-document: #10B981
--agent-reflection: #8B5CF6
```

---

## Usage Patterns

### Pattern 1: Dynamic Styling

```typescript
function StatusBadge({ type }: { type: 'success' | 'error' | 'warning' }) {
  const colors = useThemeColors();

  const colorMap = {
    success: colors['--color-success'],
    error: colors['--color-error'],
    warning: colors['--color-warning'],
  };

  return (
    <span style={{ color: colorMap[type] }}>
      Status
    </span>
  );
}
```

### Pattern 2: Theme-Aware Component

```typescript
function Button() {
  const { isDark } = useTheme();
  const bgColor = useThemeColor('color-primary');
  const textColor = useThemeColor('text-on-primary');

  return (
    <button
      style={{
        backgroundColor: bgColor,
        color: textColor,
        transition: `all var(--duration-normal) var(--ease-default)`,
      }}
    >
      Click me
    </button>
  );
}
```

### Pattern 3: CSS Variables in CSS

```css
.card {
  background-color: var(--surface-card);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-md);
  transition: all var(--duration-normal) var(--ease-default);
}

.card:hover {
  box-shadow: var(--shadow-lg);
}
```

### Pattern 4: Responsive Design

```typescript
function ResponsiveLayout() {
  const { isMobile, isTablet, isDesktop } = useResponsive();

  return (
    <div className={isMobile ? 'flex-col' : 'flex-row'}>
      {isDesktop && <Sidebar />}
      <Content />
    </div>
  );
}
```

### Pattern 5: OPDCA Status Display

```typescript
function OPDCAIndicator({ stage }: { stage: 'observe' | 'plan' | 'do' | 'check' | 'adapt' }) {
  const color = useThemeColor(`opdca-${stage}`);

  return (
    <div
      style={{
        backgroundColor: color,
        borderRadius: 'var(--radius-full)',
      }}
    />
  );
}
```

---

## Theme Persistence

Theme is automatically persisted to localStorage under two keys:
- `theme-mode`: Stores 'light' or 'dark'
- `theme-mode-use-system`: Boolean for OS sync

Custom storage keys can be provided:

```typescript
<ThemeContextProvider storageKey="my-app-theme">
  {children}
</ThemeContextProvider>
```

---

## Browser Support

- **Light/Dark mode**: All modern browsers
- **CSS Variables**: IE 11+ (with fallbacks)
- **matchMedia**: IE 10+
- **localStorage**: IE 8+

---

## Migration Guide

### From Old Color System

Old → New mapping:

```typescript
// OLD
--color-primary: #1c3c3c          // → --color-primary: #7C3AED
--color-background: #f9f9f9       // → --surface-base: #FFFFFF
--color-text-primary: #111827     // → --text-primary: #1A1816
--color-surface: #f9fafb          // → --surface-raised: #FAFAF9

// NEW (Liquid Iris)
// All tokens are now managed by ThemeContext
// Use CSS variables: var(--color-primary), var(--text-primary), etc.
```

### Updating Components

Before:
```typescript
// Old way - hardcoded colors
<div style={{ color: '#111827' }}>
  Text
</div>
```

After:
```typescript
// New way - uses design tokens
<div style={{ color: 'var(--text-primary)' }}>
  Text
</div>

// Or with hooks
const color = useThemeColor('text-primary');
<div style={{ color }}>
  Text
</div>
```

---

## Testing Theme

### Manual Testing

```typescript
// In browser console
localStorage.setItem('theme-mode', 'dark');
location.reload();

// Check CSS variables
getComputedStyle(document.documentElement).getPropertyValue('--color-primary');
```

### Unit Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '@/hooks/useTheme';
import { ThemeContextProvider } from '@/contexts/ThemeContext';

function wrapper({ children }) {
  return <ThemeContextProvider>{children}</ThemeContextProvider>;
}

test('toggle theme', () => {
  const { result } = renderHook(() => useTheme(), { wrapper });

  expect(result.current.isDark).toBe(false);

  act(() => {
    result.current.toggleTheme();
  });

  expect(result.current.isDark).toBe(true);
});
```

---

## Troubleshooting

### CSS Variables Not Applied

1. Ensure ThemeContextProvider wraps your app
2. Check browser DevTools → Elements → :root → Computed
3. Verify `isMounted` state in ThemeContext (SSR issue)

### Hydration Mismatch

The provider returns `null` during SSR to avoid hydration mismatches. If you see hydration warnings:

1. Ensure `'use client'` directive is present
2. Check that Provider is in a client component
3. Verify no theme-dependent code runs during SSR

### Dark Mode Not Applying

1. Check if `dark` class is on `<html>` or `<body>`
2. Verify CSS media query: `@media (prefers-color-scheme: dark)`
3. Ensure no conflicting CSS overrides

### Colors Not Changing on Theme Toggle

1. Use CSS variables: `var(--color-primary)` not hardcoded colors
2. Use hooks: `useThemeColor()` or `useTheme()`
3. Re-render component when theme changes

---

## Performance

- **Lazy loading**: CSS variables are applied only when needed
- **No re-renders on scroll**: Motion uses CSS transitions
- **Minimal overhead**: Single context provider for entire app
- **Efficient listeners**: System preference listener cleaned up on unmount

---

## File Structure

```
src/
├── lib/
│   ├── designTokens.ts        # Raw design token definitions
│   ├── colorSystem.ts         # Color palette and CSS variable mapping
│   ├── typographySystem.ts    # Typography scales and utilities
│   └── DESIGN_SYSTEM.md       # This file
├── contexts/
│   └── ThemeContext.tsx       # Theme provider and state
├── hooks/
│   └── useTheme.ts            # Theme consumption hooks
└── app/
    └── globals.css            # Global styles with CSS variables
```

---

## Contributing

When adding new design tokens:

1. Add to `designTokens.ts`
2. Add CSS variable mapping to `colorSystem.ts` or `typographySystem.ts`
3. Update `globals.css` with CSS variables
4. Update this documentation
5. Test light and dark modes

---

## References

- **Design System**: Liquid Iris (v5.26)
- **Color Palette**: Purple-based with status colors
- **Typography**: Inter (sans-serif), JetBrains Mono (monospace)
- **Spacing**: 4px base grid
- **Motion**: Cubic-bezier easing with duration tokens

