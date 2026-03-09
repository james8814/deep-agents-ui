/**
 * useSettings.ts
 *
 * Custom React hook for managing settings state with localStorage persistence
 * Handles theme, notifications, and user preferences
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  UserSettings,
  NotificationSettings,
  Theme,
  SettingsModalState,
} from './settingsTypes';

/**
 * Default user settings
 */
const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  themePreference: 'system',
  notifications: {
    enabled: true,
    soundEnabled: true,
    desktopEnabled: true,
    emailEnabled: false,
  },
  language: 'en',
  autoSave: true,
};

/**
 * Default settings modal state
 */
const DEFAULT_STATE: SettingsModalState = {
  isOpen: false,
  activeTab: 'appearance',
  isDirty: false,
  isSaving: false,
};

/**
 * Storage key for persisting settings
 */
const SETTINGS_STORAGE_KEY = 'pmagent-settings';
const THEME_STORAGE_KEY = 'pmagent-theme';

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
   * Load settings from localStorage on mount
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<UserSettings>;
        setSettings(prev => ({ ...prev, ...parsed }));
      }

      if (storedTheme) {
        const theme = storedTheme as Theme;
        setSettings(prev => ({ ...prev, theme }));
        applyTheme(theme);
      } else {
        // Apply default theme
        applyTheme(DEFAULT_SETTINGS.theme);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }

    setIsHydrated(true);
  }, []);

  /**
   * Apply theme to document
   */
  const applyTheme = useCallback((theme: Theme) => {
    if (typeof window === 'undefined') return;

    const html = document.documentElement;
    const isDark = theme === 'dark';

    if (isDark) {
      html.classList.add('dark');
      html.classList.remove('light');
    } else {
      html.classList.add('light');
      html.classList.remove('dark');
    }

    // Set color scheme CSS variable
    html.style.colorScheme = theme;
  }, []);

  /**
   * Update user settings
   */
  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...partial };
      setState(prev => ({ ...prev, isDirty: true }));
      return updated;
    });
  }, []);

  /**
   * Update notification settings specifically
   */
  const updateNotifications = useCallback(
    (partial: Partial<NotificationSettings>) => {
      setSettings(prev => ({
        ...prev,
        notifications: { ...prev.notifications, ...partial },
      }));
      setState(prev => ({ ...prev, isDirty: true }));
    },
    []
  );

  /**
   * Save settings to localStorage
   */
  const saveSettings = useCallback(async () => {
    if (!isHydrated) return;

    setState(prev => ({ ...prev, isSaving: true }));

    try {
      // Apply theme immediately
      applyTheme(settings.theme);

      // Save to localStorage
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      localStorage.setItem(THEME_STORAGE_KEY, settings.theme);

      // Simulate async save operation
      await new Promise(resolve => setTimeout(resolve, 300));

      setState(prev => ({
        ...prev,
        isDirty: false,
        isSaving: false,
      }));
    } catch (error) {
      console.error('Failed to save settings:', error);
      setState(prev => ({ ...prev, isSaving: false }));
      throw error;
    }
  }, [settings, applyTheme, isHydrated]);

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    localStorage.removeItem(THEME_STORAGE_KEY);
    applyTheme(DEFAULT_SETTINGS.theme);
    setState(prev => ({ ...prev, isDirty: false }));
  }, [applyTheme]);

  /**
   * Toggle settings modal
   */
  const toggleModal = useCallback((open: boolean) => {
    setState(prev => ({
      ...prev,
      isOpen: open,
      // Reset to first tab when closing
      activeTab: open ? prev.activeTab : 'appearance',
    }));
  }, []);

  /**
   * Switch active tab
   */
  const switchTab = useCallback(
    (tab: SettingsModalState['activeTab']) => {
      setState(prev => ({ ...prev, activeTab: tab }));
    },
    []
  );

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
