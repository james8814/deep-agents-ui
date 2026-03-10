"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button as _Button } from "@/components/ui/button";
import { LogOut, User, Settings, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  onSettingsClick?: () => void;
}

export function UserMenu({ onSettingsClick }: UserMenuProps) {
  const { user, logout, isLoading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
  };

  if (!user) return null;

  return (
    <div className="relative">
      {/* 用户按钮 */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
          "transition-colors hover:bg-accent",
          isOpen && "bg-accent"
        )}
      >
        <div className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-full text-primary">
          <User size={14} />
        </div>
        <span className="font-medium">{user.username}</span>
        <ChevronDown
          size={14}
          className={cn("transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg"
        >
          {/* 用户信息 */}
          <div className="border-b border-border px-3 py-2">
            <div className="text-xs text-muted-foreground">已登录</div>
            <div className="font-medium">{user.username}</div>
            {user.email && (
              <div className="text-xs text-muted-foreground">{user.email}</div>
            )}
          </div>

          {/* 设置按钮 */}
          {onSettingsClick && (
            <button
              onClick={() => {
                setIsOpen(false);
                onSettingsClick();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
            >
              <Settings
                size={14}
                className="text-muted-foreground"
              />
              <span>设置</span>
            </button>
          )}

          {/* 分隔线 */}
          <div className="my-1 border-t border-border" />

          {/* 退出登录按钮 */}
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            {isLoading ? (
              <Loader2
                size={14}
                className="animate-spin"
              />
            ) : (
              <LogOut size={14} />
            )}
            <span>{isLoading ? "退出中..." : "退出登录"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
