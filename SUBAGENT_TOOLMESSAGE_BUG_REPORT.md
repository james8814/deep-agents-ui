# SubAgent ToolMessage 配对丢失 Bug 报告

## 问题摘要

**Bug 标题**: SubAgent 执行后返回 ToolMessage 时，LangGraph Server 流式传输中丢失对应的 AIMessage(tool_calls)，导致 OpenAI API 返回 BadRequestError

**影响范围**: 所有使用 DeepAgents SubAgent 的应用

**错误信息**:
```
openai.BadRequestError: Error code: 400 - {
  'error': {
    'message': "Messages with role 'tool' must be a response to a preceding message with 'tool_calls'",
    'type': 'invalid_request_error'
  }
}
```

---

## 问题复现

### 测试环境
- LangGraph Server: `langgraph-cli[inmem]` (langgraph-api=0.7.68, langgraph_runtime_inmem=0.26.0)
- DeepAgents: v0.4.10 (本地开发版本)
- 测试文件: `deep-agents-ui/tests/e2e-subagent-trigger.spec.ts`

### 复现步骤

1. 启动 LangGraph Server:
```bash
cd pmagent && langgraph dev --port 2024
```

2. 启动前端:
```bash
cd deep-agents-ui && npm run dev
```

3. 发送触发 SubAgent 的消息:
```
"请使用 research_agent 搜索一下 LangChain 框架的最新特性"
```

4. 观察错误:
```
event: error
data: {"error":"BadRequestError","message":"An internal error occurred"}
```

### 对比测试

**普通对话 (不触发 SubAgent)**: ✅ 正常工作
**SubAgent 触发**: ❌ 报错

---

## 根本原因分析

### 问题定位

通过服务器日志分析，问题出在 DeepAgents 框架的 `_return_command_with_state_update` 函数：

**文件路径**: `pmagent/third_party/deepagents/deepagents/middleware/subagents.py`

**问题代码** (第 528-532 行):
```python
def _return_command_with_state_update(result: dict, tool_call_id: str) -> Command:
    # ... 省略验证代码 ...

    # 问题行 528: 从 SubAgent 返回消息中提取文本
    message_text = result["messages"][-1].text.rstrip() if result["messages"][-1].text else ""

    # 问题行 532: 创建 ToolMessage 返回给主 Agent
    return Command(
        update={
            **state_update,
            "messages": [ToolMessage(message_text, tool_call_id=tool_call_id)],
        }
    )
```

### 问题机制

#### 1. 正常消息流 (非 SubAgent)
```
用户消息 → MODEL 节点 → AIMessage(tool_calls=[...]) → ToolNode → ToolMessage → MODEL 节点 → AIMessage(响应)
```
消息历史始终配对完整。

#### 2. SubAgent 消息流 (问题路径)
```
用户消息 → MODEL 节点 → AIMessage(tool_calls=[task()])
  → SubAgentMiddleware (invoke subagent)
  → SubAgent 执行完成，返回 {"messages": [...]}
  → _return_command_with_state_update 创建 ToolMessage
  → 流式传输给 MODEL 节点
  ❌ 问题：ToolMessage 被发送到 OpenAI API，但对应的 AIMessage(tool_calls) 已在前一个 stream chunk 中发送
```

### 技术细节

#### LangGraph Server 流式传输行为

LangGraph Server 使用 WebSocket 流式传输状态更新：

```javascript
// Stream chunk 1: MODEL 节点输出
{
  "messages": [{
    "role": "assistant",
    "content": "",
    "tool_calls": [{
      "name": "task",
      "args": {"description": "...", "subagent_type": "research_agent"},
      "id": "call_00_gYgzqIRbMV5vi7Xn4q9H0MnZ"
    }]
  }]
}

// Stream chunk 2: SubAgentMiddleware 返回
{
  "messages": [{
    "role": "tool",
    "content": "SubAgent 执行结果",
    "tool_call_id": "call_00_gYgzqIRbMV5vi7Xn4q9H0MnZ"
  }]
}

// Stream chunk 3: 下一次 MODEL 调用
// OpenAI API 收到消息历史: [..., ToolMessage(...)]
// 错误：没有对应的 AIMessage(tool_calls) 在前
```

#### DeepAgents 框架问题

**核心问题**: `_return_command_with_state_update` 只返回 `ToolMessage`，但 LangGraph Server 的流式传输机制导致：

1. **第一个 chunk**: AIMessage(tool_calls) 已发送给 LLM
2. **第二个 chunk**: ToolMessage 发送给 LLM
3. **第三个 chunk**: LLM 收到 ToolMessage 但没有看到 preceding AIMessage(tool_calls)

这是因为 LangGraph Server 在每个 stream chunk 中只发送**增量更新**，而不是完整的消息历史。

---

## 为什么必须修改 DeepAgents 框架

### 方案对比

