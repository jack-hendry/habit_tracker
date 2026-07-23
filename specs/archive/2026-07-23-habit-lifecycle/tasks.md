# tasks — habit-lifecycle (Phase 4, slice 4b)

Written after `Analyst.md` and hardened by two rounds in `CriticReview.md`. Each
step is verifiable on its own. Run `npm test` after every step that touches
logic.

**Baseline before starting:** **81** tests passing, measured with
`npx ng test --watch=false --browsers=ChromeHeadless` (the figure at the end of
slice 4a — see `specs/habit-metadata/Analyst.md` §5, which corrected STATE.md's
stale 30). That number must never go down; it only goes up.

**Do not bump `STORAGE_KEY`** anywhere in this slice (AC 14). The v2 migration
belongs to 4c and spending it here would burn a one-way migration on a model
that is still moving.

---

## 1. Model — `startDate`, `status`, `PausedRange`

In `src/app/habit/habit.model.ts`:

- Add to `Habit`:
  ```ts
  startDate?: string;                 // YYYY-MM-DD local; backfilled on load
  status?: 'active' | 'archived';     // absent → 'active'
  pausedRanges?: PausedRange[];
  ```
- Export the range type, with the half-open convention **documented on the type
  itself** (R2 — this is where the off-by-one gets prevented):
  ```ts
  export interface PausedRange {
    from: string;      // YYYY-MM-DD, inclusive
    to: string | null; // YYYY-MM-DD, EXCLUSIVE; null = still paused
  }
  ```
- Extend `HabitPatch` with **`startDate` only** (R3). `status` and
  `pausedRanges` stay unrepresentable in a patch — they are history, and 4a's
  R1 guarantee (metadata editing cannot rewrite history) extends to them.
- Add `export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;` — used by `isHabit` and
  by `update`'s validation, so the two cannot disagree.

**Verify:** `npm test` — 81 still green (pure type addition).

## 2. `isHabit` validates the new fields structurally

Still in `habit.model.ts` (R4). "Optional" must not become "unchecked":

- `startDate`: `undefined` or a string matching `ISO_DATE`.
- `status`: `undefined` or exactly `'active'` / `'archived'` — **not** any
  string. A typo'd status must drop the row, not silently read as active.
- `pausedRanges`: `undefined`, or an array where every entry is an object with
  `from` matching `ISO_DATE` and `to` either `null` or matching `ISO_DATE`.

Present-but-malformed → row dropped as corrupt, same policy as `schedule`.

**Verify:** new specs in `habit.service.spec.ts`:
- a row with none of the three fields passes (legacy row, AC 2/15);
- `status: 'paused'` fails (it is not in the union — pause is derived, R1);
- `startDate: '2026-7-1'` fails (not zero-padded);
- `pausedRanges: [{ from: 'x', to: null }]` fails;
- `pausedRanges: [{ from: '2026-07-01', to: null }]` passes.

## 3. `startDate` replaces `createdIso` — the number-preserving refactor

In `habit.service.ts`. This step must change **no observable number** for any
existing habit (R7).

1. In `load()`, backfill alongside the existing `schedule` backfill:
   `startDate ?? HabitService.todayIso(new Date(h.createdAt))` — literally the
   old `createdIso` expression.
2. Add `private static startIso(habit: Habit): string` returning
   `habit.startDate ?? HabitService.todayIso(new Date(habit.createdAt))` (the
   `??` guards habits constructed in memory, not just loaded ones).
3. Replace **all five** `createdIso` call sites with `startIso`: `isDueOn`,
   `currentStreak`, `longestStreak`, `completionRate`, `isLapsed`.
4. **Delete `createdIso`** (R7). Two ways to compute the same boundary is how a
   call site gets missed later. `grep -rn createdIso src/` must return nothing.
5. `add()` sets `startDate: HabitService.todayIso()` on new habits.

