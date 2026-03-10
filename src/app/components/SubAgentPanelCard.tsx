"use client";

import React, { useState } from "react";
import { ChevronDown, CheckCircle, AlertCircle, Clock, Loader } from "lucide-react";

export type SubAgentStatus = "pending" | "running" | "complete" | "error";

export interface ToolCall {
  tool_name: string;
  tool_input?: Record<string, any>;
  tool_output?: string;
  timestamp?: string;
}

export interface SubAgentStreamState {
  id: string;
  name: string;
  status: SubAgentStatus;
  startTime?: number;
  endTime?: number;
  toolCalls?: ToolCall[];
  error?: string;
}

interface SubAgentPanelCardProps {
  agent: SubAgentStreamState;
}

const STATUS_CONFIG: Record<SubAgentStatus, { icon: React.ReactNode; color: string; label: string }> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: "text-[var(--t3)]",
    label: "待执行",
  },
  running: {
    icon: <Loader className="h-4 w-4 animate-spin" />,
    color: "text-[var(--brand)]",
    label: "执行中",
  },
  complete: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-[var(--ok)]",
    label: "完成",
  },
  error: {
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-[var(--err)]",
    label: "错误",
  },
};

const SubAgentPanelCard: React.FC<SubAgentPanelCardProps> = ({ agent }) => {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[agent.status];
  const elapsedTime = agent.startTime
    ? Math.round(((agent.endTime ?? Date.now()) - agent.startTime) / 1000)
    : 0;

  return (
    <div className="mb-3 overflow-hidden rounded-[var(--r-md)] border border-[var(--b1)] bg-[var(--bg2)]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left transition-colors hover:bg-[var(--bg3)]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`flex items-center gap-1.5 ${config.color}`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[var(--t1)] truncate">{agent.name}</div>
              <div className={`text-sm ${config.color}`}>{config.label}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {elapsedTime > 0 && (
              <span className="text-xs text-[var(--t3)]">{elapsedTime}s</span>
            )}
            {(agent.toolCalls?.length ?? 0) > 0 && (
              <span className="text-xs font-medium text-[var(--t2)]">
                {agent.toolCalls?.length} 工具
              </span>
            )}
            <ChevronDown
              className={`h-4 w-4 text-[var(--t3)] transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-[var(--b1)] p-3 space-y-3">
          {/* Tool Calls Section */}
          {(agent.toolCalls?.length ?? 0) > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold text-[var(--t2)]">工具调用</div>
              <div className="space-y-2">
                {agent.toolCalls?.map((call, idx) => (
                  <ToolCallDetail key={idx} call={call} index={idx} />
                ))}
              </div>
            </div>
          )}

          {/* Error Section */}
          {agent.error && (
            <div className="rounded-[var(--r-sm)] bg-[var(--err)] bg-opacity-10 p-2">
              <div className="text-xs font-medium text-[var(--err)] mb-1">错误</div>
              <div className="text-xs text-[var(--t2)] font-mono break-words">
                {agent.error}
              </div>
            </div>
          )}

          {/* Metadata */}
          {(agent.startTime || agent.endTime) && (
            <div className="text-xs text-[var(--t3)] space-y-1">
              {agent.startTime && (
                <div>开始: {new Date(agent.startTime).toLocaleTimeString()}</div>
              )}
              {agent.endTime && (
                <div>结束: {new Date(agent.endTime).toLocaleTimeString()}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ToolCallDetailProps {
  call: ToolCall;
  index: number;
}

const ToolCallDetail: React.FC<ToolCallDetailProps> = ({ call, index }) => {
  const [expandedInput, setExpandedInput] = useState(false);
  const [expandedOutput, setExpandedOutput] = useState(false);

  return (
    <div className="rounded-[var(--r-sm)] bg-[var(--bg3)] p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--brand)]">{call.tool_name}</span>
        <span className="text-xs text-[var(--t3)]">#{index + 1}</span>
      </div>

      {/* Input Parameters */}
      {call.tool_input && (
        <div>
          <button
            onClick={() => setExpandedInput(!expandedInput)}
            className="flex items-center gap-1.5 text-xs text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform ${expandedInput ? "rotate-180" : ""}`}
            />
            输入参数
          </button>
          {expandedInput && (
            <div className="mt-1 text-xs text-[var(--t3)] font-mono bg-[var(--bg2)] rounded p-1.5 overflow-auto max-h-32">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(call.tool_input, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Output Result */}
      {call.tool_output && (
        <div>
          <button
            onClick={() => setExpandedOutput(!expandedOutput)}
            className="flex items-center gap-1.5 text-xs text-[var(--t2)] hover:text-[var(--t1)] transition-colors"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform ${expandedOutput ? "rotate-180" : ""}`}
            />
            输出结果
          </button>
          {expandedOutput && (
            <div className="mt-1 text-xs text-[var(--t3)] font-mono bg-[var(--bg2)] rounded p-1.5 overflow-auto max-h-32">
              <pre className="whitespace-pre-wrap break-words">{call.tool_output}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SubAgentPanelCard;
