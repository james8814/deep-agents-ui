# Implementation Guide — Overview

> This document serves as the entry point for the deep-agents-ui optimization project.
> Each phase has its own detailed spec. Developers should read this overview first, then proceed to the relevant phase document.

## Document Index

| Document | Content | Priority |
|----------|---------|----------|
| [00-overview.md](./00-overview.md) | This file — conventions, architecture, dependencies |
| [01-phase1-execution-visibility.md](./01-phase1-execution-visibility.md) | P0: Status bar, streaming display, copy button |
| [02-phase2-layout-restructure.md](./02-phase2-layout-restructure.md) | P1: Context panel, interrupt UX, sub-agent progress |
| [03-phase3-interaction-enhancement.md](./03-phase3-interaction-enhancement.md) | P2: Message actions, tool renderers, inline file viewer, connection status |
| [04-phase4-experience-polish.md](./04-phase4-experience-polish.md) | P3: Diff view, theme, shortcuts, thread search, input enhancements |

## Architecture Context

### Provider Hierarchy

```
RootLayout (layout.tsx)
  └─ NuqsAdapter (URL query state)
      └─ HomePageContent (page.tsx)
          └─ ClientProvider (LangGraph SDK Client)
              └─ HomePageInner
                  ├─ ThreadList
                  └─ ChatProvider (useChat hook → useStream)
                      └─ ChatInterface
                          ├─ ChatMessage[]
                          │   ├─ MarkdownContent
                          │   ├─ ToolCallBox
                          │   │   ├─ LoadExternalComponent (GenUI)
                          │   │   └─ ToolApprovalInterrupt
                          │   └─ SubAgentIndicator
                          └─ Input Area
                              └─ Tasks/Files (embedded — to be moved)
```

### Key Data Flow

```
useChat.ts
  │
  ├── stream = useStream<StateType>({...})
  │     Returns:
  │     ├── stream.messages: Message[]        ← full message list (including streaming)
  │     ├── stream.values: StateType          ← current LangGraph state
  │     │     ├── .messages                   ← same as stream.messages
  │     │     ├── .todos: TodoItem[]
  │     │     ├── .files: Record<string, string>
  │     │     ├── .email?: {...}
  │     │     └── .ui?: any[]
  │     ├── stream.isLoading: boolean
  │     ├── stream.isThreadLoading: boolean
  │     ├── stream.interrupt?: InterruptValue
  │     ├── stream.getMessagesMetadata: fn
  │     ├── stream.submit: fn
  │     └── stream.stop: fn
  │
  ├── sendMessage(content)      → stream.submit({messages: [newMessage]})
  ├── runSingleStep(...)        → stream.submit(undefined, {checkpoint, interruptBefore/After})
  ├── continueStream(...)       → stream.submit(undefined, {config})
  ├── resumeInterrupt(value)    → stream.submit(null, {command: {resume: value}})
  ├── markCurrentThreadAsResolved() → stream.submit(null, {command: {goto: "__end__"}})
  └── stopStream()              → stream.stop()
```

### StateType Definition

```typescript
// src/app/hooks/useChat.ts
export type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
  email?: { id?: string; subject?: string; page_content?: string };
  ui?: any;
};
```

### Type Definitions

```typescript
// src/app/types/types.ts
interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "pending" | "completed" | "error" | "interrupted";
}

interface SubAgent {
  id: string;
  name: string;
  subAgentName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "pending" | "active" | "completed" | "error";
}

interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  updatedAt?: Date;
}

interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
  description?: string;
}
```

## Development Conventions

### File Naming

- Components: `PascalCase.tsx` (e.g., `ExecutionStatusBar.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useElapsedTime.ts`)
- Utilities: `camelCase.ts` (e.g., `notifications.ts`)
- New files go in existing directory structure; only create new directories when noted

### Component Patterns

All existing components follow these patterns — new code must be consistent:

```typescript
// 1. "use client" directive (all components are client components)
"use client";

// 2. React.memo for performance-sensitive components
export const MyComponent = React.memo<MyComponentProps>(({ prop1, prop2 }) => {
  // ...
});
MyComponent.displayName = "MyComponent";

// 3. cn() utility for conditional class merging
import { cn } from "@/lib/utils";
<div className={cn("base-classes", isActive && "active-classes")} />

// 4. Lucide icons (NOT heroicons, NOT @radix-ui/react-icons)
import { IconName } from "lucide-react";

// 5. Radix UI primitives via src/components/ui/
import { Button } from "@/components/ui/button";
```

### State Management

- **No Redux, no Zustand** — the project uses React Context + hooks exclusively
- `ChatProvider` / `useChatContext()` for all chat-related state
- `ClientProvider` / `useClient()` for the LangGraph SDK client
- URL state via `nuqs` (`useQueryState`)
- Server cache via `swr`

### Styling

- Tailwind CSS 3.x with custom CSS variables
- Color tokens: `text-primary`, `text-muted-foreground`, `text-foreground`, `bg-background`, `bg-accent`, `bg-card`, `border-border`
- Semantic tokens: `text-success`, `text-warning`, `text-destructive`, `text-tertiary`
- Custom tokens: `--color-user-message-bg`, `--color-file-button`, `--color-file-button-hover`
- Responsive: not currently implemented (desktop-only); do NOT attempt to add mobile responsiveness in this iteration

### Testing

No test framework is currently configured. New features should be structured for easy future testing (pure functions extracted, components with clear prop interfaces).

## New Dependencies Policy

Minimize new dependencies. For each phase, approved additions are listed in the spec. Any other dependencies require discussion.

## Branch Strategy

Each phase should be implemented on a separate feature branch:

```
main
  ├── feat/phase1-execution-visibility
  ├── feat/phase2-layout-restructure
  ├── feat/phase3-interaction-enhancement
  └── feat/phase4-experience-polish
```

Phases can be worked on in parallel by different developers, except:
- Phase 2 (P1-1: Context Panel) must be completed before Phase 3 (P2-3: Inline File Viewer)
