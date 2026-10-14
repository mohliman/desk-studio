import { useState, type FormEvent } from "react";
import { createSeed } from "../domain/seed";
import { useWorkspace } from "../state/WorkspaceProvider";
import { PageHeader } from "../components/ui";
import { isWorkspace } from "../storage/workspace";
export function Settings() {
  const { workspace, members, activity, update, refresh, request, busy } =
    useWorkspace();
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [pending, setPending] = useState(false);
  async function run(action: () => Promise<void>) {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  async function invite(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    await run(async () => {
      const result = await request<{ token: string }>(
        "/api/invitations",
        "POST",
        { email },
      );
      setToken(result.token);
      await refresh();
    });
  }
  return (
    <>
      <PageHeader
        eyebrow="WORKSPACE / TEAM & ACCOUNT"
        title="Settings"
        description="A shared home for your studio's work."
      />
      {error && (
        <p className="server-message" role="alert">
          {error}
        </p>
      )}
      <section className="settings-panel">
        <div>
          <h2>{workspace.name}</h2>
          <p>
            Your role: {workspace.role}. Changes are saved to the studio
            database.
          </p>
          {workspace.role === "owner" && (
            <form
              className="team-form"
              onSubmit={(e) => {
                e.preventDefault();
                const name = new FormData(e.currentTarget).get("name");
                void run(async () => {
                  await request("/api/workspace", "PATCH", { name });
                  await refresh();
                });
              }}
            >
              <label>
                Workspace name
                <input
                  name="name"
                  defaultValue={workspace.name}
                  maxLength={100}
                  required
                />
              </label>
              <button className="button" disabled={busy || pending}>
                Save name
              </button>
            </form>
          )}
        </div>
      </section>
      <section className="settings-panel">
        <div>
          <h2>The people behind the work</h2>
          <ul className="team-list">
            {members.map((m) => (
              <li key={m.id}>
                <strong>{m.name}</strong>
                <span>
                  {m.email} · {m.role}
                </span>
              </li>
            ))}
          </ul>
          {workspace.role === "owner" && (
            <form className="team-form" onSubmit={invite}>
              <label>
                Teammate's email
                <input type="email" name="email" maxLength={254} required />
              </label>
              <button className="button" disabled={busy || pending}>
                Create invitation
              </button>
            </form>
          )}
          {token && (
            <div className="invitation-result">
              <p>
                Share this code with your teammate. They can create an account
                with the invited email and paste it below. Valid for 48 hours.
              </p>
              <code>{token}</code>
              <button
                className="button secondary"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(token)
                    .catch(() =>
                      setError("Select and copy the invitation code."),
                    )
                }
              >
                Copy code
              </button>
            </div>
          )}
          <form
            className="team-form"
            onSubmit={(e) => {
              e.preventDefault();
              const token = new FormData(e.currentTarget).get("token");
              void run(async () => {
                const result = await request<{ workspaceId: string }>(
                  "/api/invitations/accept",
                  "POST",
                  { token },
                );
                await refresh(result.workspaceId);
              });
            }}
          >
            <label>
              Join an invited workspace
              <input
                name="token"
                placeholder="Paste your invitation code"
                required
                maxLength={100}
              />
            </label>
            <button className="button secondary" disabled={busy || pending}>
              Join workspace
            </button>
          </form>
        </div>
      </section>
      <section className="settings-panel">
        <div>
          <h2>Activity history</h2>
          <p>The latest 50 changes in this workspace.</p>
          <ol className="activity-list">
            {activity.map((a) => (
              <li key={a.id}>
                <strong>{a.actor}</strong>
                <p>{a.description}</p>
                <time dateTime={a.createdAt}>
                  {new Date(a.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ol>
        </div>
      </section>
      {workspace.role === "owner" && (
        <section className="settings-panel reset-panel">
          <div>
            <h2>Sample workspace</h2>
            <p>
              Replace this workspace's records with fictional clients, projects,
              tasks, and invoices.
            </p>
            <button
              className="button danger"
              disabled={busy || pending}
              onClick={() => {
                if (
                  window.confirm(
                    "Replace all records in this shared workspace with sample records?",
                  )
                )
                  void update(createSeed(), "Sample records loaded");
              }}
            >
              Load sample records
            </button>
          </div>
        </section>
      )}
      <section className="settings-panel">
        <div>
          <h2>Bring your earlier work along</h2>
          <p>
            Import the records saved by the previous browser-only version on
            this device.
          </p>
          <button
            className="button secondary"
            disabled={busy || pending}
            onClick={() =>
              void run(async () => {
                let saved;
                try {
                  saved = JSON.parse(
                    localStorage.getItem("desk.workspace") ?? "null",
                  );
                } catch {
                  throw new Error(
                    "The earlier browser records could not be read.",
                  );
                }
                if (saved?.version !== 1 || !isWorkspace(saved.data))
                  throw new Error(
                    "No valid records from the earlier version were found in this browser.",
                  );
                if (
                  window.confirm(
                    "Replace this shared workspace with the records from this browser?",
                  )
                )
                  await update(saved.data, "Earlier browser records imported");
              })
            }
          >
            Import browser records
          </button>
        </div>
      </section>
    </>
  );
}
