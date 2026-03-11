'use client';

/**
 * useAnimationOrchestra Hook 使用示例集合
 *
 * 本文件展示了 useAnimationOrchestra 在实际场景中的应用模式。
 * 这些示例来自 v5.26 UI 设计规范中的真实交互流程。
 */

import { useEffect, useRef } from 'react';
import { useAnimationOrchestra, type AnimationScene } from './useAnimationOrchestra';

/**
 * 示例 1: 消息出现动画（顺序执行）
 *
 * 场景描述：
 * - 用户提交消息后，该消息逐步出现在聊天列表中
 * - 首先消息向上滑入并淡入，然后自动滚动到底部
 * - 这是一个顺序流程：消息完全出现后才滚动
 *
 * 使用场景：MessageList 组件内的单条消息
 */
export function useMessageAnimation(messageElement: HTMLElement | null) {
  const messageScene: AnimationScene = {
    name: 'MessageAppears',
    concurrent: false,
    steps: [
      {
        name: 'MessageSlideUp',
        delay: 0,
        duration: 300,
        onStart: () => {
          if (!messageElement) return;
          messageElement.classList.add('animate-slideUp');
          messageElement.style.opacity = '0';
        },
        onEnd: () => {
          if (!messageElement) return;
          messageElement.style.opacity = '1';
          messageElement.classList.remove('animate-slideUp');
        },
      },
      {
        name: 'AutoScroll',
        delay: 50, // 消息滑入过程中开始滚动
        duration: 200,
        condition: () => {
          // 仅在用户未手动滚动时自动滚动
          return true; // 实际应检查 ChatInterface 的滚动位置
        },
        onStart: () => {
          // scrollToBottom() 的实际实现
          // 使用 smooth scroll 和设计系统的缓动函数
          console.log('Auto-scrolling to bottom...');
        },
      },
    ],
    onSceneEnd: () => {
      console.log('Message animation complete');
    },
  };

  const { isAnimating, play } = useAnimationOrchestra(messageScene);

  useEffect(() => {
    if (messageElement) {
      play();
    }
  }, [messageElement, play]);

  return { isAnimating };
}

/**
 * 示例 2: 工具调用级联动画（并发执行，带延迟）
 *
 * 场景描述：
 * - 当 AI 响应中包含多个工具调用时，每个工具调用依次出现
 * - 使用并发模式和延迟实现"级联"效果
 * - 每个工具调用相隔 50ms，创建视觉连贯的级联动画
 *
 * 使用场景：ToolCallBox 组件在消息中的排列
 */
export function useToolCallCascadeAnimation(toolCallElements: HTMLElement[]) {
  const steps = toolCallElements.map((element, index) => ({
    name: `ToolCall_${index}`,
    delay: index * 50, // 每个工具调用相隔 50ms
    duration: 200,
    onStart: () => {
      element.classList.add('animate-slideDown');
      element.style.opacity = '0';
    },
    onEnd: () => {
      element.style.opacity = '1';
      element.classList.remove('animate-slideDown');
    },
  }));

  const cascadeScene: AnimationScene = {
    name: 'ToolCallsCascade',
    concurrent: true, // 使用并发模式，延迟各自独立
    steps,
    onSceneStart: () => {
      console.log(`Starting cascade of ${toolCallElements.length} tool calls`);
    },
    onSceneEnd: () => {
      console.log('All tool calls animated');
    },
  };

  const { play, getTotalDuration } = useAnimationOrchestra(cascadeScene);

  useEffect(() => {
    if (toolCallElements.length > 0) {
      play();
    }
  }, [toolCallElements.length, play]);

  return {
    totalDuration: getTotalDuration(),
  };
}

/**
 * 示例 3: 输入框展开动画（进度监听）
 *
 * 场景描述：
 * - 用户开始输入时，InputArea 容器高度从 44px 增长到 120px
 * - 同时上传区域从隐藏滑出
 * - 使用 onProgress 监听每一帧的进度，实现平滑的高度变化
 *
 * 使用场景：InputArea 组件在获得焦点或接收输入时
 */
