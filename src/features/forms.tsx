import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Client, Invoice, Project, Task } from "../domain/types";
import {
  invoiceStatuses,
  projectStatuses,
  taskStatuses,
} from "../domain/types";
import {
  dollarsToCents,
  id,
  invoiceTotal,
  money,
  today,
  validDate,
} from "../domain/logic";
import { useWorkspace } from "../state/WorkspaceProvider";
import { Field, FormActions, FormError, Modal } from "../components/ui";
function useForm<T>(initial: T) {
  const [value, setValue] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(initial) !== JSON.stringify(value);
  return { value, setValue, errors, setErrors, dirty };
}
const cancel = (dirty: boolean, onClose: () => void) => {
  if (!dirty || window.confirm("Discard your unsaved changes?")) onClose();
};
export function ClientForm({
  client,
  onClose,
}: {
  client?: Client;
  onClose: () => void;
}) {
  const { data, update, notice, busy, refresh } = useWorkspace();
  const [initial] = useState(
    () =>
      client ?? {
        id: id(),
        name: "",
        contact: "",
        email: "",
        notes: "",
        archived: false,
      },
  );
  const { value, setValue, errors, setErrors, dirty } = useForm(initial);
  const change = (key: keyof Client, v: string) =>
    setValue({ ...value, [key]: v });
  return (
    <Modal
      title={client ? "Edit client" : "New client"}
      description="Keep a little context about the people you work with. Use sample data only."
      onClose={onClose}
      dirty={dirty}
    >
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const errs: Record<string, string> = {};
          if (!value.name.trim()) errs.name = "Enter a client or company name.";
          if (value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))
            errs.email = "Enter a valid email address or leave it blank.";
          setErrors(errs);
          if (Object.keys(errs).length) return;
          const row = {
            ...value,
            name: value.name.trim(),
            email: value.email.trim(),
          };
          const saved = await update(
            {
              ...data,
              clients: client
                ? data.clients.map((c) => (c.id === row.id ? row : c))
                : [...data.clients, row],
            },
            client ? "Client updated" : "Client created",
          );
          if (saved) onClose();
        }}
      >
        <FormError errors={errors} />
        {notice && (
          <div className="server-message" role="alert">
            <p>{notice}</p>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Refresh saved records
            </button>
          </div>
        )}
        <Field label="Client / company name *" error={errors.name}>
          <input
            autoFocus
            maxLength={160}
            value={value.name}
            onChange={(e) => change("name", e.target.value)}
            aria-invalid={!!errors.name}
            required
          />
        </Field>
        <div className="form-grid">
          <Field label="Contact name">
            <input
              maxLength={160}
              value={value.contact}
              onChange={(e) => change("contact", e.target.value)}
            />
          </Field>
          <Field label="Email" error={errors.email}>
            <input
              type="email"
              maxLength={200}
              value={value.email}
              onChange={(e) => change("email", e.target.value)}
              aria-invalid={!!errors.email}
            />
          </Field>
        </div>
        <Field label="Notes">
          <textarea
            rows={4}
            maxLength={4000}
            value={value.notes}
            onChange={(e) => change("notes", e.target.value)}
            placeholder="A little background, helpful details…"
          />
        </Field>
        <FormActions
          disabled={busy}
          onCancel={() => cancel(dirty, onClose)}
          label={client ? "Save client" : "Create client"}
        />
      </form>
    </Modal>
  );
}
export function ProjectForm({
  project,
  onClose,
}: {
  project?: Project;
  onClose: () => void;
}) {
  const { data, update, notice, busy, refresh } = useWorkspace();
  const [initial] = useState(() => ({
    ...(project ?? {
      id: id(),
      name: "",
      clientId: "",
      description: "",
      status: "Planned" as const,
      budgetCents: 0,
      deadline: "",
      archived: false,
    }),
    budget: project ? (project.budgetCents / 100).toFixed(2) : "",
  }));
  const { value, setValue, errors, setErrors, dirty } = useForm(initial);
  return (
    <Modal
      title={project ? "Edit project" : "New project"}
      description="Define the work, the client and the next milestone."
      onClose={onClose}
      dirty={dirty}
    >
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const errs: Record<string, string> = {};
          const budget = dollarsToCents(value.budget);
          if (!value.name.trim()) errs.name = "Give your project a name.";
          if (!data.clients.some((c) => c.id === value.clientId))
            errs.client = "Choose a client.";
          if (!validDate(value.deadline))
            errs.deadline = "Choose a valid deadline between 2000 and 2100.";
          if (budget === null)
            errs.budget =
              "Enter a non-negative amount with up to two decimal places.";
          setErrors(errs);
          if (Object.keys(errs).length) return;
          const { budget: _budget, ...rest } = value;
          const row = {
            ...rest,
            name: value.name.trim(),
            budgetCents: budget!,
          };
          const saved = await update(
            {
              ...data,
              projects: project
                ? data.projects.map((p) => (p.id === row.id ? row : p))
                : [...data.projects, row],
            },
            project ? "Project updated" : "Project created",
          );
          if (saved) onClose();
        }}
      >
        <FormError errors={errors} />
        {notice && (
          <div className="server-message" role="alert">
            <p>{notice}</p>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Refresh saved records
            </button>
          </div>
        )}
        <Field label="Project name *" error={errors.name}>
          <input
            autoFocus
            maxLength={180}
            value={value.name}
            onChange={(e) => setValue({ ...value, name: e.target.value })}
            aria-invalid={!!errors.name}
            required
          />
        </Field>
        <Field label="Client *" error={errors.client}>
          <select
            value={value.clientId}
            onChange={(e) => setValue({ ...value, clientId: e.target.value })}
            aria-invalid={!!errors.client}
            required
          >
            <option value="">Select a client</option>
            {data.clients
              .filter((c) => !c.archived || c.id === value.clientId)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.archived ? " (archived)" : ""}
                </option>
              ))}
          </select>
        </Field>
        {!data.clients.some((c) => !c.archived) && (
          <p className="field-hint">
            Create an active client in Clients first.
          </p>
        )}
        <Field label="Description">
          <textarea
            rows={3}
            maxLength={5000}
            value={value.description}
            onChange={(e) =>
              setValue({ ...value, description: e.target.value })
            }
          />
        </Field>
        <div className="form-grid">
          <Field label="Budget · USD *" error={errors.budget}>
            <input
              inputMode="decimal"
              value={value.budget}
              onChange={(e) => setValue({ ...value, budget: e.target.value })}
              aria-invalid={!!errors.budget}
              placeholder="0.00"
            />
          </Field>
          <Field label="Deadline *" error={errors.deadline}>
            <input
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              value={value.deadline}
              onChange={(e) => setValue({ ...value, deadline: e.target.value })}
              aria-invalid={!!errors.deadline}
            />
          </Field>
        </div>
        <Field label="Status">
          <select
            value={value.status}
            onChange={(e) =>
              setValue({
                ...value,
                status: e.target.value as Project["status"],
              })
            }
          >
            {projectStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <FormActions
          disabled={busy}
          onCancel={() => cancel(dirty, onClose)}
          label={project ? "Save project" : "Create project"}
        />
      </form>
    </Modal>
  );
}
export function TaskForm({
  task,
  projectId,
  onClose,
}: {
  task?: Task;
  projectId: string;
  onClose: () => void;
}) {
  const { data, update, members, notice, busy, refresh } = useWorkspace();
  const [initial] = useState(
    () =>
      task ?? {
        id: id(),
        projectId,
        title: "",
        description: "",
        status: "To do" as const,
        dueDate: "",
      },
  );
  const { value, setValue, errors, setErrors, dirty } = useForm(initial);
  return (
    <Modal
      title={task ? "Edit task" : "New task"}
      description="Break the project into a useful next action."
      onClose={onClose}
      dirty={dirty}
    >
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const errs: Record<string, string> = {};
          if (!value.title.trim()) errs.title = "Enter a task title.";
          if (value.dueDate && !validDate(value.dueDate))
            errs.date = "Choose a valid date between 2000 and 2100.";
          setErrors(errs);
          if (Object.keys(errs).length) return;
          const row = { ...value, title: value.title.trim() };
          const saved = await update(
            {
              ...data,
              tasks: task
                ? data.tasks.map((t) => (t.id === row.id ? row : t))
                : [...data.tasks, row],
            },
            task ? "Task updated" : "Task added",
          );
          if (saved) onClose();
        }}
      >
        <FormError errors={errors} />
        {notice && (
          <div className="server-message" role="alert">
            <p>{notice}</p>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Refresh saved records
            </button>
          </div>
        )}
        <Field label="Task title *" error={errors.title}>
          <input
            autoFocus
            maxLength={180}
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
            aria-invalid={!!errors.title}
          />
        </Field>
        <Field label="Assigned to">
          <select
            value={value.assigneeId ?? ""}
            onChange={(e) =>
              setValue({ ...value, assigneeId: e.target.value || null })
            }
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <textarea
            rows={3}
            maxLength={4000}
            value={value.description}
            onChange={(e) =>
              setValue({ ...value, description: e.target.value })
            }
          />
        </Field>
        <div className="form-grid">
          <Field label="Due date" error={errors.date}>
            <input
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              value={value.dueDate}
              onChange={(e) => setValue({ ...value, dueDate: e.target.value })}
              aria-invalid={!!errors.date}
            />
          </Field>
          <Field label="Status">
            <select
              value={value.status}
              onChange={(e) =>
                setValue({ ...value, status: e.target.value as Task["status"] })
              }
            >
              {taskStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <FormActions
          disabled={busy}
          onCancel={() => cancel(dirty, onClose)}
          label={task ? "Save task" : "Add task"}
        />
      </form>
    </Modal>
  );
}
export function InvoiceForm({
  invoice,
  onClose,
}: {
  invoice?: Invoice;
  onClose: () => void;
}) {
  const { data, update, notice, busy, refresh } = useWorkspace();
  const [initial] = useState(() => ({
    ...(invoice ?? {
      id: id(),
      clientId: "",
      projectId: null,
      number: `DSK-${String(data.invoices.length + 1).padStart(3, "0")}`,
      issuedDate: today(),
      dueDate: today(),
      status: "Draft" as const,
      items: [],
      notes: "",
    }),
    items: invoice
      ? invoice.items.map((l) => ({
          ...l,
          price: (l.unitPriceCents / 100).toFixed(2),
          qty: String(l.quantity),
        }))
      : [
          {
            id: id(),
            description: "",
            quantity: 1,
            unitPriceCents: 0,
            price: "",
            qty: "1",
          },
        ],
  }));
  const { value, setValue, errors, setErrors, dirty } = useForm(initial);
  const items = value.items.map((l) => ({
    id: l.id,
    description: l.description.trim(),
    quantity: Number(l.qty),
    unitPriceCents: dollarsToCents(l.price) ?? 0,
  }));
  const total = invoiceTotal({ items });
  const patchLine = (lineId: string, key: string, v: string) =>
    setValue({
      ...value,
      items: value.items.map((l) => (l.id === lineId ? { ...l, [key]: v } : l)),
    });
  return (
    <Modal
      wide
      title={
        invoice
          ? "Edit demonstration invoice"
          : "Create a demonstration invoice"
      }
      description="Illustrative USD amounts. Status changes are saved; no email or payment is sent."
      dirty={dirty}
      onClose={onClose}
    >
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          const errs: Record<string, string> = {};
          if (!Number.isSafeInteger(total))
            errs.total =
              "The invoice total is too large. Reduce the quantities or prices.";
          if (!value.number.trim()) errs.number = "Enter an invoice number.";
          else if (
            data.invoices.some(
              (i) =>
                i.id !== value.id &&
                i.number.toLowerCase() === value.number.trim().toLowerCase(),
            )
          )
            errs.number = "This invoice number is already in use.";
          if (!data.clients.some((c) => c.id === value.clientId))
            errs.client = "Choose a client.";
          if (!validDate(value.issuedDate))
            errs.issued = "Choose a valid issue date.";
          if (!validDate(value.dueDate) || value.dueDate < value.issuedDate)
            errs.due = "The due date must be on or after the issue date.";
          value.items.forEach((l, index) => {
            if (
              !l.description.trim() ||
              !/^\d+$/.test(l.qty) ||
              Number(l.qty) < 1 ||
              Number(l.qty) > 10000 ||
              dollarsToCents(l.price) === null
            )
              errs[l.id] =
                `Line ${index + 1}: enter a description, whole quantity from 1 to 10,000, and a non-negative price with up to two decimals.`;
          });
          setErrors(errs);
          if (Object.keys(errs).length) return;
          const row: Invoice = { ...value, number: value.number.trim(), items };
          const saved = await update(
            {
              ...data,
              invoices: invoice
                ? data.invoices.map((i) => (i.id === row.id ? row : i))
                : [...data.invoices, row],
            },
            invoice ? "Invoice updated" : "Demonstration invoice created",
          );
          if (saved) onClose();
        }}
      >
        <FormError errors={errors} />
        {notice && (
          <div className="server-message" role="alert">
            <p>{notice}</p>
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => void refresh()}
            >
              Refresh saved records
            </button>
          </div>
        )}
        <div className="form-grid">
          <Field label="Invoice number *" error={errors.number}>
            <input
              autoFocus
              maxLength={60}
              value={value.number}
              onChange={(e) => setValue({ ...value, number: e.target.value })}
              aria-invalid={!!errors.number}
            />
          </Field>
          <Field label="Client *" error={errors.client}>
            <select
              value={value.clientId}
              onChange={(e) =>
                setValue({
                  ...value,
                  clientId: e.target.value,
                  projectId: null,
                })
              }
              aria-invalid={!!errors.client}
            >
              <option value="">Select a client</option>
              {data.clients
                .filter((c) => !c.archived || c.id === value.clientId)
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Associated project">
          <select
            value={value.projectId ?? ""}
            onChange={(e) =>
              setValue({ ...value, projectId: e.target.value || null })
            }
          >
            <option value="">No associated project</option>
            {data.projects
              .filter((p) => p.clientId === value.clientId)
              .map((p) => (
                <option value={p.id} key={p.id}>
                  {p.name}
                  {p.archived ? " (archived)" : ""}
                </option>
              ))}
          </select>
        </Field>
        <div className="form-grid">
          <Field label="Issue date *" error={errors.issued}>
            <input
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              value={value.issuedDate}
              onChange={(e) =>
                setValue({ ...value, issuedDate: e.target.value })
              }
              aria-invalid={!!errors.issued}
            />
          </Field>
          <Field label="Due date *" error={errors.due}>
            <input
              type="date"
              min={value.issuedDate}
              max="2100-12-31"
              value={value.dueDate}
              onChange={(e) => setValue({ ...value, dueDate: e.target.value })}
              aria-invalid={!!errors.due}
            />
          </Field>
        </div>
        <div className="line-heading">
          <h3>Line items</h3>
          <span>USD</span>
        </div>
        {value.items.map((l, index) => (
          <div className="line-group" key={l.id}>
            <div className="line-form">
              <Field label={`Description ${index + 1}`}>
                <input
                  aria-invalid={!!errors[l.id]}
                  value={l.description}
                  maxLength={300}
                  onChange={(e) =>
                    patchLine(l.id, "description", e.target.value)
                  }
                />
              </Field>
              <Field label={`Quantity ${index + 1}`}>
                <input
                  inputMode="numeric"
                  value={l.qty}
                  onChange={(e) => patchLine(l.id, "qty", e.target.value)}
                  aria-invalid={!!errors[l.id]}
                />
              </Field>
              <Field label={`Unit price ${index + 1}`}>
                <input
                  inputMode="decimal"
                  value={l.price}
                  onChange={(e) => patchLine(l.id, "price", e.target.value)}
                  aria-invalid={!!errors[l.id]}
                />
              </Field>
              <button
                type="button"
                className="icon-button"
                aria-label={`Remove line ${index + 1}`}
                disabled={value.items.length === 1}
                onClick={() =>
                  setValue({
                    ...value,
                    items: value.items.filter((item) => item.id !== l.id),
                  })
                }
              >
                <Minus size={16} />
              </button>
            </div>
            {errors[l.id] && <p className="field-error">{errors[l.id]}</p>}
          </div>
        ))}
        <div className="invoice-form-total">
          <button
            className="text-link"
            type="button"
            disabled={value.items.length >= 100}
            onClick={() =>
              setValue({
                ...value,
                items: [
                  ...value.items,
                  {
                    id: id(),
                    description: "",
                    quantity: 1,
                    unitPriceCents: 0,
                    price: "",
                    qty: "1",
                  },
                ],
              })
            }
          >
            <Plus size={15} />
            Add line item
          </button>
          <strong>{money(Number.isFinite(total) ? total : 0)}</strong>
        </div>
        <div className="form-grid">
          <Field label="Local demo status">
            <select
              value={value.status}
              onChange={(e) =>
                setValue({
                  ...value,
                  status: e.target.value as Invoice["status"],
                })
              }
            >
              {invoiceStatuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <textarea
              rows={2}
              maxLength={3000}
              value={value.notes}
              onChange={(e) => setValue({ ...value, notes: e.target.value })}
            />
          </Field>
        </div>
        <FormActions
          disabled={busy}
          onCancel={() => cancel(dirty, onClose)}
          label={invoice ? "Save invoice" : "Create invoice"}
        />
      </form>
    </Modal>
  );
}
