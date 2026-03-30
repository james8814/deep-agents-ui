# 🔍 SubAgent 工作日志显示问题诊断指南

**创建日期**: 2026-03-23
**问题类型**: SubAgent 工作日志未显示在右侧边栏
**严重程度**: P2 - 功能性问题
**状态**: 🔍 **等待诊断数据**

---

## 📋 问题描述

用户报告已经看到 "调用 research agent"，但右侧工作面板没有显示 SubAgent 的工作日志输出。

**症状**:
- Console 日志显示消息合并正常
- Tool calls 被捕获（显示 `'human, ai, human, ai, tool, ai, human, ai, tool, tool'`）
- 但右侧边栏工作日志区域为空

---

## 🔧 已添加的调试日志

为了诊断问题，我在以下文件添加了调试日志：

### 1. `src/app/hooks/useChat.ts` (第 343-359 行)

```typescript
// 🔍 调试日志：监控 subagent_logs 变化（修复 ISSUE-003）
const subagentLogsFromStream = stream.values.subagent_logs ?? {};
if (Object.keys(subagentLogsFromStream).length > 0) {
  console.log("[useChat] Received subagent_logs from stream:", {
    count: Object.keys(subagentLogsFromStream).length,
    taskIds: Object.keys(subagentLogsFromStream),
    sample: Object.entries(subagentLogsFromStream)[0], // 第一个任务的日志示例
  });
}
```

**用途**: 检查 Backend 是否返回了 `subagent_logs` 数据

### 2. `src/app/components/WorkPanelV527.tsx` (第 49-56 行)

```typescript
// 🔍 调试日志：检查 subagent_logs 数据
console.log("[WorkPanelV527] subagent_logs 数据:", {
  external: externalSubagentLogs ? Object.keys(externalSubagentLogs) : "undefined",
  context: contextSubagentLogs ? Object.keys(contextSubagentLogs) : "undefined",
  final: Object.keys(subagentLogs),
  sample: Object.entries(subagentLogs)[0], // 第一个任务的日志示例
});
```

**用途**: 检查 WorkPanelV527 组件是否接收到数据

### 3. `src/app/components/WorkPanelV527.tsx` (第 96-129 行)

```typescript
const logsByTaskId = useMemo(() => {
  console.log("[WorkPanelV527] 计算 logsByTaskId:", {
    hasSubagentLogs: Object.keys(subagentLogs).length > 0,
    subagentLogsKeys: Object.keys(subagentLogs),
    hasSubagents: subagents && Object.keys(subagents).length > 0,
    subagentsKeys: subagents ? Object.keys(subagents) : [],
  });

  // ... 分组逻辑 ...

  console.log("[WorkPanelV527] logsByTaskId 计算结果:", {
    resultKeys: Object.keys(result),
    totalLogs: Object.values(result).flat().length,
  });

  return result;
}, [subagentLogs, subagents]);
```

**用途**: 检查日志分组逻辑是否正确

---

## 🧪 验证步骤

### 步骤 1: 确认 Backend 配置

**检查 `.env` 文件** (位于 `pmagent/.env`):

```bash
# 必须设置为 1 启用 SubAgent 日志
DEEPAGENTS_SUBAGENT_LOGGING=1
```

**⚠️ 重要**: 如果修改了 `.env` 文件，**必须重启** LangGraph Server：

```bash
# 停止当前的 LangGraph Server (Ctrl+C)
cd pmagent
langgraph dev --port 2024
```

### 步骤 2: 重启 Frontend 开发服务器

```bash
cd deep-agents-ui
npm run build && NODE_ENV=production npm start
```

或者（清理缓存）：

```bash
cd deep-agents-ui
rm -rf .next* node_modules/.cache && npm run dev
```

### 步骤 3: 硬刷新浏览器

**macOS**: `Cmd + Shift + R`
**Windows/Linux**: `Ctrl + Shift + R`

### 步骤 4: 触发 SubAgent 任务

1. 发送消息触发 SubAgent，例如：`"帮我调研一下最新的 AI 技术趋势"`
2. 等待 Backend 处理（应该看到 "research_agent" 被调用）

### 步骤 5: 检查 Console 日志

打开浏览器 DevTools Console (F12)，查看以下日志：

#### 5.1 Backend 数据流检查

