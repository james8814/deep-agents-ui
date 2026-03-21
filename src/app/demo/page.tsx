"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/**
 * v5.27 动画系统演示页面
 *
 * 展示 design-system.css + animation-utilities.css 中定义的所有动画效果。
 * 无需后端连接，直接在浏览器中查看。
 *
 * 访问: http://localhost:3000/demo
 */

// C2 FIX: 静态数据提到模块级别，避免每次渲染重建
const CONVERSATION = [
  { text: "帮我分析一下这个产品的竞争格局", isUser: true },
  {
    text: "好的，我来为您进行竞争分析。首先让我检索相关市场数据...",
    isUser: false,
  },
  { text: "请重点关注 AI 赛道的头部玩家", isUser: true },
  {
    text: "已找到 15 个竞品，正在生成分析报告。根据数据显示，目前 AI 赛道主要有三个梯队...",
    isUser: false,
  },
  { text: "太好了，请生成一份 PRD", isUser: true },
  {
    text: "正在根据竞品分析结果生成产品需求文档，预计包含 5 个核心功能模块...",
    isUser: false,
  },
] as const;

const STAGGER_ITEMS = Array.from({ length: 8 });

// ============================================================
// 动画演示卡片
// ============================================================
function AnimCard({
  title,
  className,
  children,
  stagger,
}: {
  title: string;
  className?: string;
  children?: React.ReactNode;
  stagger?: number;
}) {
  const [show, setShow] = useState(true);
  const [key, setKey] = useState(0);

  const replay = useCallback(() => {
    setShow(false);
    // 用 key 强制重新挂载来重播动画
    requestAnimationFrame(() => {
      setKey((k) => k + 1);
      setShow(true);
    });
  }, []);

  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "12px",
        padding: "20px",
        background: "var(--card, #fff)",
        minHeight: "140px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--foreground, #111)",
          }}
        >
          {title}
        </span>
        <button
          onClick={replay}
          style={{
            fontSize: "12px",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border, #d1d5db)",
            background: "var(--muted, #f3f4f6)",
            cursor: "pointer",
            color: "var(--foreground, #111)",
          }}
        >
          Replay
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {show && (
          <div
            key={key}
            className={className}
            style={
              stagger !== undefined
                ? ({ "--stagger": stagger } as React.CSSProperties)
                : undefined
            }
          >
            {children || (
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #7c6bf0, #a78bfa)",
                }}
              />
            )}
          </div>
        )}
      </div>

      <code
        style={{
          fontSize: "11px",
          color: "var(--muted-foreground, #6b7280)",
          fontFamily: "monospace",
        }}
      >
        .{className}
      </code>
    </div>
  );
}

// ============================================================
// 消息气泡模拟
// ============================================================
function MessageBubble({
  text,
  isUser,
  className,
  stagger,
}: {
  text: string;
  isUser?: boolean;
  className?: string;
  stagger?: number;
}) {
  return (
    <div
      className={className}
      style={{
        maxWidth: "320px",
        padding: "10px 16px",
        borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
        background: isUser
          ? "linear-gradient(135deg, #7c6bf0, #a78bfa)"
          : "var(--muted, #f3f4f6)",
        color: isUser ? "#fff" : "var(--foreground, #111)",
        fontSize: "14px",
        lineHeight: "1.5",
        alignSelf: isUser ? "flex-end" : "flex-start",
        ...(stagger !== undefined
          ? ({ "--stagger": stagger } as React.CSSProperties)
          : {}),
      }}
    >
      {text}
    </div>
  );
}

