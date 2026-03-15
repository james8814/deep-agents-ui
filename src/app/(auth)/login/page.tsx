"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { AzuneWordmark } from "@/components/AzuneWordmark";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(username, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <AzuneWordmark height={36} variant="dark" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            登录
          </h1>
          <p className="text-sm text-muted-foreground">
            输入您的账号信息以继续
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle
                size={16}
                className="shrink-0"
              />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2
                  size={16}
                  className="mr-2 animate-spin"
                />
                登录中...
              </>
            ) : (
              "登录"
            )}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          还没有账号？{" "}
          <a
            href="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            注册
          </a>
        </p>
      </div>
    </div>
  );
}
