/**
 * useSettings.ts
 *
 * Custom React hook for managing settings state with localStorage persistence
 * Handles theme, notifications, and user preferences
 */

"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import type {
  UserSettings,
  NotificationSettings,
  Theme,
  ThemePreference,
  SettingsModalState,
} from "./settingsTypes";

/**
 * Default user settings
 */
const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  themePreference: "system",
  notifications: {
    enabled: true,
    soundEnabled: true,
    desktopEnabled: true,
    emailEnabled: false,
  },
  language: "en",
  autoSave: true,
};

/**
 * Default settings modal state
 */
const DEFAULT_STATE: SettingsModalState = {
  isOpen: false,
  activeTab: "appearance",
  isDirty: false,
  isSaving: false,
};

/**
 * Storage key for persisting settings
 */
const SETTINGS_STORAGE_KEY = "pmagent-settings";
const THEME_STORAGE_KEY = "pmagent-theme";

const VALID_PREFERENCES: readonly ThemePreference[] = [
  "light",
  "dark",
  "system",
];

/**
 * Detect system color scheme preference
 */
function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Resolve a ThemePreference to an actual Theme value
 */
function resolveTheme(preference: ThemePreference): Theme {
  if (preference === "system") return getSystemTheme();
  return preference;
}

/**
 * useSettings hook
 *
 * Manages user settings with the following features:
 * - Persistent storage via localStorage
 * - Theme detection and application
 * - Notification settings management
 * - Modal state management
 *
 * @returns Object containing settings state and update functions
 *
 * @example
 * ```tsx
 * const {
 *   settings,
 *   state,
 *   updateSettings,
 *   saveSettings,
 *   toggleModal,
 * } = useSettings();
 * ```
 */
export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [state, setState] = useState<SettingsModalState>(DEFAULT_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  /**
   * Apply theme to document
   */
  const applyTheme = useCallback((theme: Theme) => {
    if (typeof window === "undefined") return;

    const html = document.documentElement;
    const isDark = theme === "dark";

    if (isDark) {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }

    // Set color scheme CSS variable
    html.style.colorScheme = theme;
  }, []);

  /**
   * Load settings from localStorage on mount
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

      // Determine theme preference: settings JSON is source of truth,
      // pmagent-theme key is fallback for legacy/standalone usage
      let preference: ThemePreference = DEFAULT_SETTINGS.themePreference;

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserSettings>;
        setSettings((prev) => ({ ...prev, ...parsed }));
        if (
          parsed.themePreference &&
          VALID_PREFERENCES.includes(parsed.themePreference)
        ) {
          preference = parsed.themePreference;
        }
      } else if (storedTheme) {
        // Legacy fallback: only use pmagent-theme if no settings JSON
        preference = VALID_PREFERENCES.includes(
          storedTheme as ThemePreference
        )
          ? (storedTheme as ThemePreference)
          : DEFAULT_SETTINGS.themePreference;
      }

      const resolved = resolveTheme(preference);
      setSettings((prev) => ({
        ...prev,
        theme: resolved,
        themePreference: preference,
      }));
      applyTheme(resolved);
    } catch (error) {
      console.warn("Failed to load settings from localStorage:", error);
    }

    setIsHydrated(true);
  }, [applyTheme]);

  /**
   * Ref to track latest settings for use in event handlers.
   * Updated in useEffect (not render body) for React 18 concurrent safety.
   */
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });

  /**
   * Listen for system color scheme changes.
   * When themePreference is "system", auto-switch light/dark.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (settingsRef.current.themePreference !== "system") return;
      const resolved = getSystemTheme();
      setSettings((prev) => ({ ...prev, theme: resolved }));
      applyTheme(resolved);
    };

    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [applyTheme]);

  /**
   * Update user settings.
   * When themePreference changes, immediately resolve and apply the theme.
   */
  const updateSettings = useCallback(
    (partial: Partial<UserSettings>) => {
      setSettings((prev) => {
        const merged = { ...prev, ...partial };
        // If themePreference changed, resolve and apply immediately
        if (partial.themePreference !== undefined) {
          const resolved = resolveTheme(merged.themePreference);
          merged.theme = resolved;
          applyTheme(resolved);
        }
        return merged;
      });
      setState((prev) => ({ ...prev, isDirty: true }));
    },
    [applyTheme]
  );

  /**
   * Update notification settings specifically
   */
  const updateNotifications = useCallback(
    (partial: Partial<NotificationSettings>) => {
      setSettings((prev) => ({
        ...prev,
        notifications: { ...prev.notifications, ...partial },
      }));
      setState((prev) => ({ ...prev, isDirty: true }));
    },
    []
  );

  /**
   * Save settings to localStorage.
   * Uses setSettings updater to access latest state and avoid stale closures.
   */
  const saveSettings = useCallback(async () => {
    if (!isHydrated) return;

    setState((prev) => ({ ...prev, isSaving: true }));

    try {
      // Use updater to get latest settings and persist atomically
      setSettings((prev) => {
        const resolved = resolveTheme(prev.themePreference);
        const updated = { ...prev, theme: resolved };

        // Persist inside updater to ensure we save the latest state
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(THEME_STORAGE_KEY, updated.themePreference);
        applyTheme(resolved);

        return updated;
      });

      // Simulate async save operation
      await new Promise((resolve) => setTimeout(resolve, 300));

      setState((prev) => ({
        ...prev,
        isDirty: false,
        isSaving: false,
      }));
    } catch (error) {
      console.error("Failed to save settings:", error);
      setState((prev) => ({ ...prev, isSaving: false }));
      throw error;
    }
  }, [applyTheme, isHydrated]);

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(() => {
    const resolved = resolveTheme(DEFAULT_SETTINGS.themePreference);
    setSettings({ ...DEFAULT_SETTINGS, theme: resolved });
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(THEME_STORAGE_KEY);
    applyTheme(resolved);
    setState((prev) => ({ ...prev, isDirty: false }));
  }, [applyTheme]);

  /**
   * Toggle settings modal
   */
  const toggleModal = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      isOpen: open,
      // Reset to first tab when closing
      activeTab: open ? prev.activeTab : "appearance",
    }));
  }, []);

  /**
   * Switch active tab
   */
  const switchTab = useCallback((tab: SettingsModalState["activeTab"]) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  return {
    settings,
    state,
    isHydrated,
    updateSettings,
    updateNotifications,
    saveSettings,
    resetSettings,
    toggleModal,
    switchTab,
  };
};

export default useSettings;
