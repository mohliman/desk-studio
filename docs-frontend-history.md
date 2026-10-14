# DESK

DESK is an independent portfolio concept: a working, browser-local client and project workspace for a fictional creative studio. It opens directly into the application. All people, companies and records are fictional; no commercial adoption or client results are claimed.

## Setup

Requires Node.js 22.12+ (verified on Node.js 24.16) and npm.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite. The verified preview is **http://127.0.0.1:5174/**; Vite automatically chooses another port if its default is occupied.

```sh
npm test
npm run build
npm run verify
npm run test:a11y
npm run test:design
npm run format
```

The browser verification scripts require an installed Microsoft Edge and a running preview at port 5174. They use an isolated, headless browser context and never edit the user’s browser profile. All browser verification scripts accept `DESK_PREVIEW_URL` to select another local server and write evidence to `verification/`.

## Structure

```text
src/
  domain/       Types, seed records, pure calculations, filters and tests
  storage/      Schema validation, versioned persistence and recovery tests
  state/        Workspace context, persistence feedback and notices
  components/   Shared fields, dialog, badges, search and empty states
  features/     Overview, projects/tasks, clients, invoices, settings and forms
  App.tsx       Responsive navigation and routes
  styles.css    Tailwind entry and shared UI foundations
  ledger.css    Studio ledger art direction, responsive detail and print treatment
scripts/        Repeatable browser and accessibility verification
verification/  Screenshots, print PDF and machine-readable check results
```

React, TypeScript and Vite form the application foundation. Tailwind CSS v4 is integrated through its Vite plugin, with a custom stylesheet for DESK’s visual system. React Router handles navigation. Radix Dialog supplies modal semantics, focus trapping and keyboard behavior. A small React context is sufficient for this local workspace; there is no artificial server layer.

## Design system

DESK uses a studio-ledger composition: numbered project records, ruled client/account registers, warm paper and a forest-green navigation rail. Locally served Newsreader names the work; IBM Plex Sans carries the interface; IBM Plex Mono aligns dates, references and monetary amounts. Tables and task columns retain conventional controls. Mobile prioritises overdue work and gives task text a separate row from its controls.

The overview and project register's **Focus** controls opens a project side panel for immediate task completion and reopening. Its progress updates in both the panel and the ledger, and changes persist. Project column headings sort by name, deadline or budget, preserve direction in the URL and expose `aria-sort`. Client dossiers bring project progress and outstanding demonstration amounts together. Mobile invoice detail shows labelled quantity, unit price and amount records, while printing retains the tabular document. The panel traps keyboard focus, closes with Escape and restores its opener. A short edge slide explains its relationship to the register; reduced motion disables it. See `CASE_STUDY.md` for the five design decisions and three redesigned generic elements.

## Model and persistence

- A client owns projects and invoice records.
- A project belongs to exactly one client and owns tasks.
- A task belongs to exactly one project.
- An invoice belongs to a client and optionally a project belonging to that same client. Its line items have a description, positive whole quantity and unit price in integer cents.
- Budgets and invoice prices are integer cents. Invoice totals multiply and sum cents; decimal input is parsed directly, rather than using floating-point dollar arithmetic. Amounts are illustrative USD. Excessively large totals are rejected before saving.
- Dates are `YYYY-MM-DD` strings. Comparisons use these strings; display constructs a local calendar date from its year, month and day, avoiding UTC date shifts. Sample deadlines are relative to the browser’s current calendar day.

The storage key is `desk.workspace`, containing `{ version: 1, data }`. Reads validate structure, enum states, amounts, dates, unique IDs and invoice numbers, and foreign-key relationships. Invalid JSON, unsupported versions or malformed records load fresh sample data with an explanatory notice. Disabled storage and write/quota failures produce a visible notice; current-tab changes remain usable, but are not claimed to be persisted.

