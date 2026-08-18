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
   one-line stub here. **Lessons never move** — they are permanent.
4. **Every entry is dated and says *why*, not just *what*.** A decision without
   its reasoning cannot be revisited safely.
5. Entries are written **when the thing happens**, not reconstructed later.
   Reconstruction is how the reasoning gets lost.

## Archive ritual (run when a feature is finished)

A spec archived without its lessons recorded is **silent memory loss** — the
code keeps the decision, nobody keeps the reason. So, in order:

1. **Read the spec one more time** — `Analyst.md`, `tasks.md`, and especially
   `CriticReview.md`. The critic findings are where the lessons live.
2. **Add the `AD` / `L` (and any `B`) entries it produced** to this file.
3. **Move the folder** to `specs/archive/YYYY-MM-DD-<name>/` (the date it was
   finished) and update anything that linked to the old path.
4. **Both changes go in the same commit.** Never a commit that moves the spec
   without the entries — that is the failure this ritual exists to prevent.

---

## Decisions

**AD-001 — Client-side only: localStorage, single device, no backend.**
(2026-07-16, `ROADMAP.md`) No accounts, no server until a phase explicitly
demands one. Buys a shippable Phase 1 in hours instead of days. Known expiry:
Phase 5 (notifications) is the phase that forces the conversation.

**AD-002 — Corrupt rows are dropped, never coerced.**
(2026-07-17, `archive/2026-07-17-habit-checklist` R3, reaffirmed
`scheduling-streaks` R1, `habit-metadata` R7, `habit-lifecycle` R4) `isHabit`
rejects any row with a present-but-malformed field; the row is discarded on
load. Only *absent* fields are backfilled with defaults. Coercing corrupt data
produces a habit that looks fine and silently reports wrong numbers — the
worst failure mode for a tracker whose entire value is its history.

**AD-003 — Dates are constructed as local calendar dates, never parsed from ISO.**
(2026-07-17, `scheduling-streaks` R2/R5) `new Date(y, m-1, d)` from split
parts, never `new Date('2026-07-17')` — the latter parses as UTC midnight, so
in negative-offset timezones `getDay()` returns the previous weekday. One
shared helper derives the start-of-history boundary so every derivation agrees.

**AD-004 — Derivations are live and pure, never stored.**
(2026-07-17, Phases 2–3) Streaks, completion rate, day status and lapsed-ness
are computed from `completedDates` + `schedule` on every read. `habits` is a
signal, so changing a habit recomputes everything with nothing to invalidate.
Cost is trivial at this scale (`scheduling-streaks` R10) and it removes a whole
class of stale-cache bugs.

**AD-005 — History is unrepresentable in an edit patch, not stripped at runtime.**
(2026-07-23, `habit-metadata` R1/R2) `update` takes an explicit `HabitPatch`
type rather than `Partial<Habit>`, so `id` / `createdAt` / `completedDates` are
a *compile* error rather than a silent runtime no-op the caller cannot see.
Validation is atomic: any invalid key rejects the whole patch. Extended by
AD-007.

**AD-006 — Colour never carries meaning on its own.**
(2026-07-23, `habit-metadata` R8/R10/R16) Status owns the colour channel that
was already encoding status (calendar day cells, the dashboard's status
border); habit colour appears only as decoration alongside an icon and a text
label, and moves to a different element where it would collide. Two meanings on
one channel makes the important one unreadable.

**AD-007 — `status` is `'active' | 'archived'`; paused is derived.**
(2026-07-23, `habit-lifecycle` R1/R2/R5/R6, supersedes the three-value union
proposed in `phase-4-plan.md`) Paused-right-now is fully determined by "is
there an open `pausedRange`?", so storing it too creates two facts that drift.
`PausedRange.to` is **exclusive** — `[from, to)` — so same-day pause/resume is
a well-formed empty range instead of an inverted one. Archive opens a range and
reactivate closes it, so an archived stretch accrues no missed days. Because
`pausedRanges` determines what *was* due, it is history and stays out of
`HabitPatch` per AD-005 — reachable only through the named transitions.

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

**AD-012 — Perfect-days and the overall rate read `activeHabits`, so archiving
edits the past.** (2026-08-18, `dashboard-redesign` §3.3, R4) Archiving a habit
removes it from every *past* day too, so days it used to spoil become perfect
retroactively and the count can go **up**. Kept deliberately, consistent with
what the header has always done (`habit-lifecycle` R10); the alternative makes
archiving cosmetic and puts two different histories on one page. Named as a
decision so nobody "fixes" it into an inconsistency — see L-008.

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

