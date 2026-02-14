# Phase 3: Interaction Enhancement (P2)

> Priority: Medium
> Estimated effort: 5-6 days
> Dependencies: Task 3.3 (Inline File Viewer) requires Phase 2 Task 2.1 (Context Panel) to be completed
> Branch: `feat/phase3-interaction-enhancement`

## Goal

Elevate the chat interaction to modern AI chat standards: message actions, smarter tool call rendering, inline file viewing, and connection health feedback.

---

## Task 3.1: Message Regeneration & Edit

### Problem

Users cannot regenerate an AI response or edit a sent message and re-submit.

### 3.1.1: Regenerate Last AI Message

**Add to `useChat.ts` — new method:**

```typescript
const regenerateLastMessage = useCallback(() => {
  // Find the last human message to re-submit
  const lastHumanIdx = [...stream.messages].reverse().findIndex(m => m.type === "human");
  if (lastHumanIdx === -1) return;

  const actualIdx = stream.messages.length - 1 - lastHumanIdx;
  const lastHuman = stream.messages[actualIdx];
  const content = typeof lastHuman.content === "string"
    ? lastHuman.content
    : "";

  if (!content) return;

  // Re-submit the same message
  const newMessage: Message = { id: uuidv4(), type: "human", content };
  stream.submit(
    { messages: [newMessage] },
    {
      optimisticValues: (prev) => ({
        messages: [...(prev.messages ?? []), newMessage],
      }),
      config: { ...(activeAssistant?.config ?? {}), recursion_limit: 200 },
    }
  );
  onHistoryRevalidate?.();
}, [stream, activeAssistant?.config, onHistoryRevalidate]);
```

**Return it from the hook:**

```typescript
return {
  // ... existing
  regenerateLastMessage,  // NEW
};
```

**UI in `ChatMessage.tsx` — show on last AI message:**

Add prop `isLastAiMessage?: boolean` and `onRegenerate?: () => void` to `ChatMessageProps`.

```tsx
// At the bottom of the AI message content, when isLastAiMessage && !isLoading:
{!isUser && isLastAiMessage && !isLoading && (
  <div className="mt-2 flex gap-1">
    <button
      onClick={onRegenerate}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <RefreshCw size={12} />
      Regenerate
    </button>
  </div>
)}
```

**Pass from `ChatInterface.tsx`:**

```tsx
const { regenerateLastMessage } = useChatContext();

// In processedMessages.map():
<ChatMessage
  ...
  isLastAiMessage={isLastMessage && data.message.type === "ai"}
  onRegenerate={regenerateLastMessage}
/>
```

### 3.1.2: Edit User Message

**UI in `ChatMessage.tsx` — add edit button on user messages:**

```tsx
// New state inside ChatMessage:
const [isEditing, setIsEditing] = useState(false);
const [editContent, setEditContent] = useState(messageContent);

// Add prop: onEditAndResend?: (newContent: string) => void

// Show edit button on hover for user messages:
{isUser && !isLoading && (
  <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
    <button
      onClick={() => { setIsEditing(true); setEditContent(messageContent); }}
      className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      title="Edit message"
    >
      <Pencil size={12} />
    </button>
  </div>
)}

// Editing UI (replaces message content when editing):
{isUser && isEditing ? (
  <div className="mt-4 w-full max-w-[70%]">
    <textarea
      value={editContent}
      onChange={(e) => setEditContent(e.target.value)}
      className="w-full rounded-lg border border-border bg-background p-3 text-sm"
      rows={3}
      autoFocus
    />
    <div className="mt-2 flex justify-end gap-2">
      <button
        onClick={() => setIsEditing(false)}
        className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
      >
        Cancel
      </button>
      <Button
        size="sm"
        onClick={() => {
          onEditAndResend?.(editContent);
          setIsEditing(false);
        }}
        disabled={!editContent.trim()}
      >
        Send
      </Button>
    </div>
  </div>
) : (
  // existing user message rendering
)}
```

