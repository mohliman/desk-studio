import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDesk } from "../server/dist/index.mjs";
const databasePath = join(
  mkdtempSync(join(tmpdir(), "desk-browser-")),
  "app.sqlite",
);
const app = createDesk({ databasePath });
await new Promise((resolve) => app.server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${app.server.address().port}`;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.setDefaultTimeout(10000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const checks = [];
mkdirSync("verification/fullstack", { recursive: true });
try {
  await page.goto(origin);
  await page
    .getByRole("heading", { name: "Sign in to your account" })
    .waitFor();
  await page.screenshot({
    path: "verification/fullstack/sign-in-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Your name").fill("Browser Studio");
  await page.getByLabel("Email address").fill("browser@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser test password 123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Studio", { exact: true }).waitFor();
  checks.push("Registration loads private seeded workspace");
  await page
    .getByRole("link", { name: "Clients", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "New client", exact: true }).click();
  await page.getByLabel("Client / company name *").fill("Browser test client");
  await page
    .getByRole("button", { name: "Create client", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Browser test client", exact: true })
    .waitFor();
  checks.push("Client form persists a real backend record");
  await page.reload();
  await page
    .getByRole("heading", { name: "Browser test client", exact: true })
    .waitFor();
  checks.push("Record survives browser reload");
  await page
    .getByRole("link", { name: "Settings", exact: true })
    .first()
    .click();
  await page.getByLabel("Teammate's email").fill("teammate@example.test");
  await page
    .getByRole("button", { name: "Create invitation", exact: true })
    .click();
  await page.locator(".invitation-result code").waitFor();
  assert.equal(
    (await page.locator(".invitation-result code").innerText()).length,
    48,
  );
  checks.push("Owner creates an email-bound invitation");
  await page.getByRole("link", { name: "Tasks", exact: true }).first().click();
  const selector = page.getByLabel(/^Assignee for/).first();
  await selector.selectOption({ label: "Browser Studio" });
  await page.getByText("Task assignment updated", { exact: true }).waitFor();
  checks.push("Task assignment saves to the team workspace");
  await page
    .getByRole("link", { name: "Overview", exact: true })
    .first()
    .click();
  await page.screenshot({
    path: "verification/fullstack/overview-desktop.png",
    fullPage: true,
  });
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    axe.violations.map((v) => v.id),
    [],
  );
  checks.push("Desktop overview accessibility scan");
  for (const route of [
    "/",
    "/projects",
    "/tasks",
    "/clients",
    "/invoices",
    "/settings",
  ]) {
    await page.goto(origin + route);
    await page.getByLabel("Studio", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(overflow, false, `overflow on ${route}`);
  }
  checks.push("Six routes fit mobile width");
  await page.goto(origin + "/");
  await page.getByLabel("Studio", { exact: true }).waitFor();
  await page.screenshot({
    path: "verification/fullstack/overview-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page
    .getByRole("heading", { name: "Sign in to your account" })
    .waitFor();
  await page.getByLabel("Email address").fill("browser@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("browser test password 123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Studio", { exact: true }).waitFor();
  checks.push("Sign out and sign in restore account records");
  assert.deepEqual(errors, []);
  writeFileSync(
    "verification/fullstack/results.json",
    JSON.stringify({ checks, errors, violations: axe.violations }, null, 2),
  );
  console.log(JSON.stringify({ passed: checks.length, checks }));
} catch (e) {
  await page.screenshot({
    path: "verification/fullstack/failure.png",
    fullPage: true,
  });
  console.error(await page.locator("body").innerText());
  throw e;
} finally {
  await browser.close();
  await app.close();
}
