# STATE — archive

Overflow for `STATE.md`. When that file gets unwieldy (~300 lines), old
`AD` (decisions) and `B` (blockers) entries and closed Quick Tasks move here.

Rules:

- **Lessons (`L-NNN`) never move here.** They are permanent and stay in
  `STATE.md`.
- Numbers are preserved exactly — moving an entry never renumbers it.
- A moved entry leaves a one-line stub in `STATE.md` pointing here, so a
  citation like "supersedes AD-004" is always resolvable.
- Superseded decisions are moved here, not deleted. The reasoning that turned
  out to be wrong is the most useful part of the record.

## Decisions

**AD-001 — Client-side only: localStorage, single device, no backend.**
(2026-07-16, `ROADMAP.md`) No accounts, no server until a phase explicitly
demands one. Buys a shippable Phase 1 in hours instead of days. Known expiry:
Phase 5 (notifications) is the phase that forces the conversation.

**AD-002 — Corrupt rows are dropped, never coerced.**
(2026-07-17, `archive/2026-07-17-habit-checklist` R3, reaffirmed
`scheduling-streaks` R1, `habit-metadata` R7, `habit-lifecycle` R4) `isHabit`
rejects any row with a present-but-malformed field; the row is discarded on
load. Only *absent* fields are backfilled with defaults. Coercing corrupt data
produces a habit that looks fine and silently reports wrong numbers — the
worst failure mode for a tracker whose entire value is its history.

**AD-003 — Dates are constructed as local calendar dates, never parsed from ISO.**
(2026-07-17, `scheduling-streaks` R2/R5) `new Date(y, m-1, d)` from split
parts, never `new Date('2026-07-17')` — the latter parses as UTC midnight, so
in negative-offset timezones `getDay()` returns the previous weekday. One
shared helper derives the start-of-history boundary so every derivation agrees.

**AD-005 — History is unrepresentable in an edit patch, not stripped at runtime.**
(2026-07-23, `habit-metadata` R1/R2) `update` takes an explicit `HabitPatch`
type rather than `Partial<Habit>`, so `id` / `createdAt` / `completedDates` are
a *compile* error rather than a silent runtime no-op the caller cannot see.
Validation is atomic: any invalid key rejects the whole patch. Extended by
AD-007.

**AD-006 — Colour never carries meaning on its own.**
(2026-07-23, `habit-metadata` R8/R10/R16) Status owns the colour channel that
was already encoding status (calendar day cells, the dashboard's status
border); habit colour appears only as decoration alongside an icon and a text
label, and moves to a different element where it would collide. Two meanings on
one channel makes the important one unreadable.

**AD-007 — `status` is `'active' | 'archived'`; paused is derived.**
(2026-07-23, `habit-lifecycle` R1/R2/R5/R6, supersedes the three-value union
proposed in `phase-4-plan.md`) Paused-right-now is fully determined by "is
there an open `pausedRange`?", so storing it too creates two facts that drift.
`PausedRange.to` is **exclusive** — `[from, to)` — so same-day pause/resume is
a well-formed empty range instead of an inverted one. Archive opens a range and
reactivate closes it, so an archived stretch accrues no missed days. Because
`pausedRanges` determines what *was* due, it is history and stays out of
`HabitPatch` per AD-005 — reachable only through the named transitions.

**AD-012 — Perfect-days and the overall rate read `activeHabits`, so archiving
edits the past.** (2026-08-18, `dashboard-redesign` §3.3, R4) Archiving a habit
removes it from every *past* day too, so days it used to spoil become perfect
retroactively and the count can go **up**. Kept deliberately, consistent with
what the header has always done (`habit-lifecycle` R10); the alternative makes
archiving cosmetic and puts two different histories on one page. Named as a
decision so nobody "fixes" it into an inconsistency — see L-008.

## Blockers

**B-001 — The Haiku-enforcement hook denied every non-`.md` edit in the repo.**
(2026-07-23, resolved) `enforce-haiku-tasks-pretooluse.sh` fired whenever the
string `tasks.md` appeared in the last 60 transcript lines — and merely
*reading* `STATE.md` put it there, so unrelated Small tasks were blocked with a
message about a spec run that was not happening. Fixed by keying the hook to an
explicit `## Executing: <spec>` line in the root `STATE.md`, which the session
adds when a run starts and removes when it ends. See L-004.

**B-002 — The Haiku-enforcement hook was dormant for every run, shadowed by its
own documentation.** (2026-08-18, found while starting `habit-detail` run 1,
resolved) The hook resolves the active spec with `grep -m1 -E '^## Executing: '`
on the root `STATE.md` — **first match wins**. That file's own explanatory
section contains an unindented example line, `## Executing: <spec-dir-name>`,
inside a code fence at line 11. `grep` does not know about fences, so the hook
read the spec name as the literal `<spec-dir-name>`, found no such directory, and
exited 0 — **dormant** — no matter what real marker was added below it.

So the fix for B-001 shipped a guard that never fired: `dashboard-redesign` and
`habits-redesign` both ran with top-level edits unblocked, and nothing reported a
problem, because a guard failing open is silent by construction. Verified by
simulating the hook's own grep before the `habit-detail` run rather than
trusting the marker.

Fixed by indenting the documentation example two spaces so it no longer matches
`^## Executing: `, with a note in the file explaining why the indent is load-
bearing. See L-019.

## Quick Tasks

*(none yet)*
