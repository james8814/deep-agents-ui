# File Upload & Delivery Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add file upload, sharing, referencing, and delivery preview capabilities to the chat interface.

**Architecture:** Extend ChatInterface with file upload capabilities, create new DeliveryCard component for agent deliverables, and enhance useChat hook to handle multimodal messages. Reuse existing FileViewDialog for file viewing.

**Tech Stack:** React, TypeScript, LangChain/LangGraph SDK, Tailwind CSS, Lucide icons

---

## Task 1: Create FileChip Component

**Files:**
- Create: `src/app/components/FileChip.tsx`

**Step 1: Create FileChip component**

```typescript
"use client";

import React from "react";
import { X, FileText, Image, FileSpreadsheet, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileChipData {
  id: string;
  name: string;
  type: string;
  size?: number;
  data?: string; // base64 data
  url?: string; // URL reference
}

interface FileChipProps {
  file: FileChipData;
  onRemove?: () => void;
  onClick?: () => void;
  showRemove?: boolean;
  className?: string;
}

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.includes("spreadsheet") || type.includes("csv")) return FileSpreadsheet;
  if (type.includes("json") || type.includes("javascript") || type.includes("typescript")) return FileCode;
  return FileText;
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const FileChip = React.memo<FileChipProps>(({
  file,
  onRemove,
  onClick,
  showRemove = true,
  className,
}) => {
  const Icon = getFileIcon(file.type);
  const sizeText = formatFileSize(file.size);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm",
        onClick && "cursor-pointer hover:bg-muted transition-colors",
        className
      )}
      onClick={onClick}
    >
      <Icon size={14} className="text-muted-foreground flex-shrink-0" />
      <span className="truncate max-w-[200px]">{file.name}</span>
      {sizeText && (
        <span className="text-muted-foreground text-xs">{sizeText}</span>
      )}
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
        >
          <X size={12} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
});

FileChip.displayName = "FileChip";
```

**Step 2: Verify component compiles**

Run: `cd /root/projects/deep-agents-ui && yarn build`
Expected: Build succeeds without errors

**Step 3: Commit**

```bash
cd /root/projects/deep-agents-ui && git add src/app/components/FileChip.tsx && git commit -m "feat(ui): add FileChip component for file display"
```

---

## Task 2: Create FileUploadZone Component

**Files:**
- Create: `src/app/components/FileUploadZone.tsx`
- Modify: `src/app/components/ChatInterface.tsx`

**Step 1: Create FileUploadZone component**

```typescript
"use client";

import React, { useRef, useCallback, useState } from "react";
import { Paperclip, Image, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileChip, FileChipData } from "./FileChip";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
  files: FileChipData[];
  onFilesChange: (files: FileChipData[]) => void;
  disabled?: boolean;
  className?: string;
}

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/json",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const FileUploadZone = React.memo<FileUploadZoneProps>(({
  files,
  onFilesChange,
  disabled = false,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleButtonClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const convertToBase64 = (file: globalThis.File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    if (selectedFiles.length === 0) return;

    // Validate files
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`File "${file.name}" is too large. Max size is 10MB.`);
        return;
      }
    }

    // Convert files to base64
    const newFiles: FileChipData[] = await Promise.all(
      selectedFiles.map(async (file) => {
        const base64 = await convertToBase64(file);
        return {
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          data: base64,
        };
      })
    );

    onFilesChange([...files, ...newFiles]);

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [files, onFilesChange]);

  const handleRemoveFile = useCallback((fileId: string) => {
    onFilesChange(files.filter(f => f.id !== fileId));
  }, [files, onFilesChange]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Uploaded files display */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {files.map((file) => (
            <FileChip
              key={file.id}
              file={file}
              onRemove={() => handleRemoveFile(file.id)}
            />
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-4 text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Upload button - rendered by parent */}
    </div>
  );
});

FileUploadZone.displayName = "FileUploadZone";

// Export upload button for use in toolbar
export const UploadButton = React.memo<{
  onClick: () => void;
  disabled?: boolean;
}>(({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors",
      "hover:bg-accent hover:text-foreground",
      "disabled:opacity-30 disabled:cursor-not-allowed"
    )}
    title="Attach file"
  >
    <Paperclip size={14} />
  </button>
));

UploadButton.displayName = "UploadButton";
```

