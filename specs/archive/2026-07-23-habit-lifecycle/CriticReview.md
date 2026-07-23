# CriticReview — habit-lifecycle (Phase 4, slice 4b)

Two harden rounds, as required for a Large slice. Focus per the Analyst and per
`phase-4-plan.md`: **the pause interval design** (the plan names it "the single
non-obvious design point of the slice") and the **`startDate` migration**, which
must be provably number-preserving. **[FIX]** changed the Analyst/tasks;
**[OK]** are confirmations kept as implementation guard-rails.

## Round 1 — the model, and what "paused" actually means

**R1 [FIX] `status: 'active' | 'paused' | 'archived'` stores a fact that is
already derivable, and the two copies will drift.** The phase-4 plan proposes a
three-value union alongside `pausedRanges`. But whether a habit is paused *right
now* is fully determined by "is there an open range?" — so `status: 'paused'`
duplicates it. Every duplicate needs an invariant, and this one breaks in an
obvious way: `resume()` must remember to write *both* `to = today` and
`status = 'active'`, and any path that forgets one leaves a habit that is
`'paused'` with no open range (nagging you while claiming to be paused) or
`'active'` with one (silently not-due forever, the worst case — a habit that
looks fine and accrues nothing).

**Resolution:** `status` narrows to `'active' | 'archived'`. Paused is computed
from `pausedRanges` via `isPaused(habit)`. One source of truth, no sync
obligation, and the impossible states are unrepresentable rather than merely
avoided. Analyst §2.2 revised.

**R2 [FIX] `to` must be exclusive, and the spec has to say so in the type.** The
plan writes `{ from: string; to: string | null }` without stating the
convention, which is exactly how off-by-one-day bugs get written twice (once in
`isPausedOn`, once in the "paused since" label). Both conventions "work", but
inclusive-`to` forces a special case: pause and resume on the same day yields
`from = '2026-07-23', to = '2026-07-22'`, an inverted range that
`from <= iso && iso <= to` silently treats as empty but that any validation or
display code has to special-case.

**Resolution:** half-open `[from, to)`. `isPausedOn` is
`from <= iso && (to === null || iso < to)`. `resume()` sets `to = todayIso`,
which reads naturally as "paused up to, not including, today — so today is live
again". Same-day pause/resume gives `from === to`, a well-formed empty range.
Documented on the `PausedRange` interface itself, not just in the spec. Analyst
§2.3, tasks step 1.

**R3 [FIX] Lifecycle fields must not be reachable through `update`/`HabitPatch`.**
The temptation is to add `startDate`, `status` and `pausedRanges` to `HabitPatch`
and get four features for free. That would undo 4a's central guarantee. 4a made
`completedDates` unrepresentable in a patch precisely so metadata editing could
not rewrite history — and `pausedRanges` **is** history now: it determines what
was due in the past exactly as `completedDates` determines what was done. A
free-form `update(id, { pausedRanges: [] })` retroactively resurrects every
missed day of every pause.

**Resolution:** `HabitPatch` gains **`startDate` only** (it is a habit property
the edit form legitimately owns), and `update` validates it like any other field
— must be a well-formed `YYYY-MM-DD`, else the whole atomic patch is rejected
per 4a's R2. `status` and `pausedRanges` stay out of the patch type entirely and
are changed only through `pause` / `resume` / `archive` / `reactivate`, each of
which enforces its own invariant. Analyst §2.4, tasks steps 1 and 4.

**R4 [FIX] `isHabit` must validate the new fields structurally, not just
"present".** `status` is a union, not a string — `status: 'pased'` (typo written
by a hand-edited localStorage, or a future bug) would pass a `typeof === 'string'`
check and then fall through every `=== 'archived'` comparison as `active`,
which is a silent wrong answer rather than a dropped row. `pausedRanges` is
worse: an array of anything would pass `Array.isArray`, and `isPausedOn` would
compare `undefined` with `<=` and get `false` everywhere — a habit that appears
never to have been paused.

**Resolution:** `isHabit` requires
- `startDate === undefined || (typeof === 'string' && matches /^\d{4}-\d{2}-\d{2}$/)`
- `status === undefined || status === 'active' || status === 'archived'`
- `pausedRanges === undefined || (Array.isArray && every entry is
  `{ from: <iso string>, to: <iso string> | null }`)`

Present-but-malformed → row dropped as corrupt, consistent with Phase 1's
`completedDates` policy and Phase 2's `schedule` policy (archived R3,
scheduling-streaks R1). AC 13. tasks step 2.

**R5 [FIX] Archiving a paused habit leaves a dangling open range.** If you pause
a habit and then archive it, the open range survives. Reactivate six months
later and `resume()` was never called — the range is *still* open, so the habit
comes back not-due indefinitely, and nothing in the UI explains why the calendar
is grey.

