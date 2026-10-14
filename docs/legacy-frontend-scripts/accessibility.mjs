import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const reports = [];
const base = process.env.DESK_PREVIEW_URL ?? "http://127.0.0.1:5174";
try {
  for (const route of [
    "/",
    "/projects",
    "/projects/project-1",
    "/clients",
    "/clients/client-1",
    "/invoices",
    "/invoices/invoice-1",
    "/settings",
  ]) {
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    reports.push({ route, violations: results.violations });
    console.log(
      route,
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    );
  }
  await page.goto(base + "/projects");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  const dialog = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  reports.push({ route: "project dialog", violations: dialog.violations });
  console.log(
    "dialog",
    dialog.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "New project", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor();
  if (
    !(await page
      .getByLabel("Project name *")
      .evaluate((el) => el === document.activeElement))
  )
    throw Error("Initial dialog focus is incorrect");
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  if (
    !(await page
      .getByRole("dialog")
      .evaluate((el) => el.contains(document.activeElement)))
  )
    throw Error("Focus escaped dialog");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() =>
    document.activeElement?.textContent?.includes("New project"),
  );
  console.log(
    "PASS Dialog initial focus, focus trap, Escape and focus restoration",
  );
  for (const [route, button, submit] of [
    ["/clients", "New client", "Create client"],
    ["/projects/project-1", "Add task", "Add task"],
    ["/invoices", "New invoice", "Create invoice"],
  ]) {
    await page.goto(base + route);
    await page.getByRole("button", { name: button, exact: true }).click();
    await page.getByRole("dialog").waitFor();
    const clean = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    reports.push({ route: button + " dialog", violations: clean.violations });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: submit, exact: true })
      .click();
    const invalid = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    reports.push({
      route: button + " validation",
      violations: invalid.violations,
    });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  const mobile = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  reports.push({ route: "mobile overview", violations: mobile.violations });
  await fs.writeFile(
    "verification/accessibility.json",
    JSON.stringify(reports, null, 2),
  );
  const count = reports.reduce((s, r) => s + r.violations.length, 0);
  console.log("Accessibility violations:", count);
  if (count) process.exitCode = 1;
} finally {
  await browser.close();
}
