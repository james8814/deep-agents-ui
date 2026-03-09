/**
 * Sidebar Component Demo
 * Visual examples of the Sidebar component in different states
 */

'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';

export function SidebarDemo() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar expanded={expanded} onToggle={() => setExpanded(!expanded)} />
      <div className="flex-1 transition-all duration-300" style={{ marginLeft: expanded ? '224px' : '64px' }}>
        <div className="bg-gray-800 p-8 h-full overflow-auto">
          <div className="text-white">
            <h1 className="text-3xl font-bold mb-4">Sidebar Component Demo</h1>
            <div className="space-y-6">
              <div className="bg-gray-700 p-4 rounded">
                <h2 className="font-bold mb-2">Current State</h2>
                <p className="text-sm text-gray-300">
                  Sidebar is currently{' '}
                  <strong>{expanded ? 'EXPANDED' : 'COLLAPSED'}</strong>
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Width: {expanded ? '224px' : '64px'} | Labels:{' '}
                  {expanded ? 'visible' : 'hidden'}
                </p>
              </div>

              <div className="bg-gray-700 p-4 rounded">
                <h2 className="font-bold mb-2">Features</h2>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>✓ Click logo button to toggle expansion</li>
                  <li>✓ Click navigation items to navigate</li>
                  <li>✓ Click avatar to open user menu</li>
                  <li>✓ Press Escape to close menu</li>
                  <li>✓ Click outside menu to dismiss</li>
                  <li>✓ Full keyboard navigation support</li>
                  <li>✓ WCAG 2.1 AA accessibility</li>
                </ul>
              </div>

              <div className="bg-gray-700 p-4 rounded">
                <h2 className="font-bold mb-2">Keyboard Shortcuts</h2>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>
                    <kbd className="bg-gray-800 px-2 py-1 rounded">Tab</kbd> –
                    Navigate between elements
                  </li>
                  <li>
                    <kbd className="bg-gray-800 px-2 py-1 rounded">Enter</kbd> /
                    <kbd className="bg-gray-800 px-2 py-1 rounded">Space</kbd> –
                    Activate buttons
                  </li>
                  <li>
                    <kbd className="bg-gray-800 px-2 py-1 rounded">Esc</kbd> –
                    Close menus
                  </li>
                </ul>
              </div>

              <div className="bg-blue-900 border border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-100">
                  💡 <strong>Tip:</strong> Open DevTools (F12) to inspect
                  component structure and ARIA attributes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SidebarDemo;
