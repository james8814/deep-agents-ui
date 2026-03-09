/**
 * Sidebar Component Tests
 * Tests for rendering, interaction, and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from '../Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

// Mock dependencies
jest.mock('@/contexts/AuthContext');
jest.mock('next/navigation');
jest.mock('@/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('Sidebar Component', () => {
  const mockPush = jest.fn();
  const mockLogout = jest.fn();
  const mockUser = {
    id: '123',
    username: 'johndoe',
    email: 'john@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (usePathname as jest.Mock).mockReturnValue('/');
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
    });
  });

  describe('Rendering', () => {
    it('should render sidebar with collapsed state by default', () => {
      render(<Sidebar />);
      const sidebar = screen.getByRole('navigation', { name: /main navigation/i });
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toHaveClass('w-16'); // Collapsed width
    });

    it('should render sidebar with expanded state when prop is true', () => {
      render(<Sidebar expanded={true} />);
      const sidebar = screen.getByRole('navigation', { name: /main navigation/i });
      expect(sidebar).toHaveClass('w-56'); // Expanded width
    });

    it('should render logo button', () => {
      render(<Sidebar />);
      const logoButton = screen.getByLabelText(/toggle sidebar/i);
      expect(logoButton).toBeInTheDocument();
    });

    it('should render navigation items', () => {
      render(<Sidebar />);
      expect(screen.getByRole('menuitem', { name: /对话/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /文件/i })).toBeInTheDocument();
    });

    it('should render user avatar button', () => {
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      expect(userButton).toBeInTheDocument();
      expect(userButton).toHaveTextContent('J'); // First letter of John
    });

    it('should display brand name when expanded', () => {
      render(<Sidebar expanded={true} />);
      expect(screen.getByText('Azune')).toBeInTheDocument();
    });

    it('should not display brand name when collapsed', () => {
      render(<Sidebar expanded={false} />);
      expect(screen.queryByText('Azune')).not.toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to chat when chat button is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const chatButton = screen.getByRole('menuitem', { name: /对话/i });
      await user.click(chatButton);
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('should navigate to files when files button is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const filesButton = screen.getByRole('menuitem', { name: /文件/i });
      await user.click(filesButton);
      expect(mockPush).toHaveBeenCalledWith('/files');
    });

    it('should highlight active navigation item', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<Sidebar />);
      const chatButton = screen.getByRole('menuitem', { name: /对话/i });
      expect(chatButton).toHaveClass('text-brand-primary');
    });
  });

  describe('User Menu', () => {
    it('should open user menu when avatar is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      await user.click(userButton);
      expect(userButton).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should display user information in menu', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      await user.click(userButton);
      expect(screen.getByText('johndoe')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display menu items', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      await user.click(userButton);
      expect(screen.getByText('个人资料')).toBeInTheDocument();
      expect(screen.getByText('设置')).toBeInTheDocument();
      expect(screen.getByText('帮助')).toBeInTheDocument();
      expect(screen.getByText('登出')).toBeInTheDocument();
    });

    it('should close menu when clicking outside', async () => {
      const user = userEvent.setup();
      const { container } = render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      await user.click(userButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(container);
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should close menu when pressing Escape', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      await user.click(userButton);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('should navigate to profile when profile is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      await user.click(userButton);
      const profileButton = screen.getByRole('menuitem', { name: /个人资料/i });
      await user.click(profileButton);
      expect(mockPush).toHaveBeenCalledWith('/profile');
    });

    it('should navigate to settings when settings is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      await user.click(userButton);
      const settingsButton = screen.getByRole('menuitem', { name: /设置/i });
      await user.click(settingsButton);
      expect(mockPush).toHaveBeenCalledWith('/settings');
    });

    it('should logout when logout is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      await user.click(userButton);
      const logoutButton = screen.getByRole('menuitem', { name: /登出/i });
      await user.click(logoutButton);
      expect(mockLogout).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('Toggle', () => {
    it('should call onToggle when logo button is clicked', async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();
      render(<Sidebar onToggle={onToggle} />);
      const logoButton = screen.getByLabelText(/toggle sidebar/i);
      await user.click(logoButton);
      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<Sidebar />);
      expect(screen.getByRole('navigation')).toHaveAttribute(
        'aria-label',
        'Main navigation'
      );
      expect(screen.getByLabelText(/toggle sidebar/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/user menu/i)).toBeInTheDocument();
    });

    it('should set aria-current on active navigation item', () => {
      (usePathname as jest.Mock).mockReturnValue('/');
      render(<Sidebar />);
      const chatButton = screen.getByRole('menuitem', { name: /对话/i });
      expect(chatButton).toHaveAttribute('aria-current', 'page');
    });

    it('should have proper menu roles', async () => {
      const user = userEvent.setup();
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      expect(userButton).toHaveAttribute('aria-haspopup', 'menu');
      expect(userButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(userButton);
      expect(userButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Responsive Design', () => {
    it('should be fixed position on all screens', () => {
      render(<Sidebar />);
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('fixed', 'left-0', 'top-0', 'h-screen');
    });

    it('should use correct width for collapsed state', () => {
      render(<Sidebar expanded={false} />);
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('w-16'); // 64px
    });

    it('should use correct width for expanded state', () => {
      render(<Sidebar expanded={true} />);
      const sidebar = screen.getByRole('navigation');
      expect(sidebar).toHaveClass('w-56'); // 224px
    });
  });

  describe('User Avatar', () => {
    it('should display user initial', () => {
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      expect(userButton).toHaveTextContent('j');
    });

    it('should use fallback initial when user is not available', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        logout: mockLogout,
      });
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      expect(userButton).toHaveTextContent('U');
    });

    it('should display user name as title on hover', () => {
      render(<Sidebar />);
      const userButton = screen.getByLabelText(/user menu/i);
      expect(userButton).toHaveAttribute('title', 'johndoe');
    });
  });
});
