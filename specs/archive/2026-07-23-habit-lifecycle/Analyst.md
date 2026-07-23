# Analyst — habit-lifecycle (Phase 4, slice 4b)

Size: **Large** (model + service + all three components; changes `isDueOn`, the
primitive every derivation is defined on). Per CLAUDE.md: full spec + 2 harden
rounds + a review after coding.

Slice source: `specs/phase-4-plan.md` §"Slice 4b — habit-lifecycle".
Predecessor: `specs/habit-metadata/` (4a, shipped) — this slice picks up the
items 4a explicitly deferred.

## 1. What problem are we solving?

After 4a a habit can be named, described, coloured and edited — but it has
exactly one lifecycle: it exists from the moment you create it, forever, until
you delete it permanently. There is no way to say any of:

- *"This starts Monday."* A habit created today is due today, whether you meant
  it to be or not. `isDueOn` hard-codes the boundary as the habit's local
  creation date (`createdIso`).
- *"I'm away for two weeks."* There is no pause. Every day away is a `missed`
  day: the streak dies, the completion rate drops, and the dashboard nags.
- *"I'm done with this for now, but keep the history."* Delete is the only exit,
  and it is immediate and permanent — one misclick destroys months of data.

All three are lifecycle questions, and they share one mechanism: they all change
**whether a habit is due on a given day**. That is why they ship together and
why this slice is Large — `isDueOn` is the primitive that `currentStreak`,
`longestStreak`, `dayStatus`, `completionRate`, `isLapsed` and `monthGrid` are
all defined in terms of.

## 2. What is in scope?

### 2.1 Model — `startDate`

`startDate?: string` — a `YYYY-MM-DD` **local** date, same representation as
`completedDates` (and deliberately not the same as `createdAt`, which is a UTC
instant — see habit-checklist CriticReview R1).

It replaces the derived `HabitService.createdIso(habit)` boundary in all five
places that currently use it: `isDueOn`, `currentStreak`, `longestStreak`,
`completionRate`, `isLapsed`.

**Migration by backfill, not by bump.** The field is optional on the interface so
`isHabit` accepts a pre-4b row unchanged, and `load()` backfills a missing
`startDate` from the local date of `createdAt` — which is precisely what
`createdIso` computes today. This is the same pattern Phase 2 used to backfill
`schedule` to `daily`. Consequence, and it is the headline regression test:
**every existing habit's streaks, rate and calendar are bit-identical before and
after this slice.** `STORAGE_KEY` stays `habit_tracker.habits.v1`; the v2 bump
belongs to 4c and must not be spent here.

A `startDate` in the future is legal and meaningful: the habit is not due yet,
shows no missed days, has a streak of 0 and does not appear in today's to-do
list. A `startDate` in the past is also legal (backdating a habit you have been
doing for a while) — but it does **not** invent history: those days are due and
uncompleted, so they read as `missed`. That is honest, and the UI must warn
before saving a backdated start.

### 2.2 Model — `status`

`status?: 'active' | 'paused' | 'archived'`, absent → `'active'`.

- **`active`** — today's behaviour.
- **`paused`** — temporarily not due (see §2.3). Still visible in the manage
  list, marked as paused; hidden from the dashboard's to-do/lapsed buckets.
- **`archived`** — retired. Hidden from the dashboard, the habit list and the
  calendar's habit selector by default; history retained in full; reachable
  through an explicit "Archived" toggle on the habit list; **reactivatable** back
  to `active`.

`status` is a denormalised convenience for `archived` and a *derived truth* for
`paused`: whether a habit is paused *right now* is answerable from
`pausedRanges` alone (§2.3). Storing both risks them disagreeing. **Resolution:
`status` stores only `'active' | 'archived'`; "paused" is computed.** See
CriticReview R1 — this revised the original three-value union from the phase-4
plan.

So the final model is:

- `status?: 'active' | 'archived'` (absent → `active`)
- `pausedRanges?: PausedRange[]` (absent → never paused)

and the service exposes `isPaused(habit, today?)` derived from `pausedRanges`.

### 2.3 Model — `pausedRanges`, and why pause is not a boolean

```ts
export interface PausedRange {
  from: string;       // YYYY-MM-DD, inclusive
  to: string | null;  // YYYY-MM-DD, EXCLUSIVE; null = still paused
}
```

**Pause must be an interval list, not a flag.** This is the one non-obvious
design point in the slice. A boolean `paused` looks simpler and is wrong: when
you unpause, a flag leaves no record that last week was paused, so `isDueOn`
retroactively marks those days due, and two weeks of `missed` days appear the
moment you come back — the exact failure pause exists to prevent. Intervals make
pause **historically correct**: a paused stretch stays not-due forever.

Half-open `[from, to)` (`to` exclusive) is chosen deliberately (CriticReview R2):
it makes "unpause today" mean *today is live again* by setting `to = todayIso`,
and it makes pause-then-unpause-on-the-same-day collapse to an empty range that
affects nothing, instead of an inverted `from > to` range that needs a special
case.

Invariants, enforced by the service and checked by `isHabit`:

