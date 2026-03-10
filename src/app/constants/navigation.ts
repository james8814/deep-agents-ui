/**
 * Navigation Constants
 * Defines all navigation items used in the sidebar and app
 */

/**
 * Main navigation items for the sidebar
 * These are the primary routes accessible from the sidebar
 * Icons are rendered in the Sidebar component using lucide-react
 */
export const MAIN_NAV_ITEMS = [
  {
    id: "chat",
    label: "对话",
    href: "/",
    iconName: "message-circle" as const,
  },
  {
    id: "files",
    label: "文件",
    href: "/files",
    iconName: "file-text" as const,
  },
] as const;

/**
 * User menu items
 * These appear in the dropdown menu when clicking the user avatar
 */
export const USER_MENU_ITEMS = [
  {
    id: "profile",
    label: "个人资料",
    href: "/profile",
    icon: "user",
  },
  {
    id: "settings",
    label: "设置",
    href: "/settings",
    icon: "settings",
  },
  {
    id: "help",
    label: "帮助",
    href: "/help",
    icon: "help-circle",
  },
];

/**
 * Keyboard shortcuts for navigation
 */
export const KEYBOARD_SHORTCUTS = {
  TOGGLE_SIDEBAR: {
    mac: "⌘ + /",
    windows: "Ctrl + /",
    description: "切换侧边栏",
  },
  NEW_CHAT: {
    mac: "⌘ + N",
    windows: "Ctrl + N",
    description: "新建对话",
  },
  SEND_MESSAGE: {
    mac: "⌘ + Enter",
    windows: "Ctrl + Enter",
    description: "发送消息",
  },
};

/**
 * Get the label for a keyboard shortcut based on OS
 */
export function getKeyboardShortcutLabel(
  shortcutKey: keyof typeof KEYBOARD_SHORTCUTS
): string {
  const isMac =
    typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);
  const shortcut = KEYBOARD_SHORTCUTS[shortcutKey];
  return isMac ? shortcut.mac : shortcut.windows;
}
