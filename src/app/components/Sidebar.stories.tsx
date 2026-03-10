/**
 * Sidebar Component Demo
 * Visual examples of the Sidebar component in different states
 */

"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";

export function SidebarDemo() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />
      <div
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: expanded ? "224px" : "64px" }}
      >
        <div className="h-full overflow-auto bg-gray-800 p-8">
          <div className="text-white">
            <h1 className="mb-4 text-3xl font-bold">Sidebar Component Demo</h1>
            <div className="space-y-6">
              <div className="rounded bg-gray-700 p-4">
                <h2 className="mb-2 font-bold">Current State</h2>
                <p className="text-sm text-gray-300">
                  Sidebar is currently{" "}
                  <strong>{expanded ? "EXPANDED" : "COLLAPSED"}</strong>
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Width: {expanded ? "224px" : "64px"} | Labels:{" "}
                  {expanded ? "visible" : "hidden"}
                </p>
              </div>

              <div className="rounded bg-gray-700 p-4">
                <h2 className="mb-2 font-bold">Features</h2>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>✓ Click logo button to toggle expansion</li>
                  <li>✓ Click navigation items to navigate</li>
                  <li>✓ Click avatar to open user menu</li>
                  <li>✓ Press Escape to close menu</li>
                  <li>✓ Click outside menu to dismiss</li>
                  <li>✓ Full keyboard navigation support</li>
                  <li>✓ WCAG 2.1 AA accessibility</li>
                </ul>
              </div>

              <div className="rounded bg-gray-700 p-4">
                <h2 className="mb-2 font-bold">Keyboard Shortcuts</h2>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>
                    <kbd className="rounded bg-gray-800 px-2 py-1">Tab</kbd> –
                    Navigate between elements
                  </li>
                  <li>
                    <kbd className="rounded bg-gray-800 px-2 py-1">Enter</kbd> /
                    <kbd className="rounded bg-gray-800 px-2 py-1">Space</kbd> –
                    Activate buttons
                  </li>
                  <li>
                    <kbd className="rounded bg-gray-800 px-2 py-1">Esc</kbd> –
                    Close menus
                  </li>
                </ul>
              </div>

              <div className="rounded border border-blue-500 bg-blue-900 p-4">
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
