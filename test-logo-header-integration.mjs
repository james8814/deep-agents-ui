/**
 * Logo Header 集成测试
 * 验证 AzuneLogo 在 Header 中的显示
 */

import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = "http://localhost:3000";
const results = [];
let passCount = 0;
let failCount = 0;

function report(name, pass, detail = "") {
  const status = pass ? "✅ PASS" : "❌ FAIL";
  results.push({ name, status, detail });
  if (pass) passCount++;
  else failCount++;
  console.log(`  ${status} ${name}${detail ? " — " + detail : ""}`);
}

(async () => {
  console.log("\n" + "=".repeat(70));
  console.log(" Logo Header 集成测试");
  console.log("=".repeat(70));

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // ========================================================================
  // 测试 1: Dark Mode 下 Logo 显示
  // ========================================================================
  console.log("\n▶ 测试组 1: Dark Mode Logo 显示");

  const darkContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "dark",
    locale: "zh-CN",
  });

  await darkContext.addInitScript(() => {
    localStorage.setItem(
      "deep-agent-config-v2",
      JSON.stringify({
        deploymentUrl: "http://localhost:2024",
        assistantId: "pmagent",
      })
    );
  });

  const darkPage = await darkContext.newPage();

  try {
    await darkPage.goto(BASE_URL, { waitUntil: "networkidle", timeout: 30000 });
    await darkPage.waitForTimeout(2000);

    // 截图记录
    await darkPage.screenshot({
      path: "test-logo-header-dark.png",
      fullPage: false,
    });
    console.log("  📸 Dark mode 截图: test-logo-header-dark.png");

    // 验证 Logo 元素存在
    const logoExists =
      (await darkPage
        .locator('div[role="img"][aria-label="Azune Logo"]')
        .count()) > 0;
    report("Dark mode Logo 元素存在", logoExists);

    // 验证 Logo 在 header 中
    const logoInHeader =
      (await darkPage
        .locator('header div[role="img"][aria-label="Azune Logo"]')
        .count()) > 0;
    report("Dark mode Logo 在 header 中", logoInHeader);

    // 验证 SVG 存在
    const svgExists = (await darkPage.locator("header svg").count()) > 0;
    report("Dark mode Logo SVG 存在", svgExists);
  } catch (err) {
    report("Dark mode 测试异常", false, err.message);
  }

  await darkContext.close();

  // ========================================================================
  // 测试 2: Light Mode 下 Logo 显示
  // ========================================================================
  console.log("\n▶ 测试组 2: Light Mode Logo 显示");

  const lightContext = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    colorScheme: "light",
    locale: "zh-CN",
  });

  await lightContext.addInitScript(() => {
    localStorage.setItem(
      "deep-agent-config-v2",
      JSON.stringify({
        deploymentUrl: "http://localhost:2024",
        assistantId: "pmagent",
      })
    );
  });

  const lightPage = await lightContext.newPage();

  try {
    await lightPage.goto(BASE_URL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await lightPage.waitForTimeout(2000);

    // 截图记录
    await lightPage.screenshot({
      path: "test-logo-header-light.png",
      fullPage: false,
    });
    console.log("  📸 Light mode 截图: test-logo-header-light.png");

    // 验证 Logo 元素存在
    const logoExists =
      (await lightPage
        .locator('div[role="img"][aria-label="Azune Logo"]')
        .count()) > 0;
    report("Light mode Logo 元素存在", logoExists);

    // 验证 Logo 在 header 中
    const logoInHeader =
      (await lightPage
        .locator('header div[role="img"][aria-label="Azune Logo"]')
        .count()) > 0;
    report("Light mode Logo 在 header 中", logoInHeader);
  } catch (err) {
    report("Light mode 测试异常", false, err.message);
  }

  await lightContext.close();

  // ========================================================================
  // 测试 3: Mobile 响应式
  // ========================================================================
  console.log("\n▶ 测试组 3: Mobile Logo 显示");

  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
    colorScheme: "dark",
    locale: "zh-CN",
  });

  await mobileContext.addInitScript(() => {
    localStorage.setItem(
      "deep-agent-config-v2",
      JSON.stringify({
        deploymentUrl: "http://localhost:2024",
        assistantId: "pmagent",
      })
    );
  });

  const mobilePage = await mobileContext.newPage();

  try {
    await mobilePage.goto(BASE_URL, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await mobilePage.waitForTimeout(2000);

    // 截图记录
    await mobilePage.screenshot({
      path: "test-logo-header-mobile.png",
      fullPage: false,
    });
    console.log("  📸 Mobile 截图: test-logo-header-mobile.png");

    // 验证 Logo 在 mobile 下存在
    const logoExists =
      (await mobilePage
        .locator('div[role="img"][aria-label="Azune Logo"]')
        .count()) > 0;
    report("Mobile Logo 元素存在", logoExists);
  } catch (err) {
    report("Mobile 测试异常", false, err.message);
  }

  await mobileContext.close();
  await browser.close();

  // ========================================================================
  // 结果汇总
  // ========================================================================
  console.log("\n" + "=".repeat(70));
  console.log(
    ` Logo Header 集成测试结果: ${passCount} PASS / ${failCount} FAIL / ${
      passCount + failCount
    } TOTAL`
  );
  console.log("=".repeat(70));

  if (failCount > 0) {
    console.log("\n❌ 失败项:");
    for (const r of results.filter((r) => r.status.includes("FAIL"))) {
      console.log(`  ${r.name}: ${r.detail}`);
    }
  }

  const passRate = Math.round((passCount / (passCount + failCount)) * 100);
  console.log(`\n📈 通过率: ${passRate}%`);

  if (passRate >= 95) {
    console.log("\n🎉 Logo Header 集成测试通过！");
  } else if (passRate >= 80) {
    console.log("\n⚠️  Logo Header 集成测试基本通过。");
  } else {
    console.log("\n❌ Logo Header 集成测试未通过。");
  }

  fs.writeFileSync(
    "test-logo-header-results.json",
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        passRate,
        passCount,
        failCount,
        results,
        screenshots: [
          "test-logo-header-dark.png",
          "test-logo-header-light.png",
          "test-logo-header-mobile.png",
        ],
      },
      null,
      2
    )
  );

  process.exit(failCount > 0 ? 1 : 0);
})();
