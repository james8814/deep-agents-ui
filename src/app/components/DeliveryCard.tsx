"use client";

import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { FileText, FileCode, FileSpreadsheet, Image, ChevronRight, Clock, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileMetadata } from "@/app/types/types";
import { copyToClipboard, extractFileContent } from "@/app/utils/utils";

interface DeliveryFile {
  path: string;
  content: string;
  metadata?: FileMetadata;
  shareUrl?: string;
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

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    copyToClipboard(shareUrl).then((ok) => {
      if (ok) {
        setCopied(true);
        timeoutRef.current = setTimeout(() => setCopied(false), 2000);
      }
    });
  }, [shareUrl]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label="Copy share URL"
      title="Copy share URL"
    >
      {copied ? (
        <Check size={12} className="text-success" />
      ) : (
        <Copy size={12} className="text-muted-foreground" />
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
      const contentStr = extractFileContent(file.content);
      const lines = contentStr.split("\n").slice(0, 12);
      return (
        <pre className="text-xs text-muted-foreground overflow-hidden whitespace-pre-wrap break-all line-clamp-12">
          {lines.join("\n")}
          {contentStr.split("\n").length > 12 && "\n..."}
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
        {file.shareUrl && <CopyUrlButton shareUrl={file.shareUrl} />}
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
                {file.shareUrl && <CopyUrlButton shareUrl={file.shareUrl} />}
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