**`onEditAndResend` in `ChatInterface.tsx`:**

```tsx
const handleEditAndResend = useCallback((newContent: string) => {
  sendMessage(newContent);
}, [sendMessage]);

// Pass to ChatMessage:
<ChatMessage
  ...
  onEditAndResend={data.message.type === "human" ? handleEditAndResend : undefined}
/>
```

### Acceptance Criteria

- [ ] "Regenerate" button appears below the last AI message when not loading
- [ ] Clicking regenerate re-sends the last human message
- [ ] Edit button appears on hover over user messages
- [ ] Clicking edit shows inline textarea with current content
- [ ] "Send" re-submits the edited content as a new message
- [ ] "Cancel" restores original display

---

## Task 3.2: Tool Call Visual Enhancement

### Problem

All tool arguments display as raw JSON. For common tools, a friendlier format improves readability.

### Architecture

Create a registry of tool-specific renderers that fall back to JSON for unknown tools.

**New file: `src/app/components/tool-renderers/index.tsx`**

```tsx
"use client";

import React from "react";
import { Search, Terminal, FileEdit, Globe, HelpCircle } from "lucide-react";

interface ToolRendererProps {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Renders tool call arguments in a human-friendly format.
 * Falls back to JSON for unrecognized tools.
 */
export function ToolArgsRenderer({ name, args }: ToolRendererProps) {
  const renderer = TOOL_RENDERERS[name];
  if (renderer) {
    return renderer(args);
  }
  return <DefaultRenderer args={args} />;
}

// --- Registry ---

const TOOL_RENDERERS: Record<string, (args: Record<string, unknown>) => React.ReactNode> = {
  web_search: (args) => (
    <div className="flex items-center gap-2 py-1">
      <Search size={14} className="flex-shrink-0 text-blue-500" />
      <span className="text-sm">
        Searching: <span className="font-medium">"{String(args.query || args.search_query || "")}"</span>
      </span>
    </div>
  ),

  shell: (args) => (
    <div className="rounded-md bg-zinc-900 p-3">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Terminal size={12} />
        <span>Shell Command</span>
      </div>
      <pre className="mt-1 font-mono text-sm text-green-400">
        $ {String(args.command || args.cmd || "")}
      </pre>
    </div>
  ),

  bash: (args) => TOOL_RENDERERS.shell(args),

  file_write: (args) => (
    <div className="space-y-1">
      <div className="flex items-center gap-2 py-1">
        <FileEdit size={14} className="flex-shrink-0 text-amber-500" />
        <span className="text-sm">
          Writing to: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{String(args.path || args.filename || args.file_path || "")}</code>
        </span>
      </div>
      {args.content && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Show content ({String(args.content).length} chars)
          </summary>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 font-mono">
            {String(args.content).slice(0, 2000)}
            {String(args.content).length > 2000 && "\n... (truncated)"}
          </pre>
        </details>
      )}
    </div>
  ),

  file_read: (args) => (
    <div className="flex items-center gap-2 py-1">
      <FileEdit size={14} className="flex-shrink-0 text-blue-500" />
      <span className="text-sm">
        Reading: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{String(args.path || args.filename || args.file_path || "")}</code>
      </span>
    </div>
  ),

  browse: (args) => (
    <div className="flex items-center gap-2 py-1">
      <Globe size={14} className="flex-shrink-0 text-purple-500" />
      <span className="text-sm">
        Browsing: <a href={String(args.url || "")} target="_blank" rel="noopener noreferrer" className="text-primary underline">{String(args.url || "")}</a>
      </span>
    </div>
  ),
};

function DefaultRenderer({ args }: { args: Record<string, unknown> }) {
  const entries = Object.entries(args);

  // For simple single-value args, render inline
  if (entries.length === 1) {
    const [key, value] = entries[0];
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    if (strValue.length < 100) {
      return (
        <div className="flex items-center gap-2 py-1 text-sm">
          <span className="font-mono text-xs text-muted-foreground">{key}:</span>
          <span className="truncate">{strValue}</span>
        </div>
      );
    }
  }

  // Fallback: structured JSON
  return (
    <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-foreground">
      {JSON.stringify(args, null, 2)}
    </pre>
  );
}
```

