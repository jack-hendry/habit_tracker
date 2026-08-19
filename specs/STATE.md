# STATE — project memory

A spec tells you the plan. **This file tells the next session what the project
has learned.** Without it, every decision is lost the moment the chat context
is cleared.

## What goes where

| Event | What to add |
|---|---|
| Important architectural choice | `AD-NNN` entry under [Decisions](#decisions) |
| Something blocked me for a long time | `B-NNN` entry under [Blockers](#blockers) |
| "We learned that…" moment | `L-NNN` entry under [Lessons](#lessons) |
| Small task done without a spec | Row in [Quick Tasks](#quick-tasks) |

## Rules for this file

1. **Append-only. Never renumber.** `AD-003` means the same thing forever, so
   other documents can cite it.
2. **To change a decision, add a new one** that says *"supersedes AD-XXX"*, and
   add `→ superseded by AD-YYY` to the old entry. Never edit the old entry's
   substance and never delete it — the reasoning that was wrong is the most
   useful part.
3. **Size budget.** When this file gets unwieldy (~300 lines), move old
   `AD` / `B` entries and closed Quick Tasks to `STATE-ARCHIVE.md`, leaving a
   one-line stub here. **Lesson headlines never move** — they are permanent and
   stay in this file. Their bodies live in `LESSONS.md` (2026-08-19); that split
   is what keeps this file inside the budget without hiding a lesson behind a
   pointer.
4. **Every entry is dated and says *why*, not just *what*.** A decision without
   its reasoning cannot be revisited safely.
5. Entries are written **when the thing happens**, not reconstructed later.
   Reconstruction is how the reasoning gets lost.

## Archive ritual (run when a feature is finished)

A spec archived without its lessons recorded is **silent memory loss** — the
code keeps the decision, nobody keeps the reason. So, in order:

1. **Read the spec one more time** — `Analyst.md`, `tasks.md`, and especially
   `CriticReview.md`. The critic findings are where the lessons live.
2. **Add the `AD` / `L` (and any `B`) entries it produced.** `AD` and `B` go
   in this file in full; each `L` is a one-line headline here **plus** its body
   in `LESSONS.md`. Writing only one of the two fails the pre-push hook.
3. **Move the folder** to `specs/archive/YYYY-MM-DD-<name>/` (the date it was
   finished) and update anything that linked to the old path.
4. **Both changes go in the same commit.** Never a commit that moves the spec
   without the entries — that is the failure this ritual exists to prevent.

---

## Decisions

**AD-001 — Client-side only: localStorage, single device, no backend.** → moved to `STATE-ARCHIVE.md`

**AD-002 — Corrupt rows are dropped, never coerced.** → moved to `STATE-ARCHIVE.md`

**AD-003 — Dates are constructed as local calendar dates, never parsed from ISO.** → moved to `STATE-ARCHIVE.md`

**AD-004 — Derivations are live and pure, never stored.**
(2026-07-17, Phases 2–3) Streaks, completion rate, day status and lapsed-ness
are computed from `completedDates` + `schedule` on every read. `habits` is a
signal, so changing a habit recomputes everything with nothing to invalidate.
Cost is trivial at this scale (`scheduling-streaks` R10) and it removes a whole
class of stale-cache bugs.

**AD-005 — History is unrepresentable in an edit patch, not stripped at runtime.** → moved to `STATE-ARCHIVE.md`

**AD-006 — Colour never carries meaning on its own.** → moved to `STATE-ARCHIVE.md`

**AD-007 — `status` is `'active' | 'archived'`; paused is derived.** → moved to `STATE-ARCHIVE.md`

**AD-008 — `specs/STATE.md` is the project memory; root `STATE.md` is a
run-marker only.** (2026-07-23) The two files had drifted into duplicate,
disagreeing status tables. Memory (decisions, blockers, lessons, quick tasks)
lives here, next to the specs it is extracted from. Root `STATE.md` keeps only
the `## Executing: <spec>` marker that `enforce-haiku-tasks-pretooluse.sh`
greps for, plus a pointer here — the hook reads the repo root and is not worth
re-pointing.

**AD-009 — The redesign's visual language lives as CSS custom properties on
`:root` in `src/styles.scss`; there is no shell-level content width.**
(2026-07-26, `global-shell` §2.5, R10/R12) Two halves of one decision. (a)
Colours, radii, the content padding and the font family are declared once as
tokens — including the status accents, declared ahead of their first use so
roadmap §1–§3 *consume* rather than re-sample them. The accepted cost is a few
inert `:root` lines until their section lands; the alternative is three sections
each sampling their own green. Hex literals are banned from component SCSS for
any value that has a token. (b) The shell imposes **no** `max-width` on
`<router-outlet>` — the prototype gives each page its own centered column
(Dashboard 960 / Habits 1000 / Calendar 900 / Analytics 1000 / Stacks 900), so
the width is a per-page concern. The roadmap's "~1150px shell column" was a
paraphrase and is superseded.

**AD-010 — "Completion rate" means one thing: pooled due-days.**
(2026-08-18, `dashboard-redesign` §3.1) `HabitService.poolCounts(habits, from,
to)` returns `{done, countable}` over an inclusive window, pooled across habits;
the Dashboard header, the LAST 7 DAYS card and the month-over-month delta all
divide it. This **supersedes the mean-of-per-habit-rates** the header used
before: mean-of-rates gave a habit created yesterday the same weight as one with
six months of history, so adding a habit moved a number that describes the past.
The window arithmetic is `completionRate`'s contract lifted verbatim, `isDueOn`
guard included — `dayStatus` reports `'done'` before `'not-due'`, so without the
guard an off-schedule completion inflates the numerator alone and the header
prints >100%. Analytics (roadmap §4) consumes the same primitive. Falls out:
habits exist but no due day has resolved → `—`, not `100%`.

**AD-011 — "Longest active streak" is the longest *running* streak, and names
nobody when there is none.** (2026-08-18, `dashboard-redesign` §3.2, R3)
`topCurrentStreak` reduces `currentStreak`, not `longestStreak` — *active* is
load-bearing in the label, which is why the card can name an owner and why the
number drops the day a streak breaks. It returns `null` rather than a
zero-streak winner, so the card cannot credit an arbitrary habit with a streak
of nothing. The roadmap's "aggregate `longestStreak` + owner" is superseded.

**AD-012 — Perfect-days and the overall rate read `activeHabits`, so archiving edits the past.** → moved to `STATE-ARCHIVE.md`

**AD-013 — The stat card is a shared component from its first use.**
(2026-08-18, `dashboard-redesign` §3.6) `<app-stat-card>` in
`src/app/shared/stat-card/` owns the label / value / inline-unit / sub triad and
shows **either** a sub-line **or** a progress bar, never both. Roadmap §4 reuses
it for the Analytics cards; building it inline on the Dashboard meant restyling
it twice. `:host` is the card — no wrapper element — so it behaves as a grid
item wherever it is dropped.

**AD-014 — A day-strip records what happened; a rate averages obligations.**
(`habits-redesign` §3.1) `recentStatuses` calls `dayStatus` **raw**, with no
`isDueOn` guard — deliberately the opposite of `poolCounts` (AD-010), which must
guard or an off-schedule tick prints `112%`. `dayStatus` reports `done` before
`not-due`, so a day completed off-schedule or during a pause paints in the
habit's colour. That is correct for a strip and wrong for a rate. The two look
inconsistent and must not be unified; both are pinned by specs.

**AD-015 — The 30-day strip's three cell colours, and `pending` among them.**
(`habits-redesign` §3.1) done → the habit's hex; `missed` **and** `pending` →
`--strip-missed` (`#e9e9e7`); `not-due` **and** `future` → `--strip-not-due`
(`#f5f5f3`). There is **no red** in the strip — the roadmap claimed there was.
`pending` was settled by measuring the target, not by taste: an unticked daily
habit's final cell reads `rgb(233,233,231)` there. It also makes the strip feel
live, filling with colour the moment the checkbox is ticked.

**AD-016 — Create is a modal; edit stays inline; both render one
`<app-habit-form>`.** (`habits-redesign` §3.5) The prototype's `+ New habit`
button is **dead** — no handler, no modal markup — so every part of this is
ours, and none of it is verifiable by a design check. Native `<dialog>` +
`showModal()` for the free focus trap, `Esc` and `::backdrop`. The element is
**always rendered and its contents gated by `@if (creating())`**, which makes
"empty form on re-open" structural rather than a `reset()` someone must
remember. The modal and the inline editor are mutually exclusive.

**AD-017 — `HabitService.add` returns `Habit | null`.**
(`habits-redesign` CriticReview R11) Creation is two calls — `add(name,
schedule)` then `update(id, patch)` for the metadata — so a `void` return meant
the create modal could collect eight fields and silently persist two. Widening
is purely additive; every prior caller ignores the return.

**AD-018 — The habit-detail month grid keeps its own palette; `missed` is grey.**
(2026-08-18, `habit-detail` §2b, Analyst §2.9 D) `circleFor` in the prototype is
a **second** palette over the same `dayStatus`, not a reuse of the Calendar
page's. A missed day is `--circle-missed-bg` / `--circle-missed-text` (grey), not
`--missed` (red). Two pages, two intents: the Calendar is a status grid across
habits, while this is one habit's own record and the design deliberately chooses
not to shout at you about it. Reusing `CS` here would paint a per-habit page in
alarm colours the design drops on purpose. The Calendar page stays red — do not
"align" them. Pinned by an acceptance criterion that asserts the missed cell is
**not** `--missed`, because this is the kind of difference a later reader
flattens for consistency.

**AD-019 — `/habits/:id` is the first per-entity route, and it reads `habits()`,
not `activeHabits()`.** (2026-08-18, `habit-detail` §2b, Analyst §2.9 E/F) Every
prior route is a static path. Two consequences worth pinning: (1) an unknown or
malformed id **redirects to `/habits`**, not to a 404 — the app has no designed
404 page, and the `**` route already redirects rather than rendering one; (2) the
component resolves against `habits()` so an **archived** habit's detail page
still renders, which is what makes a deep link, or a back-button press right
after archiving, resolve instead of bouncing. Only `/habits` filters by status.
The route sits between `habits` and `**`: `path: 'habits'` is a full-path match
and cannot swallow `/habits/x`, but the wildcard can.

**AD-020 — Cell fills are page-scoped tokens; a status name is not a colour.**
(2026-08-19, `calendar-redesign` CriticReview R1) `--cal-done-bg` (#dcfce7)
and `--cal-missed-bg` (#fee2e2) exist *because* `--done-bg` (#f4fbf6) and
`--missed-bg` (#fdf4f4) already exist and are different colours. Same status,
same product, two values, because they do different jobs: the Dashboard's are
pale washes behind a text row on white, the calendar's are saturated fills for
a 52px block that must read as colour at a glance. The Analyst assumed one
status meant one value and asserted the calendar's fills were already
tokenised; building that would have washed every done cell to near-white while
AC 3's raw-hex grep, the build and the suite all stayed green — a token *was*
being used, just the wrong one. `not-due` had no token at all: its #f3f4f6 /
#d1d5db lived only as literals inside `calendar.component.scss`. Naming a token
after its **status** invites the collision; these are named after their
**page**. Before reusing a status token on a new surface, compare the hexes —
the name will not warn you (L-012's rule, one level up).

**AD-021 — The prototype's dataset shape is not adopted, only its style.**
(2026-08-19, `calendar-redesign` §3.6 + CriticReview R3) Two non-adoptions on
one page, one rule. (a) The source's `statusOf` has a **sixth** state, `off`
(#fafaf9 fill, #c2c6cc numeral), for real days before its dataset begins —
in its March, `off:-20` puts days 1–20 there. `HabitService.dayStatus` folds
"before creation" into `not-due` and keeps five `DayStatus` values; a sixth
would mean a service change, a seventh legend item and new spec surface, for a
state that exists only because the prototype has 126 days of history. (b)
`Prev`/`Next` grey out at `calM === 0 / 4` in the source; `monthGrid` takes an
arbitrary year/month with no bound, so copying that condition would cap the
app's calendar at whatever range happened to match the fake data. Both are the
same failure: **a prototype's data-shape artifacts are indistinguishable from
product decisions in a screenshot.** Sample the colours, never the dataset's
limits. The colour pair for the disabled arrows was still sampled faithfully;
only the *condition* that switches between them was dropped.

**AD-022 — A design-conformance spec asserts computed style against the
design source.** (2026-08-19, follow-on to `calendar-redesign`)
`*.design.spec.ts` — `src/app/calendar/calendar.design.spec.ts` is the first —
reads `getComputedStyle` on probe elements and compares against values
transcribed from the `.dc.html`. Three properties are load-bearing and all
three are easy to lose: (a) expected values come from the **design source, not
the component's SCSS** — copying the SCSS yields a change-detector that agrees
with whatever the component happens to say and catches nothing; (b) the
assertion reads **computed style, not stylesheet text**, because only a real
cascade catches a rule that is correct and never fires (L-025); (c) it uses
**probe elements carrying the component's `_ngcontent-*` attribute rather than
seeded data**, so it is date-independent — a habit crafted to produce all five
statuses has no past days on the 1st and no future days on the 31st. Proven by
mutation, not by being green: pointing `--cal-done-bg` at #f4fbf6 fails it, and
so does collapsing a day-number colour to grey. This is the mechanism that
covers what a screenshot structurally cannot (L-026).

## Blockers

**B-001 — The Haiku-enforcement hook denied every non-`.md` edit in the repo.** → moved to `STATE-ARCHIVE.md`

**B-002 — The Haiku-enforcement hook was dormant for every run, shadowed by its own documentation.** → moved to `STATE-ARCHIVE.md`

## Lessons

*Permanent — these never move to `STATE-ARCHIVE.md`.* Headlines live here
so they are always in front of whoever reads this file; the full entry —
provenance, what broke, why — is in `LESSONS.md`, one section per id.
Adding a lesson means adding **both**: the headline here and the body
there. `scripts/clean-table-check.sh` refuses a push where the two
disagree.

- **L-001** — A duplicated fact is a bug with a delay on it.
- **L-002** — Push guarantees into the type system; runtime strips hide the error.
- **L-003** — "Retains history" and "fabricates failure" look identical until you walk the dates.
- **L-004** — A guard-rail keyed to a fuzzy signal fails open *and* closed.
- **L-005** — Write `tasks.md` for the executor, who has no other context.
- **L-006** — A "switch every consumer to X" instruction reads as done when it is half-done.
- **L-007** — Order the clauses that cannot change the answer anyway, and say why.
- **L-008** — Name the accepted downside so it is a decision, not an oversight.
- **L-009** — Verify the migration is number-preserving before claiming it is additive.
- **L-010** — An acceptance criterion that contradicts the body of its own spec gets implemented as written.
- **L-011** — Verify design values against the committed mockup's pixels, not against the eye.
- **L-012** — A value you did not sample is a value you invented.
- **L-013** — The executor stopping is the process working, not the process failing.
- **L-014** — A screenshot of an empty store verifies nothing.
- **L-015** — A prototype's interactive surface is invisible in its screenshots.
- **L-016** — Re-run a delegated step's own "Done when"; do not trust the report.
- **L-017** — Predict the assertions, not the `it` count.
- **L-018** — A stop clause is not a substitute for opening the file.
- **L-019** — Prove the guard fires before trusting the run it guards.
- **L-020** — Splitting a `tasks.md` deletes the file a hook keys on.
- **L-021** — Fixing an unsatisfiable check can reproduce the same defect.
- **L-022** — A route parameter read from `snapshot` pins a reused component.
- **L-023** — A `DO NOT TOUCH` enforced by `git diff` cannot see a revert.
- **L-024** — A named assertion can still be hollow.
- **L-025** — A rule with the right token can still lose to the rule above it.
- **L-026** — A design screenshot only checks the states its seed happens to render.
- **L-027** — A second pass must re-open the source, not re-read the spec.
- **L-028** — A guard keyed to one tool's input shape is not a guard on the action.

## Quick Tasks

*Small work done without a spec (3 files or fewer, one sentence describes it).*

| Task | Status | Notes |
|---|---|---|
| `tasks.md` step format for Haiku | ✓ Done | `TEMPLATE.md`: step template (Depends on / Files + DO NOT TOUCH / Context / Do / Done when / If blocked), anchor-by-symbol, ordering rules. Docs only → L-005 |
| design-compare tooling | ✓ Done | `scripts/design-shot.mjs`, `npm run design:shot`, `/design-check`. Playwright screenshot → composite beside `design/target/<name>.png`. Tooling only |
| Fix the Haiku-enforcement hook | ✓ Done | See B-001 / L-004 |
| Consolidate the two `STATE.md` files | ✓ Done | See AD-008 |
| Replace the literal NUL byte in `habit-list.component.ts`'s `UNCATEGORISED` sentinel with a `\0` escape | ✓ Done | Closed by `habit-detail` run 1, Step 1. File now reports as text and `grep` sees it (L-016) |
| Split `HabitListComponent` | 📋 Open | Its SCSS is 7.82 kB against a 6 kB warn budget, and 4c will add more to the same file |
| Demo-data seeding for design checks | ✓ Done | `scripts/demo-data.mjs` (six habits, 126 days, the prototype's own LCG) + `scripts/seed-demo.mjs` + `--seed` on `design-shot.mjs`. Tooling only — nothing under `src/` imports it. See L-014 |
| Split `HabitListComponent` (SCSS over budget) | ✓ Done | Closed by `habits-redesign` — extracting `<app-habit-form>` and `<app-day-strip>` took the file from 7.82 kB (1.82 kB over the 6 kB warn, 2.18 kB from the 10 kB **error**) to no warning at all. It was not a tidy-up: the row restyle could not land until it did |
| Tokenise the 29 pre-AD-009 hex literals in the edit form | ✓ Done | `habits-redesign` Step 7b. `#ccc`/`#555`/`#222`/`#f0f0f0` predated the redesign palette entirely; extracting the form into `shared/habit-form/` is what made them visible. See L-016 |
| Back-fill component coverage for pause / resume / archive / reactivate / delete-confirm | ✓ Done | `habits-redesign` CriticReview R1 left the five lifecycle transitions untested at the component level (the service-level state machine was already covered by the Phase 4b block). Closed 2026-08-19: 18 specs added to `habit-list.component.spec.ts`, suite 218 → 236, one file, no source change. Three blocks — the two-click delete latch (component-only state the service knows nothing about), the R11/R12 editor-closing guards on `remove`/`archive`/`reactivate`, and DOM-click wiring for Pause/Resume/Archive/Reactivate. Every guard test is **paired with its negative half** per L-024 (closes the editor over its own habit *and* leaves one over a different habit alone); both guards were mutation-checked by deleting them — each deletion fails exactly one test and the negative half correctly stays green. Unblocks `TEMPLATE.md` rule 3 for lifecycle `Assumes:` entries; rule 2 (no shared file) still forces two habit-list-internal steps sequential, so the win is cross-component groups |
| Add a habit-detail route (roadmap §2b) | ✓ Done | Closed by `habit-detail` (Large, 2 runs). `/habits/:id` exists and the habit name on `/habits` is now a `routerLink` — added **last**, in run 2 Step 12, because adding it before the route existed would have sent every click through `**` to the Dashboard. See AD-019 |
| **`isLapsed` makes "Overdue / slipping" useless once history exists** | 📋 Open | Found by the §1 design check, **not** introduced by it. `isLapsed` = "≥1 missed day ever", so after a few weeks *every* habit qualifies: the section listed all six demo habits, three of them labelled "last done today". The target shows one. The prototype's rule is "not done today **and** last done ≥2 days ago" (`!doneToday && lastAgo >= 2`). Deliberately left alone — bucket definitions were out of scope for `dashboard-redesign` (§4) and this changes behaviour, not appearance. Sized **Small** (one computed, `dashboard.component.ts`) if adopted |
| Parallel-execution rules for `tasks.md` | ✓ Done | `TEMPLATE.md`: `Depends on` now states *why* (the field that decides parallelisability), a "What the critic pass verifies" section (open the file, do not trust the plan — precedent R11 / L-018), and a worktree protocol. Two steps parallelise only if neither depends on the other **and** their `Files` lists share no file — git merges non-overlapping edits to one file without a conflict. Pre-merge `git diff --name-only` scope check catches the undeclared edit; sound here because a worktree branch has a committed baseline, the thing L-023 lacked. Green-build rule moved to the merge point. `CLAUDE.md` cross-ref + a commit carve-out for throwaway worktree branches. Rule 3 adds an `Assumes:` field, required only for steps in a parallel group: each behavioural assumption must name the test pinning it, so the merge-point suite catches a violation — an assumption merely *declared* enforces nothing. No such test ⇒ adding it is a prerequisite step. Docs only |

---

## Phases

| Phase | Feature | Status | Spec |
|---|---|---|---|
| **1** | Habit checklist (create / check-off / delete, localStorage) | ✅ Merged | `archive/2026-07-17-habit-checklist/` |
| **2** | Scheduling + streaks (daily / weekdays, streak math) | ✅ Merged | `archive/2026-07-17-scheduling-streaks/` |
| **3** | Dashboard + calendar + stats (today buckets, monthly grid, %) | ✅ Merged | `archive/2026-07-17-dashboard-calendar-stats/` |
| **4a** | Habit metadata (categories, colours, icons, notes, edit/rename) | ✅ Done | `archive/2026-07-23-habit-metadata/` |
| **4b** | Habit lifecycle (start date, pause, archive, reactivate, delete-confirm) | ✅ Done | `archive/2026-07-23-habit-lifecycle/` |
| **4c** | Completion types (count / duration / numeric / checklist, storage v2) | 📋 Planned | — (see `phase-4-plan.md`) |
| **5** | Notifications (time-based reminders, PWA) | 📋 Planned | — |
| **R0** | Redesign §0 — global shell (top bar, tokens, 2 stub routes) | ✅ Done, unmerged | `archive/2026-07-26-global-shell/` |
| **R1** | Redesign §1 — Dashboard (4 stat cards, `<app-stat-card>`, row restyle) | ✅ Done, uncommitted | `archive/2026-08-18-dashboard-redesign/` |
| **R2** | Redesign §2 — Habits (row restyle, `<app-day-strip>`, `<app-habit-form>`, create modal) | ✅ Done, unmerged | `archive/2026-08-19-habits-redesign/` |
| **R2b** | Redesign §2b — Habit detail page (**new**, missed by the original roadmap pass) | ✅ Done, uncommitted — 163 → **218** tests | `archive/2026-08-18-habit-detail/` (Large, split into 2 runs) |
| **R3** | Redesign §3 — Calendar (one card, per-status day numbers, Today ring) | ✅ Done, unmerged — 236 → **251** tests | `archive/2026-08-19-calendar-redesign/` |
| **R4–R5** | Redesign §4–§5 (Analytics, Stacks) | 📋 Planned | — (see `design-implementation-roadmap.md`) |
| — | Angular 17 → 21 upgrade (four major hops) | ✅ Done | `archive/2026-07-17-upgrade-angular-21/` |

## Notes

- Router: `/` = Dashboard, `/habits` = Manage, `/calendar` = per-habit monthly
  view, `/analytics` + `/stacks` = redesign stubs (roadmap §4/§5 replace them),
  `**` → Dashboard.
- Service derivations: `dayStatus`, `completionRate`, `isLapsed`, `monthGrid`,
  `isDueOn`, `currentStreak`, `longestStreak` — all pure, all live (AD-004).
- Test baseline after redesign §1 (`dashboard-redesign`): **134** passing
  (`npx ng test --watch=false --browsers=ChromeHeadless`). Was 115 after §0
  (itself 107 after 4b); §1 added 11 service specs, 3 stat-card specs and 5
  Dashboard specs.
- New service derivations from §1, all pure and live (AD-004): `poolCounts`,
  `perfectDays`, `topCurrentStreak`, `dueTodayCounts`, `earliestStartIso`, and
  the `shiftIso` date helper.
- Test baseline after redesign §2 (`habits-redesign`): **163** passing (was 134).
  §2 added `recentStatuses` (the one new derivation — pure, AD-004/AD-014), the
  page's **first** component specs, and specs for two new shared components.
- Shared components now: `<app-stat-card>` (§1), `<app-day-strip>` (§2, takes
  `statuses` + `hex`), `<app-habit-form>` (§2, `[habit]` null = create). §2b
  re-uses `day-strip` at a longer window; §4 still needs the heatmap primitive.
- **The prototype has six pages, not five.** The sixth (habit detail) is reached
  by clicking a habit's *name* on `/habits`. Roadmap §2b. See L-015.
- Design comparison needs `DESIGN_BASE_URL` when port 4200 is taken by another
  project: `DESIGN_BASE_URL=http://localhost:4300 npm run design:shot -- <name>`
  against `npx ng serve --port 4300`. See L-011.
- 4c is the slice that bumps `STORAGE_KEY` to v2 — deliberately not done earlier
  (`habit-metadata` R6), so the one-way migration is spent on a settled model.
- See `ROADMAP.md` for the product vision, `phase-4-plan.md` for the 4a/4b/4c
  slicing, `TEMPLATE.md` for spec structure.
