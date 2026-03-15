"use client";

/**
 * DiffViewer - Line-by-line diff display component
 *
 * Uses the 'diff' package to compute and display line-level differences
 * between old and new content.
 */

import React, { useMemo } from "react";
import { diffLines, type Change } from "diff";
import { cn } from "@/lib/utils";

interface DiffViewerProps {
  oldContent: string;
  newContent: string;
  fileName?: string;
}

export const DiffViewer = React.memo<DiffViewerProps>(
  ({ oldContent, newContent, fileName }) => {
    const changes = useMemo(
      () => diffLines(oldContent, newContent),
      [oldContent, newContent]
    );

    const stats = useMemo(() => {
      let added = 0;
      let removed = 0;
      changes.forEach((change) => {
        const lineCount = change.value.split("\n").filter((line) => line.length > 0).length;
        if (change.added) added += lineCount;
        if (change.removed) removed += lineCount;
      });
      return { added, removed };
    }, [changes]);

    return (
      <div className="overflow-hidden rounded-md border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
          {fileName && (
            <span className="font-mono text-xs text-muted-foreground">
              {fileName}
            </span>
          )}
          <div className="flex gap-3 text-xs">
            <span className="text-green-600 dark:text-green-400">
              +{stats.added}
            </span>
            <span className="text-red-600 dark:text-red-400">
              -{stats.removed}
            </span>
          </div>
        </div>

        {/* Diff Content */}
        <div className="overflow-x-auto">
          <pre className="m-0 text-xs leading-5">
            {changes.map((change, i) => (
              <DiffBlock
                key={i}
                change={change}
              />
            ))}
          </pre>
        </div>
      </div>
    );
  }
);

DiffViewer.displayName = "DiffViewer";

function DiffBlock({ change }: { change: Change }) {
  const lines = change.value.split("\n");
  // Remove trailing empty line from split
  if (lines[lines.length - 1] === "") lines.pop();

  return (
    <>
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "px-3 py-0",
            change.added &&
              "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300",
            change.removed &&
              "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300",
            !change.added && !change.removed && "text-foreground"
          )}
        >
          <span className="mr-3 inline-block w-4 select-none text-right text-muted-foreground/50">
            {change.added ? "+" : change.removed ? "-" : " "}
          </span>
          {line}
        </div>
      ))}
    </>
  );
}