### Integration in `ToolCallBox.tsx`

Replace the raw JSON argument rendering with the new renderer:

```tsx
// ToolCallBox.tsx — replace the args rendering block
import { ToolArgsRenderer } from "@/app/components/tool-renderers";

// Replace the existing Object.entries(args).map() block with:
{Object.keys(args).length > 0 && (
  <div className="mt-4">
    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Arguments
    </h4>
    <ToolArgsRenderer name={name} args={args} />
  </div>
)}
```

### Extending for New Tools

To add a new tool renderer, add an entry to `TOOL_RENDERERS` in the index file. The pattern is:

```typescript
tool_name: (args) => <JSX rendering />,
```

### Acceptance Criteria

- [ ] `web_search` shows: 🔍 Searching: "query text"
- [ ] `shell`/`bash` shows terminal-style command display
- [ ] `file_write` shows filename + collapsible content preview
- [ ] `file_read` shows filename with read icon
- [ ] `browse` shows URL as clickable link
- [ ] Unknown tools fall back to structured JSON display
- [ ] Single-value simple args display inline (not JSON)
- [ ] Registry is easily extensible

---

## Task 3.3: Inline File Viewer in Context Panel

> **Prerequisite:** Phase 2 Task 2.1 (Context Panel) must be completed first.

### Problem

`FileViewDialog` is an 80vh modal that blocks the conversation. Users need to see files while chatting.

### Design

When a file is clicked in the Context Panel's Files tab, the file content renders inside the panel itself. The modal dialog is retained as an "expand to full screen" option.

### Modification in `ContextPanel.tsx`

Add a `viewingFile` state and render the file content inline:

```tsx
// Inside ContextPanel component:
const [viewingFile, setViewingFile] = useState<FileItem | null>(null);

// Replace the FilesTab section with:
{activeTab === "files" && !viewingFile && (
  <FilesTab files={files} onFileSelect={setViewingFile} />
)}

{activeTab === "files" && viewingFile && (
  <InlineFileViewer
    file={viewingFile}
    onBack={() => setViewingFile(null)}
    onExpand={() => {
      setSelectedFile(viewingFile);  // Opens the full-screen dialog
    }}
    onSave={async (content) => {
      await handleSaveFile(viewingFile.path, content);
      setViewingFile({ ...viewingFile, content });
    }}
    editDisabled={isLoading === true || interrupt !== undefined}
  />
)}
```

**New sub-component `InlineFileViewer` (inside `ContextPanel.tsx` or separate file):**

```tsx
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

function InlineFileViewer({
  file,
  onBack,
  onExpand,
  onSave,
  editDisabled,
}: {
  file: FileItem;
  onBack: () => void;
  onExpand: () => void;
  onSave: (content: string) => Promise<void>;
  editDisabled: boolean;
}) {
  const ext = file.path.split(".").pop()?.toLowerCase() || "";
  const isMarkdown = ext === "md" || ext === "markdown";

  // Language mapping (reuse from FileViewDialog or extract to shared util)
  const LANGUAGE_MAP: Record<string, string> = {
    js: "javascript", ts: "typescript", py: "python",
    json: "json", yaml: "yaml", yml: "yaml",
    sh: "bash", md: "markdown", html: "html", css: "css",
    // ... same as FileViewDialog
  };
  const language = LANGUAGE_MAP[ext] || "text";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} />
        </button>
        <span className="flex-1 truncate text-xs font-medium">{file.path}</span>
        <button onClick={onExpand} className="text-muted-foreground hover:text-foreground" title="Open full screen">
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {isMarkdown ? (
            <MarkdownContent content={file.content} />
          ) : (
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{ margin: 0, borderRadius: "0.375rem", fontSize: "0.75rem" }}
              showLineNumbers
              wrapLines
            >
              {file.content}
            </SyntaxHighlighter>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
```

