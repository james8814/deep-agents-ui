# Ant Design X 2.0 迁移实施方案

> **版本**: v2.1
> **创建日期**: 2026-02-16
> **关联文档**: [antd-x-migration-plan.md](./antd-x-migration-plan.md) (设计方案)
> **状态**: 第二轮专家评审后修订版

本文档是 Ant Design X 2.0 迁移设计方案的**执行手册**，提供具体的代码实现步骤、命令和验证方法。

---

## 目录

1. [前置准备](#1-前置准备)
2. [Phase 0: 环境搭建与POC](#2-phase-0-环境搭建与poc)
3. [Phase 1: 消息列表迁移](#3-phase-1-消息列表迁移)
4. [Phase 2: 输入组件迁移](#4-phase-2-输入组件迁移)
5. [Phase 3: 扩展组件迁移](#5-phase-3-扩展组件迁移)
6. [Phase 4: 样式与主题](#6-phase-4-样式与主题)
7. [Phase 5: 测试与验收](#7-phase-5-测试与验收)
8. [回滚与清理](#8-回滚与清理)

---

## 1. 前置准备

### 1.1 确认环境

```bash
# 确认 Node 版本
node -v  # 应为 v20.x

# 确认项目目录
cd /root/projects/deep-agents-ui

# 确认当前状态
git status
```

### 1.2 创建迁移分支

```bash
# 创建并切换到迁移分支
git checkout -b feat/antd-x-migration

# 推送到远程（可选）
git push -u origin feat/antd-x-migration
```

### 1.3 备份关键文件

```bash
# 创建备份目录
BACKUP_DIR=".backup/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# 备份关键组件（单文件）
cp src/app/components/ChatInterface.tsx "$BACKUP_DIR/"
cp src/app/components/ChatMessage.tsx "$BACKUP_DIR/"
cp src/providers/ChatProvider.tsx "$BACKUP_DIR/"

# 备份整个 components 目录（可选）
cp -r src/app/components "$BACKUP_DIR/components"
```

---

## 2. Phase 0: 环境搭建与POC

### 2.1 安装依赖

**执行命令：**

```bash
cd /root/projects/deep-agents-ui

# 安装 Ant Design X 相关包
# 注意：date-fns 已存在 (^4.1.0)，无需安装
yarn add @ant-design/x@^2.2.2 @ant-design/x-markdown@^2.2.2 antd@^6.0.1
```

**验证安装：**

```bash
# 检查 package.json
grep -E "@ant-design|antd" package.json
```

### 2.2 配置 Next.js

**修改文件：** `next.config.mjs`

**找到现有配置后添加：**

```javascript
const nextConfig = {
  // ... 现有配置保持不变

  // 新增：Ant Design 配置
  transpilePackages: [
    'antd',
    '@ant-design/x',
    '@ant-design/x-markdown',
    '@ant-design/icons',
    '@ant-design/icons-svg',
    'rc-util',
  ],

  experimental: {
    optimizePackageImports: [
      'antd',
      '@ant-design/x',
      '@ant-design/x-markdown',
    ],
  },
};

export default nextConfig;
```

### 2.3 创建 Feature Flag 文件

**创建文件：** `src/lib/featureFlags.ts`

```typescript
"use client";

import { useSearchParams } from "nuqs";

/**
 * Feature Flags for Ant Design X migration
 *
 * 通过 URL 参数可以覆盖默认值，便于测试：
 * - ?useAntdxMessageList=true
 * - ?useAntdxSender=true
 * - ?useAntdxThreadList=true
 * - ?useAntdxMarkdown=true
 */
export const FEATURE_FLAGS = {
  USE_ANTDX_MESSAGE_LIST: false,
  USE_ANTDX_SENDER: false,
  USE_ANTDX_THREAD_LIST: false,
  USE_ANTDX_MARKDOWN: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * 获取 Feature Flag 值
 * URL 参数优先于默认配置
 */
export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const searchParams = useSearchParams();

  // URL 参数映射表
  const urlKeyMap: Record<FeatureFlagKey, string> = {
    USE_ANTDX_MESSAGE_LIST: "useAntdxMessageList",
    USE_ANTDX_SENDER: "useAntdxSender",
    USE_ANTDX_THREAD_LIST: "useAntdxThreadList",
    USE_ANTDX_MARKDOWN: "useAntdxMarkdown",
  };

  const urlKey = urlKeyMap[flag];
  const urlValue = searchParams.get(urlKey);
  if (urlValue !== null) {
    return urlValue === "true" || urlValue === "1";
  }

  return FEATURE_FLAGS[flag];
}

/**
 * 获取所有 Feature Flag 状态（用于调试）
 */
export function useAllFeatureFlags(): Record<FeatureFlagKey, boolean> {
  return {
    USE_ANTDX_MESSAGE_LIST: useFeatureFlag("USE_ANTDX_MESSAGE_LIST"),
    USE_ANTDX_SENDER: useFeatureFlag("USE_ANTDX_SENDER"),
    USE_ANTDX_THREAD_LIST: useFeatureFlag("USE_ANTDX_THREAD_LIST"),
    USE_ANTDX_MARKDOWN: useFeatureFlag("USE_ANTDX_MARKDOWN"),
  };
}
```

### 2.4 创建 POC 页面

**创建文件：** `src/app/antd-x-poc/page.tsx`

```typescript
"use client";

import React from "react";
import { Bubble } from "@ant-design/x";

const DUMMY_ITEMS = [
  {
    key: "1",
    role: "user" as const,
    content: "Hello, this is a test message!",
  },
  {
    key: "2",
    role: "ai" as const,
    content: "Hi! I received your message. This is a POC for Ant Design X integration.",
  },
];

export default function AntdXPocPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-6 text-2xl font-bold text-foreground">
          Ant Design X POC
        </h1>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Bubble.List Demo</h2>
          <Bubble.List items={DUMMY_ITEMS} />
        </div>

        <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-sm text-green-600">
            ✅ POC 验证成功：Ant Design X 组件可正常渲染
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 2.5 验证 Phase 0

**执行验证：**

```bash
# 启动开发服务器
yarn dev

# 在另一个终端检查构建
# 访问 http://localhost:3000/antd-x-poc
```

**验证清单：**

- [ ] `yarn dev` 正常启动，无报错
- [ ] 访问 `/antd-x-poc` 页面正常显示
- [ ] Bubble.List 组件正常渲染
- [ ] 控制台无错误信息

**打包大小检查：**

```bash
# 构建生产版本
yarn build

# 检查打包大小（应该增量 < 160KB gzip）
# 查看 .next/analyze/ 或使用 bundle analyzer
```

---

## 3. Phase 1: 消息列表迁移

### 3.1 创建消息转换工具

**创建文件：** `src/app/utils/messageConverter.ts`

```typescript
import type { Message } from "@langchain/langgraph-sdk";
import type { ToolCall } from "@/app/types/types";
import { extractStringFromMessageContent } from "./utils";

/**
 * 扩展的 Bubble 类型，包含自定义属性
 */
export interface ConvertedBubbleItem {
  key: string;
  role: "user" | "ai";
  content: string;
  typing?: { effect: string } | false;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
  messageExtras?: {
    status?: string;
    isLast?: boolean;
  };
}

interface ProcessedMessage {
  message: Message;
  toolCalls: ToolCall[];
}

/**
 * 将 LangGraph Message 列表转换为 Ant Design X Bubble 格式
 */
export function convertMessagesToBubbles(
  messages: Message[],
  isLoading: boolean,
  interrupt?: unknown
): ConvertedBubbleItem[] {
  const processed = processMessagesWithTools(messages, interrupt);

  return processed.map((data, index) => {
    const isLast = index === processed.length - 1;
    const isStreaming = isLoading && isLast && data.message.type === "ai";

    return {
      key: data.message.id || `msg-${index}`,
      role: data.message.type === "human" ? "user" : "ai",
      content: extractStringFromMessageContent(data.message),
      typing:
        data.message.type === "ai" && !isStreaming
          ? { effect: "fade-in" }
          : false,
      toolCalls: data.toolCalls,
      isStreaming,
      messageExtras: {
        status: getMessageStatus(data, interrupt),
        isLast,
      },
    };
  });
}

function processMessagesWithTools(
  messages: Message[],
  interrupt?: unknown
): ProcessedMessage[] {
  const messageMap = new Map<string, ProcessedMessage>();

  messages.forEach((message) => {
    if (message.type === "ai") {
      const toolCalls = extractToolCalls(message);
      messageMap.set(message.id!, {
        message,
        toolCalls: toolCalls.map((tc) => ({
          ...tc,
          status: interrupt ? "interrupted" : "pending",
        })),
      });
    } else if (message.type === "tool") {
      const toolCallId = message.tool_call_id;
      if (!toolCallId) return;

      for (const [, data] of messageMap.entries()) {
        const tcIndex = data.toolCalls.findIndex((tc) => tc.id === toolCallId);
        if (tcIndex !== -1) {
          data.toolCalls[tcIndex] = {
            ...data.toolCalls[tcIndex],
            status: "completed",
            result: extractStringFromMessageContent(message),
          };
          break;
        }
      }
    } else if (message.type === "human") {
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

  if (message.additional_kwargs?.tool_calls) {
    toolCalls.push(
      ...message.additional_kwargs.tool_calls.map((tc: any) => ({
        id: tc.id || `tc-${Date.now()}`,
        name: tc.function?.name || tc.name || "unknown",
        args: tc.function?.arguments || tc.args || {},
        status: "pending" as const,
      }))
    );
  }

  if (message.tool_calls?.length) {
    toolCalls.push(
      ...message.tool_calls
        .filter((tc: any) => tc.name && tc.name !== "")
        .map((tc: any) => ({
          id: tc.id || `tc-${Date.now()}`,
          name: tc.name,
          args: tc.args || {},
          status: "pending" as const,
        }))
    );
  }

  return toolCalls;
}

function getMessageStatus(data: ProcessedMessage, interrupt?: unknown): string {
  if (interrupt && data.toolCalls.some((tc) => tc.status === "interrupted")) {
    return "interrupted";
  }
  if (data.toolCalls.some((tc) => tc.status === "pending")) {
    return "pending";
  }
  return "completed";
}
```

### 3.2 创建 AntdXMarkdown 组件

**创建文件：** `src/app/components/AntdXMarkdown.tsx`

```typescript
"use client";

import React, { useMemo } from "react";
import { XMarkdown } from "@ant-design/x-markdown";

interface AntdXMarkdownProps {
  content: string;
  streaming?: boolean;
}

export const AntdXMarkdown = React.memo<AntdXMarkdownProps>(
  ({ content, streaming }) => {
    const components = useMemo(
      () => ({
        a: ({ href, children }: any) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {children}
          </a>
        ),
        pre: ({ children }: any) => (
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
            {children}
          </pre>
        ),
        code: ({ className, children }: any) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
      }),
      []
    );

    if (!content) return null;

    return (
      <XMarkdown children={content} streaming={streaming} components={components} />
    );
  }
);

AntdXMarkdown.displayName = "AntdXMarkdown";
```

### 3.3 创建 BubbleMarkdown 组件

**创建文件：** `src/app/components/BubbleMarkdown.tsx`

```typescript
"use client";

import React from "react";
import { AntdXMarkdown } from "./AntdXMarkdown";

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

BubbleMarkdown.displayName = "BubbleMarkdown";
```

### 3.4 创建 ToolCallFooter 组件

**创建文件：** `src/app/components/ToolCallFooter.tsx`

> **注意**：使用现有的 `ToolArgsRenderer` 组件（位于 `tool-renderers/index.tsx`），无需重复实现。

```typescript
"use client";

import React from "react";
import { ThoughtChain } from "@ant-design/x";
import type { ThoughtChainProps } from "@ant-design/x";
import type { ToolCall } from "@/app/types/types";
// 使用现有的 ToolArgsRenderer，而非重新创建
import { ToolArgsRenderer } from "./tool-renderers";
import { InterruptActions } from "./InterruptActions";

interface ToolCallFooterProps {
  toolCalls: ToolCall[];
  isLoading?: boolean;
  interrupt?: unknown;
  stream?: any;
  onResumeInterrupt?: (value: any) => void;
}

export const ToolCallFooter = React.memo<ToolCallFooterProps>(
  ({ toolCalls, isLoading, interrupt, stream, onResumeInterrupt }) => {
    const items: ThoughtChainProps["items"] = toolCalls.map((tc) => ({
      key: tc.id,
      title: tc.name,
      // ThoughtChain status 仅支持: 'loading' | 'success' | 'error' | 'abort'
      status: mapToolCallStatus(tc.status),
      description: tc.status === "pending" ? "Processing..." : undefined,
      collapsible: tc.status === "completed",
      content: (
        <div className="space-y-2">
          <ToolArgsRenderer name={tc.name} args={tc.args} />
          {tc.result && (
            <div className="rounded bg-muted p-2 text-xs">
              <pre className="whitespace-pre-wrap">{tc.result}</pre>
            </div>
          )}
          {tc.status === "interrupted" && onResumeInterrupt && (
            <InterruptActions
              onApprove={(value) => onResumeInterrupt(value)}
              onReject={() => onResumeInterrupt({ goto: "__end__" })}
            />
          )}
        </div>
      ),
    }));

    if (!items.length) return null;

    return (
      <div className="mt-3 border-t border-border pt-3">
        <ThoughtChain items={items} line="dashed" />
      </div>
    );
  }
);

ToolCallFooter.displayName = "ToolCallFooter";

/**
 * 映射 ToolCall status 到 ThoughtChain status
 * ThoughtChain 仅支持: 'loading' | 'success' | 'error' | 'abort'
 */
function mapToolCallStatus(
  status: ToolCall["status"]
): ThoughtChainProps["items"][number]["status"] {
  const map: Record<string, ThoughtChainProps["items"][number]["status"]> = {
    pending: "loading",      // 待处理 -> loading
    completed: "success",    // 完成 -> success
    interrupted: "loading",  // 中断中 -> loading (等待用户操作)
    error: "error",          // 错误 -> error
  };
  return map[status] || "loading";
}
```
  status: ToolCall["status"]
): ThoughtChainProps["items"][number]["status"] {
  const map: Record<string, ThoughtChainProps["items"][number]["status"]> = {
    pending: "pending",
    completed: "success",
    interrupted: "pending",
    error: "error",
  };
  return map[status] || "pending";
}
```

### 3.5 创建 InterruptActions 组件

**创建文件：** `src/app/components/InterruptActions.tsx`

```typescript
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

interface InterruptActionsProps {
  onApprove: (value: any) => void;
  onReject: () => void;
  approvalOptions?: { label: string; value: any }[];
}

export const InterruptActions = React.memo<InterruptActionsProps>(
  ({ onApprove, onReject, approvalOptions }) => {
    const options = approvalOptions || [
      { label: "Approve", value: true },
      { label: "Reject", value: false },
    ];

    return (
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={() => onApprove(true)} className="gap-1">
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
  }
);

InterruptActions.displayName = "InterruptActions";
```

### 3.6 ToolArgsRenderer（使用现有组件）

> **重要**：项目中已存在 `ToolArgsRenderer` 组件（`src/app/components/tool-renderers/index.tsx`），**无需重新创建**。
>
> 该组件已提供工具参数的人性化渲染，支持 `web_search`、`shell`、`write_file`、`read_file` 等多种工具。
>
> 在 `ToolCallFooter` 中直接导入使用：
> ```typescript
> import { ToolArgsRenderer } from "./tool-renderers";
> ```

### 3.7 创建 AntdXMessageList 组件

**创建文件：** `src/app/components/AntdXMessageList.tsx`

```typescript
"use client";

import React, { useMemo } from "react";
import { Bubble } from "@ant-design/x";
import type { Message } from "@langchain/langgraph-sdk";
import {
  convertMessagesToBubbles,
  type ConvertedBubbleItem,
} from "@/app/utils/messageConverter";
import { BubbleMarkdown } from "./BubbleMarkdown";
import { ToolCallFooter } from "./ToolCallFooter";

interface AntdXMessageListProps {
  messages: Message[];
  isLoading: boolean;
  interrupt?: unknown;
  stream?: any;
  onEditAndResend?: (content: string) => void;
  onResumeInterrupt?: (value: any) => void;
  files?: Record<string, string>;
  fileMetadata?: Map<string, any>;
  onViewFile?: (path: string) => void;
  showDeliveryCards?: boolean;
}

export const AntdXMessageList = React.memo<AntdXMessageListProps>(
  ({
    messages,
    isLoading,
    interrupt,
    stream,
    onEditAndResend,
    onResumeInterrupt,
  }) => {
    const bubbleItems = useMemo(() => {
      return convertMessagesToBubbles(messages, isLoading, interrupt);
    }, [messages, isLoading, interrupt]);

    const roles = useMemo(
      () => ({
        ai: {
          placement: "start" as const,
          variant: "filled" as const,
          contentRender: (content: string) => (
            <BubbleMarkdown content={content} />
          ),
          footer: (_: any, info: { key: string }) => {
            const item = bubbleItems.find(
              (b) => b.key === info.key
            ) as ConvertedBubbleItem;
            if (!item?.toolCalls?.length) return null;

            return (
              <ToolCallFooter
                toolCalls={item.toolCalls}
                isLoading={isLoading && item.isStreaming}
                interrupt={interrupt}
                stream={stream}
                onResumeInterrupt={onResumeInterrupt}
              />
            );
          },
        },
        user: {
          placement: "end" as const,
          variant: "outlined" as const,
        },
      }),
      [bubbleItems, isLoading, interrupt, stream, onResumeInterrupt]
    );

    return (
      <Bubble.List
        items={bubbleItems}
        roles={roles}
        autoScroll={{ autoScrollOnContentChange: true }}
      />
    );
  }
);

AntdXMessageList.displayName = "AntdXMessageList";
```

### 3.8 修改 ChatInterface 集成 Feature Flag

**修改文件：** `src/app/components/ChatInterface.tsx`

在文件顶部添加导入：

```typescript
import { useFeatureFlag } from "@/lib/featureFlags";
import { AntdXMessageList } from "./AntdXMessageList";
```

在组件内部添加：

```typescript
// 在 ChatInterface 组件内部
const useAntdxMessageList = useFeatureFlag("USE_ANTDX_MESSAGE_LIST");
```

修改消息渲染部分（约 400-470 行附近），替换为：

```typescript
// 原有的 processedMessages.map(...) 部分替换为：
{useAntdxMessageList ? (
  <AntdXMessageList
    messages={messages}
    isLoading={isLoading}
    interrupt={interrupt}
    stream={stream}
    onEditAndResend={handleEditAndResend}
    onResumeInterrupt={resumeInterrupt}
    files={files}
    fileMetadata={fileMetadata}
    onViewFile={handleViewFile}
    showDeliveryCards={showDelivery && isLastAiMessage}
  />
) : (
  <>
    {/* 保留原有 ChatMessage 渲染逻辑 */}
    {processedMessages.map((data, index) => {
      // ... 原有代码
    })}
  </>
)}
```

### 3.9 验证 Phase 1

**测试命令：**

```bash
# 启动开发服务器
yarn dev

# 测试 URL（开启 Feature Flag）
# http://localhost:3000/?useAntdxMessageList=true
```

**验证清单：**

- [ ] Feature Flag 关闭时，使用原有 ChatMessage 组件
- [ ] Feature Flag 开启时，使用 AntdXMessageList 组件
- [ ] 用户消息正常显示
- [ ] AI 消息正常显示
- [ ] Tool Calls 正常展示
- [ ] 中断处理按钮正常
- [ ] 自动滚动正常

---

## 4. Phase 2: 输入组件迁移

### 4.1 创建 AntdXSender 组件

**创建文件：** `src/app/components/AntdXSender.tsx`

> **优化**：使用 Sender 的 `header` 属性配合 `Attachments` 组件实现文件上传，
> 这是 Ant Design X 官方推荐的方式，代码更简洁，体验更好。

```typescript
"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { Sender, Attachments } from "@ant-design/x";
import type { AttachmentsProps } from "@ant-design/x";
import { Button } from "antd";
import { Square, ArrowUp, Paperclip } from "lucide-react";

interface AntdXSenderProps {
  onSend: (
    content:
      | string
      | Array<{ type: string; text?: string; image_url?: { url: string } }>
  ) => void;
  onStop: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  interrupt?: unknown;
}

type AttachmentItem = AttachmentsProps["items"][number];

export const AntdXSender = React.memo<AntdXSenderProps>(
  ({
    onSend,
    onStop,
    disabled,
    loading,
    placeholder = "Write your message...",
    interrupt,
  }) => {
    const [value, setValue] = useState("");
    const [files, setFiles] = useState<AttachmentItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(() => {
      if (!value.trim() && files.length === 0) return;
      if (disabled || loading) return;

      // 构建消息内容
      const imageFiles = files.filter((f) =>
        f.type?.startsWith("image/")
      ) as Array<AttachmentItem & { thumbUrl?: string; url?: string }>;

      if (imageFiles.length > 0) {
        const content = [
          { type: "text", text: value },
          ...imageFiles.map((f) => ({
            type: "image_url" as const,
            image_url: { url: f.thumbUrl || f.url || "" },
          })),
        ];
        onSend(content);
      } else {
        onSend(value);
      }

      setValue("");
      setFiles([]);
    }, [value, files, onSend, disabled, loading]);

    // 处理文件上传
    const handleUpload = useCallback((file: File): Promise<AttachmentItem> => {
      return new Promise((resolve) => {
        const uid = `${Date.now()}-${file.name}`;

        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              uid,
              name: file.name,
              type: file.type,
              size: file.size,
              thumbUrl: reader.result as string,
            } as AttachmentItem);
          };
          reader.readAsDataURL(file);
        } else {
          resolve({
            uid,
            name: file.name,
            type: file.type,
            size: file.size,
          } as AttachmentItem);
        }
      });
    }, []);

    // Sender header - 使用 Attachments 组件展示已上传文件
    const header = useMemo(() => {
      if (files.length === 0) return null;

      return (
        <Sender.Header
          title={`Attachments (${files.length})`}
          closable
          onClose={() => setFiles([])}
        >
          <Attachments
            items={files}
            onRemove={(file) => {
              setFiles((prev) => prev.filter((f) => f.uid !== file.uid));
            }}
            overflow="scrollX"
            styles={{
              item: {
                width: 80,
                height: 80,
              },
            }}
          />
        </Sender.Header>
      );
    }, [files]);

    // Sender footer - 操作按钮
    const footer = useMemo(() => {
      return (
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              type="text"
              size="small"
              icon={<Paperclip size={18} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || loading || !!interrupt}
            />
            <span className="text-xs text-muted-foreground/60">
              Shift+Enter
            </span>
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Button
                type="primary"
                danger
                size="small"
                onClick={onStop}
                icon={<Square size={12} />}
              >
                Stop
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                onClick={handleSubmit}
                disabled={disabled || (!value.trim() && files.length === 0)}
                icon={<ArrowUp size={14} />}
              >
                Send
              </Button>
            )}
          </div>
        </div>
      );
    }, [
      loading,
      disabled,
      interrupt,
      value,
      files.length,
      handleSubmit,
      onStop,
    ]);

    return (
      <>
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.txt,.md"
          multiple
          className="hidden"
          onChange={async (e) => {
            const newFiles = Array.from(e.target.files || []);
            const processedFiles = await Promise.all(newFiles.map(handleUpload));
            setFiles((prev) => [...prev, ...processedFiles]);
            e.target.value = "";
          }}
        />

        <Sender
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          loading={loading}
          disabled={disabled || !!interrupt}
          placeholder={
            interrupt
              ? "Agent is waiting for approval above ↑"
              : loading
              ? "Running..."
              : placeholder
          }
          header={header}
          footer={footer}
          styles={{
            textarea: {
              backgroundColor: "transparent",
              fontSize: "14px",
            },
          }}
          className="rounded-2xl border border-border bg-background"
        />
      </>
    );
  }
);

AntdXSender.displayName = "AntdXSender";
```

### 4.2 修改 ChatInterface 集成 Sender

**修改文件：** `src/app/components/ChatInterface.tsx`

添加导入：

```typescript
import { AntdXSender } from "./AntdXSender";
```

在组件内添加：

```typescript
const useAntdxSender = useFeatureFlag("USE_ANTDX_SENDER");
```

找到输入区域（约 506-610 行），替换为：

```typescript
{/* Input Panel */}
<div ref={inputPanelRef} className="flex-shrink-0 bg-background p-4 pt-2">
  <div className="mx-auto w-full max-w-[1024px]">
    {useAntdxSender ? (
      <AntdXSender
        onSend={(content) => sendMessage(content)}
        onStop={stopStream}
        disabled={!assistant}
        loading={isLoading}
        interrupt={interrupt}
      />
    ) : (
      // 保留原有输入组件代码
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-sm",
          "transition-all duration-200 ease-out"
        )}
      >
        {/* 原有 form 代码保持不变 */}
        {/* ... */}
      </div>
    )}
  </div>
</div>
```

### 4.3 验证 Phase 2

**测试命令：**

```bash
# 测试 URL（同时开启消息列表和输入组件）
# http://localhost:3000/?useAntdxMessageList=true&useAntdxSender=true
```

**验证清单：**

- [ ] 文本输入正常
- [ ] Enter 发送正常
- [ ] Shift+Enter 换行正常
- [ ] 文件上传按钮正常
- [ ] 图片预览显示正常
- [ ] 发送按钮状态正确（禁用/启用）
- [ ] Stop 按钮在 loading 时显示

---

## 5. Phase 3: 扩展组件迁移

### 5.1 创建 AntdXThreadList 组件

**创建文件：** `src/app/components/AntdXThreadList.tsx`

```typescript
"use client";

import React, { useMemo } from "react";
import { Conversations } from "@ant-design/x";
import type { ConversationsProps } from "@ant-design/x";
import { isToday, isYesterday, subDays } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export const AntdXThreadList = React.memo<AntdXThreadListProps>(
  ({ threads, activeThreadId, onThreadSelect, onNewThread }) => {
    const items: ConversationsProps["items"] = useMemo(() => {
      return threads.map((thread) => {
        const updatedAt = thread.updated_at
          ? new Date(thread.updated_at)
          : new Date();
        return {
          key: thread.thread_id,
          label: thread.metadata?.title || "New conversation",
          group: getGroupLabel(updatedAt),
          timestamp: updatedAt.getTime(),
        };
      });
    }, [threads]);

    return (
      <div className="flex h-full flex-col">
        {onNewThread && (
          <div className="border-b border-border p-2">
            <Button
              onClick={onNewThread}
              variant="outline"
              className="w-full justify-start gap-2"
            >
              <Plus size={16} />
              New Chat
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          <Conversations
            items={items}
            activeKey={activeThreadId}
            onActiveChange={onThreadSelect}
            groupable
          />
        </div>
      </div>
    );
  }
);

AntdXThreadList.displayName = "AntdXThreadList";

function getGroupLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (date > subDays(new Date(), 7)) return "This Week";
  return "Older";
}
```

### 5.2 创建 SubAgentThoughtChain 组件

**创建文件：** `src/app/components/SubAgentThoughtChain.tsx`

```typescript
"use client";

import React from "react";
import { ThoughtChain } from "@ant-design/x";
import type { ThoughtChainProps } from "@ant-design/x";
import type { SubAgent } from "@/app/types/types";

interface SubAgentThoughtChainProps {
  subAgents: SubAgent[];
  isLoading?: boolean;
}

export const SubAgentThoughtChain = React.memo<SubAgentThoughtChainProps>(
  ({ subAgents, isLoading }) => {
    const items: ThoughtChainProps["items"] = subAgents.map((sa) => ({
      key: sa.id,
      title: sa.subAgentName || sa.name,
      status: isLoading && sa.status === "active" ? "pending" : mapSubAgentStatus(sa.status),
      description: sa.status === "active" ? "Processing..." : undefined,
      content: sa.output ? (
        <div className="text-sm">
          <pre className="whitespace-pre-wrap">
            {typeof sa.output === "string"
              ? sa.output
              : JSON.stringify(sa.output, null, 2)}
          </pre>
        </div>
      ) : undefined,
      blink: isLoading && sa.status === "active",
      collapsible: sa.status === "completed",
    }));

    if (!items.length) return null;

    return (
      <div className="mt-3 border-t border-border pt-3">
        <ThoughtChain items={items} line="dashed" />
      </div>
    );
  }
);

SubAgentThoughtChain.displayName = "SubAgentThoughtChain";

function mapSubAgentStatus(
  status: SubAgent["status"]
): ThoughtChainProps["items"][number]["status"] {
  // ThoughtChain status 仅支持: 'loading' | 'success' | 'error' | 'abort'
  const map: Record<
    string,
    ThoughtChainProps["items"][number]["status"]
  > = {
    pending: "loading",
    active: "loading",
    completed: "success",
    error: "error",
  };
  return map[status] || "loading";
}
```

### 5.3 修改 ThreadList 页面集成

**修改文件：** `src/app/components/ThreadList.tsx`

添加 Feature Flag 集成：

```typescript
import { useFeatureFlag } from "@/lib/featureFlags";
import { AntdXThreadList } from "./AntdXThreadList";

// 在 ThreadList 组件内
const useAntdxThreadList = useFeatureFlag("USE_ANTDX_THREAD_LIST");

// 如果开启 Feature Flag，使用新组件
if (useAntdxThreadList) {
  return (
    <AntdXThreadList
      threads={groupedThreads.flatMap(g => g.threads)}
      activeThreadId={threadId}
      onThreadSelect={setThreadId}
      onNewThread={handleNewThread}
    />
  );
}

// 否则保留原有渲染逻辑
// return ( ... existing JSX ... )
```

**注意：** 需要根据现有的 ThreadList 组件结构调整 props 传递方式。

### 5.4 验证 Phase 3

**测试命令：**

```bash
# 测试 URL（开启所有 Feature Flags）
# http://localhost:3000/?useAntdxMessageList=true&useAntdxSender=true&useAntdxThreadList=true
```

**验证清单：**

- [ ] 线程列表正常显示
- [ ] 线程分组正确（Today/Yesterday/This Week/Older）
- [ ] 线程切换正常
- [ ] 新建线程按钮正常
- [ ] 子任务 ThoughtChain 正常显示

---

## 6. Phase 4: 样式与主题

### 6.1 创建 AntdXProvider

**创建文件：** `src/providers/AntdXProvider.tsx`

> **关键修复**：
> 1. Ant Design 主题引擎无法直接解析 CSS 变量
> 2. 需要将 HSL 颜色值转换为 HEX 格式（Ant Design 需要 HEX/RGB 进行颜色梯度计算）
> 3. 必须使用 `getComputedStyle` 在客户端动态解析

```typescript
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { XProvider } from "@ant-design/x";
import { ConfigProvider, theme } from "antd";

interface AntdXProviderProps {
  children: React.ReactNode;
}

/**
 * HSL 字符串转换为 HEX 颜色
 * Ant Design 主题引擎需要 HEX 或 RGB 格式才能正确计算派生颜色
 *
 * @param hslStr - HSL 格式字符串，如 "220 90% 50%" 或 "hsl(220 90% 50%)"
 * @returns HEX 颜色字符串，如 "#1a4db3"
 */
function hslToHex(hslStr: string): string {
  // 解析 HSL 值
  let h: number, s: number, l: number;

  // 处理 "hsl(220 90% 50%)" 格式
  const hslMatch = hslStr.match(/hsl\s*\(\s*(\d+)\s+(\d+)%\s+(\d+)%\s*\)/i);
  if (hslMatch) {
    h = parseInt(hslMatch[1], 10);
    s = parseInt(hslMatch[2], 10);
    l = parseInt(hslMatch[3], 10);
  } else {
    // 处理 "220 90% 50%" 格式
    const parts = hslStr.trim().split(/\s+/);
    if (parts.length !== 3) return "#000000";
    h = parseInt(parts[0], 10);
    s = parseInt(parts[1].replace("%", ""), 10);
    l = parseInt(parts[2].replace("%", ""), 10);
  }

  // HSL to RGB
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  // RGB to HEX
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 解析 CSS 变量并转换为 HEX 颜色
 * Ant Design 主题引擎需要 HEX/RGB 格式进行颜色梯度计算
 */
function resolveCssVariableToHex(cssVar: string): string {
  if (typeof window === "undefined") return "#000000";

  // 提取变量名，如 "hsl(var(--primary))" -> "--primary"
  const match = cssVar.match(/var\((--[^)]+)\)/);
  if (!match) return "#000000";

  const varName = match[1];
  const hslValue = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();

  // CSS 变量值格式为 "220 90% 50%"，转换为 HEX
  return hslToHex(hslValue);
}

/**
 * 获取解析后的主题 Token
 */
function useResolvedThemeTokens() {
  const [tokens, setTokens] = useState<Record<string, string>>({});

  useEffect(() => {
    // 在客户端解析 CSS 变量并转换为 HEX
    const resolved = {
      colorPrimary: resolveCssVariableToHex("hsl(var(--primary))"),
      colorBgContainer: resolveCssVariableToHex("hsl(var(--background))"),
      colorText: resolveCssVariableToHex("hsl(var(--foreground))"),
      colorTextSecondary: resolveCssVariableToHex("hsl(var(--muted-foreground))"),
      colorBorder: resolveCssVariableToHex("hsl(var(--border))"),
    };
    setTokens(resolved);

    // 监听主题变化（暗色/亮色切换）
    const observer = new MutationObserver(() => {
      const newResolved = {
        colorPrimary: resolveCssVariableToHex("hsl(var(--primary))"),
        colorBgContainer: resolveCssVariableToHex("hsl(var(--background))"),
        colorText: resolveCssVariableToHex("hsl(var(--foreground))"),
        colorTextSecondary: resolveCssVariableToHex("hsl(var(--muted-foreground))"),
        colorBorder: resolveCssVariableToHex("hsl(var(--border))"),
      };
      setTokens(newResolved);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return tokens;
}

/**
 * 检测当前主题（亮色/暗色）
 */
function useAppTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () =>
      document.documentElement.classList.contains("dark");
    setIsDark(checkDark());

    const observer = new MutationObserver(() => setIsDark(checkDark()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark ? "dark" : "light";
}

export function AntdXProvider({ children }: AntdXProviderProps) {
  const appTheme = useAppTheme();
  const tokens = useResolvedThemeTokens();

  // 仅在 tokens 解析完成后渲染（避免闪烁）
  const themeConfig = useMemo(() => ({
    algorithm:
      appTheme === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      ...tokens,
      borderRadius: 8,
    },
  }), [appTheme, tokens]);

  // 等待 tokens 解析完成
  if (Object.keys(tokens).length === 0) {
    return <>{children}</>;
  }

  return (
    <ConfigProvider theme={themeConfig}>
      <XProvider>{children}</XProvider>
    </ConfigProvider>
  );
}
```

### 6.2 修改 layout.tsx 集成 Provider

**修改文件：** `src/app/layout.tsx`

```typescript
import { AntdXProvider } from "@/providers/AntdXProvider";

// 在现有的 providers 层级中添加
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NuqsAdapter>
          <ClientProvider>
            <AntdXProvider>
              {children}
            </AntdXProvider>
          </ClientProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
```

### 6.3 添加 CSS 覆盖

**修改文件：** `src/app/globals.css`

在文件末尾添加：

```css
/* ===========================================
   Ant Design X 样式覆盖
   =========================================== */

/* 基础字体 */
.ant-x-bubble {
  font-family: var(--font-sans);
}

/* 用户消息气泡 */
.ant-x-bubble-user {
  background-color: hsl(var(--primary)) !important;
  color: hsl(var(--primary-foreground)) !important;
}

/* AI 消息气泡 */
.ant-x-bubble-ai {
  background-color: hsl(var(--accent)) !important;
}

/* 输入组件 */
.ant-x-sender {
  border-color: hsl(var(--border)) !important;
}

.ant-x-sender-textarea {
  background-color: transparent !important;
  color: hsl(var(--foreground)) !important;
}

.ant-x-sender-textarea::placeholder {
  color: hsl(var(--muted-foreground) / 0.5) !important;
}

/* ThoughtChain */
.ant-x-thought-chain {
  font-family: var(--font-sans);
}

/* Conversations */
.ant-x-conversations {
  font-family: var(--font-sans);
}

/* 暗色主题调整 */
.dark {
  .ant-x-bubble-ai {
    background-color: hsl(var(--accent) / 0.5) !important;
  }

  .ant-x-sender {
    background-color: hsl(var(--background)) !important;
  }
}
```

### 6.4 验证 Phase 4

**验证清单：**

- [ ] 亮色主题下所有组件样式正确
- [ ] 暗色主题下所有组件样式正确
- [ ] 切换主题时 Ant Design X 组件响应正确
- [ ] 与现有 shadcn/ui 组件样式协调一致

---

## 7. Phase 5: 测试与验收

### 7.1 功能测试

**完整功能测试清单：**

| 功能 | 测试步骤 | 预期结果 |
|------|---------|---------|
| 文本发送 | 输入文本 → 点击发送 | 消息显示在列表 |
| 图片发送 | 上传图片 → 发送 | 图片正确渲染 |
| 流式响应 | 发送消息 → 等待 AI 回复 | 内容逐步显示 |
| Tool Calls | 触发工具调用 | 状态显示正确 |
| 中断处理 | 触发中断 → 点击 Approve | 流程继续 |
| 文件上传 | 点击附件 → 选择文件 | 文件显示在输入区 |
| 线程切换 | 点击不同线程 | 消息正确加载 |
| 编辑重发 | 编辑用户消息 → 发送 | 重新发送成功 |

### 7.2 性能测试

```bash
# 构建生产版本
yarn build

# 启动生产服务器
yarn start

# 使用 Lighthouse 测试
# FCP < 2.0s, TTI < 2.5s

# 检查打包大小
# 增量应 < 160KB gzip
```

### 7.3 回归测试

**关闭所有 Feature Flags 测试：**

```bash
# 访问 http://localhost:3000/
# 确认所有原有功能正常
```

**开启所有 Feature Flags 测试：**

```bash
# 访问 http://localhost:3000/?useAntdxMessageList=true&useAntdxSender=true&useAntdxThreadList=true
# 确认所有新功能正常
```

---

## 8. 回滚与清理

### 8.1 创建 Git Tag

每个 Phase 完成后创建标签：

```bash
# Phase 0 完成后
git add .
git commit -m "feat: Phase 0 - Ant Design X 环境搭建与 POC"
git tag -a v0.1.0-antd-x-phase0 -m "Phase 0: Preparation"

# Phase 1 完成后
git add .
git commit -m "feat: Phase 1 - 消息列表迁移到 Ant Design X"
git tag -a v0.2.0-antd-x-phase1 -m "Phase 1: Message List"

# Phase 2 完成后
git add .
git commit -m "feat: Phase 2 - 输入组件迁移到 Ant Design X"
git tag -a v0.3.0-antd-x-phase2 -m "Phase 2: Sender"

# Phase 3 完成后
git add .
git commit -m "feat: Phase 3 - 扩展组件迁移到 Ant Design X"
git tag -a v0.4.0-antd-x-phase3 -m "Phase 3: Extensions"

# Phase 4 完成后
git add .
git commit -m "feat: Phase 4 - 样式与主题适配"
git tag -a v0.5.0-antd-x-phase4 -m "Phase 4: Styling"

# Phase 5 完成后
git add .
git commit -m "feat: Ant Design X 迁移完成"
git tag -a v1.0.0-antd-x-release -m "Release: Ant Design X Migration"
```

### 8.2 回滚操作

```bash
# 回滚到指定 Phase
git checkout v0.2.0-antd-x-phase1

# 或者直接关闭 Feature Flag
# 修改 src/lib/featureFlags.ts 中的值为 false
```

### 8.3 最终清理（迁移完成后）

删除不再需要的依赖：

```bash
# 移除旧依赖（可选）
yarn remove react-markdown react-syntax-highlighter use-stick-to-bottom
```

删除备份文件：

```bash
# 确认迁移完成后
rm -rf .backup/
```

---

## 文档版本历史

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.0 | 2026-02-16 | 初始版本，基于 antd-x-migration-plan.md v1.3 创建 |
| v1.1 | 2026-02-16 | Round 1 评审：修复 Feature Flag URL 参数转换逻辑、移除 POC 未使用导入、修复备份命令 |
| v1.2 | 2026-02-16 | Round 2 评审：移除未使用的 format 导入、完善 ThreadList 集成说明、修复 SubAgentThoughtChain isLoading 使用 |
| v1.3 | 2026-02-16 | Round 3 评审：最终检查完成，确认文档完整性 |
| v2.0 | 2026-02-16 | 专家评审 Round 1 修订：修复主题定制方案、修复 ThoughtChain status 值、移除重复 ToolArgsRenderer、移除 date-fns 安装、重构 AntdXSender |
| **v2.1** | 2026-02-16 | **专家评审 Round 2 修订**：添加 HSL→HEX 颜色转换函数（Ant Design 主题引擎需要 HEX 格式进行颜色梯度计算） |
