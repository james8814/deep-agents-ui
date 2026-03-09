'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  MessageCircle,
  FileText,
  Settings,
  LogOut,
  User,
  HelpCircle,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  href: string;
}

interface SidebarProps {
  expanded?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  expanded = false,
  onToggle,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const navItems: NavItem[] = [
    { id: 'chat', icon: <MessageCircle size={20} />, label: '对话', href: '/' },
    { id: 'files', icon: <FileText size={20} />, label: '文件', href: '/files' },
  ];

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Close menu on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const handleNavClick = (href: string) => {
    router.push(href);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Determine active navigation item
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-primary border-r border-secondary',
          'flex flex-col items-center gap-3 p-3 transition-all duration-300 z-50',
          'overflow-y-auto',
          expanded ? 'w-56' : 'w-16'
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Logo Button */}
        <button
          onClick={onToggle}
          className={cn(
            'flex items-center justify-center gap-2 px-3 py-2 rounded-md',
            'bg-gradient-to-br from-cyan-400 to-purple-600 text-white font-bold text-lg',
            'hover:shadow-lg hover:scale-105 transition-all duration-200',
            'min-h-10 min-w-10 flex-shrink-0'
          )}
          aria-label="Toggle sidebar"
          title="Toggle sidebar expansion"
        >
          {expanded ? <X size={20} /> : <Menu size={20} />}
          {expanded && <span className="text-sm font-semibold">Azune</span>}
        </button>

        {/* Navigation */}
        <nav
          className="flex flex-col gap-2 mt-4 w-full"
          role="menubar"
        >
          {navItems.map(({ id, icon, label, href }) => {
            const active = isActive(href);
            return (
              <button
                key={id}
                onClick={() => handleNavClick(href)}
                className={cn(
                  'h-10 rounded-md flex items-center justify-center gap-3',
                  'transition-all duration-200 group',
                  'px-3 min-w-10 text-sm font-medium',
                  active
                    ? 'bg-gradient-to-r from-purple-500/20 to-cyan-400/10 text-brand-primary'
                    : 'text-tertiary hover:bg-secondary hover:text-primary'
                )}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                role="menuitem"
                title={label}
              >
                {icon}
                {expanded && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Menu */}
        <div className="relative w-full">
          <button
            ref={buttonRef}
            onClick={() => setMenuOpen(!menuOpen)}
            className={cn(
              'w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-cyan-400',
              'flex items-center justify-center text-white font-semibold text-xs',
              'hover:shadow-lg hover:scale-110 transition-all duration-200',
              'mx-auto flex-shrink-0'
            )}
            aria-label="User menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title={user?.username || 'User'}
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              ref={menuRef}
              className={cn(
                'absolute bottom-full left-1/2 -translate-x-1/2 mb-2',
                'bg-secondary border border-tertiary',
                'rounded-lg shadow-xl z-200 overflow-hidden',
                'min-w-max',
                expanded ? 'w-48' : 'w-56'
              )}
              role="menu"
            >
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-tertiary space-y-1">
                <div className="font-medium text-primary text-sm">
                  {user?.username || 'User'}
                </div>
                <div className="text-xs text-tertiary truncate max-w-xs">
                  {user?.email || 'user@example.com'}
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    handleNavClick('/profile');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-primary
                           hover:bg-tertiary transition-colors"
                  role="menuitem"
                >
                  <User size={16} />
                  <span>个人资料</span>
                </button>

                <button
                  onClick={() => {
                    handleNavClick('/settings');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-primary
                           hover:bg-tertiary transition-colors"
                  role="menuitem"
                >
                  <Settings size={16} />
                  <span>设置</span>
                </button>

                <button
                  onClick={() => {
                    handleNavClick('/help');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-primary
                           hover:bg-tertiary transition-colors"
                  role="menuitem"
                >
                  <HelpCircle size={16} />
                  <span>帮助</span>
                </button>

                <div className="border-t border-tertiary my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error
                           hover:bg-error-secondary transition-colors"
                  role="menuitem"
                >
                  <LogOut size={16} />
                  <span>登出</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Overlay when menu open (for mobile) */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
};

Sidebar.displayName = 'Sidebar';
