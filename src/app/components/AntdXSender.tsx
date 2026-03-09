"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { Sender, Attachments } from "@ant-design/x";
import { Button, message, Modal } from "antd";
import { Square, ArrowUp, Paperclip, FileText, FileImage, FileType, Loader2 } from "lucide-react";
import {
  uploadFile,
  deleteUploadedFile,
  constructMessageWithFiles,
  formatFileSize,
  isAllowedFileType,
  ACCEPTED_FILE_TYPES,
} from "@/api/upload";

// 支持的内容块类型（简化：现在只发送文本消息）
export type MultimodalContent = string;

interface AntdXSenderProps {
  onSend: (content: MultimodalContent) => void;
  onStop: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  interrupt?: unknown;
}

// 上传文件项状态
type UploadStatus = "pending" | "uploading" | "success" | "error";

interface UploadFileItem {
  uid: string;
  name: string;
  type?: string;
  size?: number;
  thumbUrl?: string;
  status: UploadStatus;
  progress: number; // 0-100
  path?: string;    // 上传成功后返回的路径
  error?: string;   // 错误信息
}

// 文件类型图标映射
const _getFileIcon = (mimeType: string | undefined): React.ReactNode => {
  if (!mimeType) return <FileText size={14} />;
  if (mimeType.startsWith("image/")) return <FileImage size={14} />;
  if (mimeType === "application/pdf") return <FileType size={14} />;
  if (mimeType.includes("wordprocessingml")) return <FileText size={14} />;
  if (mimeType.includes("presentationml")) return <FileText size={14} />;
  if (mimeType.includes("spreadsheetml")) return <FileText size={14} />;
  return <FileText size={14} />;
};