| 方案 | 描述 | 可行性 | 原因 |
|------|------|--------|------|
| A. 应用层拦截 | 在 PMAgent 中添加 middleware 拦截 SubAgent 返回 | ❌ 不可行 | SubAgentMiddleware 内部处理，应用层无法拦截 |
| B. SubAgent 配置 | 修改 SubAgent profile.yaml 配置 | ❌ 不可行 | 配置无法改变返回消息类型 |
| C. 修改 DeepAgents | 修改 `_return_command_with_state_update` 函数 | ✅ 唯一可行 | 直接控制返回消息类型 |

### 应用层无法修复的原因

1. **SubAgentMiddleware 是内部 middleware**，在 `create_deep_agent()` 内部创建
2. **`task` 工具由框架自动生成**，应用层无法重写返回类型
3. **`Command` 对象在 middleware 内部创建**，应用层无法拦截

### 需要的修改

#### 修改位置：`deepagents/middleware/subagents.py`

**方案 1: 返回 AIMessage 而非 ToolMessage** (推荐)

```python
def _return_command_with_state_update(result: dict, tool_call_id: str) -> Command:
    # ... 省略验证代码 ...

    # 从 SubAgent messages 中提取最后一条消息的内容
    # SubAgent 最后一条消息通常是 AIMessage(总结报告)
    last_message = result["messages"][-1]

    # 如果是 AIMessage，直接使用其 content
    if isinstance(last_message, AIMessage):
        message_text = last_message.content.rstrip() if last_message.content else ""
    else:
        # 如果是 ToolMessage，提取 content
        message_text = last_message.text.rstrip() if hasattr(last_message, 'text') and last_message.text else ""

    return Command(
        update={
            **state_update,
            # 关键修改：返回 AIMessage 而非 ToolMessage
            # 这样 LangGraph Server 会将其作为正常的 AI 响应流式传输
            "messages": [AIMessage(content=message_text)],
        }
    )
```

**方案 2: 返回空消息列表** (备选)

```python
def _return_command_with_state_update(result: dict, tool_call_id: str) -> Command:
    # SubAgent 的 messages 已经通过 state_update 传递
    # 不需要额外返回 ToolMessage
    return Command(
        update={
            **state_update,
            # 不返回 messages，让 LangGraph 自动处理
        }
    )
```

**方案 2 的问题**: 可能导致主 Agent 不知道 SubAgent 已执行完成。

---

## 影响评估

### 当前影响

- SubAgent 功能完全不可用
- E2E 测试失败率：50% (SubAgent 相关测试全部失败)
- 影响所有 6 个 SubAgent: research_agent, analysis_agent, design_agent, writing_agent, document_agent, reflection_agent

### 修复后的预期行为

1. SubAgent 执行完成后，主 Agent 收到 AIMessage 而非 ToolMessage
2. 消息历史保持配对完整
3. OpenAI API 不再返回 BadRequestError
4. 流式 UI 正确显示 SubAgent 执行结果

---

## 验证步骤

修复后，运行以下测试验证：

```bash
# 1. 单元测试
cd pmagent && pytest tests/test_e2e.py::TestSubAgentExecution -v

# 2. Playwright E2E 测试
cd deep-agents-ui && npx playwright test tests/e2e-subagent-trigger.spec.ts

# 3. 手动测试
# 访问 http://localhost:3000，发送:
# "请使用 research_agent 搜索 LangChain 框架的最新特性"
```

---

## 附加说明

### 相关代码位置

| 文件 | 行号 | 作用 |
|------|------|------|
| `deepagents/middleware/subagents.py` | 508-534 | `_return_command_with_state_update` 函数 |
| `deepagents/middleware/subagents.py` | 560 | `task()` 函数调用 |
| `deepagents/middleware/subagents.py` | 578 | `atask()` 异步版本 |

### 测试日志

完整错误日志:
```
event: values
data: {"messages":[{"content":"我将使用 research_agent...","tool_calls":[{"name":"update_opdca_stage",...,"id":"call_00_gYgzqIRbMV5vi7Xn4q9H0MnZ"}]}...

event: values
data: {"messages":[{"content":"__OPDCA_STAGE_UPDATE__:...","tool_call_id":"call_00_gYgzqIRbMV5vi7Xn4q9H0MnZ"}]...

event: error
data: {"error":"BadRequestError","message":"An internal error occurred"}
```

---

## 总结

**问题根因**: DeepAgents 框架 `_return_command_with_state_update` 函数返回 ToolMessage，但 LangGraph Server 流式传输机制导致 ToolMessage 与 AIMessage(tool_calls) 配对丢失。

**修复位置**: `deepagents/middleware/subagents.py` 第 532 行

**修复方案**: 将 `ToolMessage(message_text, tool_call_id=tool_call_id)` 改为 `AIMessage(content=message_text)`

**修复优先级**: P0 (阻塞 SubAgent 功能)
