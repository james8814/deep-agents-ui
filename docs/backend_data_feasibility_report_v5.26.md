# v5.26 右侧边栏设计 - 后端数据可行性调查报告

**调查日期**: 2026-03-15
**调查人**: 后端架构师
**状态**: 已完成
**目的**: 评估 v5.26 右侧边栏 UI 设计所需的数据是否在 LangGraph stream 中真正可用

---

## 执行摘要

| 设计需求 | 可行性 | 风险等级 | 需要修改 |
|----------|--------|----------|----------|
| OPDCA 阶段数据 | ✅ 可行 | 低 | 无 |
| SubAgent 日志 (tool_input/tool_output) | ⚠️ 部分可行 | 中 | 需启用环境变量 + 验证 |
| Todos 与 Step Group 映射 | ✅ 可行 | 低 | 无 |
| Files 元数据 (created_at/modified_at) | ⚠️ 类型不匹配 | 中 | 需前端类型更新 |
| 进度百分比计算 | ✅ 可行 | 低 | 无（前端计算） |

**总体结论**: **设计可行，但需要解决 3 个中等问题**

---

## 一、OPDCA 阶段数据调查

### 1.1 后端实现验证

**来源文件**: `/pmagent/src/state.py` (lines 50-73, 147)

```python
class OPDCAStage:
    """OPDCA 阶段常量"""
    OBSERVE = "observe"
    PLAN = "plan"
    DO = "do"
    CHECK = "check"
    ADAPT = "adapt"

class PMAgentState(TypedDict, total=False):
    opdca_stage: str  # 使用 str 确保序列化兼容
```

### 1.2 阶段更新机制

**来源文件**: `/pmagent/src/guards.py` (lines 208-243)

```python
def _detect_stage_update(self, state: PMAgentState) -> str | None:
    """检测消息历史中的 OPDCA 阶段更新"""
    messages = state.get("messages", [])
    # ...
    for msg in messages:
        if isinstance(msg, ToolMessage):
            parsed = parse_stage_update(content)
            if parsed:
                latest_stage = parsed["stage"]
    return latest_stage
```

**更新流程**:
1. Agent 调用 `update_opdca_stage` 工具
2. 工具返回特殊标记 `__OPDCA_STAGE_UPDATE__:{"stage": "plan"}`
3. OPDCAGuardMiddleware 在 `before_agent()` 中解析标记
4. 自动更新 `state["opdca_stage"]`

### 1.3 前端消费验证

**来源文件**: `/deep-agents-ui/src/app/hooks/useChat.ts` (lines 52-64)

**当前定义**:
```typescript
export type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
  subagent_logs?: Record<string, LogEntry[]>;
  // ⚠️ 缺少 opdca_stage 字段声明
};
```

**返回值** (lines 345-366):
```typescript
return {
  stream,
  todos: stream.values.todos ?? [],
  files: filesFromStream,
  subagent_logs: stream.values.subagent_logs ?? {},
  // ⚠️ 未返回 opdca_stage
};
```

### 1.4 可行性结论

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 后端状态定义 | ✅ 存在 | `state["opdca_stage"]` 已实现 |
| 序列化兼容 | ✅ 通过 | 使用 str 类型，LangGraph Server 可序列化 |
| 自动更新机制 | ✅ 正常 | OPDCAGuardMiddleware 处理 |
| Stream 传输 | ⚠️ 需验证 | 代码显示存在，但前端未显式声明 |

**结论**: ✅ **可行**

**建议修改**:
1. 前端 StateType 添加 `opdca_stage?: string` 字段声明
2. useChat 返回值添加 `opdca_stage: stream.values.opdca_stage`

---

## 二、SubAgent 日志结构调查

### 2.1 后端日志结构

**来源文件**: `/pmagent/src/state.py` (lines 75-94)

```python
def _subagent_logs_reducer(
    left: dict[str, list[dict]] | None,
    right: dict[str, list[dict]] | None,
) -> dict[str, list[dict]]:
    """SubAgent 工作日志合并 reducer
    按 tool_call_id 分桶存储
    """
    # 按 task_id 合并日志条目
```

**来源文件**: `/pmagent/src/state.py` (lines 140-144)

```python
subagent_logs: Annotated[
    NotRequired[dict[str, list[dict]]],
    _subagent_logs_reducer,
]
```

### 2.2 前端 LogEntry 定义

**来源文件**: `/deep-agents-ui/src/app/hooks/useChat.ts` (lines 43-50)

```typescript
export type LogEntry = {
  type: "tool_call" | "tool_result";
  tool_name?: string;
  tool_input?: Record<string, unknown>;  // ✅ 设计需求
  tool_output?: string;                   // ✅ 设计需求
  tool_call_id?: string;
  status?: "success" | "error";
};
```

