# Phase 2: Information Architecture Restructure (P1)

> Priority: High
> Estimated effort: 4-5 days
> Dependencies: None (can run in parallel with Phase 1)
> Branch: `feat/phase2-layout-restructure`

## Goal

Move Tasks and Files out of the input area into a dedicated right-side Context Panel, making agent work products always visible alongside the conversation. Improve interrupt visibility to prevent missed approval requests.

---

## Task 2.1: Right-side Context Panel

### Problem

Tasks and files are embedded inside the chat input area (`ChatInterface.tsx` lines 296-501). This is ~200 lines of UI crammed into the input zone, making it both cluttered and hidden behind collapse toggles.

### Design

```
BEFORE:
┌──────────┬────────────────────────┐
│ Threads  │  Chat Messages         │
│          │                        │
│          │  ┌──────────────────┐  │
│          │  │ Tasks / Files    │  │  ← Embedded in input
│          │  │ [textarea]       │  │
│          │  └──────────────────┘  │
└──────────┴────────────────────────┘

AFTER:
┌──────────┬────────────────┬───────────┐
│ Threads  │  Chat Messages │  Context  │
│          │                │ ┌───────┐ │
│          │                │ │ Tasks │ │
│          │                │ ├───────┤ │
│          │ [textarea]     │ │ Files │ │
│          │                │ └───────┘ │
└──────────┴────────────────┴───────────┘
```

### New File: `src/app/components/ContextPanel.tsx`

```tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  CheckCircle,
  Circle,
  Clock,
  FileText,
  ListTodo,
  PanelRightClose,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { FileViewDialog } from "@/app/components/FileViewDialog";
import type { TodoItem, FileItem } from "@/app/types/types";

type Tab = "tasks" | "files";

interface ContextPanelProps {
  onClose: () => void;
}

export const ContextPanel = React.memo<ContextPanelProps>(({ onClose }) => {
  const { todos, files, setFiles, isLoading, interrupt } = useChatContext();
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const hasTasks = todos.length > 0;
  const fileCount = Object.keys(files).length;
  const hasFiles = fileCount > 0;

  const groupedTodos = useMemo(() => ({
    in_progress: todos.filter((t) => t.status === "in_progress"),
    pending: todos.filter((t) => t.status === "pending"),
    completed: todos.filter((t) => t.status === "completed"),
  }), [todos]);

  const handleSaveFile = useCallback(
    async (fileName: string, content: string) => {
      await setFiles({ ...files, [fileName]: content });
      setSelectedFile({ path: fileName, content });
    },
    [files, setFiles]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Context</h2>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <PanelRightClose size={14} />
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === "tasks"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ListTodo size={14} />
          Tasks
          {hasTasks && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary">
              {todos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === "files"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText size={14} />
          Files
          {hasFiles && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary">
              {fileCount}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === "tasks" && (
          <TasksTab groupedTodos={groupedTodos} hasTasks={hasTasks} />
        )}
        {activeTab === "files" && (
          <FilesTab
            files={files}
            onFileSelect={setSelectedFile}
          />
        )}
      </ScrollArea>

      {/* File Dialog — remains modal for editing */}
      {selectedFile && (
        <FileViewDialog
          file={selectedFile}
          onSaveFile={handleSaveFile}
          onClose={() => setSelectedFile(null)}
          editDisabled={isLoading === true || interrupt !== undefined}
        />
      )}
    </div>
  );
});

ContextPanel.displayName = "ContextPanel";

// --- Sub-components ---

function getStatusIcon(status: TodoItem["status"]) {
  switch (status) {
    case "completed":
      return <CheckCircle size={14} className="text-success/80" />;
    case "in_progress":
      return <Clock size={14} className="text-warning/80 animate-pulse" />;
    default:
      return <Circle size={14} className="text-tertiary/70" />;
  }
}

const GROUP_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  pending: "Pending",
  completed: "Completed",
};

function TasksTab({
  groupedTodos,
  hasTasks,
}: {
  groupedTodos: Record<string, TodoItem[]>;
  hasTasks: boolean;
}) {
  if (!hasTasks) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ListTodo size={24} className="mb-2 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No tasks yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Tasks will appear here as the agent works
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      {Object.entries(groupedTodos)
        .filter(([, items]) => items.length > 0)
        .map(([status, items]) => (
          <div key={status} className="mb-4 last:mb-0">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {GROUP_LABELS[status] || status}
            </h3>
            <div className="space-y-1.5">
              {items.map((todo, index) => (
                <div
                  key={`${status}_${todo.id}_${index}`}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getStatusIcon(todo.status)}
                  </div>
                  <span className="flex-1 break-words leading-relaxed">
                    {todo.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function FilesTab({
  files,
  onFileSelect,
}: {
  files: Record<string, string>;
  onFileSelect: (file: FileItem) => void;
}) {
  const fileEntries = Object.keys(files);

  if (fileEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText size={24} className="mb-2 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No files yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Files will appear here as the agent creates them
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <div className="space-y-1">
        {fileEntries.map((filePath) => {
          const rawContent = files[filePath];
          const fileContent =
            typeof rawContent === "object" && rawContent !== null && "content" in rawContent
              ? String((rawContent as { content: unknown }).content || "")
              : String(rawContent || "");

          const ext = filePath.split(".").pop()?.toLowerCase() || "";

          return (
            <button
              key={filePath}
              onClick={() => onFileSelect({ path: filePath, content: fileContent })}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <FileText size={14} className="flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{filePath}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {ext.toUpperCase()} · {fileContent.length} chars
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### Modification in `page.tsx`

Add the third resizable panel and the toggle state.

**Step-by-step changes in `HomePageInner`:**

```tsx
// page.tsx — add state for context panel
const [contextPanel, setContextPanel] = useQueryState("context");

