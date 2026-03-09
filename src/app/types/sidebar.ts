/**
 * Sidebar Component Types
 * Defines TypeScript interfaces for sidebar functionality
 */

export interface NavItem {
  id: string;
  icon: React.ReactNode | string; // Can be ReactNode or icon name string
  label: string;
  href: string;
  badge?: number;
  disabled?: boolean;
}

export interface SidebarProps {
  expanded?: boolean;
  onToggle?: () => void;
  activeNav?: string;
}

export interface UserMenuState {
  open: boolean;
  position: 'top' | 'bottom';
}

export interface NavigationState {
  activeId: string;
  hoveredId?: string;
}
