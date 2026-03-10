"use client";

import React from "react";
import SubAgentPanelCard, { type SubAgentStreamState } from "./SubAgentPanelCard";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SubAgentPanelProps {
  subagents?: Record<string, any>;
}

const SubAgentPanel: React.FC<SubAgentPanelProps> = ({ subagents = {} }) => {
  const agents = Object.values(subagents).filter((agent) => agent && typeof agent === "object") as SubAgentStreamState[];

  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-[var(--t3)]">
        <div className="text-sm">暂无子代理活动</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full">
      <div className="p-3 space-y-2">
        {agents.map((agent) => (
          <SubAgentPanelCard key={agent.id} agent={agent} />
        ))}
      </div>
    </ScrollArea>
  );
};

export default SubAgentPanel;