### 2.3 DeepAgents 原生日志格式

**来源**: `deepagents.middleware.subagents` (DeepAgents 框架)

根据 E2E 验收报告 (`E2E_ACCEPTANCE_REPORT_2026-03-15.md`):
- 代码实现完整
- 环境变量 `DEEPAGENTS_SUBAGENT_LOGGING=1` 已配置
- **待验证**: Command 中的 subagent_logs 是否正确传递到主线程状态

### 2.4 设计需求对比

| 设计需求字段 | LogEntry 字段 | 匹配状态 |
|--------------|---------------|----------|
| 工具名 | `tool_name` | ✅ 匹配 |
| 输入参数 | `tool_input` | ✅ 匹配 |
| 输出结果 | `tool_output` | ✅ 匹配 |
| 执行耗时 | ⚠️ 缺失 | ❌ 需计算或扩展 |

### 2.5 可行性结论

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 字段定义匹配 | ✅ 匹配 | tool_name/input/output 全部存在 |
| 数据生成机制 | ⚠️ 需启用 | DEEPAGENTS_SUBAGENT_LOGGING=1 |
| Stream 传输 | ⚠️ 待验证 | 验收报告标记"待验证" |
| 耗时数据 | ❌ 缺失 | 需扩展或前端计算 |

**结论**: ⚠️ **部分可行**

**风险**:
1. 日志可能未正确传递到前端（需实际测试验证）
2. 耗时数据缺失，设计稿显示的 "1.2s" 等暂不可用

**建议**:
1. **立即验证**: 在前端打印 `stream.values.subagent_logs` 确认数据到达
2. **短期方案**: 耗时显示为 "-" 或计算工具调用与结果的时间差
3. **长期方案**: 后端扩展 LogEntry 添加 `elapsed_time` 字段

---

## 三、Todos 数据结构调查

### 3.1 后端结构

**来源**: DeepAgents 框架 `TodoListMiddleware`

后端使用 DeepAgents 内置的 todos 管理，结构通过 stream 传输。

### 3.2 前端结构

**来源文件**: `/deep-agents-ui/src/app/types/types.ts` (lines 45-50)

```typescript
export interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  updatedAt?: Date;
}
```

### 3.3 设计需求映射

**设计文档要求** (v5.26_RIGHT_SIDEBAR_DESIGN_REVISED.md lines 166-178):

```
Step 数据:
  - 标题: todos[].content 或 自定义步骤名
  - 状态: todos[].status 映射 (in_progress → active, completed → done)
  - SubAgent: subagents[] 中匹配的 agent
  - 工具调用: subagent_logs[agent_id]
```

**状态映射表**:

| TodoItem.status | 设计 Step 状态 | 前端显示 |
|-----------------|----------------|----------|
| pending | pending | 待执行 |
| in_progress | active | 进行中（脉冲动画） |
| completed | done | 已完成（绿色勾） |

### 3.4 可行性结论

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 字段完整性 | ✅ 完整 | id/content/status 全部存在 |
| 状态映射 | ✅ 可映射 | 3 状态完美对应设计 3 状态 |
| Stream 传输 | ✅ 正常 | useChat 已返回 todos |
| 时间戳 | ✅ 可选 | updatedAt 支持排序 |

**结论**: ✅ **可行**

**实现建议**:
- 使用 `todos.filter(t => t.status === "in_progress")` 找到当前步骤
- 使用 `todos.filter(t => t.status === "completed").length / todos.length` 计算进度

---

## 四、Files 元数据调查

### 4.1 后端 FileData 结构

**来源文件**: `/pmagent/src/state.py` (lines 30-36)

```python
class FileData(TypedDict):
    content: list[str]       # 文件内容（行列表）
    created_at: str          # ISO 8601 创建时间
    modified_at: str         # ISO 8601 修改时间
```

**State 定义** (line 138):
```python
files: Annotated[NotRequired[dict[str, FileData]], _file_data_reducer]
```

### 4.2 前端类型定义

**来源文件**: `/deep-agents-ui/src/app/hooks/useChat.ts` (line 55)

```typescript
files: Record<string, string>;  // ⚠️ 类型不匹配！
```

**实际使用** (lines 335-343):
```typescript
const filesFromStream = stream.values.files ?? {};
if (Object.keys(filesFromStream).length > 0) {
  console.log("[useChat] Received files from stream:", {
    count: Object.keys(filesFromStream).length,
    files: Object.keys(filesFromStream),
  });
}
```

### 4.3 类型不匹配分析