export function useInputExpandAnimation(containerElement: HTMLElement | null) {
  const initialHeight = 44; // px，来自设计系统
  const finalHeight = 120; // px，来自设计系统
  const uploadZoneHeight = 80; // px

  const expandScene: AnimationScene = {
    name: 'InputExpands',
    concurrent: true,
    steps: [
      {
        name: 'ContainerExpand',
        delay: 0,
        duration: 150, // --dur-normal 来自 design-system.css
        onStart: () => {
          if (!containerElement) return;
          containerElement.style.height = `${initialHeight}px`;
        },
        onProgress: (progress) => {
          if (!containerElement) return;
          const currentHeight = initialHeight + (finalHeight - initialHeight) * progress;
          containerElement.style.height = `${currentHeight}px`;
        },
        onEnd: () => {
          if (!containerElement) return;
          containerElement.style.height = `${finalHeight}px`;
        },
      },
      {
        name: 'UploadZoneSlideOut',
        delay: 50, // 稍晚于容器展开开始
        duration: 150,
        onStart: () => {
          const uploadZone = containerElement?.querySelector('.upload-zone');
          if (!uploadZone) return;
          uploadZone.classList.add('animate-slideDown');
        },
        onEnd: () => {
          const uploadZone = containerElement?.querySelector('.upload-zone');
          if (!uploadZone) return;
          uploadZone.classList.remove('animate-slideDown');
        },
      },
    ],
  };

  const { play } = useAnimationOrchestra(expandScene);

  return { play };
}

/**
 * 示例 4: 认可中断横幅动画（带条件和延迟链）
 *
 * 场景描述：
 * - HIL 中断时，横幅从顶部滑下来
 * - 如果用户在 5 秒内批准，横幅滑回
 * - 整个流程包括多个阶段，每个阶段有条件和延迟
 *
 * 使用场景：HumanInTheLoopBanner 组件
 */
export function useInterruptBannerAnimation(
  bannerElement: HTMLElement | null,
  isApproved: boolean,
  isRejected: boolean
) {
  const interruptScene: AnimationScene = {
    name: 'InterruptBannerFlow',
    concurrent: false,
    steps: [
      {
        name: 'BannerSlideDown',
        delay: 0,
        duration: 250, // --dur-normal
        onStart: () => {
          if (!bannerElement) return;
          bannerElement.classList.add('animate-slideDown');
          bannerElement.style.opacity = '0';
        },
        onEnd: () => {
          if (!bannerElement) return;
          bannerElement.style.opacity = '1';
        },
      },
      {
        name: 'BannerWaitForAction',
        delay: 0,
        duration: 5000, // 等待 5 秒用户响应
        condition: () => !isApproved && !isRejected,
        onStart: () => {
          console.log('Waiting for user action...');
        },
      },
      {
        name: 'BannerSlideUp',
        delay: 0,
        duration: 200,
        condition: () => isApproved,
        onStart: () => {
          if (!bannerElement) return;
          bannerElement.classList.add('animate-slideUp');
        },
        onEnd: () => {
          if (!bannerElement) return;
          bannerElement.style.opacity = '0';
          bannerElement.classList.remove('animate-slideUp', 'animate-slideDown');
        },
      },
    ],
  };

  const { play } = useAnimationOrchestra(interruptScene);

  useEffect(() => {
    if (bannerElement && !isApproved && !isRejected) {
      play();
    }
  }, [bannerElement, isApproved, isRejected, play]);

  return {};
}

/**
 * 示例 5: 主题切换全局动画（并发，多元素）
 *
 * 场景描述：
 * - 用户切换主题时，整个 UI 需要统一的过渡效果
 * - 背景、文字、边框同时变色，但有不同的持续时间
 * - 某些元素（如按钮）需要额外的缩放效果
 *
 * 使用场景：全局主题切换，影响整个应用
 */
