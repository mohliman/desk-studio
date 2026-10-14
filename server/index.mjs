import {
  createApplication,
  fail,
  listen,
  textValue,
  transaction,
  uid,
} from "./core.mjs";
import { createSeed } from "../src/domain/seed.ts";
import { isWorkspace } from "../src/storage/workspace.ts";

const schema = `
CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY, name TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS members(workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL CHECK(role IN ('owner','member')), PRIMARY KEY(workspace_id,user_id));
CREATE TABLE IF NOT EXISTS clients(workspace_id TEXT NOT NULL REFERENCES workspaces(id), id TEXT NOT NULL, record TEXT NOT NULL CHECK(json_valid(record)), PRIMARY KEY(workspace_id,id));
CREATE TABLE IF NOT EXISTS projects(workspace_id TEXT NOT NULL, id TEXT NOT NULL, client_id TEXT NOT NULL, record TEXT NOT NULL CHECK(json_valid(record)), PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,id,client_id), FOREIGN KEY(workspace_id,client_id) REFERENCES clients(workspace_id,id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS tasks(workspace_id TEXT NOT NULL, id TEXT NOT NULL, project_id TEXT NOT NULL, assignee_id TEXT, record TEXT NOT NULL CHECK(json_valid(record)), PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,project_id) REFERENCES projects(workspace_id,id) ON DELETE CASCADE, FOREIGN KEY(workspace_id,assignee_id) REFERENCES members(workspace_id,user_id));
CREATE TABLE IF NOT EXISTS invoices(workspace_id TEXT NOT NULL, id TEXT NOT NULL, client_id TEXT NOT NULL, project_id TEXT, number TEXT NOT NULL COLLATE NOCASE, record TEXT NOT NULL CHECK(json_valid(record)), PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,number), FOREIGN KEY(workspace_id,client_id) REFERENCES clients(workspace_id,id) ON DELETE CASCADE, FOREIGN KEY(workspace_id,project_id,client_id) REFERENCES projects(workspace_id,id,client_id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS invoice_items(workspace_id TEXT NOT NULL, invoice_id TEXT NOT NULL, id TEXT NOT NULL, position INTEGER NOT NULL, record TEXT NOT NULL CHECK(json_valid(record)), PRIMARY KEY(workspace_id,invoice_id,id), FOREIGN KEY(workspace_id,invoice_id) REFERENCES invoices(workspace_id,id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS invitations(token_hash TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), email TEXT NOT NULL, expires_at INTEGER NOT NULL, created_by TEXT NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS activity(id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), user_id TEXT NOT NULL REFERENCES users(id), description TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS members_user ON members(user_id);
CREATE INDEX IF NOT EXISTS activity_workspace ON activity(workspace_id,created_at);
INSERT OR IGNORE INTO schema_migrations VALUES(2,datetime('now'));`;
import { randomBytes, createHash } from "node:crypto";
const hash = (v) => createHash("sha256").update(v).digest("hex");
function readState(db, workspaceId) {
  const rows = (table) =>
    db
      .prepare(
        `SELECT record FROM ${table} WHERE workspace_id=? ORDER BY rowid`,
      )
      .all(workspaceId)
      .map((r) => JSON.parse(r.record));
  return {
    clients: rows("clients"),
    projects: rows("projects"),
    tasks: rows("tasks"),
    invoices: rows("invoices").map((i) => ({
      ...i,
      items: db
        .prepare(
          "SELECT record FROM invoice_items WHERE workspace_id=? AND invoice_id=? ORDER BY position",
        )
        .all(workspaceId, i.id)
        .map((r) => JSON.parse(r.record)),
    })),
  };
}
function writeState(db, workspaceId, state) {
  db.prepare("DELETE FROM clients WHERE workspace_id=?").run(workspaceId);
  for (const c of state.clients)
    db.prepare("INSERT INTO clients VALUES(?,?,?)").run(
      workspaceId,
      c.id,
      JSON.stringify(c),
    );
  for (const p of state.projects)
    db.prepare("INSERT INTO projects VALUES(?,?,?,?)").run(
      workspaceId,
      p.id,
      p.clientId,
      JSON.stringify(p),
    );
  for (const t of state.tasks)
    db.prepare("INSERT INTO tasks VALUES(?,?,?,?,?)").run(
      workspaceId,
      t.id,
      t.projectId,
      t.assigneeId ?? null,
      JSON.stringify(t),
    );
  for (const i of state.invoices) {
    const { items, ...invoice } = i;
    db.prepare("INSERT INTO invoices VALUES(?,?,?,?,?,?)").run(
      workspaceId,
      i.id,
      i.clientId,
      i.projectId,
      i.number,
      JSON.stringify(invoice),
    );
    items.forEach((item, position) =>
      db
        .prepare("INSERT INTO invoice_items VALUES(?,?,?,?,?)")
        .run(workspaceId, i.id, item.id, position, JSON.stringify(item)),
    );
  }
}
function audit(db, workspaceId, userId, description) {
  db.prepare("INSERT INTO activity VALUES(?,?,?,?,?)").run(
    uid(),
    workspaceId,
    userId,
    description,
    new Date().toISOString(),
  );
}
function listWorkspaces(db, userId) {
  return db
    .prepare(
      "SELECT w.id,w.name,w.revision,m.role FROM workspaces w JOIN members m ON m.workspace_id=w.id WHERE m.user_id=? ORDER BY w.rowid",
    )
    .all(userId);
}
function snapshot(db, workspace, userId) {
  return {
    data: readState(db, workspace.id),
    revision: workspace.revision,
    workspace,
    workspaces: listWorkspaces(db, userId),
    members: db
      .prepare(
        "SELECT u.id,u.name,u.email,m.role FROM members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? ORDER BY m.rowid",
      )
      .all(workspace.id),
    activity: db
      .prepare(
        "SELECT a.id,a.description,a.created_at AS createdAt,u.name AS actor FROM activity a JOIN users u ON u.id=a.user_id WHERE a.workspace_id=? ORDER BY a.rowid DESC LIMIT 50",
      )
      .all(workspace.id),
  };
}
const adapter = {
  name: "desk",
  initialize(db) {
    db.exec(schema);
  },
  register(db, user, body) {
    const id = uid();
    db.prepare("INSERT INTO workspaces(id,name) VALUES(?,?)").run(
      id,
      `${user.name}'s studio`,
    );
    db.prepare("INSERT INTO members VALUES(?,?,?)").run(id, user.id, "owner");
    writeState(
      db,
      id,
      body.demo === true
        ? createSeed()
        : { clients: [], projects: [], tasks: [], invoices: [] },
    );
    audit(db, id, user.id, "Created the workspace");
  },
  handle({ db, user, req, url, body }) {
    const path = url.pathname;
    if (path === "/api/invitations/accept" && req.method === "POST") {
      const token = textValue(body.token, "Invitation code", 100);
      return transaction(db, () => {
        const invite = db
          .prepare(
            "SELECT * FROM invitations WHERE token_hash=? AND expires_at>?",
          )
          .get(hash(token), Date.now());
        if (!invite || invite.email !== user.email)
          fail(
            403,
            "This invitation is invalid, expired, or belongs to another email address.",
          );
        db.prepare("INSERT OR IGNORE INTO members VALUES(?,?,?)").run(
          invite.workspace_id,
          user.id,
          "member",
        );
        db.prepare("DELETE FROM invitations WHERE token_hash=?").run(
          hash(token),
        );
        audit(db, invite.workspace_id, user.id, "Joined the workspace");
        return { workspaceId: invite.workspace_id };
      });
    }
    const selected = req.headers["x-workspace-id"];
    const workspace = selected
      ? db
          .prepare(
            "SELECT w.*,m.role FROM workspaces w JOIN members m ON m.workspace_id=w.id WHERE w.id=? AND m.user_id=?",
          )
          .get(selected, user.id)
      : listWorkspaces(db, user.id)[0];
    if (!workspace) fail(403, "You do not have access to this workspace.");
    if (path === "/api/state" && req.method === "GET")
      return snapshot(db, workspace, user.id);
    if (path === "/api/state" && req.method === "PUT") {
      if (
        !Number.isSafeInteger(body.revision) ||
        body.revision !== workspace.revision
      )
        fail(
          409,
          "This workspace changed in another session. Refresh the records before editing again.",
        );
      if (!isWorkspace(body.data))
        fail(
          422,
          "Some records are invalid. Check dates, invoice numbers, amounts, and related records.",
        );
      if (
        body.data.clients.some(
          (c) => c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email),
        )
      )
        fail(422, "Enter a valid client email address or leave it blank.");
      const members = new Set(
        db
          .prepare("SELECT user_id FROM members WHERE workspace_id=?")
          .all(workspace.id)
          .map((m) => m.user_id),
      );
      if (
        body.data.tasks.some(
          (t) => t.assigneeId != null && !members.has(t.assigneeId),
        )
      )
        fail(422, "Tasks can only be assigned to a member of this workspace.");
      return transaction(db, () => {
        const previous = readState(db, workspace.id);
        const changes = [];
        for (const table of ["clients", "projects", "tasks", "invoices"]) {
          const old = new Map(
            previous[table].map((r) => [r.id, JSON.stringify(r)]),
          );
          const fresh = new Map(
            body.data[table].map((r) => [r.id, JSON.stringify(r)]),
          );
          const added = [...fresh.keys()].filter((id) => !old.has(id)).length;
          const deleted = [...old.keys()].filter((id) => !fresh.has(id)).length;
          const edited = [...fresh.keys()].filter(
            (id) => old.has(id) && old.get(id) !== fresh.get(id),
          ).length;
          if (added || deleted || edited)
            changes.push(
              `${table}: ${added} added, ${edited} updated, ${deleted} removed`,
            );
        }
        writeState(db, workspace.id, body.data);
        db.prepare("UPDATE workspaces SET revision=revision+1 WHERE id=?").run(
          workspace.id,
        );
        if (changes.length)
          audit(db, workspace.id, user.id, changes.join("; "));
        return snapshot(
          db,
          { ...workspace, revision: workspace.revision + 1 },
          user.id,
        );
      });
    }
    if (path === "/api/invitations" && req.method === "POST") {
      if (workspace.role !== "owner")
        fail(403, "Only workspace owners can invite teammates.");
      const email = textValue(body.email, "Email", 254).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        fail(422, "Enter a valid email address.");
      const token = randomBytes(24).toString("hex");
      db.prepare(
        "DELETE FROM invitations WHERE workspace_id=? AND email=?",
      ).run(workspace.id, email);
      db.prepare("INSERT INTO invitations VALUES(?,?,?,?,?)").run(
        hash(token),
        workspace.id,
        email,
        Date.now() + 172800000,
        user.id,
      );
      audit(db, workspace.id, user.id, "Created a teammate invitation");
      return { token, expiresIn: "48 hours" };
    }
    if (path === "/api/workspace" && req.method === "PATCH") {
      if (workspace.role !== "owner")
        fail(403, "Only workspace owners can rename the workspace.");
      const name = textValue(body.name, "Workspace name", 100);
      db.prepare("UPDATE workspaces SET name=? WHERE id=?").run(
        name,
        workspace.id,
      );
      audit(db, workspace.id, user.id, "Renamed the workspace");
      return snapshot(db, { ...workspace, name }, user.id);
    }
    return undefined;
  },
};
export function createDesk(options = {}) {
  return createApplication(adapter, options);
}
if (process.argv[1]?.replaceAll("\\", "/").endsWith("/server/dist/index.mjs"))
  listen(createDesk(), 4100);