| 后端实际类型 | 前端声明类型 | 匹配状态 |
|--------------|--------------|----------|
| `dict[str, FileData]` | `Record<string, string>` | ❌ 不匹配 |
| FileData.content: list[str] | string | ❌ 不匹配 |
| FileData.created_at: str | - | ❌ 缺失 |
| FileData.modified_at: str | - | ❌ 缺失 |

**实际传输的数据结构**:
```json
{
  "/workspace/prd.md": {
    "content": ["# PRD", "", "## 背景", "..."],
    "created_at": "2026-03-15T10:30:00Z",
    "modified_at": "2026-03-15T10:35:00Z"
  }
}
```

### 4.4 设计需求

**设计文档要求** (v5.26_RIGHT_SIDEBAR_DESIGN_REVISED.md):
- 文件列表显示文件名
- 需要显示创建时间（设计未明确要求，但后端提供）

### 4.5 可行性结论

| 检查项 | 状态 | 备注 |
|--------|------|------|
| Stream 传输 | ✅ 正常 | files 字段已传输 |
| 元数据存在 | ✅ 存在 | created_at/modified_at 后端已实现 |
| 前端类型 | ❌ 错误 | 声明为 string，实际为 FileData |
| 前端消费 | ⚠️ 需修改 | 需要处理 FileData 对象 |

**结论**: ⚠️ **部分可行**

**建议修改**:
```typescript
// 1. 更新 StateType 定义
export type StateType = {
  // ...
  files: Record<string, FileData>;  // 修正类型
};

// 2. 添加 FileData 接口
export interface FileData {
  content: string[];
  created_at: string;    // ISO 8601
  modified_at: string;   // ISO 8601
}

// 3. 使用时
const file = files["/workspace/prd.md"];
const content = file.content.join("\n");
const modifiedAt = new Date(file.modified_at);
```

---

## 五、综合风险评估

### 5.1 高风险项（需立即解决）

| 风险 | 影响 | 解决方案 |
|------|------|----------|
| subagent_logs 传递未验证 | 工作日志无法显示 | 实际测试验证数据流 |

### 5.2 中风险项（需短期解决）

| 风险 | 影响 | 解决方案 |
|------|------|----------|
| files 类型不匹配 | 编译警告，运行时错误 | 更新前端类型定义 |
| opdca_stage 未显式声明 | 依赖隐式行为 | 显式添加到 StateType |
| 工具耗时缺失 | UI 显示 "-" | 前端计算或后端扩展 |

### 5.3 低风险项（可延后）

| 风险 | 影响 | 解决方案 |
|------|------|----------|
| 迷你状态条实现 | 次要功能 | 按设计稿实现即可 |

---

## 六、后端修改建议

### 6.1 无需修改（后端已完备）

- ✅ OPDCA 阶段状态（已实现，传输正常）
- ✅ Todos 管理（DeepAgents 框架原生支持）
- ✅ Files 元数据（StateBackend 已生成 created_at/modified_at）
- ✅ SubAgent 日志生成（代码已实现，需验证传输）

### 6.2 可选增强

**建议 1: 添加工具耗时字段**

文件: `/pmagent/src/state.py` 或 DeepAgents 框架

```python
class LogEntry(TypedDict):
    type: str  # "tool_call" | "tool_result"
    tool_name: str
    tool_input: dict
    tool_output: str
    tool_call_id: str
    status: str  # "success" | "error"
    elapsed_time: float  # 新增：执行耗时（秒）
```

**建议 2: 验证 subagent_logs 传输**

在 DeepAgents SubAgentMiddleware 中确认:
- `_extract_log_entries()` 正确提取日志
- `_return_command_with_state_update()` 正确写入 Command
- LangGraph 正确合并 Command 到主线程状态

---

## 七、前端修改建议

### 7.1 必须修改

**修改 1: StateType 扩展**

文件: `/deep-agents-ui/src/app/hooks/useChat.ts`

```typescript
// 当前 (line 52-64)
export type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;  // ❌ 错误
  subagent_logs?: Record<string, LogEntry[]>;
  subagents?: Record<string, any>;
  // 缺少 opdca_stage
};

// 修改后
export type StateType = {
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, FileData>;  // ✅ 修正
  subagent_logs?: Record<string, LogEntry[]>;
  subagents?: Record<string, any>;

  // OPDCA 工作流字段
  opdca_stage?: "observe" | "plan" | "do" | "check" | "adapt";
  current_task_id?: string;
  rework_count?: number;
};

// 新增 FileData 接口
export interface FileData {
  content: string[];
  created_at: string;
  modified_at: string;
}
```

**修改 2: useChat 返回值**

文件: `/deep-agents-ui/src/app/hooks/useChat.ts`

