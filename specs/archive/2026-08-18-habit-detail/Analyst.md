# Habit detail page — Analyst (archived summary)

Roadmap: `specs/design-implementation-roadmap.md` §2b. Phase **R2b**. Sized **Large**
(new route, first per-entity URL, three new card blocks, one new shared component).
Executed in two runs, 2026-08-18. Baseline: 163 → 173 (run 1, groundwork) → 218
(run 2, the page). Build clean; design check matches `design/target/habit-detail.png`
at 1440px.

Source of truth: `Habit Tracker Prototype.dc.html`, Claude Design project
[Habit tracker design exploration](https://claude.ai/design/p/7089b0b3-0042-4029-bd4c-bef0ce5a6d19).

## What shipped

- `/habits/:id` → `HabitDetailComponent`, lazy-loaded, before the `**` wildcard.
  Habit name on `/habits` is now a `routerLink`. Unknown id redirects to `/habits`;
  an archived habit's page still resolves (reads `habits()`, not `activeHabits()`).
  **AD-019.**
- Hero band: habit-colour tint at 9% alpha, back link, 56px streak, icon tile,
  name + `schedule · category · since MMM D`, three right-aligned stats
  (completion %, completions, best streak), Edit/Archive.
- Three body cards: Activity heatmap (new `<app-activity-grid>`, 7-row/11px-cell,
  Sunday-aligned 18-week window), month circle calendar (clamped nav: next
  disabled in the current month, prev disabled at the habit's start month), and
  `{Month} so far` (progress bar, streaks, three-state Today label).
- Month circle's `missed` state is its own grey palette, not the Calendar page's
  red — **AD-018**.
- `<app-activity-grid>` and `<app-day-strip>` share one colour mapping,
  `stripCellColor()` in `src/app/shared/status-colors.ts` (AD-015, not
  re-implemented).
- New service derivations: `activityWindowDays`, `monthToDateCounts`,
  `lifetimeCounts` (single `poolCounts` call feeds both hero stats — deliberately
  not `completionRate`, whose `countable===0 → 1` contract would read as "100%
  completion · 0 completions" on a brand-new habit; AD-010's `—` convention wins
  here too). `categories` moved from `HabitListComponent` to `HabitService`.
- Edit/Archive are **invented**, not transcribed — the prototype's buttons have no
  handler (same standing as AD-016). Edit opens `<app-habit-form>` in an AD-016
  modal; Archive archives and navigates to `/habits`.
- New tokens in `src/styles.scss`: `--radius-card-lg`, `--circle-missed-bg`,
  `--circle-missed-text`, `--text-ghost`, `--card-divider`, `--arrow-disabled`,
  `--hero-rule`, `--hero-tile-border` — all sampled from source, none invented.

## What the roadmap got wrong (why this was Large, not Medium)

§2b was written from a partial read and described one card where the source has
three, omitted the hero's stats/buttons entirely, assumed `<app-day-strip>` reuse
(different geometry — only the colour function is shared), assumed all-history
cells (source is a fixed Sunday-aligned window), and assumed the Calendar page's
red `missed` colour applies here (it doesn't — AD-018). Re-deriving from source
before planning, per the `design-to-roadmap` skill, is what caught all five.

## Lessons this spec produced

- **L-022** — a route parameter read once from `route.snapshot` pins a reused
  component instance across a param-only navigation. Fixed via
  `toSignal(route.paramMap...)`. Found because AC 4 ("two habits, two different
  hero tints") is the only criterion that reads the DOM twice — two successive
  test-writing attempts produced a *passing* version that never actually did that,
  and both concealed this bug. See L-024.
- **L-023** — a `DO NOT TOUCH` file enforced by `git diff --stat` cannot see a
  revert when the baseline itself is uncommitted (empty diff either way). Must
  assert file content, not diff.
- **L-024** — a named assertion can still be hollow (right name, no DOM read, or
  exercises a case that can't fail). Read what the assertion body does, not its
  name.
- Reaffirmed **L-021** three more times in this one spec: a grep-based Done-when
  check can be unsatisfiable by construction (matching only inside a mandated
  code comment, or inside a `DO NOT TOUCH` file's own legitimate assertions).
  Process takeaway: before accepting a check, name the edit that would make it
  fail.
- Reaffirmed **L-016**: every delegated Haiku step was re-verified independently
  rather than trusted from its self-report; that discipline is what caught L-022
  through L-024 above.

Full decisions are recorded as **AD-018** and **AD-019** in `specs/STATE.md`;
full lesson text as **L-022**, **L-023**, **L-024**. This file is the archived
summary — the acceptance-criteria walk, the two harden rounds, and the per-step
task lists that produced them are not reproduced here.
