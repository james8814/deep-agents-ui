"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useQueryState } from "nuqs";
import { getConfig, saveConfig, StandaloneConfig } from "@/lib/config";
import { ConfigDialog } from "@/app/components/ConfigDialog";
import { Button } from "@/components/ui/button";
import { Assistant } from "@langchain/langgraph-sdk";
import { ClientProvider, useClient } from "@/providers/ClientProvider";
import { MessagesSquare, SquarePen, PanelRight, Sun, Moon } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { AzuneWordmark } from "@/components/AzuneWordmark";
import { useAuth } from "@/contexts/AuthContext";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ThreadList } from "@/app/components/ThreadList";
import { AntdXThreadList } from "@/app/components/AntdXThreadList";
import { ChatProvider } from "@/providers/ChatProvider";
import { ChatInterface } from "@/app/components/ChatInterface";
import { ContextPanel } from "@/app/components/ContextPanel";
import { cn } from "@/lib/utils";
import { SettingsModal } from "@/app/components/SettingsModal";
import { useThemeSettings } from "@/providers/ThemeProvider";
import { useKeyboardShortcuts } from "@/app/hooks/useKeyboardShortcuts";

interface HomePageInnerProps {
  config: StandaloneConfig;
  configDialogOpen: boolean;
  setConfigDialogOpen: (open: boolean) => void;
  handleSaveConfig: (config: StandaloneConfig) => void;
}

function HomePageInner({
  config,
  configDialogOpen,
  setConfigDialogOpen,
  handleSaveConfig,
}: HomePageInnerProps) {
  const client = useClient();
  const { user: _user } = useAuth();
  const [threadId, setThreadId] = useQueryState("threadId");
  const [sidebar, setSidebar] = useQueryState("sidebar");
  const [contextPanel, setContextPanel] = useQueryState("context");
  const [contextTab, setContextTab] = useQueryState("contextTab");

  // Feature Flag for Ant Design X ThreadList
  const [useAntdxThreadList] = useQueryState("useAntdxThreadList");
  // URL 参数优先，如果没有则使用 localStorage 中的 useAntdX 设置
  const isAntdxThreadList =
    useAntdxThreadList === "true" || config.useAntdX === true;

  const [mutateThreads, setMutateThreads] = useState<(() => void) | null>(null);
  const [interruptCount, setInterruptCount] = useState(0);
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, updateSettings, saveSettings } = useThemeSettings();

  const fetchAssistant = useCallback(async () => {
    const assistantId = config.assistantId;
    if (!assistantId) {
      console.warn("No assistantId configured");
      return;
    }

    // 判断是否为 UUID 格式（Saved Assistant）
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        assistantId
      );

    if (isUUID) {
      // UUID 格式：尝试获取保存的 Assistant（Saved Assistant 场景）
      try {
        const data = await client.assistants.get(assistantId);
        setAssistant(data);
        return;
      } catch {
        // 助手不存在，使用 Assistant Reference
        console.warn("Assistant not found, using reference");
      }
    }

    // Graph name 格式：直接创建 Assistant Reference（无需搜索 API！）
    // LangGraph Server 会自动解析 graph name 并创建临时的 Assistant
    setAssistant({
      assistant_id: assistantId,
      graph_id: assistantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      config: {},
      metadata: {},
      version: 1,
      name: assistantId,
      context: {},
    });
  }, [client, config.assistantId]);

  useEffect(() => {
    fetchAssistant();
  }, [fetchAssistant]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewThread: () => setThreadId(null),
    onFocusInput: () => {
      const textarea = document.querySelector(
        "textarea[name='message']"
      ) as HTMLTextAreaElement | null;
      textarea?.focus();
    },
    onToggleContext: () => setContextPanel(contextPanel ? null : "1"),
    onStopGeneration: () => {
      // Close dialogs or stop generation (handled by ChatInterface)
    },
  });

  return (
    <>
      <ConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        onSave={handleSaveConfig}
        initialConfig={config}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <main className="flex h-screen flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <AzuneWordmark
                height={36}
                variant="auto"
              />
            </div>
            {!sidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebar("1")}
                className="rounded-md border border-border bg-card p-3 text-foreground hover:bg-accent"
              >
                <MessagesSquare className="mr-2 h-4 w-4" />
                Threads
                {interruptCount > 0 && (
                  <span className="ml-2 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                    {interruptCount}
                  </span>
                )}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  assistant ? "bg-green-500" : "bg-red-500"
                )}
              />
              <span className="font-medium">Assistant:</span>{" "}
              {config.assistantId}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setContextPanel(contextPanel ? null : "1")}
            >
              <PanelRight className="mr-2 h-4 w-4" />
              任务工作台
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setThreadId(null)}
              // 🔧 修复：移除 disabled 限制，允许在任何情况下创建新会话
            >
              <SquarePen className="mr-2 h-4 w-4" />
              New Thread
            </Button>
            {/* 快捷主题切换 */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={async () => {
                const next = settings.theme === "dark" ? "light" : "dark";
                updateSettings({ theme: next, themePreference: next });
                await saveSettings().catch(console.error);
              }}
              aria-label={`Switch to ${
                settings.theme === "dark" ? "light" : "dark"
              } mode`}
              aria-pressed={settings.theme === "dark"}
              title={`Current: ${
                settings.theme === "dark" ? "Dark" : "Light"
              } mode`}
            >
              {settings.theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            {/* 用户菜单 */}
            <UserMenu onSettingsClick={() => setSettingsOpen(true)} />
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          {!assistant ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
                <p className="text-muted-foreground">正在连接 Agent...</p>
              </div>
            </div>
          ) : (
            <ChatProvider
              activeAssistant={assistant}
              onHistoryRevalidate={() => mutateThreads?.()}
              threadId={threadId}
            >
              <ResizablePanelGroup
                direction="horizontal"
                autoSaveId="standalone-chat"
              >
                {sidebar && (
                  <>
                    <ResizablePanel
                      id="thread-history"
                      order={1}
                      defaultSize={25}
                      minSize={20}
                      className="relative min-w-[380px]"
                    >
                      {isAntdxThreadList ? (
                        <AntdXThreadList
                          onThreadSelect={async (id) => {
                            await setThreadId(id);
                          }}
                          onMutateReady={(fn) => setMutateThreads(() => fn)}
                          onClose={() => setSidebar(null)}
                          onInterruptCountChange={setInterruptCount}
                        />
                      ) : (
                        <ThreadList
                          onThreadSelect={async (id) => {
                            await setThreadId(id);
                          }}
                          onMutateReady={(fn) => setMutateThreads(() => fn)}
                          onClose={() => setSidebar(null)}
                          onInterruptCountChange={setInterruptCount}
                        />
                      )}
                    </ResizablePanel>
                    <ResizableHandle />
                  </>
                )}

                <ResizablePanel
                  id="chat"
                  className="relative flex flex-col"
                  order={2}
                >
                  <ChatInterface assistant={assistant} />
                </ResizablePanel>

                {contextPanel && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel
                      id="context"
                      order={3}
                      defaultSize={25}
                      minSize={20}
                      className="relative h-full min-w-[280px]"
                    >
                      <ContextPanel
                        onClose={() => {
                          setContextPanel(null);
                          setContextTab(null);
                        }}
                        initialTab={
                          contextTab === "files" ? "files" : undefined
                        }
                      />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </ChatProvider>
          )}
        </div>
      </main>
    </>
  );
}