```typescript
// 当前 (lines 345-366)
return {
  stream,
  todos: stream.values.todos ?? [],
  files: filesFromStream,
  // ...
};

// 修改后
return {
  stream,
  todos: stream.values.todos ?? [],
  files: filesFromStream,
  opdca_stage: stream.values.opdca_stage,  // ✅ 新增
  // ...
};
```

### 7.2 建议修改

**建议 1: 验证日志数据**

在开发环境添加调试日志:
```typescript
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Debug] subagent_logs:', stream.values.subagent_logs);
    console.log('[Debug] opdca_stage:', stream.values.opdca_stage);
  }
}, [stream.values.subagent_logs, stream.values.opdca_stage]);
```

**建议 2: 耗时计算（前端降级方案）**

```typescript
// 在 LogEntry 处理时计算耗时
function calculateElapsedTime(logs: LogEntry[]): number {
  let totalElapsed = 0;
  const callTimes = new Map<string, number>();

  logs.forEach(entry => {
    if (entry.type === 'tool_call') {
      callTimes.set(entry.tool_call_id!, Date.now());
    } else if (entry.type === 'tool_result') {
      const startTime = callTimes.get(entry.tool_call_id!);
      if (startTime) {
        totalElapsed += (Date.now() - startTime) / 1000;
      }
    }
  });

  return totalElapsed;
}
```

---

## 八、验证测试建议

### 8.1 数据流验证脚本

创建测试脚本 `test_sidebar_data_flow.ts`:

```typescript
// 在浏览器控制台运行
const stream = window.__LANGGRAPH_STREAM__;

console.group('v5.26 右侧边栏数据验证');
console.log('opdca_stage:', stream.values.opdca_stage);
console.log('todos:', stream.values.todos);
console.log('files:', stream.values.files);
console.log('subagent_logs:', stream.values.subagent_logs);
console.log('subagents:', stream.values.subagents);
console.groupEnd();

// 验证结果
const checks = {
  'opdca_stage 存在': !!stream.values.opdca_stage,
  'todos 是数组': Array.isArray(stream.values.todos),
  'files 是对象': typeof stream.values.files === 'object',
  'subagent_logs 存在': !!stream.values.subagent_logs,
};

console.table(checks);
```

### 8.2 E2E 测试用例

添加到 `/pmagent/tests/test_e2e.py`:

```python
def test_right_sidebar_data_availability():
    """测试右侧边栏所需数据的可用性"""
    agent = create_product_coach()

    # 模拟完整工作流
    result = agent.invoke({
        "messages": [{"role": "user", "content": "帮我分析飞书的竞品"}],
    })

    # 验证数据字段
    assert "opdca_stage" in result, "opdca_stage 应存在"
    assert result["opdca_stage"] in ["observe", "plan", "do", "check", "adapt"]

    assert "todos" in result, "todos 应存在"
    assert isinstance(result["todos"], list)

    assert "files" in result, "files 应存在"
    assert isinstance(result["files"], dict)

    # 验证 files 结构
    for path, file_data in result["files"].items():
        assert "content" in file_data, "files 应包含 content"
        assert "created_at" in file_data, "files 应包含 created_at"
        assert "modified_at" in file_data, "files 应包含 modified_at"

    # 验证 subagent_logs（如果启用了日志）
    if os.environ.get("DEEPAGENTS_SUBAGENT_LOGGING") == "1":
        assert "subagent_logs" in result, "subagent_logs 应存在"
```

---

## 九、总结

### 9.1 最终结论

**v5.26 右侧边栏设计在数据层面是可行的**，但需要解决以下问题：

1. **必须解决**（阻塞实施）:
   - 前端 StateType 类型定义更新（files 和 opdca_stage）
   - 验证 subagent_logs 实际传输情况

2. **建议解决**（影响体验）:
   - 工具耗时数据（暂时显示 "-"，后续扩展）

3. **无需后端修改**:
   - 所有数据字段后端已实现
   - Stream 传输机制正常

### 9.2 工作量估算

| 任务 | 工时 | 优先级 |
|------|------|--------|
| StateType 类型更新 | 0.5h | P0 |
| useChat 返回值更新 | 0.5h | P0 |
| subagent_logs 验证 | 1h | P0 |
| FileData 接口定义 | 0.5h | P0 |
| 耗时计算（前端降级） | 2h | P1 |
| E2E 测试用例 | 1h | P1 |

**总计**: 5.5h（P0: 2.5h, P1: 3h）

### 9.3 下一步行动

1. **立即执行**: 前端类型定义更新（0.5h）
2. **验证测试**: 在开发环境确认 subagent_logs 传递（1h）
3. **UI 实现**: 按设计文档实施右侧边栏（19-25h，设计文档估算）
4. **集成测试**: E2E 测试覆盖（1h）

---

**报告完成时间**: 2026-03-15
**下次审查**: 前端类型更新完成后
