/**
 * Agent 服务 API
 */

import { API_SERVER } from "./client";
import type { Thread, Message } from "@/types/agent";

export async function createThread(
  metadata?: Record<string, unknown>
): Promise<Thread> {
  const response = await fetch(`${API_SERVER}/threads`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
  });

  if (!response.ok) {
    throw new Error("创建会话失败");
  }

  return response.json();
}

export async function getThread(threadId: string): Promise<Thread> {
  const response = await fetch(`${API_SERVER}/threads/${threadId}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("获取会话失败");
  }

  return response.json();
}

export async function getThreadHistory(threadId: string): Promise<Message[]> {
  const response = await fetch(`${API_SERVER}/threads/${threadId}/state`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("获取历史消息失败");
  }

  const state = await response.json();
  return state.values?.messages || [];
}