### Acceptance Criteria

- [ ] Clicking a file in the Context Panel shows content inline (no modal)
- [ ] Back button returns to the file list
- [ ] "Expand" button opens the existing full-screen FileViewDialog
- [ ] Syntax highlighting works for supported languages
- [ ] Markdown files render as formatted markdown
- [ ] User can chat while viewing the file

---

## Task 3.4: Connection Status Indicator

### Problem

No feedback on whether the LangGraph deployment is reachable. Users configure URL blindly.

### 3.4.1: Connection Test in ConfigDialog

**Modify `ConfigDialog.tsx`:**

```tsx
// Add state:
const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
const [connectionError, setConnectionError] = useState("");

// Add test function:
const testConnection = async () => {
  setConnectionStatus("testing");
  setConnectionError("");
  try {
    const testClient = new Client({ apiUrl: deploymentUrl });
    await testClient.assistants.search({ limit: 1 });
    setConnectionStatus("ok");
  } catch (e) {
    setConnectionStatus("error");
    setConnectionError(e instanceof Error ? e.message : "Connection failed");
  }
};

// Add to UI — after the Deployment URL input:
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm" onClick={testConnection} disabled={!deploymentUrl || connectionStatus === "testing"}>
    {connectionStatus === "testing" ? (
      <><Loader2 size={14} className="mr-1 animate-spin" /> Testing...</>
    ) : (
      "Test Connection"
    )}
  </Button>
  {connectionStatus === "ok" && (
    <span className="flex items-center gap-1 text-xs text-green-600">
      <CheckCircle size={12} /> Connected
    </span>
  )}
  {connectionStatus === "error" && (
    <span className="flex items-center gap-1 text-xs text-red-600" title={connectionError}>
      <XCircle size={12} /> Failed
    </span>
  )}
</div>
```

**Required import:**

```tsx
import { Client } from "@langchain/langgraph-sdk";
```

### 3.4.2: Header Connection Indicator

**In `page.tsx` header — add status dot next to "Assistant: {id}":**

```tsx
<div className="flex items-center gap-2 text-sm text-muted-foreground">
  <span className={cn(
    "inline-block h-2 w-2 rounded-full",
    assistant ? "bg-green-500" : "bg-red-500"
  )} />
  <span className="font-medium">Assistant:</span> {config.assistantId}
</div>
```

### Acceptance Criteria

- [ ] "Test Connection" button in ConfigDialog validates the deployment URL
- [ ] Shows green "Connected" on success
- [ ] Shows red "Failed" with error message on failure
- [ ] Header shows a green/red dot indicating connection state
- [ ] Connection test uses the actual LangGraph SDK client

---

## Files Changed Summary

| File | Action | Changes |
|------|--------|---------|
| `src/app/components/tool-renderers/index.tsx` | **NEW** | Tool-specific argument renderers |
| `src/app/hooks/useChat.ts` | MODIFY | Add `regenerateLastMessage()` |
| `src/app/components/ChatMessage.tsx` | MODIFY | Add regenerate button, edit UI, pass new props |
| `src/app/components/ChatInterface.tsx` | MODIFY | Wire regenerate/edit callbacks |
| `src/app/components/ToolCallBox.tsx` | MODIFY | Use `ToolArgsRenderer` |
| `src/app/components/ContextPanel.tsx` | MODIFY | Add inline file viewer |
| `src/app/components/ConfigDialog.tsx` | MODIFY | Add connection test |
| `src/app/page.tsx` | MODIFY | Add header connection indicator |

## New Dependencies

None required.