**Step 2: Verify component compiles**

Run: `cd /root/projects/deep-agents-ui && yarn build`
Expected: Build succeeds without errors

**Step 3: Commit**

```bash
cd /root/projects/deep-agents-ui && git add src/app/components/FileUploadZone.tsx && git commit -m "feat(ui): add FileUploadZone component for file uploads"
```

---

## Task 3: Integrate File Upload into ChatInterface

**Files:**
- Modify: `src/app/components/ChatInterface.tsx`
- Modify: `src/app/hooks/useChat.ts`

**Step 1: Update ChatInterface to use FileUploadZone**

Read current ChatInterface.tsx, then add imports and state:

```typescript
// Add imports at top
import { FileUploadZone, UploadButton, FileChipData } from "./FileUploadZone";

// Add state inside ChatInterface component (after other useState calls)
const [attachedFiles, setAttachedFiles] = useState<FileChipData[]>([]);
const uploadZoneRef = useRef<{ triggerUpload: () => void }>(null);
```

**Step 2: Update handleSubmit to include files**

Modify the `handleSubmit` function:

```typescript
const handleSubmit = useCallback(
  (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const messageText = input.trim();
    if (!messageText || isLoading || submitDisabled) return;

    // Build content - text + file blocks
    const content: string | Array<{ type: string; text?: string; image_url?: { url: string }; data?: string; mimeType?: string }> =
      attachedFiles.length > 0
        ? [
            { type: "text", text: messageText },
            ...attachedFiles.map((file) => {
              if (file.type.startsWith("image/")) {
                return {
                  type: "image_url",
                  image_url: { url: file.data! },
                };
              }
              return {
                type: "file",
                data: file.data,
                mimeType: file.type,
              };
            }),
          ]
        : messageText;

    sendMessage(content);
    setInput("");
    setAttachedFiles([]);
  },
  [input, isLoading, sendMessage, setInput, submitDisabled, attachedFiles]
);
```

**Step 3: Update useChat to accept multimodal content**

Modify `sendMessage` in useChat.ts:

```typescript
const sendMessage = useCallback(
  (content: string | Array<{ type: string; text?: string; image_url?: { url: string }; data?: string; mimeType?: string }>) => {
    const newMessage: Message = {
      id: uuidv4(),
      type: "human",
      content
    };
    stream.submit(
      { messages: [newMessage] },
      {
        optimisticValues: (prev) => ({
          messages: [...(prev.messages ?? []), newMessage],
        }),
        config: { ...(activeAssistant?.config ?? {}), recursion_limit: 200 },
      }
    );
    onHistoryRevalidate?.();
  },
  [stream, activeAssistant?.config, onHistoryRevalidate]
);
```

**Step 4: Add upload button to toolbar**

In the toolbar section (around line 420), add upload button:

```typescript
{/* Left: Upload + Expand button + hint */}
<div className="flex items-center gap-2">
  <UploadButton
    onClick={() => uploadZoneRef.current?.triggerUpload()}
    disabled={isLoading || !!interrupt}
  />
  <button
    type="button"
    onClick={() => setIsExpanded(!isExpanded)}
    // ... existing expand button code
  >
```

**Step 5: Add FileUploadZone to form**

Add FileUploadZone inside the form, before the textarea:

```typescript
<form onSubmit={handleSubmit} className="flex flex-col">
  {/* File upload zone */}
  <FileUploadZone
    files={attachedFiles}
    onFilesChange={setAttachedFiles}
    disabled={isLoading || !!interrupt}
  />

  {/* Textarea */}
  <textarea ... />
```

**Step 6: Verify build succeeds**

Run: `cd /root/projects/deep-agents-ui && yarn build`
Expected: Build succeeds without errors

**Step 7: Commit**

```bash
cd /root/projects/deep-agents-ui && git add src/app/components/ChatInterface.tsx src/app/hooks/useChat.ts && git commit -m "feat(chat): integrate file upload into chat input"
```

