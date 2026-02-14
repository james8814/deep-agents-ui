# Phase 4: Experience Polish (P3)

> Priority: Lower
> Estimated effort: 4-5 days
> Dependencies: None (can run independently)
> Branch: `feat/phase4-experience-polish`

## Goal

Polish the overall experience with file diffs, theme support, keyboard shortcuts, thread management, and input enhancements.

---

## Task 4.1: File Diff View

### Problem

The `diff` package (v8.0.2) is already in `package.json` but unused. When the agent modifies a file, users only see the final content — they can't tell what changed.

### Implementation

**New file: `src/app/components/DiffViewer.tsx`**

```tsx
"use client";

import React, { useMemo } from "react";
import { diffLines, Change } from "diff";
import { cn } from "@/lib/utils";

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  fileName?: string;
}

export const DiffViewer = React.memo<DiffViewerProps>(
  ({ oldContent, newContent, fileName }) => {
    const changes = useMemo(
      () => diffLines(oldContent, newContent),
      [oldContent, newContent]
    );

    const stats = useMemo(() => {
      let added = 0;
      let removed = 0;
      changes.forEach((change) => {
        const lineCount = change.value.split("\n").filter(Boolean).length;
        if (change.added) added += lineCount;
        if (change.removed) removed += lineCount;
      });
      return { added, removed };
    }, [changes]);

    return (
      <div className="overflow-hidden rounded-md border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
          {fileName && (
            <span className="font-mono text-xs text-muted-foreground">{fileName}</span>
          )}
          <div className="flex gap-3 text-xs">
            <span className="text-green-600">+{stats.added}</span>
            <span className="text-red-600">-{stats.removed}</span>
          </div>
        </div>

        {/* Diff Content */}
        <div className="overflow-x-auto">
          <pre className="m-0 text-xs leading-5">
            {changes.map((change, i) => (
              <DiffBlock key={i} change={change} />
            ))}
          </pre>
        </div>
      </div>
    );
  }
);

DiffViewer.displayName = "DiffViewer";

function DiffBlock({ change }: { change: Change }) {
  const lines = change.value.split("\n");
  // Remove trailing empty line from split
  if (lines[lines.length - 1] === "") lines.pop();

  return (
    <>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "px-3 py-0",
            change.added && "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
            change.removed && "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
            !change.added && !change.removed && "text-foreground"
          )}
        >
          <span className="mr-3 inline-block w-4 select-none text-right text-muted-foreground/50">
            {change.added ? "+" : change.removed ? "-" : " "}
          </span>
          {line}
        </div>
      ))}
    </>
  );
}
```

### Integration Strategy

File diffs require tracking the **previous version** of each file. Two approaches:

**Option A (recommended): Track in component state**

In the Context Panel or wherever files are displayed, maintain a `previousFiles` ref:

```tsx
const previousFilesRef = useRef<Record<string, string>>({});

useEffect(() => {
  // When files change, update the previous snapshot
  // (with a slight delay so the diff can be computed)
  const timer = setTimeout(() => {
    previousFilesRef.current = { ...files };
  }, 100);
  return () => clearTimeout(timer);
}, [files]);
```

**Option B: Compare with LangGraph checkpoint state**

Use `stream.getMessagesMetadata()` or checkpoint API to fetch previous file state. More complex, better accuracy, but requires additional API calls.

**Recommended: Start with Option A**, upgrade to Option B if needed.

### Usage in FileViewDialog / InlineFileViewer

Add a "Diff" tab alongside the content view:

```tsx
const [viewMode, setViewMode] = useState<"content" | "diff">("content");

// Tab switcher:
<div className="flex gap-1 border-b border-border">
  <button
    onClick={() => setViewMode("content")}
    className={cn("px-3 py-1.5 text-xs", viewMode === "content" ? "border-b-2 border-primary" : "")}
  >
    Content
  </button>
  <button
    onClick={() => setViewMode("diff")}
    className={cn("px-3 py-1.5 text-xs", viewMode === "diff" ? "border-b-2 border-primary" : "")}
    disabled={!previousContent}
  >
    Changes
  </button>
</div>

// Content area:
{viewMode === "content" ? (
  <SyntaxHighlighter ...>{file.content}</SyntaxHighlighter>
) : (
  <DiffViewer oldContent={previousContent} newContent={file.content} fileName={file.path} />
)}
```

