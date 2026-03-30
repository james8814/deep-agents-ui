"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  Image,
  ChevronRight,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileMetadata } from "@/app/types/types";
import { copyToClipboard, extractFileContent } from "@/app/utils/utils";

interface DeliveryFile {
  path: string;
  content: string;
  metadata?: FileMetadata;
  shareUrl?: string;
  /** Whether the file content is available in current state (false = file deleted or not yet loaded) */
  available?: boolean;
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
  if (["js", "ts", "jsx", "tsx", "py", "json", "yaml", "yml"].includes(ext))
    return FileCode;
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

const formatFileSize = (content: unknown): string => {
  const str = extractFileContent(content);
  const bytes = new Blob([str]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Copy URL button component
const CopyUrlButton = React.memo<{ shareUrl: string }>(({ shareUrl }) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      copyToClipboard(shareUrl).then((ok) => {
        if (ok) {
          setCopied(true);
          timeoutRef.current = setTimeout(() => setCopied(false), 2000);
        }
      });
    },
    [shareUrl]
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 rounded-sm p-0.5 hover:bg-muted-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Copy share URL"
      title="Copy share URL"
    >
      {copied ? (
        <Check
          size={12}
          className="text-success"
        />
      ) : (
        <Copy
          size={12}
          className="text-muted-foreground"
        />
      )}
    </button>
  );
});

CopyUrlButton.displayName = "CopyUrlButton";

// Preview component for the last file
const FilePreview = React.memo<{
  file: DeliveryFile;
  onView: () => void;
}>(({ file, onView }) => {
  const ext = getFileExtension(file.path);
  const isTextFile = [
    "md",
    "txt",
    "json",
    "csv",
    "js",
    "ts",
    "py",
    "yaml",
    "yml",
    "html",
    "css",
  ].includes(ext);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);

  const previewContent = useMemo(() => {
    if (file.available === false) {
      return (
        <div className="flex h-24 items-center justify-center rounded-lg bg-muted/30">
          <span className="text-xs text-muted-foreground">
            文件内容暂不可用
          </span>
        </div>
      );
    }
    if (isImage) {
      return (
        <div className="flex h-32 items-center justify-center rounded-lg bg-muted/30">
          <Image
            size={32}
            className="text-muted-foreground"
          />
        </div>
      );
    }

    if (isTextFile) {
      const contentStr = extractFileContent(file.content);
      const lines = contentStr.split("\n").slice(0, 12);
      return (
        <pre className="line-clamp-12 overflow-hidden whitespace-pre-wrap break-all text-xs text-muted-foreground">
          {lines.join("\n")}
          {contentStr.split("\n").length > 12 && "\n..."}
        </pre>
      );
    }

    return (
      <div className="flex h-24 items-center justify-center rounded-lg bg-muted/30">
        <FileText
          size={32}
          className="text-muted-foreground"
        />
      </div>
    );
  }, [file.content, file.available, isTextFile, isImage]);

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border/50 bg-background/50">
      {/* Preview header */}
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/20 px-3 py-2">
        <FileText
          size={14}
          className="text-muted-foreground"
        />
        <span className="flex-1 truncate text-sm font-medium">
          {getFileName(file.path)}
        </span>
        <span className="text-xs text-muted-foreground">
          {file.available === false ? "不可用" : formatFileSize(file.content)}
        </span>
        {file.shareUrl && <CopyUrlButton shareUrl={file.shareUrl} />}
      </div>

      {/* Preview content */}
      <div className="max-h-48 overflow-hidden p-3">{previewContent}</div>

      {/* View full file button */}
      <div className="border-t border-border/50 bg-muted/10 px-3 py-2">
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

export const DeliveryCard = React.memo<DeliveryCardProps>(
  ({ files, onViewFile, onViewAll, className }) => {
    if (files.length === 0) return null;

    const displayFiles = files.slice(0, 3);
    const lastFile = displayFiles[displayFiles.length - 1];
    const otherFiles = displayFiles.slice(0, -1);

    return (
      <div
        className={cn(
          "mt-4 rounded-xl border border-border/50 bg-muted/20 p-4",
          className
        )}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">📦</span>
            <span className="text-sm font-medium">交付文件</span>
            <span className="text-xs text-muted-foreground">
              ({files.length})
            </span>
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
          <div className="mb-3 flex flex-wrap gap-2">
            {otherFiles.map((file) => {
              const Icon = getFileIcon(getFileExtension(file.path));
              return (
                <div
                  key={file.path}
                  onClick={() => onViewFile(file.path)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onViewFile(file.path);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon
                    size={14}
                    className="text-muted-foreground"
                  />
                  <span className="max-w-[150px] truncate text-sm">
                    {getFileName(file.path)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={10} />
                    {formatRelativeTime(file.metadata?.addedAt)}
                  </span>
                  {file.shareUrl && <CopyUrlButton shareUrl={file.shareUrl} />}
                </div>
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
  }
);

DeliveryCard.displayName = "DeliveryCard";
