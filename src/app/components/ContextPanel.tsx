"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  CheckCircle,
  Circle,
  Clock,
  FileText,
  ListTodo,
  PanelRightClose,
  RefreshCw,
  ArrowLeft,
  Maximize2,
  Pencil,
  X,
  Check,
  ArrowUp,
  ArrowDown,
  Copy,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { FileViewDialog } from "@/app/components/FileViewDialog";
import { MarkdownContent } from "@/app/components/MarkdownContent";
import type { TodoItem, FileItem, FileMetadata, FileSortBy } from "@/app/types/types";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useQueryState } from "nuqs";

type Tab = "tasks" | "files";

interface ContextPanelProps {
  onClose: () => void;
  initialTab?: Tab;
}

// Helper to extract file content from various formats
function extractFileContent(rawContent: unknown): string {
  if (typeof rawContent === "object" && rawContent !== null && "content" in rawContent) {
    const content = (rawContent as { content: unknown }).content;
    if (Array.isArray(content)) {
      return content.join("\n");
    }
    return String(content || "");
  }
  return String(rawContent || "");
}

export const ContextPanel = React.memo<ContextPanelProps>(({ onClose, initialTab }) => {
  const { todos, files, setFiles, isLoading, interrupt } = useChatContext();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab || "tasks");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [viewingFile, setViewingFile] = useState<FileItem | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortBy, setSortBy] = useState<FileSortBy>("time");
  const [sortAsc, setSortAsc] = useState(false);
  const [threadId] = useQueryState("threadId");

  // Switch to initialTab when it changes (e.g., from "查看全部" click)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Track file metadata (creation time, etc.) in local state
  const fileMetadataRef = useRef<Map<string, FileMetadata>>(new Map());

  // Update file metadata when files change
  useEffect(() => {
    const currentPaths = new Set(Object.keys(files));
    const now = Date.now();

    // Add metadata for new files
    currentPaths.forEach((path) => {
      if (!fileMetadataRef.current.has(path)) {
        const rawContent = files[path];
        const content = extractFileContent(rawContent);
        const segments = path.split("/");
        const name = segments[segments.length - 1] || path;
        const directory = segments.slice(0, -1).join("/") || ".";
        const extension = name.includes(".") ? name.split(".").pop()?.toLowerCase() || "" : "";

        fileMetadataRef.current.set(path, {
          path,
          name,
          directory,
          addedAt: now,
          size: content.length,
          extension,
        });
      } else {
        // Update size for existing files
        const rawContent = files[path];
        const content = extractFileContent(rawContent);
        const existing = fileMetadataRef.current.get(path)!;
        fileMetadataRef.current.set(path, {
          ...existing,
          size: content.length,
        });
      }
    });

    // Remove metadata for deleted files
    fileMetadataRef.current.forEach((_, path) => {
      if (!currentPaths.has(path)) {
        fileMetadataRef.current.delete(path);
      }
    });
  }, [files]);

  // Get sorted file metadata
  // Note: 'files' in deps triggers re-sort when files change (updates metadataRef via useEffect)
  const sortedFileMetadata = useMemo(() => {
    const metadata = Array.from(fileMetadataRef.current.values());
    return metadata.sort((a, b) => {
      if (sortBy === "name") {
        return sortAsc
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortAsc ? a.addedAt - b.addedAt : b.addedAt - a.addedAt;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortAsc, files]);

  const hasTasks = todos.length > 0;
  const fileCount = Object.keys(files).length;
  const hasFiles = fileCount > 0;

  const groupedTodos = useMemo(
    () => ({
      in_progress: todos.filter((t) => t.status === "in_progress"),
      pending: todos.filter((t) => t.status === "pending"),
      completed: todos.filter((t) => t.status === "completed"),
    }),
    [todos]
  );

  const handleSaveFile = useCallback(
    async (fileName: string, content: string) => {
      await setFiles({ ...files, [fileName]: content });
      // Update selectedFile with new content immediately
      setSelectedFile({ path: fileName, content });
      // Trigger refresh to update file list
      setRefreshKey((k) => k + 1);
    },
    [files, setFiles]
  );

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Get fresh file content when selecting a file
  const handleFileSelect = useCallback(
    (filePath: string) => {
      const rawContent = files[filePath];
      const content = extractFileContent(rawContent);
      setViewingFile({ path: filePath, content });
    },
    [files]
  );

  const handleExpandFile = useCallback(() => {
    if (viewingFile) {
      setSelectedFile(viewingFile);
    }
  }, [viewingFile]);

  const handleBackToFileList = useCallback(() => {
    setViewingFile(null);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Context</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <PanelRightClose size={14} />
        </Button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === "tasks"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ListTodo size={14} />
          Tasks
          {hasTasks && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary">
              {todos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 px-3 py-2 text-xs font-medium transition-colors",
            activeTab === "files"
              ? "border-b-2 border-primary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileText size={14} />
          Files
          {hasFiles && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary">
              {fileCount}
            </span>
          )}
        </button>
        {activeTab === "files" && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            title="Refresh file list"
          >
            <RefreshCw size={14} />
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1" key={refreshKey}>
        {activeTab === "tasks" && (
          <TasksTab groupedTodos={groupedTodos} hasTasks={hasTasks} />
        )}
        {activeTab === "files" && !viewingFile && (
          <FilesTab
            onFileSelect={handleFileSelect}
            sortedMetadata={sortedFileMetadata}
            sortBy={sortBy}
            sortAsc={sortAsc}
            onSortChange={(newSortBy) => {
              if (newSortBy === sortBy) {
                setSortAsc(!sortAsc);
              } else {
                setSortBy(newSortBy);
                setSortAsc(false);
              }
            }}
            threadId={threadId}
          />
        )}
        {activeTab === "files" && viewingFile && (
          <InlineFileViewer
            file={viewingFile}
            onBack={handleBackToFileList}
            onExpand={handleExpandFile}
            onSave={async (content) => {
              await handleSaveFile(viewingFile.path, content);
              setViewingFile({ ...viewingFile, content });
            }}
            editDisabled={isLoading === true || interrupt !== undefined}
          />
        )}
      </ScrollArea>

      {/* File Dialog — remains modal for editing */}
      {selectedFile && (
        <FileViewDialog
          file={selectedFile}
          onSaveFile={handleSaveFile}
          onClose={() => setSelectedFile(null)}
          editDisabled={isLoading === true || interrupt !== undefined}
        />
      )}
    </div>
  );
});

ContextPanel.displayName = "ContextPanel";

// --- Sub-components ---

function getStatusIcon(status: TodoItem["status"]) {
  switch (status) {
    case "completed":
      return <CheckCircle size={14} className="text-success/80" />;
    case "in_progress":
      return <Clock size={14} className="text-warning/80 animate-pulse" />;
    default:
      return <Circle size={14} className="text-tertiary/70" />;
  }
}

const GROUP_LABELS: Record<string, string> = {
  in_progress: "In Progress",
  pending: "Pending",
  completed: "Completed",
};

function TasksTab({
  groupedTodos,
  hasTasks,
}: {
  groupedTodos: Record<string, TodoItem[]>;
  hasTasks: boolean;
}) {
  if (!hasTasks) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <ListTodo size={24} className="mb-2 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No tasks yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Tasks will appear here as the agent works
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      {Object.entries(groupedTodos)
        .filter(([, items]) => items.length > 0)
        .map(([status, items]) => (
          <div key={status} className="mb-4 last:mb-0">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {GROUP_LABELS[status] || status}
            </h3>
            <div className="space-y-1.5">
              {items.map((todo, index) => (
                <div
                  key={`${status}_${todo.id}_${index}`}
                  className="flex items-start gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getStatusIcon(todo.status)}
                  </div>
                  <span className="flex-1 break-words leading-relaxed">
                    {todo.content}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

function FilesTab({
  onFileSelect,
  sortedMetadata,
  sortBy,
  sortAsc,
  onSortChange,
  threadId,
}: {
  onFileSelect: (filePath: string) => void;
  sortedMetadata: FileMetadata[];
  sortBy: FileSortBy;
  sortAsc: boolean;
  onSortChange: (sortBy: FileSortBy) => void;
  threadId?: string | null;
}) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const handleCopyUrl = useCallback((e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    if (threadId) {
      const shareUrl = `${window.location.origin}/threads/${threadId}/files/${encodeURIComponent(path)}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    }
  }, [threadId]);

  if (sortedMetadata.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText size={24} className="mb-2 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No files yet</p>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Files will appear here as the agent creates them
        </p>
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Sort Controls */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">Sort by:</span>
        <button
          onClick={() => onSortChange("time")}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors",
            sortBy === "time"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          Time
          {sortBy === "time" && (
            sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />
          )}
        </button>
        <button
          onClick={() => onSortChange("name")}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors",
            sortBy === "name"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          Name
          {sortBy === "name" && (
            sortAsc ? <ArrowUp size={10} /> : <ArrowDown size={10} />
          )}
        </button>
      </div>

      {/* File List */}
      <div className="space-y-1">
        {sortedMetadata.map((meta) => {
          return (
            <button
              key={meta.path}
              onClick={() => onFileSelect(meta.path)}
              className="group flex w-full items-start gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <FileText
                size={16}
                className="mt-0.5 flex-shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                {/* File name */}
                <div className="truncate font-medium">{meta.name}</div>
                {/* Directory + Type + Size */}
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="truncate">{meta.directory}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="uppercase">{meta.extension || "file"}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{formatSize(meta.size)}</span>
                </div>
                {/* Relative time */}
                <div className="mt-0.5 text-[10px] text-muted-foreground/60">
                  Added {formatRelativeTime(meta.addedAt)}
                </div>
              </div>
              {/* Copy share URL button */}
              {threadId && (
                <button
                  type="button"
                  onClick={(e) => handleCopyUrl(e, meta.path)}
                  className="flex-shrink-0 rounded-sm hover:bg-muted-foreground/20 p-1 opacity-0 group-hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-opacity"
                  aria-label="Copy share URL"
                  title="Copy share URL"
                >
                  {copiedPath === meta.path ? (
                    <Check size={14} className="text-success" />
                  ) : (
                    <Copy size={14} className="text-muted-foreground" />
                  )}
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Helper: Format file size
function formatSize(chars: number): string {
  if (chars < 1024) return `${chars} chars`;
  if (chars < 1024 * 1024) return `${(chars / 1024).toFixed(1)}KB`;
  return `${(chars / 1024 / 1024).toFixed(1)}MB`;
}

// Helper: Format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  // For older files, show the date
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// --- Inline File Viewer Component ---

const LANGUAGE_MAP: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  cpp: "cpp",
  c: "c",
  cs: "csharp",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  json: "json",
  xml: "xml",
  html: "html",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "ini",
  dockerfile: "dockerfile",
  makefile: "makefile",
  md: "markdown",
  markdown: "markdown",
};

function InlineFileViewer({
  file,
  onBack,
  onExpand,
  onSave,
  editDisabled,
}: {
  file: FileItem;
  onBack: () => void;
  onExpand: () => void;
  onSave: (content: string) => Promise<void>;
  editDisabled: boolean;
}) {
  const ext = file.path.split(".").pop()?.toLowerCase() || "";
  const isMarkdown = ext === "md" || ext === "markdown";
  const language = LANGUAGE_MAP[ext] || "text";

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(file.content);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editContent);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(file.content);
    setIsEditing(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="flex-1 truncate text-xs font-medium">{file.path}</span>
        {!isEditing && !editDisabled && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-muted-foreground hover:text-foreground"
            title="Edit file"
          >
            <Pencil size={14} />
          </button>
        )}
        <button
          onClick={onExpand}
          className="text-muted-foreground hover:text-foreground"
          title="Open full screen"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {isEditing ? (
          <div className="flex h-full flex-col">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 w-full resize-none rounded-md border border-border bg-background p-2 font-mono text-xs"
              placeholder="Enter file content..."
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
              >
                <X size={12} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !editContent.trim()}
                className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isSaving ? (
                  <Circle size={12} className="animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                Save
              </button>
            </div>
          </div>
        ) : isMarkdown ? (
          <div className="rounded-md p-2">
            <MarkdownContent content={file.content} />
          </div>
        ) : (
          <SyntaxHighlighter
            language={language}
            style={oneDark}
            customStyle={{
              margin: 0,
              borderRadius: "0.375rem",
              fontSize: "0.75rem",
            }}
            showLineNumbers
            wrapLines
          >
            {file.content || ""}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}