// ============================================================
// 聊天消息动画演示
// ============================================================
function ChatDemo() {
  const [messages, setMessages] = useState<
    { id: number; text: string; isUser: boolean }[]
  >([]);
  const [isTyping, setIsTyping] = useState(false);
  const nextId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  // C1 FIX: 保存 timer ID 用于卸载时清理
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // C1 FIX: 卸载时清理 setTimeout
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  const addMessage = useCallback(() => {
    const idx = nextId.current % CONVERSATION.length;
    const sample = CONVERSATION[idx];

    if (sample.isUser) {
      setMessages((prev) => [
        ...prev,
        { id: nextId.current, text: sample.text, isUser: true },
      ]);
      nextId.current++;

      const nextIdx = (idx + 1) % CONVERSATION.length;
      if (!CONVERSATION[nextIdx].isUser) {
        setIsTyping(true);
        // C1 FIX: 保存 timer 引用
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: nextId.current,
              text: CONVERSATION[nextIdx].text,
              isUser: false,
            },
          ]);
          nextId.current++;
          scrollToBottom();
        }, 1200);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        { id: nextId.current, text: sample.text, isUser: false },
      ]);
      nextId.current++;
    }

    scrollToBottom();
  }, [scrollToBottom]);

  const clearMessages = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setMessages([]);
    setIsTyping(false);
    nextId.current = 0;
  }, []);

  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "16px",
        overflow: "hidden",
        background: "var(--card, #fff)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border, #e5e7eb)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span style={{ fontWeight: 600, fontSize: "15px" }}>
            Chat Animation Demo
          </span>
          <span
            style={{
              fontSize: "12px",
              color: "var(--muted-foreground, #9ca3af)",
              marginLeft: "8px",
            }}
          >
            messageIn + shimmer + auto-scroll
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={addMessage}
            disabled={isTyping}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "none",
              background: isTyping
                ? "var(--muted, #e5e7eb)"
                : "linear-gradient(135deg, #7c6bf0, #a78bfa)",
              color: isTyping ? "var(--muted-foreground, #9ca3af)" : "#fff",
              fontSize: "13px",
              cursor: isTyping ? "not-allowed" : "pointer",
              fontWeight: 500,
            }}
          >
            + Send Message
          </button>
          <button
            onClick={clearMessages}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              border: "1px solid var(--border, #d1d5db)",
              background: "var(--muted, #f3f4f6)",
              fontSize: "13px",
              cursor: "pointer",
              color: "var(--foreground, #111)",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          padding: "20px",
          minHeight: "300px",
          maxHeight: "420px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {messages.length === 0 && !isTyping && (
          <div
            style={{
              textAlign: "center",
              color: "var(--muted-foreground, #9ca3af)",
              fontSize: "14px",
              paddingTop: "100px",
            }}
          >
            Click &quot;+ Send Message&quot; to simulate a chat conversation
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            text={msg.text}
            isUser={msg.isUser}
            className="animate-messageIn"
          />
        ))}
        {/* AI 正在输入指示器 */}
        {isTyping && (
          <div
            className="animate-fadeIn"
            role="status"
            aria-live="polite"
            style={{
              alignSelf: "flex-start",
              display: "flex",
              gap: "6px",
              alignItems: "center",
              padding: "12px 18px",
              borderRadius: "16px 16px 16px 4px",
              background: "var(--muted, #f3f4f6)",
            }}
          >
            <div style={{ display: "flex", gap: "4px" }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#7c6bf0",
                    animationDelay: `${i * 200}ms`,
                    opacity: 0.6,
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: "12px",
                color: "var(--muted-foreground, #9ca3af)",
                marginLeft: "4px",
              }}
            >
              AI is thinking...
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Stagger 级联延迟演示
// ============================================================
function StaggerDemo() {
  const [show, setShow] = useState(true);
  const [key, setKey] = useState(0);

  const replay = useCallback(() => {
    setShow(false);
    requestAnimationFrame(() => {
      setKey((k) => k + 1);
      setShow(true);
    });
  }, []);

  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "16px",
        padding: "20px",
        background: "var(--card, #fff)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "15px" }}>
          Stagger Cascade (--stagger)
        </span>
        <button
          onClick={replay}
          style={{
            fontSize: "12px",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border, #d1d5db)",
            background: "var(--muted, #f3f4f6)",
            cursor: "pointer",
            color: "var(--foreground, #111)",
          }}
        >
          Replay
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        {show &&
          STAGGER_ITEMS.map((_, i) => (
            <div
              key={`${key}-${i}`}
              className="animate-fadeIn"
              style={
                {
                  "--stagger": i,
                  width: "48px",
                  height: "48px",
                  borderRadius: "10px",
                  background: `hsl(${255 + i * 10}, 70%, ${60 + i * 3}%)`,
                } as React.CSSProperties
              }
            />
          ))}
      </div>

      <code
        style={{
          display: "block",
          marginTop: "12px",
          fontSize: "11px",
          color: "var(--muted-foreground, #6b7280)",
          fontFamily: "monospace",
        }}
      >
        .animate-fadeIn + style=&#123;&quot;--stagger&quot;: 0..7&#125;
      </code>
    </div>
  );
}

