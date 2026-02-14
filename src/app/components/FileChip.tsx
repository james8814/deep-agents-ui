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

export interface FileChipProps {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm",
        onClick && "cursor-pointer hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className
      )}
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
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
          className="ml-1 rounded-sm hover:bg-muted-foreground/20 p-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Remove ${file.name}`}
        >
          <X size={12} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
});

FileChip.displayName = "FileChip";
