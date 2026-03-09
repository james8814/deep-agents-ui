/**
 * useSidebar Hook
 * Manages sidebar state and persistence
 */

'use client';

import { useState, useEffect } from 'react';

interface UseSidebarReturn {
  expanded: boolean;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
}

const SIDEBAR_STORAGE_KEY = 'sidebar-expanded';

export function useSidebar(): UseSidebarReturn {
  const [expanded, setExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      setExpanded(saved === 'true');
    }
    setIsMounted(true);
  }, []);

  // Save to localStorage when expanded changes
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(expanded));
    }
  }, [expanded, isMounted]);

  const toggleExpanded = () => {
    setExpanded((prev) => !prev);
  };

  return {
    expanded,
    toggleExpanded,
    setExpanded,
  };
}
