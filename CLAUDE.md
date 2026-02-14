# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Deep Agents UI is a Next.js chat interface for interacting with [deepagents](https://github.com/langchain-ai/deepagents) — LangGraph-based AI agents with planning, computer access, and sub-agent delegation. It connects to a LangGraph server via `@langchain/langgraph-sdk` and renders streaming agent execution with tool calls, file viewing, todos, and human-in-the-loop interrupts.

## Commands

```bash
yarn install          # Install dependencies (yarn 1.22.22)
yarn dev              # Dev server with Turbopack (http://localhost:3000)
yarn build            # Production build
yarn lint             # ESLint
yarn lint:fix         # ESLint with auto-fix
yarn format:check     # Prettier check
yarn format           # Prettier auto-format
```

Node version: 20 (see `.nvmrc`). Use `npm run <script>` if yarn is unavailable.

No test framework is configured.

## Architecture

### End-to-End Data Flow

```
User Input → ChatInterface → useChat.sendMessage()
  → useStream (LangGraph SDK, WebSocket persistent connection)
    → LangGraph Server (langgraph dev :2024)
      → create_deep_agent() graph (deepagents backend)
        ├── TodoListMiddleware     → todos state
        ├── FilesystemMiddleware   → files state (ls/read/write/edit/glob/grep/execute)
        ├── SubAgentMiddleware     → task tool, sub-agent delegation
        └── other middleware...
    ← Streams back StateType { messages, todos, files, email?, ui? }
  → React real-time UI updates
```

The UI `StateType` directly mirrors the backend agent state schema. `files` is `Record<string, string>` of file contents, `todos` is a task list, and `ui` supports GenUI custom component rendering.

### State Management

- **LangGraph streaming state**: `useStream` from `@langchain/langgraph-sdk/react` is the core primitive. The `useChat` hook wraps it and exposes `sendMessage`, `runSingleStep`, `continueStream`, `resumeInterrupt`, `markCurrentThreadAsResolved`, `stopStream`, `regenerateLastMessage`.
- **Graph state shape** (`StateType`): `{ messages, todos, files, email?, ui? }` — this mirrors the LangGraph server state.
- **URL query state**: `nuqs` manages `threadId`, `assistantId`, `sidebar`, and `context` as URL search params.
- **Thread listing**: `useThreads` uses SWR infinite pagination via `client.threads.search()`.
- **Configuration**: Stored in `localStorage` under key `"deep-agent-config"` (`src/lib/config.ts`). Holds `deploymentUrl`, `assistantId`, `langsmithApiKey`.

### Provider Hierarchy

```
NuqsAdapter (URL state)
  → ClientProvider (LangGraph SDK Client with apiUrl + apiKey)
    → ChatProvider (useChat hook result, wraps useStream)
      → Page components
```

Providers live in `src/providers/`. The main page (`src/app/page.tsx`) manages config state and shows a `ConfigDialog` if no config exists.

### Key Directories

- `src/app/components/` — App-specific components (ChatInterface, ChatMessage, ToolCallBox, ContextPanel, ThreadList, etc.)
- `src/app/components/tool-renderers/` — Tool-specific argument renderers (registry pattern)
- `src/app/hooks/` — `useChat` (core streaming logic) and `useThreads` (thread pagination)
- `src/app/types/` — TypeScript interfaces (ToolCall, SubAgent, TodoItem, FileMetadata, etc.)
- `src/app/utils/` — Message content extraction and string formatting helpers
- `src/providers/` — React context providers (ClientProvider, ChatProvider)
- `src/components/ui/` — shadcn/ui components (Radix UI primitives)
- `src/lib/` — Shared utilities (`cn()`, config persistence)
- `docs/implementation/` — Detailed implementation specs for UI optimization phases

### Component Relationships

