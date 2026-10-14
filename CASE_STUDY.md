# DESK — a considered space for independent work

## Context

DESK is an independent portfolio concept, designed and implemented as a functioning frontend application for a fictional creative studio. It demonstrates workflow and engineering decisions; it is not based on user research, a client engagement or a commercially adopted product. No business results are claimed.

## The design problem

A small studio needs to see the next deadline, keep project details close to tasks and understand outstanding invoices without assembling context across disconnected lists. The workspace therefore opens on actionable records. Each overview summary leads to a relevant filtered view, and every visible count or amount comes from the dataset.

## Art direction: the studio ledger

The visual idea is a working studio ledger: numbered records, ruled surfaces, warm paper and a forest-green navigation rail. It is intended for repeated use, so the first viewport presents real work and amounts rather than a promotional message.

1. **Central idea:** the project register is the main visual material. Small reference numbers, shared column edges and thin rules connect projects, clients and accounts.
2. **Typography:** locally served Newsreader supplies the DESK wordmark, page titles and project/client names. IBM Plex Sans carries controls and descriptions; IBM Plex Mono aligns dates, amounts, reference numbers and small register headings. Desktop page titles are 40px; mobile titles reduce to 34px.
3. **Layout:** an 8px spacing rhythm, compact rows and consistent column alignment support comparison. The overview pairs a larger work register with an independently stacked attention/schedule column. Accounts sit beneath the work register. Mobile puts attention first and recomposes each record around its name rather than shrinking desktop columns.
4. **Interface treatment:** warm paper, dark text, square controls, restrained status fills and flat tables replace decorative shells. Client contact and financial context share one directory row. Project details use a facts strip and ruled task columns. No illustrative imagery is needed to explain this application.
5. **Signature interaction:** Focus opens a project at the right edge of the ledger. Complete or reopen a task there; the panel progress and underlying register update immediately and persist. Escape closes the panel and restores focus to its opener. On mobile it occupies the full width.

## Redesign through rendered inspection

The earlier implementation was inspected on desktop and mobile before changes. Three generic elements were replaced: a greeting and motivational banner became the actionable Studio ledger with account follow-ups; oversized client cards became an alphabetically sorted directory with contact, project and outstanding columns; repeated rounded task containers became compact, ruled task sheets with explicit status controls. Fictional avatar decoration was removed from the navigation.

The next inspection exposed a gap between attention and schedule, so those registers now stay together as the project list grows. Narrow-screen checks also exposed squeezed task text; task descriptions and status/edit controls now have separate rows. Two muted text colors were darkened after automated contrast findings. Screenshots before and after the changes are retained in `verification/design-before/` and `verification/design-after/`.

## Refining daily use

A second rendered inspection identified three remaining generic areas: roomy project rows with passive headings, client detail composed from repeated full-width tables, and a mobile invoice whose line items required horizontal scrolling. The project register now uses compact rows, sortable name/deadline/budget headings and per-row Focus access. Sort direction is visible through arrows and `aria-sort`, survives reload through URL state and works alongside status filtering.

Client detail now uses an asymmetric dossier: project names, deadlines, budgets and real task progress on the left; derived outstanding demonstration amounts and invoice records on the right. Mobile turns this into a readable work-then-accounts sequence. Generic client eyebrow and empty-note copy were replaced with direct record labels.

Mobile invoice detail uses an ordered list of line items with native definition lists for quantity, unit price and amount. All amounts fit within the viewport. CSS shows exactly one representation at a time; the conventional line-item table is retained on desktop and in print. Before-refinement images are stored in `verification/refinement-before/`; final captures are in `verification/design-refinement/`.

## Connecting the workflows

Clients anchor the model. Projects refer to clients, tasks refer to projects, and invoices refer to a client plus an optional project from that same client. This relationship is checked when stored data is loaded and respected by the forms: changing an invoice’s client clears its project selection.

Project detail places the description, budget, client and deadline above a task workspace. Board and list layouts share accessible task controls, allowing a status change without drag-and-drop. Completing a task changes progress immediately; paying a demonstration invoice changes the outstanding summary immediately. No artificial loading states disguise the browser-local nature of the app.

Archive was chosen for clients and projects because those records hold other records together. Client archive also archives associated projects, while retaining tasks and invoice records. A client restore does not silently reactivate all its projects. Individual task deletion is confirmed. A reset is also confirmed and replaces the complete workspace atomically.

