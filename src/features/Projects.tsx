import { useState } from "react";
import {
  ArrowUpRight,
  Archive,
  ArrowLeft,
  List,
  Columns3,
  Pencil,
  Trash2,
  Check,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  PanelRightOpen,
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Project, Task } from "../domain/types";
import { projectStatuses, taskStatuses } from "../domain/types";
import { dateLabel, filterProjects, money, today } from "../domain/logic";
import { useWorkspace } from "../state/WorkspaceProvider";
import {
  AddButton,
  Badge,
  Empty,
  PageHeader,
  SearchBox,
  SectionTitle,
} from "../components/ui";
import { ProjectForm, TaskForm } from "./forms";
import { ProjectFocus } from "./ProjectFocus";
export function Projects() {
  const { data } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Project>();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const sort = params.get("sort");
  const descending = params.get("direction") === "desc";
  const archived = params.get("archive") === "1";
  const newOpen = params.get("new") === "1";
  let rows = filterProjects(data.projects, query, status, archived, data);
  if (params.get("scope") === "active")
    rows = rows.filter((p) => p.status !== "Complete");
  if (sort === "name" || sort === "deadline" || sort === "budget")
    rows = [...rows].sort((a, b) => {
      const comparison =
        sort === "budget"
          ? a.budgetCents - b.budgetCents
          : sort === "name"
            ? a.name.localeCompare(b.name)
            : a.deadline.localeCompare(b.deadline);
      return descending ? -comparison : comparison;
    });
  const sortColumn = (key: string, label: string, numeric = false) => (
    <th
      className={numeric ? "numeric" : undefined}
      aria-sort={
        sort === key ? (descending ? "descending" : "ascending") : "none"
      }
    >
      <button
        className="column-sort"
        aria-label={`Sort by ${key === "name" ? "project name" : key}`}
        onClick={() => {
          const next = new URLSearchParams(params);
          next.set("sort", key);
          next.set("direction", sort === key && !descending ? "desc" : "asc");
          setParams(next);
        }}
      >
        {label}
        {sort === key ? (
          descending ? (
            <ArrowDown size={13} />
          ) : (
            <ArrowUp size={13} />
          )
        ) : (
          <ArrowUpDown size={13} />
        )}
      </button>
    </th>
  );
  const close = () => {
    setEditing(undefined);
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next);
  };
  return (
    <>
      <PageHeader
        eyebrow="PROJECT REGISTER"
        title="Projects"
        description="Track scope, deadlines and delivery."
        action={
          <AddButton
            onClick={() =>
              setParams({ ...Object.fromEntries(params), new: "1" })
            }
          >
            New project
          </AddButton>
        }
      />
      <div className="toolbar">
        <div className="tabs">
          <button
            className={!archived ? "active" : ""}
            onClick={() => setParams({})}
          >
            Current{" "}
            <span>{data.projects.filter((p) => !p.archived).length}</span>
          </button>
          <button
            className={archived ? "active" : ""}
            onClick={() => setParams({ archive: "1" })}
          >
            Archived{" "}
            <span>{data.projects.filter((p) => p.archived).length}</span>
          </button>
        </div>
        <div className="filters">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search projects or clients"
          />
          <select
            aria-label="Filter project status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="All">All statuses</option>
            {projectStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      {params.get("scope") === "active" && (
        <div className="filter-note">
          Showing active projects{" "}
          <button className="text-link" onClick={() => setParams({})}>
            Clear filter
          </button>
        </div>
      )}
      <div className="table-wrap project-register-table">
        <table>
          <thead>
            <tr>
              {sortColumn("name", "Project / client")}
              <th>Status</th>
              <th>Progress</th>
              {sortColumn("deadline", "Deadline")}
              {sortColumn("budget", "Budget", true)}
              <th>
                <span className="sr-only">Project actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const tasks = data.tasks.filter((t) => t.projectId === p.id);
              const done = tasks.filter((t) => t.status === "Done").length;
              return (
                <tr key={p.id}>
                  <td>
                    <Link className="table-title" to={`/projects/${p.id}`}>
                      {p.name}
                    </Link>
                    <p className="muted small">
                      {data.clients.find((c) => c.id === p.clientId)?.name}
                    </p>
                  </td>
                  <td>
                    <Badge status={p.status} />
                  </td>
                  <td>
                    <div className="table-progress">
                      <span>
                        {done} / {tasks.length}
                      </span>
                      <div className="progress-track">
                        <div
                          style={{
                            width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        p.deadline < today() && p.status !== "Complete"
                          ? "overdue"
                          : ""
                      }
                    >
                      {dateLabel(p.deadline)}
                    </span>
                  </td>
                  <td className="numeric">{money(p.budgetCents)}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Focus ${p.name}`}
                        title="Focus project"
                        onClick={() => setFocusedId(p.id)}
                      >
                        <PanelRightOpen size={17} />
                      </button>
                      <Link
                        className="icon-button"
                        aria-label={`Open ${p.name}`}
                        to={`/projects/${p.id}`}
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <Empty
            title={
              query || status !== "All"
                ? "No projects found"
                : archived
                  ? "Nothing in the archive"
                  : "Your next idea starts here"
            }
            description={
              query || status !== "All"
                ? "Try a different search or status filter."
                : archived
                  ? "Archived projects stay here with their tasks and invoices."
                  : "Create a client, then start your first project."
            }
          />
        )}
      </div>
      <p className="table-caption">
        {rows.length} project{rows.length !== 1 ? "s" : ""} · Sort by a column
        heading. Budgets in illustrative USD.
      </p>
      {(newOpen || editing) && (
        <ProjectForm project={editing} onClose={close} />
      )}
      {focusedId && (
        <ProjectFocus
          projectId={focusedId}
          onClose={() => setFocusedId(null)}
        />
      )}
    </>
  );
}
function TaskCard({
  task,
  onEdit,
  onDelete,
  list = false,
}: {
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  list?: boolean;
}) {
  const { data, update, members, busy } = useWorkspace();
  return (
    <article className={`task-card ${list ? "task-list-row" : ""}`}>
      <button
        className={`task-check ${task.status === "Done" ? "checked" : ""}`}
        aria-label={`${task.status === "Done" ? "Reopen" : "Complete"} ${task.title}`}
        onClick={() =>
          update(
            {
              ...data,
              tasks: data.tasks.map((t) =>
                t.id === task.id
                  ? { ...t, status: t.status === "Done" ? "To do" : "Done" }
                  : t,
              ),
            },
            task.status === "Done" ? "Task reopened" : "Task completed",
          )
        }
      >
        <Check size={13} />
      </button>
      <div className="task-body">
        <button
          className={`task-title ${task.status === "Done" ? "done" : ""}`}
          onClick={onEdit}
        >
          {task.title}
        </button>
        {task.description && <p>{task.description}</p>}
        <span
          className={
            task.dueDate && task.dueDate < today() && task.status !== "Done"
              ? "overdue"
              : "muted"
          }
        >
          {task.dueDate ? dateLabel(task.dueDate) : "No due date"}
        </span>
      </div>
      <div className="task-controls">
        <select
          aria-label={`Assignee for ${task.title}`}
          value={task.assigneeId ?? ""}
          disabled={busy}
          onChange={(e) =>
            void update(
              {
                ...data,
                tasks: data.tasks.map((t) =>
                  t.id === task.id
                    ? { ...t, assigneeId: e.target.value || null }
                    : t,
                ),
              },
              "Task assignment updated",
            )
          }
        >
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          aria-label={`Status for ${task.title}`}
          value={task.status}
          onChange={(e) =>
            update(
              {
                ...data,
                tasks: data.tasks.map((t) =>
                  t.id === task.id
                    ? { ...t, status: e.target.value as Task["status"] }
                    : t,
                ),
              },
              "Task status updated",
            )
          }
        >
          {taskStatuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <div>
          <button
            className="icon-button"
            aria-label={`Edit ${task.title}`}
            onClick={onEdit}
          >
            <Pencil size={14} />
          </button>
          <button
            className="icon-button danger-text"
            aria-label={`Delete ${task.title}`}
            onClick={onDelete}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}
export function ProjectDetail() {
  const { id: projectId } = useParams();
  const { data, update } = useWorkspace();
  const project = data.projects.find((p) => p.id === projectId);
  const [edit, setEdit] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task>();
  const [view, setView] = useState<"board" | "list">("board");
  const [query, setQuery] = useState("");
  if (!project)
    return (
      <Empty
        title="Project not found"
        description="This record may have been removed by a workspace reset."
        action={
          <Link className="button" to="/projects">
            Back to projects
          </Link>
        }
      />
    );
  const tasks = data.tasks.filter((t) => t.projectId === project.id);
  const filtered = tasks.filter((t) =>
    `${t.title} ${t.description}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const done = tasks.filter((t) => t.status === "Done").length;
  const client = data.clients.find((c) => c.id === project.clientId)!;
  const taskCard = (t: Task, list = false) => (
    <TaskCard
      key={t.id}
      task={t}
      list={list}
      onEdit={() => {
        setEditingTask(t);
        setTaskOpen(true);
      }}
      onDelete={() => {
        if (window.confirm(`Delete “${t.title}”? This cannot be undone.`))
          update(
            { ...data, tasks: data.tasks.filter((row) => row.id !== t.id) },
            "Task deleted",
          );
      }}
    />
  );
  return (
    <>
      <Link className="back-link" to="/projects">
        <ArrowLeft size={15} />
        All projects
      </Link>
      <PageHeader
        eyebrow={client.name.toUpperCase()}
        title={project.name}
        description={
          project.description || "A project with room to take shape."
        }
        action={
          <button className="button" onClick={() => setEdit(true)}>
            <Pencil size={15} />
            Edit project
          </button>
        }
      />
      <div className="detail-strip">
        <div>
          <span>Status</span>
          <Badge status={project.archived ? "Archived" : project.status} />
        </div>
        <div>
          <span>Client</span>
          <Link to={`/clients/${client.id}`}>
            {client.name}
            <ArrowUpRight size={13} />
          </Link>
        </div>
        <div>
          <span>Budget · illustrative USD</span>
          <strong>{money(project.budgetCents)}</strong>
        </div>
        <div>
          <span>Deadline</span>
          <strong>{dateLabel(project.deadline)}</strong>
        </div>
        <div>
          <span>Progress</span>
          <strong>
            {done} of {tasks.length} complete
          </strong>
        </div>
      </div>
      {project.archived && (
        <div className="notice">
          This project is archived. Its records are retained and can still be
          edited.
        </div>
      )}
      <SectionTitle title="Tasks" count={tasks.length} />
      <div className="task-toolbar">
        <div className="view-toggle">
          <button
            className={view === "board" ? "active" : ""}
            aria-pressed={view === "board"}
            onClick={() => setView("board")}
          >
            <Columns3 size={15} />
            Board
          </button>
          <button
            className={view === "list" ? "active" : ""}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            <List size={15} />
            List
          </button>
        </div>
        <div className="filters">
          <SearchBox
            value={query}
            onChange={setQuery}
            placeholder="Search tasks"
          />
          <AddButton
            onClick={() => {
              setEditingTask(undefined);
              setTaskOpen(true);
            }}
          >
            Add task
          </AddButton>
        </div>
      </div>
      {!filtered.length ? (
        <Empty
          title={query ? "No matching tasks" : "One step at a time"}
          description={
            query
              ? "Try another search."
              : "Add a task to give this project a clear next step."
          }
        />
      ) : view === "board" ? (
        <div className="task-board">
          {taskStatuses.map((status) => (
            <section className="board-column" key={status}>
              <div className="board-heading">
                <Badge status={status} />
                <span>
                  {filtered.filter((t) => t.status === status).length}
                </span>
              </div>
              {filtered
                .filter((t) => t.status === status)
                .map((t) => taskCard(t))}
              {!filtered.some((t) => t.status === status) && (
                <p className="board-empty">No tasks here yet.</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <div className="task-list">
          {filtered.map((t) => taskCard(t, true))}
        </div>
      )}
      <div className="archive-bar">
        <p>
          {project.archived
            ? "Ready to pick this up again?"
            : "Finished for now? Archive to clear your desk."}
        </p>
        <button
          className="button"
          disabled={project.archived && client.archived}
          onClick={() => {
            if (
              window.confirm(
                project.archived
                  ? "Restore this project to your current projects?"
                  : "Archive this project? Tasks and invoices will be retained.",
              )
            )
              update(
                {
                  ...data,
                  projects: data.projects.map((p) =>
                    p.id === project.id ? { ...p, archived: !p.archived } : p,
                  ),
                },
                project.archived ? "Project restored" : "Project archived",
              );
          }}
        >
          <Archive size={15} />
          {project.archived ? "Restore project" : "Archive project"}
        </button>
        {project.archived && client.archived && (
          <small>Restore the client first.</small>
        )}
      </div>
      {edit && <ProjectForm project={project} onClose={() => setEdit(false)} />}{" "}
      {taskOpen && (
        <TaskForm
          task={editingTask}
          projectId={project.id}
          onClose={() => setTaskOpen(false)}
        />
      )}
    </>
  );
}
export function Tasks() {
  const { data, update } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Task>();
  const overdue = params.get("filter") === "overdue";
  const activeIds = new Set(
    data.projects
      .filter((p) => !p.archived && p.status !== "Complete")
      .map((p) => p.id),
  );
  const rows = data.tasks.filter(
    (t) =>
      activeIds.has(t.projectId) &&
      (!overdue || (t.status !== "Done" && t.dueDate && t.dueDate < today())) &&
      t.title.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="TASK REGISTER"
        title="Tasks"
        description="Open steps across current projects."
      />
      <div className="toolbar">
        <div className="tabs">
          <button
            className={!overdue ? "active" : ""}
            onClick={() => setParams({})}
          >
            All active tasks
          </button>
          <button
            className={overdue ? "active" : ""}
            onClick={() => setParams({ filter: "overdue" })}
          >
            Overdue
          </button>
        </div>
        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Search tasks"
        />
      </div>
      <div className="task-list">
        {rows.map((t) => (
          <div key={t.id}>
            <Link className="task-project-link" to={`/projects/${t.projectId}`}>
              {data.projects.find((p) => p.id === t.projectId)?.name}
              <ArrowUpRight size={13} />
            </Link>
            <TaskCard
              task={t}
              list
              onEdit={() => setEditing(t)}
              onDelete={() => {
                if (
                  window.confirm(`Delete “${t.title}”? This cannot be undone.`)
                )
                  update(
                    {
                      ...data,
                      tasks: data.tasks.filter((row) => row.id !== t.id),
                    },
                    "Task deleted",
                  );
              }}
            />
          </div>
        ))}
      </div>
      {!rows.length && (
        <Empty
          title={query ? "No tasks found" : "All clear"}
          description={
            query
              ? "Try another search."
              : "No tasks need your attention in this view."
          }
        />
      )}{" "}
      {editing && (
        <TaskForm
          task={editing}
          projectId={editing.projectId}
          onClose={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
