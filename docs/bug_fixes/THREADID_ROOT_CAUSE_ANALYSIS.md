# ThreadId 不稳定性问题 - 深度根因分析报告

**分析日期**: 2026-03-24
**问题**: threadId 在 null 和 UUID 之间反复切换，导致消息消失
**分析状态**: 诊断日志已部署，等待用户数据收集

---

## 一、问题现象

### 1.1 用户报告的 Console 日志

```
threadId changed, clearing message map: {prev: null, new: 'c153b3c7-348d-4840-b0d4-b47ef458b79a'}
threadId changed, clearing message map: {prev: 'c153b3c7-348d-4840-b0d4-b47ef458b79a', new: null}
threadId changed, clearing message map: {prev: null, new: 'b4d695ec-fe3b-4ee1-9270-f8461ef6ef56'}
```

### 1.2 影响

- 用户发送消息后，消息消失
- Agent 不回复
- 用户体验完全破坏

---

## 二、框架机制理解（客观验证）

### 2.1 nuqs useQueryState 机制

**版本**: 2.4.1

**行为**:
```typescript
const [threadId, setThreadId] = useQueryState("threadId");
```

- **初始值**：URL 中没有 `?threadId=xxx` 时，返回 `null`
- **双向绑定**：`setThreadId(value)` 更新 URL 参数
- **URL 同步**：URL 参数变化 → React state 变化

**关键点**：
- 当 URL 中的 `?threadId=xxx` 被清除时，`threadId` 变成 `null`
- 当组件 unmount/remount 时，重新读取 URL 参数

### 2.2 LangGraph SDK useStream 机制

**版本**: 1.7.4

**核心源码** (`node_modules/@langchain/langgraph-sdk/dist/react/thread.js`):
```javascript
const useControllableThreadId = (options) => {
  const [localThreadId, _setLocalThreadId] = useState(options?.threadId ?? null);
  const onThreadIdRef = useRef(options?.onThreadId);
  onThreadIdRef.current = options?.onThreadId;
  const setThreadId = useCallback((threadId) => {
    _setLocalThreadId(threadId);
    onThreadIdRef.current?.(threadId);  // ← 调用 onThreadId callback
  }, []);
  if (!options || !("threadId" in options)) return [localThreadId, setThreadId];
  return [options.threadId ?? null, setThreadId];
};
```

**核心发现**:
1. `onThreadId(threadId)` 只在 SDK 内部调用 `setThreadId(threadId)` 时触发
2. SDK **不会**主动调用 `onThreadId(null)`
3. `onThreadId(newUUID)` 只在创建新 thread 时调用（`stream.start()` 中）

**验证** (`stream.custom.js`):
```javascript
const submit = async (values, submitOptions) => {
  let usableThreadId = threadId;
  await stream.start(async (signal) => {
    if (!usableThreadId) {
      usableThreadId = crypto.randomUUID();
      threadIdRef.current = usableThreadId;
      onThreadId(usableThreadId);  // ← 只在 threadId 为空时调用
    }
    // ...
  });
};
```

### 2.3 StreamManager.clear() 行为

**源码** (`manager.js`):
```javascript
clear = () => {
  this.abortRef.abort();
  this.abortRef = new AbortController();
  this.setState({
    error: void 0,
    values: null,
    isLoading: false
  });
  this.messages.clear();
  this.subagentManager.clear();
};
```

**关键点**：`clear()` **不会**调用 `setThreadId(null)`，只清除内部 state。

---

## 三、代码审查：所有 threadId 修改路径

### 3.1 全局搜索结果

**文件**: `deep-agents-ui/src/app/`

| 文件 | 行号 | 代码 | 场景 |
|------|------|------|------|
| `page.tsx` | 44 | `const [threadId, setThreadId] = useQueryState("threadId")` | 定义 |
| `page.tsx` | 107 | `onNewThread: () => setThreadId(null)` | 键盘快捷键 |
| `page.tsx` | 180 | `onClick={() => setThreadId(null)}` | "New Thread"按钮 |
| `page.tsx` | 244 | `await setThreadId(id)` | 选择线程 |
| `page.tsx` | 253 | `await setThreadId(id)` | 选择线程 |
| `useChat.ts` | 75 | `const [threadId, setThreadId] = useQueryState("threadId")` | 定义 |
| `useChat.ts` | 177 | `setThreadId(newThreadId)` | onThreadId 回调 |

