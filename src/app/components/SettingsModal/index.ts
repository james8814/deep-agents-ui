/**
 * SettingsModal/index.ts
 *
 * Public API exports for the SettingsModal component
 */

export { SettingsModal, default } from "./SettingsModal";
export { useSettings, default as useSettingsHook } from "./useSettings";
export type {
  Theme,
  ThemePreference,
  NotificationSettings,
  KeyboardShortcut,
  UserSettings,
  SettingsModalState,
  SettingsContextValue,
  SettingsModalProps,
  SettingsSectionProps,
  ToggleSettingProps,
  ThemeToggleProps,
  KeyboardShortcutsProps,
  AboutSectionProps,
  SettingsChangeEvent,
} from "./settingsTypes";