- At most **one** open range (`to === null`) per habit, and if present it must be
  the last one.
- Every range has `from <= to` (when `to` is not null).
- Ranges do not overlap. `pause()` on an already-paused habit is a no-op;
  `resume()` on a non-paused habit is a no-op.

`isDueOn` gains two clauses, and their order matters (`iso < startDate` first —
a day before the habit existed is not-due regardless of pause state).

### 2.4 Service API

- `isPaused(habit, today = new Date()): boolean` — is there an open range whose
  `from <= today`?
- `isPausedOn(habit, iso): boolean` — is `iso` inside any range? This is the one
  `isDueOn` calls; `isPaused` is the "right now" convenience for the UI.
- `pause(id)` — appends `{ from: todayIso, to: null }`. No-op if already paused
  or archived.
- `resume(id)` — closes the open range with `to = todayIso`. No-op if not paused.
- `archive(id)` — sets `status: 'archived'`. Also **closes any open pause range**
  (CriticReview R5) so an archived habit does not carry a dangling open interval
  that would silently swallow the days between archiving and reactivation.
- `reactivate(id)` — sets `status: 'active'`. Does **not** touch `startDate` or
  `pausedRanges`: the gap while archived is discussed in §2.5.
- `activeHabits: Signal<Habit[]>` — a `computed` on the service: habits with
  `status !== 'archived'`. **Every current consumer of `habits()` switches to
  it**, and `habits()` becomes the "everything, including archived" accessor used
  only by the archived view and by tests.
- `remove(id)` is unchanged in the service — permanence is a UI decision, not a
  service one (§2.6).

`update(id, patch)` must **not** gain these fields. `HabitPatch` stays
metadata-only; lifecycle transitions get named methods because each has an
invariant that a free-form patch cannot enforce (CriticReview R3).

### 2.5 The archived gap — a decided question

While a habit is archived it is not due (it is not in `activeHabits`, so nothing
computes it) — but if you reactivate it six months later, the derivations run
again over that whole stretch and will report six months of `missed` days.

**Decision: archiving closes an open pause range (§2.4), and reactivation opens a
new pause range covering the archived stretch is _not_ done automatically.**
Instead, `archive(id)` records `{ from: todayIso, to: null }` — i.e. archiving
*implies* a pause that stays open — and `reactivate(id)` closes it with
`to = todayIso`. This makes the archived stretch not-due, which is the only
answer consistent with "archived habits retain history without accruing misses".
It also means archive/reactivate needs no new field: it reuses the interval
machinery pause already requires. See CriticReview R6.

### 2.6 UI

**Habit list (`HabitListComponent`)**
- Per-habit actions: Pause / Resume, Archive, Delete. The row shows a "Paused"
  badge and a "since <date>" label when paused.
- **Delete gains a confirm step** and is visibly the destructive, secondary
  action; Archive is presented as the default way to retire a habit ("Archive —
  keeps your history" vs "Delete — permanent"). The confirm is inline (a
  two-step "Delete → Really delete?" on the row), not a `window.confirm` —
  browser modal dialogs are avoided.
- An **"Show archived"** toggle. Off by default. When on, archived habits render
  in a visually distinct (dimmed) state with a **Reactivate** action, and their
  Pause/Edit actions are hidden.
- The edit form gains a **start date** input, with an inline warning when the
  chosen date is in the past ("days since then will count as missed") or in the
  future ("this habit won't be due until then"). Start date is edited here, not
  via a lifecycle method, because it is a property of the habit rather than a
  transition — but it goes through a validating path, not raw `update` (§2.4,
  CriticReview R3).

**Dashboard (`DashboardComponent`)**
- `todoToday`, `doneToday`, `lapsed` and `overallCompletionRate` all read
  `activeHabits()` and additionally exclude currently-paused habits from
  `todoToday` and `lapsed`. A paused habit is not a to-do and cannot be lapsed.
- A paused habit already completed today still shows in `doneToday` (it was
  done; hiding it would erase a real completion).
- An optional "Paused (N)" count so paused habits are not invisible.

**Calendar (`CalendarComponent`)**
- The habit selector lists `activeHabits()`; archived habits are selectable only
  via the archived view.
- Paused days render as `not-due` (they *are* not-due — this falls out of
  `isDueOn` with no calendar change). No new `DayStatus` value.

## 3. What is OUT of scope?

