# UI 功能问题诊断报告

**诊断日期**: 2026-03-23
**诊断团队**: AI Frontend Architect + AI Development Team
**严重程度**: **P0 - 阻塞性问题**

---

## 📋 问题总览

| ID | 问题 | 严重程度 | 根因 | 状态 |
|----|------|----------|------|------|
| ISSUE-001 | 消息清空问题 | P0 | Stream 消息管理问题 | 🔍 已诊断 |
| ISSUE-002 | HIL 审批按钮缺失 | P0 | Interrupt 状态判断逻辑错误 | 🔍 已诊断 |
| ISSUE-003 | SubAgent 工作日志未显示 | P1 | Backend subagent_logs 数据缺失 | 🔍 已诊断 |

---

## 🔍 问题 1: 消息清空问题 (ISSUE-001)

### 问题现象
- 用户发送消息后，AI 开始回复时，**之前的消息被清空**
- 界面只显示最新的消息，历史消息丢失

### 根因分析

#### 数据流追踪
```
User Input → sendMessage()
  → stream.submit({ messages: [newMessage] }, {
      optimisticValues: (prev) => ({
        messages: [...(prev.messages ?? []), newMessage],
      }),
    })
  → useStream() hook
    → stream.messages (SDK 内部管理)
      → useChat() return { messages: stream.messages }
        → ChatInterface { messages }
          → processedMessages useMemo
            → UI render
```

#### 关键代码分析

**useChat.ts (L354)**:
```typescript
return {
  messages: stream.messages, // ❌ 直接引用 SDK stream.messages
  // ...
};
```

**useChat.ts (L201-213)**:
```typescript
stream.submit(
  { messages: [newMessage] },
  {
    optimisticValues: (prev) => ({
      messages: [...(prev.messages ?? []), newMessage], // ✅ 乐观更新正确
    }),
    config: getConfigWithToken(...),
  }
);
```

**ChatInterface.tsx (L333-343)**:
```typescript
const processedMessages = useMemo(() => {
  const messageMap = new Map<string, { message: Message; toolCalls: ToolCall[] }>();
  messages.forEach((message: Message) => { // ❌ 如果 messages 被清空，这里会清空
    // ... 处理逻辑
  });
  return Array.from(messageMap.values());
}, [messages]); // 依赖 messages
```

#### 根本原因

**LangGraph SDK useStream hook 的 messages 管理问题**:

1. **问题场景 1**: Thread ID 切换
   - 当 `threadId` 改变时，useStream 会清空 messages
   - 如果 threadId 状态管理有问题，会导致消息清空

2. **问题场景 2**: Stream 状态重置
   - useStream 内部可能因为网络错误、重连等原因重置状态
   - SDK 没有持久化历史消息

3. **问题场景 3**: Backend 返回不完整的消息列表
   - 如果 Backend 的 thread state 中 messages 字段不完整
   - Stream 更新时会覆盖前端的消息列表

### 验证步骤

**添加调试日志**:

```typescript
// useChat.ts
const stream = useStream<StateType>({
  assistantId: activeAssistant?.assistant_id || "",
  client: client ?? undefined,
  threadId: threadId ?? null,
  onThreadId: setThreadId,
  onFinish: onHistoryRevalidate,
  onError: handleStreamError,
  onCreated: onHistoryRevalidate,
  fetchStateHistory: true,
});

// 🔍 添加调试日志
useEffect(() => {
  console.log("[useChat] messages changed:", {
    count: stream.messages.length,
    threadId,
    isLoading: stream.isLoading,
    messages: stream.messages.map(m => ({ id: m.id, type: m.type, content: m.content?.substring(0, 50) }))
  });
}, [stream.messages, threadId, stream.isLoading]);
```

### 修复方案

#### 方案 A: 添加本地消息缓存（推荐）

**优点**: 不依赖 SDK 内部实现，前端完全控制
**缺点**: 需要管理额外的状态

```typescript
// useChat.ts
const messagesCache = useRef<Message[]>([]);
const prevThreadId = useRef<string | null>(null);

// 当 threadId 改变时，清空缓存
useEffect(() => {
  if (threadId !== prevThreadId.current) {
    messagesCache.current = [];
    prevThreadId.current = threadId;
  }
}, [threadId]);

// 合并 SDK messages 和缓存
const messages = useMemo(() => {
  const merged = [...messagesCache.current];

  // 添加 SDK 新消息
  stream.messages.forEach((msg) => {
    if (!merged.find(m => m.id === msg.id)) {
      merged.push(msg);
    }
  });

  // 更新缓存
  messagesCache.current = merged;

  return merged;
}, [stream.messages]);
```

#### 方案 B: 修复 threadId 状态管理

**检查点**:
1. `nuqs` query state 是否正确管理 threadId
2. threadId 是否在不应该改变的时候改变了
3. 是否有其他地方意外修改了 threadId