**Resolution:** the lifecycle transitions own the range explicitly.
`archive(id)` closes any open range (`to = todayIso`) and *then* opens a fresh
one representing the archived stretch (R6). `reactivate(id)` closes the open
range. The invariant "at most one open range, and it is the last one" is
asserted by a unit test after each of the four transitions. Analyst §2.4/§2.5,
tasks step 4.

**R6 [FIX] Reactivation without a pause range dumps months of missed days on the
user.** The plan says archived habits "retain history" and are "reactivatable",
but does not say what happens to the archived stretch. Because every derivation
is live over `[startDate .. today]`, reactivating a habit archived six months ago
walks those six months, finds them due and uncompleted, and reports them all
`missed` — destroying the streak, tanking the completion rate, and marking the
habit lapsed the instant it comes back. That is the *opposite* of "retains
history": it fabricates failure.

**Resolution:** archiving opens a pause range and reactivating closes it, so the
archived stretch is not-due for exactly the same reason a pause is. This adds no
new field and no new derivation — archive is "pause + hide", which is also a
clean way to explain it in the UI. AC 10 tests precisely this. Analyst §2.5.

**R7 [OK] The `startDate` backfill genuinely preserves every existing number.**
Checked against the code: `isDueOn`, `currentStreak`, `longestStreak`,
`completionRate` and `isLapsed` all call `HabitService.createdIso(habit)`, which
is `todayIso(new Date(habit.createdAt))` — the local calendar date of
`createdAt`. Backfilling `startDate` with exactly that expression and replacing
every `createdIso` call with a read of `startDate` is a pure refactor for
existing rows: same value, same five call sites, no other consumers. This is why
the slice needs no `STORAGE_KEY` bump (AC 14) and why AC 2 can demand
bit-identical numbers rather than "roughly the same".

Guard-rail: `createdIso` should be **deleted**, not left alongside `startDate`.
Two ways to compute the same boundary is how one call site gets missed.

## Round 2 — derivations, consumers, UI state

**R8 [FIX] The order of clauses in `isDueOn` is load-bearing and must be
specified.** Three conditions now make a day not-due: before `startDate`, inside
a pause, off-schedule. They are all `false`-returning so the order does not
change the *result* — but it changes cost and, more importantly, it is the thing
a reader checks first when a day renders wrong.

**Resolution:** specify it as `startDate` → pause → schedule, cheapest and most
absolute first, and document *why* that order (a day before the habit existed is
not-due regardless of every other consideration). Same discipline as
`dayStatus`'s documented ordering from Phase 3 (R1 there). tasks step 3.

**R9 [FIX] `activeHabits` is not sufficient for the dashboard — paused is a
third case, and the buckets disagree about it.** "Switch every consumer to
`activeHabits()`" (the plan's wording) handles archived but silently gets pause
wrong: a paused habit is in `activeHabits` (it is not archived), so it would
still appear in `todoToday`. And the right answer is genuinely different per
bucket:

| Bucket | Archived | Paused |
|---|---|---|
| `todoToday` | exclude | **exclude** — a paused habit is not a to-do |
| `doneToday` | exclude | **include** — it was actually completed; hiding it erases a real completion |
| `lapsed` | exclude | **exclude** — falls out of `isDueOn` anyway, but assert it |
| `overallCompletionRate` | exclude | include — its paused days are already not-due, so it contributes honestly |

**Resolution:** tabulated in the Analyst §2.6 and made four separate assertions
in the tasks, rather than one "use activeHabits" instruction that reads as done
when it is half-done. `doneToday` including paused habits is the
counter-intuitive one and needs its own test. tasks step 5.

**R10 [FIX] "Every consumer switches to `activeHabits()`" needs an enumerated
call-site list, or one gets missed silently.** The phase-4 plan flags consumer
sprawl as the slice's top risk and notes a missed call site is "a silent wrong
number rather than a crash" — but then leaves the list informal.

**Resolution:** tasks step 5 enumerates them explicitly (`DashboardComponent`:
`todoToday`, `doneToday`, `lapsed`, `overallCompletionRate`;
`HabitListComponent`: the list source feeding `visibleHabits`, and `categories`;
`CalendarComponent`: the habit selector), and step 8 adds a grep for
`habits()` across `src/app` as a mechanical completeness check. Note
`HabitListComponent.categories` is easy to miss: leaving it on `habits()` means
an archived habit's category lingers in the filter dropdown forever.

**R11 [FIX] The archived toggle and the 4a edit form will fight.** 4a's
`editingId` signal opens an inline form over a row. Turning "Show archived" off
while editing an archived habit, or archiving the habit currently being edited,
leaves the form open over a row that is no longer rendered — the same class of
bug 4a's R11 fixed for delete.

**Resolution:** `archive(id)` and `reactivate(id)` in the component clear
`editingId` when it matches, exactly as `remove` already does, and the archived
view renders no edit form at all. tasks step 6.