function HomePageContent() {
  const [config, setConfig] = useState<StandaloneConfig | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [assistantId, setAssistantId] = useQueryState("assistantId");
  const { token } = useAuth(); // 获取 token

  // On mount, check for saved config, otherwise show config dialog
  useEffect(() => {
    const savedConfig = getConfig();
    if (savedConfig) {
      setConfig(savedConfig);
      if (!assistantId) {
        setAssistantId(savedConfig.assistantId);
      }
    } else {
      setConfigDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If config changes, update the assistantId
  useEffect(() => {
    if (config && !assistantId) {
      setAssistantId(config.assistantId);
    }
  }, [config, assistantId, setAssistantId]);

  const handleSaveConfig = useCallback((newConfig: StandaloneConfig) => {
    saveConfig(newConfig);
    setConfig(newConfig);
  }, []);

  // 移除 API Key，使用 Bearer Token 认证
  // const langsmithApiKey = config?.langsmithApiKey || "";

  if (!config) {
    return (
      <>
        <ConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          onSave={handleSaveConfig}
        />
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome to Standalone Chat</h1>
            <p className="mt-2 text-muted-foreground">
              Configure your deployment to get started
            </p>
            <Button
              onClick={() => setConfigDialogOpen(true)}
              className="mt-4"
            >
              Open Configuration
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <ClientProvider
      deploymentUrl={config.deploymentUrl}
      token={token} // 传递 token
    >
      <HomePageInner
        config={config}
        configDialogOpen={configDialogOpen}
        setConfigDialogOpen={setConfigDialogOpen}
        handleSaveConfig={handleSaveConfig}
      />
    </ClientProvider>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  );
}
