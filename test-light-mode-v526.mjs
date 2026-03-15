/**
 * Light Mode v5.26 设计原稿颜色验证
 * 验证修复后的 Light mode CSS 变量是否匹配 v5.26 设计原稿
 */

import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";

// v5.26 设计原稿 Light mode 颜色值
const V526_LIGHT_COLORS = {
  "--text-tertiary": "#555555",     // --t3 light
  "--text-disabled": "#757575",     // --t4 light
  "--color-primary": "#6558D3",     // --brand light
  "--color-primary-hover": "#7C6BF0", // --brand-l
  "--color-primary-active": "#4F3FB3", // --brand-d
};

async function hexToHSL(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function compareColors(actual, expected) {
  // 处理 HSL 格式 "249.5 55.8% 52%"
  if (actual.includes('%')) {
    const parts = actual.trim().split(/\s+/);
    if (parts.length === 3) {
      const h = parseFloat(parts[0]);
      const s = parseFloat(parts[1]);
      const l = parseFloat(parts[2]);
      const expectedHSL = hexToHSL(expected);

      // 允许 ±2% 误差
      const hMatch = Math.abs(h - expectedHSL.h) < 2 || Math.abs(h - expectedHSL.h) > 358;
      const sMatch = Math.abs(s - expectedHSL.s) < 3;
      const lMatch = Math.abs(l - expectedHSL.l) < 3;

      return {
        match: sMatch && lMatch,
        actual: `hsl(${h}, ${s}%, ${l}%)`,
        expected: expected,
        expectedHSL: `hsl(${expectedHSL.h}, ${expectedHSL.s}%, ${expectedHSL.l}%)`
      };
    }
  }

  // 处理 HEX 格式
  if (actual.startsWith('#') || /^[0-9a-f]{3,6}$/i.test(actual.trim())) {
    let actualHex = actual.startsWith('#') ? actual : `#${actual}`;

    // 展开 3 位 HEX 为 6 位 (#555 -> #555555)
    if (actualHex.length === 4) {
      actualHex = `#${actualHex[1]}${actualHex[1]}${actualHex[2]}${actualHex[2]}${actualHex[3]}${actualHex[3]}`;
    }

    const match = actualHex.toLowerCase() === expected.toLowerCase();
    return { match, actual: actualHex, expected };
  }

  // 处理 RGB 格式
  if (actual.includes('rgb')) {
    // 简化处理，直接比较
    return { match: false, actual, expected, note: 'RGB format not comparable' };
  }

  return { match: false, actual, expected };
}

(async () => {
  console.log("\n" + "=".repeat(70));
  console.log(" Light Mode v5.26 设计原稿颜色验证");
  console.log("=".repeat(70));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "light", // 强制 Light mode
    locale: "zh-CN"
  });

  // 预设配置
  await context.addInitScript(() => {
    localStorage.setItem("deep-agent-config", JSON.stringify({
      deploymentUrl: "http://localhost:2024",
      assistantId: "pmagent"
    }));
  });

  const page = await context.newPage();

  try {
    console.log("\n📡 加载页面 (Light Mode):", BASE_URL);
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(2000);

    // 验证 Light mode 类
    const htmlClass = await page.locator("html").getAttribute("class");
    console.log(`  HTML class: ${htmlClass}`);
    const isLight = htmlClass?.includes("light") || !htmlClass?.includes("dark");

    // 获取 CSS 变量
    const cssVars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        textTertiary: style.getPropertyValue("--text-tertiary")?.trim(),
        textDisabled: style.getPropertyValue("--text-disabled")?.trim(),
        colorPrimary: style.getPropertyValue("--color-primary")?.trim(),
        colorPrimaryHover: style.getPropertyValue("--color-primary-hover")?.trim(),
        colorPrimaryActive: style.getPropertyValue("--color-primary-active")?.trim(),
        primary: style.getPropertyValue("--primary")?.trim(),
        accent: style.getPropertyValue("--accent")?.trim(),
      };
    });

    console.log("\n📋 CSS 变量实际值:");
    console.log(`  --text-tertiary: ${cssVars.textTertiary}`);
    console.log(`  --text-disabled: ${cssVars.textDisabled}`);
    console.log(`  --color-primary: ${cssVars.colorPrimary}`);
    console.log(`  --color-primary-hover: ${cssVars.colorPrimaryHover}`);
    console.log(`  --color-primary-active: ${cssVars.colorPrimaryActive}`);
    console.log(`  --primary: ${cssVars.primary}`);
    console.log(`  --accent: ${cssVars.accent}`);

    // 对比验证
    console.log("\n🔍 与 v5.26 原稿对比:");

    let passCount = 0;
    let failCount = 0;
    const results = [];

    // 验证 --text-tertiary
    const t3Result = compareColors(cssVars.textTertiary, V526_LIGHT_COLORS["--text-tertiary"]);
    const t3Status = t3Result.match ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${t3Status} --text-tertiary: ${t3Result.actual} (expected: ${t3Result.expected})`);
    if (t3Result.match) passCount++; else failCount++;
    results.push({ var: "--text-tertiary", ...t3Result });

    // 验证 --text-disabled
    const t4Result = compareColors(cssVars.textDisabled, V526_LIGHT_COLORS["--text-disabled"]);
    const t4Status = t4Result.match ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${t4Status} --text-disabled: ${t4Result.actual} (expected: ${t4Result.expected})`);
    if (t4Result.match) passCount++; else failCount++;
    results.push({ var: "--text-disabled", ...t4Result });

    // 验证 --color-primary
    const brandResult = compareColors(cssVars.colorPrimary, V526_LIGHT_COLORS["--color-primary"]);
    const brandStatus = brandResult.match ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${brandStatus} --color-primary: ${brandResult.actual} (expected: ${brandResult.expected})`);
    if (brandResult.match) passCount++; else failCount++;
    results.push({ var: "--color-primary", ...brandResult });

    // 验证 --color-primary-hover
    const brandLResult = compareColors(cssVars.colorPrimaryHover, V526_LIGHT_COLORS["--color-primary-hover"]);
    const brandLStatus = brandLResult.match ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${brandLStatus} --color-primary-hover: ${brandLResult.actual} (expected: ${brandLResult.expected})`);
    if (brandLResult.match) passCount++; else failCount++;
    results.push({ var: "--color-primary-hover", ...brandLResult });

    // 验证 --color-primary-active
    const brandDResult = compareColors(cssVars.colorPrimaryActive, V526_LIGHT_COLORS["--color-primary-active"]);
    const brandDStatus = brandDResult.match ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${brandDStatus} --color-primary-active: ${brandDResult.actual} (expected: ${brandDResult.expected})`);
    if (brandDResult.match) passCount++; else failCount++;
    results.push({ var: "--color-primary-active", ...brandDResult });

    // 验证 --primary (HSL 格式)
    const primaryHSL = hexToHSL(V526_LIGHT_COLORS["--color-primary"]);
    const primaryResult = compareColors(cssVars.primary, V526_LIGHT_COLORS["--color-primary"]);
    const primaryStatus = primaryResult.match ? "✅ PASS" : "⚠️ INFO";
    console.log(`  ${primaryStatus} --primary: ${primaryResult.actual} (should match hsl(${primaryHSL.h}, ${primaryHSL.s}%, ${primaryHSL.l}%))`);

    // 验证 --accent (应该与 --primary 相同)
    const accentResult = compareColors(cssVars.accent, V526_LIGHT_COLORS["--color-primary"]);
    const accentStatus = accentResult.match ? "✅ PASS" : "⚠️ INFO";
    console.log(`  ${accentStatus} --accent: ${accentResult.actual} (should match --primary)`);

    // 结果汇总
    console.log("\n" + "=".repeat(70));
    console.log(` 测试结果: ${passCount}/${passCount + failCount} 核心颜色匹配 v5.26 原稿`);
    console.log("=".repeat(70));

    if (failCount === 0) {
      console.log("\n✅ Light Mode 颜色已完全对齐 v5.26 设计原稿！");
    } else {
      console.log("\n❌ 存在颜色偏差，需要进一步修复。");
    }

    // 截图
    await page.screenshot({ path: "test-light-mode-v526.png", fullPage: false });
    console.log("\n📸 截图已保存: test-light-mode-v526.png");

  } catch (err) {
    console.error("❌ 测试执行异常:", err.message);
  } finally {
    await browser.close();
  }
})();
