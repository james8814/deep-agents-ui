"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark" | "system";

interface ThemeToggleProps {
  /**
   * Called when theme changes
   */
  onThemeChange?: (theme: Theme) => void;

  /**
   * Display variant
   */
  variant?: "icon" | "full";

  /**
   * Show label text
   */
  showLabel?: boolean;
}

/**
 * ThemeToggle Component
 *
 * Provides light/dark/system theme switching with localStorage persistence.
 *
 * Accessibility:
 * - WCAG 2.1 AA compliant
 * - Keyboard navigation support
 * - Proper ARIA labels
 * - Respects prefers-color-scheme media query
 *
 * @example
 * ```tsx
 * <ThemeToggle
 *   onThemeChange={(theme) => console.log(theme)}
 *   variant="icon"
 * />
 * ```
 */
export const ThemeToggle = React.memo<ThemeToggleProps>(
  ({ onThemeChange, variant = "icon", showLabel = false }) => {
    const [theme, setTheme] = useState<Theme>("system");
    const [mounted, setMounted] = useState(false);

    // Hydration: Set theme from localStorage on mount
    useEffect(() => {
      setMounted(true);
      const savedTheme = localStorage.getItem("pmagent-theme") as Theme | null;
      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        setTheme(savedTheme);
        applyTheme(savedTheme);
      } else {
        // Default to system preference
        applyTheme("system");
      }
    }, []);

    /**
     * Apply theme to document and save to localStorage
     */
    const applyTheme = (newTheme: Theme) => {
      const root = document.documentElement;
      const isDark =
        newTheme === "dark" ||
        (newTheme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);

      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      localStorage.setItem("pmagent-theme", newTheme);
    };

    const handleThemeChange = (newTheme: Theme) => {
      setTheme(newTheme);
      applyTheme(newTheme);
      onThemeChange?.(newTheme);
    };

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) {
      return (
        <Button
          variant="ghost"
          size={variant === "icon" ? "icon" : "sm"}
          disabled
          aria-label="Theme toggle (loading)"
          className="h-9 w-9"
        >
          <Sun className="h-4 w-4" />
        </Button>
      );
    }

    const isDarkMode =
      theme === "dark" ||
      (theme === "system" &&
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size={variant === "icon" ? "icon" : "sm"}
            aria-label="Toggle theme"
            title="Switch theme"
            className={cn("h-9 transition-colors", variant === "icon" && "w-9")}
          >
            {isDarkMode ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            {showLabel && variant === "full" && (
              <span className="ml-2 text-sm">
                {theme === "system"
                  ? "Auto"
                  : theme === "dark"
                  ? "Dark"
                  : "Light"}
              </span>
            )}
            <span className="sr-only">Toggle theme menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-40"
          sideOffset={8}
        >
          <DropdownMenuItem
            onClick={() => handleThemeChange("light")}
            className={cn(
              "flex cursor-pointer items-center gap-2",
              theme === "light" && "bg-accent"
            )}
          >
            <Sun className="h-4 w-4" />
            <span>Light</span>
            {theme === "light" && (
              <span className="ml-auto text-xs font-semibold">✓</span>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleThemeChange("dark")}
            className={cn(
              "flex cursor-pointer items-center gap-2",
              theme === "dark" && "bg-accent"
            )}
          >
            <Moon className="h-4 w-4" />
            <span>Dark</span>
            {theme === "dark" && (
              <span className="ml-auto text-xs font-semibold">✓</span>
            )}
          </DropdownMenuItem>
          <div className="my-1 border-t border-border" />
          <DropdownMenuItem
            onClick={() => handleThemeChange("system")}
            className={cn(
              "flex cursor-pointer items-center gap-2",
              theme === "system" && "bg-accent"
            )}
          >
            <div className="h-4 w-4 rounded border border-foreground/30" />
            <span>System</span>
            {theme === "system" && (
              <span className="ml-auto text-xs font-semibold">✓</span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

ThemeToggle.displayName = "ThemeToggle";
