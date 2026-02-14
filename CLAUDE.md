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

Node version: 20 (see `.nvmrc`).

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
        ├── SummarizationMiddleware
        └── other middleware...
    ← Streams back StateType { messages, todos, files, email?, ui? }
  → React real-time UI updates
```

The UI `StateType` directly mirrors the backend agent state schema. `files` is `Record<string, string>` of file contents, `todos` is a task list, and `ui` supports GenUI custom component rendering.

### Backend Agent (deepagents repo)

The backend uses `create_deep_agent()` (`libs/deepagents/deepagents/graph.py`) which builds a LangGraph `CompiledStateGraph` with:
- **Default model**: Claude Sonnet 4.5
- **Middleware stack** (ordered): TodoList → Memory → Skills → Filesystem → SubAgent → Summarization → PromptCaching → PatchToolCalls
- **Built-in tools**: `write_todos`, `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`, `execute`, `task`
- **Sub-agent mechanism**: The `task` tool spawns ephemeral sub-agents with isolated context. Sub-agents return a single result message. Multiple sub-agents can run in parallel.

### State Management

- **LangGraph streaming state**: `useStream` from `@langchain/langgraph-sdk/react` is the core primitive. The `useChat` hook (`src/app/hooks/useChat.ts`) wraps it and exposes `sendMessage`, `runSingleStep`, `continueStream`, `resumeInterrupt`, `markCurrentThreadAsResolved`, `stopStream`.
- **Graph state shape** (`StateType`): `{ messages, todos, files, email?, ui? }` — this mirrors the LangGraph server state.
- **URL query state**: `nuqs` manages `threadId`, `assistantId`, and `sidebar` as URL search params.
- **Thread listing**: `useThreads` (`src/app/hooks/useThreads.ts`) uses SWR infinite pagination via `client.threads.search()`.
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

- `src/app/components/` — App-specific components (ChatInterface, ChatMessage, ToolCallBox, ThreadList, etc.)
- `src/app/hooks/` — `useChat` (core streaming logic) and `useThreads` (thread pagination)
- `src/app/types/` — TypeScript interfaces (ToolCall, SubAgent, TodoItem, InterruptData, etc.)
- `src/app/utils/` — Message content extraction and string formatting helpers
- `src/providers/` — React context providers (ClientProvider, ChatProvider)
- `src/components/ui/` — shadcn/ui components (Radix UI primitives)
- `src/lib/` — Shared utilities (`cn()`, config persistence)

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
│       │       │   └── LoadExternalComponent — GenUI custom components
│       │       └── SubAgentIndicator × N — expandable sub-agent display
│       ├── TasksFilesSidebar — inline todo + file panel
│       │   └── FileViewDialog — file content viewer
│       └── Input area + Send/Stop buttons
```

### Tool Call Rendering Pipeline

AI messages flow through this pipeline:
1. `message.tool_calls` extracted, matched with `ToolMessage` results by `tool_call_id`
2. Tool calls with `name === "task"` → rendered as `SubAgentIndicator` (special sub-agent UI)
3. Other tool calls → rendered as `ToolCallBox`:
   - If GenUI `ui` component exists → `LoadExternalComponent` from `@langchain/langgraph-sdk/react-ui`
   - Otherwise → collapsible arguments/result JSON display
4. Status icons: pending (spinner) / completed (✓) / error (✗) / interrupted (⏸)

### UI Component Library

Uses shadcn/ui with Radix UI primitives. Component config in `components.json` (style: default, base color: slate). Icons from `lucide-react`.

## Code Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **All app components are client components** (`"use client"` directive)
- **ESLint allows `any`** (`@typescript-eslint/no-explicit-any` is disabled)
- **Unused vars**: Must be prefixed with `_` (enforced by ESLint)
- **Prettier**: Uses `prettier-plugin-tailwindcss` for class sorting
- **Tailwind**: Custom theme in `tailwind.config.mjs` with Radix UI colors and custom font sizes. Uses plugins: container-queries, typography, forms, animate, headlessui.

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

## Environment Variables

```
NEXT_PUBLIC_LANGSMITH_API_KEY="lsv2_..."  # Optional, for LangSmith-protected deployments
```

UI config dialog settings take precedence over env vars.

## Migration Context

The UI was ported from the LangSmith smith-frontend AgentBuilder chat interface. See `MIGRATION_ANALYSIS.md` for the full migration plan and feature parity matrix. Key decisions preserved: Next.js (vs Vite), React 19, user-configurable deployment URL/assistant ID (vs env-only), shadcn/ui component library.
