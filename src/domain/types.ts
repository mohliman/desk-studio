export type ProjectStatus = "Planned" | "In progress" | "On hold" | "Complete";
export type TaskStatus = "To do" | "In progress" | "Done";
export type InvoiceStatus = "Draft" | "Sent" | "Paid";
export interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
  notes: string;
  archived: boolean;
}
export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  budgetCents: number;
  deadline: string;
  archived: boolean;
}
export interface Task {
  id: string;
  assigneeId?: string | null;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
}
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
}
export interface Invoice {
  id: string;
  clientId: string;
  projectId: string | null;
  number: string;
  issuedDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: LineItem[];
  notes: string;
}
export interface Workspace {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  invoices: Invoice[];
}
export const projectStatuses: ProjectStatus[] = [
  "Planned",
  "In progress",
  "On hold",
  "Complete",
];
export const taskStatuses: TaskStatus[] = ["To do", "In progress", "Done"];
export const invoiceStatuses: InvoiceStatus[] = ["Draft", "Sent", "Paid"];
