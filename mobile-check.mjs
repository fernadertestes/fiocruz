import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
  deviceScaleFactor: 3,
});
const page = await context.newPage();
const consoleMsgs = [];
page.on("console", (msg) => consoleMsgs.push(`${msg.type()}: ${msg.text()}`));
page.on("pageerror", (err) => consoleMsgs.push(`pageerror: ${err.message}`));

await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.screenshot({ path: "/tmp/mobile-1-top.png" });

// scroll to map
await page.locator("#mapa").scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/mobile-2-map.png" });

// open mobile menu
await page.getByRole("button", { name: /Abrir menu/i }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/mobile-3-menu.png" });
await page.getByRole("button", { name: /Fechar menu/i }).click();
await page.waitForTimeout(400);

// tap a map point (first one)
const point = page.locator(".map-point").first();
await point.tap();
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/mobile-4-popover.png" });

// tap outside popover area (but inside map-frame) to see if it dismisses / gets stuck
await page.locator(".map-badge").tap({ force: true }).catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/mobile-5-afteroutside.png" });

// tap a second point without closing
const point2 = page.locator(".map-point").nth(2);
await point2.tap({ force: true }).catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: "/tmp/mobile-6-secondpoint.png" });

console.log("CONSOLE:", JSON.stringify(consoleMsgs, null, 2));

await browser.close();
