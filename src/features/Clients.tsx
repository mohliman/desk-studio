import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Archive, Pencil } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { archiveClient, dateLabel, invoiceTotal, money } from "../domain/logic";
import { useWorkspace } from "../state/WorkspaceProvider";
import {
  AddButton,
  Badge,
  Empty,
  PageHeader,
  SearchBox,
  SectionTitle,
} from "../components/ui";
import { ClientForm } from "./forms";
export function Clients() {
  const { data } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const rows = data.clients.filter(
    (c) =>
      c.archived === archived &&
      `${c.name} ${c.contact} ${c.email}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="CLIENT DIRECTORY"
        title="Clients"
        description="Contacts, current work and demonstration invoices."
        action={<AddButton onClick={() => setOpen(true)}>New client</AddButton>}
      />
      <div className="toolbar">
        <div className="tabs">
          <button
            className={!archived ? "active" : ""}
            onClick={() => setArchived(false)}
          >
            Current{" "}
            <span>{data.clients.filter((c) => !c.archived).length}</span>
          </button>
          <button
            className={archived ? "active" : ""}
            onClick={() => setArchived(true)}
          >
            Archived
          </button>
        </div>
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Search clients"
        />
      </div>
      <div className="client-directory">
        <div className="directory-heading" aria-hidden="true">
          <span>REF.</span>
          <span>CLIENT</span>
          <span>CONTACT</span>
          <span>PROJECTS</span>
          <span>OUTSTANDING / USD</span>
        </div>
        {[...rows]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => {
            const projects = data.projects.filter(
              (p) => p.clientId === c.id && !p.archived,
            );
            const outstanding = data.invoices
              .filter((i) => i.clientId === c.id && i.status === "Sent")
              .reduce((sum, i) => sum + invoiceTotal(i), 0);
            return (
              <article className="directory-row" key={c.id}>
                <span className="record-index">
                  {String(
                    data.clients.findIndex((row) => row.id === c.id) + 1,
                  ).padStart(2, "0")}
                </span>
                <Link className="directory-client" to={`/clients/${c.id}`}>
                  <h2>{c.name}</h2>
                  <span>
                    Open client <ArrowUpRight size={13} />
                  </span>
                </Link>
                <div className="directory-contact">
                  <strong>{c.contact || "No contact added"}</strong>
                  <span>{c.email || "No email added"}</span>
                </div>
                <div className="directory-projects">
                  <span className="mobile-field-label">Current projects</span>
                  <strong>{String(projects.length).padStart(2, "0")}</strong>
                </div>
                <div className="directory-amount">
                  <span className="mobile-field-label">Outstanding</span>
                  <strong>{money(outstanding)}</strong>
                </div>
              </article>
            );
          })}
      </div>
      {!rows.length && (
        <Empty
          title={
            query
              ? "No clients found"
              : archived
                ? "No archived clients"
                : "Who’s next?"
          }
          description={
            query
              ? "Try a different name or contact."
              : "Add a fictional client to start a new collaboration."
          }
        />
      )}{" "}
      {open && <ClientForm onClose={() => setOpen(false)} />}
    </>
  );
}
export function ClientDetail() {
  const { id } = useParams();
  const { data, update } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const client = data.clients.find((c) => c.id === id);
  if (!client)
    return (
      <Empty
        title="Client not found"
        description="This record may have been removed by a workspace reset."
        action={
          <Link to="/clients" className="button">
            Back to clients
          </Link>
        }
      />
    );
  const projects = data.projects.filter((p) => p.clientId === id);
  const invoices = data.invoices.filter((i) => i.clientId === id);
  const outstanding = invoices
    .filter((i) => i.status === "Sent")
    .reduce((sum, i) => sum + invoiceTotal(i), 0);
  const sortedInvoices = [...invoices].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate),
  );
  return (
    <>
      <Link to="/clients" className="back-link">
        <ArrowLeft size={15} />
        All clients
      </Link>
      <PageHeader
        eyebrow={
          client.archived ? "CLIENT DOSSIER / ARCHIVED" : "CLIENT DOSSIER"
        }
        title={client.name}
        description={client.notes || "No client notes added."}
        action={
          <button className="button" onClick={() => setEditing(true)}>
            <Pencil size={15} />
            Edit client
          </button>
        }
      />
      <div className="detail-strip">
        <div>
          <span>Contact</span>
          <strong>{client.contact || "Not added"}</strong>
        </div>
        <div>
          <span>Email · sample only</span>
          <strong>{client.email || "Not added"}</strong>
        </div>
        <div>
          <span>Relationship</span>
          <Badge status={client.archived ? "Archived" : "Active"} />
        </div>
      </div>
      <div className="client-dossier">
        <section aria-label="Client project register" className="dossier-work">
          <SectionTitle title="Project register" count={projects.length} />
          <div className="dossier-projects">
            {projects.map((p) => {
              const tasks = data.tasks.filter((t) => t.projectId === p.id);
              const done = tasks.filter((t) => t.status === "Done").length;
              return (
                <article className="dossier-project" key={p.id}>
                  <div className="dossier-project-top">
                    <Link
                      className="dossier-project-name"
                      to={`/projects/${p.id}`}
                    >
                      {p.name}
                    </Link>
                    <Badge status={p.archived ? "Archived" : p.status} />
                  </div>
                  <dl className="dossier-project-facts">
                    <div>
                      <dt>Deadline</dt>
                      <dd>{dateLabel(p.deadline)}</dd>
                    </div>
                    <div>
                      <dt>Budget · USD</dt>
                      <dd>{money(p.budgetCents)}</dd>
                    </div>
                    <div>
                      <dt>Tasks complete</dt>
                      <dd>
                        {done} / {tasks.length}
                      </dd>
                    </div>
                  </dl>
                  <div className="progress-track">
                    <div
                      style={{
                        width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </article>
              );
            })}
            {!projects.length && (
              <Empty
                title="No projects yet"
                description="Projects associated with this client will appear here."
              />
            )}
          </div>
        </section>
        <aside
          aria-label="Client demonstration accounts"
          className="dossier-accounts"
        >
          <SectionTitle title="Accounts" count={invoices.length} />
          <div className="dossier-account-total">
            <span>OUTSTANDING / USD</span>
            <strong>{money(outstanding)}</strong>
            <p>Sent demonstration invoices only.</p>
          </div>
          <div className="dossier-invoices">
            {sortedInvoices.map((i) => (
              <article className="dossier-invoice" key={i.id}>
                <div>
                  <Link to={`/invoices/${i.id}`}>
                    {i.number}
                    <ArrowUpRight size={14} />
                  </Link>
                  <Badge status={i.status} />
                </div>
                <div>
                  <span>Due {dateLabel(i.dueDate)}</span>
                  <strong>{money(invoiceTotal(i))}</strong>
                </div>
              </article>
            ))}
            {!invoices.length && (
              <p className="quiet-empty">
                No demonstration invoices for this client.
              </p>
            )}
          </div>
          <p className="register-footnote">
            Local records. No email is delivered and no payment is processed.
          </p>
        </aside>
      </div>
      <div className="archive-bar">
        <p>
          {client.archived
            ? "Restoring keeps associated projects archived until you restore them individually."
            : "Archiving also archives this client’s projects. Tasks and invoices are retained."}
        </p>
        <button
          className="button"
          onClick={() => {
            if (
              !window.confirm(
                client.archived
                  ? "Restore this client? Associated projects will stay archived."
                  : "Archive this client and all of their projects? Records will be retained.",
              )
            )
              return;
            update(
              client.archived
                ? {
                    ...data,
                    clients: data.clients.map((c) =>
                      c.id === client.id ? { ...c, archived: false } : c,
                    ),
                  }
                : archiveClient(data, client.id),
              client.archived
                ? "Client restored"
                : "Client and projects archived",
            );
          }}
        >
          <Archive size={15} />
          {client.archived ? "Restore client" : "Archive client"}
        </button>
      </div>
      {editing && (
        <ClientForm client={client} onClose={() => setEditing(false)} />
      )}
    </>
  );
}
