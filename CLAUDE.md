# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Deep Agents UI is a Next.js chat interface for interacting with [deepagents](https://github.com/langchain-ai/deepagents) — LangGraph-based AI agents with planning, computer access, and sub-agent delegation. It connects to a LangGraph server via `@langchain/langgraph-sdk` and renders streaming agent execution with tool calls, file viewing, todos, and human-in-the-loop interrupts.

## Commands

```bash
npm install            # Install dependencies
npm run dev            # Dev server with Turbopack (http://localhost:3000)
npm run build          # Production build
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm run format         # Prettier auto-format
npm run format:check   # Prettier check
```

Node version: 20 (see `.nvmrc`). Yarn 1.22.22 also supported.

No test framework is configured.

## Architecture

### Service Architecture (Auth Integration)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js :3000)                  │
│  fetchInterceptor → Bearer Token from localStorage              │
└─────────────────────────────────────────────────────────────────┘
                    │                           │
                    ▼                           ▼
        ┌──────────────────┐       ┌──────────────────────┐
        │   Auth Server    │       │   LangGraph Server   │
        │   :8000          │       │   :2024              │
        │                  │       │                      │
        │ /auth/register   │       │ /threads/*           │
        │ /auth/login-cookie│      │ /runs/*              │
        │ /auth/logout-cookie│     │ /store/*             │
        │ /auth/me         │       │ /assistants/*        │
        └──────────────────┘       └──────────────────────┘
                    │                           │
                    └───────────┬───────────────┘
                                ▼
                        ┌──────────────────┐
                        │   PostgreSQL     │
                        └──────────────────┘
```

**Key Points**:

- Two independent services: Auth Server (FastAPI) + LangGraph Server
- Bearer Token authentication (JWT stored in localStorage)
- LangGraph Server requires JWT authentication for all API calls
- Cookie-based auth NOT used due to cross-port cookie limitations

### Provider Hierarchy

```
ClientInitializer (loads fetchInterceptor)
  → AuthProvider (user, token state, login/logout)
    → AuthGuard (redirect to /login if not authenticated)
      → NuqsAdapter (URL state)
        → ThemeProvider (useSettings hook)
          → ClientProvider (LangGraph SDK Client with Bearer Token)
            → ChatProvider (useChat hook)
              → Page components
```

### Authentication Flow

1. **Login**: `AuthContext.login()` → `/auth/login-cookie` → stores `access_token` in localStorage
2. **API Requests**: `fetchInterceptor.ts` monkey-patches `window.fetch` to add `Authorization: Bearer {token}` header
3. **LangGraph SDK**: `ClientProvider` uses `onRequest` hook with `useRef` to add Bearer Token (avoids closure stale token issue)
4. **Token Refresh**: Handled by Auth Server via `/auth/refresh-cookie`

### Key Auth Files

| File                                   | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `src/contexts/AuthContext.tsx`         | Auth state, login/logout, token storage     |
| `src/lib/fetchInterceptor.ts`          | Global fetch patch for Bearer Token         |
| `src/providers/ClientProvider.tsx`     | LangGraph SDK client with `onRequest` hook  |
| `src/components/AuthGuard.tsx`         | Redirect to /login if not authenticated     |
| `src/components/ClientInitializer.tsx` | Loads fetchInterceptor on client            |
| `src/api/auth.ts`                      | Auth API calls (login, logout, getUserInfo) |
| `src/api/client.ts`                    | Base fetch with credentials                 |

### End-to-End Data Flow

```
User Input → ChatInterface → useChat.sendMessage()
  → useStream (LangGraph SDK, WebSocket persistent connection)
    → LangGraph Server (:2024) with Bearer Token auth
      → create_deep_agent() graph (deepagents backend)
        ├── TodoListMiddleware     → todos state
        ├── FilesystemMiddleware   → files state
        ├── SubAgentMiddleware     → task tool, sub-agent delegation
        └── other middleware...
    ← Streams back StateType { messages, todos, files, email?, ui? }
  → React real-time UI updates
```

### State Management

- **LangGraph streaming state**: `useStream` from `@langchain/langgraph-sdk/react` is the core primitive
- **Graph state shape** (`StateType`): `{ messages, todos, files, email?, ui? }`
- **URL query state**: `nuqs` manages `threadId`, `assistantId`, `sidebar`, and `context`
- **Thread listing**: `useThreads` uses SWR infinite pagination via `client.threads.search()`
- **Configuration**: Stored in `localStorage` under key `"deep-agent-config"` (`src/lib/config.ts`)
- **Auth token**: Stored in `localStorage` under key `"auth_token"`

### Key Directories

- `src/app/components/` — App-specific components (ChatInterface, ChatMessage, ToolCallBox, etc.)
- `src/app/components/tool-renderers/` — Tool-specific argument renderers (registry pattern)
- `src/app/hooks/` — `useChat` (streaming) and `useThreads` (pagination)
- `src/app/(auth)/` — Login and Register pages
- `src/providers/` — React context providers (ClientProvider, ChatProvider, ThemeProvider)
- `src/contexts/` — AuthContext for authentication state
- `src/components/ui/` — shadcn/ui components (Radix UI primitives)
- `src/lib/` — Utilities, config, fetchInterceptor
- `src/api/` — API client functions

### Component Relationships

```
page.tsx (entry point)
├── ConfigDialog — first-time setup of deploymentUrl + assistantId
├── ResizablePanelGroup (horizontal split)
│   ├── ThreadList (left, collapsible)
│   └── ChatInterface (right, core)
│       ├── Message area (useStickToBottom auto-scroll)
│       │   └── ChatMessage × N
│       │       ├── MarkdownContent — user/AI text rendering
│       │       ├── ToolCallBox × N — tool call display
│       │       └── SubAgentIndicator × N — expandable sub-agent display
│       ├── ContextPanel (right sidebar, toggleable)
│       │   ├── TasksTab — todo list
│       │   └── FilesTab — file list
│       └── Input area + Send/Stop buttons
```

## Code Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **All app components are client components** (`"use client"` directive)
- **React.memo**: Wrap performance-sensitive components with `React.memo` and set `displayName`
- **ESLint allows `any`** (`@typescript-eslint/no-explicit-any` is disabled)
- **Unused vars**: Must be prefixed with `_` (enforced by ESLint)
- **Prettier**: Uses `prettier-plugin-tailwindcss` for class sorting
- **No Redux/Zustand** — React Context + hooks exclusively

## Environment Variables

```bash
# Auth Server URL
NEXT_PUBLIC_AUTH_URL=http://localhost:8000

# LangGraph Server URL
NEXT_PUBLIC_API_URL=http://localhost:2024

# Optional, for LangSmith-protected deployments
NEXT_PUBLIC_LANGSMITH_API_KEY=lsv2_...
```

UI config dialog settings take precedence over env vars.

## Human-in-the-Loop (HITL)

- `stream.interrupt` detects interrupt state
- `ToolCallBox` auto-expands interrupted tool calls
- `resumeInterrupt(value)` sends `Command({ resume: value })` to resume execution
- Interrupt banner appears when agent needs approval

## SSE 断连保护 (Long-Running SubAgent)

**问题**: SubAgent 执行 10+ 分钟时，浏览器关闭空闲 SSE 连接。LangGraph SDK 默认 `on_disconnect="cancel"` 会终止后端 run。

**解决方案** (`useChat.ts`):

1. **`onDisconnect: "continue"`**: 所有 `stream.submit()` 调用（6 处）设置此参数，后端在 SSE 断连后继续执行
2. **轮询兜底**: 检测 `isLoading: true → false` 后查询后端 run 状态，如果仍 running 则启动 15s 轮询。完成后 `window.location.reload()` 刷新
3. **`isLoading: stream.isLoading || isPolling`**: 轮询期间 UI 保持 "Running..." 状态
4. **Stop 按钮**: 轮询期间点击 Stop 通过 REST API `client.runs.cancel()` 取消后端 run

**注意**: 新增 `stream.submit()` 调用时，**必须**包含 `onDisconnect: "continue"`（除 `markCurrentThreadAsResolved` 等终止操作外）。

## 主面板 vs 工作台信息分工

**设计原则**: 主面板 = 对话（用户看什么），工作台 = 过程（Agent 怎么做）

- **主面板**: 用户消息、AI 回复、主 Agent 所有工具调用、SubAgent 紧凑状态标签、HIL 审批、DeliveryCard
- **工作台**: 任务概览（OPDCA）、Agent 协作对话面板（产品教练委派 → SubAgent 实时步骤）
- **SubAgent 在主面板**: 紧凑内联标签（角色名 + 状态 + 耗时），**不可展开**
- **SubAgent 在工作台**: 完整对话气泡（头像 + 任务指令 + 工具步骤详情 + 完成总结）

## 工作台 Agent 协作面板 (WorkPanelV527)

右侧工作台的工作日志 tab 显示 Agent 内部协作对话：

- **数据源**: `realtimeSubagentLogs`（stream_writer custom events）+ `messages`（task toolCalls）
- **按 SubAgent 分组**: `realtimeSubagentLogs` 的 key 为 `subagent_type`
- **并行兼容**: 同类型并行 SubAgent 日志自然合并到同一 key
- **realtime 日志不在 onFinish 清空**: DeepAgents `subagent_logs` 持久化尚未实现，实时日志保留供 run 结束后查看
- **sendMessage 时清空**: 新轮次重置旧日志

## 文档管理规范

前端项目无独立 `docs/` 目录，文档管理��循以下规���：

**文档存放位置**:

- 前端架构说明、组件关系、Auth 流程 → 本文件 (`CLAUDE.md`)
- 涉及前后端协同的文档（E2E 测试、集成修复） → `langgraph_test/docs/`（根 docs/）
- 纯后端文档 → `pmagent/docs/`（后端项目内部）

**��键规则**:

- 前端相关的 Bug 修复记录 → `langgraph_test/docs/bugfixes/`（跨项目）
- 不在 deep-agents-ui/ 根���录创建临时 .md/.txt 文件
- 前端组件文档优先写在代码注释中，复杂架构说明写在 CLAUDE.md
- 详细规范参见根目录 `CLAUDE.md` 的「📁 文档存放规范 > 多项目文档架构」章节

## 测试管理规范

- **正式 E2E 测试** (Playwright `.spec.ts`) → `tests/` 目录
- **Jest 单元测试** → 与被测文件同目录 (`*.test.ts(x)`)
- **临时诊断/验证脚本** → `tests/manual/`（.gitignore 排除，不纳入版本跟踪）
- **跨项目 E2E**（前后端联调） → `langgraph_test/tests/e2e/`
- **禁止**在项目根目录放置 `test_*.py` 或 `verify_*.py`

## Debug Mode

- **interruptBefore**: Pauses before tool execution
- **interruptAfter**: Pauses after tool execution
- Can restart from any AI message or sub-task
- Uses LangGraph checkpoint system for state save/restore