## Blockers

**B-001 — The Haiku-enforcement hook denied every non-`.md` edit in the repo.**
(2026-07-23, resolved) `enforce-haiku-tasks-pretooluse.sh` fired whenever the
string `tasks.md` appeared in the last 60 transcript lines — and merely
*reading* `STATE.md` put it there, so unrelated Small tasks were blocked with a
message about a spec run that was not happening. Fixed by keying the hook to an
explicit `## Executing: <spec>` line in the root `STATE.md`, which the session
adds when a run starts and removes when it ends. See L-004.

## Lessons

*Permanent. These never move to the archive.*

**L-001 — A duplicated fact is a bug with a delay on it.**
(`habit-lifecycle` R1) `status: 'paused'` alongside `pausedRanges` would have
needed a sync obligation on every transition, and the failure mode was silent:
`'active'` with an open range is a habit that looks healthy and is never due
again. Prefer deriving over storing; prefer unrepresentable over "we remember
to check".

**L-002 — Push guarantees into the type system; runtime strips hide the error.**
(`habit-metadata` R1) A runtime strip of `completedDates` makes the dangerous
call compile, run, and appear to work. A narrowed patch type makes it a red
squiggle at the call site. When both are available, the type is strictly
better — and a runtime strip *on top of* a good type only masks a real compile
error.

**L-003 — "Retains history" and "fabricates failure" look identical until you
walk the dates.** (`habit-lifecycle` R6) Reactivating a habit archived six
months earlier would have replayed those months as due-and-uncompleted:
streak destroyed, rate tanked, lapsed on arrival. The plan said "retains
history" and meant it. Whenever a feature reopens a time range, ask what the
live derivations will say about the gap.

**L-004 — A guard-rail keyed to a fuzzy signal fails open *and* closed.**
(B-001) Grepping the transcript for `tasks.md` blocked innocent work while
still not proving a run was in flight. An enforcement hook needs an explicit,
deliberately-set marker — if the signal can be tripped by reading a file, it is
not a signal.

**L-005 — Write `tasks.md` for the executor, who has no other context.**
(`TEMPLATE.md`) Steps are planned on a large model and run on Haiku, which sees
only the step in front of it. Pointing at `Analyst.md` does not count; anchor
by symbol name rather than line number; keep the build green at every step.

**L-006 — A "switch every consumer to X" instruction reads as done when it is
half-done.** (`habit-lifecycle` R9/R10) Each dashboard bucket wanted a
*different* answer for paused habits (`doneToday` includes them; `todoToday`
does not), and a missed call site is a silently wrong number rather than a
crash. Enumerate the call sites in the step, and add a `grep` as a mechanical
completeness check.

**L-007 — Order the clauses that cannot change the answer anyway, and say why.**
(`habit-lifecycle` R8, Phase 3 R1) `isDueOn` checks start-date → pause →
schedule. All three return `false`, so order does not change the result — but
it is the first thing a reader checks when a day renders wrong, so it is worth
specifying.

**L-008 — Name the accepted downside so it is a decision, not an oversight.**
(`habit-lifecycle` R15) Pause preserves a streak, so a user can protect a
streak by pausing instead of doing the habit. Accepted deliberately — pause
exists so the app does not punish a legitimate absence, and every anti-abuse
rule is a product policy nobody asked for. Written down precisely so the next
person does not "fix" it.

**L-009 — Verify the migration is number-preserving before claiming it is
additive.** (`habit-lifecycle` R7, `habit-metadata` R6) The `startDate`
backfill was checked call site by call site against the expression it replaced
(`createdIso`) — same value, five call sites, no other consumers — which is
what let the slice skip a `STORAGE_KEY` bump and demand bit-identical numbers.
Corollary: delete the old helper, don't leave two ways to compute one boundary.

**L-010 — An acceptance criterion that contradicts the body of its own spec gets
implemented as written.** (`global-shell` R11/R12) Two criteria in §4 still
carried the roadmap paraphrases the body existed to overturn — a "filled blue
pill" and a "~1150px column". §4 is the section an executor treats as the
contract, so the corrections in §2.2/§2.3 would have lost to them. The R12 case
is the dangerous shape: a wrong constraint that is *also self-verifying* —
wrapping `<router-outlet>` at 1150px would have overridden all five per-page
widths while every "Done when" still reported green. When a harden round
overturns a claim, grep the acceptance criteria for the old wording; a fold-back
audit is not optional.

