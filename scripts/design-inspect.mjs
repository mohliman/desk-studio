import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const stage = process.env.DESK_DESIGN_STAGE ?? "after";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const base = process.env.DESK_PREVIEW_URL ?? "http://127.0.0.1:5174";
await fs.mkdir(`verification/design-${stage}`, { recursive: true });
try {
  for (const [route, name] of [
    ["/", "overview"],
    ["/projects", "projects"],
    ["/projects/project-1", "project-detail"],
    ["/clients", "clients"],
    ["/clients/client-1", "client-detail"],
    ["/invoices", "invoices"],
    ["/invoices/invoice-1", "invoice"],
    ["/settings", "settings"],
  ]) {
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `verification/design-${stage}/${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.locator("h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `verification/design-${stage}/mobile-overview.png`,
    fullPage: true,
    animations: "disabled",
  });
  for (const [route, name] of [
    ["/clients", "clients"],
    ["/clients/client-1", "client-detail"],
    ["/projects/project-1", "project-detail"],
    ["/invoices/invoice-1", "invoice"],
    ["/settings", "settings"],
  ]) {
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `verification/design-${stage}/mobile-${name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  console.log(
    `Captured rendered ${stage} pages in verification/design-${stage}`,
  );
} finally {
  await browser.close();
}
