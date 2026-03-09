/**
 * settingsTypes.ts
 *
 * TypeScript type definitions for the Settings Modal component
 * Includes settings configuration, notifications, keyboard shortcuts, and theme types
 */

/**
 * Theme type definition
 */
export type Theme = 'light' | 'dark';

/**
 * Theme preference for system detection
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Notification settings interface
 */
export interface NotificationSettings {
  readonly enabled: boolean;
  readonly soundEnabled: boolean;
  readonly desktopEnabled: boolean;
  readonly emailEnabled: boolean;
}

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  readonly id: string;
  readonly action: string;
  readonly keys: readonly string[];
  readonly description: string;
  readonly category: 'editing' | 'navigation' | 'general';
}

/**
 * User settings state
 */
export interface UserSettings {
  readonly theme: Theme;
  readonly themePreference: ThemePreference;
  readonly notifications: NotificationSettings;
  readonly language: string;
  readonly autoSave: boolean;
}

/**
 * Settings modal state
 */
export interface SettingsModalState {
  readonly isOpen: boolean;
  readonly activeTab: 'appearance' | 'notifications' | 'shortcuts' | 'about';
  readonly isDirty: boolean;
  readonly isSaving: boolean;
}

/**
 * Settings modal context value
 */
export interface SettingsContextValue {
  readonly settings: UserSettings;
  readonly state: SettingsModalState;
  readonly updateSettings: (partial: Partial<UserSettings>) => void;
  readonly updateNotifications: (partial: Partial<NotificationSettings>) => void;
  readonly saveSettings: () => Promise<void>;
  readonly resetSettings: () => void;
  readonly toggleModal: (open: boolean) => void;
  readonly switchTab: (tab: SettingsModalState['activeTab']) => void;
}

/**
 * Settings modal props
 */
export interface SettingsModalProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSave?: (settings: UserSettings) => void | Promise<void>;
  readonly onCancel?: () => void;
}

/**
 * Props for individual setting sections
 */
export interface SettingsSectionProps {
  readonly title: string;
  readonly description?: string;
  readonly children: React.ReactNode;
}

/**
 * Props for toggle setting
 */
export interface ToggleSettingProps {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
}

/**
 * Props for theme toggle
 */
export interface ThemeToggleProps {
  readonly currentTheme: Theme;
  readonly onThemeChange: (theme: Theme) => void;
  readonly disabled?: boolean;
}

/**
 * Props for keyboard shortcuts list
 */
export interface KeyboardShortcutsProps {
  readonly shortcuts: readonly KeyboardShortcut[];
  readonly onCopy?: (shortcut: KeyboardShortcut) => void;
}

/**
 * Props for about section
 */
export interface AboutSectionProps {
  readonly version?: string;
  readonly lastUpdated?: Date;
  readonly buildNumber?: string;
  readonly onCheckUpdate?: () => void;
}

/**
 * Settings change event
 */
export interface SettingsChangeEvent {
  readonly type: 'theme' | 'notifications' | 'language' | 'auto-save';
  readonly value: unknown;
  readonly timestamp: Date;
}
