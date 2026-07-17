# tasks — scheduling-streaks (Phase 2)

Implementation follows this order. Each step names how to verify it. Do not start
until CriticReview.md exists (harden pass done).

## 1. Model: `Schedule` union + migration (`habit.model.ts`)
- Add `Schedule = { type: 'daily' } | { type: 'weekdays'; days: number[] }`.
- Add `schedule: Schedule` to `Habit`.
- Add `isSchedule(value): value is Schedule`: `daily` ok; `weekdays` requires a
  non-empty `days` array of integers 0–6 (no duplicates not required, but each in
  range).
- Update `isHabit` so a row **without** `schedule` still passes (legacy Phase 1
  row — `load` backfills it), but a row **with** a malformed `schedule` fails
  (corrupt → dropped, not coerced). See CriticReview R1.
- **Verify:** `npm run build` compiles; eyeball that `isHabit({...no schedule})`
  passes and `isHabit({...schedule:{type:'weekdays',days:[]}})` fails (covered by
  test in step 4).

## 2. Service: schedule-aware `add` + `load` backfill (`habit.service.ts`)
- `add(name: string, schedule: Schedule = { type: 'daily' })`: reject empty name
  (as today) **and** reject `weekdays` with empty `days`.
- Bump `STORAGE_KEY` is **not** needed — legacy rows migrate in place. In `load`,
  after `filter(isHabit)`, backfill **only** habits with a **missing** `schedule`
  to `{ ...h, schedule: { type: 'daily' } }`. (Malformed schedules were already
  dropped by `isHabit` — do not coerce them here. CriticReview R1.)
- **Verify:** `npm test` still green; manual: an existing v1 habit in localStorage
  loads without error (step 7).

## 3. Service: `isDueOn`, `currentStreak`, `longestStreak` (`habit.service.ts`)
- Add a shared `localDateOf(createdAtIso)` helper returning the habit's **local**
  created `YYYY-MM-DD`; use it for the boundary in BOTH `isDueOn` and
  `currentStreak` (CriticReview R5) to avoid an off-by-one.
- `isDueOn(habit, isoDate)`: false if `isoDate` < `localDateOf(createdAt)`; else
  `daily` → true, `weekdays` → `days.includes(weekdayOf(isoDate))`.
- `weekdayOf(iso)` MUST be timezone-safe: split `YYYY-MM-DD` and construct
  `new Date(y, m-1, d)`, **never** `new Date(iso)` (which parses as UTC and
  returns the wrong weekday in negative-offset zones — CriticReview R2, the same
  trap the Phase 1 critic caught).
- `currentStreak(habit, today = new Date())`: walk backward day-by-day from
  `todayIso(today)`. Skip non-due days. **Only** if the cursor date ===
  `todayIso(today)` and it is not in `completedDates`, skip it (grace scoped to
  today — CriticReview R3). For each due day: completed → count++, else stop.
  Terminate once the cursor < `localDateOf(createdAt)` (lower bound so a future/
  malformed `createdAt` yields 0 — CriticReview R4).
- `longestStreak(habit, today = new Date())`: iterate due days from `createdAt` to
  today; track longest run of consecutive completed due-days.
- **Verify:** unit tests in step 4.

## 4. Service specs (`habit.service.spec.ts`)
Add specs (pin `today` via the injected date):
- `isDueOn`: daily always; weekdays only on listed days; false before createdAt.
- `currentStreak`: daily 2-in-a-row = 2; today-only = 1; today-due-uncompleted
  keeps yesterday's streak; Mon/Wed/Fri completing Mon+Wed = 2 (Tue skipped);
  missed Fri → 0 on next due day; createdAt boundary (no phantom pre-history).
- `longestStreak`: best historical run survives a current-streak reset;
  brand-new habit due-today-not-done → 0 (CriticReview R8).
- off-schedule completion (a `completedDate` on a non-due day) never starts or
  extends a streak (CriticReview R6).
- migration: a legacy row (no `schedule`) loads as `daily` and streaks work; a
  malformed-schedule row is dropped (CriticReview R1/R11).
- **Verify:** `npm test` all green.

## 5. UI: schedule picker on create (`habit-list.component.*`)
- Component signals: `scheduleType: 'daily' | 'weekdays'`, `selectedDays: Set/array`.
- Template: radio/toggle for Daily vs Specific days; when Specific, seven weekday
  checkboxes (Sun–Sat). On add, build the `Schedule` with `days` **sorted
  ascending** (0=Sun…6=Sat, CriticReview R9) and pass to `add`; reject
  Specific-with-no-days (mirror empty-name: no-op, optionally a hint).
- Reset picker after successful add.
- **Verify:** manual — create Mon/Wed/Fri habit; "Specific + no days" does nothing.

## 6. UI: streak + schedule display, non-due marking (`habit-list.component.*`)
- Each row shows schedule label ("Daily" / "Mon Wed Fri" — weekdays in ascending
  week order, CriticReview R9), current streak, and best streak (secondary).
- If not due today, add a class/label ("not scheduled today") but keep checkbox
  working.
- **Verify:** manual — streak numbers match acceptance criteria 4–8, 10.

## 7. Full manual verification + build
- Walk every acceptance criterion in `Analyst.md` §4 at `localhost:4200`,
  including the legacy-habit load (criterion 9) by seeding an old-shape row in
  localStorage.
- `npm test` and `npm run build` both pass.
- Update `STATE.md`: mark Phase 2 done, add Quick Tasks row.
- Fill the Analyst retrospective, then archive the spec to
  `specs/archive/YYYY-MM-DD-scheduling-streaks/`.
