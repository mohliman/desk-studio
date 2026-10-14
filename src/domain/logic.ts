import type { Invoice, Project, Workspace } from "./types";
export const id = () => crypto.randomUUID();
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(cents / 100);
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function dateLabel(value: string) {
  if (!value) return "No date";
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
export function validDate(v: unknown): v is string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const check = new Date(y, m - 1, d);
  return (
    y >= 2000 &&
    y <= 2100 &&
    check.getFullYear() === y &&
    check.getMonth() === m - 1 &&
    check.getDate() === d
  );
}
export function dollarsToCents(v: string): number | null {
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(v.trim())) return null;
  const [whole, decimal = ""] = v.trim().split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
}
export const invoiceTotal = (invoice: Pick<Invoice, "items">) =>
  invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0,
  );
export function filterProjects(
  projects: Project[],
  query: string,
  status: string,
  archived: boolean,
  data: Workspace,
) {
  const q = query.trim().toLowerCase();
  return projects.filter(
    (p) =>
      p.archived === archived &&
      (status === "All" || p.status === status) &&
      `${p.name} ${p.description} ${data.clients.find((c) => c.id === p.clientId)?.name ?? ""}`
        .toLowerCase()
        .includes(q),
  );
}
export function overview(data: Workspace, date = today()) {
  const active = data.projects.filter(
    (p) => !p.archived && p.status !== "Complete",
  );
  const ids = new Set(active.map((p) => p.id));
  return {
    active,
    deadlines: [...active].sort((a, b) => a.deadline.localeCompare(b.deadline)),
    overdueTasks: data.tasks.filter(
      (t) =>
        ids.has(t.projectId) &&
        t.status !== "Done" &&
        t.dueDate !== "" &&
        t.dueDate < date,
    ),
    outstanding: data.invoices
      .filter((i) => i.status === "Sent")
      .reduce((sum, i) => sum + invoiceTotal(i), 0),
    outstandingInvoices: data.invoices.filter((i) => i.status === "Sent"),
  };
}
export function archiveClient(data: Workspace, clientId: string): Workspace {
  return {
    ...data,
    clients: data.clients.map((c) =>
      c.id === clientId ? { ...c, archived: true } : c,
    ),
    projects: data.projects.map((p) =>
      p.clientId === clientId ? { ...p, archived: true } : p,
    ),
  };
}