// ============================================================
// Expand / Collapse 交互演示
// ============================================================
function ExpandCollapseDemo() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "16px",
        padding: "20px",
        background: "var(--card, #fff)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "15px" }}>
          Expand / Collapse (GPU: scaleY)
        </span>
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls="expand-demo-content"
          style={{
            fontSize: "12px",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border, #d1d5db)",
            background: "var(--muted, #f3f4f6)",
            cursor: "pointer",
            color: "var(--foreground, #111)",
          }}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      <div
        id="expand-demo-content"
        className={expanded ? "animate-expand" : "animate-collapse"}
        style={{
          background: "linear-gradient(135deg, #7c6bf0, #a78bfa)",
          borderRadius: "12px",
          padding: "20px",
          color: "#fff",
          fontSize: "14px",
          transformOrigin: "top",
        }}
      >
        <p style={{ margin: 0, fontWeight: 600 }}>Expanded Content</p>
        <p style={{ margin: "8px 0 0", opacity: 0.9, fontSize: "13px" }}>
          This section uses transform: scaleY() for GPU-accelerated animation
          instead of max-height, achieving smooth 60fps performance.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Glow Border 演示
// ============================================================
function GlowDemo() {
  return (
    <div
      style={{
        border: "1px solid var(--border, #e5e7eb)",
        borderRadius: "16px",
        padding: "20px",
        background: "var(--card, #fff)",
      }}
    >
      <span
        style={{
          fontWeight: 600,
          fontSize: "15px",
          display: "block",
          marginBottom: "16px",
        }}
      >
        Glow Border + Shimmer
      </span>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <div
          className="animate-glowBorder"
          style={{
            width: "120px",
            height: "80px",
            borderRadius: "12px",
            background: "var(--card, #fff)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: "var(--muted-foreground, #6b7280)",
          }}
        >
          glowBorder
        </div>
        <div
          className="animate-shimmer"
          style={{
            width: "200px",
            height: "80px",
            borderRadius: "12px",
            background:
              "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
            backgroundSize: "200% 100%",
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// 主页面
// ============================================================
export default function DemoPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--background, #f9fafb)",
        padding: "40px 20px",
      }}
    >
      <div style={{ maxWidth: "960px", margin: "0 auto" }}>
        {/* Header */}
        <header style={{ marginBottom: "40px" }}>
          <h1
            className="animate-fadeIn"
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--foreground, #111)",
              margin: 0,
            }}
          >
            v5.27 Animation System Demo
          </h1>
          <p
            className="animate-fadeIn"
            style={
              {
                fontSize: "15px",
                color: "var(--muted-foreground, #6b7280)",
                margin: "8px 0 0",
                "--stagger": 1,
              } as React.CSSProperties
            }
          >
            design-system.css + animation-utilities.css | 16 keyframes | 18
            animation classes | 6 transition classes
          </p>
        </header>

        {/* Section 1: Basic Animations */}
        <section
          aria-labelledby="section-fade"
          style={{ marginBottom: "40px" }}
        >
          <h2
            id="section-fade"
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--foreground, #111)",
            }}
          >
            1. Fade & Scale
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <AnimCard
              title="fadeIn"
              className="animate-fadeIn"
            />
            <AnimCard
              title="fadeIn-fast"
              className="animate-fadeIn-fast"
            />
            <AnimCard
              title="fadeOut"
              className="animate-fadeOut"
            />
            <AnimCard
              title="scaleIn"
              className="animate-scaleIn"
            />
            <AnimCard
              title="scaleOut"
              className="animate-scaleOut"
            />
          </div>
        </section>

        {/* Section 2: Slide Animations */}
        <section
          aria-labelledby="section-slide"
          style={{ marginBottom: "40px" }}
        >
          <h2
            id="section-slide"
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--foreground, #111)",
            }}
          >
            2. Slide
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <AnimCard
              title="slideUp"
              className="animate-slideUp"
            />
            <AnimCard
              title="slideDown"
              className="animate-slideDown"
            />
            <AnimCard
              title="slideInLeft"
              className="animate-slideInLeft"
            />
            <AnimCard
              title="slideInRight"
              className="animate-slideInRight"
            />
            <AnimCard
              title="messageIn (composite)"
              className="animate-messageIn"
            />
          </div>
        </section>

        {/* Section 3: Continuous Animations */}
        <section
          aria-labelledby="section-continuous"
          style={{ marginBottom: "40px" }}
        >
          <h2
            id="section-continuous"
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--foreground, #111)",
            }}
          >
            3. Continuous Effects
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <AnimCard
              title="spin"
              className="animate-spin"
            />
            <AnimCard
              title="pulse"
              className="animate-pulse"
            />
            <AnimCard
              title="float"
              className="animate-float"
            />
            <AnimCard
              title="progress"
              className="animate-progress"
            >
              <div
                style={{
                  width: "160px",
                  height: "6px",
                  borderRadius: "3px",
                  background: "var(--muted, #e5e7eb)",
                  overflow: "hidden",
                }}
              >
                <div
                  className="animate-progress"
                  style={{
                    width: "40%",
                    height: "100%",
                    borderRadius: "3px",
                    background: "linear-gradient(90deg, #7c6bf0, #a78bfa)",
                  }}
                />
              </div>
            </AnimCard>
          </div>
        </section>

        {/* Section 4: Stagger */}
        <section
          aria-labelledby="section-stagger"
          style={{ marginBottom: "40px" }}
        >
          <h2
            id="section-stagger"
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--foreground, #111)",
            }}
          >
            4. Stagger Cascade
          </h2>
          <StaggerDemo />
        </section>

        {/* Section 5: Expand / Collapse */}
        <section
          aria-labelledby="section-expand"
          style={{ marginBottom: "40px" }}
        >
          <h2
            id="section-expand"
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--foreground, #111)",
            }}
          >
            5. Expand / Collapse
          </h2>
          <ExpandCollapseDemo />
        </section>

        {/* Section 6: Special Effects */}
        <section
          aria-labelledby="section-effects"
          style={{ marginBottom: "40px" }}
        >
          <h2
            id="section-effects"
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--foreground, #111)",
            }}
          >
            6. Special Effects
          </h2>
          <GlowDemo />
        </section>

        {/* Section 7: Chat Simulation */}
        <section
          aria-labelledby="section-chat"
          style={{ marginBottom: "40px" }}
        >
          <h2
            id="section-chat"
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "16px",
              color: "var(--foreground, #111)",
            }}
          >
            7. Chat Message Animation
          </h2>
          <ChatDemo />
        </section>

        {/* Footer */}
        <footer
          style={{
            textAlign: "center",
            padding: "20px",
            color: "var(--muted-foreground, #9ca3af)",
            fontSize: "13px",
          }}
        >
          v5.27 Animation System | Phase 0 Week 2-3
        </footer>
      </div>
    </main>
  );
}
