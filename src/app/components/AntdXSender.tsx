"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { Sender, Attachments } from "@ant-design/x";
import { Button } from "antd";
import { Square, ArrowUp, Paperclip, FileText, FileImage, FileType } from "lucide-react";

// 支持的内容块类型
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "file"; source: { type: "base64"; media_type: string; data: string }; filename?: string };

export type MultimodalContent = string | ContentBlock[];

interface AntdXSenderProps {
  onSend: (content: MultimodalContent) => void;
  onStop: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  interrupt?: unknown;
}

interface AttachmentItem {
  uid: string;
  name: string;
  type?: string;
  size?: number;
  thumbUrl?: string;
  url?: string;
  data?: string; // base64 data for non-image files
}

// 文件类型图标映射
const getFileIcon = (mimeType: string | undefined): React.ReactNode => {
  if (!mimeType) return <FileText size={14} />;
  if (mimeType.startsWith("image/")) return <FileImage size={14} />;
  if (mimeType === "application/pdf") return <FileType size={14} />;
  return <FileText size={14} />;
};

// 生成文件预览图（用于非图片文件）
const generateFileThumbnail = (filename: string, mimeType: string): string => {
  // 创建一个简单的 SVG 预览图
  const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
  const bgColor = mimeType.startsWith("image/") ? "#e8f5e9" :
                  mimeType === "application/pdf" ? "#ffebee" :
                  mimeType.includes("text") || mimeType.includes("markdown") ? "#fff3e0" :
                  "#f3f4f6";

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <rect width="80" height="80" fill="${bgColor}" rx="8"/>
      <rect x="16" y="12" width="48" height="56" fill="white" rx="4" stroke="#d1d5db" stroke-width="1"/>
      <text x="40" y="45" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#374151">${ext}</text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// 支持的文件类型
const ACCEPTED_FILE_TYPES = [
  // 图片
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // 文档
  "application/pdf",
  // 文本
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  // 代码
  "text/javascript",
  "application/javascript",
  "application/json",
  "text/typescript",
  "application/typescript",
  "text/x-python",
  "text/python",
  // 扩展名匹配
].join(",") + ",.md,.txt,.pdf,.csv,.json,.js,.ts,.jsx,.tsx,.py,.html,.css,.svg";

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
    const [files, setFiles] = useState<AttachmentItem[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = useCallback(() => {
      if (!value.trim() && files.length === 0) return;
      if (disabled || loading) return;

      if (files.length > 0) {
        // 构建多模态消息内容
        const content: ContentBlock[] = [
          { type: "text", text: value },
        ];

        for (const file of files) {
          if (file.type?.startsWith("image/")) {
            // 图片使用 image_url 格式
            content.push({
              type: "image_url",
              image_url: { url: file.thumbUrl || file.url || "" },
            });
          } else if (file.data) {
            // 其他文件使用 file 格式（带 base64 数据）
            content.push({
              type: "file",
              source: {
                type: "base64",
                media_type: file.type || "application/octet-stream",
                data: file.data,
              },
              filename: file.name,
            });
          }
        }

        onSend(content);
      } else {
        onSend(value);
      }

      setValue("");
      setFiles([]);
    }, [value, files, onSend, disabled, loading]);

    // 处理文件上传
    const handleUpload = useCallback((file: File): Promise<AttachmentItem> => {
      return new Promise((resolve) => {
        const uid = `${Date.now()}-${file.name}`;

        if (file.type.startsWith("image/")) {
          // 图片文件：生成缩略图
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              uid,
              name: file.name,
              type: file.type,
              size: file.size,
              thumbUrl: reader.result as string,
              data: (reader.result as string).split(",")[1], // 保存 base64 数据
            });
          };
          reader.readAsDataURL(file);
        } else {
          // 非图片文件：读取为 base64 并生成预览图
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            const thumbUrl = generateFileThumbnail(file.name, file.type);
            resolve({
              uid,
              name: file.name,
              type: file.type,
              size: file.size,
              thumbUrl,
              data: base64,
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }, []);

    // Sender header - 使用 Attachments 组件展示已上传文件
    const header = useMemo(() => {
      if (files.length === 0) return null;

      // 为每个文件添加预览图
      const itemsWithThumbUrl = files.map((f) => ({
        ...f,
        thumbUrl: f.thumbUrl || generateFileThumbnail(f.name, f.type || ""),
      }));

      return (
        <Sender.Header title={`Attachments (${files.length})`}>
          <Attachments
            items={itemsWithThumbUrl}
            onRemove={(file) => {
              setFiles((prev) => prev.filter((f) => f.uid !== file.uid));
            }}
            overflow="scrollX"
          />
        </Sender.Header>
      );
    }, [files]);

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
                disabled={disabled || (!value.trim() && files.length === 0)}
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
      files.length,
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
            const newFiles = Array.from(e.target.files || []);
            const processedFiles = await Promise.all(newFiles.map(handleUpload));
            setFiles((prev) => [...prev, ...processedFiles]);
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
