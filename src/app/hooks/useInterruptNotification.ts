"use client";

import { useEffect, useRef } from "react";

/**
 * Notifies the user via document title flash and browser Notification
 * when an interrupt occurs while the tab is not focused.
 */
export function useInterruptNotification(interrupt: unknown | undefined) {
  const originalTitle = useRef<string>("");
  const flashInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!interrupt) {
      // Clear notification state
      if (flashInterval.current) {
        clearInterval(flashInterval.current);
        flashInterval.current = null;
      }
      if (originalTitle.current) {
        document.title = originalTitle.current;
        originalTitle.current = "";
      }
      return;
    }

    // Only notify if tab is not focused
    if (document.hidden) {
      // 1. Flash document title
      originalTitle.current = document.title;
      let toggle = false;
      flashInterval.current = setInterval(() => {
        document.title = toggle
          ? "(!) Approval needed"
          : originalTitle.current;
        toggle = !toggle;
      }, 1000);

      // 2. Browser notification (if permitted)
      if (Notification.permission === "granted") {
        new Notification("Deep Agent needs approval", {
          body: "An agent action requires your review.",
          icon: "/logo.svg",
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    return () => {
      if (flashInterval.current) {
        clearInterval(flashInterval.current);
      }
      if (originalTitle.current) {
        document.title = originalTitle.current;
      }
    };
  }, [interrupt]);

  // Restore title when tab regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (flashInterval.current) {
        clearInterval(flashInterval.current);
        flashInterval.current = null;
      }
      if (originalTitle.current) {
        document.title = originalTitle.current;
        originalTitle.current = "";
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);
}