// 生成文件预览图（用于非图片文件）
const generateFileThumbnail = (filename: string, mimeType: string): string => {
  const ext = filename.split(".").pop()?.toUpperCase() || "FILE";
  const bgColor = mimeType.startsWith("image/")
    ? "#e8f5e9"
    : mimeType === "application/pdf"
      ? "#ffebee"
      : mimeType.includes("wordprocessingml")
        ? "#e3f2fd"
        : mimeType.includes("presentationml")
          ? "#fff8e1"
          : mimeType.includes("spreadsheetml")
            ? "#e8f5e9"
            : mimeType.includes("text") || mimeType.includes("markdown")
              ? "#fff3e0"
              : "#f3f4f6";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" fill="${bgColor}" rx="8"/>
      <rect x="16" y="12" width="48" height="56" fill="white" rx="4" stroke="#d1d5db" stroke-width="1"/>
      <text x="40" y="45" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#374151">${ext}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

export const AntdXSender = React.memo<AntdXSenderProps>(
  ({
    onSend,
    onStop,
    disabled,
    loading,
    placeholder = "Write your message...",
    interrupt,
  }) => {
    const [value, setValue] = useState("");
    const [files, setFiles] = useState<UploadFileItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 是否有文件正在上传
    const hasUploadingFiles = files.some((f) => f.status === "uploading");

    // 提交消息
    const handleSubmit = useCallback(() => {
      if (!value.trim() && files.length === 0) return;
      if (disabled || loading || hasUploadingFiles) return;

      // 收集成功上传的文件
      const uploadedFiles = files
        .filter((f): f is UploadFileItem & { status: "success"; path: string } =>
          f.status === "success" && !!f.path
        )
        .map((f) => ({
          path: f.path,
          filename: f.name,
        }));

      // 构造包含文件引用的消息
      const message = constructMessageWithFiles(value, uploadedFiles);

      onSend(message);

      // 清空状态
      setValue("");
      setFiles([]);
    }, [value, files, onSend, disabled, loading, hasUploadingFiles]);

    // 处理文件选择并开始上传
    const handleFileSelect = useCallback(async (selectedFiles: File[]) => {
      // 验证文件类型
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      for (const file of selectedFiles) {
        if (!isAllowedFileType(file.name)) {
          invalidFiles.push(file.name);
          continue;
        }
        validFiles.push(file);
      }

      // 显示不支持文件类型的错误提示
      if (invalidFiles.length > 0) {
        message.warning(`不支持的文件类型: ${invalidFiles.join(", ")}`);
      }

      if (validFiles.length === 0) return;

      // 创建上传项（pending 状态）
      const newItems: UploadFileItem[] = validFiles.map((file) => ({
        uid: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        thumbUrl: file.type.startsWith("image/") ? undefined : generateFileThumbnail(file.name, file.type),
        status: "pending",
        progress: 0,
      }));

      setFiles((prev) => [...prev, ...newItems]);

      // 开始上传每个文件
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const item = newItems[i];

        // 图片文件生成预览
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = () => {
            setFiles((prev) =>
              prev.map((f) =>
                f.uid === item.uid ? { ...f, thumbUrl: reader.result as string } : f
              )
            );
          };
          reader.readAsDataURL(file);
        }

        // 更新为上传中状态
        setFiles((prev) =>
          prev.map((f) => (f.uid === item.uid ? { ...f, status: "uploading" } : f))
        );

        try {
          // 上传文件
          const result = await uploadFile(file, (progress) => {
            setFiles((prev) =>
              prev.map((f) => (f.uid === item.uid ? { ...f, progress } : f))
            );
          });

          // 上传成功
          setFiles((prev) =>
            prev.map((f) =>
              f.uid === item.uid
                ? { ...f, status: "success", path: result.path, progress: 100 }
                : f
            )
          );
        } catch (error) {
          // 上传失败
          setFiles((prev) =>
            prev.map((f) =>
              f.uid === item.uid
                ? {
                    ...f,
                    status: "error",
                    error: error instanceof Error ? error.message : "上传失败",
                    progress: 0,
                  }
                : f
            )
          );
        }
      }
    }, []);

    // 移除文件
    const handleRemoveFile = useCallback(async (uid: string) => {
      // 找到要删除的文件
      const fileToRemove = files.find(f => f.uid === uid);

      // 如果文件已成功上传，需要用户确认并调用后端删除
      if (fileToRemove?.status === "success" && fileToRemove.path) {
        Modal.confirm({
          title: "删除文件",
          content: `确定要删除文件 "${fileToRemove.name}" 吗？\n此操作将同时删除服务器上的文件。`,
          okText: "删除",
          okButtonProps: { danger: true },
          cancelText: "取消",
          onOk: async () => {
            if (!fileToRemove.path) return;
            try {
              await deleteUploadedFile(fileToRemove.path);
              // 从前端状态移除
              setFiles((prev) => prev.filter((f) => f.uid !== uid));
            } catch (err) {
              console.error("删除文件失败:", err);
              message.error("删除文件失败");
            }
          },
        });
        return;
      }

      setFiles((prev) => prev.filter((f) => f.uid !== uid));
    }, [files]);

    // Sender header - 使用 Attachments 组件展示已上传文件
    const header = useMemo(() => {
      if (files.length === 0) return null;

      // 为 Attachments 组件格式化数据
      const attachmentItems = files.map((f) => ({
        uid: f.uid,
        name: f.name,
        type: f.type,
        size: f.size,
        thumbUrl: f.thumbUrl,
        // 自定义状态显示
        description: f.status === "uploading"
          ? `上传中 ${f.progress}%`
          : f.status === "error"
            ? f.error || "上传失败"
            : formatFileSize(f.size || 0),
      }));

      return (
        <Sender.Header title={`附件 (${files.filter(f => f.status === "success").length}/${files.length})`}>
          <Attachments
            items={attachmentItems}
            onRemove={(file) => handleRemoveFile(file.uid)}
            overflow="scrollX"
          />
        </Sender.Header>
      );
    }, [files, handleRemoveFile]);

    // Sender footer - 操作按钮
    const footer = useMemo(() => {
      return (
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Button
              type="text"
              size="small"
              icon={<Paperclip size={18} />}
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || loading || !!interrupt}
            />
            <span className="text-xs text-muted-foreground/60">
              Shift+Enter
            </span>
            {hasUploadingFiles && (
              <span className="text-xs text-warning flex items-center gap-1">
                <Loader2 size={14} className="animate-spin" />
                上传中...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {loading ? (
              <Button
                type="primary"
                danger
                size="small"
                onClick={onStop}
                icon={<Square size={12} />}
              >
                Stop
              </Button>
            ) : (
              <Button
                type="primary"
                size="small"
                onClick={handleSubmit}
                disabled={
                  disabled ||
                  (!value.trim() && files.length === 0) ||
                  hasUploadingFiles ||
                  files.every((f) => f.status === "error")
                }
                icon={<ArrowUp size={14} />}
              >
                Send
              </Button>
            )}
          </div>
        </div>
      );
    }, [
      loading,
      disabled,
      interrupt,
      value,
      files,
      hasUploadingFiles,
      handleSubmit,
      onStop,
    ]);

    return (
      <>
        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          multiple
          className="hidden"
          onChange={async (e) => {
            const selectedFiles = Array.from(e.target.files || []);
            if (selectedFiles.length > 0) {
              await handleFileSelect(selectedFiles);
            }
            e.target.value = "";
          }}
        />

        <Sender
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          loading={loading}
          disabled={disabled || !!interrupt}
          placeholder={
            interrupt
              ? "Agent is waiting for approval above ↑"
              : loading
                ? "Running..."
                : placeholder
          }
          header={header}
          footer={footer}
          className="rounded-2xl border border-border bg-background"
        />
      </>
    );
  }
);

AntdXSender.displayName = "AntdXSender";