**Verify:** new specs —
- **the regression test (AC 2):** seed `localStorage` with a fixed pre-4b payload
  (a habit with `createdAt`, `completedDates`, a `weekdays` schedule, and none of
  the new fields), pin `today`, and assert `currentStreak`, `longestStreak`,
  `completionRate` and `isLapsed` equal the exact values the suite asserted
  before this step. This is the single most important test in the slice;
  - a loaded legacy habit has `startDate` set to `createdAt`'s local date;
  - a habit with a future `startDate` has `isDueOn === false` today, streak 0,
    and `isLapsed === false` (AC 3).

## 4. Pause / resume / archive / reactivate

In `habit.service.ts`. Order the clauses in `isDueOn` as **`startDate` → pause →
schedule** and document why (R8): a day before the habit existed is not-due
regardless of everything else.

```ts
isDueOn(habit, iso) {
  if (iso < HabitService.startIso(habit)) return false;
  if (this.isPausedOn(habit, iso)) return false;
  return habit.schedule.type === 'daily'
    ? true
    : habit.schedule.days.includes(HabitService.weekdayOf(iso));
}
```

Then the derivations and transitions:

- `isPausedOn(habit, iso): boolean` — `(habit.pausedRanges ?? []).some(r =>
  r.from <= iso && (r.to === null || iso < r.to))`. Note `<` on `to` (R2).
- `isPaused(habit, today = new Date()): boolean` — `isPausedOn(habit,
  todayIso(today))`. The "right now" convenience for the UI.
- `pause(id)` — appends `{ from: todayIso(), to: null }`. **No-op** if already
  paused or archived.
- `resume(id)` — sets `to = todayIso()` on the open range. **No-op** if not
  paused.
- `archive(id)` — closes any open range, then opens a fresh one
  (`{ from: todayIso(), to: null }`) covering the archived stretch, and sets
  `status: 'archived'` (R5, R6). No-op if already archived.
- `reactivate(id)` — closes the open range with `to = todayIso()` and sets
  `status: 'active'`. No-op if not archived.
- `activeHabits` — a `computed(() => this._habits().filter(h => h.status !==
  'archived'))`, exposed readonly. `habits()` keeps returning everything.
- `update()` — validate `patch.startDate` against `ISO_DATE` **before applying
  anything**, per 4a's atomic rule (R3): a patch with a good `name` and a
  malformed `startDate` must change nothing.

All four transitions `persist()`, and all four are no-ops on an unknown id.

**Verify:** new specs —
- pause then check `isDueOn` is false for today, true for the day before `from`;
- pause, resume, then assert days inside the closed range are **still**
  `not-due` and produce no `missed` status (AC 6 — the historical-correctness
  test, and the reason pause is not a boolean);
- a streak spanning a pause is unbroken (AC 7);
- double-pause and stray-resume are no-ops; **after each of the four
  transitions, at most one range is open and it is the last one** (AC 8, R5);
- archive → `activeHabits()` excludes it, `habits()` still includes it, and
  `completedDates` is untouched (AC 9, AC 12);
- archive → advance the pinned clock by months → reactivate → **no missed days
  appeared** and the streak is intact (AC 10, R6);
- `update(id, { name: 'ok', startDate: 'garbage' })` changes nothing (R3).

## 5. Consumers — the enumerated sweep

The phase-4 plan names consumer sprawl as this slice's top risk: a missed call
site is a silent wrong number, not a crash. Switch **each of these explicitly**
(R10) — do not treat "use `activeHabits`" as one instruction:

- `DashboardComponent`: `todoToday`, `doneToday`, `lapsed`,
  `overallCompletionRate`.
- `HabitListComponent`: the source feeding `visibleHabits`, **and `categories`**
  (easy to miss — leaving it on `habits()` means an archived habit's category
  lingers in the filter dropdown forever).
- `CalendarComponent`: the habit selector.

Archived is not the only axis — apply the per-bucket pause rule (R9):

