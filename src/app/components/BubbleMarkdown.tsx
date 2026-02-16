"use client";

import React from "react";
import { AntdXMarkdown } from "./AntdXMarkdown";

interface BubbleMarkdownProps {
  content: string;
}

export const BubbleMarkdown = React.memo<BubbleMarkdownProps>(({ content }) => {
  if (!content) return null;

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <AntdXMarkdown content={content} />
    </div>
  );
});

BubbleMarkdown.displayName = "BubbleMarkdown";
