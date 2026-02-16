"use client";

import React from "react";
import { Bubble, Sender, ThoughtChain } from "@ant-design/x";
import { Button } from "antd";

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

const DUMMY_THOUGHTS = [
  {
    key: "1",
    title: "Analyzing request",
    status: "success" as const,
    description: "Completed",
  },
  {
    key: "2",
    title: "Processing data",
    status: "loading" as const,
    description: "In progress...",
  },
];

export default function AntdXPocPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <h1 className="text-2xl font-bold text-foreground">
          Ant Design X 2.0 POC
        </h1>

        {/* Bubble.List Demo */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Bubble.List Demo</h2>
          <Bubble.List items={DUMMY_ITEMS} />
        </div>

        {/* ThoughtChain Demo */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">ThoughtChain Demo</h2>
          <ThoughtChain items={DUMMY_THOUGHTS} />
        </div>

        {/* Sender Demo */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-lg font-semibold">Sender Demo</h2>
          <Sender
            placeholder="Type a message..."
            footer={
              <div className="flex justify-end p-2">
                <Button type="primary" size="small">
                  Send
                </Button>
              </div>
            }
          />
        </div>

        {/* Success Message */}
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <p className="text-sm text-green-600">
            POC 验证成功：Ant Design X 组件可正常渲染
          </p>
          <ul className="mt-2 text-xs text-green-600/80">
            <li>Bubble.List - 消息气泡列表</li>
            <li>ThoughtChain - 思维链展示</li>
            <li>Sender - 消息输入组件</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