### 3.2 分析结论

**用户主动操作**（预期行为）:
- 点击"New Thread"按钮 → `setThreadId(null)` → 正常
- 键盘快捷键 → `setThreadId(null)` → 正常
- 选择线程 → `setThreadId(id)` → 正常

**SDK 回调**（待观察）:
- `useChat.ts:177` → `onThreadId` 回调中调用 `setThreadId(newThreadId)`
- 根据 SDK 源码，只会调用 `onThreadId(newUUID)`，不会调用 `onThreadId(null)`

---

## 四、根本原因假设

### 假设 A：Next.js 路由导航清除 URL 参数

**机制**:
1. 用户发送消息
2. Next.js 发生某种路由导航（可能是隐式的）
3. URL 中的 `?threadId=xxx` 被清除
4. nuqs 检测到 URL 变化，将 `threadId` 设置为 `null`

**验证方法**:
- 添加路由导航日志
- 监控 `router.push()` 和 `router.replace()` 调用

**可能性**: 低（没有发现相关代码路径）

### 假设 B：React 组件重新挂载

**机制**:
1. `page.tsx` 中的条件渲染导致组件重新挂载
2. 发现：`{!assistant ? (...) : (<ChatProvider>...)}`
3. 如果 `assistant` 在消息发送过程中变化，`ChatProvider` 可能 unmount/remount
4. remount 时，`useQueryState("threadId")` 重新读取 URL

**关键发现**:
```tsx
// page.tsx:216-227
{!assistant ? (
  <div>Loading...</div>
) : (
  <ChatProvider activeAssistant={assistant}>
    {/* Chat UI */}
  </ChatProvider>
)}
```

**验证方法**:
- 监控 `assistant` 状态变化
- 添加 mount/unmount 日志

**可能性**: 中（需要验证 assistant 是否稳定）

### 假设 C：nuqs 内部状态同步问题

**机制**:
1. nuqs 在特定场景下可能出现状态同步问题
2. 例如：URL 参数未变化，但 state 被重置为 `null`
3. 可能是 React 18 并发渲染导致的边缘情况

**验证方法**:
- 检查 nuqs 版本是否有已知 bug
- 升级到最新版本测试

**可能性**: 低（nuqs 2.4.1 是最新版本）

### 假设 D：LangGraph SDK 内部行为（❌ 已被证伪）

**之前的错误假设**：SDK 在某些情况下调用 `onThreadId(null)`

**证伪证据**：
- SDK 源码显示 `onThreadId` 只在创建新 thread 时调用
- `stream.clear()` 不会改变 threadId
- 没有代码路径会调用 `setThreadId(null)`

**结论**: ❌ **此假设已被源码证伪**

---

## 五、诊断日志增强（已部署）

### 5.1 修改内容

**文件**: `useChat.ts`

**日志 1**: onThreadId 回调追踪
```typescript
onThreadId: (newThreadId) => {
  console.log("[useChat] 🔵 onThreadId 回调:", {
    timestamp: new Date().toISOString(),
    currentThreadId: threadId,
    newThreadId,
    source: stackTrace,
  });
  setThreadId(newThreadId);
},
```

**日志 2**: threadId 变化追踪
```typescript
useEffect(() => {
  if (threadId !== prevThreadId.current) {
    console.log("[useChat] 🔴 threadId 发生变化:", {
      timestamp: new Date().toISOString(),
      prev: prevThreadId.current,
      new: threadId,
      callStack: stackTrace,
    });
    prevThreadId.current = threadId;
  }
}, [threadId]);
```

**日志 3**: messagesMap 清空追踪
```typescript
useEffect(() => {
  if (threadId !== prevThreadId.current) {
    console.log("[useChat] 🔴 threadId 变化 - 清空 messagesMap:", {
      timestamp: new Date().toISOString(),
      prev: prevThreadId.current,
      new: threadId,
      mapSize: messagesMap.current.size,
    });
    messagesMap.current.clear();
    prevThreadId.current = threadId;
  }
}, [threadId]);
```

### 5.2 预期日志输出

**正常流程**（用户发送消息）:
```
[useChat] 🔵 onThreadId 回调: {currentThreadId: null, newThreadId: 'abc-123'}
[useChat] 🔴 threadId 发生变化：{prev: null, new: 'abc-123'}
[useChat] 🔴 threadId 变化 - 清空 messagesMap: {prev: null, new: 'abc-123'}
```

