"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Zap,
  MessageSquare,
  GitBranch
} from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
  assistantId?: string;
  isLoading?: boolean;
}

const floatingAnimation = `
  @keyframes floating {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(2deg); }
  }
  @keyframes fadeInScale {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .floating { animation: floating 6s ease-in-out infinite; }
  .fade-in-scale { animation: fadeInScale 0.6s ease-out; }
  .slide-in-up { animation: slideInUp 0.8s ease-out; }
`;

export const WelcomeScreen = React.memo<WelcomeScreenProps>(
  ({ onGetStarted, assistantId, isLoading = false }) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const quickActions = [
      {
        icon: <Zap className="h-5 w-5" />,
        title: "Quick Start",
        description: "Get started with your first prompt",
      },
      {
        icon: <BookOpen className="h-5 w-5" />,
        title: "Documentation",
        description: "Learn about Agent capabilities",
      },
      {
        icon: <MessageSquare className="h-5 w-5" />,
        title: "Examples",
        description: "See real workflow examples",
      },
      {
        icon: <GitBranch className="h-5 w-5" />,
        title: "Advanced",
        description: "Configure advanced settings",
      },
    ];

    return (
      <>
        <style>{floatingAnimation}</style>
        <div
          className={cn(
            "relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-accent/5",
            "transition-opacity duration-500",
            mounted ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />
          </div>

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-2xl px-4 text-center">
            {/* Logo/Brand Section */}
            <div className="mb-8 inline-block fade-in-scale">
              <div className="floating relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
            </div>

            {/* Main Heading */}
            <div className="slide-in-up mb-4 space-y-2">
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                Deep Agents Studio
              </h1>
              <p className="text-lg text-muted-foreground">
                AI-powered Product Management Assistant
              </p>
            </div>

            {/* Assistant Info */}
            {assistantId && (
              <div className="slide-in-up mb-8 inline-flex items-center gap-2 rounded-lg border border-border/50 bg-accent/50 px-4 py-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500/70" />
                <span>Connected to: {assistantId}</span>
              </div>
            )}

            {/* Description */}
            <div className="slide-in-up mb-10 space-y-3 text-muted-foreground">
              <p>
                Transform your product ideas into structured documentation with AI assistance.
              </p>
              <p className="text-sm">
                Leverage OPDCA workflow with Human-in-the-Loop checkpoints for better outcomes.
              </p>
            </div>

            {/* Primary CTA */}
            <div className="slide-in-up mb-12 flex flex-col items-center gap-4">
              <Button
                onClick={onGetStarted}
                disabled={isLoading}
                size="lg"
                className="gap-2 px-8 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Connecting...
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground/70">
                No configuration required to start
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="slide-in-up grid gap-4 sm:grid-cols-2">
              {quickActions.map((action, index) => (
                <div
                  key={action.title}
                  className={cn(
                    "rounded-lg border border-border/50 bg-card/50 p-4 text-left transition-all hover:border-primary/30 hover:bg-card/80 hover:shadow-md",
                    "hover:translate-y-[-2px] cursor-pointer group"
                  )}
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div className="mb-2 inline-flex rounded-lg bg-primary/10 p-2 text-primary transition-all group-hover:bg-primary/20">
                    {action.icon}
                  </div>
                  <h3 className="font-semibold text-foreground">{action.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer Info */}
            <div className="slide-in-up mt-12 flex flex-col items-center gap-3 border-t border-border/30 pt-8 text-xs text-muted-foreground/60">
              <p>Powered by LangGraph & DeepAgents</p>
              <div className="flex gap-4">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-muted-foreground transition-colors"
                >
                  GitHub
                </a>
                <span className="text-border/30">•</span>
                <a
                  href="https://docs.example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-muted-foreground transition-colors"
                >
                  Docs
                </a>
                <span className="text-border/30">•</span>
                <a
                  href="https://support.example.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-muted-foreground transition-colors"
                >
                  Support
                </a>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
);

WelcomeScreen.displayName = "WelcomeScreen";