### Acceptance Criteria

- [ ] Diff view shows added lines in green, removed lines in red
- [ ] Diff header shows +N / -N stats
- [ ] Diff tab available in file viewer when previous version exists
- [ ] Uses the existing `diff` package (no new dependency)
- [ ] Handles large files gracefully (virtual scrolling not required for P3)

---

## Task 4.2: Dark/Light Theme Toggle

### Problem

Some components already use `dark:` Tailwind classes, but there's no way for users to switch themes.

### New Dependency

```bash
yarn add next-themes
```

### Implementation

**Modify `src/app/layout.tsx`:**

```tsx
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NuqsAdapter>{children}</NuqsAdapter>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**New file: `src/components/ui/theme-toggle.tsx`**

```tsx
"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  );
}
```

**Add to header in `page.tsx`:**

```tsx
import { ThemeToggle } from "@/components/ui/theme-toggle";

// In the header, near the Settings button:
<ThemeToggle />
```

**CSS verification:** Audit `src/app/globals.css` to ensure dark theme CSS variables are defined. The project uses Tailwind + CSS variables, so verify entries like:

```css
:root {
  --background: ...;
  --foreground: ...;
}

.dark {
  --background: ...;
  --foreground: ...;
}
```

### Acceptance Criteria

- [ ] Theme toggle button in header switches between light and dark
- [ ] Theme persists across page reloads (next-themes uses localStorage)
- [ ] System preference is respected by default
- [ ] No flash of unstyled content on load
- [ ] All components render correctly in both themes

---

## Task 4.3: Keyboard Shortcuts

### New File: `src/app/hooks/useKeyboardShortcuts.ts`

```typescript
"use client";

import { useEffect } from "react";

interface ShortcutHandlers {
  onNewThread?: () => void;
  onFocusInput?: () => void;
  onStopGeneration?: () => void;
  onToggleContext?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + K → New thread
      if (isMod && e.key === "k") {
        e.preventDefault();
        handlers.onNewThread?.();
        return;
      }

      // Cmd/Ctrl + / → Focus input
      if (isMod && e.key === "/") {
        e.preventDefault();
        handlers.onFocusInput?.();
        return;
      }

      // Cmd/Ctrl + Shift + P → Toggle context panel
      if (isMod && e.shiftKey && e.key === "P") {
        e.preventDefault();
        handlers.onToggleContext?.();
        return;
      }

