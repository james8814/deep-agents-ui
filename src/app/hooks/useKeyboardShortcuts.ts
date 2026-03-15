"use client";

/**
 * useKeyboardShortcuts - Keyboard shortcut handler for the app
 *
 * Supported shortcuts:
 * - Cmd/Ctrl + K → New thread
 * - Cmd/Ctrl + / → Focus input
 * - Cmd/Ctrl + Shift + P → Toggle context panel
 * - Escape → Stop generation or close dialogs
 *
 * @param handlers - Object containing callback functions for each shortcut
 */

import { useEffect } from "react";

interface ShortcutHandlers {
  onNewThread?: () => void;
  onFocusInput?: () => void;
  onStopGeneration?: () => void;
  onToggleContext?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const isInputFocused =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.hasAttribute("contenteditable");

      // Cmd/Ctrl + K → New thread
      if (isMod && e.key === "k") {
        e.preventDefault();
        handlers.onNewThread?.();
        return;
      }

      // Cmd/Ctrl + / → Focus input (only when not already in input)
      if (isMod && e.key === "/") {
        if (!isInputFocused) {
          e.preventDefault();
          handlers.onFocusInput?.();
        }
        return;
      }

      // Cmd/Ctrl + Shift + P → Toggle context panel
      if (isMod && e.shiftKey && e.key === "P") {
        e.preventDefault();
        handlers.onToggleContext?.();
        return;
      }

      // Escape → Stop generation or close dialogs
      if (e.key === "Escape") {
        handlers.onStopGeneration?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
