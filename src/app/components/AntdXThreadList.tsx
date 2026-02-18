"use client";

import React, { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { Conversations } from "@ant-design/x";
import type { ConversationsProps } from "@ant-design/x";
import { isToday, isYesterday, subDays } from "date-fns";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ThreadItem } from "@/app/hooks/useThreads";
import { useThreads } from "@/app/hooks/useThreads";

type StatusFilter = "all" | "idle" | "busy" | "interrupted" | "error";

const STATUS_COLORS: Record<ThreadItem["status"], string> = {
  idle: "bg-green-500",
  busy: "bg-blue-500",
  interrupted: "bg-orange-500",
  error: "bg-red-600",
};

function getThreadColor(status: ThreadItem["status"]): string {
  return STATUS_COLORS[status] ?? "bg-gray-400";
}

function StatusFilterItem({
  status,
  label,
  badge,
}: {
  status: ThreadItem["status"];
  label: string;
  badge?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-block size-2 rounded-full",
          getThreadColor(status)
        )}
      />
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="ml-1 inline-flex items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold leading-none text-white">
          {badge}
        </span>
      )}
    </span>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <p className="text-sm text-red-600">Failed to load threads</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <svg
        className="mb-2 h-12 w-12 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      <p className="text-sm text-muted-foreground">No threads found</p>
    </div>
  );
}

interface AntdXThreadListProps {
  onThreadSelect: (id: string) => void;
  onMutateReady?: (mutate: () => void) => void;
  onClose?: () => void;
  onInterruptCountChange?: (count: number) => void;
}

export const AntdXThreadList = React.memo<AntdXThreadListProps>(
  ({ onThreadSelect, onMutateReady, onClose, onInterruptCountChange }) => {
    const [currentThreadId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const threads = useThreads({
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: 20,
    });

    const flattened = useMemo(() => {
      return threads.data?.flat() ?? [];
    }, [threads.data]);

    const isLoadingMore =
      threads.size > 0 && threads.data?.[threads.size - 1] == null;
    const isEmpty = threads.data?.at(0)?.length === 0;
    const isReachingEnd =
      isEmpty || (threads.data?.at(-1)?.length ?? 0) < 20;

    const interruptedCount = useMemo(() => {
      return flattened.filter((t) => t.status === "interrupted").length;
    }, [flattened]);

    // Expose thread list revalidation to parent component
    const mutateRef = useRef(threads.mutate);

    useEffect(() => {
      mutateRef.current = threads.mutate;
    }, [threads.mutate]);

    const mutateFn = useCallback(() => {
      mutateRef.current();
    }, []);

    useEffect(() => {
      onMutateReady?.(mutateFn);
    }, [onMutateReady, mutateFn]);

    // Notify parent of interrupt count changes
    useEffect(() => {
      onInterruptCountChange?.(interruptedCount);
    }, [interruptedCount, onInterruptCountChange]);

    // Handle loading state
    useEffect(() => {
      if (!threads.isLoading) {
        setLoading(false);
      }
    }, [threads.isLoading]);

    // Convert threads to Conversations items format
    const items: ConversationsProps["items"] = useMemo(() => {
      return flattened.map((thread) => {
        const updatedAt = thread.updatedAt;
        return {
          key: thread.id,
          label: thread.title || "Untitled Thread",
          group: getGroupLabel(updatedAt, thread.status),
          timestamp: updatedAt.getTime(),
          onClick: () => onThreadSelect(thread.id),
        };
      });
    }, [flattened, onThreadSelect]);

    // Active key is the current thread ID from URL state
    const activeKey = currentThreadId;

    // Handle load more for infinite scrolling
    const handleLoadMore = useCallback(() => {
      if (!isLoadingMore && !isReachingEnd) {
        threads.setSize((size) => size + 1);
      }
    }, [isLoadingMore, isReachingEnd, threads]);

    if (threads.error) {
      return <ErrorState message={threads.error.message} />;
    }

    if (!threads.data && threads.isLoading) {
      return <LoadingState />;
    }

    if (!threads.isLoading && isEmpty) {
      return <EmptyState />;
    }

    return (
      <div className="flex h-full flex-col">
        {/* Header with title, filter, and close button */}
        <div className="grid flex-shrink-0 grid-cols-[1fr_auto] items-center gap-3 border-b border-border p-4">
          <h2 className="text-lg font-semibold tracking-tight">Threads</h2>
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="w-fit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Active</SelectLabel>
                  <SelectItem value="idle">
                    <StatusFilterItem status="idle" label="Idle" />
                  </SelectItem>
                  <SelectItem value="busy">
                    <StatusFilterItem status="busy" label="Busy" />
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Attention</SelectLabel>
                  <SelectItem value="interrupted">
                    <StatusFilterItem
                      status="interrupted"
                      label="Interrupted"
                      badge={interruptedCount}
                    />
                  </SelectItem>
                  <SelectItem value="error">
                    <StatusFilterItem status="error" label="Error" />
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
                aria-label="Close threads sidebar"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Conversations component */}
        <div className="flex-1 overflow-hidden">
          <Conversations
            items={items}
            activeKey={activeKey}
            onActiveChange={(key) => {
              if (key) {
                onThreadSelect(key);
              }
            }}
            groupable
            onLoadMore={handleLoadMore}
            loading={isLoadingMore}
            className="h-full"
          />
        </div>
      </div>
    );
  }
);

AntdXThreadList.displayName = "AntdXThreadList";

/**
 * Get group label for Conversations component
 * Groups threads by time and interrupt status
 */
function getGroupLabel(date: Date, status: ThreadItem["status"]): string {
  // Interrupted threads get their own group
  if (status === "interrupted") {
    return "Requiring Attention";
  }

  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (date > subDays(new Date(), 7)) return "This Week";
  return "Older";
}
