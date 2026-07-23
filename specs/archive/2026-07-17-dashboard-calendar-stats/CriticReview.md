# CriticReview — dashboard-calendar-stats (Phase 3)

Two harden rounds, focused (per the "size up" rule) on the ambiguous **"overdue"**
semantics and the boundaries of every status/percentage/grid calculation
(today-not-yet-done, future days, the `createdIso` floor, timezone-safe day cells,
empty collections). **[FIX]** = changed Analyst/tasks; **[OK]** = confirmation kept
as an implementation guard-rail.

## Round 1 — status/percentage logic & boundaries

**R1 [FIX] `dayStatus` check order is load-bearing and must be pinned.** The five
states are not mutually exclusive by construction, so the *order* decides ties:
a **future** date that also happens to be in `completedDates` (corrupt/clock-skew
data), and an **off-schedule** completion (in `completedDates` but not due). The
required order is: `future` → `done` → `not-due` → `pending` → `missed`. `future`
first so no future date is ever judged; `done` before `not-due` so an off-schedule
completion renders `done` (consistent with Phase 2 R6 allowing off-schedule
completions). Elevated to an explicit numbered order in tasks step 1.

**R2 [FIX] `completionRate` denominator must exclude a `pending` today (and any
`future`), not just "count due days".** Otherwise a habit due today shows a dip
every morning until it's checked off — punishing an in-progress day, the exact
grievance Phase 2 R3 fixed for streaks. Denominator = due days with status `done`
or `missed`; numerator = `done`. tasks step 2 updated.

**R3 [OK, with note] No-due-days-yet → rate `1` (100%).** A `weekdays` habit created
on a weekend has zero due days until its first scheduled day; the denominator is 0.
Returning `1` ("nothing owed = perfect") matches acceptance criterion §4.5 and
avoids a `0/0` NaN. Accepted. Note for the component: this is indistinguishable
from a genuine 100%, which is fine for MVP; a "no history yet" affordance is a
later polish, not a bug.

**R4 [FIX] `isLapsed` must stop at *yesterday* — a `pending` today can never make a
habit lapsed.** If the walk included today, every habit due today would read
"overdue" all day until checked off, collapsing "Overdue/slipping" back into "To do
today" — defeating the whole sign-off decision (Overdue = a *past* miss). Walk
`[createdIso .. prevIso(today)]` only, short-circuit on the first `missed`. tasks
step 3 updated.

**R5 [FIX] `monthGrid` leading-blank alignment is the Phase-2 timezone trap again
(archived R2 / scheduling-streaks R2).** The 1st-of-month column index MUST come
from a **local** `new Date(year, month, 1).getDay()`, and each cell's `iso` from
`todayIso(new Date(year, month, day))` — never `new Date('YYYY-MM-01')`, which
parses as UTC and shifts the whole grid one column in negative-offset zones. Made
an explicit note in tasks step 4 and a named spec case in step 5.

**R6 [FIX] Overall completion % over an empty habit list is `NaN`.** "Average of
per-habit rates" divides by `habits().length`; with no habits that's `0/0`. The
dashboard must render `—` (or hide the tile) when the list is empty, never `NaN%`.
tasks step 7 updated.

## Round 2 — UI, reactivity, re-check of Round 1

**R7 [OK] Reactive recompute cost.** The dashboard's `computed` buckets call
`completionRate`/`isLapsed`, each an O(days-since-creation) walk, per habit, on
every toggle — plus `monthGrid` is O(days-in-month). At Phase 3 scale (a handful of
habits, <~1 year of history) this is trivial, same verdict as scheduling-streaks
R10. No memoization now; **if** habits accumulate years of history or grow to
dozens, revisit with a memo keyed on `(habit, todayIso)` — a Phase 3+ concern, not
a blocker. Recorded so it isn't rediscovered as a "bug".

**R8 [FIX] Dangling selected-habit in the calendar.** The calendar holds a selected
habit; deleting that habit (from `/habits`, reflected via the shared signal) leaves
the id pointing at nothing and `monthGrid(undefined, …)` throws. Guard: derive the
selected habit as a `computed` that falls back to the first habit when the stored id
is absent, and show the empty state when there are no habits at all. Added to tasks
step 8.

**R9 [OK] Month paging rollover.** With 0-based `month`, `prev` on `month === 0`
must go to `{ year: year-1, month: 11 }` and `next` on `month === 11` to
`{ year: year+1, month: 0 }`. Straightforward but a classic off-by-one; kept as an
explicit guard in tasks step 8 and worth an eyeball during manual verification
(criterion §4.7 pages across a year boundary).

**R10 [OK] `lastDoneIso` via lexical max is valid** for zero-padded `YYYY-MM-DD`
strings, and an off-schedule completion legitimately counts as "last done". The
"N days ago" label MUST compute the gap timezone-safely (count `prevIso` hops or
diff split integer parts), never `new Date(iso)` subtraction. Confirmed; folded into
tasks step 3's helper note.

**R11 [OK] Current-month grid legitimately contains `future` cells.** Today is
mid-month, so later days are `future`, not `missed` — the R1 ordering (`future`
first) already guarantees this. The calendar legend must therefore include a
`future` swatch so those cells aren't misread as errors. Confirmed against tasks
step 8's legend requirement.

**R12 [OK] Dashboard "Done today" and calendar "done" stay consistent.** Both key
off `todayIso() ∈ completedDates` / `dayStatus === 'done'`, and both intentionally
include off-schedule completions. Re-verified the two surfaces can't disagree about
whether a habit is done today. No change.

## Net changes applied to the spec
- tasks step 1: pinned the five-way `dayStatus` order (`future→done→not-due→
  pending→missed`).
- tasks step 2: denominator excludes `pending`/`future`; numerator = `done`.
- tasks step 3: `isLapsed` walks only to yesterday; timezone-safe "days ago".
- tasks step 4/5: local-`Date` construction for month alignment + named tz spec.
- tasks step 7: guard empty-list overall % → `—`.
- tasks step 8: fall-back for a deleted selected habit; rollover + `future`-swatch
  guards.