      // Escape → Stop generation or close dialogs
      if (e.key === "Escape") {
        handlers.onStopGeneration?.();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
```

### Integration in `page.tsx`

```tsx
import { useKeyboardShortcuts } from "@/app/hooks/useKeyboardShortcuts";

// Inside HomePageInner:
const textareaRef = useRef<HTMLTextAreaElement>(null);

useKeyboardShortcuts({
  onNewThread: () => setThreadId(null),
  onFocusInput: () => {
    // Need to expose textarea ref from ChatInterface or use document.querySelector
    const textarea = document.querySelector("textarea");
    textarea?.focus();
  },
  onStopGeneration: () => {
    // Need access to stopStream — requires lifting or using ref
  },
  onToggleContext: () => setContextPanel(contextPanel ? null : "1"),
});
```

**Note:** Accessing `stopStream` from `page.tsx` requires the `ChatProvider` lift done in Phase 2. If Phase 2 is complete, this is straightforward via `useChatContext()`.

### Acceptance Criteria

- [ ] `Cmd/Ctrl + K` creates a new thread
- [ ] `Cmd/Ctrl + /` focuses the input textarea
- [ ] `Escape` stops generation (when loading)
- [ ] `Cmd/Ctrl + Shift + P` toggles context panel
- [ ] Shortcuts don't fire when user is typing in an input/textarea (except Escape)

---

## Task 4.4: Thread Search & Management

### Problem

`ThreadList.tsx` supports status filtering but no text search, rename, or delete.

### 4.4.1: Thread Search

**Add search input in `ThreadList.tsx` — above the status filter:**

```tsx
const [searchQuery, setSearchQuery] = useState("");

// Filter threads by search query
const searchFiltered = useMemo(() => {
  if (!searchQuery.trim()) return flattened;
  const q = searchQuery.toLowerCase();
  return flattened.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
  );
}, [flattened, searchQuery]);

// Use searchFiltered instead of flattened in the grouped memo

// UI — add search input in the header:
<div className="px-4 pt-2">
  <div className="relative">
    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search threads..."
      className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  </div>
</div>
```

### 4.4.2: Thread Delete

**Add delete button per thread — visible on hover:**

```tsx
// Inside the thread button, add a delete action:
<div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
  <button
    onClick={(e) => {
      e.stopPropagation();
      handleDeleteThread(thread.id);
    }}
    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    title="Delete thread"
  >
    <Trash2 size={14} />
  </button>
</div>

// Make the thread button a group:
<button className={cn("group relative ...", ...)}>
```

**Delete handler:**

```tsx
const handleDeleteThread = useCallback(async (threadId: string) => {
  if (!confirm("Delete this thread? This action cannot be undone.")) return;
  try {
    const config = getConfig();
    if (!config) return;
    const apiKey = config.langsmithApiKey || process.env.NEXT_PUBLIC_LANGSMITH_API_KEY || "";
    const client = new Client({
      apiUrl: config.deploymentUrl,
      defaultHeaders: apiKey ? { "X-Api-Key": apiKey, "x-auth-scheme": "langsmith" } : { "x-auth-scheme": "langsmith" },
    });
    await client.threads.delete(threadId);
    threads.mutate();  // Revalidate the list
    // If the deleted thread was active, clear the selection
    if (currentThreadId === threadId) {
      onThreadSelect("");  // Or set threadId to null
    }
  } catch (e) {
    console.error("Failed to delete thread:", e);
  }
}, [threads, currentThreadId, onThreadSelect]);
```

### Acceptance Criteria

- [ ] Search input filters threads by title and description (client-side)
- [ ] Delete button appears on hover over each thread
- [ ] Delete shows confirmation dialog before proceeding
- [ ] After delete, thread list refreshes
- [ ] If the active thread is deleted, selection is cleared

---

## Task 4.5: Input Area Enhancements

### 4.5.1: Interrupt-aware Input

When an interrupt is active, the input area should guide the user:

```tsx
// ChatInterface.tsx — modify textarea placeholder:
placeholder={
  isLoading
    ? "Running..."
    : interrupt
    ? "Agent is waiting for approval above ↑"
    : "Write your message..."
}
```

Also, visually disable the input area when interrupted:

```tsx
<textarea
  ...
  disabled={!!interrupt}
  className={cn(
    "... existing classes ...",
    interrupt && "opacity-50 cursor-not-allowed"
  )}
/>
```

### 4.5.2: Shift+Enter Hint

Show a subtle hint below the textarea:

```tsx
// Below the textarea, inside the form:
<div className="flex items-center justify-between px-[18px] pb-1">
  <span className="text-[10px] text-muted-foreground/50">
    Shift+Enter for new line
  </span>
</div>
```

### 4.5.3: Character Counter for Long Inputs

```tsx
// Show character count when input exceeds threshold:
{input.length > 500 && (
  <span className="text-[10px] tabular-nums text-muted-foreground/50">
    {input.length.toLocaleString()} chars
  </span>
)}
```

### Acceptance Criteria

- [ ] Input placeholder shows "Agent is waiting for approval above ↑" during interrupts
- [ ] Input is visually disabled during interrupts
- [ ] "Shift+Enter for new line" hint shown below textarea
- [ ] Character counter shown when input exceeds 500 characters

---

## Files Changed Summary

| File | Action | Changes |
|------|--------|---------|
| `src/app/components/DiffViewer.tsx` | **NEW** | Line-by-line diff component |
| `src/components/ui/theme-toggle.tsx` | **NEW** | Theme toggle button |
| `src/app/hooks/useKeyboardShortcuts.ts` | **NEW** | Keyboard shortcut handler |
| `src/app/layout.tsx` | MODIFY | Add ThemeProvider |
| `src/app/page.tsx` | MODIFY | Add theme toggle, register shortcuts |
| `src/app/components/ThreadList.tsx` | MODIFY | Add search, delete functionality |
| `src/app/components/ChatInterface.tsx` | MODIFY | Interrupt-aware input, hints |
| `src/app/components/FileViewDialog.tsx` | MODIFY | Add diff tab |

## New Dependencies

| Package | Purpose | Install |
|---------|---------|---------|
| `next-themes` | Theme toggle (light/dark/system) | `yarn add next-themes` |

All other functionality uses existing packages (`diff` is already installed).
