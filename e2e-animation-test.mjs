/**
 * v5.27 动画系统前端 UI E2E 测试
 *
 * 使用 Playwright 在真实浏览器中验证:
 * 1. CSS 文件加载和解析
 * 2. CSS 变量正确注入
 * 3. 动画关键帧定义存在
 * 4. 动画工具类可用
 * 5. prefers-reduced-motion 行为
 * 6. 页面无 JS 错误
 * 7. 组件渲染正常
 */

import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const results = [];
let browser, page;

function log(status, name, detail = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  results.push({ status, name, detail });
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function setup() {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  page = await context.newPage();

  // 收集 JS 错误
  page.on('pageerror', (err) => {
    log('FAIL', 'JS Error', err.message);
  });
}

async function teardown() {
  await browser?.close();
}

// ============================================================
// 测试 1: 页面加载
// ============================================================
async function testPageLoad() {
  const response = await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  if (response?.ok()) {
    log('PASS', '页面加载', `HTTP ${response.status()}`);
  } else {
    log('FAIL', '页面加载', `HTTP ${response?.status()}`);
  }
}

// ============================================================
// 测试 2: CSS 文件加载
// ============================================================
async function testCSSLoaded() {
  // 检查 design-system.css 变量是否注入到 :root
  const bgVar = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  );
  if (bgVar) {
    log('PASS', 'design-system.css 已加载', `--bg = "${bgVar}"`);
  } else {
    log('FAIL', 'design-system.css 未加载', '--bg 为空');
  }
}

// ============================================================
// 测试 3: 动画时长变量
// ============================================================
async function testDurationVariables() {
  const vars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      durFast: style.getPropertyValue('--dur-fast').trim(),
      durNormal: style.getPropertyValue('--dur-normal').trim(),
      durSlow: style.getPropertyValue('--dur-slow').trim(),
      durSlowest: style.getPropertyValue('--dur-slowest').trim(),
      durSpin: style.getPropertyValue('--dur-spin').trim(),
      durPulse: style.getPropertyValue('--dur-pulse').trim(),
      durFloat: style.getPropertyValue('--dur-float').trim(),
      durShimmer: style.getPropertyValue('--dur-shimmer').trim(),
      durProgress: style.getPropertyValue('--dur-progress').trim(),
    };
  });

  // 浏览器 getComputedStyle 会将 ms 标准化为 s (如 150ms → .15s)
  const expected = {
    durFast: 150, durNormal: 250, durSlow: 400, durSlowest: 600,
    durSpin: 800, durPulse: 2000, durFloat: 3000, durShimmer: 2000, durProgress: 1500,
  };

  let allPass = true;
  for (const [key, expectedMs] of Object.entries(expected)) {
    const actual = vars[key];
    const actualMs = actual.endsWith('ms') ? parseFloat(actual) : parseFloat(actual) * 1000;
    const varName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    if (Math.abs(actualMs - expectedMs) < 1) {
      log('PASS', `CSS 变量 ${varName}`, `= "${actual}" (${expectedMs}ms)`);
    } else {
      log('FAIL', `CSS 变量 ${varName}`, `期望 ${expectedMs}ms, 实际 "${actual}"`);
      allPass = false;
    }
  }
  return allPass;
}

// ============================================================
// 测试 4: 缓动变量
// ============================================================
async function testEasingVariables() {
  const vars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      easeLinear: style.getPropertyValue('--ease-linear').trim(),
      easeIn: style.getPropertyValue('--ease-in').trim(),
      easeOut: style.getPropertyValue('--ease-out').trim(),
      easeInOut: style.getPropertyValue('--ease-in-out').trim(),
      easeElastic: style.getPropertyValue('--ease-elastic').trim(),
    };
  });

  for (const [key, val] of Object.entries(vars)) {
    if (val) {
      log('PASS', `缓动变量 --${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, `= "${val}"`);
    } else {
      log('FAIL', `缓动变量 --${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, '未定义');
    }
  }
}

// ============================================================
// 测试 5: Stagger 变量
// ============================================================
async function testStaggerVariables() {
  const vars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      staggerItem: style.getPropertyValue('--stagger-item').trim(),
      staggerSm: style.getPropertyValue('--stagger-sm').trim(),
      staggerLg: style.getPropertyValue('--stagger-lg').trim(),
    };
  });

  const expected = { staggerItem: '50ms', staggerSm: '30ms', staggerLg: '80ms' };
  for (const [key, expectedVal] of Object.entries(expected)) {
    const actual = vars[key];
    if (actual === expectedVal) {
      log('PASS', `Stagger 变量 --${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, `= "${actual}"`);
    } else {
      log('FAIL', `Stagger 变量 --${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, `期望 "${expectedVal}", 实际 "${actual}"`);
    }
  }
}