---

## 🔍 问题 2: HIL 审批按钮缺失 (ISSUE-002)

### 问题现象
- 界面显示 **"Action required - The agent is waiting for your approval above"**
- 但**没有审批按钮**，用户无法操作，流程卡住

### 根因分析

#### 关键代码追踪

**ChatInterface.tsx (L637-657)** - Interrupt Banner:
```typescript
{interrupt && (
  <div className="...">
    <span>Action required</span>
    <span>— The agent is waiting for your approval above</span>
    <button onClick={() => { /* Scroll to interrupt tool call */ }}>
      View pending action
    </button>
  </div>
)}
```

**ToolCallFooter.tsx (L53-70)** - InterruptActions 渲染条件:
```typescript
{tc.status === "interrupted" && onResumeInterrupt && (
  <InterruptActions
    toolName={tc.name}
    onApprove={(value) => onResumeInterrupt(value)}
    onReject={(message) => { /* ... */ }}
  />
)}
```

**messageConverter.ts (L70-73)** - ToolCall 状态判断:
```typescript
toolCalls: toolCalls.map((tc) => ({
  ...tc,
  status: interrupt ? "interrupted" : "pending", // ❌ 错误逻辑！
})),
```

#### 根本原因

**问题 1: Interrupt 状态判断逻辑错误**

`messageConverter.ts` 第 70-73 行的逻辑：
```typescript
status: interrupt ? "interrupted" : "pending",
```

这个逻辑是：**只要有 interrupt 存在，就把所有 tool calls 标记为 "interrupted"**。

**错误原因**:
- 不是所有 tool calls 都应该被标记为 "interrupted"
- 只有**被中断的特定工具调用**才应该标记为 "interrupted"
- 其他工具调用应该保持 "pending" 或 "completed" 状态

**问题 2: Interrupt 数据结构未正确传递**

需要检查：
1. `stream.interrupt` 的数据结构是什么？
2. 哪个工具调用被中断了？
3. 是否需要从 interrupt 对象中提取 tool_call_id？

### Backend Interrupt 数据结构

**LangGraph interrupt 数据结构** (推测):
```typescript
stream.interrupt = {
  // 可能包含被中断的工具信息
  tool_call_id?: string;
  tool_name?: string;
  // ... 其他字段
}
```

### 修复方案

#### 方案 A: 修复 messageConverter 逻辑（推荐）

**messageConverter.ts**:
```typescript
// ❌ 错误逻辑
toolCalls: toolCalls.map((tc) => ({
  ...tc,
  status: interrupt ? "interrupted" : "pending",
})),

// ✅ 正确逻辑
toolCalls: toolCalls.map((tc) => {
  // 检查这个 tool call 是否是被中断的那个
  const isInterrupted = interrupt &&
    (interrupt.tool_call_id === tc.id ||
     interrupt.tool_name === tc.name);

  return {
    ...tc,
    status: isInterrupted ? "interrupted" : tc.status,
  };
}),
```

#### 方案 B: 添加调试日志确认 interrupt 结构

```typescript
// messageConverter.ts
export function convertMessagesToBubbles(
  messages: Message[],
  isLoading: boolean,
  interrupt?: unknown
): ConvertedBubbleItem[] {
  // 🔍 添加调试日志
  if (interrupt) {
    console.log("[messageConverter] interrupt detected:", {
      interrupt,
      type: typeof interrupt,
      value: JSON.stringify(interrupt, null, 2),
    });
  }

  const processed = processMessagesWithTools(messages, interrupt);
  // ...
}
```

---

## 🔍 问题 3: SubAgent 工作日志未显示 (ISSUE-003)

### 问题现象
- **工作日志区**没有显示 SubAgent 的工作日志
- 用户无法看到 SubAgent 的执行步骤

### 根因分析

#### 数据流追踪

```
Backend (pmagent/src/agent.py)
  → SubAgentMiddleware
    → state["subagent_logs"] = {...}
      → LangGraph State
        → Frontend useChat()
          → stream.values.subagent_logs
            → ContextPanel → WorkPanelV527
              → StepGroup → ToolCard
```

#### 关键代码

**useChat.ts (L349)**:
```typescript
return {
  subagent_logs: stream.values.subagent_logs ?? {}, // ✅ 正确获取
  // ...
};
```

**ContextPanel.tsx (L251-254)**:
```typescript
<WorkPanelV527
  subagentLogs={subagent_logs ?? {}} // ✅ 正确传递
  isVisible={activeTab === "worklog"}
/>
```

**WorkPanelV527.tsx (L43-47)**:
```typescript
const { todos, files = {}, isLoading, subagents } = useChatContext();

// ❌ 问题：没有从 useChatContext() 中解构 subagent_logs！
```

#### 根本原因

**WorkPanelV527 组件没有从 ChatContext 获取 subagent_logs**