**R12 [FIX] The two-step delete confirm needs a reset path, or it is a trap.**
An inline "Delete → Really delete?" that latches leaves an armed delete button
sitting on a row indefinitely; the next click, possibly minutes later and
possibly intended for something else, destroys the habit.

**Resolution:** `confirmingDeleteId = signal<string | null>(null)`, and it is
cleared by: clicking Cancel, arming a *different* row's delete (only one row can
be armed at a time), and starting an edit. Explicitly **not** using
`window.confirm` — a browser modal blocks the page and is untestable. tasks
step 6.

**R13 [FIX] A future `startDate` must not break `currentStreak`'s backward
walk.** `currentStreak` loops `while (cursor >= startIso)` starting from today.
With a future start date, `today < startIso`, so the loop body never runs and it
returns 0 — correct. But `longestStreak` and `completionRate` loop
`while (cursor <= todayIso)` starting from `startIso`, which also never runs
(returning 0 and, via the `countable === 0` branch, `1` = 100%). "100% complete"
for a habit that has not started is defensible (nothing owed, per Phase 3's R3)
but it *will* look wrong on a dashboard next to "not started yet".

**Resolution:** keep the derivations as they are — the boundary logic is already
correct and changing it would break Phase 3's documented "nothing owed = perfect"
rule — but the **UI must not show a completion percentage for a not-yet-started
habit**; it shows "Starts <date>" instead. AC 3 covers the numbers; tasks step 7
covers the label. This is a display fix, not a math fix.

**R14 [FIX] Backdating a `startDate` is destructive and the warning must say
what will actually happen.** Analyst §2.1 says the form warns. "This will change
your history" is too vague to act on. The user needs the consequence: how many
days become missed.

**Resolution:** the warning is computed, not static — count the due days between
the proposed `startDate` and today that are not in `completedDates`, and say
"N days before today will count as missed". Reuses `isDueOn` and needs no new
derivation. AC 4. tasks step 7.

**R15 [OK] Pause preserving a streak is the intended behaviour, and the abuse
risk is accepted.** Because paused days are not-due, `currentStreak`'s backward
walk skips them and a streak survives an arbitrarily long pause. A user can
therefore "protect" a streak by pausing rather than doing the habit. This was
considered and accepted: pause exists to stop the app punishing a legitimate
absence, and any anti-abuse rule (max pause length, streak decay) is a product
policy with no obvious right answer and no user asking for it. Documented rather
than fixed, so it is a decision and not an oversight. AC 7 asserts the behaviour
deliberately.

**R16 [OK] Paused days need no new `DayStatus`.** They render `not-due` because
they *are* not-due — it falls out of `isDueOn` with zero calendar changes. A
distinct `'paused'` status was considered and rejected: it would add a sixth
value to a union that Phase 3 carefully ordered, force a new colour into a
channel R8-of-4a already fought to keep clean, and buy only a shade of
explanation the "Paused since <date>" badge on the list already gives.

**R17 [OK] Re-verified R1–R7 end-to-end.** Legacy row (no `startDate`, no
`status`, no `pausedRanges`) → passes `isHabit` → `load()` backfills
`startDate` from `createdAt` → all five derivations read the same boundary value
they computed before → numbers identical (AC 2) → pause appends an open range →
`isDueOn` returns false inside it → resume closes it at today → those days stay
not-due forever (AC 6) → archive closes-then-opens a range and flips `status` →
habit leaves `activeHabits` and every enumerated consumer → reactivate closes the
range and flips back → history intact, no missed-day burst (AC 10). No path lets
a patch touch `pausedRanges`; no path leaves two open ranges.

## Net changes applied to the spec

- Analyst §2.2: `status` narrowed to `'active' | 'archived'`; paused is derived
  (R1).
- Analyst §2.3: `to` is exclusive, documented on the type (R2); range invariants
  enumerated (R5).
- Analyst §2.4: `HabitPatch` gains `startDate` only; `status`/`pausedRanges`
  reachable solely through named transitions (R3).
- Analyst §2.5: archive opens a pause range, reactivate closes it (R5, R6).
- Analyst §2.6: per-bucket archived/paused table for the dashboard (R9);
  "Starts <date>" instead of a percentage for future starts (R13); computed
  backdate warning (R14).
- tasks step 2: `isHabit` validates `startDate` format, the `status` union, and
  `pausedRanges` structurally (R4).
- tasks step 3: documented clause order in `isDueOn` (R8); delete `createdIso`
  rather than leaving it alongside `startDate` (R7).
- tasks step 5: enumerated call sites (R10); four separate bucket assertions (R9).
- tasks step 6: clear `editingId` on archive/reactivate (R11); delete-confirm
  reset paths, no `window.confirm` (R12).
- tasks step 8: grep for stray `habits()` as a completeness check (R10).
