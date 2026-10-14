import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Pencil, Printer } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { dateLabel, invoiceTotal, money } from "../domain/logic";
import { invoiceStatuses } from "../domain/types";
import { useWorkspace } from "../state/WorkspaceProvider";
import {
  AddButton,
  Badge,
  Empty,
  PageHeader,
  SearchBox,
} from "../components/ui";
import { InvoiceForm } from "./forms";
export function Invoices() {
  const { data } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const status = params.get("status") ?? "All";
  const rows = data.invoices.filter(
    (i) =>
      (status === "All" || status === i.status) &&
      `${i.number} ${data.clients.find((c) => c.id === i.clientId)?.name}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="ACCOUNTS / DEMONSTRATION"
        title="Invoices"
        description="Line items, recorded statuses and outstanding amounts in USD."
        action={
          <AddButton onClick={() => setOpen(true)}>New invoice</AddButton>
        }
      />
      <div className="demo-note">
        Demonstration records only. “Sent” is a recorded status — no email is
        delivered. No payments are processed.
      </div>
      <div className="toolbar">
        <div className="tabs">
          {["All", ...invoiceStatuses].map((s) => (
            <button
              key={s}
              className={status === s ? "active" : ""}
              onClick={() => setParams(s === "All" ? {} : { status: s })}
            >
              {s}
            </button>
          ))}
        </div>
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Search invoices or clients"
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice / client</th>
              <th>Project</th>
              <th>Status</th>
              <th>Due date</th>
              <th className="numeric">Total</th>
              <th>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id}>
                <td>
                  <Link className="table-title" to={`/invoices/${i.id}`}>
                    {i.number}
                  </Link>
                  <p className="muted small">
                    {data.clients.find((c) => c.id === i.clientId)?.name}
                  </p>
                </td>
                <td>
                  {data.projects.find((p) => p.id === i.projectId)?.name ?? "—"}
                </td>
                <td>
                  <Badge status={i.status} />
                </td>
                <td>{dateLabel(i.dueDate)}</td>
                <td className="numeric">{money(invoiceTotal(i))}</td>
                <td>
                  <Link
                    className="icon-button"
                    aria-label={`Open ${i.number}`}
                    to={`/invoices/${i.id}`}
                  >
                    <ArrowUpRight size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <Empty
            title={query ? "No invoices found" : "Nothing in this view"}
            description={
              query
                ? "Try another invoice number or client name."
                : "Create a demonstration invoice to keep a clear record of your work."
            }
          />
        )}
      </div>
      <div className="invoice-list-footer">
        <span>
          {rows.length} demonstration invoice{rows.length !== 1 ? "s" : ""}
        </span>
        <span>
          Total in this view{" "}
          <strong>
            {money(rows.reduce((sum, i) => sum + invoiceTotal(i), 0))}
          </strong>
        </span>
      </div>
      {open && <InvoiceForm onClose={() => setOpen(false)} />}
    </>
  );
}
export function InvoiceDetail() {
  const { id } = useParams();
  const { data, update } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const invoice = data.invoices.find((i) => i.id === id);
  if (!invoice)
    return (
      <Empty
        title="Invoice not found"
        description="This record may have been removed by a workspace reset."
        action={
          <Link className="button" to="/invoices">
            Back to invoices
          </Link>
        }
      />
    );
  const client = data.clients.find((c) => c.id === invoice.clientId)!;
  const project = data.projects.find((p) => p.id === invoice.projectId);
  return (
    <>
      <div className="no-print">
        <Link to="/invoices" className="back-link">
          <ArrowLeft size={15} />
          All invoices
        </Link>
        <PageHeader
          eyebrow="DEMONSTRATION INVOICE"
          title={invoice.number}
          description="A saved invoice record. No email delivery or payment processing."
          action={
            <div className="header-actions">
              <button className="button" onClick={() => window.print()}>
                <Printer size={15} />
                Print
              </button>
              <button className="button" onClick={() => setEditing(true)}>
                <Pencil size={15} />
                Edit invoice
              </button>
            </div>
          }
        />
        <div className="invoice-status-bar">
          <Badge status={invoice.status} />
          <label htmlFor="invoice-status">Local status</label>
          <select
            id="invoice-status"
            value={invoice.status}
            onChange={(e) =>
              update(
                {
                  ...data,
                  invoices: data.invoices.map((i) =>
                    i.id === invoice.id
                      ? { ...i, status: e.target.value as typeof i.status }
                      : i,
                  ),
                },
                e.target.value === "Sent"
                  ? "Marked Sent. No email delivered."
                  : `Invoice marked ${e.target.value.toLowerCase()}`,
              )
            }
          >
            {invoiceStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span>Changes are saved to the workspace database.</span>
        </div>
      </div>
      <article className="invoice-paper">
        <div className="invoice-paper-top">
          <div>
            <span className="wordmark">
              DESK<span>✳</span>
            </span>
            <p>Independent creative studio</p>
          </div>
          <div className="invoice-number">
            <p>DEMONSTRATION INVOICE</p>
            <h2>{invoice.number}</h2>
            <Badge status={invoice.status} />
          </div>
        </div>
        <div className="invoice-addresses">
          <div>
            <p className="eyebrow">PREPARED FOR</p>
            <h3>{client.name}</h3>
            <p>{client.contact}</p>
            <p>{client.email}</p>
            {project && <p className="invoice-project">{project.name}</p>}
          </div>
          <div>
            <p>
              Issued <strong>{dateLabel(invoice.issuedDate)}</strong>
            </p>
            <p>
              Due <strong>{dateLabel(invoice.dueDate)}</strong>
            </p>
            <p>
              Currency <strong>USD · illustrative</strong>
            </p>
          </div>
        </div>
        <div className="table-wrap invoice-line-table">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th className="numeric">Qty</th>
                <th className="numeric">Unit price</th>
                <th className="numeric">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((l) => (
                <tr key={l.id}>
                  <td>{l.description}</td>
                  <td className="numeric">{l.quantity}</td>
                  <td className="numeric">{money(l.unitPriceCents)}</td>
                  <td className="numeric">
                    {money(l.quantity * l.unitPriceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ol className="mobile-invoice-lines" aria-label="Invoice line items">
          {invoice.items.map((line, index) => (
            <li key={line.id}>
              <div className="mobile-line-title">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{line.description}</h3>
              </div>
              <dl>
                <div>
                  <dt>Qty</dt>
                  <dd>{line.quantity}</dd>
                </div>
                <div>
                  <dt>Unit price</dt>
                  <dd>{money(line.unitPriceCents)}</dd>
                </div>
                <div>
                  <dt>Amount</dt>
                  <dd>{money(line.quantity * line.unitPriceCents)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
        <div className="invoice-total">
          <span>Total · USD</span>
          <strong>{money(invoiceTotal(invoice))}</strong>
        </div>
        {invoice.notes && <p className="invoice-notes">{invoice.notes}</p>}
        <footer>
          Independent portfolio concept · Demonstration only · No payment is
          due.
          <br />
          “Sent” records a recorded status and does not indicate email
          delivery.
        </footer>
      </article>
      {editing && (
        <InvoiceForm invoice={invoice} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
