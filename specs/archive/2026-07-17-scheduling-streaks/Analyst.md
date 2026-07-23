# Analyst — scheduling-streaks (Phase 2)

**Size:** Large → Complex. Touches the data model (`Habit` gains a `schedule`),
the service (new "was it due on date D?" and streak-math logic), and the UI
(schedule picker on create, streak display). Streak math is a **new domain** for
this project and the source of every subtle bug in a habit tracker, so per the
"size up" rule the critic passes focus on the streak/"due-ness" logic and its
boundaries (createdAt, today-not-yet-done, timezone). Full spec + 2 harden rounds.

## 1. What problem are we solving?

Phase 1 stores a flat list of completed dates but treats every habit as "every
day, forever." Real habits are scheduled ("gym Mon/Wed/Fri", "read daily") and
the payoff of tracking is the **streak** — the run of consecutive scheduled days
you kept it up. Without a schedule, a streak is meaningless (missing a Saturday
you never intended to do shouldn't punish you). Scheduling and streaks therefore
ship together: streak math is defined entirely in terms of "was this habit due?"

## 2. What is in scope?

### Data model
- A `Schedule` discriminated union added to `habit.model.ts`:
  ```ts
  type Schedule =
    | { type: 'daily' }
    | { type: 'weekdays'; days: number[] };   // JS getDay(): 0=Sun … 6=Sat
  ```
- `Habit` gains a required `schedule: Schedule` field.
- **Migration (CriticReview R1):** `isHabit` accepts a legacy row with **no**
  `schedule` and the loader backfills it to `{ type: 'daily' }`. A row with a
  **present but malformed** `schedule` fails `isHabit` and is dropped as corrupt
  (consistent with Phase 1's "drop the bad row", not silently coerced).
- `weekdays` with an empty `days: []` is invalid (never due) — rejected at
  creation; treated as corrupt on load.

### Service (`HabitService`)
- `isDueOn(habit, isoDate)`: pure. `daily` → always true; `weekdays` → true iff
  that date's local weekday is in `days`. Never due before the habit's local
  `createdAt` date.
- `currentStreak(habit)`: count consecutive **due** days, walking backward from
  today, that were completed. Non-due days are skipped (no penalty). The first
  due day that was missed stops the count. **Exception:** if today is due and not
  yet completed, today does not break the streak (the day isn't over) — the walk
  starts at the most recent due day on/before today, skipping an
  uncompleted-today. The grace is scoped to today's calendar date **only**
  (CriticReview R3); any *earlier* uncompleted due day breaks normally. Stops at
  the `createdAt` local-date boundary (same `localDateOf` derivation as
  `isDueOn`, CriticReview R5).
- `longestStreak(habit)`: the longest run of consecutive completed due-days
  between `createdAt` and today (inclusive).
- All three are pure and date-injectable (accept a "today" `Date`/iso like
  `todayIso` already does) so specs pin a fixed day.
- `add(name, schedule)` extends Phase 1's `add`; default schedule `daily` keeps
  the call ergonomic.

### UI (`HabitListComponent`)
- Create form gains a schedule picker: a "Daily / Specific days" choice, and when
  "Specific days" is chosen, seven weekday toggles (Sun–Sat). "Specific days"
  with no day selected is rejected (same as an empty name).
- Each habit row shows its **current streak** and its schedule (e.g. "Mon Wed
  Fri" or "Daily"). Longest streak shown as a secondary stat (e.g. "best: 12").
- The done-today checkbox stays available every day. A habit not due today is
  visually marked (e.g. dimmed / "not scheduled today") but can still be toggled;
  such off-schedule completions simply don't participate in streak math.

### Tests
- `HabitService` specs for `isDueOn`, `currentStreak`, `longestStreak` covering:
  daily, weekdays, the today-not-yet-done exception, reset-on-missed-due-day,
  no-penalty-for-unscheduled-days, the `createdAt` boundary, and legacy-row
  (no-schedule) migration on load.

## 3. What is OUT of scope? (most important)

- **Flexible "X times per week"** schedules — deferred. They have no specific due
  day, so streaks would need re-defining in week-units; a separate later slice.
- **Editing a habit's schedule after creation**, and any recalculation of history
  when a schedule changes (roadmap defers this to Phase 2/3). Schedule is set once
  at creation.
- **One-day grace / streak forgiveness** — a missed due day resets immediately.
- **Backfilling / editing past days** — toggling stays today-only, as in Phase 1.
  (Streaks are computed from whatever `completedDates` exist; we just don't add UI
  to edit the past.)
- **Skipping holidays / pausing** — Phase 4.
- **Dashboard, calendar, overdue view, completion %** — Phase 3.
- **Backend/sync/accounts** — still localStorage, single device.
- **Visual polish** — usable, not beautiful.

## 4. How do we know it is done?

Verified by hand at `localhost:4200` unless a test is named:

1. Creating a habit with "Specific days" → Mon/Wed/Fri stores that schedule and
   the row shows "Mon Wed Fri"; reload keeps it.
2. Creating a "Daily" habit shows "Daily" and behaves as before.
3. "Specific days" with no weekday selected is rejected (like an empty name).
4. A daily habit completed today then yesterday shows a current streak of 2;
   completing today only shows 1.
5. For a Mon/Wed/Fri habit: completing Mon and Wed (skipping the un-due Tue)
   shows streak 2; a missed Fri resets the streak to 0 on the following due day.
6. A due habit **not yet** completed today still shows yesterday's streak (today
   doesn't break it until the day ends), and does not show today as counted.
7. A habit is never "due" before its creation date — no phantom broken streak
   from days before it existed.
8. `longestStreak` reflects the best historical run even after the current streak
   has reset.
9. A Phase 1 habit already in localStorage (no `schedule` field) loads as a daily
   habit without crashing and shows a working streak. (Named unit test + manual.)
10. A habit not scheduled today is visibly marked as such but can still be checked
    off, and doing so does not change its streak.
11. `npm test` passes, including the new streak/schedule specs.
12. `npm run build` succeeds.

## Retrospective (fill in before archiving)

**Did Analyst.md catch anything not thought about up front?**

Yes — the two harden passes (CriticReview R1–R11) surfaced 11 critical findings:
- **R1:** Migration logic (legacy vs. malformed schedules) needed explicit scoping.
- **R2:** Timezone trap in `weekdayOf` (same pattern Phase 1's critic caught).
- **R3:** Today-not-yet-done grace scoped to today-only; earlier misses still break.
- **R4:** Unbounded backward walk on bad `createdAt` needed lower-bound check.
- **R5:** `isDueOn` and `currentStreak` needed shared `localDateOf` helper for consistency.
- **R6–R11:** Confirmed off-schedule completions ignored by streaks, back-compat OK, reactive display cost negligible, end-to-end migration path sound.

All findings corrected the spec before coding. Zero rework.

**Did anything in tasks.md turn out to be wrong during coding? What?**

No — tasks matched reality perfectly. The steps executed as written. The only minor speedup: weekday checkboxes sorted ascending automatically via `Array.sort()`, no extra work.