// In the header — add context panel toggle button (next to Settings):
<Button
  variant="outline"
  size="sm"
  onClick={() => setContextPanel(contextPanel ? null : "1")}
>
  <PanelRight className="mr-2 h-4 w-4" />
  Context
</Button>

// In the ResizablePanelGroup — add the third panel:
<ResizablePanelGroup direction="horizontal" autoSaveId="standalone-chat">
  {/* Panel 1: Thread Sidebar (existing) */}
  {sidebar && (
    <>
      <ResizablePanel id="thread-history" order={1} defaultSize={25} minSize={20} className="relative min-w-[380px]">
        <ThreadList ... />
      </ResizablePanel>
      <ResizableHandle />
    </>
  )}

  {/* Panel 2: Chat (existing) */}
  <ResizablePanel id="chat" className="relative flex flex-col" order={2}>
    <ChatProvider activeAssistant={assistant} onHistoryRevalidate={() => mutateThreads?.()}>
      <ChatInterface assistant={assistant} />
    </ChatProvider>
  </ResizablePanel>

  {/* Panel 3: Context Panel (NEW) */}
  {contextPanel && (
    <>
      <ResizableHandle />
      <ResizablePanel id="context" order={3} defaultSize={25} minSize={20} className="relative min-w-[280px]">
        <ChatProvider activeAssistant={assistant} onHistoryRevalidate={() => mutateThreads?.()}>
          <ContextPanel onClose={() => setContextPanel(null)} />
        </ChatProvider>
      </ResizablePanel>
    </>
  )}
</ResizablePanelGroup>
```

**Important:** The `ContextPanel` needs access to `useChatContext()`. Since it's in a separate panel from the main chat, it must be wrapped in the same `ChatProvider`. Two options:

- **Option A (recommended):** Lift `ChatProvider` up to wrap the entire `ResizablePanelGroup`, so both chat and context panel share the same provider instance.
- **Option B:** Keep separate providers (will cause duplicate state — NOT recommended).

**Option A refactor:**

```tsx
<ChatProvider activeAssistant={assistant} onHistoryRevalidate={() => mutateThreads?.()}>
  <ResizablePanelGroup ...>
    {/* Panel 1: Threads */}
    {/* Panel 2: Chat */}
    <ResizablePanel id="chat" ...>
      <ChatInterface assistant={assistant} />  {/* No ChatProvider wrapper */}
    </ResizablePanel>
    {/* Panel 3: Context */}
    {contextPanel && (
      <>
        <ResizableHandle />
        <ResizablePanel id="context" ...>
          <ContextPanel onClose={() => setContextPanel(null)} />
        </ResizablePanel>
      </>
    )}
  </ResizablePanelGroup>
</ChatProvider>
```

### Remove Embedded Tasks/Files from ChatInterface.tsx

After the ContextPanel is working, **remove** the entire embedded tasks/files block from `ChatInterface.tsx` (lines 296-501 — the `{(hasTasks || hasFiles) && (...)}` block above the `<form>`).

This reduces `ChatInterface.tsx` by ~200 lines and makes the input area clean:

```tsx
// ChatInterface.tsx — simplified input area (after removal)
<div className="flex-shrink-0 bg-background">
  <div className={cn("mx-4 mb-6 ... rounded-xl border border-border bg-background", "mx-auto w-[calc(100%-32px)] max-w-[1024px]")}>
    <form onSubmit={handleSubmit} className="flex flex-col">
      <textarea ... />
      <div className="flex justify-between gap-2 p-3">
        {/* Send/Stop button */}
      </div>
    </form>
  </div>
