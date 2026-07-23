# Phase 4 — Rich habits: slicing plan

**Status:** proposed, not started. This is a *planning* document, not a spec.
Each slice below becomes its own `specs/<name>/` directory (Analyst → harden →
tasks) when we start it. Nothing here is committed to until its slice opens.

## Why this needs slicing at all

The roadmap's Phase 4 row is a bag of ten features: completion types, categories,
colors, icons, notes, edit/rename, archive vs delete, pause, start date,
reactivation. Sized as one unit that is **Complex** by the CLAUDE.md table
(multiple layers, a new domain, ambiguity) — and too big to verify in one pass.

The reason it can't just be "add some fields" is that everything the app computes
routes through exactly two primitives in `HabitService`:

1. **`isDueOn(habit, iso)`** — was it scheduled that day?
2. **`habit.completedDates.includes(iso)`** — was it done that day?

`currentStreak`, `longestStreak`, `dayStatus`, `completionRate`, `isLapsed`,
`monthGrid`, and both the dashboard and calendar components are all defined in
terms of those two. Phase 4 breaks **both**: pause/start-date changes (1),
completion types changes (2). So the slices are ordered by which primitive they
touch, riskiest last.

## The three slices

| Slice | Name | Size | Touches | Ships |
|---|---|---|---|---|
| **4a** | `habit-metadata` | Medium→Large | additive fields + edit UI | Categories, colors, icons, notes, description, rename/edit |
| **4b** | `habit-lifecycle` | Large | `isDueOn` + every list query | Start date, pause, archive, reactivate, delete-with-confirm |
| **4c** | `completion-types` | Complex | the completion primitive + storage v2 | Count / duration / numeric / checklist habits |

Order rationale: 4a is purely additive (no migration, no derivation changes), so
it ships value fast and cheap. 4b redefines "due". 4c redefines "done" and is the
only slice needing a storage-key bump — doing it last means the migration runs
once, against a model that has stopped moving.

---

## Slice 4a — `habit-metadata`

**In scope**
- `Habit` gains optional fields: `description?`, `category?`, `color?`, `icon?`,
  `notes?`. All optional → `isHabit` needs no migration (absent = fine), and old
  rows load unchanged. This is the cheap part and it should stay cheap.
- `HabitService.update(id, patch: Partial<Habit>)` — the first mutation in the
  service that isn't add/remove/toggle. Validates the same way `add` does
  (non-empty trimmed name, valid schedule) and persists.
- Edit UI on `HabitListComponent`: inline edit or a small form; rename included.
- Category as a free-text-with-suggestions string (not a separate entity — no
  category CRUD, no category ids). Colors/icons from a fixed curated palette/set,
  not a free colour picker.
- Colour + icon surface on the dashboard and calendar so they're actually worth
  having.
- Filter the habit list by category.

