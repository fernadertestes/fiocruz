import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});
const page = await context.newPage();
const logs = [];
page.on("console", (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on("pageerror", (err) => logs.push(`[pageerror] ${err.message}`));

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({ path: "/tmp/m1-top.png" });

await page.evaluate(() => window.scrollTo(0, 400));
await page.waitForTimeout(300);
await page.screenshot({ path: "/tmp/m2-map.png" });

const menuBtn = page.locator("[aria-label*='enu'], button:has-text('Menu')").first();
if (await menuBtn.count()) {
  await menuBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/tmp/m3-menu.png" });
  await menuBtn.click({ force: true }).catch(() => {});
}

const point = page.locator(".map-point").first();
if (await point.count()) {
  await point.tap();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "/tmp/m4-popover.png" });
}

console.log("LOGS:\n" + logs.join("\n"));
await browser.close();
