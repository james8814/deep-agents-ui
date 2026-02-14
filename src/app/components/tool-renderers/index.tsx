"use client";

import React from "react";
import { Search, Terminal, FileEdit, Globe } from "lucide-react";

interface ToolRendererProps {
  name: string;
  args: Record<string, unknown>;
}

/**
 * Renders tool call arguments in a human-friendly format.
 * Falls back to JSON for unrecognized tools.
 */
export function ToolArgsRenderer({ name, args }: ToolRendererProps) {
  const renderer = TOOL_RENDERERS[name];
  if (renderer) {
    return renderer(args);
  }
  return <DefaultRenderer args={args} />;
}

// --- Registry ---

const TOOL_RENDERERS: Record<string, (args: Record<string, unknown>) => React.ReactNode> = {
  web_search: (args) => (
    <div className="flex items-center gap-2 py-1">
      <Search size={14} className="flex-shrink-0 text-blue-500" />
      <span className="text-sm">
        Searching: <span className="font-medium">"{String(args.query || args.search_query || "")}"</span>
      </span>
    </div>
  ),

  shell: (args) => (
    <div className="rounded-md bg-zinc-900 p-3">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Terminal size={12} />
        <span>Shell Command</span>
      </div>
      <pre className="mt-1 font-mono text-sm text-green-400">
        $ {String(args.command || args.cmd || "")}
      </pre>
    </div>
  ),

  bash: (args) => TOOL_RENDERERS.shell(args),

  execute: (args) => (
    <div className="rounded-md bg-zinc-900 p-3">
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Terminal size={12} />
        <span>Execute</span>
      </div>
      <pre className="mt-1 font-mono text-sm text-green-400">
        $ {String(args.command || args.cmd || "")}
      </pre>
    </div>
  ),

  write_file: (args) => {
    const content = args.content ? String(args.content) : "";
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 py-1">
          <FileEdit size={14} className="flex-shrink-0 text-amber-500" />
          <span className="text-sm">
            Writing to: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{String(args.file_path || args.path || args.filename || "")}</code>
          </span>
        </div>
        {content && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Show content ({content.length} chars)
            </summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 font-mono">
              {content.slice(0, 2000)}
              {content.length > 2000 && "\n... (truncated)"}
            </pre>
          </details>
        )}
      </div>
    );
  },

  read_file: (args) => (
    <div className="flex items-center gap-2 py-1">
      <FileEdit size={14} className="flex-shrink-0 text-blue-500" />
      <span className="text-sm">
        Reading: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{String(args.file_path || args.path || args.filename || "")}</code>
      </span>
    </div>
  ),

  edit_file: (args) => {
    const newText = args.new_text ? String(args.new_text) : "";
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 py-1">
          <FileEdit size={14} className="flex-shrink-0 text-amber-500" />
          <span className="text-sm">
            Editing: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{String(args.file_path || args.path || "")}</code>
          </span>
        </div>
        {newText && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Show new text ({newText.length} chars)
            </summary>
            <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 font-mono">
              {newText.slice(0, 2000)}
              {newText.length > 2000 && "\n... (truncated)"}
            </pre>
          </details>
        )}
      </div>
    );
  },

  ls: (args) => (
    <div className="flex items-center gap-2 py-1">
      <FileEdit size={14} className="flex-shrink-0 text-blue-500" />
      <span className="text-sm">
        Listing: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{String(args.path || args.dir_path || ".")}</code>
      </span>
    </div>
  ),

  glob: (args) => (
    <div className="flex items-center gap-2 py-1">
      <FileEdit size={14} className="flex-shrink-0 text-blue-500" />
      <span className="text-sm">
        Glob pattern: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{String(args.pattern || "")}</code>
      </span>
    </div>
  ),

  grep: (args) => (
    <div className="flex items-center gap-2 py-1">
      <Search size={14} className="flex-shrink-0 text-purple-500" />
      <span className="text-sm">
        Searching for: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{String(args.pattern || "")}</code>
      </span>
    </div>
  ),

  browse: (args) => (
    <div className="flex items-center gap-2 py-1">
      <Globe size={14} className="flex-shrink-0 text-purple-500" />
      <span className="text-sm">
        Browsing: <a href={String(args.url || "")} target="_blank" rel="noopener noreferrer" className="text-primary underline">{String(args.url || "")}</a>
      </span>
    </div>
  ),

  fetch_webpage: (args) => (
    <div className="flex items-center gap-2 py-1">
      <Globe size={14} className="flex-shrink-0 text-purple-500" />
      <span className="text-sm">
        Fetching: <a href={String(args.url || "")} target="_blank" rel="noopener noreferrer" className="text-primary underline">{String(args.url || "")}</a>
      </span>
    </div>
  ),

  think: (args) => (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <span className="text-xs font-medium text-muted-foreground">Thinking...</span>
    </div>
  ),

  write_todos: (args) => (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm text-muted-foreground">Updating todo list</span>
    </div>
  ),

  task: (args) => (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm">
        Delegating to: <span className="font-medium">{String(args.subagent_type || args.agent_type || "sub-agent")}</span>
      </span>
    </div>
  ),
};

function DefaultRenderer({ args }: { args: Record<string, unknown> }) {
  const entries = Object.entries(args);

  // For simple single-value args, render inline
  if (entries.length === 1) {
    const [key, value] = entries[0];
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    if (strValue.length < 100) {
      return (
        <div className="flex items-center gap-2 py-1 text-sm">
          <span className="font-mono text-xs text-muted-foreground">{key}:</span>
          <span className="truncate">{strValue}</span>
        </div>
      );
    }
  }

  // Fallback: structured JSON
  return (
    <pre className="m-0 overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-6 text-foreground">
      {JSON.stringify(args, null, 2)}
    </pre>
  );
}
