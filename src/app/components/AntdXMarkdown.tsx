"use client";

import React, { useMemo } from "react";
import { XMarkdown } from "@ant-design/x-markdown";
import type { ReactNode } from "react";

interface AntdXMarkdownProps {
  content: string;
  streaming?: boolean;
}

interface ComponentProps {
  href?: string;
  className?: string;
  children?: ReactNode;
}

export const AntdXMarkdown = React.memo<AntdXMarkdownProps>(
  ({ content, streaming }) => {
    const components = useMemo(
      () => ({
        a: ({ href, children }: ComponentProps) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {children}
          </a>
        ),
        pre: ({ children }: ComponentProps) => (
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
            {children}
          </pre>
        ),
        code: ({ className, children }: ComponentProps) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
      }),
      []
    );

    if (!content) return null;

    return (
      <XMarkdown
        children={content}
        streaming={streaming ? { enableAnimation: true } : undefined}
        components={components}
      />
    );
  }
);

AntdXMarkdown.displayName = "AntdXMarkdown";
