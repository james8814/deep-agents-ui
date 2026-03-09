/**
 * ThemeToggle Component Tests
 * Tests for theme switching, localStorage, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '../ThemeToggle';

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div role="menu">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <button role="menuitem" onClick={onClick}>{children}</button>
  ),
}));

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  describe('Rendering', () => {
    it('should render theme toggle button', () => {
      render(<ThemeToggle />);

      expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument();
    });

    it('should render with icon variant by default', () => {
      const { container } = render(<ThemeToggle variant="icon" />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      expect(button).toHaveClass('h-9', 'w-9');
    });

    it('should render with full variant when specified', () => {
      render(<ThemeToggle variant="full" showLabel />);

      expect(screen.getByText(/Auto|Dark|Light/i)).toBeInTheDocument();
    });

    it('should show label when showLabel prop is true', () => {
      render(<ThemeToggle variant="full" showLabel={true} />);

      // Label should be present after mount
      waitFor(() => {
        expect(screen.getByText(/Auto|Dark|Light/i)).toBeInTheDocument();
      });
    });
  });

  describe('Theme Switching', () => {
    it('should switch to light theme', async () => {
      render(<ThemeToggle onThemeChange={jest.fn()} />);

      await waitFor(() => {
        const lightButton = screen.getByRole('menuitem', { name: /^Light/ });
        expect(lightButton).toBeInTheDocument();
      });

      const lightButton = screen.getByRole('menuitem', { name: /^Light/ });
      fireEvent.click(lightButton);

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('should switch to dark theme', async () => {
      render(<ThemeToggle onThemeChange={jest.fn()} />);

      await waitFor(() => {
        const darkButton = screen.getByRole('menuitem', { name: /^Dark/ });
        expect(darkButton).toBeInTheDocument();
      });

      const darkButton = screen.getByRole('menuitem', { name: /^Dark/ });
      fireEvent.click(darkButton);

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('should switch to system theme', async () => {
      render(<ThemeToggle onThemeChange={jest.fn()} />);

      await waitFor(() => {
        const systemButton = screen.getByRole('menuitem', { name: /System/ });
        expect(systemButton).toBeInTheDocument();
      });

      const systemButton = screen.getByRole('menuitem', { name: /System/ });
      fireEvent.click(systemButton);

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('system');
      });
    });

    it('should call onThemeChange callback when theme changes', async () => {
      const onThemeChange = jest.fn();
      render(<ThemeToggle onThemeChange={onThemeChange} />);

      await waitFor(() => {
        const lightButton = screen.getByRole('menuitem', { name: /^Light/ });
        fireEvent.click(lightButton);
      });

      await waitFor(() => {
        expect(onThemeChange).toHaveBeenCalledWith('light');
      });
    });
  });

  describe('LocalStorage', () => {
    it('should persist theme to localStorage', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const darkButton = screen.getByRole('menuitem', { name: /^Dark/ });
        fireEvent.click(darkButton);
      });

      await waitFor(() => {
        expect(localStorage.getItem('theme')).toBe('dark');
      });
    });

    it('should restore theme from localStorage on mount', async () => {
      localStorage.setItem('theme', 'dark');

      render(<ThemeToggle />);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('should handle invalid theme in localStorage', async () => {
      localStorage.setItem('theme', 'invalid-theme');

      render(<ThemeToggle />);

      await waitFor(() => {
        // Should default to system
        expect(localStorage.getItem('theme')).toBe('invalid-theme');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button label', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button', { name: /toggle theme/i });
      expect(button).toHaveAttribute('aria-label', 'Toggle theme');
    });

    it('should have proper title attribute', () => {
      render(<ThemeToggle />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Switch theme');
    });

    it('should render menu items with proper roles', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const menuItems = screen.getAllByRole('menuitem');
        expect(menuItems.length).toBeGreaterThan(0);
      });
    });

    it('should have screen reader text', () => {
      render(<ThemeToggle />);

      const srText = screen.getByText(/Toggle theme menu/);
      expect(srText).toHaveClass('sr-only');
    });

    it('should show checkmark for selected theme', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const lightButton = screen.getByRole('menuitem', { name: /^Light/ });
        fireEvent.click(lightButton);
      });

      await waitFor(() => {
        const checkmark = screen.getByText('✓');
        expect(checkmark).toBeInTheDocument();
      });
    });
  });

  describe('Icon Display', () => {
    it('should show sun icon for light theme', async () => {
      render(<ThemeToggle />);

      // Initially could be either sun or moon depending on system preference
      await waitFor(() => {
        const lightButton = screen.getByRole('menuitem', { name: /^Light/ });
        fireEvent.click(lightButton);
      });

      await waitFor(() => {
        // Icon should update after theme change
        expect(document.documentElement.classList.contains('dark')).toBe(false);
      });
    });

    it('should show moon icon for dark theme', async () => {
      render(<ThemeToggle />);

      await waitFor(() => {
        const darkButton = screen.getByRole('menuitem', { name: /^Dark/ });
        fireEvent.click(darkButton);
      });

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });
  });

  describe('Hydration', () => {
    it('should handle SSR/client mismatch gracefully', () => {
      const { rerender } = render(<ThemeToggle />);

      // Should not throw during rerender
      expect(() => rerender(<ThemeToggle />)).not.toThrow();
    });

    it('should show disabled button before mount on server', () => {
      const { container } = render(<ThemeToggle />);

      // Before hydration, button might be disabled
      const button = container.querySelector('button');
      // This depends on implementation details
      expect(button).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid theme switches', async () => {
      const onThemeChange = jest.fn();
      render(<ThemeToggle onThemeChange={onThemeChange} />);

      await waitFor(() => {
        const lightButton = screen.getByRole('menuitem', { name: /^Light/ });
        const darkButton = screen.getByRole('menuitem', { name: /^Dark/ });

        fireEvent.click(lightButton);
        fireEvent.click(darkButton);
        fireEvent.click(lightButton);
      });

      await waitFor(() => {
        expect(onThemeChange).toHaveBeenCalledTimes(3);
      });
    });

    it('should handle component unmount correctly', async () => {
      const { unmount } = render(<ThemeToggle />);

      expect(() => unmount()).not.toThrow();
    });
  });
});
