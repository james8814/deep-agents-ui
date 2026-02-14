# Phase 1: Agent Execution Visibility (P0)

> Priority: Highest
> Estimated effort: 2-3 days
> Dependencies: None (can start immediately)
> Branch: `feat/phase1-execution-visibility`

## Goal

Transform the agent execution experience from "blank screen with Running..." to a live, transparent view of what the agent is doing at every moment.

---

## Task 1.1: Execution Status Bar

### Problem

When `isLoading === true`, the only feedback is:
```tsx
// ChatInterface.tsx — current state
placeholder={isLoading ? "Running..." : "Write your message..."}
```
User has zero insight into what the agent is doing during runs that can last 30+ seconds.

### New File: `src/app/components/ExecutionStatusBar.tsx`

```tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExecutionStatusBarProps {
  isLoading: boolean;
  /** Current step/node name extracted from stream metadata */
  currentStep?: string | null;
  /** Current tool being called */
  currentTool?: string | null;
}

export const ExecutionStatusBar = React.memo<ExecutionStatusBarProps>(
  ({ isLoading, currentStep, currentTool }) => {
    const [elapsed, setElapsed] = useState(0);
    const startTimeRef = useRef<number | null>(null);

    // Track elapsed time
    useEffect(() => {
      if (isLoading) {
        startTimeRef.current = Date.now();
        setElapsed(0);
        const interval = setInterval(() => {
          if (startTimeRef.current) {
            setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
          }
        }, 1000);
        return () => clearInterval(interval);
      } else {
        startTimeRef.current = null;
        setElapsed(0);
      }
    }, [isLoading]);

    if (!isLoading) return null;

    const formatElapsed = (seconds: number): string => {
      if (seconds < 60) return `${seconds}s`;
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    };

    return (
      <div className="flex items-center gap-3 border-b border-border bg-accent/50 px-4 py-2 text-sm">
        <Loader2 size={14} className="animate-spin text-primary" />
        <div className="flex flex-1 items-center gap-2 truncate">
          <span className="font-medium text-foreground">
            {currentStep || "Running agent"}
          </span>
          {currentTool && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="truncate font-mono text-xs text-muted-foreground">
                {currentTool}
              </span>
            </>
          )}
        </div>
        <span className="flex-shrink-0 tabular-nums text-xs text-muted-foreground">
          {formatElapsed(elapsed)}
        </span>
      </div>
    );
  }
);

ExecutionStatusBar.displayName = "ExecutionStatusBar";
```

### Integration into ChatInterface.tsx

**Location:** Between the scrollable messages area and the input area.

```tsx
// ChatInterface.tsx — find the boundary between scroll area and input

// BEFORE (current structure):
<div className="flex flex-1 flex-col overflow-hidden">
  <div className="flex-1 overflow-y-auto ..." ref={scrollRef}>
    {/* messages */}
  </div>
  <div className="flex-shrink-0 bg-background">
    {/* input area with embedded tasks/files */}
  </div>
</div>

// AFTER (with status bar):
<div className="flex flex-1 flex-col overflow-hidden">
  <div className="flex-1 overflow-y-auto ..." ref={scrollRef}>
    {/* messages */}
  </div>
  <ExecutionStatusBar
    isLoading={isLoading}
    currentStep={currentStep}
    currentTool={currentTool}
  />
  <div className="flex-shrink-0 bg-background">
    {/* input area */}
  </div>
</div>
```

### Extracting Current Step/Tool

The `stream` object from `useStream` provides metadata. Add state tracking in `ChatInterface.tsx`:

```tsx
// ChatInterface.tsx — add these derived states

// Extract the last AI message being generated (it may have tool_calls in progress)
const currentExecutionInfo = useMemo(() => {
  if (!isLoading) return { step: null, tool: null };

  // Check if the last message is an AI message with tool calls in progress
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.type === "ai" && lastMsg.tool_calls?.length) {
    const pendingTool = lastMsg.tool_calls.find(
      (tc: { name?: string }) => tc.name && tc.name !== ""
    );
    if (pendingTool) {
      return {
        step: null,
        tool: pendingTool.name,
      };
    }
  }

  return { step: null, tool: null };
}, [isLoading, messages]);
```

### Acceptance Criteria

- [ ] Status bar appears immediately when `isLoading` becomes true
- [ ] Status bar disappears when `isLoading` becomes false
- [ ] Elapsed time counts up accurately in 1-second increments
- [ ] Timer resets on new run
- [ ] Current tool name shows when available
- [ ] No layout shift when status bar appears/disappears (use consistent height)

---

## Task 1.2: Streaming Message Display

### Problem

`ChatInterface.tsx` processes messages via `processedMessages` which only handles complete messages. While the LangGraph SDK's `stream.messages` does include the in-progress message, the current rendering pipeline doesn't provide any visual feedback during generation.

### Implementation

The `stream.messages` from `useStream` already includes the streaming message. The issue is that the `processedMessages` pipeline treats all messages equally — there's no special handling for the "last AI message that's still being generated."

**Modification in `ChatInterface.tsx`:**

```tsx
// ChatInterface.tsx — after the processedMessages.map() block

// Detect streaming state: isLoading + last message is AI + has content being generated
const streamingMessage = useMemo(() => {
  if (!isLoading || messages.length === 0) return null;
  const last = messages[messages.length - 1];
  // If last message is AI and already in processedMessages, it's being streamed
  if (last.type === "ai") {
    const content = extractStringFromMessageContent(last);
    // Only show streaming indicator if this message is still generating
    // (it will be in processedMessages but may have empty content initially)
    return { message: last, content, hasContent: content.trim().length > 0 };
  }
  return null;
}, [isLoading, messages]);
```

