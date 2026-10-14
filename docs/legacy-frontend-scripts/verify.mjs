import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.DESK_PREVIEW_URL ?? "http://127.0.0.1:5174";
await fs.mkdir("verification", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const report = [];
const check = (message) => {
  report.push(message);
  console.log("PASS", message);
};
const visible = async (locator) => {
  await locator.waitFor({ state: "visible" });
};
const click = async (name) =>
  page.getByRole("button", { name, exact: true }).click();
const acceptDialog = () => page.once("dialog", (d) => d.accept());
const read = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("desk.workspace")).data);
try {
  await page.goto(base);
  await visible(page.getByRole("heading", { name: "Studio ledger" }));
  await page.screenshot({
    path: "verification/desktop-overview.png",
    fullPage: true,
    animations: "disabled",
  });
  check("Desktop overview renders");
  await page.getByRole("link", { name: "Clients", exact: true }).click();
  await click("New client");
  await click("Create client");
  await visible(page.getByRole("alert").filter({ hasText: "Please check" }));
  check("Required client validation is visible");
  await page.getByLabel("Client / company name *").fill("Test Atelier");
  await page.getByLabel("Contact name").fill("Taylor Sample");
  await page.getByLabel("Email", { exact: true }).fill("bad-address");
  await click("Create client");
  await visible(
    page.getByText("Enter a valid email address or leave it blank.", {
      exact: true,
    }),
  );
  await page
    .getByLabel("Email", { exact: true })
    .fill("taylor@atelier.example");
  await click("Create client");
  await visible(
    page.getByRole("heading", { name: "Test Atelier", exact: true }),
  );
  check("Create client and reject invalid email");
  await page
    .getByRole("link", { name: "Projects", exact: false })
    .first()
    .click();
  await click("New project");
  await click("Create project");
  await visible(page.getByRole("alert").filter({ hasText: "Please check" }));
  await page.getByLabel("Project name *").fill("Atelier website");
  await page
    .getByLabel("Client *", { exact: true })
    .selectOption({ label: "Test Atelier" });
  await page.getByLabel("Budget · USD *").fill("-2");
  await page.getByLabel("Deadline *").fill("2026-11-20");
  await click("Create project");
  await visible(
    page.getByText(
      "Enter a non-negative amount with up to two decimal places.",
      { exact: true },
    ),
  );
  await page.getByLabel("Budget · USD *").fill("1250.25");
  await page
    .getByLabel("Description", { exact: true })
    .fill("A fictional website project for complete workflow verification.");
  await page.getByLabel("Status", { exact: true }).selectOption("In progress");
  await click("Create project");
  await page
    .getByRole("link", { name: "Atelier website", exact: true })
    .click();
  check("Create related project with budget and date validation");
  await click("Add task");
  await page.getByLabel("Task title *").fill("Prepare concept");
  await page.getByLabel("Due date", { exact: true }).fill("2026-10-10");
  await click("Add task");
  await visible(
    page.getByRole("button", { name: "Prepare concept", exact: true }),
  );
  await page
    .getByRole("button", { name: "Complete Prepare concept", exact: true })
    .click();
  await visible(page.getByText("1 of 1 complete", { exact: true }));
  check("Add and complete project task; progress updates");
  await click("List");
  await visible(
    page.getByRole("button", { name: "Reopen Prepare concept", exact: true }),
  );
  await click("Board");
  await click("Add task");
  await page.getByLabel("Task title *").fill("Temporary task");
  await click("Add task");
  acceptDialog();
  await page
    .getByRole("button", { name: "Delete Temporary task", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Temporary task", exact: true })
      .count(),
    0,
  );
  check("Board and list views, confirmed task deletion");
  await click("Edit project");
  await page.getByLabel("Project name *").fill("Should be discarded");
  page.once("dialog", (d) => d.dismiss());
  await click("Cancel");
  await visible(page.getByRole("dialog"));
  assert.equal(
    await page.getByLabel("Project name *").inputValue(),
    "Should be discarded",
  );
  acceptDialog();
  await click("Cancel");
  await visible(
    page.getByRole("heading", { name: "Atelier website", exact: true }),
  );
  check("Unsaved cancellation can be kept or discarded");
  await click("Edit project");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Edited project description.");
  await click("Save project");
  await visible(page.getByText("Edited project description.", { exact: true }));
  check("Project edits saved");
  await page
    .getByRole("button", { name: "Edit Prepare concept", exact: true })
    .click();
  await page.getByLabel("Task title *").fill("Prepare revised concept");
  await click("Save task");
  check("Task edit saved");
  await click("Edit project");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Unsaved navigation change");
  let navigationDialog = new Promise((resolve) =>
    page.once("dialog", async (d) => {
      await d.dismiss();
      resolve();
    }),
  );
  await page.evaluate(() => history.back());
  await navigationDialog;
  await visible(page.getByRole("dialog"));
  assert.equal(
    await page.getByLabel("Description", { exact: true }).inputValue(),
    "Unsaved navigation change",
  );
  navigationDialog = new Promise((resolve) =>
    page.once("dialog", async (d) => {
      await d.accept();
      resolve();
    }),
  );
  await page.evaluate(() => history.back());
  await navigationDialog;
  await visible(page.getByRole("heading", { name: "Projects", exact: true }));
  check("Browser Back protects dirty forms with keep and discard choices");

  await page.getByRole("link", { name: "Invoices", exact: true }).click();
  await click("New invoice");
  await click("Create invoice");
  await visible(page.getByRole("alert").filter({ hasText: "Please check" }));
  await page.getByLabel("Invoice number *").fill("TEST-001");
  await page
    .getByLabel("Client *", { exact: true })
    .selectOption({ label: "Test Atelier" });
  await page
    .getByLabel("Associated project")
    .selectOption({ label: "Atelier website" });
  await page
    .getByLabel("Description 1", { exact: true })
    .fill("Concept design");
  await page.getByLabel("Quantity 1", { exact: true }).fill("2");
  await page.getByLabel("Unit price 1", { exact: true }).fill("100.10");
  await click("Add line item");
  await page.getByLabel("Description 2", { exact: true }).fill("Documentation");
  await page.getByLabel("Quantity 2", { exact: true }).fill("3");
  await page.getByLabel("Unit price 2", { exact: true }).fill("10.05");
  await page.getByLabel("Local demo status").selectOption("Sent");
  await click("Create invoice");
  await page.getByRole("link", { name: "TEST-001", exact: true }).click();
  await visible(page.getByText("$230.35", { exact: true }));
  check("Create related invoice with correct multi-line total");
  await page.screenshot({
    path: "verification/desktop-invoice.png",
    fullPage: true,
    animations: "disabled",
  });
  await click("Edit invoice");
  await page.getByLabel("Due date *", { exact: true }).fill("2026-01-01");
  await click("Save invoice");
  await visible(
    page.getByText("The due date must be on or after the issue date.", {
      exact: true,
    }),
  );
  await page.getByLabel("Due date *", { exact: true }).fill("2026-12-01");
  await page
    .getByLabel("Notes", { exact: true })
    .fill("Edited demonstration invoice.");
  await click("Save invoice");
  check("Invoice edit and date-order validation");
  const sent = (await read()).invoices
    .filter((i) => i.status === "Sent")
    .reduce(
      (s, i) =>
        s + i.items.reduce((n, l) => n + l.quantity * l.unitPriceCents, 0),
      0,
    );
  await page.getByLabel("Local status", { exact: true }).selectOption("Paid");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  const data = await read();
  const after = data.invoices
    .filter((i) => i.status === "Sent")
    .reduce(
      (s, i) =>
        s + i.items.reduce((n, l) => n + l.quantity * l.unitPriceCents, 0),
      0,
    );
  assert.equal(sent - after, 23035);
  await visible(
    page.locator(".summary-strip").getByText("$7,350.00", { exact: true }),
  );
  await visible(
    page.locator(".summary-strip").getByText("05", { exact: true }),
  );
  check(
    "Paid invoice reduces overview outstanding total; project count is derived",
  );
  await page.reload();
  const persisted = await read();
  assert(persisted.clients.some((c) => c.name === "Test Atelier"));
  assert(
    persisted.projects.some(
      (p) =>
        p.name === "Atelier website" &&
        p.description === "Edited project description.",
    ),
  );
  assert(
    persisted.tasks.some(
      (t) => t.title === "Prepare revised concept" && t.status === "Done",
    ),
  );
  assert(
    persisted.invoices.some(
      (i) => i.number === "TEST-001" && i.status === "Paid",
    ),
  );
  check("Full workflow persists after reload");
  await page.getByRole("link", { name: "Clients", exact: true }).click();
  await page.getByRole("link", { name: /Test Atelier/ }).click();
  await click("Edit client");
  await page.getByLabel("Contact name").fill("Revised Sample");
  await click("Save client");
  await visible(page.getByText("Revised Sample", { exact: true }));
  acceptDialog();
  await click("Archive client");
  const archived = await read();
  const c = archived.clients.find((c) => c.name === "Test Atelier");
  assert(c.archived);
  assert(
    archived.projects
      .filter((p) => p.clientId === c.id)
      .every((p) => p.archived),
  );
  assert(archived.invoices.some((i) => i.clientId === c.id));
  check("Client edits and archive retain invoice and project relationships");
  acceptDialog();
  await click("Restore client");
  await page
    .getByRole("link", { name: "Atelier website", exact: true })
    .click();
  acceptDialog();
  await click("Restore project");
  acceptDialog();
  await click("Archive project");
  check("Project restore and archive");
  await page
    .getByRole("link", { name: "Projects", exact: false })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Search projects or clients" })
    .fill("no-match-xyz");
  await visible(page.getByRole("heading", { name: "No projects found" }));
  check("Search no-results state");
  await page.goto(base + "/invoices/invoice-1");
  await page.emulateMedia({ media: "print" });
  await page.screenshot({
    path: "verification/print-invoice.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.pdf({
    path: "verification/demo-invoice.pdf",
    format: "A4",
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  check("Print layout renders to PDF");
  await page.goto(base + "/settings");
  page.once("dialog", (d) => d.dismiss());
  await click("Reset demo data");
  assert((await read()).clients.some((c) => c.name === "Test Atelier"));
  acceptDialog();
  await click("Reset demo data");
  assert.equal((await read()).clients.length, 4);
  assert.equal((await read()).projects.length, 4);
  await page.reload();
  assert.equal((await read()).clients.length, 4);
  check("Reset cancellation, confirmed reset, and reset persistence");
  await page.evaluate(() => localStorage.setItem("desk.workspace", "{invalid"));
  await page.reload();
  await visible(
    page
      .getByRole("alert")
      .filter({ hasText: "Stored data was outdated or invalid" }),
  );
  check("Invalid stored data recovers visibly");
  // Dedicated test context keeps all verification data separate from the user’s browser.
  await page.evaluate(() => localStorage.removeItem("desk.workspace"));
  await page.goto(base + "/");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "verification/mobile-overview.png",
    fullPage: true,
    animations: "disabled",
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await click("Open navigation");
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Projects", exact: true })
    .click();
  await click("New project");
  await page.screenshot({
    path: "verification/mobile-form.png",
    fullPage: false,
    animations: "disabled",
  });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await click("Cancel");
  check("Mobile overview, navigation and forms have no page overflow");
  for (const route of [
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
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `Mobile page overflow: ${route}`,
    );
  }
  check(
    "All main routes fit the mobile viewport; wide tables scroll within their container",
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  check("No browser JavaScript errors");
  await fs.writeFile(
    "verification/results.json",
    JSON.stringify(
      {
        passed: report.length,
        checks: report,
        errors,
        viewport: { desktop: "1440 × 1000", mobile: "390 × 844" },
        browser: "Installed Microsoft Edge, headless",
        preview: base,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
