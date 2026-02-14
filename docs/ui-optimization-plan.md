# Deep-Agents-UI Usability Optimization Plan

> Date: 2026-02-12
> Status: Proposal
> Scope: Frontend UX improvements for deep-agents-ui

## Table of Contents

- [Problem Diagnosis](#problem-diagnosis)
- [P0: Agent Execution Visibility](#p0-agent-execution-visibility)
- [P1: Information Architecture Restructure](#p1-information-architecture-restructure)
- [P2: Interaction Detail Improvements](#p2-interaction-detail-improvements)
- [P3: Experience Polish](#p3-experience-polish)
- [AG-UI Protocol Comparison Notes](#ag-ui-protocol-comparison-notes)
- [Implementation Roadmap](#implementation-roadmap)

---

## Problem Diagnosis

After a thorough code review of the entire codebase, three core usability issues were identified:

| Issue | Root Cause | Impact |
|-------|-----------|--------|
| Agent execution is opaque | User sees only "Running..." during long agent runs | Users feel anxious, don't know what's happening |
| Information architecture mismatch | Tasks & files are hidden inside the chat input area | Key context is invisible during agent work |
| Missing interaction fundamentals | No copy, no regenerate, weak streaming feedback | Below modern AI chat baseline expectations |

### Current Architecture Overview

```
src/
├── providers/
│   ├── ChatProvider.tsx      ← useChat hook wrapper (Context)
│   └── ClientProvider.tsx    ← LangGraph SDK Client (Context)
├── app/
│   ├── hooks/
│   │   ├── useChat.ts        ← Core: useStream() from @langchain/langgraph-sdk
│   │   └── useThreads.ts     ← Thread listing with SWR
│   ├── components/
│   │   ├── ChatInterface.tsx  ← Main chat view + input + tasks/files
│   │   ├── ChatMessage.tsx    ← Message rendering + tool calls + sub-agents
│   │   ├── ToolCallBox.tsx    ← Tool call display + GenUI + approval
│   │   ├── ToolApprovalInterrupt.tsx  ← Human-in-the-loop UI
│   │   ├── SubAgentIndicator.tsx      ← Sub-agent delegation display
│   │   ├── TasksFilesSidebar.tsx      ← Todo list + file grid
│   │   ├── FileViewDialog.tsx         ← File viewer modal
│   │   ├── MarkdownContent.tsx        ← Markdown renderer
│   │   ├── ThreadList.tsx             ← Thread history sidebar
│   │   └── ConfigDialog.tsx           ← Deployment configuration
│   ├── types/types.ts
│   └── page.tsx              ← Main page: layout + providers
├── components/ui/            ← Radix UI primitives
└── lib/
    ├── config.ts             ← localStorage config persistence
    └── utils.ts              ← cn() utility
```

### Communication Flow

```
deep-agents-ui
    │
    │  @langchain/langgraph-sdk (useStream hook)
    │  Direct LangGraph protocol — no intermediate layer
    ▼
LangGraph Server (langgraph dev)
    │
    ▼
Deep Agent (Python)
```

---

## P0: Agent Execution Visibility

> Priority: Highest — These changes are small in effort but dramatically improve the "is it working?" experience

### P0-1: Real-time Execution Status Bar

**Problem:** When the agent is running, the user only sees a disabled input box with "Running..." placeholder text. For deep agent runs that take 30+ seconds, this creates significant anxiety.

**Current code** (`ChatInterface.tsx`):
```tsx
placeholder={isLoading ? "Running..." : "Write your message..."}
```

**Solution:** Add a persistent status bar above the input area showing:
- Current execution step/node name
- Active tool call (if any)
- Elapsed time
- Animated indicator

**Proposed UI:**
```
┌─────────────────────────────────────────────┐
│ ● Running  │ Step: research_agent           │
│            │ Tool: web_search (12s)          │
└─────────────────────────────────────────────┘
│ [Input Box]                                  │
```

**Implementation approach:**
- Extract current node/step info from `stream` object metadata
- Create a new `<ExecutionStatusBar>` component
- Place it between the chat messages area and the input area
- Show only when `isLoading === true`
- Display elapsed time with `useEffect` + `setInterval`

**Files to modify:**
- `src/app/components/ChatInterface.tsx` — add status bar
- New: `src/app/components/ExecutionStatusBar.tsx`

### P0-2: Streaming Thought / In-progress Message Display

**Problem:** `ChatMessage.tsx` only renders messages after they are complete. During generation, the user sees nothing — no typing indicator, no partial content.

**Current code** (`ChatInterface.tsx:260`):
```tsx
{processedMessages.map((data, index) => (
  <ChatMessage key={data.message.id} message={data.message} ... />
))}
// No streaming/in-progress message display
```

**Solution:** Render the in-progress AI message at the bottom of the message list with a typing cursor animation.

**Implementation approach:**
- `stream.messages` from LangGraph SDK already includes the partial/streaming message
- Add a streaming message indicator after the last completed message
- Show a blinking cursor or pulsing dots when content is empty but loading
- Ensure `useStickToBottom` keeps the view scrolled to the streaming content

**Files to modify:**
- `src/app/components/ChatInterface.tsx` — add streaming message display after processedMessages

### P0-3: Copy Button on Messages

**Problem:** AI messages have no copy functionality. Users frequently need to copy code blocks or full responses.

**Current code** (`ChatMessage.tsx`): No action buttons on messages.

**Solution:** Add a hover-triggered action bar on AI messages with:
- Copy full message
- Copy code block (on individual code blocks in MarkdownContent)

**Implementation approach:**
- Wrap AI message content in a relative container
- Show action buttons on hover (absolute positioned, top-right)
- Use `navigator.clipboard.writeText()`
- Add copy button to `<SyntaxHighlighter>` blocks in `MarkdownContent.tsx`

**Files to modify:**
- `src/app/components/ChatMessage.tsx` — add hover action bar
- `src/app/components/MarkdownContent.tsx` — add copy button to code blocks

---

## P1: Information Architecture Restructure

> Priority: High — Structural changes that significantly improve workflow

### P1-1: Right-side Context Panel for Tasks & Files

**Problem:** Tasks and files are crammed inside the chat input area (`ChatInterface.tsx:296-501`). This is an unnatural location — metadata about agent work is below the conversation, hidden behind collapsible triggers.

**Current layout:**
```
┌──────────┬─────────────────────────┐
│ Threads  │  Chat Messages          │
│          │                         │
│          │  ┌───────────────────┐  │
│          │  │ Tasks/Files       │  │  ← Hidden inside input area
│          │  │ [Input Box]       │  │
│          │  └───────────────────┘  │
└──────────┴─────────────────────────┘
```

**Proposed layout:**
```
┌──────────┬─────────────────┬───────────┐
│ Threads  │  Chat Messages  │  Context  │
│          │                 │ ┌───────┐ │
│          │                 │ │ Tasks │ │
│          │                 │ │       │ │
│          │                 │ ├───────┤ │
│          │  [Input Box]    │ │ Files │ │
│          │                 │ │       │ │
└──────────┴─────────────────┴───────────┘
```

**Implementation approach:**
- Add a third `<ResizablePanel>` in `page.tsx`'s `<ResizablePanelGroup>`
- Move `TasksFilesSidebar` content into the new right panel
- Keep the input area clean — only textarea + send button
- Make the right panel collapsible (toggle button in header)
- Auto-show right panel when tasks or files first appear

**Files to modify:**
- `src/app/page.tsx` — add third ResizablePanel
- `src/app/components/ChatInterface.tsx` — remove embedded tasks/files UI
- New: `src/app/components/ContextPanel.tsx` — unified right panel

### P1-2: Interrupt Visibility Enhancement

**Problem:** When the agent hits an interrupt (needs human approval), the approval UI is embedded inside the last tool call box. Users can easily miss it, especially if the conversation is long or they've switched browser tabs.

**Current code** (`ToolCallBox.tsx:155-163`):
```tsx
) : actionRequest && onResume ? (
  <div className="mt-4">
    <ToolApprovalInterrupt ... />
  </div>
```

**Solution — three layers of notification:**

1. **In-chat highlight:** Add a pulsing border/glow around the interrupt tool call
2. **Banner above input:** Show a prominent banner: "⚠ Agent is waiting for your approval"
3. **Browser notification:** When the user is on another tab, send a browser `Notification`

**Implementation approach:**
- Add `ring-2 ring-orange-400 animate-pulse` to `ToolCallBox` when interrupt is active
- Add a sticky banner component in `ChatInterface` when `interrupt !== undefined`
- Use `document.hidden` + `Notification.requestPermission()` for background alerts
- Update `document.title` to flash: `"(!) Approval needed — Deep Agent UI"`

**Files to modify:**
- `src/app/components/ToolCallBox.tsx` — add visual highlight
- `src/app/components/ChatInterface.tsx` — add interrupt banner
- New: `src/app/hooks/useNotification.ts` — browser notification hook

### P1-3: Sub-Agent Real-time Progress

**Problem:** `SubAgentIndicator.tsx` is minimal — it only shows the sub-agent name with an expand/collapse toggle. No status indication, no progress, no duration.

**Current code** (`SubAgentIndicator.tsx`):
```tsx
// The entire component is just a name with chevron
<span className="font-sans text-[15px] font-bold">
  {subAgent.subAgentName}
</span>
```

**Solution:** Enhance with:
- Status icon (spinner → checkmark → error)
- Duration counter
- Collapsed summary line (e.g., "Completed in 8s" or "Running... 12s")
- Progress indication when available

**Implementation approach:**
- Add status-based icon rendering (similar to `ToolCallBox.statusIcon`)
- Track start time when sub-agent status becomes "active"
- Show elapsed time with real-time updates
- When collapsed, show a one-line summary instead of hiding all content

**Files to modify:**
- `src/app/components/SubAgentIndicator.tsx` — enhance with status/timing
- `src/app/types/types.ts` — add optional `startedAt` field to SubAgent type

---

## P2: Interaction Detail Improvements

> Priority: Medium — Quality-of-life improvements that elevate the experience

### P2-1: Message Action Buttons (Regenerate & Edit)

**Problem:** No way to regenerate an AI response or edit a sent user message.

**Solution:**
- Last AI message: show "Regenerate" button
- User messages: show "Edit" button on hover → inline edit → resend

**Implementation approach:**
- Regenerate: call `sendMessage()` with the same content, or use checkpoint to rewind
- Edit: replace user message content inline, then re-submit

**Files to modify:**
- `src/app/components/ChatMessage.tsx` — add action buttons
- `src/app/hooks/useChat.ts` — add `regenerateLastMessage()` method

### P2-2: Tool Call Visual Enhancement

**Problem:** Tool call arguments are displayed as raw JSON in expandable sections. For common tools (web_search, shell, file_write), this is harder to read than necessary.

**Current code** (`ToolCallBox.tsx:197`):
```tsx
<pre className="... font-mono text-xs">
  {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
</pre>
```

**Solution:** Provide friendly rendering for known tool types:

| Tool | Current Display | Improved Display |
|------|----------------|-----------------|
| `web_search` | `{"query": "..."}` | 🔍 Searching: "..." |
| `shell` | `{"command": "ls -la"}` | `$ ls -la` (terminal style) |
| `file_write` | `{"path": "...", "content": "..."}` | 📄 Writing: `path` (with content preview) |
| `task` (sub-agent) | Already handled | Already handled |
| Others | Raw JSON | Raw JSON (keep as-is) |

**Files to modify:**
- `src/app/components/ToolCallBox.tsx` — add tool-specific renderers
- New: `src/app/components/tool-renderers/` — directory for tool-specific components

### P2-3: File Viewer as Inline Panel (Replace Modal)

**Problem:** `FileViewDialog` is a `60vw × 80vh` modal dialog that blocks the chat completely. Users can't reference the chat while viewing files.

**Current code** (`FileViewDialog.tsx:141`):
```tsx
<DialogContent className="flex h-[80vh] max-h-[80vh] min-w-[60vw] flex-col p-6">
```

**Solution:** When the right Context Panel (P1-1) is implemented, file viewing should happen inside that panel instead of a modal. The modal can remain as a fallback for full-screen viewing.

**Implementation approach:**
- Add a `FileViewer` component (non-modal version of FileViewDialog)
- Embed it in the Context Panel when a file is selected
- Keep the modal accessible via a "maximize" button for detailed editing

**Files to modify:**
- New: `src/app/components/FileViewer.tsx` — inline file viewer
- `src/app/components/TasksFilesSidebar.tsx` — change file click to open inline
- `src/app/components/FileViewDialog.tsx` — keep as full-screen option

### P2-4: Connection Status Indicator

**Problem:** No feedback on whether the LangGraph deployment is reachable. Config is saved to localStorage blindly.

**Current code** (`lib/config.ts`):
```typescript
export function saveConfig(config: StandaloneConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}
```

**Solution:**
- Validate connection before saving config (ping the deployment URL)
- Show connection status in header (green dot / red dot)
- Auto-detect disconnection and show reconnection UI

**Files to modify:**
- `src/lib/config.ts` — add connection validation
- `src/app/components/ConfigDialog.tsx` — add connection test button
- `src/app/page.tsx` — add status indicator to header

---

## P3: Experience Polish

> Priority: Lower — Nice-to-have improvements

### P3-1: File Diff View

**Observation:** The `diff` package (v8.0.2) is already in `package.json` dependencies but appears unused in any component.

**Solution:** When a file is updated by the agent, show a diff view highlighting what changed (additions in green, deletions in red).

**Files to modify:**
- `src/app/components/FileViewDialog.tsx` — add diff tab
- New: `src/app/components/DiffViewer.tsx`

### P3-2: Dark/Light Theme Toggle

**Observation:** Some components already use `dark:` Tailwind classes (e.g., `ToolApprovalInterrupt.tsx` has `dark:bg-green-600`), but there's no theme toggle UI.

**Solution:** Add a theme toggle button in the header using `next-themes` or a simple CSS class toggle.

**Files to modify:**
- `src/app/layout.tsx` — add theme provider
- `src/app/page.tsx` — add toggle button to header
- `src/app/globals.css` — ensure dark theme variables are defined

### P3-3: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + K` | New thread |
| `Cmd/Ctrl + /` | Focus input |
| `Escape` | Stop generation / close dialogs |
| `Cmd/Ctrl + Shift + C` | Copy last AI message |

**Files to modify:**
- New: `src/app/hooks/useKeyboardShortcuts.ts`
- `src/app/page.tsx` — register shortcuts

### P3-4: Thread Search & Management

**Problem:** `ThreadList.tsx` supports status filtering but no text search, no rename, no delete.

**Solution:**
- Add search input at top of thread list
- Right-click / long-press context menu: Rename, Delete, Export
- Thread auto-naming from first user message

**Files to modify:**
- `src/app/components/ThreadList.tsx` — add search + context menu
- `src/app/hooks/useThreads.ts` — add search/delete/rename API calls

### P3-5: Input Enhancements

- **File drag & drop:** Allow dropping files onto the input area
- **Shift+Enter hint:** Show subtle hint text for multiline input
- **Interrupt-aware input:** When interrupt is active, show inline message in input area: "Agent is waiting for approval above ↑"

**Files to modify:**
- `src/app/components/ChatInterface.tsx` — enhance input area

---

## AG-UI Protocol Comparison Notes

A thorough comparison with the [AG-UI Protocol](https://github.com/ag-ui-protocol/ag-ui) was conducted. Key findings:

### Why We Don't Switch to AG-UI

1. **AG-UI is a protocol, not a UI.** Switching would require adopting CopilotKit as the frontend client, then rebuilding all our custom features on top of it.

2. **Our UI is natively paired with LangGraph.** We use `@langchain/langgraph-sdk` directly via `useStream()`, which gives us zero-overhead access to LangGraph state (messages, todos, files, interrupts, checkpoints). AG-UI would add an indirection layer.

3. **Our specialized features don't exist in AG-UI's ecosystem:**
   - Sub-agent delegation visualization
   - Debug step-by-step mode (interruptBefore/After)
   - File state management + inline viewer
   - Checkpoint history rollback

### Patterns Worth Borrowing from AG-UI

| AG-UI Pattern | Our Adaptation |
|---------------|---------------|
| `REASONING_*` events (7 event types for chain-of-thought) | Implement streaming thought display (P0-2) |
| `ACTIVITY_SNAPSHOT/DELTA` events (progress indicators) | Implement execution status bar (P0-1) |
| JSON Patch (RFC 6902) for state deltas | Consider for optimizing large state syncs |
| `STEP_STARTED/FINISHED` events | Extract step info for status bar |
| Browser-tab-aware notifications | Implement interrupt notifications (P1-2) |

### When to Reconsider AG-UI

- If we need to support multiple agent frameworks beyond LangGraph
- If we build an open agent platform where third parties bring their own agents
- If AG-UI develops a richer client library that supports our use cases natively

---

## Implementation Roadmap

### Phase 1: Foundation (P0 items)

| # | Task | Est. Effort | Files |
|---|------|------------|-------|
| 1 | Execution status bar | 1-2 days | `ExecutionStatusBar.tsx`, `ChatInterface.tsx` |
| 2 | Streaming message display | 1 day | `ChatInterface.tsx` |
| 3 | Message copy button | 0.5 day | `ChatMessage.tsx`, `MarkdownContent.tsx` |

### Phase 2: Structure (P1 items)

| # | Task | Est. Effort | Files |
|---|------|------------|-------|
| 4 | Right-side context panel | 2-3 days | `page.tsx`, `ContextPanel.tsx`, `ChatInterface.tsx` |
| 5 | Interrupt visibility enhancement | 1 day | `ToolCallBox.tsx`, `ChatInterface.tsx`, `useNotification.ts` |
| 6 | Sub-agent progress indicator | 1 day | `SubAgentIndicator.tsx` |

### Phase 3: Polish (P2 items)

| # | Task | Est. Effort | Files |
|---|------|------------|-------|
| 7 | Regenerate & edit messages | 1-2 days | `ChatMessage.tsx`, `useChat.ts` |
| 8 | Tool call visual enhancement | 1-2 days | `ToolCallBox.tsx`, `tool-renderers/` |
| 9 | Inline file viewer | 2 days | `FileViewer.tsx`, `ContextPanel.tsx` |
| 10 | Connection status indicator | 0.5 day | `config.ts`, `ConfigDialog.tsx`, `page.tsx` |

### Phase 4: Extras (P3 items)

| # | Task | Est. Effort | Files |
|---|------|------------|-------|
| 11 | File diff view | 1 day | `DiffViewer.tsx`, `FileViewDialog.tsx` |
| 12 | Dark/light theme | 0.5 day | `layout.tsx`, `globals.css` |
| 13 | Keyboard shortcuts | 0.5 day | `useKeyboardShortcuts.ts` |
| 14 | Thread search & management | 1-2 days | `ThreadList.tsx`, `useThreads.ts` |
| 15 | Input enhancements | 1 day | `ChatInterface.tsx` |

**Total estimated effort: ~15-20 days**

### Suggested Sprint Plan

- **Sprint 1 (Week 1):** Phase 1 (P0) — immediate perception improvement
- **Sprint 2 (Week 2-3):** Phase 2 (P1) — structural upgrade
- **Sprint 3 (Week 3-4):** Phase 3 (P2) — interaction quality
- **Ongoing:** Phase 4 (P3) — as time permits
