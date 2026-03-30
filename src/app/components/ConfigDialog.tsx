"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { StandaloneConfig, getConfig as _getConfig } from "@/lib/config";
import { Switch } from "@/components/ui/switch";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Client } from "@langchain/langgraph-sdk";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (config: StandaloneConfig) => void;
  initialConfig?: StandaloneConfig;
}

export function ConfigDialog({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}: ConfigDialogProps) {
  const [deploymentUrl, setDeploymentUrl] = useState(
    initialConfig?.deploymentUrl || ""
  );
  const [assistantId, setAssistantId] = useState(
    initialConfig?.assistantId || ""
  );
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "testing" | "ok" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState("");

  useEffect(() => {
    if (open && initialConfig) {
      setDeploymentUrl(initialConfig.deploymentUrl);
      setAssistantId(initialConfig.assistantId);
      // 移除 API Key，使用 Cookie 认证
      setConnectionStatus("idle");
      setConnectionError("");
    }
  }, [open, initialConfig]);

  const testConnection = async () => {
    setConnectionStatus("testing");
    setConnectionError("");
    try {
      // 使用 fetchInterceptor 全局注入 Bearer Token，无需手动注入
      const testClient = new Client({
        apiUrl: deploymentUrl,
      });
      await testClient.assistants.search({ limit: 1 });
      setConnectionStatus("ok");
    } catch (e) {
      setConnectionStatus("error");
      setConnectionError(e instanceof Error ? e.message : "Connection failed");
    }
  };

  const handleSave = () => {
    if (!deploymentUrl || !assistantId) {
      alert("Please fill in all required fields");
      return;
    }

    onSave({
      deploymentUrl,
      assistantId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Configuration</DialogTitle>
          <DialogDescription>
            Configure your LangGraph deployment settings. These settings are
            saved in your browser&apos;s local storage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="deploymentUrl">Deployment URL</Label>
            <Input
              id="deploymentUrl"
              placeholder="https://<deployment-url>"
              value={deploymentUrl}
              onChange={(e) => {
                setDeploymentUrl(e.target.value);
                setConnectionStatus("idle");
                setConnectionError("");
              }}
            />
            {/* Connection test button */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={!deploymentUrl || connectionStatus === "testing"}
              >
                {connectionStatus === "testing" ? (
                  <>
                    <Loader2
                      size={14}
                      className="mr-1 animate-spin"
                    />
                    Testing...
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
              {connectionStatus === "ok" && (
                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle size={12} /> Connected
                </span>
              )}
              {connectionStatus === "error" && (
                <span
                  className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400"
                  title={connectionError}
                >
                  <XCircle size={12} /> Failed
                </span>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="assistantId">Assistant ID</Label>
            <Input
              id="assistantId"
              placeholder="<assistant-id>"
              value={assistantId}
              onChange={(e) => setAssistantId(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