---

## Task 4: Create DeliveryCard Component

**Files:**
- Create: `src/app/components/DeliveryCard.tsx`

**Step 1: Create DeliveryCard component**

```typescript
"use client";

import React, { useMemo } from "react";
import { FileText, FileCode, FileSpreadsheet, Image, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileMetadata } from "@/app/types/types";

interface DeliveryFile {
  path: string;
  content: string;
  metadata?: FileMetadata;
}

interface DeliveryCardProps {
  files: DeliveryFile[];
  onViewFile: (path: string) => void;
  onViewAll?: () => void;
  className?: string;
}

const getFileIcon = (extension: string) => {
  const ext = extension.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return Image;
  if (["csv", "xlsx", "xls"].includes(ext)) return FileSpreadsheet;
  if (["js", "ts", "jsx", "tsx", "py", "json", "yaml", "yml"].includes(ext)) return FileCode;
  return FileText;
};

const getFileName = (path: string): string => {
  return path.split("/").pop() || path;
};

const getFileExtension = (path: string): string => {
  const parts = path.split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
};

const formatRelativeTime = (timestamp?: number): string => {
  if (!timestamp) return "";
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
};

const formatFileSize = (content: string): string => {
  const bytes = new Blob([content]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Preview component for the last file
const FilePreview = React.memo<{
  file: DeliveryFile;
  onView: () => void;
}>(({ file, onView }) => {
  const ext = getFileExtension(file.path);
  const isTextFile = ["md", "txt", "json", "csv", "js", "ts", "py", "yaml", "yml", "html", "css"].includes(ext);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);

  const previewContent = useMemo(() => {
    if (isImage) {
      return (
        <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg">
          <Image size={32} className="text-muted-foreground" />
        </div>
      );
    }

    if (isTextFile) {
      const lines = file.content.split("\n").slice(0, 12);
      return (
        <pre className="text-xs text-muted-foreground overflow-hidden whitespace-pre-wrap break-all line-clamp-12">
          {lines.join("\n")}
          {file.content.split("\n").length > 12 && "\n..."}
        </pre>
      );
    }

    return (
      <div className="flex items-center justify-center h-24 bg-muted/30 rounded-lg">
        <FileText size={32} className="text-muted-foreground" />
      </div>
    );
  }, [file.content, isTextFile, isImage]);

  return (
    <div className="mt-3 border border-border/50 rounded-lg overflow-hidden bg-background/50">
      {/* Preview header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 bg-muted/20">
        <FileText size={14} className="text-muted-foreground" />
        <span className="text-sm font-medium truncate flex-1">{getFileName(file.path)}</span>
        <span className="text-xs text-muted-foreground">{formatFileSize(file.content)}</span>
      </div>

      {/* Preview content */}
      <div className="p-3 max-h-48 overflow-hidden">
        {previewContent}
      </div>

      {/* View full file button */}
      <div className="px-3 py-2 border-t border-border/50 bg-muted/10">
        <button
          onClick={onView}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          查看完整文件
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
});

FilePreview.displayName = "FilePreview";

export const DeliveryCard = React.memo<DeliveryCardProps>(({
  files,
  onViewFile,
  onViewAll,
  className,
}) => {
  if (files.length === 0) return null;

  const displayFiles = files.slice(0, 3);
  const lastFile = displayFiles[displayFiles.length - 1];
  const otherFiles = displayFiles.slice(0, -1);

  return (
    <div className={cn("mt-4 p-4 rounded-xl border border-border/50 bg-muted/20", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">📦</span>
          <span className="text-sm font-medium">交付文件</span>
          <span className="text-xs text-muted-foreground">({files.length})</span>
        </div>
        {onViewAll && files.length > 0 && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            查看全部
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Other files (not the last one) */}
      {otherFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {otherFiles.map((file) => {
            const Icon = getFileIcon(getFileExtension(file.path));
            return (
              <button
                key={file.path}
                onClick={() => onViewFile(file.path)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-background hover:bg-muted transition-colors"
              >
                <Icon size={14} className="text-muted-foreground" />
                <span className="text-sm truncate max-w-[150px]">{getFileName(file.path)}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />
                  {formatRelativeTime(file.metadata?.addedAt)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Last file with preview */}
      {lastFile && (
        <FilePreview
          file={lastFile}
          onView={() => onViewFile(lastFile.path)}
        />
      )}
    </div>
  );
});

DeliveryCard.displayName = "DeliveryCard";
```

