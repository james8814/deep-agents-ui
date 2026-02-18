"use client";

import React, { memo, useState, useCallback, useMemo } from "react";
import { XMarkdown } from "@ant-design/x-markdown";
import type { ReactNode } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface AntdXMarkdownProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

interface ComponentProps {
  href?: string;
  className?: string;
  children?: ReactNode;
  domNode?: any;
  streamStatus?: "loading" | "done";
}

// Code block component with copy functionality and syntax highlighting
const CodeBlockWrapper = memo(function CodeBlockWrapper({
  language,
  children,
  domNode,
  streamStatus,
}: {
  language: string;
  children: ReactNode;
  domNode?: any;
  streamStatus?: "loading" | "done";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const codeText = typeof children === "string"
      ? children.replace(/\n$/, "")
      : String(children).replace(/\n$/, "");
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  const codeContent = typeof children === "string"
    ? children.replace(/\n$/, "")
    : String(children).replace(/\n$/, "");

  return (
    <div className="group/code relative">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover/code:opacity-100"
        title="Copy code"
      >
        {copied ? (
          <>
            <Check size={12} className="text-green-400" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy size={12} />
            <span>Copy</span>
          </>
        )}
      </button>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        PreTag="div"
        className="max-w-full rounded-md text-sm"
        wrapLines={true}
        wrapLongLines={true}
        lineProps={{
          style: {
            wordBreak: "break-all",
            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",
          },
        }}
        customStyle={{
          margin: 0,
          maxWidth: "100%",
          overflowX: "auto",
          fontSize: "0.875rem",
          borderRadius: "0.375rem",
        }}
      >
        {codeContent}
      </SyntaxHighlighter>
    </div>
  );
});

export const AntdXMarkdown = React.memo<AntdXMarkdownProps>(
  ({ content, className = "", isStreaming = false }) => {
    const components = useMemo(
      () => ({
        a: ({ href, children, ...rest }: ComponentProps) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary no-underline hover:underline"
            {...rest}
          >
            {children}
          </a>
        ),
        pre: ({ children, domNode, ...rest }: ComponentProps) => (
          <div className="my-4 max-w-full overflow-hidden last:mb-0">
            <pre {...rest}>{children}</pre>
          </div>
        ),
        code: ({ className, children, ...rest }: ComponentProps) => {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match;

          if (!isInline) {
            return (
              <CodeBlockWrapper
                language={match[1]}
              >
                {children}
              </CodeBlockWrapper>
            );
          }

          return (
            <code
              className="bg-surface rounded-sm px-1 py-0.5 font-mono text-[0.9em]"
              {...rest}
            >
              {children}
            </code>
          );
        },
        blockquote: ({ children, ...rest }: ComponentProps) => (
          <blockquote
            {...rest}
            className="text-primary/50 my-4 border-l-4 border-border pl-4 italic"
          >
            {children}
          </blockquote>
        ),
        ul: ({ children, ...rest }: ComponentProps) => (
          <ul
            {...rest}
            className="my-4 pl-6 [&>li:last-child]:mb-0 [&>li]:mb-1"
          >
            {children}
          </ul>
        ),
        ol: ({ children, ...rest }: ComponentProps) => (
          <ol
            {...rest}
            className="my-4 pl-6 [&>li:last-child]:mb-0 [&>li]:mb-1"
          >
            {children}
          </ol>
        ),
        table: ({ children, ...rest }: ComponentProps) => (
          <div className="my-4 overflow-x-auto">
            <table
              {...rest}
              className="[&_th]:bg-surface w-full border-collapse [&_td]:border [&_td]:border-border [&_td]:p-2 [&_th]:border [&_th]:border-border [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold"
            >
              {children}
            </table>
          </div>
        ),
      }),
      []
    );

    if (!content) return null;

    return (
      <div
        className={cn(
          "prose min-w-0 max-w-full overflow-hidden break-words text-sm leading-relaxed text-inherit [&_h1:first-child]:mt-0 [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:font-semibold [&_h2:first-child]:mt-0 [&_h2]:mb-4 [&_h2]:mt-6 [&_h2]:font-semibold [&_h3:first-child]:mt-0 [&_h3]:mb-4 [&_h3]:mt-6 [&_h3]:font-semibold [&_h4:first-child]:mt-0 [&_h4]:mb-4 [&_h4]:mt-6 [&_h4]:font-semibold [&_h5:first-child]:mt-0 [&_h5]:mb-4 [&_h5]:mt-6 [&_h5]:font-semibold [&_h6:first-child]:mt-0 [&_h6]:mb-4 [&_h6]:mt-6 [&_h6]:font-semibold [&_p:last-child]:mb-0 [&_p]:mb-4",
          className
        )}
      >
        <XMarkdown
          content={content}
          components={components}
          streaming={
            isStreaming
              ? {
                  enableAnimation: true,
                  animationConfig: {
                    fadeDuration: 200,
                    opacity: 0.2,
                  },
                }
              : undefined
          }
          openLinksInNewTab={true}
        />
        {isStreaming && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground" />
        )}
      </div>
    );
  }
);

AntdXMarkdown.displayName = "AntdXMarkdown";