**Out of scope**
- Category management screen, category rename cascading, per-category stats
  (that's a Phase 3-style stats follow-up).
- Drag-to-reorder, custom sort.
- Rich-text notes; notes are a plain string on the habit, **not** per-day notes.
  Per-day notes are a different data shape and belong with 4c if ever.

**Decision to make in the Analyst:** editing a habit's `schedule` after creation.
Because every derivation is computed live from `schedule`, changing it
**retroactively rewrites past due-ness** — yesterday's "missed" can become
"not-due" and your streak can jump. That is arguably the *right* behaviour
(the roadmap's open question "does history recalculate?") but it must be a
conscious choice with a UI warning, not a surprise. Recommendation: allow it,
recompute live, warn in the edit form.

**Done when:** you can create a habit with a category/colour/icon, rename it,
edit its notes and schedule, and see the colour/icon on all three screens; old
localStorage rows still load; tests green.

---

## Slice 4b — `habit-lifecycle`

This is where "archive vs delete", "pause", and "start date" live. It is Large
because it changes `isDueOn` and *every* place that reads `habits()`.

**In scope**
- **`startDate: string`** (`YYYY-MM-DD`, local) replacing the currently-derived
  `createdIso(habit)` boundary in `isDueOn` / `currentStreak` / `longestStreak` /
  `completionRate` / `isLapsed`. Migration: backfill from the local date of
  `createdAt`, which is exactly what those five already compute, so existing
  numbers don't move. Lets users say "this starts Monday".
- **`status: 'active' | 'paused' | 'archived'`** (absent → `active`).
  - *Archived*: hidden from dashboard/today/list by default, history retained,
    reactivatable back to `active`. This answers the roadmap's lifecycle question.
  - *Delete*: stays permanent and irreversible, but gains a confirm step, and the
    UI should push archive as the default action.
- **Pause must be an interval list, not a boolean.** `pausedRanges: { from: string;
  to: string | null }[]` (`to: null` = currently paused). A boolean `paused` flag
  looks simpler and is wrong: when you unpause, a flag leaves no record that last
  week was paused, so `isDueOn` retroactively marks those days due and the missed
  days appear. Intervals make pause historically correct. This is the single
  non-obvious design point of the slice and the critic pass should focus here.
- `isDueOn` gains two clauses: false before `startDate`, false inside any paused
  range.
- An `activeHabits` computed on the service; every current consumer switches to
  it. Known call sites to update: `DashboardComponent` (`todoToday`, `doneToday`,
  `lapsed`, `overallCompletionRate`), `HabitListComponent`, `CalendarComponent`.
  Archived habits reachable via an explicit "Archived" view/toggle.

**Out of scope**
- Scheduled/future pauses ("pause next week"); pause starts now, ends now.
- Holiday calendars / bulk skip days (roadmap defers this).
- Auto-archiving stale habits.
- Undo for delete.

**Done when:** pausing a habit stops it accruing missed days, unpausing doesn't
retroactively punish the paused stretch, archiving hides it everywhere without
losing history, reactivating restores it, and a start date in the future means
the habit isn't due yet. Streak numbers for existing habits are unchanged after
the `startDate` migration — that's a specific regression test.

---

## Slice 4c — `completion-types`

The big one. Complex per the sizing table: it changes the meaning of "done",
which every Phase 1–3 derivation depends on.

**In scope**
- A `CompletionType` union on the habit, each carrying its goal:
  - `{ kind: 'yes-no' }` — today's behaviour, the default and the migration target
  - `{ kind: 'count'; goal: number; unit?: string }` — "8 glasses"
  - `{ kind: 'duration'; goalMinutes: number }` — "30 min"
  - `{ kind: 'numeric'; goal: number; unit: string; direction: 'at-least' | 'at-most' }`
    — covers weight/distance/pages in one type instead of one type each
  - `{ kind: 'checklist'; items: { id: string; label: string }[] }` — done = all
    items ticked
- **Storage change:** `completedDates: string[]` becomes a keyed record
  `entries: Record<string /*iso*/, CompletionEntry>` where the entry holds the
  recorded value (`{ value: number }` or `{ checked: string[] }`). Bump
  `STORAGE_KEY` to `...habits.v2` and write a real v1→v2 migration: every date in
  `completedDates` becomes a yes-no entry. Keep the v1 reader so the migration is
  one-way and testable, then let v1 go.
- **One predicate, `meetsGoal(habit, iso): boolean`**, replaces every
  `completedDates.includes(iso)` in the service. This is the whole trick: if all
  of `isDoneToday`, `dayStatus`, `currentStreak`, `longestStreak`,
  `completionRate`, `isLapsed`, `monthGrid`, `lastDoneIso` route through it, the
  Phase 2/3 logic and its 30 tests survive untouched.
- UI: today's checkbox becomes type-appropriate input (stepper for count, minutes
  for duration, number+unit for numeric, sub-checkboxes for checklist). Progress
  shown against the goal.

**Out of scope**
- Partial credit in streaks/stats — a day either meets the goal or it doesn't.
  Fractional streaks are a rabbit hole.
- Editing/backfilling past days' values (still today-only, as in Phases 1–3).
  Worth its own later slice; call it out explicitly so it isn't assumed.
- Changing a habit's completion type after creation with historical values
  present. Recommendation: block it, or offer "archive and re-create".
- Per-type charts/graphs (Phase 3+ stats territory).
- Timers/stopwatches for duration habits — manual entry only.

**Done when:** a count habit only counts as done at its goal, streaks and the
calendar reflect that, existing v1 yes-no habits migrate with identical streak
numbers, and all Phase 1–3 tests still pass unmodified.

---

## Open product questions this plan resolves

From `specs/ROADMAP.md` — with recommendations, to confirm in each slice's Analyst:

| Question | Recommendation | Slice |
|---|---|---|
| Can habits be reactivated? | Yes — archive is reversible, delete is not | 4b |
| Is deleting permanent? | Yes, permanent + confirm; archive is the nudged default | 4b |
| Do archived habits stay in history? | Yes, retained in full | 4b |
| Does history recalculate on schedule change? | Yes (live derivation), with a UI warning | 4a |
| Which completion types? | The five above; skip distance/weight as separate types — `numeric` with a unit covers them | 4c |

## Risks

- **Consumer sprawl.** Three components read `habits()` directly and call service
  methods per-habit from templates. 4b and 4c both have to sweep all of them; a
  missed call site is a silent wrong number rather than a crash.
- **Migration is one-way.** The v2 bump in 4c has no rollback. It needs tests for
  the corrupt/partial/legacy cases the way `isHabit` already does, before it ships.
- **Scope creep inside 4a.** Categories and colours invite a settings screen.
  If mid-slice it grows past the Analyst, stop and re-classify (CLAUDE.md rule).