**Step 2: Verify build succeeds**

Run: `cd /root/projects/deep-agents-ui && yarn build`
Expected: Build succeeds without errors

**Step 3: Commit**

```bash
cd /root/projects/deep-agents-ui && git add src/app/components/DeliveryCard.tsx && git commit -m "feat(ui): add DeliveryCard component for agent deliverables"
```

---

## Task 5: Integrate DeliveryCard into ChatMessage

**Files:**
- Modify: `src/app/components/ChatMessage.tsx`

**Step 1: Read current ChatMessage.tsx to understand structure**

**Step 2: Add DeliveryCard import and props**

```typescript
// Add import
import { DeliveryCard } from "./DeliveryCard";
import type { FileMetadata } from "@/app/types/types";

// Add to ChatMessageProps interface
interface ChatMessageProps {
  // ... existing props
  files?: Record<string, string>;
  fileMetadata?: Map<string, FileMetadata>;
  onViewFile?: (path: string) => void;
  onViewAllFiles?: () => void;
  showDeliveryCards?: boolean;
}
```

**Step 3: Add DeliveryCard rendering at end of AI message**

Find the end of the component's return statement, before the closing div, add:

```typescript
{/* Delivery cards - show after AI message when task completes */}
{isLastAiMessage && showDeliveryCards && files && Object.keys(files).length > 0 && (
  <DeliveryCard
    files={Object.entries(files).map(([path, content]) => ({
      path,
      content,
      metadata: fileMetadata?.get(path),
    }))}
    onViewFile={onViewFile || (() => {})}
    onViewAll={onViewAllFiles}
  />
)}
```

**Step 4: Verify build succeeds**

Run: `cd /root/projects/deep-agents-ui && yarn build`
Expected: Build succeeds without errors

**Step 5: Commit**

```bash
cd /root/projects/deep-agents-ui && git add src/app/components/ChatMessage.tsx && git commit -m "feat(chat): integrate DeliveryCard into ChatMessage component"
```

---

## Task 6: Wire Delivery Detection in ChatInterface

**Files:**
- Modify: `src/app/components/ChatInterface.tsx`
- Modify: `src/providers/ChatProvider.tsx`

**Step 1: Track file metadata in ChatInterface**

Add state and logic to track when files were added:

```typescript
// Add to ChatInterface
const prevFilesRef = useRef<Record<string, string>>({});
const [fileMetadata, setFileMetadata] = useState<Map<string, FileMetadata>>(new Map());

// Update file metadata when files change
useEffect(() => {
  const currentFiles = stream.values.files ?? {};
  const newMetadata = new Map(fileMetadata);

  Object.keys(currentFiles).forEach((path) => {
    if (!prevFilesRef.current[path]) {
      // New file added
      const ext = path.split(".").pop() || "";
      newMetadata.set(path, {
        path,
        name: path.split("/").pop() || path,
        directory: path.split("/").slice(0, -1).join("/"),
        addedAt: Date.now(),
        size: currentFiles[path].length,
        extension: ext,
      });
    }
  });

  setFileMetadata(newMetadata);
  prevFilesRef.current = currentFiles;
}, [stream.values.files, fileMetadata]);
```

**Step 2: Detect task completion for delivery cards**

```typescript
// Add state for tracking delivery display
const [showDelivery, setShowDelivery] = useState(false);
const wasLoadingRef = useRef(false);

useEffect(() => {
  if (wasLoadingRef.current && !isLoading) {
    // Task just completed
    setShowDelivery(true);
  }
  wasLoadingRef.current = isLoading;
}, [isLoading]);

// Pass to ChatMessage
const lastProcessedIndex = processedMessages.length - 1;
```

**Step 3: Update ChatMessage rendering to pass new props**