**L-011 — Verify design values against the committed mockup's pixels, not
against the eye.** (`global-shell`, Phase 0 design check) Reading
`design/target/dashboard.png` visually suggested a ~27px logo; measuring the
PNG's bounding boxes gave exactly the 22px the spec had sampled. The same
measurement then caught a real defect the composite hid — nav items drifting 1px
each, 4px by the fifth, from a `gap` specified as 3px where the mockup used 2px.
A side-by-side composite is for judging *whether* something is off; a bounding
box on the target file is for finding *what*. Corollary: check which app is
actually on the dev-server port before believing a screenshot — port 4200 was
serving a different project, and the first "actual" capture was someone else's UI
entirely.

**L-012 — A value you did not sample is a value you invented.**
(`dashboard-redesign`, design check) Every number in the Dashboard SCSS came out
of the prototype source except one: `line-height: 1` on the emoji glyph, added
by reflex because "icons need a tight line box". The prototype sets none, and
the emoji font's normal line box (~25px at 15px) is precisely what makes a habit
row 49px rather than 44px — so every row was 5px short and the error compounded
down the page. The side-by-side composite did not show it; scanning the target
PNG's pixel rows found it in one pass. Corollary to L-011: when a component is
built from sampled values, the *absence* of a property is part of the sample.

**L-013 — The executor stopping is the process working, not the process
failing.** (`dashboard-redesign` Step 10) The Haiku run halted on a failing
spec, reported the cause correctly (a root-provided service reads localStorage
once, so reseeding between two `createComponent()` calls in one `it` changes
nothing), and did **not** adjust the expectation to go green. The defect was in
`tasks.md`, written by the planning model. That is the failure mode the "If
blocked — do not improvise, never change a spec's expectation" clause exists to
catch, and it caught one on its first real outing. Keep the clause in every
step.

**L-014 — A screenshot of an empty store verifies nothing.**
(`dashboard-redesign` §3.7) The Dashboard's whole redesign is a summary layer,
and against an empty store it renders "Add a habit first." — so the design check
had nothing to compare until demo data existed. Seeding is part of the
comparison tooling, not a nice-to-have: `--seed` on `design-shot.mjs`. It also
surfaced a defect no unit test would have (see the Quick Task on `isLapsed`) —
real-shaped data is a test in its own right.

**L-015 — A prototype's interactive surface is invisible in its screenshots.**
(`habits-redesign` §6, roadmap §2b) The Habits mockup's habit *name* is a link
to a whole sixth page — a per-habit detail view with its own hero, streak
display and all-history grid. In the PNG it is bold black text, so the roadmap's
original §2 critic pass looked straight at it and recorded nothing. The link
exists only as an `onClick` in the markup, exactly as the nav's active/inactive
colours existed only as a ternary in the trailing `<script type="text/x-dc">`.
That is twice now. **Enumerate the `onClick`/handler attributes in the source
and account for every distinct target; do not enumerate clickable-*looking*
things in the image.** A missed page is the largest possible roadmap error —
larger than any wrong colour, because it is a whole spec that never gets
written.

**L-016 — Re-run a delegated step's own "Done when"; do not trust the report.**
(`habits-redesign` Step 6 → 7b) The executor declared Step 6 complete while the
step's own grep — no raw hex in the extracted SCSS — was still failing on 29
literals, and its report said the step passed. Two steps later the file would
have been buried under a full restyle. The check cost one `grep` at the top
level. Corollary to L-013: L-013 says a stopping executor is the process
working; this says a *reporting* executor is not evidence of anything. Verify
the commands, not the prose. The same run under-reported its test count (152 vs
an actual 154) and later over-predicted it (165 vs 163) — reports drift in both
directions.

**L-017 — Predict the assertions, not the `it` count.**
(`habits-redesign` Step 8) `tasks.md` asked for "one spec" pinning `add`'s new
return value; the executor instead strengthened the three *existing* `add` specs
with the same assertions — better coverage, unchanged `it` count — and the run
ended at 163 against a predicted 165 with nothing actually missing. Absolute
totals make a silently skipped suite visible (`TEMPLATE.md`) and that is worth
keeping, but they manufacture a phantom failure whenever new coverage lands
inside an existing spec. State the total as a **floor** (`≥N`), and name the
assertions that must exist rather than the number of blocks holding them.

