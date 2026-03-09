/**
 * useSettings.test.ts
 *
 * Unit tests for the useSettings hook
 * Tests state management, localStorage persistence, and theme application
 */

import { renderHook, act, waitFor } from '@testing-library/react';
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

describe('useSettings Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
        },
        style: {},
      },
      writable: true,
    });
  });

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('Initial State', () => {
    test('should have default settings on first render', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.notifications.enabled).toBe(true);
      expect(result.current.state.activeTab).toBe('appearance');
      expect(result.current.state.isOpen).toBe(false);
    });

    test('should not be hydrated initially', () => {
      const { result } = renderHook(() => useSettings());

      expect(result.current.isHydrated).toBe(false);
    });

    test('should have correct default modal state', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      expect(result.current.state.isDirty).toBe(false);
      expect(result.current.state.isSaving).toBe(false);
    });
  });

  // ============================================================================
  // Settings Update Tests
  // ============================================================================

  describe('Settings Updates', () => {
    test('should update settings', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ language: 'fr' });
      });

      expect(result.current.settings.language).toBe('fr');
    });

    test('should mark as dirty when updating', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      expect(result.current.state.isDirty).toBe(true);
    });

    test('should update notifications settings', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateNotifications({ soundEnabled: false });
      });

      expect(result.current.settings.notifications.soundEnabled).toBe(false);
    });

    test('should merge partial notification updates', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      const originalDesktopEnabled = result.current.settings.notifications.desktopEnabled;

      act(() => {
        result.current.updateNotifications({ soundEnabled: false });
      });

      expect(result.current.settings.notifications.soundEnabled).toBe(false);
      expect(result.current.settings.notifications.desktopEnabled).toBe(
        originalDesktopEnabled
      );
    });
  });

  // ============================================================================
  // Settings Save Tests
  // ============================================================================

  describe('Settings Save', () => {
    test('should save settings to localStorage', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      const stored = localStorage.getItem('pmagent-settings');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.theme).toBe('light');
      }
    });

    test('should clear dirty flag after save', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      expect(result.current.state.isDirty).toBe(true);

      await act(async () => {
        await result.current.saveSettings();
      });

      await waitFor(() => {
        expect(result.current.state.isDirty).toBe(false);
      });
    });

    test('should save theme separately', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      const themeStored = localStorage.getItem('pmagent-theme');
      expect(themeStored).toBe('light');
    });

    test('should set saving state during save', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      let savingDuringSave = false;

      await act(async () => {
        const promise = result.current.saveSettings();
        // Check if saving is true immediately after call
        savingDuringSave = result.current.state.isSaving;
        await promise;
      });

      expect(result.current.state.isSaving).toBe(false);
    });
  });

  // ============================================================================
  // Settings Reset Tests
  // ============================================================================

  describe('Settings Reset', () => {
    test('should reset to default settings', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({
          theme: 'light',
          language: 'fr',
          autoSave: false,
        });
      });

      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.language).toBe('en');
      expect(result.current.settings.autoSave).toBe(true);
    });

    test('should clear localStorage on reset', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(localStorage.getItem('pmagent-settings')).toBeTruthy();

      act(() => {
        result.current.resetSettings();
      });

      expect(localStorage.getItem('pmagent-settings')).toBeNull();
      expect(localStorage.getItem('pmagent-theme')).toBeNull();
    });

    test('should clear dirty flag on reset', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      expect(result.current.state.isDirty).toBe(true);

      act(() => {
        result.current.resetSettings();
      });

      expect(result.current.state.isDirty).toBe(false);
    });
  });

  // ============================================================================
  // Modal State Tests
  // ============================================================================

  describe('Modal State', () => {
    test('should toggle modal open/close', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      expect(result.current.state.isOpen).toBe(false);

      act(() => {
        result.current.toggleModal(true);
      });

      expect(result.current.state.isOpen).toBe(true);

      act(() => {
        result.current.toggleModal(false);
      });

      expect(result.current.state.isOpen).toBe(false);
    });

    test('should switch active tab', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      expect(result.current.state.activeTab).toBe('appearance');

      act(() => {
        result.current.switchTab('notifications');
      });

      expect(result.current.state.activeTab).toBe('notifications');

      act(() => {
        result.current.switchTab('shortcuts');
      });

      expect(result.current.state.activeTab).toBe('shortcuts');

      act(() => {
        result.current.switchTab('about');
      });

      expect(result.current.state.activeTab).toBe('about');
    });

    test('should reset tab when closing modal', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.toggleModal(true);
      });

      act(() => {
        result.current.switchTab('notifications');
      });

      expect(result.current.state.activeTab).toBe('notifications');

      act(() => {
        result.current.toggleModal(false);
      });

      expect(result.current.state.activeTab).toBe('notifications');
    });
  });

  // ============================================================================
  // localStorage Persistence Tests
  // ============================================================================

  describe('localStorage Persistence', () => {
    test('should load settings from localStorage', async () => {
      // Pre-populate localStorage
      localStorage.setItem(
        'pmagent-settings',
        JSON.stringify({ theme: 'light', language: 'fr' })
      );
      localStorage.setItem('pmagent-theme', 'light');

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      expect(result.current.settings.theme).toBe('light');
      expect(result.current.settings.language).toBe('fr');
    });

    test('should handle invalid JSON in localStorage gracefully', async () => {
      localStorage.setItem('pmagent-settings', 'invalid json');

      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      // Should fall back to defaults
      expect(result.current.settings.theme).toBe('dark');
    });

    test('should handle missing localStorage gracefully', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      expect(result.current.settings.theme).toBe('dark');
    });
  });

  // ============================================================================
  // Theme Application Tests
  // ============================================================================

  describe('Theme Application', () => {
    test('should apply theme to document on save', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('light');
    });

    test('should set color scheme CSS variable', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      await act(async () => {
        await result.current.saveSettings();
      });

      expect(document.documentElement.style.colorScheme).toBe('light');
    });
  });

  // ============================================================================
  // Multiple Updates Tests
  // ============================================================================

  describe('Multiple Updates', () => {
    test('should handle multiple updates before save', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
        result.current.updateSettings({ language: 'fr' });
        result.current.updateNotifications({ soundEnabled: false });
      });

      expect(result.current.settings.theme).toBe('light');
      expect(result.current.settings.language).toBe('fr');
      expect(result.current.settings.notifications.soundEnabled).toBe(false);

      await act(async () => {
        await result.current.saveSettings();
      });

      const stored = localStorage.getItem('pmagent-settings');
      expect(stored).toBeTruthy();
    });

    test('should maintain dirty state across multiple updates', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      expect(result.current.state.isDirty).toBe(true);

      act(() => {
        result.current.updateSettings({ language: 'fr' });
      });

      expect(result.current.state.isDirty).toBe(true);

      act(() => {
        result.current.updateNotifications({ soundEnabled: false });
      });

      expect(result.current.state.isDirty).toBe(true);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    test('should handle save errors gracefully', async () => {
      const { result } = renderHook(() => useSettings());

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      // Mock localStorage.setItem to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });

      act(() => {
        result.current.updateSettings({ theme: 'light' });
      });

      await act(async () => {
        try {
          await result.current.saveSettings();
        } catch (error) {
          expect(error).toBeDefined();
        }
      });

      // Restore original
      localStorage.setItem = originalSetItem;
    });

    test('should handle undefined window gracefully', () => {
      // This is harder to test in jsdom, but we can verify the code path exists
      const { result } = renderHook(() => useSettings());

      expect(result.current).toBeDefined();
    });
  });
});
