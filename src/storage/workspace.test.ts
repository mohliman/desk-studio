import { describe, expect, it } from "vitest";
import { createSeed } from "../domain/seed";
import {
  isWorkspace,
  loadWorkspace,
  saveWorkspace,
  SCHEMA_VERSION,
  STORAGE_KEY,
} from "./workspace";
const store = (initial: string | null = null) => {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, v: string) => {
      value = v;
    },
  };
};
describe("persistence and recovery", () => {
  it("round trips the versioned workspace", () => {
    const storage = store();
    const data = createSeed();
    expect(saveWorkspace(storage, data)).toBe(true);
    expect(loadWorkspace(storage)).toEqual({ data, notice: "" });
    expect(JSON.parse(storage.getItem()!).version).toBe(SCHEMA_VERSION);
    expect(STORAGE_KEY).toBe("desk.workspace");
  });
  it.each([
    "{",
    "null",
    "{}",
    JSON.stringify({ version: 0, data: createSeed() }),
    JSON.stringify({ version: 1, data: {} }),
  ])("recovers invalid or outdated payload %s", (raw) => {
    const result = loadWorkspace(store(raw));
    expect(result.notice).toBeTruthy();
    expect(isWorkspace(result.data)).toBe(true);
  });
  it("rejects orphaned projects and cross-client invoices", () => {
    const data = createSeed();
    data.projects[0].clientId = "missing";
    expect(isWorkspace(data)).toBe(false);
    const next = createSeed();
    next.invoices[0].projectId = "project-2";
    expect(isWorkspace(next)).toBe(false);
  });
  it("rejects invalid amounts, line items, duplicate IDs and invoice numbers", () => {
    const a = createSeed();
    a.projects[0].budgetCents = 1.5;
    expect(isWorkspace(a)).toBe(false);
    const b = createSeed();
    b.invoices[0].items[0].quantity = -2;
    expect(isWorkspace(b)).toBe(false);
    const c = createSeed();
    c.clients[1].id = c.clients[0].id;
    expect(isWorkspace(c)).toBe(false);
    const d = createSeed();
    d.invoices[1].number = d.invoices[0].number;
    expect(isWorkspace(d)).toBe(false);
  });
  it("handles unavailable storage without crashing", () => {
    const broken = {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("quota");
      },
    };
    expect(loadWorkspace(broken).notice).toBeTruthy();
    expect(saveWorkspace(broken, createSeed())).toBe(false);
  });
});
