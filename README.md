# DESK

A full-stack studio workspace with authenticated accounts, shared studios, clients, projects, task assignments, invoices, and activity history. React + TypeScript frontend, Node 24 API, and persistent SQLite storage.

[Open the live app](https://baqir-desk-studio.onrender.com). Hosted on Render's free Node compute with a separate Turso database. Create an account and choose sample records or an empty workspace. Free compute sleeps during inactivity, so the first visit can take 50 seconds or more.

## Run

```powershell
npm ci
npm run dev
```

React UI: http://127.0.0.1:5174. For a single compiled server, run `npm run build` followed by `npm start` and open http://127.0.0.1:4100. Create your own account and optionally choose sample records.

## Check

```powershell
npm test
npm run test:server
npm run test:fullstack
```

See [full-stack setup, architecture, migration, verification, and deployment](docs/fullstack.md). The prior browser-only README is retained in [frontend history](docs-frontend-history.md). Invoices are stored records; email delivery and payments are not implemented.
