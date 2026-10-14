import { describe, expect, it } from "vitest";
import {
  archiveClient,
  dollarsToCents,
  filterProjects,
  invoiceTotal,
  overview,
  validDate,
} from "./logic";
import { createSeed } from "./seed";
describe("invoice amounts", () => {
  it("calculates quantities in integer cents without fractional-dollar rounding", () => {
    expect(
      invoiceTotal({
        items: [
          { id: "a", description: "Design", quantity: 3, unitPriceCents: 1010 },
          { id: "b", description: "Print", quantity: 2, unitPriceCents: 125 },
        ],
      }),
    ).toBe(3280);
  });
  it("parses exact decimal amounts and rejects malformed prices", () => {
    expect(dollarsToCents("0.29")).toBe(29);
    expect(dollarsToCents("20.1")).toBe(2010);
    for (const v of ["-1", "1.001", "abc", "1e3", ""])
      expect(dollarsToCents(v)).toBeNull();
  });
  it("updates outstanding totals when a sent invoice becomes paid", () => {
    const data = createSeed();
    const before = overview(data).outstanding;
    data.invoices[0].status = "Paid";
    expect(overview(data).outstanding).toBe(
      before - invoiceTotal(data.invoices[0]),
    );
  });
});
describe("relationships and filters", () => {
  it("archives a client and its projects while retaining task and invoice relationships", () => {
    const data = createSeed();
    const next = archiveClient(data, "client-1");
    expect(next.clients[0].archived).toBe(true);
    expect(next.projects[0].archived).toBe(true);
    expect(next.tasks).toEqual(data.tasks);
    expect(next.invoices).toEqual(data.invoices);
    expect(overview(next).active.some((p) => p.clientId === "client-1")).toBe(
      false,
    );
    expect(data.clients[0].archived).toBe(false);
  });
  it("searches client names and combines status and archive filters", () => {
    const data = createSeed();
    expect(
      filterProjects(
        data.projects,
        " NORTHLINE ",
        "In progress",
        false,
        data,
      ).map((p) => p.id),
    ).toEqual(["project-2"]);
    expect(
      filterProjects(data.projects, "Northline", "Planned", false, data),
    ).toEqual([]);
    data.projects[1].archived = true;
    expect(
      filterProjects(data.projects, "Northline", "All", false, data),
    ).toEqual([]);
    expect(
      filterProjects(data.projects, "Northline", "All", true, data),
    ).toHaveLength(1);
  });
  it("counts overdue open tasks only on active projects", () => {
    const data = createSeed();
    const task = data.tasks[0];
    task.dueDate = "2025-01-01";
    expect(
      overview(data, "2025-01-02").overdueTasks.map((t) => t.id),
    ).toContain(task.id);
    task.status = "Done";
    expect(
      overview(data, "2025-01-02").overdueTasks.map((t) => t.id),
    ).not.toContain(task.id);
    task.status = "To do";
    data.projects[0].archived = true;
    expect(
      overview(data, "2025-01-02").overdueTasks.map((t) => t.id),
    ).not.toContain(task.id);
  });
  it("rejects impossible date-only values", () => {
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2025-02-29")).toBe(false);
    expect(validDate("2026-13-01")).toBe(false);
    expect(validDate("2026-10-11T00:00:00Z")).toBe(false);
  });
});