**Add streaming indicator after the messages list:**

```tsx
{/* After processedMessages.map() and before </> closing */}

{/* Streaming indicator — shows when agent is generating but no content yet */}
{isLoading && !streamingMessage?.hasContent && processedMessages.length > 0 && (
  <div className="mt-4 flex items-start gap-2 px-1">
    <div className="flex items-center gap-1.5 rounded-lg px-3 py-2">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/60" />
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/40"
            style={{ animationDelay: "0.2s" }} />
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/20"
            style={{ animationDelay: "0.4s" }} />
    </div>
  </div>
)}
```

### Typing Cursor for Streaming Content

When AI content IS streaming (partial text visible), add a blinking cursor at the end of the last message.

**Modification in `MarkdownContent.tsx`:**

Add an optional `isStreaming` prop:

```tsx
interface MarkdownContentProps {
  content: string;
  className?: string;
  isStreaming?: boolean;  // NEW
}

export const MarkdownContent = React.memo<MarkdownContentProps>(
  ({ content, className = "", isStreaming = false }) => {
    return (
      <div className={cn("prose ...", className)}>
        <ReactMarkdown ...>
          {content}
        </ReactMarkdown>
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
        )}
      </div>
    );
  }
);
```

**Pass `isStreaming` from `ChatMessage.tsx`:**

The `ChatMessage` component needs a new prop `isStreaming?: boolean`, set to `true` for the last message when `isLoading`.

```tsx
// ChatInterface.tsx — in the processedMessages.map()
<ChatMessage
  key={data.message.id}
  message={data.message}
  toolCalls={data.toolCalls}
  isLoading={isLoading}
  isStreaming={isLoading && isLastMessage && data.message.type === "ai"}  // NEW
  // ... other props
/>
```

### Acceptance Criteria

- [ ] Pulsing dots appear when agent is loading but no AI content yet
- [ ] Blinking cursor appears at the end of streaming AI text
- [ ] Cursor disappears when streaming completes
- [ ] No duplicate message rendering (streaming message must not appear twice)
- [ ] `useStickToBottom` keeps the view scrolled to the latest content

---

## Task 1.3: Copy Button on Messages

### Problem

AI messages have no action buttons. Users frequently need to copy responses.

### Implementation in `ChatMessage.tsx`

Add a hover-triggered action bar on AI messages.

**New utility (add to `src/app/utils/utils.ts`):**

```typescript
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

**Modification in `ChatMessage.tsx` — wrap AI message content:**

```tsx
// ChatMessage.tsx — around the AI message content div

// Add state for copy feedback
const [copied, setCopied] = useState(false);

const handleCopy = useCallback(() => {
  copyToClipboard(messageContent).then((ok) => {
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  });
}, [messageContent]);

// In the render, wrap the AI content area:
{hasContent && (
  <div className={cn("relative flex items-end gap-0", !isUser && "group")}>
    <div className={cn("mt-4 overflow-hidden break-words text-sm font-normal leading-[150%]", ...)}>
      {/* existing content rendering */}
    </div>

    {/* Copy button — hover triggered, AI messages only */}
    {!isUser && hasContent && (
      <div className="absolute -top-1 right-0 flex opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground shadow-sm transition-colors hover:text-foreground"
          title="Copy message"
        >
          {copied ? (
            <>
              <Check size={12} className="text-success" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    )}
  </div>
)}
```

**Required imports to add:**

```tsx
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/app/utils/utils";
```

### Copy Button on Code Blocks (MarkdownContent.tsx)

**Modification in the `code` component renderer:**

```tsx
// MarkdownContent.tsx — in the code() component

// For code blocks (not inline), wrap with a copy button:
return !inline && match ? (
  <div className="group/code relative">
    <button
      onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ""))}
      className="absolute right-2 top-2 z-10 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover/code:opacity-100"
    >
      Copy
    </button>
    <SyntaxHighlighter
      style={oneDark}
      language={match[1]}
      // ... existing props
    >
      {String(children).replace(/\n$/, "")}
    </SyntaxHighlighter>
  </div>
) : (
  // inline code — no change
);
```

### Acceptance Criteria

- [ ] Copy button appears on hover over AI messages (not user messages)
- [ ] Clicking shows "Copied" feedback for 2 seconds
- [ ] Copy button on code blocks appears on hover
- [ ] Copy uses `navigator.clipboard` API
- [ ] No layout shift when copy button appears
- [ ] Copy button doesn't interfere with text selection

---

## Files Changed Summary

| File | Action | Changes |
|------|--------|---------|
| `src/app/components/ExecutionStatusBar.tsx` | **NEW** | Status bar component |
| `src/app/components/ChatInterface.tsx` | MODIFY | Add ExecutionStatusBar, streaming dots, pass `isStreaming` to ChatMessage |
| `src/app/components/ChatMessage.tsx` | MODIFY | Add copy button, accept `isStreaming` prop |
| `src/app/components/MarkdownContent.tsx` | MODIFY | Add `isStreaming` cursor, code block copy button |
| `src/app/utils/utils.ts` | MODIFY | Add `copyToClipboard()` utility |

## New Dependencies

None required. All functionality uses existing packages.
