/**
 * Agent 服务相关类型
 */

export interface Thread {
  thread_id: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
}