Summaries are calculated from records: active projects exclude archived and completed projects; overdue tasks are unfinished tasks on active projects; outstanding invoices include **Sent** records, excluding Draft and Paid. Archiving a client archives its projects and preserves tasks and invoices. Restoring a client keeps its projects archived until each is restored. Invoices remain in financial summaries after a client or project is archived.

## Workflows

1. Create a fictional client in Clients.
2. Create a project with client, description, status, budget and deadline.
3. Add tasks from the project detail; edit, complete, change status or delete them in board/list views.
4. Create an invoice, optionally associate the project, and add quantity/price line items.
5. Move its local status through Draft, Sent and Paid. **Sent never delivers an email; Paid never processes a payment.**
6. Use Focus on an overview project to complete or reopen tasks, or follow the derived overview links to projects, overdue tasks and outstanding invoices.
7. Archive/restore records or reset to the fictional sample workspace from Settings.

Invoice detail supports a clean browser print layout. The generated print PDF is illustrative, with clear demonstration labeling and no payment instructions.

## Accessibility and interaction

Semantic navigation, headings, tables and native form controls establish a useful baseline. Status is communicated in text as well as color. Fields have explicit labels, errors associated with `aria-describedby`, invalid state and a focused error summary. Success messages use a live status region. Dialogs set initial input focus, trap focus, support Escape and restore focus to their opener. Unsaved edits require a discard decision on cancellation, outside-click or Escape, and register a browser unload guard. Destructive operations use native confirmation dialogs.

The workspace provides keyboard focus indicators, a skip link, route focus management, searchable no-results states, retained archived records and mobile navigation. Browser Back/Forward navigation is blocked while a form is dirty until the user chooses to keep or discard the edits. Tables scroll within their container on narrow screens; mobile forms use full-width, 16px controls. Reduced-motion preferences disable transitions and animation.

## Verification

See `verification/results.json` and `verification/accessibility.json` for the most recent browser evidence. The final production build passes, as do 16 focused tests. Tests cover invoice math, paid totals, date validity, client archive relationships, project filters, persistence round trips, invalid/outdated recovery and blocked storage. The browser script exercises create client → create project → add/complete tasks → create invoice → mark paid → overview changes → reload, plus edits, discard/keep cancellation, browser Back protection, task deletion, archives/restores, invalid input, search, reset/cancel reset and invalid JSON recovery.

All 23 browser workflow checks passed. Desktop (1440 × 1000) and mobile (390 × 844) screenshots and a print PDF are captured in `verification/`. Automated WCAG 2.0/2.1 A/AA scans report zero violations across 16 route, dialog and validation-state inspections; dialog keyboard checks also pass. These complement visual inspection and are not a full accessibility certification. Physical-device touch, screen-reader usability, printer output, cross-browser coverage and production hosting were not tested.

The design suite reports 12 passing checks in `verification/design-after/results.json`: fonts, live progress, keyboard focus, persistence, reduced motion, mobile panel composition, register sorting and filtering, derived client accounts, mobile invoice semantics and print behavior. Page-overflow checks cover seven routes at 320, 390, 768 and 1100 pixels. Additional mobile accessibility evidence is in `verification/design-after/refinement-accessibility.json`. Final rendered captures in `verification/design-refinement/` were visually inspected; checks ran against the stable production preview. The development preview remains at port 5174.

## Boundaries and a real backend

This is a **single-browser demonstration without authentication, cloud backup or team synchronisation**. Use sample data only. Anyone with this browser profile can read its local data; clearing browser site data removes it. There is no secure server storage, real email, payment flow, tax calculation or financial advice. All work stays local; nothing is deployed or pushed.

A multi-user product would require authenticated users, workspace membership and server-side authorization; a transactional database with foreign keys, migrations and indexed queries; server-side validation and integer-money arithmetic; concurrency control and audit history; encrypted transport and operational storage safeguards; backups and tested restore procedures; deliberate deletion/retention policies; monitoring; and accessibility/security testing. Real email delivery and payment processing would need separate, explicitly designed integrations, permission boundaries and reliable status reconciliation.
