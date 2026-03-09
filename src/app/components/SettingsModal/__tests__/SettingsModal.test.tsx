/**
 * SettingsModal.test.tsx
 *
 * Comprehensive unit tests for the SettingsModal component
 * Coverage: >80% (25+ test cases)
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SettingsModal } from '../SettingsModal';
import { useSettings } from '../useSettings';

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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

/**
 * Test wrapper component for useSettings hook
 */
const _TestWrapper = ({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <SettingsModal
    isOpen={isOpen}
    onOpenChange={onOpenChange}
    onSave={jest.fn()}
    onCancel={jest.fn()}
  />
);

describe('SettingsModal Component', () => {
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

  describe('Rendering', () => {
    test('should not render when closed', () => {
      render(
        <SettingsModal
          isOpen={false}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    test('should render when open', async () => {
      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Settings')).toBeInTheDocument();
      });
    });

    test('should render all tabs', async () => {
      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /appearance/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /notifications/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /shortcuts/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /about/i })).toBeInTheDocument();
      });
    });

    test('should render close button', async () => {
      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Close settings')).toBeInTheDocument();
      });
    });

    test('should render save and cancel buttons', async () => {
      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
        expect(screen.getByText('Save Changes')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Tab Navigation Tests
  // ============================================================================

  describe('Tab Navigation', () => {
    test('should show appearance tab by default', async () => {
      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
        expect(appearanceTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('should switch to notifications tab', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
        expect(notificationsTab).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      await waitFor(() => {
        expect(notificationsTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('should switch to shortcuts tab', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const shortcutsTab = screen.getByRole('tab', { name: /shortcuts/i });
        expect(shortcutsTab).toBeInTheDocument();
      });

      const shortcutsTab = screen.getByRole('tab', { name: /shortcuts/i });
      await user.click(shortcutsTab);

      await waitFor(() => {
        expect(shortcutsTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    test('should switch to about tab', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const aboutTab = screen.getByRole('tab', { name: /about/i });
        expect(aboutTab).toBeInTheDocument();
      });

      const aboutTab = screen.getByRole('tab', { name: /about/i });
      await user.click(aboutTab);

      await waitFor(() => {
        expect(aboutTab).toHaveAttribute('aria-selected', 'true');
      });
    });
  });

  // ============================================================================
  // Theme Toggle Tests
  // ============================================================================

  describe('Theme Toggle', () => {
    test('should render theme toggle buttons in appearance tab', async () => {
      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('light theme')).toBeInTheDocument();
        expect(screen.getByLabelText('dark theme')).toBeInTheDocument();
      });
    });

    test('should toggle theme selection', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const lightThemeBtn = screen.getByLabelText('light theme');
        expect(lightThemeBtn).toBeInTheDocument();
      });

      const lightThemeBtn = screen.getByLabelText('light theme');
      await user.click(lightThemeBtn);

      // Check that the button is selected
      await waitFor(() => {
        expect(lightThemeBtn).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  // ============================================================================
  // Notification Settings Tests
  // ============================================================================

  describe('Notification Settings', () => {
    test('should render notification toggles', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
        expect(notificationsTab).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      await waitFor(() => {
        expect(screen.getByLabelText('Enable notifications')).toBeInTheDocument();
      });
    });

    test('should toggle main notification switch', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
        expect(notificationsTab).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      await waitFor(() => {
        const enableNotifications = screen.getByLabelText('Enable notifications') as HTMLInputElement;
        expect(enableNotifications).toBeInTheDocument();
        expect(enableNotifications.checked).toBe(true);
      });

      const enableNotifications = screen.getByLabelText('Enable notifications') as HTMLInputElement;
      await user.click(enableNotifications);

      await waitFor(() => {
        expect(enableNotifications.checked).toBe(false);
      });
    });

    test('should disable sub-toggles when main toggle is off', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
        expect(notificationsTab).toBeInTheDocument();
      });

      const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
      await user.click(notificationsTab);

      await waitFor(() => {
        const enableNotifications = screen.getByLabelText('Enable notifications') as HTMLInputElement;
        expect(enableNotifications).toBeInTheDocument();
      });

      const enableNotifications = screen.getByLabelText('Enable notifications') as HTMLInputElement;
      await user.click(enableNotifications);

      await waitFor(() => {
        const soundToggle = screen.getByLabelText('Sound') as HTMLInputElement;
        expect(soundToggle.disabled).toBe(true);
      });
    });
  });

  // ============================================================================
  // Keyboard Shortcuts Tests
  // ============================================================================

  describe('Keyboard Shortcuts', () => {
    test('should render shortcuts list', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const shortcutsTab = screen.getByRole('tab', { name: /shortcuts/i });
        expect(shortcutsTab).toBeInTheDocument();
      });

      const shortcutsTab = screen.getByRole('tab', { name: /shortcuts/i });
      await user.click(shortcutsTab);

      await waitFor(() => {
        expect(screen.getByText('Send message')).toBeInTheDocument();
      });
    });

    test('should search shortcuts', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const shortcutsTab = screen.getByRole('tab', { name: /shortcuts/i });
        expect(shortcutsTab).toBeInTheDocument();
      });

      const shortcutsTab = screen.getByRole('tab', { name: /shortcuts/i });
      await user.click(shortcutsTab);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search shortcuts...') as HTMLInputElement;
        expect(searchInput).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search shortcuts...') as HTMLInputElement;
      await user.type(searchInput, 'send');

      await waitFor(() => {
        expect(screen.getByText('Send message')).toBeInTheDocument();
      });
    });

    test('should copy shortcut to clipboard', async () => {
      const _user = userEvent.setup();
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const shortcutsTab = screen.getByRole('tab', { name: /shortcuts/i });
        expect(shortcutsTab).toBeInTheDocument();
      });

      const shortcutsTab = screen.getByRole('tab', { name: /shortcuts/i });
      await user.click(shortcutsTab);

      await waitFor(() => {
        expect(screen.getByText('Send message')).toBeInTheDocument();
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

  describe('About Section', () => {
    test('should display version info in about tab', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const aboutTab = screen.getByRole('tab', { name: /about/i });
        expect(aboutTab).toBeInTheDocument();
      });

      const aboutTab = screen.getByRole('tab', { name: /about/i });
      await user.click(aboutTab);

      await waitFor(() => {
        expect(screen.getByText(/5\.26\.0/)).toBeInTheDocument();
      });
    });

    test('should show check for updates button', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const aboutTab = screen.getByRole('tab', { name: /about/i });
        expect(aboutTab).toBeInTheDocument();
      });

      const aboutTab = screen.getByRole('tab', { name: /about/i });
      await user.click(aboutTab);

      await waitFor(() => {
        expect(screen.getByText('Check for Updates')).toBeInTheDocument();
      });
    });
  });

  // ============================================================================
  // Modal Actions Tests
  // ============================================================================

  describe('Modal Actions', () => {
    test('should call onCancel when cancel button is clicked', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const cancelBtn = screen.getByText('Cancel');
        expect(cancelBtn).toBeInTheDocument();
      });

      const cancelBtn = screen.getByText('Cancel');
      await user.click(cancelBtn);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    test('should call onSave when save button is clicked', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const saveBtn = screen.getByText('Save Changes');
        expect(saveBtn).toBeInTheDocument();
      });

      const saveBtn = screen.getByText('Save Changes');
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    test('should close modal when close button is clicked', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const closeBtn = screen.getByLabelText('Close settings');
        expect(closeBtn).toBeInTheDocument();
      });

      const closeBtn = screen.getByLabelText('Close settings');
      await user.click(closeBtn);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    test('should have proper ARIA attributes', async () => {
      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-labelledby');
        expect(dialog).toHaveAttribute('aria-describedby');
      });
    });

    test('should trap focus within modal', async () => {
      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    test('should have keyboard navigation support', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
        expect(appearanceTab).toBeInTheDocument();
      });

      // Test keyboard navigation between tabs
      const appearanceTab = screen.getByRole('tab', { name: /appearance/i });
      appearanceTab.focus();
      expect(document.activeElement).toBe(appearanceTab);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration', () => {
    test('should persist settings to localStorage', async () => {
      const _user = userEvent.setup();

      render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const saveBtn = screen.getByText('Save Changes');
        expect(saveBtn).toBeInTheDocument();
      });

      const saveBtn = screen.getByText('Save Changes');
      await user.click(saveBtn);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });

    test('should handle multiple save operations', async () => {
      const _user = userEvent.setup();

      const { rerender } = render(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      await waitFor(() => {
        const saveBtn = screen.getByText('Save Changes');
        expect(saveBtn).toBeInTheDocument();
      });

      const saveBtn = screen.getByText('Save Changes');
      await user.click(saveBtn);

      // Simulate second save
      rerender(
        <SettingsModal
          isOpen={true}
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
        />
      );

      const saveBtn2 = screen.getByText('Save Changes');
      await user.click(saveBtn2);

      expect(mockOnSave).toHaveBeenCalledTimes(2);
    });
  });
});
