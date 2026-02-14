"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  CheckCircle,
  Circle,
  Clock,
  FileText,
  ListTodo,
  PanelRightClose,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatContext } from "@/providers/ChatProvider";
import { FileViewDialog } from "@/app/components/FileViewDialog";
import type { TodoItem, FileItem } from "@/app/types/types";

type Tab = "tasks" | "files";

interface ContextPanelProps {
  onClose: () => void;
}

export const ContextPanel = React.memo<ContextPanelProps>(({ onClose }) => {
  const { todos, files, setFiles, isLoading, interrupt } = useChatContext();
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

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
      setSelectedFile({ path: fileName, content });
    },
    [files, setFiles]
  );

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
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {activeTab === "tasks" && (
          <TasksTab groupedTodos={groupedTodos} hasTasks={hasTasks} />
        )}
        {activeTab === "files" && (
          <FilesTab files={files} onFileSelect={setSelectedFile} />
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
  files,
  onFileSelect,
}: {
  files: Record<string, string>;
  onFileSelect: (file: FileItem) => void;
}) {
  const fileEntries = Object.keys(files);

  if (fileEntries.length === 0) {
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
      <div className="space-y-1">
        {fileEntries.map((filePath) => {
          const rawContent = files[filePath];
          const fileContent =
            typeof rawContent === "object" &&
            rawContent !== null &&
            "content" in rawContent
              ? String(
                  (rawContent as { content: unknown }).content || ""
                )
              : String(rawContent || "");

          const ext = filePath.split(".").pop()?.toLowerCase() || "";

          return (
            <button
              key={filePath}
              onClick={() =>
                onFileSelect({ path: filePath, content: fileContent })
              }
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
            >
              <FileText
                size={14}
                className="flex-shrink-0 text-muted-foreground"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{filePath}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {ext.toUpperCase()} · {fileContent.length} chars
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
