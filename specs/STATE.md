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
| — | Angular 17 → 21 upgrade (four major hops) | ✅ Done | `archive/2026-07-17-upgrade-angular-21/` |

## Notes

- Router: `/` = Dashboard, `/habits` = Manage, `/calendar` = per-habit monthly view.
- Service derivations: `dayStatus`, `completionRate`, `isLapsed`, `monthGrid`,
  `isDueOn`, `currentStreak`, `longestStreak` — all pure, all live (AD-004).
- Test baseline after 4b: **107** passing
  (`npx ng test --watch=false --browsers=ChromeHeadless`).
- 4c is the slice that bumps `STORAGE_KEY` to v2 — deliberately not done earlier
  (`habit-metadata` R6), so the one-way migration is spent on a settled model.
- See `ROADMAP.md` for the product vision, `phase-4-plan.md` for the 4a/4b/4c
  slicing, `TEMPLATE.md` for spec structure.
