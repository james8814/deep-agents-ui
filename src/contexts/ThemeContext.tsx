"use client";

/**
 * @deprecated This module is part of System A (applyCSSVariables inline styles).
 * Use useSettings (System B, classList-based) instead.
 * Will be removed in Phase 1-3 component migration.
 *
 * ThemeContext - Theme state management and provider
 * Handles light/dark mode switching with persistence
 */

import React, {
  createContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  lightModeColors,
  darkModeColors,
  applyCSSVariables,
} from "@/lib/colorSystem";
import { typographyCSSVariables } from "@/lib/typographySystem";
import type { ThemeMode } from "@/lib/designTokens";

// ============================================================================
// Theme Context Type
// ============================================================================

interface ThemeContextType {
  // State
  mode: ThemeMode;
  isDark: boolean;

  // Actions
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;

  // System preference
  systemPreference: ThemeMode;
  useSystemPreference: boolean;
  setUseSystemPreference: (use: boolean) => void;
}

// ============================================================================
// Create Context
// ============================================================================

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

interface ThemeContextProviderProps {
  children: ReactNode;
  defaultTheme?: ThemeMode;
  storageKey?: string;
}

// ============================================================================
// Theme Provider Component
// ============================================================================

export const ThemeContextProvider: React.FC<ThemeContextProviderProps> = ({
  children,
  defaultTheme = "light",
  storageKey = "theme-mode",
}) => {
  const [mode, setMode] = useState<ThemeMode>(defaultTheme);
  const [isDark, setIsDark] = useState(false);
  const [systemPreference, setSystemPreference] = useState<ThemeMode>("light");
  const [useSystemPreference, setUseSystemPreference] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // =========================================================================
  // Initialize theme from storage and system preference
  // =========================================================================

  useEffect(() => {
    // Detect system preference
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const prefersDark = darkModeQuery.matches;
    setSystemPreference(prefersDark ? "dark" : "light");

    // Get stored theme
    const storedTheme = localStorage.getItem(storageKey) as ThemeMode | null;
    const storedUseSystem = localStorage.getItem(`${storageKey}-use-system`);

    // Determine initial theme
    let initialTheme = defaultTheme;
    let initialUseSystem = true;

    if (storedUseSystem !== null) {
      initialUseSystem = storedUseSystem === "true";
    }

    if (storedTheme && !initialUseSystem) {
      initialTheme = storedTheme;
    } else if (initialUseSystem) {
      initialTheme = prefersDark ? "dark" : "light";
    }

    setMode(initialTheme);
    setIsDark(initialTheme === "dark");
    setUseSystemPreference(initialUseSystem);
    setIsMounted(true);

    // Listen for system preference changes
    const handler = (e: MediaQueryListEvent) => {
      if (useSystemPreference) {
        const newTheme = e.matches ? "dark" : "light";
        setMode(newTheme);
        setIsDark(e.matches);
        setSystemPreference(e.matches ? "dark" : "light");
      }
    };

    darkModeQuery.addEventListener("change", handler);
    return () => darkModeQuery.removeEventListener("change", handler);
  }, [defaultTheme, storageKey, useSystemPreference]);

  // =========================================================================
  // Apply theme to DOM
  // =========================================================================

  useEffect(() => {
    if (!isMounted) return;

    // Update document classes
    const htmlElement = document.documentElement;
    const bodyElement = document.body;

    if (isDark) {
      htmlElement.classList.add("dark");
      bodyElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
      bodyElement.classList.remove("dark");
    }

    // Apply CSS variables
    const colors = isDark ? darkModeColors : lightModeColors;
    applyCSSVariables(htmlElement, colors);

    // Apply typography variables
    applyCSSVariables(htmlElement, typographyCSSVariables);

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", isDark ? "#0A0A12" : "#FFFFFF");
    }

    // Dispatch custom event for components to listen
    window.dispatchEvent(
      new CustomEvent("themechange", {
        detail: { mode: isDark ? "dark" : "light", isDark },
      })
    );
  }, [isDark, isMounted]);

  // =========================================================================
  // Theme Actions
  // =========================================================================

  const setTheme = useCallback(
    (newMode: ThemeMode) => {
      setMode(newMode);
      setIsDark(newMode === "dark");
      localStorage.setItem(storageKey, newMode);
      localStorage.setItem(`${storageKey}-use-system`, "false");
      setUseSystemPreference(false);
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    const newMode = mode === "light" ? "dark" : "light";
    setTheme(newMode);
  }, [mode, setTheme]);

  const handleSetUseSystemPreference = useCallback(
    (use: boolean) => {
      setUseSystemPreference(use);
      localStorage.setItem(`${storageKey}-use-system`, String(use));

      if (use) {
        // Switch to system preference
        const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const prefersDark = darkModeQuery.matches;
        const newMode = prefersDark ? "dark" : "light";
        setMode(newMode);
        setIsDark(newMode === "dark");
        setSystemPreference(prefersDark ? "dark" : "light");
      }
    },
    [storageKey]
  );

  // =========================================================================
  // Render
  // =========================================================================

  if (!isMounted) {
    // Return null during SSR to avoid hydration mismatch
    return <>{children}</>;
  }

  const value: ThemeContextType = {
    mode,
    isDark,
    setTheme,
    toggleTheme,
    systemPreference,
    useSystemPreference,
    setUseSystemPreference: handleSetUseSystemPreference,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export default ThemeContextProvider;
