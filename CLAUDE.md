# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working agreement

- Never commit anything (`git commit`, `git push`, etc.) without the user's explicit permission for that specific commit.
- Read the relevant existing code before making changes — don't edit blind.
- If an implementation attempt fails twice, stop and explain the problem instead of continuing to retry.
- When executing steps from a `tasks.md` file, use the Haiku model (`--model haiku`) for faster, cost-efficient execution.
- Project memory lives in `specs/STATE.md`: architectural decisions (`AD-NNN`), blockers (`B-NNN`), lessons (`L-NNN`), Quick Tasks, phase status. Append-only, never renumbered. Root `STATE.md` is only the run marker the hook greps for.
- When a feature is finished, follow the archive ritual in `specs/STATE.md`: re-read the spec, add the `AD`/`L` entries it produced, move the folder to `specs/archive/YYYY-MM-DD-<name>/`, and put **both** changes in the same commit.
- End-of-feature ritual, in order: (1) update any docs the feature touched, (2) write the `AD`/`B`/`L` entries the spec produced into `specs/STATE.md`, (3) **summarize the spec down to what matters** — the final `Analyst.md`, the decisions, and what changed from the plan; delete drafts and long back-and-forth notes so the archived folder is small, (4) move the summarized folder to `specs/archive/YYYY-MM-DD-<name>/` and push both the archive move and the `STATE.md` update together. A `pre-push` git hook (`scripts/clean-table-check.sh`, wired via `.pre-commit-config.yaml`) enforces steps 2–4: it blocks a push that adds files under `specs/archive/` without a matching `specs/STATE.md` change, and blocks any newly archived file over 20 KB with "Summarize this spec before archiving." The hook checks — it never edits or commits for you. It's a client-side git hook, so `git push --no-verify` bypasses it entirely; it's a reminder for the honest case, not a guarantee.
- Before starting a `tasks.md` run, add a `## Executing: <spec-dir-name>` line to the root `STATE.md`, and remove it when the run finishes. The `enforce-haiku-tasks-pretooluse.sh` hook keys off that marker to block direct top-level edits during a run — without it the hook stays dormant, so unrelated Small tasks are never blocked.

## Task sizing rule (SDD)

Classify every task BEFORE starting. The size decides how much process it gets. Spec structure is documented in `specs/TEMPLATE.md`.

| Size | What it looks like | How to treat it |
|---|---|---|
| **Small** | 3 files or less, one sentence describes it | No spec. Fix it, verify it, add one row to Quick Tasks in `specs/STATE.md` |
| **Medium** | Clear feature, less than 10 steps, no new pattern | `Analyst.md` + `tasks.md` + 1 harden round (`CriticReview.md`) |
| **Large** | Touches more than one layer (e.g. API + DB + UI) | Full spec + 2 harden rounds + a review after coding |
| **Complex** | Ambiguous, new domain, or a pattern the project never used | Same as Large, but the critic focuses on the ambiguous parts |

Two rules that make this table work:

- When unsure, size UP, never down. Sizing down to "save time" is how bugs are born.
- If mid-work the task turns out bigger than classified (more steps, more layers), STOP and re-classify. Do not push through with too little process.

## Project state

This is a standalone Angular 21.2 application scaffolded via `ng new` (Angular CLI 21.2.19, TypeScript 5.9.3). It currently contains only the generated boilerplate (`AppComponent`, empty `routes`) — no habit-tracking features, services, or data models have been built yet. There is a single Angular project named `habit_tracker` in `angular.json`.

## Commands

- `npm start` / `ng serve` — run the dev server at `http://localhost:4200/`, auto-reloads on change.
- `npm run build` / `ng build` — production build, output to `dist/habit_tracker`.
- `npm run watch` / `ng build --watch --configuration development` — incremental dev build.
- `npm test` / `ng test` — run unit tests via Karma + Jasmine.
  - To run a single spec file, use Karma's `--include` or narrow via `fit`/`fdescribe` in the spec, since there is no built-in Angular CLI flag for a single-file run.
- `npm run design:shot -- <name> [--width 1440] [--viewport-only] [--seed]` — screenshot a route with Playwright and composite it beside its mockup. Requires the dev server to already be running. `--seed` injects the demo habits (`scripts/demo-data.mjs`) into localStorage before the page loads — without it an empty store renders the empty state and the comparison is worthless.
- `node scripts/seed-demo.mjs` — print a one-liner to paste into DevTools that loads the same six demo habits (~18 weeks of history) into a real browser. `--json` prints the raw array. Tooling only; nothing under `src/` imports it.
- There is no e2e test runner configured (`ng e2e` requires adding a package first).
- There is no lint script configured in `package.json` / `angular.json`.
- `pip install pre-commit && pre-commit install --hook-type pre-push` — one-time setup per clone to wire the `clean-table-check.sh` pre-push hook (`.pre-commit-config.yaml`). Without this the hook is not installed and pushes are not checked.

## Design comparison

Implementing a UI against a mockup uses Playwright, not the Chrome MCP tools (cheaper, local, deterministic).

- Put mockups in `design/target/<name>.png`, named after the route (`dashboard`, `habits`, `calendar` — the map lives in `scripts/design-shot.mjs`).
- `scripts/design-shot.mjs` screenshots the running app into `design/actual/`, then composites target and actual side by side into `design/compare/<name>.png`. Read only the composite — one image per round instead of two.
- Always pass `--width` matching the mockup's pixel width. Mismatched viewports produce breakpoint differences that read as design bugs.
- `design/actual/` and `design/compare/` are gitignored; `design/target/` is committed.
- `/design-check <name>` runs the whole loop (server check → shoot → compare → fix → re-shoot).

Only what a static screenshot shows gets checked — hover, focus, empty, and error states need their own mockups.

## Architecture notes

- Uses Angular's standalone component API (no `NgModule`s) — bootstrapped via `ApplicationConfig` in `src/app/app.config.ts` and `bootstrapApplication` in `src/main.ts`.
- Zone change detection enabled via `provideZoneChangeDetection()` in the bootstrap config (Angular 21+ default).
- Routing is configured through `provideRouter(routes)` in `app.config.ts`, with routes defined in `src/app/app.routes.ts` (currently empty).
- Component styles use SCSS (`inlineStyleLanguage: scss`, default component schematic style is `scss`).
- New components generated via `ng generate component <name>` will follow the standalone pattern by default (Angular 21 CLI default).
