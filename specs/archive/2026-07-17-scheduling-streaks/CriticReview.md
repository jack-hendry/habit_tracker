# CriticReview — scheduling-streaks (Phase 2)

Two harden rounds, focused (per Analyst) on streak/"due-ness" logic and its
boundaries. Findings marked **[FIX]** changed the Analyst/tasks; **[OK]** are
confirmations kept as guard-rails for implementation.

## Round 1 — logic & migration

**R1 [FIX] Migration contradicted itself: "backfill invalid schedule" vs "drop
malformed row."** tasks step 1 said `isHabit` rejects a present-but-malformed
`schedule`, while step 2 said `load` maps "missing/invalid schedule → daily". If
`isHabit` already drops malformed-schedule rows, `load` never sees them — and
silently coercing genuinely corrupt data to `daily` contradicts Phase 1's "drop
the corrupt row" philosophy (archived R3). **Resolution:** `isHabit` accepts a
row with **no** `schedule` (legacy) but rejects a row with a **present but
malformed** `schedule` (corrupt → dropped). `load` backfills **only the missing**
case to `{ type: 'daily' }`. Analyst §2 and tasks 1–2 updated.

**R2 [FIX] `weekdayOf` timezone trap — the exact class of bug the Phase 1 critic
caught (archived R1).** `new Date('2026-07-17').getDay()` parses the string as
**UTC** midnight, so in negative-offset timezones `getDay()` returns the *previous*
weekday and a Mon/Wed/Fri habit becomes due on the wrong days. Implementation
MUST construct the local date as `new Date(y, m-1, d)` from the split parts, never
`new Date(iso)`. Elevated to an explicit tasks note (step 3).

**R3 [FIX] "Today doesn't break the streak" must be scoped to today's calendar
date only, not "the first due day encountered."** Otherwise a habit missed
yesterday (a past, over due-day) would also be forgiven. The grace applies iff
the date being examined `=== todayIso(today)` **and** it is uncompleted — then
skip to the previous day. Every earlier uncompleted due-day breaks normally.
Clarified in Analyst §2 and tasks step 3.

**R4 [FIX] Unbounded backward walk on bad `createdAt`.** `currentStreak` walks
day-by-day back to the `createdAt` local date. A future or malformed `createdAt`
(clock skew) could loop without a lower bound. Add an explicit stop: terminate
once the cursor date < `createdAt` local date, so a future `createdAt` yields
streak 0 immediately. tasks step 3 updated.

**R5 [FIX] `isDueOn` and `currentStreak` must derive the `createdAt` boundary the
same way.** Both compare against the habit's **local** created date, not the raw
UTC ISO timestamp. Introduce one shared helper `localDateOf(createdAt)` (or
`createdIso`) and use it in both places to avoid an off-by-one at the boundary.
tasks step 3 updated.

**R6 [OK] Off-schedule completions ignored by streak math.** `longestStreak` and
`currentStreak` iterate/skip by **due** days, so a completion recorded on a
non-due date (allowed per Analyst) can never extend or start a streak. Confirmed
consistent — keep it that way; add a spec asserting it.

**R7 [OK] `add` signature back-compat.** `add(name, schedule = {type:'daily'})`
keeps the Phase 1 component call and existing specs (`add(name)`) working.

## Round 2 — boundaries, UI, re-check of Round 1

**R8 [OK] Brand-new habit, due today, not yet done → both streaks 0/prev.**
`longestStreak` over `[createdAt..today]` with today due+uncompleted leaves the
run at 0; `currentStreak` skips today (R3) then finds no earlier due day →
returns 0. Correct; add as a spec case.

**R9 [FIX] Weekday chips must render in week order.** The picker collects days in
click order; the schedule label ("Mon Wed Fri") and stored `days` should be
sorted ascending (Sun=0…Sat=6) so display is stable regardless of click order.
tasks steps 5–6 updated.

**R10 [OK] Reactive streak display.** `habits` is a signal; the template calling
`currentStreak(habit)` recomputes on every completion. Recompute cost is trivial
at this scale — no memoization needed for Phase 2.

**R11 [OK] Re-verified R1 resolution end-to-end:** legacy row (no `schedule`) →
passes `isHabit` → `load` backfills `daily` → streak works. Malformed-schedule
row → fails `isHabit` → dropped. No path silently coerces corrupt data. The
named migration test in tasks step 4 covers the legacy path.

## Net changes applied to the spec
- Analyst §2: migration wording (missing→daily, malformed→dropped); today-only
  grace scoping.
- tasks step 1–2: reconcile `isHabit`/`load` responsibilities.
- tasks step 3: local-date construction, shared `localDateOf`, today-only grace,
  lower-bound stop.
- tasks step 5–6: sort weekday `days` ascending for storage and display.
