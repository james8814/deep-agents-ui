"use client";

import React from "react";
import { Download, Eye } from "lucide-react";
import type { AttachmentSummary } from "@/app/types/types";

interface AttachmentSummaryListProps {
  attachments: AttachmentSummary[];
}

/**
 * Displays a list of file attachment summaries with download/preview links.
 * Phase 2.5 P2-3: File Coordination - Attachment Summary
 */
export const AttachmentSummaryList = React.memo<AttachmentSummaryListProps>(
  ({ attachments }) => {
    if (!attachments || attachments.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          File Attachments ({attachments.length})
        </p>
        <div className="space-y-2">
          {attachments.map((attachment, idx) => (
            <div
              key={`${attachment.path}-${idx}`}
              className="flex items-center justify-between rounded-md border border-border bg-muted/50 p-3 text-sm transition-colors hover:bg-muted"
            >
              <div className="min-w-0 flex-1">
                <p
                  className="truncate font-medium"
                  title={attachment.path}
                >
                  {attachment.path.split("/").pop() || attachment.path}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{(attachment.size_bytes / 1024).toFixed(2)} KB</span>
                  {attachment.mime_type && <span>{attachment.mime_type}</span>}
                  {attachment.hash_sha256 && (
                    <span
                      title={attachment.hash_sha256}
                      className="max-w-[150px] truncate"
                    >
                      SHA256: {attachment.hash_sha256.substring(0, 12)}...
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-2 flex flex-shrink-0 gap-1">
                {attachment.preview_url && (
                  <a
                    href={attachment.preview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded p-2 transition-colors hover:bg-accent"
                    title="Preview attachment"
                    aria-label="Preview"
                  >
                    <Eye
                      size={14}
                      className="text-muted-foreground hover:text-foreground"
                    />
                  </a>
                )}
                {attachment.download_url && (
                  <a
                    href={attachment.download_url}
                    download={attachment.path.split("/").pop()}
                    className="rounded p-2 transition-colors hover:bg-accent"
                    title="Download attachment"
                    aria-label="Download"
                  >
                    <Download
                      size={14}
                      className="text-muted-foreground hover:text-foreground"
                    />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

AttachmentSummaryList.displayName = "AttachmentSummaryList";