</div>
```

### Auto-show Context Panel

Auto-open the context panel when tasks or files first appear:

```tsx
// page.tsx — add auto-show effect
useEffect(() => {
  // Auto-show context panel on first task/file appearance
  // (only if it hasn't been explicitly closed)
  if (!contextPanel && (todos.length > 0 || Object.keys(files).length > 0)) {
    setContextPanel("1");
  }
}, [/* trigger on first appearance — needs careful implementation */]);
```

Note: This requires `todos` and `files` to be accessible at the `page.tsx` level, which they will be after lifting `ChatProvider` up (Option A above).

### Acceptance Criteria

- [ ] Context panel renders as a resizable right-side panel
- [ ] Tasks tab shows all todos grouped by status
- [ ] Files tab shows a list of files with name, type, and size
- [ ] Clicking a file opens the existing FileViewDialog
- [ ] Panel can be toggled via header button
- [ ] Panel state persists in URL (`?context=1`)
- [ ] Tasks/Files UI is fully removed from ChatInterface input area
- [ ] `ChatProvider` is shared between ChatInterface and ContextPanel

---

## Task 2.2: Interrupt Visibility Enhancement

### Problem

When the agent needs human approval, the approval UI is buried inside the last tool call box. Users miss it, especially on long conversations or when switching tabs.

### 2.2.1: Interrupt Banner in ChatInterface

**Add above the input area in `ChatInterface.tsx`:**

```tsx
// ChatInterface.tsx — add between ExecutionStatusBar and input area

{interrupt && (
  <div className="flex items-center gap-3 border-b border-orange-300/30 bg-orange-50 px-4 py-2.5 dark:border-orange-500/20 dark:bg-orange-950/30">
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
      <AlertCircle size={14} className="text-orange-600 dark:text-orange-400" />
    </div>
    <div className="flex-1 text-sm">
      <span className="font-medium text-orange-800 dark:text-orange-200">
        Action required
      </span>
      <span className="ml-1 text-orange-600 dark:text-orange-400">
        — The agent is waiting for your approval above
      </span>
    </div>
    <button
      onClick={() => {
        // Scroll to the interrupt tool call
        const lastMessage = document.querySelector("[data-last-message]");
        lastMessage?.scrollIntoView({ behavior: "smooth", block: "center" });
      }}
      className="flex-shrink-0 rounded-md border border-orange-300 bg-white px-3 py-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-50 dark:border-orange-600 dark:bg-orange-900/50 dark:text-orange-300"
    >
      Review
    </button>
  </div>
)}
```

**Add `data-last-message` attribute to the last ChatMessage:**

```tsx
// ChatInterface.tsx — in processedMessages.map()
<div data-last-message={isLastMessage ? "" : undefined}>
  <ChatMessage ... />
</div>
```

### 2.2.2: Visual Highlight on Interrupt Tool Call

**Modify `ToolCallBox.tsx` — add pulsing ring when interrupted:**

```tsx
// ToolCallBox.tsx — modify the outer div
<div
  className={cn(
    "w-full overflow-hidden rounded-lg border-none shadow-none outline-none transition-colors duration-200 hover:bg-accent",
    isExpanded && hasContent && "bg-accent",
    status === "interrupted" && "ring-2 ring-orange-400/50 ring-offset-1 ring-offset-background"
  )}
>
```

### 2.2.3: Browser Tab Notification

**New file: `src/app/hooks/useInterruptNotification.ts`**

```typescript
"use client";

import { useEffect, useRef } from "react";

/**
 * Notifies the user via document title flash and browser Notification
 * when an interrupt occurs while the tab is not focused.
 */
export function useInterruptNotification(interrupt: unknown | undefined) {
  const originalTitle = useRef<string>("");
  const flashInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!interrupt) {
      // Clear notification state
      if (flashInterval.current) {
        clearInterval(flashInterval.current);
        flashInterval.current = null;
      }
      if (originalTitle.current) {
        document.title = originalTitle.current;
        originalTitle.current = "";
      }
      return;
    }

    // Only notify if tab is not focused
    if (document.hidden) {
      // 1. Flash document title
      originalTitle.current = document.title;
      let toggle = false;
      flashInterval.current = setInterval(() => {
        document.title = toggle
          ? "(!) Approval needed"
          : originalTitle.current;
        toggle = !toggle;
      }, 1000);

      // 2. Browser notification (if permitted)
      if (Notification.permission === "granted") {
        new Notification("Deep Agent needs approval", {
          body: "An agent action requires your review.",
          icon: "/logo.svg",
        });
      } else if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }

    return () => {
      if (flashInterval.current) {
        clearInterval(flashInterval.current);
      }
      if (originalTitle.current) {
        document.title = originalTitle.current;
      }
    };
  }, [interrupt]);

  // Restore title when tab regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (flashInterval.current) {
        clearInterval(flashInterval.current);
        flashInterval.current = null;
      }
      if (originalTitle.current) {
        document.title = originalTitle.current;
        originalTitle.current = "";
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);
}
```

**Usage in `ChatInterface.tsx`:**

```tsx
import { useInterruptNotification } from "@/app/hooks/useInterruptNotification";