## Implementation choices

The project uses React, TypeScript, Vite and Tailwind CSS, with React Router and Radix Dialog. A small context carries the current workspace and feedback. Domain functions, typed records, schema validation, storage, reusable controls and feature views are separate modules. Source is formatted for maintainability; focused tests target behavior and invariants.

Money is stored in integer cents, with decimal strings parsed before any calculation. Quantities are whole positive numbers. Totals are derived from line items; unsafe integer totals are rejected. This supports predictable illustrative USD values without implementing tax or payment behavior.

Date-only strings are compared lexically and displayed through local calendar components. This avoids interpreting a date-only deadline as UTC midnight and shifting it to another calendar day. The current calendar day comes from the browser; a production studio would need an explicit workspace timezone policy.

Versioned localStorage is intentionally bounded. Validation checks shape, date validity, amount ranges, enum states, unique IDs and record relationships. Invalid or outdated stored data produces a visible recovery notice and fresh fictional records. Storage failures keep the tab usable and explicitly disclose that persistence failed. There is no server-backed durability claim.

## Interaction and accessibility

Clear labels and useful validation precede success feedback. Invalid submissions focus an error summary and associate inline messages with controls. Forms track changes; cancellation and Escape allow users to retain or discard edits. A browser unload guard protects unsaved form work. Dialogs use accessible title/description semantics, deliberate initial focus, a focus trap and opener focus restoration.

Status badges include words and dots, rather than relying only on color. Search produces a helpful no-results state. Long text wraps in detail views and table cells. Mobile navigation exposes the same routes, tables scroll locally, and forms adapt to a single column. Motion communicates state: a short 180ms edge slide establishes the Focus panel as a working detail view, a 120ms overlay fade directs attention, and a 160ms progress-width transition connects completion with its result. Essential content is always present. Reduced-motion preferences remove these effects immediately; native scrolling is retained.

Measured accessibility scans identified borderline badge contrast and muted text. Those colors were darkened while retaining the quiet studio character. Automated browser testing also identified labels whose nested select text contaminated the accessible name; fields now use explicit label/control relationships and described error messages.

## Validation and limits

The production build, focused domain/storage tests, full browser workflow and automated accessibility scans are repeatable through npm scripts. The browser workflow runs against the real application in an isolated Edge context, uses the interface to create and edit records, and checks persisted state after reload. Desktop and mobile screenshots and an illustrative invoice PDF are saved alongside machine-readable results.

The final production build and all 16 focused tests pass, as do 23 browser workflow checks. They cover creation, related records, monetary calculations, paid overview changes, edits, validation, no-results states, board/list controls, delete confirmation, archive/restore, unsaved cancellation, browser Back protection, reset and corrupt storage recovery. Keyboard testing verifies initial dialog focus, focus containment, Escape and restoration. Automated WCAG scans report zero violations across 16 primary-route, dialog and validation-state inspections.

The built-in browser automation runtime was unavailable, so an installed Microsoft Edge was used through Playwright. No cross-browser suite, physical-device testing, assistive-technology user study or physical printing was performed. Automated accessibility checks do not establish complete compliance. No website was deployed and no remote repository was used.

The design suite reports 12 passing checks in `verification/design-after/results.json`: fonts, live progress, keyboard focus, persistence, reduced motion, mobile panel composition, register sorting and filtering, derived client accounts, mobile invoice semantics and print behavior. Page-overflow checks cover seven routes at 320, 390, 768 and 1100 pixels. Additional mobile accessibility evidence is in `verification/design-after/refinement-accessibility.json`. Final rendered captures in `verification/design-refinement/` were visually inspected; checks ran against the stable production preview. The development preview remains at port 5174.

## Moving beyond the concept

A real studio product would need authenticated users, workspace roles and server authorization, transactional relational storage, server validation, concurrency and conflict handling, audit trails, migration and backup/restore procedures, a clear timezone policy, retention rules and observability. Sensitive records would need a considered privacy and security model. Email and payments would require explicit integrations with delivery/provider reconciliation; frontend labels alone could never represent those real-world events reliably.

DESK demonstrates the frontend workflow within an honest local boundary: one browser, fictional records, no authentication, no cloud backup and no team synchronisation.
