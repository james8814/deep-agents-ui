"use client";

/**
 * ThemeProvider — Hoists useSettings to the root provider tree.
 *
 * Ensures that the active theme (classList + colorScheme) is applied on
 * every page load, not just when SettingsModal is open.
 *
 * Also exposes settings context so any component can read/update theme
 * without importing useSettings directly.
 */

import React, { createContext, useContext } from "react";
import { useSettings } from "@/app/components/SettingsModal/useSettings";
import type {
  UserSettings,
  NotificationSettings,
  SettingsModalState,
} from "@/app/components/SettingsModal/settingsTypes";

interface ThemeContextValue {
  settings: UserSettings;
  state: SettingsModalState;
  isHydrated: boolean;
  updateSettings: (partial: Partial<UserSettings>) => void;
  updateNotifications: (partial: Partial<NotificationSettings>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  toggleModal: (open: boolean) => void;
  switchTab: (tab: SettingsModalState["activeTab"]) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const settingsHook = useSettings();

  return (
    <ThemeContext.Provider value={settingsHook}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the global theme/settings context.
 * Must be used within ThemeProvider.
 */
export function useThemeSettings(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeSettings must be used within ThemeProvider");
  }
  return ctx;
}
