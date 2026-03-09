"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Download, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewImageResultProps {
  result: {
    image_data?: string;
    image_base64?: string;
    file_path?: string;
    mime_type?: string;
    format?: string;
    [key: string]: unknown;
  };
}

export const ViewImageResult = React.memo<ViewImageResultProps>(({ result }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  // Extract Base64 data from result
  const base64Data = useMemo(
    () => result.image_data || result.image_base64 || "",
    [result.image_data, result.image_base64]
  );

  // Extract metadata
  const metadata = useMemo(
    () => ({
      filePath: String(result.file_path || "image"),
      mimeType: String(result.mime_type || result.format || "image/png"),
    }),
    [result.file_path, result.mime_type, result.format]
  );

  // Generate data URL
  const dataUrl = useMemo(() => {
    if (!base64Data) return "";
    // Handle both with and without data URL prefix
    const cleanBase64 = base64Data.replace(/^data:image\/[^;]+;base64,/, "");
    return `data:${metadata.mimeType};base64,${cleanBase64}`;
  }, [base64Data, metadata.mimeType]);

  const handleImageLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      const img = event.currentTarget;
      setImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setIsLoading(false);
      setHasError(false);
    },
    []
  );

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const handleDownload = useCallback(() => {
    if (!dataUrl || !metadata.filePath) return;

    try {
      const link = document.createElement("a");
      link.href = dataUrl;

      // Extract extension from MIME type if needed
      let filename = metadata.filePath;
      if (!filename.includes(".")) {
        const ext = metadata.mimeType.split("/")[1] || "png";
        filename = `${filename}.${ext}`;
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  }, [dataUrl, metadata]);

  if (!base64Data) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>No image data found in result</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Image Container */}
      <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
        {hasError ? (
          <div className="flex items-center justify-center bg-muted/40 p-12">
            <div className="text-center">
              <AlertCircle size={32} className="mx-auto mb-2 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load image</p>
              <p className="mt-1 text-xs text-muted-foreground">The image data may be corrupted or invalid</p>
            </div>
          </div>
        ) : (
          <div className="relative w-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
                <Loader2 size={20} className="animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={dataUrl}
              alt="Image result"
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
              className={cn(
                "w-full max-w-full",
                "max-h-[400px] object-contain",
                isLoading && "opacity-0"
              )}
            />
          </div>
        )}
      </div>

      {/* Metadata Section */}
      <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
        {/* File Path */}
        <div className="flex items-start gap-2">
          <ImageIcon size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">File</p>
            <p
              className="truncate break-all font-mono text-xs text-foreground"
              title={metadata.filePath}
            >
              {metadata.filePath}
            </p>
          </div>
        </div>

        {/* MIME Type Badge */}
        <div className="flex items-center gap-2">
          <div className="inline-block rounded bg-primary/10 px-2 py-1">
            <span className="text-xs font-medium text-primary">{metadata.mimeType}</span>
          </div>
          {imageSize && (
            <div className="text-xs text-muted-foreground">
              {imageSize.width} × {imageSize.height}px
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={!dataUrl || hasError}
          className="flex items-center gap-2"
        >
          <Download size={14} />
          Download
        </Button>
      </div>
    </div>
  );
});

ViewImageResult.displayName = "ViewImageResult";
