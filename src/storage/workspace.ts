import type { Workspace } from "../domain/types";
import {
  invoiceStatuses,
  projectStatuses,
  taskStatuses,
} from "../domain/types";
import { validDate } from "../domain/logic";
import { createSeed } from "../domain/seed";
export const STORAGE_KEY = "desk.workspace";
export const SCHEMA_VERSION = 1;
type Store = Pick<Storage, "getItem" | "setItem">;
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => typeof v === "string" && v.length <= 20000;
const name = (v: unknown) => str(v) && (v as string).trim().length > 0;
const cents = (v: unknown) =>
  Number.isSafeInteger(v) && (v as number) >= 0 && (v as number) <= 9999999999;
export function isWorkspace(v: unknown): v is Workspace {
  if (
    !record(v) ||
    !["clients", "projects", "tasks", "invoices"].every(
      (k) => Array.isArray(v[k]) && (v[k] as unknown[]).length <= 10000,
    )
  )
    return false;
  const { clients, projects, tasks, invoices } = v as unknown as Workspace;
  const unique = (rows: unknown[]) =>
    rows.every(record) &&
    rows.every((r) => name((r as Record<string, unknown>).id)) &&
    new Set(rows.map((r) => (r as Record<string, unknown>).id)).size ===
      rows.length;
  if (![clients, projects, tasks, invoices].every(unique)) return false;
  if (
    !clients.every(
      (c) =>
        name(c.name) &&
        str(c.contact) &&
        str(c.email) &&
        str(c.notes) &&
        typeof c.archived === "boolean",
    )
  )
    return false;
  if (
    !projects.every(
      (p) =>
        name(p.name) &&
        str(p.description) &&
        projectStatuses.includes(p.status) &&
        cents(p.budgetCents) &&
        validDate(p.deadline) &&
        typeof p.archived === "boolean" &&
        clients.some((c) => c.id === p.clientId),
    )
  )
    return false;
  if (
    !tasks.every(
      (t) =>
        name(t.title) &&
        str(t.description) &&
        taskStatuses.includes(t.status) &&
        (t.dueDate === "" || validDate(t.dueDate)) &&
        projects.some((p) => p.id === t.projectId),
    )
  )
    return false;
  return (
    invoices.every(
      (i) =>
        name(i.number) &&
        str(i.notes) &&
        invoiceStatuses.includes(i.status) &&
        validDate(i.issuedDate) &&
        validDate(i.dueDate) &&
        i.dueDate >= i.issuedDate &&
        clients.some((c) => c.id === i.clientId) &&
        (i.projectId === null ||
          projects.some(
            (p) => p.id === i.projectId && p.clientId === i.clientId,
          )) &&
        Array.isArray(i.items) &&
        i.items.length > 0 &&
        i.items.length <= 100 &&
        unique(i.items) &&
        i.items.every(
          (l) =>
            name(l.description) &&
            Number.isInteger(l.quantity) &&
            l.quantity > 0 &&
            l.quantity <= 10000 &&
            cents(l.unitPriceCents),
        ) &&
        Number.isSafeInteger(
          i.items.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0),
        ),
    ) &&
    new Set(invoices.map((i) => i.number.toLowerCase())).size ===
      invoices.length
  );
}
export function loadWorkspace(store: Store): {
  data: Workspace;
  notice: string;
} {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return { data: createSeed(), notice: "" };
    const value: unknown = JSON.parse(raw);
    if (
      record(value) &&
      value.version === SCHEMA_VERSION &&
      isWorkspace(value.data)
    )
      return { data: value.data, notice: "" };
    return {
      data: createSeed(),
      notice:
        "Stored data was outdated or invalid. A fresh sample workspace was loaded.",
    };
  } catch (error) {
    return {
      data: createSeed(),
      notice:
        error instanceof SyntaxError
          ? "Stored data was outdated or invalid. A fresh sample workspace was loaded."
          : "Local storage could not be read. A sample workspace was loaded.",
    };
  }
}
export function saveWorkspace(store: Store, data: Workspace): boolean {
  try {
    store.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, data }),
    );
    return true;
  } catch {
    return false;
  }
}