// ============================================================
// 测试 6: 品牌 Glow 变量
// ============================================================
async function testBrandGlowVariables() {
  const vars = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      brandGlow: style.getPropertyValue('--brand-glow').trim(),
      brandGlowSubtle: style.getPropertyValue('--brand-glow-subtle').trim(),
    };
  });

  // 浏览器可能将 rgba() 标准化为 hex (#7c6bf066)
  if (vars.brandGlow && (vars.brandGlow.includes('124') || vars.brandGlow.includes('7c6bf0'))) {
    log('PASS', '--brand-glow 已定义', `= "${vars.brandGlow}"`);
  } else {
    log('FAIL', '--brand-glow 未定义或值不正确', `= "${vars.brandGlow}"`);
  }

  if (vars.brandGlowSubtle && (vars.brandGlowSubtle.includes('124') || vars.brandGlowSubtle.includes('7c6bf0'))) {
    log('PASS', '--brand-glow-subtle 已定义', `= "${vars.brandGlowSubtle}"`);
  } else {
    log('FAIL', '--brand-glow-subtle 未定义或值不正确', `= "${vars.brandGlowSubtle}"`);
  }
}

// ============================================================
// 测试 7: @keyframes 存在性 (通过 CSSOM)
// ============================================================
async function testKeyframesExist() {
  const keyframeNames = await page.evaluate(() => {
    const names = new Set();
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSKeyframesRule) {
            names.add(rule.name);
          }
        }
      } catch (e) {
        // 跨域样式表无法访问
      }
    }
    return [...names];
  });

  const required = [
    'fadeIn', 'fadeOut', 'slideUp', 'slideDown', 'slideInLeft', 'slideInRight',
    'scaleIn', 'scaleOut', 'expandHeight', 'collapseHeight',
    'spin', 'pulse', 'float', 'shimmer', 'glowBorder', 'progressIndeterminate',
  ];

  for (const name of required) {
    if (keyframeNames.includes(name)) {
      log('PASS', `@keyframes ${name} 存在`);
    } else {
      log('FAIL', `@keyframes ${name} 缺失`);
    }
  }
}

// ============================================================
// 测试 8: 动画工具类可用 (通过 CSSOM)
// ============================================================
async function testAnimationClasses() {
  const classNames = await page.evaluate(() => {
    const classes = new Set();
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSStyleRule && rule.selectorText?.startsWith('.animate-')) {
            classes.add(rule.selectorText);
          }
        }
      } catch (e) { /* 跨域 */ }
    }
    return [...classes];
  });

  const required = [
    '.animate-fadeIn', '.animate-fadeOut', '.animate-fadeIn-fast',
    '.animate-slideUp', '.animate-slideDown', '.animate-slideInLeft', '.animate-slideInRight',
    '.animate-messageIn', '.animate-scaleIn', '.animate-scaleOut',
    '.animate-expand', '.animate-collapse',
    '.animate-spin', '.animate-pulse', '.animate-float', '.animate-shimmer',
    '.animate-glowBorder', '.animate-progress',
  ];

  for (const cls of required) {
    if (classNames.includes(cls)) {
      log('PASS', `CSS 类 ${cls} 可用`);
    } else {
      log('FAIL', `CSS 类 ${cls} 缺失`);
    }
  }
}

// ============================================================
// 测试 9: 动画类实际应用效果
// ============================================================
async function testAnimationApply() {
  // 创建一个测试元素并应用动画类
  const result = await page.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'animate-fadeIn';
    el.textContent = 'test';
    document.body.appendChild(el);

    const computed = getComputedStyle(el);
    const animName = computed.animationName;
    const animDuration = computed.animationDuration;
    const animFillMode = computed.animationFillMode;

    document.body.removeChild(el);
    return { animName, animDuration, animFillMode };
  });

  if (result.animName === 'fadeIn') {
    log('PASS', '.animate-fadeIn 应用效果', `name="${result.animName}", duration="${result.animDuration}", fill="${result.animFillMode}"`);
  } else {
    log('FAIL', '.animate-fadeIn 应用效果', `name="${result.animName}" (期望 "fadeIn")`);
  }
}

// ============================================================
// 测试 10: 过渡工具类
// ============================================================
async function testTransitionClasses() {
  const classNames = await page.evaluate(() => {
    const classes = new Set();
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSStyleRule && rule.selectorText?.startsWith('.transition-')) {
            classes.add(rule.selectorText);
          }
        }
      } catch (e) { /* 跨域 */ }
    }
    return [...classes];
  });

  const required = [
    '.transition-colors', '.transition-opacity', '.transition-transform',
    '.transition-shadow', '.transition-all-fast', '.transition-all-normal',
  ];

  for (const cls of required) {
    if (classNames.includes(cls)) {
      log('PASS', `过渡类 ${cls} 可用`);
    } else {
      log('FAIL', `过渡类 ${cls} 缺失`);
    }
  }
}

