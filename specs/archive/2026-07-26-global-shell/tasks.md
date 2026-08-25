# tasks — global-shell (Roadmap Phase 0) — summary

12 steps, executed in order. Baseline before this slice: 107 passing specs;
final: 115 (+3 `formatBarDate`, +2 top-bar, +3 routing).

**Scope fence:** shell only — top bar, page background, token layer, two stub
pages. Dashboard/Habits/Calendar interiors deliberately left un-restyled
(roadmap §1–§3); never touched `src/app/dashboard/*`, `src/app/habit/*`,
`src/app/calendar/*`, `src/app/app.config.ts`, `src/index.html`,
`angular.json`.

## Steps, condensed

1. **Design tokens + `body` reset** in `src/styles.scss` (previously one
   comment line) — the load-bearing step; every later phase consumes these
   tokens. See `Analyst.md` for the final token list.
2. **`formatBarDate` pure function** (`src/app/format-bar-date.ts` +
   `.spec.ts`) — pinnable date param, `'en-US'` locale pinned explicitly,
   lives beside `AppComponent` (presentation, not `HabitService`).
3. **Analytics stub** — `src/app/analytics/analytics.component.{ts,html,scss}`,
   `max-width: 1000px` page-container, heading + one placeholder line, no
   service injection.
4. **Stacks stub** — identical pattern, `max-width: 900px`, heading
   "Habit Stacks".
5. **Checkpoint** — build + test (110 SUCCESS) + confirm no page-interior
   files touched.
6. **Routes** — registered `/analytics`, `/stacks` (lazy `loadComponent`) and
   a trailing `{ path: '**', redirectTo: '' }` wildcard in
   `src/app/app.routes.ts`; extended the `ROUTES` map in
   `scripts/design-shot.mjs`.
7. **Shell markup** — replaced `app.component.html` wholesale: `✓`-glyph logo
   + wordmark, 5 hardcoded nav `<a>` links (not `@for`; Dashboard alone needs
   `[routerLinkActiveOptions]="{ exact: true }"`), right-aligned
   `{{ barDate }}`. Kept `.nav-link` class (existing spec depends on it) and
   `title = 'habit_tracker'` (Angular app id, unrelated to the wordmark).
8. **Shell styles** — replaced `app.component.scss` wholesale from tokens:
   54px sticky bar, tinted (not solid) active pill, no `max-width` anywhere
   on `.page`. `.nav { gap }` initially specified `3px`, corrected to `2px`
   in Step 11 after pixel measurement (L-011).
9. **Specs** — tightened the nav-link count assertion to exactly 5 + order,
   added logo/wordmark/date assertions, added `app.routes.spec.ts` using
   `RouterTestingHarness` to prove `/analytics`, `/stacks`, and the `/nonsense`
   wildcard redirect for real (not just a route-config check).
10. **Checkpoint** — build + 115 SUCCESS + `git status` confirms only the
    expected file set changed.
11. **Design check** — bar strip only (top ~55px band); full-page match is
    explicitly not a criterion for this slice. Caught the nav-gap drift
    (L-011) and a process trap where the shot script screenshotted a
    different project's dev server on a collided port (also L-011).
12. **Wrap-up** — recorded AC evidence in `Analyst.md` §4, updated
    `specs/STATE.md` baseline (115) and lessons, removed the
    `## Executing: global-shell` marker from root `STATE.md`.

Full step-by-step instructions (file-by-file code, exact "Done when" checks)
are not preserved here — see `Analyst.md` for the decisions and final
acceptance-criteria evidence, and the shipped source for the implementation.