```
page.tsx (entry point)
├── ConfigDialog — first-time setup of deploymentUrl + assistantId
├── ResizablePanelGroup (horizontal split)
│   ├── ThreadList (left, collapsible)
│   │   └── ThreadItem × N (grouped: Today/Yesterday/Week/Older)
│   └── ChatInterface (right, core)
│       ├── Message area (useStickToBottom auto-scroll)
│       │   └── ChatMessage × N
│       │       ├── MarkdownContent — user/AI text rendering
│       │       ├── ToolCallBox × N — tool call display
│       │       │   ├── ToolArgsRenderer — human-friendly tool args
│       │       │   └── LoadExternalComponent — GenUI custom components
│       │       └── SubAgentIndicator × N — expandable sub-agent display
│       ├── ContextPanel (right sidebar, toggleable)
│       │   ├── TasksTab — todo list with status icons
│       │   └── FilesTab — file list with sorting, InlineFileViewer
│       └── Input area + Send/Stop buttons
```

### Tool Call Rendering Pipeline

AI messages flow through this pipeline:
1. `message.tool_calls` extracted, matched with `ToolMessage` results by `tool_call_id`
2. Tool calls with `name === "task"` → rendered as `SubAgentIndicator` (special sub-agent UI)
3. Other tool calls → rendered as `ToolCallBox`:
   - `ToolArgsRenderer` (`tool-renderers/index.tsx`) provides human-friendly display per tool type
   - If GenUI `ui` component exists → `LoadExternalComponent` from `@langchain/langgraph-sdk/react-ui`
   - Otherwise → collapsible arguments/result JSON display
4. Status icons: pending (spinner) / completed (✓) / error (✗) / interrupted (⏸)

To add a new tool renderer, add an entry to `TOOL_RENDERERS` in `src/app/components/tool-renderers/index.tsx`.

### UI Component Library

Uses shadcn/ui with Radix UI primitives. Component config in `components.json` (style: default, base color: slate). Icons from `lucide-react`.

## Code Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **All app components are client components** (`"use client"` directive)
- **React.memo**: Wrap performance-sensitive components with `React.memo` and set `displayName`
- **ESLint allows `any`** (`@typescript-eslint/no-explicit-any` is disabled)
- **Unused vars**: Must be prefixed with `_` (enforced by ESLint)
- **Prettier**: Uses `prettier-plugin-tailwindcss` for class sorting
- **Tailwind**: Custom theme in `tailwind.config.mjs` with Radix UI colors and custom font sizes
- **No Redux/Zustand** — React Context + hooks exclusively
- **Styling tokens**: `text-primary`, `text-muted-foreground`, `bg-background`, `bg-accent`, `border-border`, `text-success`, `text-warning`, `text-destructive`

## Debug Mode

The app supports step-by-step agent execution (Debug Mode) where each tool call can be individually inspected and re-run:
- **interruptBefore**: Pauses before tool execution (normal tool call debugging)
- **interruptAfter**: Pauses after tool execution (for sub-agent re-runs)
- Can restart from any AI message (`onRestartFromAIMessage`) or sub-task (`onRestartFromSubTask`)
- Uses LangGraph checkpoint system for state save/restore

## Human-in-the-Loop (HITL)

The backend triggers interrupts via `HumanInTheLoopMiddleware` + `interrupt_on` config. The UI handles them:
- `stream.interrupt` detects interrupt state
- `ToolCallBox` auto-expands interrupted tool calls
- `resumeInterrupt(value)` sends `Command({ resume: value })` to resume execution
- `markCurrentThreadAsResolved()` sends `Command({ goto: "__end__" })` to end the thread
- Interrupt banner appears when agent needs approval; input is disabled during interrupts

## Environment Variables

```
NEXT_PUBLIC_LANGSMITH_API_KEY="lsv2_..."  # Optional, for LangSmith-protected deployments
```

UI config dialog settings take precedence over env vars.

## Implementation Docs

Detailed implementation specs are in `docs/implementation/`:
- `00-overview.md` — Architecture context, conventions, branch strategy
- `01-phase1-execution-visibility.md` — Status bar, streaming display
- `02-phase2-layout-restructure.md` — Context panel, interrupt UX
- `03-phase3-interaction-enhancement.md` — Message actions, tool renderers, inline file viewer
- `04-phase4-experience-polish.md` — Input enhancements (diff view, theme, shortcuts deferred)