// ============================================================
// 测试 11: prefers-reduced-motion
// ============================================================
async function testReducedMotion() {
  // 创建新的 context，模拟 prefers-reduced-motion
  const rmContext = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1280, height: 800 },
  });
  const rmPage = await rmContext.newPage();
  await rmPage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  const result = await rmPage.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'animate-fadeIn';
    document.body.appendChild(el);
    const computed = getComputedStyle(el);
    const dur = computed.animationDuration;
    const iterCount = computed.animationIterationCount;
    document.body.removeChild(el);
    return { dur, iterCount };
  });

  await rmContext.close();

  // prefers-reduced-motion: reduce 应将 duration 设为接近 0
  const durMs = parseFloat(result.dur);
  if (durMs < 0.1) {
    log('PASS', 'prefers-reduced-motion 生效', `duration="${result.dur}", iterations="${result.iterCount}"`);
  } else {
    log('FAIL', 'prefers-reduced-motion 未生效', `duration="${result.dur}" (期望接近 0)`);
  }
}

// ============================================================
// 测试 12: 移动端视口变量覆盖
// ============================================================
async function testMobileViewport() {
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone X
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });

  const vars = await mobilePage.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      durFast: style.getPropertyValue('--dur-fast').trim(),
      durNormal: style.getPropertyValue('--dur-normal').trim(),
      durSlow: style.getPropertyValue('--dur-slow').trim(),
      durSlowest: style.getPropertyValue('--dur-slowest').trim(),
      staggerItem: style.getPropertyValue('--stagger-item').trim(),
    };
  });

  await mobileContext.close();

  // 移动端应使用延长的时长 (浏览器可能将 ms 标准化为 s)
  const checks = {
    durFast: 180, durNormal: 300, durSlow: 500,
    durSlowest: 750, staggerItem: 60,
  };

  for (const [key, expectedMs] of Object.entries(checks)) {
    const actual = vars[key];
    const actualMs = actual.endsWith('ms') ? parseFloat(actual) : parseFloat(actual) * 1000;
    const varName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    if (Math.abs(actualMs - expectedMs) < 1) {
      log('PASS', `移动端 ${varName}`, `= "${actual}" (${expectedMs}ms)`);
    } else {
      log('FAIL', `移动端 ${varName}`, `期望 ${expectedMs}ms, 实际 "${actual}"`);
    }
  }
}

// ============================================================
// 测试 13: expandHeight 使用 scaleY (非 max-height)
// ============================================================
async function testExpandHeightGPU() {
  const result = await page.evaluate(() => {
    // 查找 expandHeight keyframe 的 CSS 规则
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSKeyframesRule && rule.name === 'expandHeight') {
            const frames = [];
            for (const keyframe of rule.cssRules) {
              frames.push({
                key: keyframe.keyText,
                transform: keyframe.style.transform,
                maxHeight: keyframe.style.maxHeight,
              });
            }
            return frames;
          }
        }
      } catch (e) { /* 跨域 */ }
    }
    return null;
  });

  if (!result) {
    log('FAIL', 'expandHeight @keyframes 未找到');
    return;
  }

  const hasScaleY = result.some(f => f.transform && f.transform.includes('scaleY'));
  const hasMaxHeight = result.some(f => f.maxHeight && f.maxHeight !== '');

  if (hasScaleY && !hasMaxHeight) {
    log('PASS', 'expandHeight 使用 scaleY (GPU 加速)', JSON.stringify(result));
  } else if (hasMaxHeight) {
    log('FAIL', 'expandHeight 仍使用 max-height (非 GPU)', JSON.stringify(result));
  } else {
    log('WARN', 'expandHeight 关键帧内容', JSON.stringify(result));
  }
}

// ============================================================
// 测试 14: 页面截图
// ============================================================
async function testScreenshot() {
  const screenshotPath = '/tmp/animation-ui-test-screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  log('PASS', '页面截图已保存', screenshotPath);
}

// ============================================================
// 测试 15: 无 console.error
// ============================================================
async function testNoConsoleErrors() {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // 重新加载页面来收集错误
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  if (errors.length === 0) {
    log('PASS', '无 console.error 输出');
  } else {
    log('WARN', `${errors.length} 个 console.error`, errors.slice(0, 3).join(' | '));
  }
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  v5.27 动画系统 — 前端 UI E2E 测试');
  console.log('  Playwright + Chromium (headless)');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    await setup();
    await testPageLoad();
    await testCSSLoaded();
    await testDurationVariables();
    await testEasingVariables();
    await testStaggerVariables();
    await testBrandGlowVariables();
    await testKeyframesExist();
    await testAnimationClasses();
    await testAnimationApply();
    await testTransitionClasses();
    await testReducedMotion();
    await testMobileViewport();
    await testExpandHeightGPU();
    await testScreenshot();
    await testNoConsoleErrors();
  } catch (err) {
    log('FAIL', '测试执行异常', err.message);
  } finally {
    await teardown();
  }

  // 汇总
  console.log('\n═══════════════════════════════════════════════════');
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  console.log(`  结果: ${pass} 通过 / ${fail} 失败 / ${warn} 警告`);
  console.log('═══════════════════════════════════════════════════');

  if (fail > 0) {
    console.log('\n❌ 失败项:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.name}: ${r.detail}`);
    });
  }

  process.exit(fail > 0 ? 1 : 0);
}

main();