```typescript
<ChatMessage
  message={data.message}
  toolCalls={data.toolCalls}
  isLoading={isLoading}
  isStreaming={isLoading && isLastMessage && data.message.type === "ai"}
  actionRequestsMap={isLastMessage ? actionRequestsMap : undefined}
  reviewConfigsMap={isLastMessage ? reviewConfigsMap : undefined}
  ui={messageUi}
  stream={stream}
  onResumeInterrupt={resumeInterrupt}
  graphId={assistant?.graph_id}
  isLastAiMessage={isLastMessage && data.message.type === "ai"}
  onRegenerate={regenerateLastMessage}
  onEditAndResend={data.message.type === "human" ? handleEditAndResend : undefined}
  // New props for delivery cards
  files={isLastMessage ? files : undefined}
  fileMetadata={fileMetadata}
  onViewFile={handleViewFile}
  onViewAllFiles={handleViewAllFiles}
  showDeliveryCards={isLastMessage && showDelivery && data.message.type === "ai"}
/>
```

**Step 4: Add file viewing handlers**

```typescript
// Add state for file viewer
const [viewingFile, setViewingFile] = useState<string | null>(null);

const handleViewFile = useCallback((path: string) => {
  setViewingFile(path);
}, []);

const handleViewAllFiles = useCallback(() => {
  // Open ContextPanel Files tab - trigger via context or state
  // This will be wired to set context panel tab to "files"
  // For now, just open the first file
  const fileList = Object.keys(files);
  if (fileList.length > 0) {
    setViewingFile(fileList[0]);
  }
}, [files]);
```

**Step 5: Add FileViewDialog to render when file is selected**

```typescript
// Import at top
import { FileViewDialog } from "./FileViewDialog";

// Add in JSX, after the input panel
{viewingFile && files[viewingFile] && (
  <FileViewDialog
    filePath={viewingFile}
    content={files[viewingFile]}
    onClose={() => setViewingFile(null)}
  />
)}
```

**Step 6: Verify build succeeds**

Run: `cd /root/projects/deep-agents-ui && yarn build`
Expected: Build succeeds without errors

**Step 7: Commit**

```bash
cd /root/projects/deep-agents-ui && git add src/app/components/ChatInterface.tsx && git commit -m "feat(chat): wire delivery detection and file viewing"
```

---

## Task 7: Add File Sharing URL Feature

**Files:**
- Modify: `src/app/components/FileChip.tsx`
- Modify: `src/app/components/ContextPanel.tsx`

**Step 1: Add copy URL functionality to FileChip**

Update FileChip to support copying shareable URL:

```typescript
// Add Copy icon import
import { X, FileText, Image, FileSpreadsheet, FileCode, Copy, Check } from "lucide-react";

// Add to FileChipProps
interface FileChipProps {
  file: FileChipData;
  onRemove?: () => void;
  onClick?: () => void;
  showRemove?: boolean;
  shareUrl?: string; // New: shareable URL
  className?: string;
}

// Add copy state and handler inside component
const [copied, setCopied] = useState(false);

const handleCopyUrl = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  if (file.shareUrl) {
    navigator.clipboard.writeText(file.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
}, [file.shareUrl]);

// Add copy button in JSX (after size text, before remove button)
{file.shareUrl && (
  <button
    type="button"
    onClick={handleCopyUrl}
    className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5"
    title="Copy share URL"
  >
    {copied ? (
      <Check size={12} className="text-success" />
    ) : (
      <Copy size={12} className="text-muted-foreground" />
    )}
  </button>
)}
```

**Step 2: Generate share URLs in FileUploadZone**

Update FileUploadZone to generate share URLs:

```typescript
// In handleFileChange, after creating newFiles:
const newFiles: FileChipData[] = await Promise.all(
  selectedFiles.map(async (file) => {
    const base64 = await convertToBase64(file);
    // Generate a unique ID for sharing
    const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      id: fileId,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      data: base64,
      shareUrl: `${window.location.origin}/share/${fileId}`, // Shareable URL
    };
  })
);
```

**Step 3: Add copy button to ContextPanel file list**

In ContextPanel's FilesTab, add a copy button for each file:

