"use client";

import React, { useState, useCallback, useMemo, useRef } from "react";
import { Sender, Attachments } from "@ant-design/x";
import type { AttachmentsProps } from "@ant-design/x";
import { Button } from "antd";
import { Square, ArrowUp, Paperclip } from "lucide-react";

interface AntdXSenderProps {
  onSend: (
    content:
      | string
      | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>
  ) => void;
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
}

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

      // 构建消息内容
      const imageFiles = files.filter((f) =>
        f.type?.startsWith("image/")
      ) as Array<AttachmentItem & { thumbUrl?: string; url?: string }>;

      if (imageFiles.length > 0) {
        const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [
          { type: "text" as const, text: value },
          ...imageFiles.map((f) => ({
            type: "image_url" as const,
            image_url: { url: f.thumbUrl || f.url || "" },
          })),
        ];
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
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              uid,
              name: file.name,
              type: file.type,
              size: file.size,
              thumbUrl: reader.result as string,
            } as AttachmentItem);
          };
          reader.readAsDataURL(file);
        } else {
          resolve({
            uid,
            name: file.name,
            type: file.type,
            size: file.size,
          } as AttachmentItem);
        }
      });
    }, []);

    // Sender header - 使用 Attachments 组件展示已上传文件
    const header = useMemo(() => {
      if (files.length === 0) return null;

      return (
        <Sender.Header title={`Attachments (${files.length})`}>
          <Attachments
            items={files}
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
          accept="image/*,.pdf,.txt,.md"
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