虽然 `subagent_logs` 已经在 useChat 中正确返回，并且通过 ChatProvider 传递，但 WorkPanelV527 没有解构它：

```typescript
// ❌ 当前代码
const { todos, files = {}, isLoading, subagents } = useChatContext();

// ✅ 应该添加 subagent_logs
const { todos, files = {}, isLoading, subagents, subagent_logs } = useChatContext();
```

### 修复方案

#### 方案: 修复 WorkPanelV527 props

**WorkPanelV527.tsx**:
```typescript
export const WorkPanelV527 = React.memo<WorkPanelV527Props>(
  ({ onClose: _onClose, subagentLogs: externalSubagentLogs = {}, isVisible = true }) => {
    const { todos, files = {}, isLoading, subagents, subagent_logs: contextSubagentLogs } = useChatContext();

    // 🔧 优先使用 props，fallback 到 context
    const subagentLogs = externalSubagentLogs ?? contextSubagentLogs ?? {};

    // ... 使用 subagentLogs
  }
);
```

或者更简单的方案：**移除 props，直接从 context 获取**

```typescript
export const WorkPanelV527 = React.memo<WorkPanelV527Props>(
  ({ onClose: _onClose, isVisible = true }) => {
    const { todos, files = {}, isLoading, subagents, subagent_logs } = useChatContext();

    const subagentLogs = subagent_logs ?? {};

    // ...
  }
);
```

---

## 📊 修复优先级

| 优先级 | 问题 | 预计工作量 | 影响范围 | 建议修复顺序 |
|--------|------|-----------|----------|-------------|
| P0 | ISSUE-002 HIL 审批按钮缺失 | 2-4 小时 | 阻塞用户流程 | 1️⃣ |
| P0 | ISSUE-001 消息清空问题 | 4-6 小时 | 严重 UX 问题 | 2️⃣ |
| P1 | ISSUE-003 SubAgent 日志未显示 | 1-2 小时 | 功能性问题 | 3️⃣ |

---

## 🛠 修复计划

### Phase 1: HIL 审批按钮修复 (2-4 小时)

**修复文件**:
- `src/app/utils/messageConverter.ts` (修复 interrupt 状态判断)
- 添加调试日志确认 interrupt 数据结构

**验证步骤**:
1. 触发 HIL interrupt
2. 检查 console 输出的 interrupt 数据结构
3. 确认 InterruptActions 组件正确渲染
4. 点击批准/拒绝按钮，确认流程正常

### Phase 2: 消息清空问题修复 (4-6 小时)

**修复文件**:
- `src/app/hooks/useChat.ts` (添加消息缓存)
- 添加调试日志监控 messages 变化

**验证步骤**:
1. 发送多轮对话
2. 确认历史消息不丢失
3. 切换 thread，确认消息正确切换
4. 测试网络错误场景

### Phase 3: SubAgent 日志显示修复 (1-2 小时)

**修复文件**:
- `src/app/components/WorkPanelV527.tsx` (添加 subagent_logs 解构)

**验证步骤**:
1. 触发 SubAgent 执行
2. 确认工作日志正确显示
3. 确认日志按任务分组
4. 测试折叠/展开功能

---

## 🧪 测试计划

### E2E 测试场景

**场景 1: HIL 审批流程**
```
1. 用户发送消息触发 HIL
2. 界面显示 "Action required" banner
3. InterruptActions 组件正确渲染
4. 用户点击批准/拒绝
5. 流程继续执行
```

**场景 2: 多轮对话消息保持**
```
1. 用户发送消息 A
2. AI 回复消息 B
3. 用户发送消息 C
4. 界面显示 A, B, C 三条消息
5. AI 回复消息 D
6. 界面显示 A, B, C, D 四条消息
```

**场景 3: SubAgent 工作日志**
```
1. 用户触发任务创建
2. SubAgent 开始执行
3. 工作日志区显示 SubAgent 步骤
4. 日志按任务分组
5. 支持折叠/展开
```

---

## 📝 注意事项

### 调试技巧

1. **添加调试日志**:
   ```typescript
   console.log("[ComponentName]", {
     key: value,
     // ... 其他字段
   });
   ```

2. **React DevTools**:
   - 检查组件 props 和 state
   - 追踪 re-render 原因

3. **Network Tab**:
   - 检查 WebSocket 消息
   - 确认 Backend 返回的数据

### 回归测试检查清单

- [ ] 消息发送/接收正常
- [ ] HIL 流程正常
- [ ] SubAgent 日志正常
- [ ] Thread 切换正常
- [ ] 文件上传/查看正常
- [ ] UI 响应式布局正常

---

**报告人**: AI Frontend Architect
**审查状态**: ✅ 诊断完成，待修复
**下一步**: 开始 Phase 1 修复（HIL 审批按钮）
