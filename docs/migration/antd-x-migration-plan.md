# Ant Design X 2.0 迁移方案

> **版本**: v2.1
> **创建日期**: 2026-02-16
> **最后更新**: 2026-02-16
> **状态**: 第二轮专家评审后修订版

## 目录

1. [概述](#1-概述)
2. [架构对比](#2-架构对比)
3. [依赖变更](#3-依赖变更)
4. [分阶段实施计划](#4-分阶段实施计划)
5. [核心实现：LangGraphChatProvider](#5-核心实现langgraphchatprovider)
6. [组件迁移详情](#6-组件迁移详情)
7. [特殊功能迁移](#7-特殊功能迁移)
8. [样式与主题](#8-样式与主题)
9. [测试与验证](#9-测试与验证)
10. [风险与缓解](#10-风险与缓解)
11. [时间线与里程碑](#11-时间线与里程碑)
12. [附录](#12-附录)

---

## 1. 概述

### 1.1 迁移目标

将 deep-agents-ui 从当前的自定义组件实现迁移到基于 **Ant Design X 2.0** 的实现，以获得：

- **开箱即用的 AI 聊天组件**：Bubble.List、Sender、Attachments 等
- **流式 Markdown 渲染**：优化的流式渲染引擎（XMarkdown）
- **思维链展示**：ThoughtChain 组件
- **长期维护收益**：社区支持、持续更新

### 1.2 迁移原则

| 原则 | 说明 |
|------|------|
| **渐进式迁移** | 每个阶段独立可验证，不进行大爆炸式重写 |
| **保持功能完整** | 迁移过程中不丢失现有功能 |
| **接口向后兼容** | 保留现有 useChat hook 接口，内部重构 |
| **最小化风险** | 每阶段完成后进行充分测试 |
| **保留核心集成** | LangGraph SDK 集成保持不变 |

### 1.3 迁移范围

| 组件 | 迁移策略 | 优先级 | 风险 |
|------|---------|--------|------|
| ChatMessage | → Bubble.List | P0 | 中 |
| 输入区 | → Sender | P0 | 低 |
| FileUploadZone | → Attachments | P1 | 低 |
| ThreadList | → Conversations | P2 | 低 |
| SubAgentIndicator | → ThoughtChain | P1 | 低 |
| MarkdownContent | → XMarkdown | P1 | 低 |
| ContextPanel | 保留（自定义） | P2 | - | 不迁移 |
| DeliveryCard | 保留（自定义） | P2 | - | 不迁移 |
| ToolCallBox | 自定义 Bubble footer | 重构 | 高 | 待迁移 |
| Debug Mode 功能 | 保持（接口兼容） | P0 | 高 | 不迁移 |

### 1.4 迁移策略：Feature Flag

为支持渐进式迁移和平滑回滚，引入 Feature Flag 机制：

```typescript
// src/lib/featureFlags.ts

export const FEATURE_FLAGS = {
  // 控制是否使用 Ant Design X 组件
  USE_ANTDX_MESSAGE_LIST: false,  // Phase 1 完成后设为 true
  USE_ANTDX_SENDER: false,         // Phase 2 完成后设为 true
  USE_ANTDX_THREAD_LIST: false,    // Phase 3 完成后设为 true
  USE_ANTDX_MARKDOWN: false,       // Phase 3 完成后设为 true
} as const;

// 可通过 URL 参数覆盖（用于测试）
export function useFeatureFlag(flag: keyof typeof FEATURE_FLAGS): boolean {
  const [searchParams] = useSearchParams();

  // URL 参数优先：?useAntdxMessageList=true
  const urlValue = searchParams.get(flag.replace(/_/g, '').toLowerCase());
  if (urlValue !== null) {
    return urlValue === 'true';
  }

  // 默认值
  return FEATURE_FLAGS[flag];
}
```

使用示例：
```typescript
// ChatInterface.tsx
const useAntdxMessageList = useFeatureFlag('USE_ANTDX_MESSAGE_LIST');

// 根据开关选择组件
{useAntdxMessageList ? (
  <AntdXMessageList ... />
) : (
  <ChatMessage ... />
)}
```

### 1.5 不迁移的内容

| 功能 | 原因 |
|------|------|
| ContextPanel | Ant Design X 无对应组件，业务定制 |
| DeliveryCard | 业务定制组件 |
| ExecutionStatusBar | 业务定制组件 |
| ConfigDialog | 保持现有实现 |
| nuqs URL 状态 | 保持现有实现 |

---

## 2. 架构对比

### 2.1 当前架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         page.tsx                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    ClientProvider                         │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │                   ChatProvider                        ││    │
│  │  │  (useStream from @langchain/langgraph-sdk/react)     ││    │
│  │  │  ┌─────────────────────────────────────────────────┐││    │
│  │  │  │               ChatInterface                      │││    │
│  │  │  │  ┌─────────────────────────────────────────────┐│││    │
│  │  │  │  │  ChatMessage[] (自定义)                      ││││    │
│  │  │  │  │    ├─ MarkdownContent                       ││││    │
│  │  │  │  │    ├─ ToolCallBox                           ││││    │
│  │  │  │  │    └─ SubAgentIndicator                     ││││    │
│  │  │  │  └─────────────────────────────────────────────┘│││    │
│  │  │  │  ┌─────────────────────────────────────────────┐│││    │
│  │  │  │  │  Input Area (自定义)                         ││││    │
│  │  │  │  │    ├─ FileUploadZone                        ││││    │
│  │  │  │  │    └─ textarea + buttons                    ││││    │
│  │  │  │  └─────────────────────────────────────────────┘│││    │
│  │  │  └─────────────────────────────────────────────────┘││    │
│  │  └─────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 目标架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         page.tsx                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    ClientProvider                         │    │
│  │  ┌─────────────────────────────────────────────────────┐│    │
│  │  │         XProvider (Ant Design X 全局配置)            ││    │
│  │  │  ┌─────────────────────────────────────────────────┐││    │
│  │  │  │    ChatProvider (重构，保持接口兼容)              │││    │
│  │  │  │    ├─ useStream (保留 LangGraph SDK)             │││    │
│  │  │  │    └─ 消息转换层 (LangGraph → Ant Design X)      │││    │
│  │  │  │  ┌─────────────────────────────────────────────┐│││    │
│  │  │  │  │              ChatInterface                   ││││    │
│  │  │  │  │  ┌─────────────────────────────────────────┐││││    │
│  │  │  │  │  │  Bubble.List (@ant-design/x)             │││││    │
│  │  │  │  │  │    ├─ Bubble (role: user/ai/system)     │││││    │
│  │  │  │  │  │    │    ├─ XMarkdown (内容渲染)          │││││    │
│  │  │  │  │  │    │    ├─ ToolCallFooter (自定义)       │││││    │
│  │  │  │  │  │    │    └─ ThoughtChain (子任务)         │││││    │
│  │  │  │  │  └─────────────────────────────────────────┘││││    │
│  │  │  │  │  ┌─────────────────────────────────────────┐││││    │
│  │  │  │  │  │  Sender (@ant-design/x)                  │││││    │
│  │  │  │  │  │    ├─ Sender.Header (Attachments)       │││││    │
│  │  │  │  │  │    └─ Actions (发送/停止)                │││││    │
│  │  │  │  │  └─────────────────────────────────────────┘││││    │
│  │  │  │  └─────────────────────────────────────────────┘│││    │
│  │  │  └─────────────────────────────────────────────────┘││    │
│  │  └─────────────────────────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 关键设计决策

#### 决策 1：保留 useStream，不使用 useXChat

**原因**：
- LangGraph SDK 的 `useStream` 已处理 WebSocket 连接、状态管理
- Ant Design X 的 `useXChat` 设计用于 OpenAI 兼容 API
- 迁移成本最小化

**实现方式**：
```typescript
// 保留 useStream，添加消息转换层
const stream = useStream<StateType>({ ... });

// 转换 LangGraph messages 为 Bubble 格式
const bubbleItems = useMemo(() => {
  return stream.messages.map(msg => langGraphToBubble(msg));
}, [stream.messages]);

// 传递给 Bubble.List
<Bubble.List items={bubbleItems} roles={roles} />
```

#### 决策 2：渐进式 UI 替换

**阶段划分**：
1. Phase 1：仅替换 ChatMessage → Bubble.List（保留所有逻辑）
2. Phase 2：替换 Input → Sender
3. Phase 3：替换 ThreadList → Conversations
4. Phase 4：优化和清理

---

## 3. 依赖变更

### 3.1 新增依赖

```json
{
  "dependencies": {
    "@ant-design/x": "^2.2.2",
    "@ant-design/x-markdown": "^2.2.2",
    "antd": "^6.0.1"
  }
}
```

> **注意**：`date-fns` 已在项目中存在（^4.1.0），无需安装。

### 3.2 包大小影响评估

| 包 | Gzip 大小 | 说明 |
|----|-----------|------|
| `@ant-design/x` | ~50KB | 核心组件 |
| `@ant-design/x-markdown` | ~30KB | Markdown 渲染 |
| `antd` (已有组件) | 增量 ~20KB | 与现有 Radix 不冲突 |

**总增量预估**：~100KB gzip（Tree-shaking 后）

### 3.3 可能移除的依赖（迁移完成后）

| 依赖 | 原用途 | 迁移后 | 移除时机 |
|------|--------|--------|---------|
| `react-markdown` | Markdown 渲染 | → XMarkdown | Phase 3 后 |
| `react-syntax-highlighter` | 代码高亮 | → XMarkdown 内置 | Phase 3 后 |
| `use-stick-to-bottom` | 自动滚动 | → Bubble.List 内置 | Phase 1 后 |

### 3.4 保留的依赖

```json
{
  "dependencies": {
    "@langchain/langgraph-sdk": "^1.0.3",  // 核心 SDK，必须保留
    "@radix-ui/react-dialog": "^1.1.15",   // 部分自定义组件使用
    "lucide-react": "^0.539.0",            // 图标库
    "nuqs": "^2.4.1",                      // URL 状态管理
    "swr": "^2.3.6",                       // 数据缓存
    "tailwindcss": "^3.4.4"                // 样式系统（主）
  }
}
```

---

## 4. 分阶段实施计划

### Phase 0: 准备阶段 (1天)

#### 目标
- 环境搭建
- POC 验证核心可行性

#### 任务清单

- [ ] 创建迁移分支 `feat/antd-x-migration`
- [ ] 安装 `@ant-design/x`、`@ant-design/x-markdown`、`antd`、`date-fns`
- [ ] 配置 `next.config.js` 支持 Ant Design（antd 支持）
- [ ] 创建最小 POC：在独立页面渲染 Bubble.List
- [ ] 验证 LangGraph SDK + Bubble.List 集成可行性

#### next.config.js 配置

```javascript
// next.config.mjs
const nextConfig = {
  // ... 现有配置

  // Ant Design 配置（App Router）
  transpilePackages: ['antd', '@ant-design/x', '@ant-design/x-markdown', '@ant-design/icons'],

  // 如果使用 antd 的样式
  experimental: {
    // 确保样式正确加载
    optimizePackageImports: ['antd', '@ant-design/x', '@ant-design/x-markdown'],
  },
};

export default nextConfig;
```

#### 验收标准
- [ ] `yarn dev` 正常启动
- [ ] Ant Design X 组件可正常渲染
- [ ] LangGraph SDK 连接正常
- [ ] 打包大小符合预期（增量 < 160KB gzip）

#### POC 代码示例

```typescript
// app/antd-x-poc/page.tsx
"use client";

import { Bubble } from '@ant-design/x';
import { useStream } from '@langchain/langgraph-sdk/react';
import { useClient } from '@/providers/ClientProvider';

export default function AntdXPoc() {
  const client = useClient();
  const stream = useStream({
    client,
    assistantId: 'your-assistant-id',
  });

  // 简单消息转换
  const items = stream.messages.map(msg => ({
    key: msg.id,
    role: msg.type === 'human' ? 'user' : 'ai',
    content: typeof msg.content === 'string' ? msg.content : '',
  }));

  return (
    <div className="p-4">
      <h1>Ant Design X POC</h1>
      <Bubble.List items={items} />
    </div>
  );
}
```

---

### Phase 1: 消息列表迁移 (2-3天)

#### 目标
- 替换 ChatMessage 为 Bubble.List
- 保持所有现有功能

#### 1.1 创建消息转换层

```typescript
// src/app/utils/messageConverter.ts

import type { Message } from '@langchain/langgraph-sdk';
import type { BubbleItemType } from '@ant-design/x';
import type { ToolCall } from '@/app/types/types';
import { extractStringFromMessageContent } from './utils';

export interface ConvertedMessage extends BubbleItemType {
  // 扩展属性，用于自定义渲染
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  messageExtras?: {
    status?: string;
    extraInfo?: any;
  };
}

/**
 * 将 LangGraph Message 转换为 Ant Design X Bubble 格式
 */
export function convertMessagesToBubbles(
  messages: Message[],
  isLoading: boolean,
  interrupt?: any
): ConvertedMessage[] {
  // 1. 处理 AI 消息和 Tool 消息的配对
  const messageMap = processMessagesWithTools(messages, interrupt);

  // 2. 转换为 Bubble 格式
  return messageMap.map((data, index) => {
    const isLast = index === messageMap.length - 1;
    const isStreaming = isLoading && isLast && data.message.type === 'ai';

    return {
      key: data.message.id || `msg-${index}`,
      role: data.message.type === 'human' ? 'user' : 'ai',
      content: extractStringFromMessageContent(data.message),
      // 流式渲染配置
      typing: data.message.type === 'ai' && !isStreaming ? {
        effect: 'fade-in', // 不使用 typing，改用 fade-in 避免与实际流式冲突
      } : false,
      // 扩展属性
      toolCalls: data.toolCalls,
      isStreaming,
      messageExtras: {
        status: getMessageStatus(data, interrupt),
      },
    };
  });
}

interface ProcessedMessage {
  message: Message;
  toolCalls: ToolCall[];
}

function processMessagesWithTools(
  messages: Message[],
  interrupt?: any
): ProcessedMessage[] {
  const messageMap = new Map<string, ProcessedMessage>();

  messages.forEach((message) => {
    if (message.type === 'ai') {
      // 提取 tool calls
      const toolCalls = extractToolCalls(message);
      messageMap.set(message.id!, {
        message,
        toolCalls: toolCalls.map(tc => ({
          ...tc,
          status: interrupt ? 'interrupted' : 'pending',
        })),
      });
    } else if (message.type === 'tool') {
      // 更新对应 tool call 的结果
      const toolCallId = message.tool_call_id;
      if (!toolCallId) return;

      for (const [, data] of messageMap.entries()) {
        const tcIndex = data.toolCalls.findIndex(tc => tc.id === toolCallId);
        if (tcIndex !== -1) {
          data.toolCalls[tcIndex] = {
            ...data.toolCalls[tcIndex],
            status: 'completed',
            result: extractStringFromMessageContent(message),
          };
          break;
        }
      }
    } else if (message.type === 'human') {
      messageMap.set(message.id!, {
        message,
        toolCalls: [],
      });
    }
  });

  return Array.from(messageMap.values());
}

function extractToolCalls(message: Message): ToolCall[] {
  const toolCalls: ToolCall[] = [];

  // 从 additional_kwargs.tool_calls
  if (message.additional_kwargs?.tool_calls) {
    toolCalls.push(...message.additional_kwargs.tool_calls.map(tc => ({
      id: tc.id || `tc-${Math.random()}`,
      name: tc.function?.name || tc.name || 'unknown',
      args: tc.function?.arguments || tc.args || {},
      status: 'pending' as const,
    })));
  }

  // 从 message.tool_calls
  if (message.tool_calls?.length) {
    toolCalls.push(...message.tool_calls
      .filter(tc => tc.name && tc.name !== '')
      .map(tc => ({
        id: tc.id || `tc-${Math.random()}`,
        name: tc.name,
        args: tc.args || {},
        status: 'pending' as const,
      }))
    );
  }

  return toolCalls;
}

function getMessageStatus(data: ProcessedMessage, interrupt?: any): string {
  if (interrupt && data.toolCalls.some(tc => tc.status === 'interrupted')) {
    return 'interrupted';
  }
  if (data.toolCalls.some(tc => tc.status === 'pending')) {
    return 'pending';
  }
  return 'completed';
}
```

#### 1.2 创建 AntdXMessageList 组件

```typescript
// src/app/components/AntdXMessageList.tsx
"use client";

import React, { useMemo } from 'react';
import { Bubble } from '@ant-design/x';
import { convertMessagesToBubbles, type ConvertedMessage } from '@/app/utils/messageConverter';
import { ToolCallFooter } from './ToolCallFooter';
import type { Message } from '@langchain/langgraph-sdk';
import type { Stream } from '@langchain/langgraph-sdk/react';

interface AntdXMessageListProps {
  messages: Message[];
  isLoading: boolean;
  interrupt?: any;
  stream: Stream;
  onEditAndResend?: (content: string) => void;
  files?: Record<string, string>;
  fileMetadata?: Map<string, any>;
  onViewFile?: (path: string) => void;
  showDeliveryCards?: boolean;
}

export const AntdXMessageList = React.memo<AntdXMessageListProps>(({
  messages,
  isLoading,
  interrupt,
  stream,
  onEditAndResend,
  files,
  fileMetadata,
  onViewFile,
  showDeliveryCards,
}) => {
  // 转换消息格式
  const bubbleItems = useMemo(() => {
    return convertMessagesToBubbles(messages, isLoading, interrupt);
  }, [messages, isLoading, interrupt]);

  // 角色配置
  const roles = useMemo(() => ({
    ai: {
      placement: 'start' as const,
      variant: 'filled' as const,
      // 自定义内容渲染
      contentRender: (content: string, info: any) => (
        <BubbleMarkdown content={content} />
      ),
      // 自定义 footer 渲染 Tool Calls
      footer: (_: any, info: { key: string }) => {
        const item = bubbleItems.find(b => b.key === info.key) as ConvertedMessage;
        if (!item?.toolCalls?.length) return null;

        return (
          <ToolCallFooter
            toolCalls={item.toolCalls}
            isLoading={isLoading && item.isStreaming}
            interrupt={interrupt}
            stream={stream}
          />
        );
      },
    },
    user: {
      placement: 'end' as const,
      variant: 'outlined' as const,
      // 可编辑
      editable: true,
      onEditConfirm: (newContent: string) => {
        onEditAndResend?.(newContent);
      },
    },
  }), [bubbleItems, isLoading, interrupt, stream, onEditAndResend]);

  return (
    <Bubble.List
      items={bubbleItems}
      roles={roles}
      autoScroll
    />
  );
});

AntdXMessageList.displayName = 'AntdXMessageList';
```

#### 1.3 辅助组件定义

以下组件在 AntdXMessageList 中被引用，需要定义或保留：

```typescript
// src/app/components/BubbleMarkdown.tsx
// 简单包装 XMarkdown，用于 Bubble 内容渲染

"use client";

import React from 'react';
import { AntdXMarkdown } from './AntdXMarkdown';

interface BubbleMarkdownProps {
  content: string;
}

export const BubbleMarkdown = React.memo<BubbleMarkdownProps>(({ content }) => {
  if (!content) return null;

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <AntdXMarkdown content={content} />
    </div>
  );
});

BubbleMarkdown.displayName = 'BubbleMarkdown';
```

```typescript
// src/app/components/InterruptActions.tsx
// 中断处理操作按钮

"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface InterruptActionsProps {
  onApprove: (value: any) => void;
  onReject: () => void;
  approvalOptions?: { label: string; value: any }[];
}

export const InterruptActions = React.memo<InterruptActionsProps>(({
  onApprove,
  onReject,
  approvalOptions,
}) => {
  // 默认选项
  const options = approvalOptions || [
    { label: 'Approve', value: true },
    { label: 'Reject', value: false },
  ];

  return (
    <div className="mt-3 flex gap-2">
      <Button
        size="sm"
        onClick={() => onApprove(true)}
        className="gap-1"
      >
        <Check size={14} />
        Approve
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={onReject}
        className="gap-1"
      >
        <X size={14} />
        Reject
      </Button>
    </div>
  );
});

InterruptActions.displayName = 'InterruptActions';
```

```typescript
// src/app/components/ToolArgsRenderer.tsx
// 工具参数渲染器（保留现有实现，稍作调整）

"use client";

import React from 'react';
import { TOOL_RENDERERS } from './tool-renderers';
import type { ToolCall } from '@/app/types/types';

interface ToolArgsRendererProps {
  name: string;
  args: Record<string, unknown>;
}

export const ToolArgsRenderer = React.memo<ToolArgsRendererProps>(({ name, args }) => {
  // 使用现有的 tool-renderers 映射
  const Renderer = TOOL_RENDERERS[name];

  if (Renderer) {
    return <Renderer args={args} />;
  }

  // 默认渲染：显示 JSON
  return (
    <div className="text-xs bg-muted/50 p-2 rounded">
      <pre className="whitespace-pre-wrap overflow-x-auto">
        {JSON.stringify(args, null, 2)}
      </pre>
    </div>
  );
});

ToolArgsRenderer.displayName = 'ToolArgsRenderer';
```

#### 1.3 在 ChatInterface 中集成

```typescript
// src/app/components/ChatInterface.tsx (修改)
// 在消息渲染区域替换为 AntdXMessageList

import { AntdXMessageList } from './AntdXMessageList';

// ... 在 render 部分
<div ref={scrollRef} className="flex-1 overflow-y-auto">
  <div ref={contentRef} className="mx-auto max-w-[1024px] px-6 pb-6 pt-4">
    <AntdXMessageList
      messages={messages}
      isLoading={isLoading}
      interrupt={interrupt}
      stream={stream}
      onEditAndResend={handleEditAndResend}
      files={files}
      fileMetadata={fileMetadata}
      onViewFile={handleViewFile}
      showDeliveryCards={showDelivery && isLastAiMessage}
    />
  </div>
</div>
```

#### 验收标准
- [ ] 消息列表正常显示
- [ ] Tool Calls 正常展示
- [ ] 中断处理正常
- [ ] 编辑重发正常
- [ ] 交付卡片正常（如有）
- [ ] 自动滚动正常

---

### Phase 2: 输入组件迁移 (2天)

#### 目标
- 替换自定义 textarea 为 Sender
- 集成文件上传

#### 2.1 创建 AntdXSender 组件

```typescript
// src/app/components/AntdXSender.tsx
"use client";

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Sender, Attachments } from '@ant-design/x';
import type { AttachmentsProps } from '@ant-design/x';
import { Button } from 'antd';
import { Square, ArrowUp } from 'lucide-react';

interface AntdXSenderProps {
  onSend: (content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>) => void;
  onStop: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

type AttachmentItem = AttachmentsProps['items'][number];

export const AntdXSender = React.memo<AntdXSenderProps>(({
  onSend,
  onStop,
  disabled,
  loading,
  placeholder = 'Write your message...',
}) => {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState<AttachmentItem[]>([]);

  const handleSubmit = useCallback(() => {
    if (!value.trim() && files.length === 0) return;

    // 构建消息内容
    const imageFiles = files.filter(f => f.type?.startsWith('image/'));

    if (imageFiles.length > 0) {
      // 多模态内容
      const content = [
        { type: 'text', text: value },
        ...imageFiles.map(f => ({
          type: 'image_url',
          image_url: { url: (f as any).thumbUrl || (f as any).url },
        })),
      ];
      onSend(content);
    } else {
      // 纯文本
      onSend(value);
    }

    setValue('');
    setFiles([]);
  }, [value, files, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled && !loading) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit, disabled, loading]);

  // 自定义发送按钮
  const sendButton = useMemo(() => {
    if (loading) {
      return (
        <Button
          type="primary"
          danger
          onClick={onStop}
          icon={<Square size={12} />}
        >
          Stop
        </Button>
      );
    }
    return (
      <Button
        type="primary"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        icon={<ArrowUp size={14} />}
      >
        Send
      </Button>
    );
  }, [loading, onStop, handleSubmit, disabled, value]);

  return (
    <div className="border border-border rounded-2xl bg-background overflow-hidden">
      <Sender
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        loading={loading}
        disabled={disabled}
        placeholder={placeholder}
        submitType="enter"
        header={
          files.length > 0 ? (
            <Sender.Header title="Attachments">
              <Attachments
                items={files}
                onRemove={(file) => {
                  setFiles(prev => prev.filter(f => f.uid !== file.uid));
                }}
                overflow="scrollX"
              />
            </Sender.Header>
          ) : null
        }
        footer={
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              {/* 文件上传按钮 */}
              <label className="cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="file"
                  accept="image/*,.pdf,.txt,.md"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const newFiles = Array.from(e.target.files || []).map(file => ({
                      uid: `${Date.now()}-${file.name}`,
                      name: file.name,
                      type: file.type,
                      size: file.size,
                    }));
                    setFiles(prev => [...prev, ...newFiles]);
                  }}
                />
                📎
              </label>
              <span className="text-xs text-muted-foreground">Shift+Enter</span>
            </div>
            {sendButton}
          </div>
        }
        styles={{
          textarea: {
            backgroundColor: 'transparent',
          },
        }}
      />
    </div>
  );
});

AntdXSender.displayName = 'AntdXSender';
```

#### 验收标准
- [ ] 文本输入正常
- [ ] 文件上传正常
- [ ] 发送/停止正常
- [ ] 快捷键正常

---

### Phase 3: 扩展组件迁移 (2天)

#### 目标
- 迁移 ThreadList → Conversations
- 迁移 MarkdownContent → XMarkdown
- 迁移 SubAgentIndicator → ThoughtChain

#### 3.1 ThreadList 迁移

```typescript
// src/app/components/AntdXThreadList.tsx
"use client";

import React, { useMemo } from 'react';
import { Conversations, ConversationsProps } from '@ant-design/x';
import { format, isToday, isYesterday, subDays } from 'date-fns';

interface Thread {
  thread_id: string;
  metadata?: { title?: string };
  created_at?: string;
  updated_at?: string;
}

interface AntdXThreadListProps {
  threads: Thread[];
  activeThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread?: () => void;
}

export const AntdXThreadList = React.memo<AntdXThreadListProps>(({
  threads,
  activeThreadId,
  onThreadSelect,
  onNewThread,
}) => {
  // 转换为 Conversations 格式
  const items: ConversationsProps['items'] = useMemo(() => {
    return threads.map(thread => {
      const updatedAt = thread.updated_at ? new Date(thread.updated_at) : new Date();
      return {
        key: thread.thread_id,
        label: thread.metadata?.title || 'New conversation',
        group: getGroupLabel(updatedAt),
        timestamp: updatedAt.getTime(),
      };
    });
  }, [threads]);

  return (
    <div className="h-full flex flex-col">
      {/* 新建按钮 */}
      {onNewThread && (
        <button
          onClick={onNewThread}
          className="m-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
        >
          + New Chat
        </button>
      )}

      {/* 线程列表 */}
      <Conversations
        items={items}
        activeKey={activeThreadId}
        onActiveChange={onThreadSelect}
        groupable
        style={{ flex: 1, overflow: 'auto' }}
      />
    </div>
  );
});

function getGroupLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  if (date > subDays(new Date(), 7)) return 'This Week';
  return 'Older';
}

AntdXThreadList.displayName = 'AntdXThreadList';
```

#### 3.2 XMarkdown 集成

```typescript
// src/app/components/AntdXMarkdown.tsx
"use client";

import React, { useMemo } from 'react';
import { XMarkdown } from '@ant-design/x-markdown';
import { XMarkdown as XMarkdownType } from '@ant-design/x-markdown/types';

interface AntdXMarkdownProps {
  content: string;
  streaming?: boolean;
}

export const AntdXMarkdown = React.memo<AntdXMarkdownProps>(({
  content,
  streaming,
}) => {
  // 配置 Markdown 组件
  const components: XMarkdownType['components'] = useMemo(() => ({
    // 链接在新窗口打开
    a: ({ href, children }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        {children}
      </a>
    ),
    // 代码块样式
    pre: ({ children }) => (
      <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
        {children}
      </pre>
    ),
    code: ({ className, children }) => {
      const isInline = !className;
      if (isInline) {
        return (
          <code className="bg-muted px-1.5 py-0.5 rounded text-sm">
            {children}
          </code>
        );
      }
      return <code className={className}>{children}</code>;
    },
  }), []);

  return (
    <XMarkdown
      children={content}
      streaming={streaming}
      components={components}
      // 插件配置（可选）
      plugins={[
        // 如需 LaTeX 支持
        // latex(),
        // 如需 Mermaid 支持
        // mermaid(),
      ]}
    />
  );
});

AntdXMarkdown.displayName = 'AntdXMarkdown';
```

#### 3.3 SubAgentIndicator → ThoughtChain

```typescript
// src/app/components/SubAgentThoughtChain.tsx
"use client";

import React from 'react';
import { ThoughtChain } from '@ant-design/x';
import type { ThoughtChainProps } from '@ant-design/x';
import type { SubAgent } from '@/app/types/types';

interface SubAgentThoughtChainProps {
  subAgents: SubAgent[];
  isLoading?: boolean;
}

export const SubAgentThoughtChain = React.memo<SubAgentThoughtChainProps>(({
  subAgents,
  isLoading,
}) => {
  const items: ThoughtChainProps['items'] = subAgents.map(sa => ({
    key: sa.id,
    title: sa.subAgentName || sa.name,
    status: mapSubAgentStatus(sa.status),
    description: sa.status === 'active' ? 'Processing...' : undefined,
    content: sa.output ? (
      <div className="text-sm">
        <pre className="whitespace-pre-wrap">
          {typeof sa.output === 'string'
            ? sa.output
            : JSON.stringify(sa.output, null, 2)}
        </pre>
      </div>
    ) : undefined,
    // 闪烁效果表示正在进行
    blink: sa.status === 'active',
    // 可折叠
    collapsible: sa.status === 'completed',
  }));

  if (!items.length) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <ThoughtChain
        items={items}
        line="dashed"
      />
    </div>
  );
});

function mapSubAgentStatus(status: SubAgent['status']): ThoughtChainProps['items'][number]['status'] {
  // ThoughtChain status 仅支持: 'loading' | 'success' | 'error' | 'abort'
  const map: Record<string, ThoughtChainProps['items'][number]['status']> = {
    pending: 'loading',
    active: 'loading',
    completed: 'success',
    error: 'error',
  };
  return map[status] || 'loading';
}

SubAgentThoughtChain.displayName = 'SubAgentThoughtChain';
```

#### 验收标准
- [ ] 线程列表正常显示
- [ ] 线程切换正常
- [ ] Markdown 渲染正常
- [ ] 代码高亮正常
- [ ] 子任务展示正常

---

### Phase 4: 样式与主题 (1天)

#### 目标
- 适配暗色主题
- 样式一致性

参见 [第8节：样式与主题](#8-样式与主题)

---

### Phase 5: 测试与优化 (2天)

#### 目标
- 全面功能测试
- 性能优化
- 文档更新

参见 [第9节：测试与验证](#9-测试与验证)

---

## 5. 核心实现：LangGraphChatProvider

> **重要决策**：保留 `useStream`，不使用 `useXChat`。
> 原因：LangGraph SDK 已处理 WebSocket 连接和状态管理，
> 使用 `useXChat` 会增加不必要的复杂度。

### 5.1 消息转换层（核心）

```typescript
// src/app/utils/messageConverter.ts

import type { Message } from '@langchain/langgraph-sdk';
import type { BubbleItemType } from '@ant-design/x';

/**
 * 消息转换器：LangGraph Message → Ant Design X Bubble
 *
 * 处理以下场景：
 * 1. 纯文本消息
 * 2. 多模态消息（文本 + 图片）
 * 3. Tool Calls
 * 4. Tool Results
 * 5. 中断状态
 */
export function convertMessagesToBubbles(
  messages: Message[],
  options: {
    isLoading: boolean;
    interrupt?: any;
    lastMessageId?: string;
  }
): BubbleItemType[] {
  const { isLoading, interrupt, lastMessageId } = options;

  // 1. 预处理：配对 AI 消息和 Tool 消息
  const processedMessages = preprocessMessages(messages);

  // 2. 转换为 Bubble 格式
  return processedMessages.map((msg, index) => {
    const isLast = index === processedMessages.length - 1;
    const isStreaming = isLoading && isLast && msg.type === 'ai';

    return {
      key: msg.id,
      role: msg.type === 'human' ? 'user' : 'ai' as const,
      content: extractContent(msg),
      // 附加数据用于自定义渲染
      ...(msg.toolCalls && { toolCalls: msg.toolCalls }),
      ...(isStreaming && { isStreaming: true }),
      ...(msg.status && { status: msg.status }),
    } as BubbleItemType;
  });
}

/**
 * 预处理消息：合并 Tool Calls 和 Tool Results
 */
function preprocessMessages(messages: Message[]): ProcessedMessage[] {
  const result: ProcessedMessage[] = [];
  const toolResults = new Map<string, any>();

  // 第一遍：收集 Tool Results
  messages.forEach(msg => {
    if (msg.type === 'tool' && msg.tool_call_id) {
      toolResults.set(msg.tool_call_id, {
        result: extractContent(msg),
      });
    }
  });

  // 第二遍：构建消息列表
  messages.forEach(msg => {
    if (msg.type === 'tool') return; // 跳过，已合并

    const processed: ProcessedMessage = {
      id: msg.id!,
      type: msg.type,
      content: extractContent(msg),
    };

    // 处理 AI 消息的 Tool Calls
    if (msg.type === 'ai' && hasToolCalls(msg)) {
      processed.toolCalls = extractToolCalls(msg).map(tc => ({
        ...tc,
        result: toolResults.get(tc.id)?.result,
        status: toolResults.has(tc.id) ? 'completed' : 'pending',
      }));
    }

    result.push(processed);
  });

  return result;
}

function extractContent(msg: Message): string {
  if (typeof msg.content === 'string') {
    return msg.content;
  }
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((c): c is { type: 'text'; text: string } =>
        typeof c === 'object' && c?.type === 'text'
      )
      .map(c => c.text)
      .join('');
  }
  return '';
}

function hasToolCalls(msg: Message): boolean {
  return !!(
    msg.additional_kwargs?.tool_calls?.length ||
    msg.tool_calls?.length
  );
}

function extractToolCalls(msg: Message): ToolCall[] {
  const calls: ToolCall[] = [];

  if (msg.additional_kwargs?.tool_calls) {
    calls.push(...msg.additional_kwargs.tool_calls.map(tc => ({
      id: tc.id || `tc-${Date.now()}`,
      name: tc.function?.name || tc.name || 'unknown',
      args: tc.function?.arguments || tc.args || {},
    })));
  }

  if (msg.tool_calls?.length) {
    calls.push(...msg.tool_calls
      .filter(tc => tc.name && tc.name !== '')
      .map(tc => ({
        id: tc.id || `tc-${Date.now()}`,
        name: tc.name,
        args: tc.args || {},
      }))
    );
  }

  return calls;
}
```

### 5.2 保持接口兼容

```typescript
// src/providers/ChatProvider.tsx
// 保持 useChatContext 接口不变

export interface ChatContextValue {
  // 保持现有接口
  stream: ReturnType<typeof useStream<StateType>>;
  messages: Message[];
  todos: TodoItem[];
  files: Record<string, string>;
  isLoading: boolean;
  isThreadLoading: boolean;
  interrupt: InterruptValue | undefined;
  sendMessage: (content: MultimodalContent) => void;
  stopStream: () => void;
  resumeInterrupt: (value: any) => void;
  regenerateLastMessage: () => void;
  setFiles: (files: Record<string, string>) => Promise<void>;
  runSingleStep: (...) => void;
  continueStream: (hasTaskToolCall?: boolean) => void;
  markCurrentThreadAsResolved: () => void;
  getMessagesMetadata: (...args: any[]) => any;
  // 新增：Ant Design X 兼容
  bubbleItems: BubbleItemType[];
}
```

---

## 6. 组件迁移详情

### 6.1 组件映射表

| 现有组件 | Ant Design X | 迁移方式 | 复杂度 | 状态 |
|---------|--------------|---------|--------|------|
| `ChatMessage` | `Bubble` | 替换 | 中 | 待迁移 |
| `ChatInterface` 消息列表 | `Bubble.List` | 替换 | 中 | 待迁移 |
| `ChatInterface` 输入区 | `Sender` | 替换 | 低 | 待迁移 |
| `FileUploadZone` | `Attachments` | 替换 | 低 | 待迁移 |
| `FileChip` | `FileCard` | 替换 | 低 | 待迁移 |
| `ThreadList` | `Conversations` | 替换 | 低 | 待迁移 |
| `SubAgentIndicator` | `ThoughtChain` | 替换 | 中 | 待迁移 |
| `MarkdownContent` | `XMarkdown` | 替换 | 低 | 待迁移 |
| `ContextPanel` | - | 保留 | - | 不迁移 |
| `DeliveryCard` | - | 保留 | - | 不迁移 |
| `ToolCallBox` | Bubble `footer` | 重构 | 高 | 待迁移 |
| `ExecutionStatusBar` | - | 保留 | - | 不迁移 |

### 6.2 ToolCallBox 重构

ToolCallBox 将重构为 Bubble 的 footer 组件：

```typescript
// src/app/components/ToolCallFooter.tsx
// 使用现有的 ToolArgsRenderer（位于 tool-renderers/index.tsx）

export function ToolCallFooter({
  toolCalls,
  isLoading,
  interrupt,
  stream,
}: ToolCallFooterProps) {
  // 使用 ThoughtChain 展示工具调用
  // ThoughtChain status 仅支持: 'loading' | 'success' | 'error' | 'abort'
  const items = toolCalls.map(tc => ({
    key: tc.id,
    title: tc.name,
    status: tc.status === 'completed' ? 'success' : 'loading',
    collapsible: tc.status === 'completed',
    content: (
      <>
        {/* 参数渲染 - 使用现有组件 */}
        <ToolArgsRenderer name={tc.name} args={tc.args} />

        {/* 结果渲染 */}
        {tc.result && (
          <div className="mt-2 p-2 bg-muted rounded text-xs">
            <pre className="whitespace-pre-wrap">{tc.result}</pre>
          </div>
        )}

        {/* 中断处理 */}
        {tc.status === 'interrupted' && (
          <InterruptActions
            onApprove={(value) => stream.submit(null, { command: { resume: value } })}
            onReject={() => stream.submit(null, { command: { goto: '__end__' } })}
          />
        )}
      </>
    ),
  }));

  return <ThoughtChain items={items} />;
}
```

---

## 7. 特殊功能迁移

### 7.1 Debug Mode

**保持策略**：Debug Mode 功能完全保留，仅 UI 层变化。

| 功能 | 实现 | 变化 |
|------|------|------|
| `interruptBefore` | useStream 配置 | 无变化 |
| `interruptAfter` | useStream 配置 | 无变化 |
| 重跑单步 | `runSingleStep()` | 无变化 |
| 从子任务重跑 | `onRestartFromSubTask()` | 无变化 |
| 检查点恢复 | `checkpoint` 参数 | 无变化 |

### 7.2 GenUI 组件

**保持策略**：GenUI 组件通过 Bubble 的 `contentRender` 或 `footer` 渲染。

```typescript
// 在 Bubble roles 配置中处理 ui 属性
roles: {
  ai: {
    footer: (_, info) => {
      const item = bubbleItems.find(b => b.key === info.key);

      // 渲染 GenUI 组件
      if (item?.ui?.length) {
        return (
          <LoadExternalComponent
            ui={item.ui}
            threadId={threadId}
          />
        );
      }

      // 渲染 Tool Calls
      if (item?.toolCalls?.length) {
        return <ToolCallFooter ... />;
      }

      return null;
    },
  },
}
```

### 7.3 State 同步 (todos, files)

**保持策略**：继续使用 `stream.values` 获取状态。

```typescript
// 在 ChatInterface 中
const { stream, messages, ... } = useChatContext();

// 获取 LangGraph 状态
const todos = stream.values.todos ?? [];
const files = stream.values.files ?? {};

// 传递给 ContextPanel
<ContextPanel
  todos={todos}
  files={files}
  ...
/>
```

---

## 8. 样式与主题

### 8.1 主题配置

```typescript
// src/app/antdXConfig.ts

import { XProvider } from '@ant-design/x';
import { ConfigProvider, theme } from 'antd';

// 检测当前主题（基于 CSS class 或 localStorage）
function useAppTheme() {
  // 方案 1: 基于 document class（推荐）
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    // 检查是否暗色主题
    const checkDark = () => document.documentElement.classList.contains('dark');
    setIsDark(checkDark());

    // 可选：监听主题变化
    const observer = new MutationObserver(() => setIsDark(checkDark()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return isDark ? 'dark' : 'light';
}

export function AntdXProvider({ children }: { children: React.ReactNode }) {
  const appTheme = useAppTheme();
  const [tokens, setTokens] = useState<Record<string, string>>({});

  // 解析 CSS 变量为实际颜色值（Ant Design 主题引擎无法解析 var()）
  useEffect(() => {
    const resolveVar = (cssVar: string) => {
      const match = cssVar.match(/var\((--[^)]+)\)/);
      if (!match) return cssVar;
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue(match[1]).trim();
      return cssVar.replace(/var\(--[^)]+\)/, value);
    };

    const resolved = {
      colorPrimary: resolveVar('hsl(var(--primary))'),
      colorBgContainer: resolveVar('hsl(var(--background))'),
      colorText: resolveVar('hsl(var(--foreground))'),
      colorTextSecondary: resolveVar('hsl(var(--muted-foreground))'),
      colorBorder: resolveVar('hsl(var(--border))'),
    };
    setTokens(resolved);
  }, [appTheme]); // 主题变化时重新解析

  // 等待 tokens 解析完成
  if (Object.keys(tokens).length === 0) {
    return <>{children}</>;
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: appTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          ...tokens,
          borderRadius: 8,
        },
      }}
    >
      <XProvider>
        {children}
      </XProvider>
    </ConfigProvider>
  );
}
```

> **重要**：Ant Design 主题引擎在 JavaScript 运行时需要具体的颜色值来计算派生颜色（hover、active、disabled 状态）。
> 直接传入 `hsl(var(--primary))` 会导致颜色计算失败。上述方案使用 `getComputedStyle` 在客户端动态解析 CSS 变量。

### 8.2 CSS 覆盖

```css
/* src/app/globals.css 补充 */

/* Ant Design X 样式覆盖 */
.ant-x-bubble {
  font-family: var(--font-sans);
}

.ant-x-bubble-user {
  background-color: var(--color-user-message-bg) !important;
}

.ant-x-bubble-ai {
  background-color: var(--color-accent) !important;
}

.ant-x-sender {
  border-color: var(--color-border) !important;
}

.ant-x-sender-textarea {
  background-color: transparent !important;
}

/* 暗色主题 */
.dark .ant-x-bubble-ai {
  background-color: rgba(255, 255, 255, 0.05) !important;
}
```

---

## 9. 测试与验证

### 9.1 功能测试清单

| 功能 | 测试项 | 预期结果 | 状态 |
|------|--------|---------|------|
| **消息发送** | 发送文本 | 消息显示在列表 | 待测 |
| **消息发送** | 发送图片 | 图片正确渲染 | 待测 |
| **消息发送** | 发送文本+图片 | 多模态正确 | 待测 |
| **流式响应** | AI 回复 | 内容逐步显示 | 待测 |
| **流式响应** | 长回复 | 自动滚动到底部 | 待测 |
| **工具调用** | 单个工具 | 状态显示正确 | 待测 |
| **工具调用** | 多个工具 | 顺序显示 | 待测 |
| **工具调用** | 工具结果 | 正确显示 | 待测 |
| **中断处理** | 等待批准 | 显示操作按钮 | 待测 |
| **中断处理** | 批准 | 流程继续 | 待测 |
| **中断处理** | 拒绝 | 流程终止 | 待测 |
| **文件上传** | 拖拽上传 | 文件添加成功 | 待测 |
| **文件上传** | 点击上传 | 文件选择器打开 | 待测 |
| **文件上传** | 图片预览 | 缩略图显示 | 待测 |
| **线程管理** | 切换线程 | 消息正确加载 | 待测 |
| **线程管理** | 新建线程 | 空对话开始 | 待测 |
| **Debug Mode** | 单步执行 | 正常中断 | 待测 |
| **Debug Mode** | 重跑子任务 | 正常执行 | 待测 |
| **编辑重发** | 编辑用户消息 | 重新发送 | 待测 |
| **Markdown** | 代码高亮 | 正确渲染 | 待测 |
| **Markdown** | 链接 | 新窗口打开 | 待测 |

### 9.2 性能基准

| 指标 | 迁移前 | 目标 | 测试方法 |
|------|--------|------|---------|
| 首次加载 (FCP) | ~1.5s | < 2.0s | Lighthouse |
| 交互延迟 (TTI) | ~2.0s | < 2.5s | Lighthouse |
| 打包大小 (gzip) | ~350KB | < 480KB | webpack-bundle-analyzer |
| 消息渲染 (100条) | ~100ms | < 150ms | Chrome DevTools |

### 9.3 向后兼容性测试

每个 Phase 完成后，必须通过以下回归测试：

| 测试场景 | 验证方法 | 预期结果 |
|---------|---------|---------|
| Feature Flag 关闭 | 设置 `USE_ANTDX_* = false` | 使用旧组件，功能正常 |
| Feature Flag 开启 | 设置 `USE_ANTDX_* = true` | 使用新组件，功能正常 |
| URL 参数覆盖 | 添加 `?useAntdxMessageList=true` | 指定组件生效 |
| 切换线程 | 点击不同线程 | 消息正确加载 |
| 刷新页面 | F5 刷新 | 状态保持 |
| 网络断开重连 | 断开网络后恢复 | 自动重连 |

### 9.4 Phase 验收检查点

#### Phase 0 验收
```bash
# 1. 启动开发服务器
yarn dev

# 2. 访问 POC 页面
open http://localhost:3000/antd-x-poc

# 3. 验证清单
- [ ] Bubble.List 组件正常渲染
- [ ] LangGraph 消息正确显示
- [ ] 无控制台错误
- [ ] 打包大小增量 < 150KB
```

#### Phase 1 验收
```bash
# 1. 开启 Feature Flag
# 修改 src/lib/featureFlags.ts: USE_ANTDX_MESSAGE_LIST = true

# 2. 验证清单
- [ ] 消息列表使用 AntdXMessageList
- [ ] 所有消息类型正确显示
- [ ] Tool Calls 正常展示
- [ ] 中断处理正常
- [ ] 编辑重发正常
- [ ] 自动滚动正常
- [ ] 关闭 Feature Flag 后回退正常
```

#### Phase 2 验收
```bash
# 1. 开启 Feature Flag
# USE_ANTDX_SENDER = true

# 2. 验证清单
- [ ] 输入组件使用 AntdXSender
- [ ] 文本输入正常
- [ ] 文件上传正常
- [ ] 发送/停止正常
- [ ] 快捷键正常
```

#### Phase 3 验收
```bash
# 1. 开启所有 Feature Flags

# 2. 验证清单
- [ ] 线程列表使用 AntdXThreadList
- [ ] Markdown 使用 AntdXMarkdown
- [ ] 子任务使用 SubAgentThoughtChain
- [ ] 所有功能正常
```

#### Phase 4 验收
```bash
# 1. 样式验证
- [ ] 亮色主题正常
- [ ] 暗色主题正常
- [ ] 与现有组件样式一致
- [ ] 响应式布局正常（如需要）
```

#### Phase 5 验收
```bash
# 1. 完整回归测试
- [ ] 所有功能测试通过
- [ ] 性能基准达标
- [ ] 文档更新完成
- [ ] 可以合并到主分支
```

---

## 10. 风险与缓解

### 10.1 技术风险

| 风险 | 可能性 | 影响 | 缓解措施 | 负责人 |
|------|--------|------|---------|--------|
| LangGraph 协议不兼容 | 低 | 高 | POC 充分验证 | - |
| 性能下降 | 低 | 中 | 建立性能基准 | - |
| 样式冲突 | 中 | 低 | CSS 模块隔离 | - |
| 依赖版本冲突 | 低 | 高 | 锁定版本 | - |
| Ant Design X API 变更 | 低 | 中 | 锁定 minor 版本 | - |

### 10.2 业务风险

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 功能回退 | 中 | 高 | 渐进式迁移 + 充分测试 |
| 用户习惯改变 | 低 | 中 | UI 一致性保持 |
| 延期 | 中 | 中 | Buffer 时间预留 |

### 10.3 回滚计划

每个 Phase 完成后创建 Git tag：

```bash
# Phase 完成后
git tag -a v0.1.0-antd-x-phase0 -m "Phase 0: Preparation"
git tag -a v0.2.0-antd-x-phase1 -m "Phase 1: Message List"
git tag -a v0.3.0-antd-x-phase2 -m "Phase 2: Sender"
git tag -a v0.4.0-antd-x-phase3 -m "Phase 3: Extensions"
git tag -a v0.5.0-antd-x-phase4 -m "Phase 4: Styling"
git tag -a v1.0.0-antd-x-release -m "Release: Ant Design X Migration"
```

回滚命令：
```bash
git checkout v0.2.0-antd-x-phase1  # 回滚到 Phase 1 完成状态
```

---

## 11. 时间线与里程碑

### 11.1 整体时间线

```
Week 1:
├── Day 1: Phase 0 (准备 + POC)
├── Day 2-4: Phase 1 (消息列表迁移)
└── Day 5: Phase 1 验收

Week 2:
├── Day 1-2: Phase 2 (输入组件迁移)
├── Day 3-4: Phase 3 (扩展组件迁移)
└── Day 5: Phase 4 (样式与主题)

Week 3:
├── Day 1-2: Phase 5 (测试与优化)
├── Day 3: Buffer / Bug Fix
└── Day 4-5: 文档更新 + Code Review
```

### 11.2 里程碑

| 里程碑 | 日期 | 交付物 | 验收标准 |
|--------|------|--------|---------|
| **M0: POC 完成** | Day 1 | Provider 可用 | 消息能显示 |
| **M1: 核心功能** | Day 5 | 消息收发正常 | 所有消息类型正常 |
| **M2: 输入完成** | Day 7 | 输入+文件上传 | 所有输入类型正常 |
| **M3: 全功能** | Day 10 | 所有功能迁移完成 | 功能测试通过 |
| **M4: 发布就绪** | Day 14 | 测试通过，文档完成 | 可上线 |

---

## 12. 附录

### 12.1 参考资源

- [Ant Design X 官方文档](https://x.ant.design/)
- [Ant Design X GitHub](https://github.com/ant-design/x)
- [Ant Design X 2.0 迁移指南](https://x.ant.design/docs/react/migration-v2-cn)
- [LangGraph SDK 文档](https://langchain-ai.github.io/langgraph/)
- [XMarkdown 文档](https://x.ant.design/components/x-markdown)

### 12.2 相关文档

- [00-overview.md](./implementation/00-overview.md) - 现有架构概述
- [CLAUDE.md](../CLAUDE.md) - 项目规范

### 12.3 术语表

| 术语 | 说明 |
|------|------|
| Bubble | Ant Design X 消息气泡组件 |
| Sender | Ant Design X 输入发送组件 |
| ThoughtChain | 思维链/任务链展示组件 |
| XMarkdown | Ant Design X 流式 Markdown 渲染器 |
| Provider | 数据层抽象 |
| Parser | 消息格式转换器 |

### 12.4 文件结构（迁移后）

```
src/
├── app/
│   ├── components/
│   │   ├── AntdXMessageList.tsx    # 新：消息列表
│   │   ├── AntdXSender.tsx          # 新：输入组件
│   │   ├── AntdXThreadList.tsx      # 新：线程列表
│   │   ├── AntdXMarkdown.tsx        # 新：Markdown 渲染
│   │   ├── ToolCallFooter.tsx       # 新：工具调用展示
│   │   ├── SubAgentThoughtChain.tsx # 新：子任务展示
│   │   ├── ContextPanel.tsx         # 保留
│   │   ├── DeliveryCard.tsx         # 保留
│   │   ├── ExecutionStatusBar.tsx   # 保留
│   │   └── ...
│   ├── utils/
│   │   ├── messageConverter.ts      # 新：消息转换
│   │   └── utils.ts
│   └── ...
├── providers/
│   ├── ChatProvider.tsx             # 修改：保持接口
│   └── ClientProvider.tsx           # 保留
└── components/ui/                    # 保留 shadcn/ui
```

---

**文档版本历史**

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.0 | 2026-02-16 | 初始版本 |
| v1.1 | 2026-02-16 | Round 1 评审修订：添加 Debug Mode、State 同步、接口兼容性说明 |
| v1.2 | 2026-02-16 | Round 2 评审修订：添加 Feature Flag 机制、辅助组件定义、详细验证步骤 |
| v1.3 | 2026-02-16 | Round 3 评审修订：修复章节编号、添加缺失导入（useMemo）、添加 date-fns 依赖、补充 next.config.js 配置、完善主题 hook 实现 |
| v2.0 | 2026-02-16 | 专家评审 Round 1 修订：修复主题定制方案（CSS 变量需通过 getComputedStyle 动态解析）、修复 ThoughtChain status API 使用（pending→loading）|
| **v2.1** | 2026-02-16 | **专家评审 Round 2 修订**：添加 HSL→HEX 颜色转换（Ant Design 需要 HEX 格式）、移除 date-fns 依赖（已存在）、统一使用现有 ToolArgsRenderer |

