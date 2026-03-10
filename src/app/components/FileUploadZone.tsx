"use client";

import React, { useRef, useCallback, useState } from "react";
import { Paperclip, Loader2 as _Loader2 } from "lucide-react";
import { FileChip, FileChipData } from "./FileChip";
import { cn } from "@/lib/utils";
import {
  uploadFile,
  deleteUploadedFile,
  isAllowedFileType,
  formatFileSize as _formatFileSize,
  ACCEPTED_FILE_TYPES,
  type UploadFileResponse,
} from "@/api/upload";

// Re-export FileChipData for convenience
export type { FileChipData } from "./FileChip";

// Extended file data with upload status
export interface UploadedFile extends FileChipData {
  status: "uploading" | "success" | "error";
  progress?: number;
  path?: string; // 上传成功后的路径
  error?: string; // 错误信息
}

export interface FileUploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (
    files: UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[])
  ) => void;
  disabled?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

// 从 API 模块导入统一的文件类型配置和最大文件大小
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Helper function to convert file to base64 for preview
const convertToBase64 = (file: globalThis.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file as base64"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

export const FileUploadZone = React.memo<FileUploadZoneProps>(
  ({
    files,
    onFilesChange,
    disabled = false,
    className,
    inputRef: externalInputRef,
  }) => {
    const internalInputRef = useRef<HTMLInputElement>(null);
    const inputRef = externalInputRef ?? internalInputRef;
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        setError(null);

        if (selectedFiles.length === 0) return;

        // Validate files
        const validFiles: globalThis.File[] = [];
        for (const file of selectedFiles) {
          if (file.size > MAX_FILE_SIZE) {
            setError(`文件 "${file.name}" 太大。最大允许 100MB。`);
            continue;
          }
          if (!isAllowedFileType(file.name)) {
            setError(`不支持的文件类型: ${file.name}`);
            continue;
          }
          validFiles.push(file);
        }

        if (validFiles.length === 0) {
          if (inputRef.current) {
            inputRef.current.value = "";
          }
          return;
        }

        // Create initial file entries (uploading state)
        const newFileEntries: UploadedFile[] = await Promise.all(
          validFiles.map(async (file) => {
            // Generate preview for images
            let previewUrl: string | undefined;
            if (file.type.startsWith("image/")) {
              try {
                previewUrl = await convertToBase64(file);
              } catch {
                // Ignore preview error
              }
            }

            return {
              id: `${file.name}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 11)}`,
              name: file.name,
              type: file.type || "application/octet-stream",
              size: file.size,
              data: previewUrl || "", // Keep preview URL in data field
              status: "uploading",
              progress: 0,
            };
          })
        );

        onFilesChange((prev) => [...prev, ...newFileEntries]);

        // Upload each file
        for (let i = 0; i < validFiles.length; i++) {
          const file = validFiles[i];
          const fileEntry = newFileEntries[i];

          try {
            const result: UploadFileResponse = await uploadFile(
              file,
              (progress) => {
                onFilesChange((prev) =>
                  prev.map((f) =>
                    f.id === fileEntry.id ? { ...f, progress } : f
                  )
                );
              }
            );

            // Upload success
            onFilesChange((prev) =>
              prev.map((f) =>
                f.id === fileEntry.id
                  ? {
                      ...f,
                      status: "success",
                      path: result.path,
                      progress: 100,
                    }
                  : f
              )
            );
          } catch (err) {
            // Upload failed
            const errorMessage =
              err instanceof Error ? err.message : "上传失败";
            onFilesChange((prev) =>
              prev.map((f) =>
                f.id === fileEntry.id
                  ? { ...f, status: "error", error: errorMessage, progress: 0 }
                  : f
              )
            );
            setError(`"${file.name}" 上传失败: ${errorMessage}`);
          }
        }

        // Reset input
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      },
      [onFilesChange, inputRef]
    );

    const handleRemoveFile = useCallback(
      async (fileId: string) => {
        // 找到要删除的文件
        const fileToRemove = files.find((f) => f.id === fileId);

        // 如果文件已成功上传，需要用户确认并调用后端删除
        if (fileToRemove?.status === "success" && fileToRemove.path) {
          const confirmed = window.confirm(
            `确定要删除文件 "${fileToRemove.name}" 吗？\n此操作将同时删除服务器上的文件。`
          );
          if (!confirmed) return;

          try {
            await deleteUploadedFile(fileToRemove.path);
          } catch (err) {
            console.error("删除文件失败:", err);
            // 即使后端删除失败，也从前端状态移除
          }
        }

        onFilesChange((prev) => prev.filter((f) => f.id !== fileId));
      },
      [files, onFilesChange]
    );

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          name="file-upload"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        {/* Uploaded files display */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="relative"
              >
                <FileChip
                  file={file}
                  onRemove={() => handleRemoveFile(file.id)}
                />
                {file.status === "uploading" && (
                  <div className="absolute -bottom-1 left-0 right-0 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${file.progress || 0}%` }}
                    />
                  </div>
                )}
                {file.status === "error" && (
                  <div className="absolute -bottom-4 left-0 text-xs text-destructive">
                    {file.error || "上传失败"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            className="px-4 text-xs text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    );
  }
);

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
      "disabled:cursor-not-allowed disabled:opacity-30"
    )}
    title="Attach file"
    aria-label="Attach file"
  >
    <Paperclip size={14} />
  </button>
));

UploadButton.displayName = "UploadButton";
