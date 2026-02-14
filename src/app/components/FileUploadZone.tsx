"use client";

import React, { useRef, useCallback, useState } from "react";
import { Paperclip } from "lucide-react";
import { FileChip, FileChipData } from "./FileChip";
import { cn } from "@/lib/utils";

// Re-export FileChipData for convenience
export type { FileChipData } from "./FileChip";

export interface FileUploadZoneProps {
  files: FileChipData[];
  onFilesChange: (files: FileChipData[] | ((prev: FileChipData[]) => FileChipData[])) => void;
  disabled?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

// Only images are supported by the LangGraph SDK's multimodal content format
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper function to convert file to base64
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

export const FileUploadZone = React.memo<FileUploadZoneProps>(({
  files,
  onFilesChange,
  disabled = false,
  className,
  inputRef: externalInputRef,
}) => {
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const [error, setError] = useState<string | null>(null);

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
      if (!ACCEPTED_TYPES.includes(file.type) && file.type !== "") {
        setError(`File type "${file.type || "unknown"}" is not supported.`);
        return;
      }
    }

    // Convert files to base64
    try {
      const newFiles: FileChipData[] = await Promise.all(
        selectedFiles.map(async (file) => {
          const base64 = await convertToBase64(file);
          return {
            id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            data: base64,
          };
        })
      );

      onFilesChange((prev) => [...prev, ...newFiles]);
    } catch (err) {
      setError("Failed to process files. Please try again.");
    }

    // Reset input
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [onFilesChange]);

  const handleRemoveFile = useCallback((fileId: string) => {
    onFilesChange((prev) => prev.filter(f => f.id !== fileId));
  }, [onFilesChange]);

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
        <div className="px-4 text-xs text-destructive" role="alert">
          {error}
        </div>
      )}
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
    aria-label="Attach file"
  >
    <Paperclip size={14} />
  </button>
));

UploadButton.displayName = "UploadButton";