**期望看到的日志**:
```javascript
[useChat] Received subagent_logs from stream: {
  count: 1,  // 或更多
  taskIds: ["call_xxxxx"],  // tool_call_id
  sample: ["call_xxxxx", [...logs]]  // 日志数组
}
```

**如果没有这条日志**:
- ❌ Backend 没有返回 `subagent_logs` 数据
- ✅ 检查 `.env` 文件是否设置了 `DEEPAGENTS_SUBAGENT_LOGGING=1`
- ✅ 确认已重启 LangGraph Server

#### 5.2 WorkPanel 数据接收检查

**期望看到的日志**:
```javascript
[WorkPanelV527] subagent_logs 数据: {
  external: "undefined",
  context: ["call_xxxxx"],  // 或更多
  final: ["call_xxxxx"],
  sample: ["call_xxxxx", [...logs]]
}
```

**如果 `final` 为空数组**:
- ❌ 数据传递失败
- ✅ 检查 `useChatContext` 是否正确提供 `subagent_logs`

#### 5.3 日志分组检查

**期望看到的日志**:
```javascript
[WorkPanelV527] 计算 logsByTaskId: {
  hasSubagentLogs: true,
  subagentLogsKeys: ["call_xxxxx"],
  hasSubagents: true,  // 或 false
  subagentsKeys: ["subagent_xxxxx"]  // 或 []
}

[WorkPanelV527] logsByTaskId 计算结果: {
  resultKeys: ["call_xxxxx"],  // 或 ["todo_id"]
  totalLogs: 5  // 日志条目数量
}
```

**如果 `resultKeys` 为空**:
- ❌ 日志分组逻辑有问题
- ✅ 需要检查 `subagents` 状态和 `subagentLogs` 数据结构

---

## 🔍 可能的根因分析

### 根因 1: Backend 未启用 SubAgent 日志

**症状**:
- Console 中没有 `[useChat] Received subagent_logs from stream` 日志
- 或 `count: 0`, `taskIds: []`

**解决方案**:
1. 检查 `pmagent/.env` 文件：`DEEPAGENTS_SUBAGENT_LOGGING=1`
2. **重启** LangGraph Server
3. 重新触发 SubAgent 任务

### 根因 2: Frontend 未接收数据

**症状**:
- `[useChat] Received subagent_logs from stream` 有数据
- `[WorkPanelV527] subagent_logs 数据` 中 `final: []`

**解决方案**:
1. 检查 `ChatProvider` 是否正确传递 `subagent_logs`
2. 确认 `useChatContext()` 返回的数据

### 根因 3: 日志分组逻辑问题

**症状**:
- `[WorkPanelV527] subagent_logs 数据` 有数据
- `[WorkPanelV527] logsByTaskId 计算结果` 中 `resultKeys: []`

**解决方案**:
1. 检查 `subagents` 状态是否存在
2. 分析 `subagentLogs` 的数据结构
3. 可能需要调整分组逻辑

---

## 📊 诊断数据收集

**请提供以下信息**:

1. **Console 日志**（复制粘贴）:
   - `[useChat] Received subagent_logs from stream`
   - `[WorkPanelV527] subagent_logs 数据`
   - `[WorkPanelV527] 计算 logsByTaskId`
   - `[WorkPanelV527] logsByTaskId 计算结果`

2. **Backend 配置确认**:
   ```bash
   # 确认 .env 配置
   cat pmagent/.env | grep DEEPAGENTS_SUBAGENT_LOGGING
   ```

3. **LangGraph Server 重启确认**:
   - 是否在修改 `.env` 后重启了 Server？（是/否）

---

## 🎯 下一步行动

根据诊断数据，我将采取以下行动：

- **如果是根因 1**: 指导用户正确配置 Backend 环境变量
- **如果是根因 2**: 检查 ChatProvider 和 useChatContext 的实现
- **如果是根因 3**: 调整 WorkPanelV527 的日志分组逻辑

---

## 📝 修复历史

| 日期 | 修复内容 | 文件 | 状态 |
|------|---------|------|------|
| 2026-03-23 | 添加调试日志 | useChat.ts, WorkPanelV527.tsx | ✅ 完成 |
| - | 等待诊断数据 | - | ⏳ 进行中 |

---

**创建人**: AI Frontend Architect
**状态**: 🔍 **等待用户提供 Console 日志**
**下一步**: 根据诊断数据定位具体根因
