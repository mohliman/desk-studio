import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const base = process.env.DESK_PREVIEW_URL ?? "http://127.0.0.1:5174";
const checks = [];
const pass = (message) => {
  checks.push(message);
  console.log("PASS", message);
};
try {
  await page.goto(base);
  await page.locator("h1").waitFor();
  await page.evaluate(() => document.fonts.ready);
  assert(
    await page.evaluate(
      () =>
        document.fonts.check('400 16px "IBM Plex Sans"') &&
        document.fonts.check('450 24px "Newsreader Variable"') &&
        document.fonts.check('400 12px "IBM Plex Mono"'),
    ),
  );
  pass("The intended locally served typography is loaded");
  const focus = page.getByRole("button", {
    name: "Focus A new identity for Forma",
    exact: true,
  });
  await focus.click();
  const panel = page.getByRole("dialog");
  await panel.waitFor();
  await page.screenshot({
    path: "verification/design-after/focus-panel.png",
    animations: "disabled",
  });
  await panel
    .getByRole("button", {
      name: "Complete Build the color system",
      exact: true,
    })
    .click();
  await panel.getByText("2 of 4 complete", { exact: true }).waitFor();
  await panel
    .getByRole("button", { name: "Reopen Build the color system", exact: true })
    .waitFor();
  pass("Focus panel task completion updates progress immediately");
  assert(await panel.evaluate((el) => el.contains(document.activeElement)));
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  assert(await panel.evaluate((el) => el.contains(document.activeElement)));
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () =>
      document.activeElement?.getAttribute("aria-label") ===
      "Focus A new identity for Forma",
  );
  pass(
    "Focus panel traps keyboard focus, closes with Escape and restores its opener",
  );
  await page
    .locator(".register-row")
    .first()
    .getByText("2/4 complete", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .locator(".register-row")
    .first()
    .getByText("2/4 complete", { exact: true })
    .waitFor();
  pass("The ledger and reload reflect a task completed in the panel");
  await page
    .getByRole("button", {
      name: "Focus A new identity for Forma",
      exact: true,
    })
    .click();
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  await fs.writeFile(
    "verification/design-after/focus-accessibility.json",
    JSON.stringify(a11y.violations, null, 2),
  );
  assert.equal(a11y.violations.length, 0, JSON.stringify(a11y.violations));
  pass("Focus panel has zero automated accessibility violations");
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", {
      name: "Focus A new identity for Forma",
      exact: true,
    })
    .click();
  assert.equal(
    await page
      .locator(".focus-panel")
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await panel
    .getByRole("heading", { name: "A new identity for Forma", exact: true })
    .waitFor();
  pass("Reduced motion preserves the complete panel without animation");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  const positions = await page.evaluate(() => ({
    attention: document
      .querySelector(".ledger-attention")
      .getBoundingClientRect().top,
    work: document.querySelector(".ledger-work").getBoundingClientRect().top,
  }));
  assert(positions.attention < positions.work);
  await page
    .getByRole("button", {
      name: "Focus A new identity for Forma",
      exact: true,
    })
    .click();
  assert.equal(
    Math.round(
      await page
        .locator(".focus-panel")
        .evaluate((el) => el.getBoundingClientRect().width),
    ),
    390,
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "verification/design-after/mobile-focus.png",
    animations: "disabled",
  });
  pass("Mobile prioritises attention and uses a full-width working panel");
  await page.keyboard.press("Escape");
  for (const width of [320, 390, 768, 1100]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/clients",
      "/clients/client-1",
      "/projects",
      "/projects/project-1",
      "/invoices/invoice-1",
      "/settings",
    ]) {
      await page.goto(base + route);
      await page.locator("h1").waitFor();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow at ${width}: ${route}`,
      );
    }
  }
  pass(
    "Primary compositions have no page overflow at 320, 390, 768 and 1100 pixels",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/projects");
  await page
    .getByRole("button", { name: "Sort by budget", exact: true })
    .click();
  const firstProject = page.locator(".project-register-table tbody tr").first();
  await firstProject
    .getByRole("link", { name: "Issue 04 — In good company", exact: true })
    .waitFor();
  assert.equal(
    await page.locator('th[aria-sort="ascending"]').innerText(),
    "BUDGET",
  );
  await page
    .getByRole("button", { name: "Sort by budget", exact: true })
    .click();
  await firstProject
    .getByRole("link", { name: "A new identity for Forma", exact: true })
    .waitFor();
  await page.reload();
  await firstProject
    .getByRole("link", { name: "A new identity for Forma", exact: true })
    .waitFor();
  assert.equal(
    await page.locator('th[aria-sort="descending"]').innerText(),
    "BUDGET",
  );
  await page
    .getByRole("button", { name: "Sort by project name", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  assert.deepEqual(
    await page
      .locator(".project-register-table .table-title")
      .allTextContents(),
    [
      "A new identity for Forma",
      "Field notes",
      "Issue 04 — In good company",
      "Northline, online",
    ],
  );
  await page
    .getByRole("button", { name: "Sort by deadline", exact: true })
    .click();
  assert.equal(
    await page.locator('th[aria-sort="ascending"]').innerText(),
    "DEADLINE",
  );
  await page
    .getByLabel("Filter project status", { exact: true })
    .selectOption("On hold");
  assert.equal(
    await page.locator(".project-register-table tbody tr").count(),
    1,
  );
  await firstProject
    .getByRole("link", { name: "Issue 04 — In good company", exact: true })
    .waitFor();
  await page
    .getByLabel("Filter project status", { exact: true })
    .selectOption("All");
  pass(
    "Register sorting works with keyboard, direction, reload and status filtering",
  );
  await page
    .getByRole("button", {
      name: "Focus A new identity for Forma",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Complete Refine the wordmark", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText("3 of 4 complete", { exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  await firstProject.getByText("3 / 4", { exact: true }).waitFor();
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
    "Focus A new identity for Forma",
  );
  await page.reload();
  await firstProject.getByText("3 / 4", { exact: true }).waitFor();
  pass(
    "Register Focus updates its row, restores focus and persists task completion",
  );
  await page.goto(base + "/clients/client-1");
  await page
    .locator(".dossier-account-total")
    .getByText("$4,250.00", { exact: true })
    .waitFor();
  await page
    .locator(".dossier-project-facts")
    .getByText("3 / 4", { exact: true })
    .waitFor();
  await page.getByRole("link", { name: "DSK-001", exact: true }).click();
  await page.getByLabel("Local status", { exact: true }).selectOption("Paid");
  await page.goto(base + "/clients/client-1");
  await page
    .locator(".dossier-account-total")
    .getByText("$0.00", { exact: true })
    .waitFor();
  pass(
    "Client dossier derives progress and outstanding amounts from changed records",
  );
  const supplementalA11y = [];
  for (const route of ["/clients/client-1", "/invoices/invoice-1"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    if (route.includes("invoices")) {
      assert(await page.locator(".mobile-invoice-lines").isVisible());
      assert(!(await page.locator(".invoice-line-table").isVisible()));
      const item = page.locator(".mobile-invoice-lines li").first();
      await item
        .getByRole("heading", {
          name: "Brand identity — first milestone",
          exact: true,
        })
        .waitFor();
      assert.deepEqual(await item.locator("dd").allTextContents(), [
        "1",
        "$4,250.00",
        "$4,250.00",
      ]);
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    supplementalA11y.push({ route, violations: result.violations });
    assert.equal(
      result.violations.length,
      0,
      JSON.stringify(result.violations),
    );
  }
  await fs.writeFile(
    "verification/design-after/refinement-accessibility.json",
    JSON.stringify(supplementalA11y, null, 2),
  );
  await page.emulateMedia({ media: "print" });
  assert(await page.locator(".invoice-line-table").isVisible());
  assert(!(await page.locator(".mobile-invoice-lines").isVisible()));
  await page.emulateMedia({ media: "screen" });
  pass(
    "Mobile line items remain readable and accessible while printing retains the table",
  );
  await fs.writeFile(
    "verification/design-after/results.json",
    JSON.stringify({ passed: checks.length, checks }, null, 2),
  );
} finally {
  await browser.close();
}
