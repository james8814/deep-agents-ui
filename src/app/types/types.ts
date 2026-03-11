export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status:
    | "pending"
    | "completed"
    | "error"
    | "interrupted"
    | "ok"
    | "cancelled"
    | "timeout";
  // Phase 2.5 P2-1: Cancellation and Timeout support
  cancellation_reason?: string; // user_request, timeout, etc.
  timeout_seconds?: number; // Duration that caused timeout
}

export interface SubAgent {
  id: string;
  name: string;
  subAgentName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "pending" | "active" | "completed" | "error";
  logs?: import("@/app/types/subagent").LogEntry[];
}

export interface FileItem {
  path: string;
  content: string;
}

export interface FileMetadata {
  path: string;
  name: string;
  directory: string;
  addedAt: number; // timestamp in ms
  size: number; // character count
  extension: string;
}

export type FileSortBy = "name" | "time";

export interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  updatedAt?: Date;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterruptData {
  value: any;
  ns?: string[];
  scope?: string;
}

export interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
  description?: string;
}

export interface ReviewConfig {
  actionName: string;
  allowedDecisions?: string[];
}

export interface ToolApprovalInterruptData {
  action_requests: ActionRequest[];
  review_configs?: ReviewConfig[];
}

// Phase 2.5 P2-3: File Coordination - Attachment Summary
export interface AttachmentSummary {
  path: string; // File path
  size_bytes: number; // File size in bytes
  mime_type: string; // Content type (e.g., "application/pdf")
  hash_sha256?: string; // SHA256 hash for integrity checking
  preview_url?: string; // URL for preview
  download_url?: string; // URL for download
}

// Phase 2.5 P2-2: Schema Versioning
export interface MessageWithSchema {
  schema_version?: string; // Current version (e.g., "2.1")
  content: any;
  attachments?: AttachmentSummary[];
}

// Schema version compatibility checker
export const isSchemaVersionCompatible = (
  messageVersion?: string,
  minSupportedVersion = "2.0"
): boolean => {
  if (!messageVersion) return true; // Legacy messages are compatible

  const [msgMajor, msgMinor = "0"] = messageVersion.split(".");
  const [minMajor, minMinor = "0"] = minSupportedVersion.split(".");

  const msgNum = parseInt(`${msgMajor}${msgMinor}`);
  const minNum = parseInt(`${minMajor}${minMinor}`);

  return msgNum >= minNum;
};

// Degrade message if schema version incompatible
export const degradeMessageIfNeeded = (
  message: any,
  currentVersion = "2.1"
): string => {
  const version = message.schema_version;
  if (!isSchemaVersionCompatible(version)) {
    // Return text representation for unknown versions
    return typeof message.content === "string"
      ? message.content
      : JSON.stringify(message.content);
  }
  return message.content;
};