```typescript
// Add to file item rendering
<button
  onClick={(e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/threads/${threadId}/files/${encodeURIComponent(filePath)}`;
    navigator.clipboard.writeText(shareUrl);
  }}
  className="p-1 rounded hover:bg-muted"
  title="Copy share URL"
>
  <Copy size={12} />
</button>
```

**Step 4: Verify build succeeds**

Run: `cd /root/projects/deep-agents-ui && yarn build`
Expected: Build succeeds without errors

**Step 5: Commit**

```bash
cd /root/projects/deep-agents-ui && git add src/app/components/FileChip.tsx src/app/components/ContextPanel.tsx && git commit -m "feat(files): add file sharing URL with copy button"
```

---

## Task 8: Render File References in User Messages

**Files:**
- Modify: `src/app/components/ChatMessage.tsx`

**Step 1: Add file reference rendering in human messages**

In ChatMessage, when rendering human message content, check for multimodal blocks:

```typescript
// Helper to check if content is multimodal
const isMultimodalContent = (content: unknown): content is Array<{ type: string; text?: string; image_url?: { url: string } }> => {
  return Array.isArray(content);
};

// Inside message rendering
{message.type === "human" && (
  <>
    {isMultimodalContent(message.content) ? (
      <div className="space-y-2">
        {/* Text part */}
        {message.content.filter(b => b.type === "text").map((block, i) => (
          <div key={i} className="whitespace-pre-wrap">
            {block.text}
          </div>
        ))}
        {/* File reference chips */}
        <div className="flex flex-wrap gap-2 mt-2">
          {message.content.filter(b => b.type === "image_url" || b.type === "file").map((block, i) => {
            if (block.type === "image_url") {
              return (
                <div key={i} className="flex items-center gap-2 px-2 py-1 rounded border border-border bg-muted/50">
                  <Image size={14} />
                  <span className="text-sm">Image attachment</span>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-center gap-2 px-2 py-1 rounded border border-border bg-muted/50">
                <FileText size={14} />
                <span className="text-sm">File attachment</span>
              </div>
            );
          })}
        </div>
      </div>
    ) : (
      <div className="whitespace-pre-wrap">
        {extractStringFromMessageContent(message)}
      </div>
    )}
  </>
)}
```

**Step 2: Verify build succeeds**

Run: `cd /root/projects/deep-agents-ui && yarn build`
Expected: Build succeeds without errors

**Step 3: Commit**

```bash
cd /root/projects/deep-agents-ui && git add src/app/components/ChatMessage.tsx && git commit -m "feat(chat): render file references in user messages"
```

---

## Task 9: Final Integration and Testing

**Files:**
- Test entire flow manually

**Step 1: Start dev server**

Run: `cd /root/projects/deep-agents-ui && yarn dev`

**Step 2: Test file upload**
- Click upload button in input area
- Select an image file
- Verify file chip appears
- Send message
- Verify file reference shows in message

**Step 3: Test delivery cards**
- Run an agent task that creates files
- Wait for task to complete
- Verify delivery card appears after AI message
- Verify preview shows for last file
- Click "查看全部" to verify it opens Files panel
- Click file to open FileViewDialog

**Step 4: Test file sharing**
- Click copy button on file chip
- Verify URL is copied to clipboard

**Step 5: Fix any issues found**

**Step 6: Final commit**

```bash
cd /root/projects/deep-agents-ui && git add -A && git commit -m "feat(v2): complete file upload and delivery features"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | FileChip component | `FileChip.tsx` |
| 2 | FileUploadZone component | `FileUploadZone.tsx` |
| 3 | Integrate upload into ChatInterface | `ChatInterface.tsx`, `useChat.ts` |
| 4 | DeliveryCard component | `DeliveryCard.tsx` |
| 5 | Integrate DeliveryCard into ChatMessage | `ChatMessage.tsx` |
| 6 | Wire delivery detection | `ChatInterface.tsx` |
| 7 | File sharing URL | `FileChip.tsx`, `ContextPanel.tsx` |
| 8 | File references in messages | `ChatMessage.tsx` |
| 9 | Final integration testing | Manual testing |
