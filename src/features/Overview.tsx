import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, PanelRightOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  dateLabel,
  invoiceTotal,
  money,
  overview,
  today,
} from "../domain/logic";
import { useWorkspace } from "../state/WorkspaceProvider";
import { Badge, Empty, PageHeader, SectionTitle } from "../components/ui";
import { ProjectFocus } from "./ProjectFocus";
export function Overview() {
  const { data, update } = useWorkspace();
  const navigate = useNavigate();
  const summary = overview(data);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const taskCount = data.tasks.filter(
    (t) =>
      summary.active.some((p) => p.id === t.projectId) && t.status !== "Done",
  ).length;
  const nextDeadline = summary.deadlines.find((p) => p.deadline >= today());
  const upcoming = summary.deadlines
    .filter((p) => p.deadline >= today())
    .slice(0, 3);
  return (
    <>
      <PageHeader
        eyebrow="INDEPENDENT STUDIO / WORK REGISTER"
        title="Studio ledger"
        description="Projects, next steps and accounts — all on one desk."
        action={
          <button
            className="button primary"
            onClick={() => navigate("/projects?new=1")}
          >
            New project <span>＋</span>
          </button>
        }
      />
      <div className="summary-strip">
        <Link to="/projects?scope=active">
          <span>
            Active projects <ArrowUpRight size={14} />
          </span>
          <strong>{String(summary.active.length).padStart(2, "0")}</strong>
          <small>{taskCount} open tasks</small>
        </Link>
        <Link to="/projects?sort=deadline&scope=active">
          <span>
            Next deadline <ArrowUpRight size={14} />
          </span>
          <strong>
            {nextDeadline
              ? dateLabel(nextDeadline.deadline).replace(/, \d{4}/, "")
              : "—"}
          </strong>
          <small>{nextDeadline?.name ?? "No upcoming deadline"}</small>
        </Link>
        <Link to="/tasks?filter=overdue">
          <span>
            Overdue tasks <ArrowUpRight size={14} />
          </span>
          <strong>
            {String(summary.overdueTasks.length).padStart(2, "0")}
          </strong>
          <small>
            {summary.overdueTasks.length
              ? "Review the attention list"
              : "Nothing overdue"}
          </small>
        </Link>
        <Link to="/invoices?status=Sent">
          <span>
            Outstanding <ArrowUpRight size={14} />
          </span>
          <strong>{money(summary.outstanding)}</strong>
          <small>
            {summary.outstandingInvoices.length} sent demo invoices · USD
          </small>
        </Link>
      </div>
      <div className="ledger-layout">
        <section className="ledger-work" aria-label="Active project register">
          <SectionTitle
            title="Work in progress"
            count={summary.active.length}
            link="/projects"
            label="Project register"
          />
          <div className="work-register">
            <div className="register-heading" aria-hidden="true">
              <span>REF.</span>
              <span>PROJECT / CLIENT</span>
              <span>DEADLINE</span>
              <span>FOCUS</span>
            </div>
            {summary.active.map((p) => {
              const tasks = data.tasks.filter((t) => t.projectId === p.id);
              const done = tasks.filter((t) => t.status === "Done").length;
              return (
                <article className="register-row" key={p.id}>
                  <span className="record-index">
                    {String(
                      data.projects.findIndex((row) => row.id === p.id) + 1,
                    ).padStart(2, "0")}
                  </span>
                  <div className="register-project">
                    <Link className="register-title" to={`/projects/${p.id}`}>
                      {p.name}
                    </Link>
                    <div className="register-context">
                      <span>
                        {data.clients.find((c) => c.id === p.clientId)?.name}
                      </span>
                      <Badge status={p.status} />
                    </div>
                    <div className="register-progress">
                      <div className="progress-track">
                        <div
                          style={{
                            width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span>
                        {done}/{tasks.length} complete
                      </span>
                    </div>
                  </div>
                  <div className="register-date">
                    <span>{dateLabel(p.deadline).replace(/, \d{4}/, "")}</span>
                    <small>
                      {p.deadline < today() ? "Overdue" : "Due date"}
                    </small>
                  </div>
                  <button
                    className="focus-button"
                    aria-label={`Focus ${p.name}`}
                    onClick={() => setFocusedId(p.id)}
                  >
                    <PanelRightOpen size={18} />
                    <span>Focus</span>
                  </button>
                </article>
              );
            })}
            {!summary.active.length && (
              <Empty
                title="No active projects"
                description="Create a project to start a new piece of work."
                action={
                  <Link className="button" to="/projects?new=1">
                    Create a project
                  </Link>
                }
              />
            )}
          </div>
        </section>
        <aside className="ledger-side" aria-label="Priorities and schedule">
          <section
            className="ledger-attention"
            aria-label="Tasks needing attention"
          >
            <SectionTitle
              title="Attention"
              count={summary.overdueTasks.length}
              link="/tasks?filter=overdue"
              label="All overdue"
            />
            <div className="attention-register">
              <p className="register-caption">OVERDUE / OPEN TASKS</p>
              {summary.overdueTasks.map((t) => (
                <div className="attention-task" key={t.id}>
                  <button
                    className="task-check"
                    aria-label={`Complete ${t.title}`}
                    onClick={() =>
                      update(
                        {
                          ...data,
                          tasks: data.tasks.map((row) =>
                            row.id === t.id ? { ...row, status: "Done" } : row,
                          ),
                        },
                        "Task completed",
                      )
                    }
                  >
                    <Check size={14} />
                  </button>
                  <div>
                    <Link to={`/projects/${t.projectId}`}>{t.title}</Link>
                    <p>
                      {data.projects.find((p) => p.id === t.projectId)?.name}
                    </p>
                    <span className="overdue">
                      Due {dateLabel(t.dueDate).replace(/, \d{4}/, "")}
                    </span>
                  </div>
                </div>
              ))}
              {!summary.overdueTasks.length && (
                <p className="quiet-empty">
                  No overdue tasks on active projects.
                </p>
              )}
            </div>
          </section>
          <section
            className="ledger-schedule"
            aria-label="Upcoming project deadlines"
          >
            <SectionTitle
              title="Schedule"
              link="/projects?sort=deadline&scope=active"
              label="All deadlines"
            />
            <div className="deadline-list">
              {upcoming.map((p) => (
                <Link
                  className="deadline-item"
                  to={`/projects/${p.id}`}
                  key={p.id}
                >
                  <div className="date-tile">
                    <span>{dateLabel(p.deadline).split(" ")[0]}</span>
                    <strong>{Number(p.deadline.slice(-2))}</strong>
                  </div>
                  <div>
                    <h4>{p.name}</h4>
                    <p>{data.clients.find((c) => c.id === p.clientId)?.name}</p>
                  </div>
                  <ArrowRight size={15} />
                </Link>
              ))}
              {!upcoming.length && (
                <p className="quiet-empty">No upcoming project deadlines.</p>
              )}
            </div>
          </section>
        </aside>
        <section
          className="ledger-receivables"
          aria-label="Outstanding demonstration invoices"
        >
          <SectionTitle
            title="Accounts to follow up"
            link="/invoices?status=Sent"
            label="Invoice register"
          />
          <div className="receivable-register">
            {summary.outstandingInvoices.slice(0, 3).map((i) => (
              <Link
                className="receivable-row"
                to={`/invoices/${i.id}`}
                key={i.id}
              >
                <span className="invoice-ref">{i.number}</span>
                <span className="receivable-client">
                  {data.clients.find((c) => c.id === i.clientId)?.name}
                  <small>
                    Due {dateLabel(i.dueDate).replace(/, \d{4}/, "")}
                  </small>
                </span>
                <strong>{money(invoiceTotal(i))}</strong>
                <ArrowUpRight size={16} />
              </Link>
            ))}
            {!summary.outstandingInvoices.length && (
              <p className="quiet-empty">No outstanding sent invoices.</p>
            )}
          </div>
          <p className="register-footnote">
            Illustrative USD records. Sent is a recorded status; no email is
            delivered.
          </p>
        </section>
      </div>
      {focusedId && (
        <ProjectFocus
          projectId={focusedId}
          onClose={() => setFocusedId(null)}
        />
      )}
    </>
  );
}