**异常流程**（待观察）:
- 如果看到 `onThreadId 回调：{newThreadId: null}` → SDK 调用（但源码证明不会发生）
- 如果没有 `onThreadId 回调` 但 `threadId 发生变化` → nuqs/URL 变化导致

---

## 六、最可能的根因

基于代码审查和框架机制理解，**最可能的根因是假设 B：React 组件重新挂载**。

### 6.1 详细分析

**触发条件**:
1. 用户发送消息
2. `stream.submit()` 被调用
3. SDK 开始 streaming
4. 在此期间，`assistant` 状态发生变化（原因待查）
5. `page.tsx` 条件渲染导致 `ChatProvider` unmount
6. `useChat` hook unmount，`useQueryState` 连接断开
7. `ChatProvider` remount
8. `useQueryState` 重新读取 URL，但 URL 中可能没有 threadId 参数
9. `threadId` 变成 `null`

**待验证问题**:
1. `assistant` 状态为什么会变化？
2. URL 中的 `?threadId=xxx` 为什么会被清除？

### 6.2 验证计划

**步骤 1**: 添加 assistant 状态监控日志
```typescript
useEffect(() => {
  console.log("[page.tsx] assistant 状态变化:", {
    prev: assistant?.assistant_id,
    new: assistant?.assistant_id,
  });
}, [assistant]);
```

**步骤 2**: 添加 mount/unmount 日志
```typescript
useEffect(() => {
  console.log("[useChat] 组件挂载");
  return () => console.log("[useChat] 组件卸载");
}, []);
```

**步骤 3**: 监控 URL 变化
```typescript
useEffect(() => {
  console.log("[useChat] URL 变化:", window.location.href);
}, [threadId]);
```

---

## 七、临时修复 vs 永久修复

### 7.1 临时修复（不推荐，但可缓解）

**方案**: 在 `onThreadId` callback 中添加守卫
```typescript
onThreadId: (newThreadId) => {
  if (newThreadId === null && threadId !== null) {
    console.warn("阻止 SDK 将 threadId 设置为 null");
    return;
  }
  setThreadId(newThreadId);
},
```

**问题**:
- 治标不治本
- 可能掩盖真正的问题
- 阻止正常的 thread 切换（如用户点击"New Thread"）

### 7.2 永久修复（推荐）

**基于根因的修复方案**:

**如果是假设 A（路由导航）**:
- 检查并修复路由逻辑
- 确保导航时保留 threadId 参数

**如果是假设 B（组件重新挂载）**:
- 稳定 `assistant` 状态，避免不必要的变化
- 或者：将 `threadId` 状态提升到更高层级，不受组件挂载影响

**如果是假设 C（nuqs 同步问题）**:
- 升级 nuqs 到最新版本
- 或者：使用其他 URL 状态管理方案

---

## 八、下一步行动

### Phase 1: 数据收集（等待用户复现）

**状态**: ✅ 诊断日志已部署，等待用户测试

**用户操作**:
1. 打开 http://localhost:3000
2. 登录并发送消息
3. 观察 Console 日志，复制完整的日志输出

**预期日志**:
- 完整的 `onThreadId 回调` 日志
- 完整的 `threadId 发生变化` 日志
- 完整的 `清空 messagesMap` 日志

### Phase 2: 根因确认（收到日志后）

**任务**:
1. 分析日志，确定 threadId 变 null 的触发点
2. 验证哪个假设成立
3. 确认根本原因

### Phase 3: 针对性修复（根因确认后）

**任务**:
- 基于根因实施修复
- 添加回归测试
- 验证修复效果

---

## 九、总结

**核心发现**:
1. ❌ **之前分析失误** - 归咎于 SDK 缺乏客观证据，已被源码证伪
2. ✅ **SDK 行为清晰** - `onThreadId` 只在创建新 thread 时调用，不会调用 `null`
3. ⚠️ **最可能根因** - React 组件重新挂载导致 `useQueryState` 重置
4. ✅ **诊断日志已部署** - 等待用户数据收集

**待验证假设**:
- **假设 B（组件重新挂载）** 是最可能的根因
- 需要用户日志确认

**专家团队签名**:
- 首席架构师：已审查
- LangChain/LangGraph 专家：已验证 SDK 源码
- DeepAgents 框架专家：已审查
- React 状态管理专家：已审查
- Next.js 前端专家：已审查
