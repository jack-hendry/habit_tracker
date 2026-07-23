# CriticReview — habit-checklist (1 round)

Per the Analyst's borderline note, this pass focuses on **persistence** and
**date handling** — the first-of-its-kind decisions in this repo where a bad
pattern would be most expensive to unwind later. Findings are folded into
`tasks.md`; each is tagged so the code can reference it.

## R1 — `toISOString()` is the wrong source for "today" (date handling) — MUST FIX
`new Date().toISOString()` returns a **UTC** date. For a user in a timezone
behind UTC, any completion logged in the evening lands on *tomorrow's* date;
ahead of UTC, early-morning completions land on *yesterday's*. A habit tracker
whose "did I do it today?" silently disagrees with the user's wall clock is
broken at its core.
**Resolution:** `todayIso()` builds the string from **local**
`getFullYear/getMonth/getDate`. Made a `static` method so specs can pin a fixed
date and assert the format without mocking the clock. `createdAt` may stay a UTC
ISO timestamp — it is a moment, not a calendar day, and is not compared against
`completedDates`.

## R2 — localStorage can throw; unguarded writes crash the app (persistence) — MUST FIX
`setItem` throws on quota-exceeded or when storage is disabled (private-mode /
blocked cookies in some browsers). An unguarded call in `persist()` would take
down the whole toggle/add flow.
**Resolution:** wrap `setItem` in `try/catch`. Phase 1's contract is "data is
still there tomorrow" on a normal device; silently tolerating a failed write is
acceptable for the MVP (no error UI yet). Note as a Phase-3+ concern: surface a
"couldn't save" warning once there's a place to put it.

## R3 — corrupt data should fail *soft and granular* (persistence) — MUST FIX
The Analyst requires "tolerates missing/corrupt stored data by starting empty
(no crash)." Weakness to avoid: if one habit row is malformed, throwing away the
**entire** store is more data loss than necessary.
**Resolution:** `load()` returns `[]` on missing key, non-array, or parse
throw; otherwise `.filter(isHabit)` so a single bad row is dropped while valid
habits survive. `isHabit` guard defined in the model. Covered by two spec cases
(fully corrupt, partially corrupt).

## R4 — storage key must be versioned now (persistence) — CONFIRMED, low effort
Phase 2 (scheduling) and Phase 4 (rich fields) will change the stored shape.
**Resolution:** key is `habit_tracker.habits.v1` from day one; a future
migration bumps the suffix and can read the old key. No migration code in
Phase 1 — the version suffix is the entire cost of keeping the door open.

## R5 — `crypto.randomUUID` availability (minor) — ACCEPTED
Available in all evergreen browsers and the Karma ChromeHeadless test runner
this repo uses. No polyfill needed for a localStorage-only, modern-browser MVP.

## Non-findings (explicitly considered, no change)
- **Method calls in template** (`isDoneToday(habit)` re-runs each change
  detection): fine at this scale; revisit only if a list-perf problem appears.
- **Two-way `ngModel` on a signal:** use split binding
  (`[ngModel]`/`(ngModelChange)`) to keep `newName` a signal per house style;
  no `[(ngModel)]` on a plain field.
- **No component spec:** matches Analyst scope — service is unit-tested, the thin
  template is covered by manual acceptance.

## Verdict
Proceed to implementation. All MUST-FIX items (R1–R3) are reflected as explicit
steps/notes in `tasks.md`.