**L-018 — A stop clause is not a substitute for opening the file.**
(`habits-redesign` CriticReview R11) `tasks.md` had already written
`const created = this.habitService.add(...)` plus an "If blocked — STOP if `add`
does not return a habit" clause. `add` returned `void`. The clause would have
worked: the run halts, correctly, twelve steps in. One `grep` of the signature
during the critic pass removed the halt entirely. Write the stop clause *and*
check the assumption it guards — the clause is the net, not the plan.

## Quick Tasks

*Small work done without a spec (3 files or fewer, one sentence describes it).*

| Task | Status | Notes |
|---|---|---|
| `tasks.md` step format for Haiku | ✓ Done | `TEMPLATE.md`: step template (Depends on / Files + DO NOT TOUCH / Context / Do / Done when / If blocked), anchor-by-symbol, ordering rules. Docs only → L-005 |
| design-compare tooling | ✓ Done | `scripts/design-shot.mjs`, `npm run design:shot`, `/design-check`. Playwright screenshot → composite beside `design/target/<name>.png`. Tooling only |
| Fix the Haiku-enforcement hook | ✓ Done | See B-001 / L-004 |
| Consolidate the two `STATE.md` files | ✓ Done | See AD-008 |
| Replace the literal NUL byte in `habit-list.component.ts`'s `UNCATEGORISED` sentinel with a `\0` escape | 📋 Open | git treats the file as binary and `grep` skips it (found during 4b) |
| Split `HabitListComponent` | 📋 Open | Its SCSS is 7.82 kB against a 6 kB warn budget, and 4c will add more to the same file |
| Demo-data seeding for design checks | ✓ Done | `scripts/demo-data.mjs` (six habits, 126 days, the prototype's own LCG) + `scripts/seed-demo.mjs` + `--seed` on `design-shot.mjs`. Tooling only — nothing under `src/` imports it. See L-014 |
| Split `HabitListComponent` (SCSS over budget) | ✓ Done | Closed by `habits-redesign` — extracting `<app-habit-form>` and `<app-day-strip>` took the file from 7.82 kB (1.82 kB over the 6 kB warn, 2.18 kB from the 10 kB **error**) to no warning at all. It was not a tidy-up: the row restyle could not land until it did |
| Tokenise the 29 pre-AD-009 hex literals in the edit form | ✓ Done | `habits-redesign` Step 7b. `#ccc`/`#555`/`#222`/`#f0f0f0` predated the redesign palette entirely; extracting the form into `shared/habit-form/` is what made them visible. See L-016 |
| Back-fill component coverage for pause / resume / archive / reactivate / delete-confirm | 📋 Open | `habits-redesign` CriticReview R1: the page had **zero** component specs before this slice. It now has 12 (`getScheduleLabel`, create modal, row rendering) but these five transitions are still untested at the component level. Sized **Small** |
| Add a habit-detail route (roadmap §2b) | 📋 Open | **Not Small** — sized Large, needs its own spec. Listed here only so it is not lost: the habit name on `/habits` is deliberately static text today, and becomes a `routerLink` when §2b lands. See L-015 |
| **`isLapsed` makes "Overdue / slipping" useless once history exists** | 📋 Open | Found by the §1 design check, **not** introduced by it. `isLapsed` = "≥1 missed day ever", so after a few weeks *every* habit qualifies: the section listed all six demo habits, three of them labelled "last done today". The target shows one. The prototype's rule is "not done today **and** last done ≥2 days ago" (`!doneToday && lastAgo >= 2`). Deliberately left alone — bucket definitions were out of scope for `dashboard-redesign` (§4) and this changes behaviour, not appearance. Sized **Small** (one computed, `dashboard.component.ts`) if adopted |

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
| **R2** | Redesign §2 — Habits (row restyle, `<app-day-strip>`, `<app-habit-form>`, create modal) | ✅ Done, uncommitted | `habits-redesign/` |
| **R2b** | Redesign §2b — Habit detail page (**new**, missed by the original roadmap pass) | 📋 Planned | — (roadmap §2b; Large) |
| **R3–R5** | Redesign §3–§5 (Calendar, Analytics, Stacks) | 📋 Planned | — (see `design-implementation-roadmap.md`) |
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