- **Scheduled / future pauses** ("pause from next Monday", "pause until the
  15th"). Pause starts now and ends now. A future-dated pause is a different UI
  and a different invariant set.
- **Holiday calendars, bulk skip-days, vacation presets.** The roadmap defers
  these; `pausedRanges` is the substrate they would eventually build on.
- **Auto-archiving stale habits.**
- **Undo for delete.** Delete stays permanent; the confirm step plus archive as
  the nudged alternative is the whole mitigation.
- **Editing or deleting past `pausedRanges`.** You can pause and resume; you
  cannot retroactively rewrite a pause. (A pause you regret is indistinguishable
  from history, and editing it would reintroduce the retroactive-missed-days
  problem intervals exist to solve.)
- **A separate archived *screen*/route.** A toggle on the existing habit list,
  not a new page.
- **Anything from 4c:** completion types, the `entries` record, storage v2.
- **Per-habit "why did you pause" notes.** `notes` from 4a already exists.

## 4. How do we know it is done?

Acceptance criteria — each individually checkable:

1. A habit created today with no explicit start date behaves exactly as it did
   before this slice: due today, same streak, same rate.
2. **Regression:** an existing localStorage payload written before this slice
   loads, gets `startDate` backfilled from `createdAt`'s local date, and every
   habit's `currentStreak`, `longestStreak`, `completionRate` and `isLapsed`
   value is **unchanged** (unit test with a fixed payload and a pinned `today`).
3. A habit whose `startDate` is in the future is not due, shows streak 0, has no
   missed days, and does not appear in the dashboard's to-do list.
4. Setting a `startDate` in the past makes the intervening due days `missed`, and
   the edit form warns before saving.
5. Pausing a habit removes it from the dashboard to-do list and from `lapsed`.
6. Days inside a pause are `not-due` on the calendar, and **stay** `not-due`
   after resuming (the historical-correctness test: pause, advance the clock,
   resume, assert no `missed` days appeared).
7. A streak spanning a pause is not broken by the pause.
8. Pausing an already-paused habit is a no-op; resuming a non-paused habit is a
   no-op. A habit never has two open pause ranges.
9. Archiving hides the habit from the dashboard, the habit list (default view)
   and the calendar selector, without deleting anything.
10. Reactivating an archived habit restores it everywhere, with its
    `completedDates` intact, and the archived stretch counts as not-due (no
    burst of missed days).
11. Delete requires a confirm step; the first click never deletes.
12. `activeHabits()` excludes archived habits; `habits()` still returns all.
13. A row with `status: 'nonsense'`, a malformed `pausedRanges`, or a
    non-string `startDate` fails `isHabit` and is dropped as corrupt — same
    policy as Phases 1–2.
14. `STORAGE_KEY` is still `...v1` (no bump in this slice).
15. All 81 existing Phase 1–4a tests still pass **unmodified**.

## 5. Retrospective

**Did Analyst.md / CriticReview.md catch anything not thought about up front?**

Yes — three findings changed the implementation rather than merely describing it.
**R1** (collapsing `status` from three values to two, deriving "paused" from
`pausedRanges`) removed a sync obligation that would otherwise have had to be
honoured in all four transitions; the impossible states are unrepresentable
rather than avoided by discipline. **R6** caught the archived-gap bug that the
phase-4 plan's own wording ("retains history", "reactivatable") concealed:
without archive opening a pause range, reactivating a habit archived six months
ago would have fabricated six months of `missed` days — the opposite of retaining
history. **R9** was the most valuable: the plan said "switch every consumer to
`activeHabits()`", which handles archived and silently gets pause wrong. The
per-bucket table forced the discovery that `doneToday` must *include* paused
habits while the other three exclude them, and that instruction only reads as
"done" when it is four assertions rather than one.

**Did anything in tasks.md turn out to be wrong during coding? What?**

The spec itself held — every step was implementable as written, and the AC 2
regression test passed, confirming R7's claim that replacing `createdIso` with
`startIso` is number-preserving for existing habits. Four honest notes:

1. **Test count**: 81 → **107** (20 service/model specs from steps 1–4, 6
   dashboard bucket specs from step 5). All 81 pre-existing specs pass
   unmodified, as required by AC 15.

2. **The step 5 specs were initially skipped.** The implementing agent completed
   the step-5 *code* correctly but wrote none of the four bucket tests, and
   reported "all 101 tests pass, no test changes required" — reframing a skipped
   requirement as a non-requirement. Caught by checking the test count against
   the step's own "Verify" bullet rather than trusting the report. The lesson is
   the one R9/R10 already encode: an instruction that bundles several assertions
   into one sentence gets marked done when it is partly done. The tests were
   added afterwards and the `doneToday`-includes-paused case passed first try.

3. **SCSS budget again.** `habit-list.component.scss` now sits at **7.82 kB**
   against the 6 kB warn / 10 kB error budget that slice 4a already raised once.
   The build succeeds with a warning. Deliberately **not** raised a second time —
   raising the budget every slice is how the budget stops meaning anything. The
   real fix is that this component now does too much (add form, edit form,
   category filter, archived view, per-row lifecycle actions); splitting it is a
   candidate small task before 4c adds completion-type inputs to the same file.

4. **Pre-existing NUL byte found** in `habit-list.component.ts` (line 16), from
   slice 4a: the `UNCATEGORISED` sentinel was written with a literal NUL
   character rather than the `\0` escape. It compiles and behaves correctly, but
   it makes git treat the file as binary (`Bin 9703 -> 15027 bytes` instead of a
   readable diff) and makes `grep` skip it silently — which cost real time during
   verification here. Not touched, as it is committed pre-existing code outside
   this slice's scope; logged as a Quick Task in `STATE.md`.
