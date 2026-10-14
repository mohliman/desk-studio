import * as Dialog from "@radix-ui/react-dialog";
import { useRef } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useWorkspace } from "../state/WorkspaceProvider";
import { dateLabel, money, today } from "../domain/logic";
import { Badge } from "../components/ui";
export function ProjectFocus({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const { data, update } = useWorkspace();
  const opener = useRef(document.activeElement as HTMLElement | null);
  const project = data.projects.find((p) => p.id === projectId);
  if (!project) return null;
  const client = data.clients.find((c) => c.id === project.clientId);
  const tasks = data.tasks.filter((t) => t.projectId === projectId);
  const done = tasks.filter((t) => t.status === "Done").length;
  const ref = String(
    data.projects.findIndex((p) => p.id === projectId) + 1,
  ).padStart(2, "0");
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="focus-overlay" />
        <Dialog.Content
          className="focus-panel"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus({ preventScroll: true });
          }}
        >
          <div className="focus-panel-top">
            <span>PROJECT / {ref}</span>
            <button
              className="icon-button"
              aria-label="Close project focus"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>
          <div className="focus-panel-heading">
            <Badge status={project.status} />
            <Dialog.Title>{project.name}</Dialog.Title>
            <Dialog.Description>
              {client?.name} · Complete the next steps without leaving the
              ledger.
            </Dialog.Description>
          </div>
          <div className="focus-facts">
            <div>
              <span>Deadline</span>
              <strong>{dateLabel(project.deadline)}</strong>
            </div>
            <div>
              <span>Budget · USD</span>
              <strong>{money(project.budgetCents)}</strong>
            </div>
          </div>
          {project.description && (
            <p className="focus-description">{project.description}</p>
          )}
          <div className="focus-progress">
            <div>
              <h3>Project progress</h3>
              <span>
                {done} of {tasks.length} complete
              </span>
            </div>
            <div className="progress-track">
              <div
                style={{
                  width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="focus-task-heading">
            <h3>Next steps</h3>
            <span>{tasks.length - done} open</span>
          </div>
          <div className="focus-task-list">
            {tasks.map((t) => (
              <div
                className={`focus-task ${t.status === "Done" ? "is-done" : ""}`}
                key={t.id}
              >
                <button
                  className={`task-check ${t.status === "Done" ? "checked" : ""}`}
                  aria-label={`${t.status === "Done" ? "Reopen" : "Complete"} ${t.title}`}
                  onClick={() =>
                    update(
                      {
                        ...data,
                        tasks: data.tasks.map((row) =>
                          row.id === t.id
                            ? {
                                ...row,
                                status: t.status === "Done" ? "To do" : "Done",
                              }
                            : row,
                        ),
                      },
                      t.status === "Done" ? "Task reopened" : "Task completed",
                    )
                  }
                >
                  <Check size={14} />
                </button>
                <div>
                  <strong>{t.title}</strong>
                  <p>{t.description}</p>
                  <span
                    className={
                      t.dueDate && t.dueDate < today() && t.status !== "Done"
                        ? "overdue"
                        : ""
                    }
                  >
                    {t.status === "Done"
                      ? "Complete"
                      : t.dueDate
                        ? `Due ${dateLabel(t.dueDate)}`
                        : "No due date"}
                  </span>
                </div>
              </div>
            ))}
            {!tasks.length && (
              <p className="quiet-empty">
                No tasks yet. Open the project to add its first step.
              </p>
            )}
          </div>
          <Link
            className="focus-panel-footer"
            to={`/projects/${projectId}`}
            onClick={onClose}
          >
            Open full project <ArrowRight size={18} />
          </Link>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