| Bucket | Archived | Paused |
|---|---|---|
| `todoToday` | exclude | **exclude** |
| `doneToday` | exclude | **include** — it was really completed |
| `lapsed` | exclude | **exclude** |
| `overallCompletionRate` | exclude | include |

**Verify:** four separate specs, one per bucket. The `doneToday`-includes-paused
case is the counter-intuitive one and must have its own test.

## 6. Habit list UI — pause, archive, delete-confirm, archived view

In `habit-list.component.ts` / `.html` / `.scss`:

- Per-row actions: **Pause / Resume**, **Archive**, **Delete**. A "Paused" badge
  and a "Paused since <from>" label when `isPaused(habit)`.
- **Delete confirm (R12):** `confirmingDeleteId = signal<string | null>(null)`.
  First click arms, second click deletes. Cleared by Cancel, by arming a
  different row (only one armed at a time), and by starting an edit. **Do not
  use `window.confirm`** — a browser modal blocks the page and is untestable.
- Present Archive as the default retirement action ("Archive — keeps your
  history") and Delete as the destructive secondary ("Delete — permanent").
- **`showArchived = signal(false)`** toggle. When on, archived habits render
  dimmed with a **Reactivate** action and **no** Edit/Pause actions.
- `archive(id)` and `reactivate(id)` in the component clear `editingId` when it
  matches, exactly as `remove` already does (R11). The archived view renders no
  edit form.

**Verify manually** (`npm start`): pause a habit → it leaves the dashboard to-do
list, the calendar greys those days (AC 5, AC 6). Archive → it disappears from
the list and the calendar selector (AC 9); toggle "Show archived" → it is there;
Reactivate → it returns intact (AC 10). Delete once → nothing happens but the
button arms (AC 11).

## 7. Start date in the edit form

In `habit-list.component.ts` / `.html`:

- A start-date input in the 4a edit form, pre-filled from `habit.startDate`.
- **Computed backdate warning (R14)** — not static text. When the draft
  `startDate` is earlier than the saved one, count the due days between the
  proposed date and today that are not in `completedDates` and show
  "N days before today will count as missed". Reuses `isDueOn`; no new
  derivation.
- Future date → "This habit won't be due until <date>."
- Save is disabled when the draft start date is not a valid `YYYY-MM-DD`.
- **A habit whose `startDate` is in the future shows "Starts <date>" instead of
  a completion percentage** (R13) — the underlying `completionRate` correctly
  returns 1 ("nothing owed", Phase 3 R3), but 100% next to a habit that has not
  begun reads as a bug. Display fix only; do not change the math.

**Verify manually:** set a future start date → habit is not due, shows
"Starts …", no missed days (AC 3). Set a past one → the warning states a real
count, and saving produces exactly that many missed days (AC 4).

## 8. Regression + wrap-up

- `grep -rn 'habits()' src/app` — every remaining hit is deliberate (the
  archived view, or a test). Mechanical completeness check for R10.
- `grep -rn createdIso src/` — must be empty (R7, step 3).
- `npm test` — all 81 previous specs pass **unmodified** (AC 15), plus the new
  ones from steps 2–5.
- `npm run build` — production build clean. Watch the `anyComponentStyle` budget:
  4a already raised it to 6 kB warn / 10 kB error in `angular.json` and this
  slice adds more inline SCSS to the same component.
- Manual: load a pre-4b localStorage payload — habits load, `startDate` is
  backfilled, streaks and rates are unchanged, no dropped rows (AC 2).
- Confirm `STORAGE_KEY` is still `habit_tracker.habits.v1` (AC 14).
- Walk all 15 acceptance criteria in `Analyst.md` and record the result.
- Update `STATE.md`: the Phase 4 row and the current-work line.
- Fill in the retrospective in `Analyst.md` §5.
- **Do not commit** — ask the user first (CLAUDE.md working agreement).