export function useThemeSwitchAnimation(isDarkMode: boolean) {
  const themeScene: AnimationScene = {
    name: 'ThemeSwitch',
    concurrent: true,
    respectReducedMotion: true, // 尊重用户的减少运动偏好
    steps: [
      {
        name: 'BackgroundTransition',
        delay: 0,
        duration: 300,
        onStart: () => {
          const root = document.documentElement;
          root.classList.add('theme-transitioning');
          root.classList.toggle('dark', isDarkMode);
        },
        onEnd: () => {
          const root = document.documentElement;
          root.classList.remove('theme-transitioning');
        },
      },
      {
        name: 'TextColorTransition',
        delay: 50,
        duration: 250,
        onStart: () => {
          document.querySelectorAll('[data-theme-aware]').forEach((el) => {
            el.classList.add('color-transitioning');
          });
        },
        onEnd: () => {
          document.querySelectorAll('[data-theme-aware]').forEach((el) => {
            el.classList.remove('color-transitioning');
          });
        },
      },
      {
        name: 'InteractiveElementPulse',
        delay: 100,
        duration: 200,
        onStart: () => {
          document.querySelectorAll('button, [role="button"]').forEach((el) => {
            el.classList.add('animate-pulse');
          });
        },
        onEnd: () => {
          document.querySelectorAll('button, [role="button"]').forEach((el) => {
            el.classList.remove('animate-pulse');
          });
        },
      },
    ],
    onSceneStart: () => {
      console.log(`Switching to ${isDarkMode ? 'dark' : 'light'} theme`);
    },
    onSceneEnd: () => {
      console.log('Theme switch complete');
    },
  };

  const { play, isAnimating } = useAnimationOrchestra(themeScene);

  useEffect(() => {
    play();
  }, [isDarkMode, play]);

  return { isAnimating };
}

/**
 * 示例 6: 聊天界面加载动画序列（完整流程）
 *
 * 场景描述：
 * - 用户登录后，整个聊天界面需要出现
 * - 顺序：Sidebar 滑入 → ChatArea 淡入 → InputArea 启用
 * - 每个步骤之间有适当的延迟，创建优雅的进入效果
 *
 * 使用场景：Page.tsx 首次加载认证后的聊天界面
 */
export function useChatInterfaceLoadAnimation(
  sidebarElement: HTMLElement | null,
  chatAreaElement: HTMLElement | null,
  inputAreaElement: HTMLElement | null
) {
  const loadScene: AnimationScene = {
    name: 'ChatInterfaceLoad',
    concurrent: false, // 顺序执行
    steps: [
      {
        name: 'SidebarSlideIn',
        delay: 0,
        duration: 300,
        onStart: () => {
          if (sidebarElement) {
            sidebarElement.classList.add('animate-slideIn-left');
          }
        },
      },
      {
        name: 'ChatAreaFadeIn',
        delay: 150, // 与 Sidebar 动画重叠
        duration: 200,
        onStart: () => {
          if (chatAreaElement) {
            chatAreaElement.classList.add('animate-fadeIn');
          }
        },
      },
      {
        name: 'InputAreaEnable',
        delay: 100,
        duration: 200,
        onStart: () => {
          if (inputAreaElement) {
            inputAreaElement.classList.remove('opacity-50', 'pointer-events-none');
            inputAreaElement.classList.add('animate-fadeIn');
          }
        },
      },
    ],
    onSceneStart: () => {
      console.log('Chat interface is loading...');
    },
    onSceneEnd: () => {
      console.log('Chat interface fully loaded');
    },
  };

  const { play, getTotalDuration } = useAnimationOrchestra(loadScene);

  useEffect(() => {
    if (sidebarElement && chatAreaElement && inputAreaElement) {
      play();
    }
  }, [sidebarElement, chatAreaElement, inputAreaElement, play]);

  return {
    totalDuration: getTotalDuration(),
  };
}
