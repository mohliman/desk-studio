# DESK full-stack implementation

DESK now uses authenticated accounts and a Node 24 server. The React UI keeps its studio-ledger design. SQLite stores users, hashed sessions, workspaces, memberships, clients, projects, tasks, invoices, line items, invitations, and activity records.

## Local use

From the project folder:

```powershell
npm ci
npm run dev
```

The React development UI runs at `http://127.0.0.1:5174`; its `/api` requests are proxied to the backend at port 4100. Vite prints a different port if 5174 is already occupied.

To run the compiled app with one server:

```powershell
npm run build
npm start
```

Open `http://127.0.0.1:4100`. Create your own account; there are no embedded credentials. Choose sample records at registration or start empty. Each new account owns a studio. Settings lets owners invite teammates by email, rename the studio, and review activity. The invited teammate signs up using the invited email, then joins by pasting the invitation code in Settings. Codes expire after 48 hours and can be used once. No invitation email is sent automatically.

The studio selector switches among workspaces the current user belongs to. Members can edit records and assign tasks to other members; only owners can issue invitations or rename the studio. Refresh records retrieves teammate changes. Edits carry a revision number: a stale edit returns a conflict instead of overwriting newer records. The failed form stays open and offers refresh, so the user can review and retry.

## Previous browser records

The former `desk.workspace` localStorage key remains untouched. Settings offers **Import browser records**, with validation and a replacement confirmation. Import must happen from the same browser and origin that held the earlier records. A new port is a different origin. To import records from the earlier development origin, use the React dev UI on that exact port, with the backend running.

## Architecture and API

- `server/core.mjs`: HTTP server, account registration, authentication, cookies, CSRF checks, security headers, rate limits, and static-file serving.
- `server/index.mjs`: domain endpoints, relational schema, transactional persistence, and activity history.
- `scripts/build-server.mjs`: bundles the existing TypeScript domain validators and seed generator with the Node adapter.
- `src/account/`: shared account gate and API client.
- `src/state/WorkspaceProvider.tsx`: server snapshots, save feedback, workspace selection, and conflict handling.

API endpoints:

| Method | Path | Behaviour |
|---|---|---|
| GET | `/api/health` | Readiness check |
| GET | `/api/session` | Current user and CSRF token |
| POST | `/api/register`, `/api/login`, `/api/logout` | Account/session lifecycle |
| GET, PUT | `/api/state` | Read/save the current workspace with a revision |
| PATCH | `/api/workspace` | Owner-only workspace rename |
| POST | `/api/invitations` | Owner-only invitation creation |
| POST | `/api/invitations/accept` | Redeem an email-bound invitation |

Workspace endpoints check membership for `X-Workspace-Id`; an omitted header selects the first accessible workspace. Saves validate the entire domain state, including amounts, dates, unique invoice numbers, foreign-key relationships, valid client emails, and assignee membership. SQL operations use bound parameters. Composite foreign keys prevent cross-workspace references. A transaction saves the records, increments the revision, and records the activity together.

Passwords use asynchronous scrypt with random salts. Raw session secrets and invitation codes are not stored; only their SHA-256 hashes are stored. Sessions expire after seven days and are revoked on logout. Cookies are HttpOnly and SameSite=Strict; HTTPS configuration adds Secure. Mutation requests require JSON, a CSRF token, and an allowed origin. The browser receives success feedback after the database acknowledges a change.

## Verification

```powershell
npm test
npm run test:server
npm run test:fullstack
```

The verified implementation passed 16 existing domain/storage tests, 3 backend integration scenarios, and 8 browser workflow checks. Backend checks exercise unauthorized reads, cross-workspace denial, CSRF/origin rejection, invalid relations, concurrent edits, owner/member permissions, invitation binding/reuse, assignment validation, logout, and persistence across server restarts. Browser checks cover registration, client creation, reload, invitations, assignment, sign-out/sign-in, and six routes at 390px. The desktop overview axe scan returned zero WCAG A/AA violations. Evidence is saved in `verification/fullstack/`; this is not a full accessibility or security audit.

## Original local deployment option

The server serves both UI and API from one origin. Deploy it to a Node 24 host or use the included Dockerfile with a persistent `/data` volume. Set:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
APP_ORIGIN=https://your-public-domain
DATABASE_PATH=/data/app.sqlite
```

Production startup requires an HTTPS APP_ORIGIN. The reverse proxy must terminate HTTPS; the backend can listen over internal HTTP. This implementation is designed for a single application instance sharing one persistent SQLite database. A container's temporary filesystem is not durable storage. Back up the database with SQLite's online backup mechanism or while the app is stopped; include the WAL consistently if copying a running database. Migrations are tracked in `schema_migrations`; the schema initializes automatically on first start.

Docker packaging was prepared but not executed. The live app is hosted at https://baqir-desk-studio.onrender.com using free Render compute and Turso storage. Email ownership verification, password recovery, managed backups, and operational monitoring remain production work. Invitation binding uses account email, which is not externally verified in this portfolio version. Invoice statuses track records; no email delivery or payment processing is implemented.

## Free Render + Turso deployment

The current `render.yaml` selects free Render compute and has no paid disk. Configure a separate free Turso database for each app. Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Render's environment settings; never commit these credentials. The official `libsql` driver connects directly to the hosted SQLite-compatible database, so records and sessions do not depend on Render's temporary filesystem.

The app uses `RENDER_EXTERNAL_URL` for HTTPS cookie and origin configuration when `APP_ORIGIN` is omitted. It refuses to start on Render if hosted database configuration is missing. Free Render services can sleep when idle; the next request may wait for a cold start. Free database limits still apply, and paid plans/overages must remain disabled.

Local development continues to use Node's built-in SQLite by default. To verify the optional driver locally in PowerShell, set `$env:DATABASE_DRIVER='libsql'` and run `npm run test:server`. This uses a local test database through the same compatible driver. Real remote persistence must also be checked after the service and hosted database are configured.

