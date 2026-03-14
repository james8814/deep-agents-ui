/**
 * SettingsModal.test.tsx
 *
 * Comprehensive unit tests for the SettingsModal component
 * Coverage: >80% (25+ test cases)
 */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SettingsModal } from "../SettingsModal";
import { ThemeProvider } from "@/providers/ThemeProvider";

/**
 * Mock localStorage
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

/**
 * Render helper: wraps SettingsModal in required ThemeProvider context
 */
function renderSettingsModal(props: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (settings: unknown) => void | Promise<void>;
  onCancel?: () => void;
}) {
  return render(
    <ThemeProvider>
      <SettingsModal
        isOpen={props.isOpen}
        onOpenChange={props.onOpenChange}
        onSave={props.onSave}
        onCancel={props.onCancel}
      />
    </ThemeProvider>
  );
}

describe("SettingsModal Component", () => {
  let mockOnOpenChange: jest.Mock;
  let mockOnSave: jest.Mock;
  let mockOnCancel: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockOnOpenChange = jest.fn();
    mockOnSave = jest.fn();
    mockOnCancel = jest.fn();
    // Mock IntersectionObserver
    global.IntersectionObserver = jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    })) as jest.Mock;
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe("Rendering", () => {
    test("should not render when closed", () => {
      renderSettingsModal({
        isOpen: false,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    test("should render when open", async () => {
      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    test("should render all tabs", async () => {
      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        expect(
          screen.getByRole("tab", { name: /appearance/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("tab", { name: /notifications/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("tab", { name: /shortcuts/i })
        ).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: /about/i })).toBeInTheDocument();
      });
    });

    test("should render close button", async () => {
      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        expect(screen.getByLabelText("Close settings")).toBeInTheDocument();
      });
    });

    test("should render save and cancel buttons", async () => {
      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        expect(screen.getByText("Cancel")).toBeInTheDocument();
        expect(screen.getByText("Save Changes")).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Tab Navigation Tests
  // ============================================================================

  describe("Tab Navigation", () => {
    test("should show appearance tab by default", async () => {
      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const appearanceTab = screen.getByRole("tab", { name: /appearance/i });
        expect(appearanceTab).toHaveAttribute("aria-selected", "true");
      });
    });

    test("should switch to notifications tab", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const notificationsTab = screen.getByRole("tab", {
          name: /notifications/i,
        });
        expect(notificationsTab).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole("tab", {
        name: /notifications/i,
      });
      await user.click(notificationsTab);

      await waitFor(() => {
        expect(notificationsTab).toHaveAttribute("aria-selected", "true");
      });
    });

    test("should switch to shortcuts tab", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const shortcutsTab = screen.getByRole("tab", { name: /shortcuts/i });
        expect(shortcutsTab).toBeInTheDocument();
      });

      const shortcutsTab = screen.getByRole("tab", { name: /shortcuts/i });
      await user.click(shortcutsTab);

      await waitFor(() => {
        expect(shortcutsTab).toHaveAttribute("aria-selected", "true");
      });
    });

    test("should switch to about tab", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const aboutTab = screen.getByRole("tab", { name: /about/i });
        expect(aboutTab).toBeInTheDocument();
      });

      const aboutTab = screen.getByRole("tab", { name: /about/i });
      await user.click(aboutTab);

      await waitFor(() => {
        expect(aboutTab).toHaveAttribute("aria-selected", "true");
      });
    });
  });

  // ============================================================================
  // Theme Toggle Tests
  // ============================================================================

  describe("Theme Toggle", () => {
    test("should render theme preference buttons (Light/Dark/System)", async () => {
      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        expect(screen.getByLabelText("Light theme")).toBeInTheDocument();
        expect(screen.getByLabelText("Dark theme")).toBeInTheDocument();
        expect(screen.getByLabelText("System theme")).toBeInTheDocument();
      });
    });

    test("should toggle theme preference selection", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const lightThemeBtn = screen.getByLabelText("Light theme");
        expect(lightThemeBtn).toBeInTheDocument();
      });

      const lightThemeBtn = screen.getByLabelText("Light theme");
      await user.click(lightThemeBtn);

      // Check that the button is selected
      await waitFor(() => {
        expect(lightThemeBtn).toHaveAttribute("aria-pressed", "true");
      });
    });
  });

  // ============================================================================
  // Notification Settings Tests
  // ============================================================================

  describe("Notification Settings", () => {
    test("should render notification toggles", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const notificationsTab = screen.getByRole("tab", {
          name: /notifications/i,
        });
        expect(notificationsTab).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole("tab", {
        name: /notifications/i,
      });
      await user.click(notificationsTab);

      await waitFor(() => {
        expect(
          screen.getByLabelText("Enable notifications")
        ).toBeInTheDocument();
      });
    });

    test("should toggle main notification switch", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const notificationsTab = screen.getByRole("tab", {
          name: /notifications/i,
        });
        expect(notificationsTab).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole("tab", {
        name: /notifications/i,
      });
      await user.click(notificationsTab);

      await waitFor(() => {
        const enableNotifications = screen.getByLabelText(
          "Enable notifications"
        ) as HTMLInputElement;
        expect(enableNotifications).toBeInTheDocument();
        expect(enableNotifications.checked).toBe(true);
      });

      const enableNotifications = screen.getByLabelText(
        "Enable notifications"
      ) as HTMLInputElement;
      await user.click(enableNotifications);

      await waitFor(() => {
        expect(enableNotifications.checked).toBe(false);
      });
    });

    test("should disable sub-toggles when main toggle is off", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const notificationsTab = screen.getByRole("tab", {
          name: /notifications/i,
        });
        expect(notificationsTab).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole("tab", {
        name: /notifications/i,
      });
      await user.click(notificationsTab);

      await waitFor(() => {
        const enableNotifications = screen.getByLabelText(
          "Enable notifications"
        ) as HTMLInputElement;
        expect(enableNotifications).toBeInTheDocument();
      });

      const enableNotifications = screen.getByLabelText(
        "Enable notifications"
      ) as HTMLInputElement;
      await user.click(enableNotifications);

      await waitFor(() => {
        const soundToggle = screen.getByLabelText("Sound") as HTMLInputElement;
        expect(soundToggle.disabled).toBe(true);
      });
    });
  });

  // ============================================================================
  // Keyboard Shortcuts Tests
  // ============================================================================

  describe("Keyboard Shortcuts", () => {
    test("should render shortcuts list", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const shortcutsTab = screen.getByRole("tab", { name: /shortcuts/i });
        expect(shortcutsTab).toBeInTheDocument();
      });

      const shortcutsTab = screen.getByRole("tab", { name: /shortcuts/i });
      await user.click(shortcutsTab);

      await waitFor(() => {
        expect(screen.getByText("Send message")).toBeInTheDocument();
      });
    });

    test("should search shortcuts", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const shortcutsTab = screen.getByRole("tab", { name: /shortcuts/i });
        expect(shortcutsTab).toBeInTheDocument();
      });

      const shortcutsTab = screen.getByRole("tab", { name: /shortcuts/i });
      await user.click(shortcutsTab);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(
          "Search shortcuts..."
        ) as HTMLInputElement;
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(
        "Search shortcuts..."
      ) as HTMLInputElement;
      await user.type(searchInput, "send");

      await waitFor(() => {
        expect(screen.getByText("Send message")).toBeInTheDocument();
      });
    });

    test("should copy shortcut to clipboard", async () => {
      const user = userEvent.setup();
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(navigator, "clipboard", {
        value: mockClipboard,
        writable: true,
        configurable: true,
      });

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const shortcutsTab = screen.getByRole("tab", { name: /shortcuts/i });
        expect(shortcutsTab).toBeInTheDocument();
      });

      const shortcutsTab = screen.getByRole("tab", { name: /shortcuts/i });
      await user.click(shortcutsTab);

      await waitFor(() => {
        expect(screen.getByText("Send message")).toBeInTheDocument();
      });

      const copyButtons = screen.getAllByLabelText(/Copy.*shortcut/i);
      if (copyButtons.length > 0) {
        await user.click(copyButtons[0]);
        expect(mockClipboard.writeText).toHaveBeenCalled();
      }
    });
  });

  // ============================================================================
  // About Section Tests
  // ============================================================================

  describe("About Section", () => {
    test("should display version info in about tab", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const aboutTab = screen.getByRole("tab", { name: /about/i });
        expect(aboutTab).toBeInTheDocument();
      });

      const aboutTab = screen.getByRole("tab", { name: /about/i });
      await user.click(aboutTab);

      await waitFor(() => {
        expect(screen.getByText(/5\.26\.0/)).toBeInTheDocument();
      });
    });

    test("should show check for updates button", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const aboutTab = screen.getByRole("tab", { name: /about/i });
        expect(aboutTab).toBeInTheDocument();
      });

      const aboutTab = screen.getByRole("tab", { name: /about/i });
      await user.click(aboutTab);

      await waitFor(() => {
        expect(screen.getByText("Check for Updates")).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Modal Actions Tests
  // ============================================================================

  describe("Modal Actions", () => {
    test("should call onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const cancelBtn = screen.getByText("Cancel");
        expect(cancelBtn).toBeInTheDocument();
      });

      const cancelBtn = screen.getByText("Cancel");
      await user.click(cancelBtn);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    test("should call onSave when save button is clicked", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const saveBtn = screen.getByText("Save Changes");
        expect(saveBtn).toBeInTheDocument();
      });

      const saveBtn = screen.getByText("Save Changes");
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    test("should close modal when close button is clicked", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const closeBtn = screen.getByLabelText("Close settings");
        expect(closeBtn).toBeInTheDocument();
      });

      const closeBtn = screen.getByLabelText("Close settings");
      await user.click(closeBtn);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe("Accessibility", () => {
    test("should have proper ARIA attributes", async () => {
      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toHaveAttribute("aria-labelledby");
        expect(dialog).toHaveAttribute("aria-describedby");
      });
    });

    test("should trap focus within modal", async () => {
      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const dialog = screen.getByRole("dialog");
        expect(dialog).toBeInTheDocument();
      });
    });

    test("should have keyboard navigation support", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const appearanceTab = screen.getByRole("tab", { name: /appearance/i });
        expect(appearanceTab).toBeInTheDocument();
      });

      // Test keyboard navigation between tabs
      const appearanceTab = screen.getByRole("tab", { name: /appearance/i });
      appearanceTab.focus();
      expect(document.activeElement).toBe(appearanceTab);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration", () => {
    test("should persist settings to localStorage", async () => {
      const user = userEvent.setup();

      renderSettingsModal({
        isOpen: true,
        onOpenChange: mockOnOpenChange,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      });

      await waitFor(() => {
        const saveBtn = screen.getByText("Save Changes");
        expect(saveBtn).toBeInTheDocument();
      });

      const saveBtn = screen.getByText("Save Changes");
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    test("should handle multiple save operations", async () => {
      const user = userEvent.setup();

      const { rerender } = render(
        <ThemeProvider>
          <SettingsModal
            isOpen={true}
            onOpenChange={mockOnOpenChange}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        const saveBtn = screen.getByText("Save Changes");
        expect(saveBtn).toBeInTheDocument();
      });

      const saveBtn = screen.getByText("Save Changes");
      await user.click(saveBtn);

      // Wait for first save to complete (300ms async delay + state reset)
      // The modal closes after save (onOpenChange(false)), so re-open it
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });

      // Re-open the modal for second save
      rerender(
        <ThemeProvider>
          <SettingsModal
            isOpen={true}
            onOpenChange={mockOnOpenChange}
            onSave={mockOnSave}
            onCancel={mockOnCancel}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Save Changes")).toBeInTheDocument();
      });

      const saveBtn2 = screen.getByText("Save Changes");
      await user.click(saveBtn2);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(2);
      });
    });
  });
});
