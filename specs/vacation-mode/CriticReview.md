# Vacation mode — Critic Review

Every finding was checked against the code, not just the plan (TEMPLATE.md,
"What the critic pass verifies"). The fixes have been applied to `Analyst.md`.

## Round 1 (2026-10-15)

**R1 — BLOCKER. `VacationService` injected into `HabitService` breaks 62 tests.**
`habit.service.spec.ts` builds `new HabitService()` 62 times with no injection
context, so `inject()` in a field initializer throws (NG0203). *Fix:*
`HabitService` owns the vacation signal, its storage key and its three
mutations directly (Analyst §2.1). No new service, so no spec rewrite.

**R2 — Spec isolation is fine.** All 17 spec files touching storage call
`localStorage.clear()`, which also clears the new `vacations.v1` key. No
fixture leaks across tests.

**R3 — Some existing assertions change on purpose (Q1).**
`habit.service.spec.ts` › "pause, resume, then days inside the closed range
stay not-due (AC 6, R6)" asserts `not-due` on three paused days, and it
becomes `paused`. `tasks.md` must list every test it edits by name, so that a
silently weakened assertion is visible. Run
`grep -n "pausedRanges" src/app --include='*.spec.ts' -r` at task-writing time
and classify each hit.

**R4 — "K = 5" came from the prototype's data.** The app's seed is different,
so asserting 5 would test the seed, not the rule. *Fix:* a fixture with a
known answer that exercises each exclusion (Analyst §4.10).

**R5 — A banner and a modal can't be design-checked with today's tooling.**
`design-shot.mjs --seed` writes only habits and stacks, and has no click step.
So the banner never renders and the modal never opens, and the composite
would "pass" on the no-vacation page. *Fix:* add `--seed-vacation` and
`--click <text>`, plus `ROUTES`/`STATES` entries, and capture two prototype
mockups first (Analyst §4.12). The picker's start/end/between states are
static once a range is set, so the open-modal shot covers them. Only the
"Now click the last day" hint state is an interaction state, and a unit test
covers it.

**R6 — The tooltip "Vacation · paused" would lie for manual pauses.** This is
a consequence of Q1. *Fix:* `title="Paused"`.

**R7 — The roadmap's date strings were wrong.** The source formats with
`fmtI(i, true)`, which gives "Thu, Jul 23", with the weekday. *Fix:* pinned
in §2.5.

**R8 — Analytics heat-grid days go blank during a vacation.** This is correct
(nothing was due, AD-010) but surprising, so it's listed in §2.4 so the
post-code review doesn't file it as a bug.

## Round 2 (2026-10-15, on the revised Analyst)

**R9 — A corrupt `vacations.v1` silently un-pauses history.** Under AD-002 a
malformed *row* is dropped. A non-array or unparseable *value* gives `[]`, and
past vacation days then read as `missed`. This is accepted: it's the same
failure mode `habits.v1` already has. A test pins that one bad row doesn't
take the valid rows with it.

**R10 — The `isPaused` → `isManuallyPaused` rename touches 7 call sites:**
`dashboard.component.ts` ×2, `habit-list.component.ts` ×1,
`habit-list.component.spec.ts` ×2, `habit.service.spec.ts` ×1, and the
definition. The rename is a pure mechanical step on its own and must land
green **before** `isPausedOn` learns about vacations. Otherwise the dashboard's
`!isPaused(...)` filter changes meaning in the same diff, and a regression
would be unattributable.

**R11 — Reactivity holds.** `dayStatus` → `isDueOn` → `isPausedOn` reads
`_vacations()`. Every page derives through `computed`s that call those, so
starting or ending a vacation repaints Dashboard, Calendar and Stacks with no
manual refresh. A Dashboard component test pins it: start a vacation, and
To-do empties in the same fixture.

**R12 — I2 was a redundant guard.** It's implied by I1 + I3, so it was demoted
to a stated consequence. One guard fewer to drift.

**R13 — Stacks reads "0 of 0 done today" during a vacation.**
`stacks.component.ts` derives `due` from `isDueOn`. The prototype does the
same, so this is accepted and stays out of scope. It's noted so the post-code
review doesn't reopen it.

**R14 — The step order this implies for `tasks.md`.**
1. Rename `isPaused` (R10).
2. The `Vacation` model and store, with no behaviour change.
3. `isPausedOn` + `dayStatus` `'paused'`, with the edited tests listed (R3).
4. A checkpoint.
5. Tooling and mockup capture (R5).
6. The range picker.
7. The modal + Dashboard.
8. The Calendar, habit-detail and Habits chip.
9. Design checks.
10. A checkpoint and wrap-up.

Steps 6 and 8 share no files and no `Depends on` link. They *could* run in
parallel, but both lean on the `'paused'` status from step 3, which is
sequential anyway. **Recommend sequential:** the parallel gain is small and
`Assumes:` would need new pinning tests.

**No open questions remain.** The Analyst is ready for `tasks.md`.