// Inside the component:
useInterruptNotification(interrupt);
```

### Acceptance Criteria

- [ ] Orange banner appears above input area when interrupt is active
- [ ] "Review" button scrolls to the interrupted tool call
- [ ] Banner disappears when interrupt is resolved
- [ ] Interrupted tool call has a visible orange ring highlight
- [ ] Document title flashes when interrupt occurs on a background tab
- [ ] Browser notification fires when interrupt occurs on a background tab (if permitted)
- [ ] Title flash stops when tab regains focus

---

## Task 2.3: Sub-Agent Real-time Progress

### Problem

`SubAgentIndicator.tsx` (45 lines total) only shows the sub-agent name with an expand/collapse toggle. No status icon, no timing, no progress.

### Redesigned `SubAgentIndicator.tsx`

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type { SubAgent } from "@/app/types/types";
import { cn } from "@/lib/utils";

interface SubAgentIndicatorProps {
  subAgent: SubAgent;
  onClick: () => void;
  isExpanded?: boolean;
}

export const SubAgentIndicator = React.memo<SubAgentIndicatorProps>(
  ({ subAgent, onClick, isExpanded = true }) => {
    const [elapsed, setElapsed] = useState(0);
    const startRef = useRef<number>(Date.now());

    // Elapsed time for active sub-agents
    useEffect(() => {
      if (subAgent.status === "active" || subAgent.status === "pending") {
        startRef.current = Date.now();
        const interval = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [subAgent.status]);

    const statusIcon = (() => {
      switch (subAgent.status) {
        case "active":
          return <Loader2 size={14} className="animate-spin text-blue-500" />;
        case "completed":
          return <CheckCircle size={14} className="text-success/80" />;
        case "error":
          return <XCircle size={14} className="text-destructive" />;
        default:
          return <Clock size={14} className="text-muted-foreground" />;
      }
    })();

    const statusText = (() => {
      switch (subAgent.status) {
        case "active":
          return `Running... ${elapsed}s`;
        case "completed":
          return `Completed${elapsed > 0 ? ` in ${elapsed}s` : ""}`;
        case "error":
          return "Failed";
        default:
          return "Pending";
      }
    })();

    return (
      <div className={cn(
        "w-fit max-w-[70vw] overflow-hidden rounded-lg border",
        subAgent.status === "active" ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30" :
        subAgent.status === "error" ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/30" :
        "border-border bg-card"
      )}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className="flex w-full items-center justify-between gap-3 border-none px-4 py-2.5 text-left shadow-none"
        >
          <div className="flex items-center gap-2">
            {statusIcon}
            <span className="text-[14px] font-semibold tracking-tight text-foreground">
              {subAgent.subAgentName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {statusText}
            </span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </Button>
      </div>
    );
  }
);

SubAgentIndicator.displayName = "SubAgentIndicator";
```

### Acceptance Criteria

- [ ] Active sub-agents show a spinning icon + elapsed timer
- [ ] Completed sub-agents show a checkmark + total time
- [ ] Error sub-agents show a red X icon
- [ ] Active sub-agents have a subtle blue background tint
- [ ] Timer updates every second during active state
- [ ] Collapsed state still shows status text on one line

---

## Files Changed Summary

| File | Action | Changes |
|------|--------|---------|
| `src/app/components/ContextPanel.tsx` | **NEW** | Full context panel with Tasks/Files tabs |
| `src/app/hooks/useInterruptNotification.ts` | **NEW** | Browser notification + title flash for interrupts |
| `src/app/page.tsx` | MODIFY | Add third ResizablePanel, lift ChatProvider, add context toggle |
| `src/app/components/ChatInterface.tsx` | MODIFY | Remove embedded tasks/files (~200 lines), add interrupt banner |
| `src/app/components/ToolCallBox.tsx` | MODIFY | Add interrupt ring highlight |
| `src/app/components/SubAgentIndicator.tsx` | MODIFY | Complete redesign with status/timing |

## New Dependencies

None required.
