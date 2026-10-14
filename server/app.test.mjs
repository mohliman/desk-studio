import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDesk } from "./dist/index.mjs";
import { launch } from "./test-client.mjs";
test("DESK isolates workspaces, validates relationships, and detects concurrent edits", async (t) => {
  const { app, client, origin } = await launch(createDesk);
  t.after(() => app.close());
  const alice = client(),
    bob = client();
  assert.equal((await alice.request("/api/state")).status, 401);
  assert.equal(
    (await alice.register("alice@example.test", "Alice", true)).status,
    200,
  );
  assert.equal((await bob.register("bob@example.test", "Bob")).status, 200);
  const a = (await alice.request("/api/state")).body;
  const b = (await bob.request("/api/state")).body;
  assert.notEqual(a.workspace.id, b.workspace.id);
  assert.equal(b.data.clients.length, 0);
  assert.equal(
    (
      await bob.request("/api/state", "GET", undefined, {
        "X-Workspace-Id": a.workspace.id,
      })
    ).status,
    403,
  );
  const forged = await fetch(origin + "/api/state", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: alice.cookie() },
    body: JSON.stringify({ revision: 0, data: a.data }),
  });
  assert.equal(forged.status, 403);
  const bad = structuredClone(a.data);
  bad.projects[0].clientId = "outside";
  assert.equal(
    (
      await alice.request("/api/state", "PUT", {
        revision: a.revision,
        data: bad,
      })
    ).status,
    422,
  );
  const crossInvoice = structuredClone(a.data);
  crossInvoice.invoices[0].projectId = crossInvoice.projects.find(
    (p) => p.clientId !== crossInvoice.invoices[0].clientId,
  ).id;
  assert.equal(
    (
      await alice.request("/api/state", "PUT", {
        revision: a.revision,
        data: crossInvoice,
      })
    ).status,
    422,
  );
  const valid = structuredClone(a.data);
  valid.clients[0].name = "Saved studio client";
  assert.equal(
    (
      await alice.request("/api/state", "PUT", {
        revision: a.revision,
        data: valid,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await alice.request("/api/state", "PUT", {
        revision: a.revision,
        data: a.data,
      })
    ).status,
    409,
  );
  assert.equal(
    (await alice.request("/api/state")).body.data.clients[0].name,
    "Saved studio client",
  );
  assert.equal((await alice.request("/api/state")).body.activity.length, 2);
  const hostile = await alice.request(
    "/api/logout",
    "POST",
    {},
    { Origin: "https://evil.example" },
  );
  assert.equal(hostile.status, 403);
  assert.equal((await alice.request("/api/logout", "POST", {})).status, 200);
  assert.equal((await alice.request("/api/state")).status, 401);
});
test("DESK invitations are email-bound, one-use, and owner-only; assignment stays in the team", async (t) => {
  const { app, client } = await launch(createDesk);
  t.after(() => app.close());
  const owner = client(),
    member = client(),
    outsider = client();
  await owner.register("owner@example.test", "Owner", true);
  await member.register("member@example.test", "Member");
  await outsider.register("outsider@example.test");
  const studio = (await owner.request("/api/state")).body;
  const invite = await owner.request("/api/invitations", "POST", {
    email: "member@example.test",
  });
  assert.equal(invite.status, 200);
  assert.equal(
    (
      await outsider.request("/api/invitations/accept", "POST", {
        token: invite.body.token,
      })
    ).status,
    403,
  );
  const joined = await member.request("/api/invitations/accept", "POST", {
    token: invite.body.token,
  });
  assert.equal(joined.status, 200);
  assert.equal(
    (
      await member.request("/api/invitations/accept", "POST", {
        token: invite.body.token,
      })
    ).status,
    403,
  );
  const headers = { "X-Workspace-Id": studio.workspace.id };
  const shared = (await member.request("/api/state", "GET", undefined, headers))
    .body;
  assert.equal(shared.workspace.role, "member");
  assert.equal(
    (
      await member.request(
        "/api/invitations",
        "POST",
        { email: "other@example.test" },
        headers,
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await member.request(
        "/api/workspace",
        "PATCH",
        { name: "Hijacked" },
        headers,
      )
    ).status,
    403,
  );
  shared.data.tasks[0].assigneeId = shared.members.find(
    (m) => m.role === "member",
  ).id;
  const saved = await member.request(
    "/api/state",
    "PUT",
    { revision: shared.revision, data: shared.data },
    headers,
  );
  assert.equal(saved.status, 200);
  saved.body.data.tasks[0].assigneeId = "outside-team";
  assert.equal(
    (
      await owner.request("/api/state", "PUT", {
        revision: saved.body.revision,
        data: saved.body.data,
      })
    ).status,
    422,
  );
});
test("DESK records and sessions survive a server restart without exposing password/session secrets", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "desk-api-"));
  const databasePath = join(directory, "app.sqlite");
  const first = await launch(createDesk, { databasePath });
  const user = first.client();
  await user.register("persist@example.test", "Persist", true);
  const state = (await user.request("/api/state")).body;
  state.data.clients[0].name = "Survives restart";
  await user.request("/api/state", "PUT", {
    revision: state.revision,
    data: state.data,
  });
  const stored = first.app.db.prepare("SELECT password_hash FROM users").get();
  assert.ok(!stored.password_hash.includes("correct horse"));
  const session = first.app.db.prepare("SELECT token_hash FROM sessions").get();
  assert.ok(!user.cookie().includes(session.token_hash));
  await first.app.close();
  const second = await launch(createDesk, { databasePath });
  t.after(() => second.app.close());
  const response = await fetch(second.origin + "/api/state", {
    headers: { Cookie: user.cookie() },
  });
  assert.equal(response.status, 200);
  assert.equal(
    (await response.json()).data.clients[0].name,
    "Survives restart",
  );
});
