"use client";

/**
 * useTheme Hook - Access theme context and utilities
 * Provides theme state and helper functions
 */

import { useContext, useCallback, useEffect, useState } from "react";
import { ThemeContext } from "@/contexts/ThemeContext";
import { getThemeColor, getColorsByTheme } from "@/lib/colorSystem";
import {
  getTypographyScale,
  getBodyTextStyle,
  getLabelStyle,
  getDisplayStyle,
} from "@/lib/typographySystem";
import type { ThemeMode } from "@/lib/designTokens";

/**
 * useTheme - Main theme hook
 * @throws {Error} If used outside ThemeContextProvider
 */
export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useTheme must be used within ThemeContextProvider");
  }

  return context;
}

/**
 * useThemeColor - Get theme-aware color
 * @param colorKey - CSS variable name without '--' prefix
 * @example
 * const primary = useThemeColor('color-primary');
 */
export function useThemeColor(colorKey: string): string {
  const { isDark } = useTheme();
  const [color, setColor] = useState("");

  useEffect(() => {
    setColor(getThemeColor(colorKey, isDark));
  }, [colorKey, isDark]);

  return color;
}

/**
 * useThemeColors - Get all theme colors
 * Returns theme-aware color palette
 */
export function useThemeColors() {
  const { isDark } = useTheme();
  const [colors, setColors] = useState(getColorsByTheme(isDark));

  useEffect(() => {
    setColors(getColorsByTheme(isDark));
  }, [isDark]);

  return colors;
}

/**
 * useThemeMode - Simple theme mode helper
 */
export function useThemeMode() {
  const { mode, setTheme, toggleTheme } = useTheme();

  return {
    isDark: mode === "dark",
    isLight: mode === "light",
    mode,
    setToDark: useCallback(() => setTheme("dark"), [setTheme]),
    setToLight: useCallback(() => setTheme("light"), [setTheme]),
    toggle: toggleTheme,
  };
}

/**
 * useSystemThemePreference - System theme preference hook
 */
export function useSystemThemePreference() {
  const { systemPreference, useSystemPreference, setUseSystemPreference } =
    useTheme();

  return {
    systemPreference,
    useSystemPreference,
    setUseSystemPreference,
  };
}

/**
 * useThemeListener - Listen for theme changes
 * @param callback - Function to call when theme changes
 */
export function useThemeListener(
  callback: (isDark: boolean, mode: ThemeMode) => void
): void {
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail.isDark, customEvent.detail.mode);
    };

    window.addEventListener("themechange", handler);
    return () => window.removeEventListener("themechange", handler);
  }, [callback]);
}

/**
 * useResponsive - Responsive design helper
 * Returns object with breakpoint states
 */
export function useResponsive() {
  const [breakpoint, setBreakpoint] = useState<
    "sm" | "md" | "lg" | "xl" | "2xl"
  >("md");

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint("sm");
      else if (width < 768) setBreakpoint("md");
      else if (width < 1024) setBreakpoint("lg");
      else if (width < 1280) setBreakpoint("xl");
      else setBreakpoint("2xl");
    };

    updateBreakpoint();
    window.addEventListener("resize", updateBreakpoint);
    return () => window.removeEventListener("resize", updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === "sm",
    isTablet: breakpoint === "md",
    isDesktop:
      breakpoint === "lg" || breakpoint === "xl" || breakpoint === "2xl",
  };
}

/**
 * useTypography - Typography helper hook
 */
export function useTypography() {
  return {
    heading: (size: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
      getTypographyScale(size),
    body: (size: "xs" | "sm" | "base" | "lg") => getBodyTextStyle(size),
    label: (size: "xs" | "sm" | "base" | "lg") => getLabelStyle(size),
    display: (size: "sm" | "md" | "lg" | "xl") => getDisplayStyle(size),
  };
}

/**
 * useThemeState - Combined theme state hook
 */
export function useThemeState() {
  const { mode, isDark, setTheme, toggleTheme } = useTheme();
  const { systemPreference, useSystemPreference, setUseSystemPreference } =
    useSystemThemePreference();
  const colors = useThemeColors();

  return {
    // Theme state
    mode,
    isDark,
    isLight: !isDark,

    // Actions
    setTheme,
    toggleTheme,
    setToDark: useCallback(() => setTheme("dark"), [setTheme]),
    setToLight: useCallback(() => setTheme("light"), [setTheme]),

    // System preference
    systemPreference,
    useSystemPreference,
    setUseSystemPreference,

    // Colors
    colors,
  };
}

/**
 * useLocalStorage - Simple localStorage hook
 * @param key - Storage key
 * @param defaultValue - Default value if not found
 */
export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        setValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  // Save to localStorage when value changes
  const setStoredValue = useCallback(
    (newValue: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          newValue instanceof Function ? newValue(value) : newValue;
        setValue(valueToStore);
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error writing localStorage key "${key}":`, error);
      }
    },
    [key, value]
  );

  return [value, setStoredValue] as const;
}

export default useTheme;
