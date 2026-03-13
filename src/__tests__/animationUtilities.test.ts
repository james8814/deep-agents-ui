/**
 * animation-utilities.css 验证测试
 *
 * 验证所有关键帧、工具类和级联变量是否正确定义。
 * 使用 CSS 文件内容静态分析（不依赖浏览器渲染）。
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const CSS_PATH = path.resolve(ROOT, 'src/styles/animation-utilities.css');
const DESIGN_SYSTEM_PATH = path.resolve(ROOT, 'src/styles/design-system.css');
const GLOBALS_PATH = path.resolve(ROOT, 'src/app/globals.css');

let cssContent: string;
let designSystemContent: string;
let globalsContent: string;

beforeAll(() => {
  cssContent = fs.readFileSync(CSS_PATH, 'utf-8');
  designSystemContent = fs.readFileSync(DESIGN_SYSTEM_PATH, 'utf-8');
  globalsContent = fs.readFileSync(GLOBALS_PATH, 'utf-8');
});

describe('animation-utilities.css 文件验证', () => {
  // ============================================================
  // 1. 文件存在性
  // ============================================================
  it('animation-utilities.css 文件应存在', () => {
    expect(fs.existsSync(CSS_PATH)).toBe(true);
  });

  it('design-system.css 文件应存在', () => {
    expect(fs.existsSync(DESIGN_SYSTEM_PATH)).toBe(true);
  });
});

describe('globals.css 导入验证', () => {
  it('应导入 design-system.css', () => {
    expect(globalsContent).toContain("@import '../styles/design-system.css'");
  });

  it('应导入 animation-utilities.css', () => {
    expect(globalsContent).toContain("@import '../styles/animation-utilities.css'");
  });

  it('导入顺序应正确 (design-system 在 animation-utilities 之前)', () => {
    const designIdx = globalsContent.indexOf("design-system.css");
    const animIdx = globalsContent.indexOf("animation-utilities.css");
    expect(designIdx).toBeLessThan(animIdx);
  });

  it('CSS 导入应在 @tailwind 之前', () => {
    const animIdx = globalsContent.indexOf("animation-utilities.css");
    const tailwindIdx = globalsContent.indexOf("@tailwind base");
    expect(animIdx).toBeLessThan(tailwindIdx);
  });
});

describe('@keyframes 定义验证', () => {
  const requiredKeyframes = [
    'fadeIn',
    'fadeOut',
    'slideUp',
    'slideDown',
    'slideInLeft',
    'slideInRight',
    'scaleIn',
    'scaleOut',
    'expandHeight',
    'collapseHeight',
    'spin',
    'pulse',
    'float',
    'shimmer',
    'glowBorder',
    'progressIndeterminate',
  ];

  requiredKeyframes.forEach((name) => {
    it(`应定义 @keyframes ${name}`, () => {
      const regex = new RegExp(`@keyframes\\s+${name}\\s*\\{`);
      expect(cssContent).toMatch(regex);
    });
  });

  it(`应定义至少 16 个 @keyframes`, () => {
    const matches = cssContent.match(/@keyframes\s+\w+\s*\{/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(16);
  });
});

describe('动画工具类验证', () => {
  const requiredClasses = [
    'animate-fadeIn',
    'animate-fadeOut',
    'animate-fadeIn-fast',
    'animate-slideUp',
    'animate-slideDown',
    'animate-slideInLeft',
    'animate-slideInRight',
    'animate-messageIn',
    'animate-scaleIn',
    'animate-scaleOut',
    'animate-expand',
    'animate-collapse',
    'animate-spin',
    'animate-pulse',
    'animate-float',
    'animate-shimmer',
    'animate-glowBorder',
    'animate-progress',
  ];

  requiredClasses.forEach((className) => {
    it(`应定义 .${className} 类`, () => {
      expect(cssContent).toContain(`.${className}`);
    });
  });

  it(`应定义至少 18 个动画工具类`, () => {
    const matches = cssContent.match(/\.animate-[\w-]+\s*\{/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(18);
  });
});

describe('过渡工具类验证', () => {
  const requiredTransitions = [
    'transition-colors',
    'transition-opacity',
    'transition-transform',
    'transition-shadow',
    'transition-all-fast',
    'transition-all-normal',
  ];

  requiredTransitions.forEach((className) => {
    it(`应定义 .${className} 类`, () => {
      expect(cssContent).toContain(`.${className}`);
    });
  });
});

describe('CSS 变量引用验证', () => {
  it('所有动画类应使用 --dur-* 变量而非硬编码时长', () => {
    // 所有 animate-* 类都应引用 --dur-* 变量（包括连续动效）
    const classBlocks = cssContent.match(/\.animate-[\w-]+\s*\{[^}]+\}/g) || [];
    classBlocks.forEach((block) => {
      expect(block).toMatch(/var\(--dur-/);
    });
  });

  it('动画类应使用 --ease-* 变量而非硬编码缓动', () => {
    const classBlocks = cssContent.match(/\.animate-[\w-]+\s*\{[^}]+\}/g) || [];
    classBlocks.forEach((block) => {
      expect(block).toMatch(/var\(--ease-/);
    });
  });

  it('过渡类应使用 --dur-* 变量', () => {
    const transitionBlocks = cssContent.match(/\.transition-[\w-]+\s*\{[^}]+\}/g) || [];
    transitionBlocks.forEach((block) => {
      expect(block).toMatch(/var\(--dur-/);
    });
  });
});

describe('级联延迟变量验证', () => {
  it('design-system.css 应定义 --stagger-item 变量', () => {
    expect(designSystemContent).toContain('--stagger-item');
  });

  it('design-system.css 应定义 --stagger-sm 变量', () => {
    expect(designSystemContent).toContain('--stagger-sm');
  });

  it('design-system.css 应定义 --stagger-lg 变量', () => {
    expect(designSystemContent).toContain('--stagger-lg');
  });

  it('--stagger-item 应为 50ms', () => {
    expect(designSystemContent).toMatch(/--stagger-item:\s*50ms/);
  });

  it('--stagger-sm 应为 30ms', () => {
    expect(designSystemContent).toMatch(/--stagger-sm:\s*30ms/);
  });

  it('--stagger-lg 应为 80ms', () => {
    expect(designSystemContent).toMatch(/--stagger-lg:\s*80ms/);
  });

  it('动画类应支持 --stagger 变量实现级联延迟', () => {
    // 至少部分动画类使用 calc(var(--stagger, 0) * var(--stagger-item))
    expect(cssContent).toContain('calc(var(--stagger, 0) * var(--stagger-item))');
  });
});

describe('prefers-reduced-motion 无障碍验证', () => {
  it('应包含 @media (prefers-reduced-motion: reduce) 规则', () => {
    expect(cssContent).toContain('prefers-reduced-motion: reduce');
  });

  it('应将动画时长设为近零', () => {
    expect(cssContent).toContain('animation-duration: 0.01ms');
  });

  it('应将过渡时长设为近零', () => {
    expect(cssContent).toContain('transition-duration: 0.01ms');
  });

  it('应限制动画迭代次数为 1', () => {
    expect(cssContent).toContain('animation-iteration-count: 1');
  });

  it('应禁用平滑滚动', () => {
    expect(cssContent).toContain('scroll-behavior: auto');
  });
});

describe('移动设备适配验证', () => {
  it('应包含移动端媒体查询 (@media max-width: 768px)', () => {
    expect(cssContent).toContain('max-width: 768px');
  });

  it('移动端应延长 --dur-fast', () => {
    // 检查移动端媒体查询内是否重新定义了时长变量
    const mobileSection = cssContent.slice(cssContent.indexOf('max-width: 768px'));
    expect(mobileSection).toContain('--dur-fast');
  });

  it('移动端应延长 --dur-normal', () => {
    const mobileSection = cssContent.slice(cssContent.indexOf('max-width: 768px'));
    expect(mobileSection).toContain('--dur-normal');
  });

  it('移动端应增加 --stagger-item', () => {
    const mobileSection = cssContent.slice(cssContent.indexOf('max-width: 768px'));
    expect(mobileSection).toContain('--stagger-item');
  });
});

describe('design-system.css 动画变量验证', () => {
  const requiredDurVars = [
    '--dur-instant',
    '--dur-fast',
    '--dur-normal',
    '--dur-slow',
    '--dur-slowest',
  ];

  requiredDurVars.forEach((v) => {
    it(`应定义 ${v}`, () => {
      expect(designSystemContent).toContain(v);
    });
  });

  const requiredContinuousDurVars = [
    '--dur-spin',
    '--dur-pulse',
    '--dur-float',
    '--dur-shimmer',
    '--dur-progress',
  ];

  requiredContinuousDurVars.forEach((v) => {
    it(`应定义连续动效变量 ${v}`, () => {
      expect(designSystemContent).toContain(v);
    });
  });

  const requiredEaseVars = [
    '--ease-linear',
    '--ease-in',
    '--ease-out',
    '--ease-in-out',
    '--ease-elastic',
  ];

  requiredEaseVars.forEach((v) => {
    it(`应定义 ${v}`, () => {
      expect(designSystemContent).toContain(v);
    });
  });

  it('应定义品牌 glow 变量', () => {
    expect(designSystemContent).toContain('--brand-glow');
    expect(designSystemContent).toContain('--brand-glow-subtle');
  });
});

describe('CSS 语法基础验证', () => {
  it('左右大括号数量应匹配', () => {
    const openBraces = (cssContent.match(/\{/g) || []).length;
    const closeBraces = (cssContent.match(/\}/g) || []).length;
    expect(openBraces).toBe(closeBraces);
  });

  it('不应包含未闭合的注释', () => {
    const openComments = (cssContent.match(/\/\*/g) || []).length;
    const closeComments = (cssContent.match(/\*\//g) || []).length;
    expect(openComments).toBe(closeComments);
  });

  it('不应包含空的类定义', () => {
    // 匹配 .classname { } (只有空白的定义)
    const emptyClasses = cssContent.match(/\.[a-zA-Z][\w-]*\s*\{\s*\}/g) || [];
    expect(emptyClasses.length).toBe(0);
  });
});
