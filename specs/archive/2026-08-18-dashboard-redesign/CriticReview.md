# Critic Review — Redesign §1: Dashboard (harden round 1)

One round, per the Medium sizing in `CLAUDE.md`. Each finding says what the
Analyst said, why it is wrong or unspecified, and what the fix is. Findings
marked **FOLD BACK** were written into `Analyst.md`; the rest are executor
guidance that belongs in `tasks.md`.

---

## R1 — `poolCounts` must guard on `isDueOn` *before* reading `dayStatus`, or rates exceed 100%

**FOLD BACK** (§3.1).

`dayStatus` checks `done` **before** `not-due` (`habit.model.ts` `DayStatus`
docblock, order: future → done → not-due → pending → missed). So a habit ticked
on a day it was not scheduled returns `'done'`. A pooled counter written as the
obvious "walk the window, count `done` and `missed`" therefore adds off-schedule
completions to the numerator while the denominator never sees them — a user who
does extra work is rewarded with `112%`.

`completionRate` already avoids this by guarding `if (this.isDueOn(habit,
cursor))` around the whole status check. `poolCounts` must be the same loop,
lifted verbatim, with the habit loop nested inside the day loop. Spelled out in
the step and pinned by a spec ("an off-schedule completion changes neither
numerator nor denominator").

## R2 — Nothing said what the stat row does when the store is empty

**FOLD BACK** (§3.6, criterion 4).

Acceptance criterion 4 read "the stat row renders four cards" unconditionally,
while the template's existing `@if (habits().length === 0)` branch replaces the
whole body with *"Add a habit first."*. An executor satisfying the criterion
literally would hoist the stat row above the empty-state branch and ship four
cards reading `0 of 0 done`, `0 days`, `0`, `—` to a brand-new user.

This is the L-010 shape — a criterion that quietly overrules the body — caught
before it could be implemented as written. Decision: the stat row lives
**inside** the non-empty branch; the header (title + overall) stays outside it,
exactly as today. Criterion 4 now says so.

## R3 — `topCurrentStreak` naming an owner for a zero streak

**FOLD BACK** (§3.2).

`V.reduce((a,b) => b.streak > a.streak ? b : a)` always returns *some* habit, so
with every streak at 0 the card renders `0 days` under the name of whichever
habit happens to be first — asserting ownership of nothing. Rule added: a max of
0 renders the value `0 days` with **no** sub-line. The service returns `null`
rather than a zero-streak winner, which makes the template's job unambiguous.

## R4 — Perfect days can *increase* when you archive a failing habit

**FOLD BACK** (§3.3, named as an accepted downside).

`perfectDays` reads `activeHabits`, so archiving a habit removes it from every
past day too, and days it used to spoil become perfect retroactively. Not a bug
to fix — it is the same rule the header's overall rate has always used
(`overallCompletionRate` reads `activeHabits`; `habit-lifecycle` R10), and the
alternative (counting archived habits' past days) makes archiving cosmetic. But
per L-008 the downside gets written down as a decision, so nobody "fixes" it
into an inconsistency with the header.

## R5 — `§2.5`'s description of the overdue row was backwards

**FOLD BACK** (§2.5).

The Analyst said the overdue row's content "is inset by exactly the missing
checkbox". It is the opposite: there is no spacer, so the row's content shifts
**left** by 20px + the 12px gap. Measured on `design/target/dashboard.png`, the
to-do row's habit name starts at x≈478 (of 2000 displayed px) and the overdue
row's at x≈435 — a left shift, not an inset. Corrected, because an executor
reading "inset" would add a phantom spacer and produce a row that matches
nothing in the mockup.

## R6 — Two greens, and the reason they must both exist

**FOLD BACK** (§2.6).

`--done: #22c55e` (status) and `--positive: #2f9e44` (delta text) are within a
hair of each other and invite a later "cleanup" that collapses them. They are
different jobs: `--done` fills a 20px control and a row border, `--positive` is
12px text on white and needs the darker value to stay legible. AD-006 already
says the status channel owns `--done`; a text delta is not a status. Noted in
the token block so the next reader sees the reason before the duplication.

## R7 — The delta's windows: arithmetic checked, and the deviation is the right call

No change; recording that it was verified rather than assumed.

`[today-6 … today]` is 7 days; `[today-34 … today-7]` is 28 days
(`-7 − -34 = 27`, inclusive `= 28`); they do not overlap (`today-7 < today-6`).

On the deviation itself (§3.4): the prototype's 28-vs-28 delta under a 7-day
headline is defensible for synthetic data and indefensible for real data — the
first user to have a great week after a bad month sees `100%` next to a red
negative and files a bug. Keeping the label, the styling and the rounding while
changing only the window is the smallest deviation that makes the sentence true.
Flagged in the retrospective as the one place this build knowingly diverges from
the source.

## R8 — A native checkbox cannot become the target's 20×20 rounded square

Executor guidance → `tasks.md`.

The target's control is `20×20, border-radius:6px, border:2px, box-sizing:
border-box`, and in the done row it is a **filled green square with a white ✓**.
The app renders a bare `<input type="checkbox">`, whose default rendering ignores
all of that. It needs `appearance: none` plus the tick drawn in CSS — and it
must stay a real `<input>` inside the `<label>`, because the whole row's
keyboard operability depends on it. Left implicit, this is the single most
likely way for the design check to come back wrong.

## R9 — The dot and the glyph need `aria-hidden`

Executor guidance → `tasks.md`.

Today they sit inside a `.habit-badge` span carrying `aria-hidden="true"`. The
new row markup drops that wrapper (the source has dot and glyph as siblings), so
the attribute has to move onto both children or a screen reader starts reading
decorative punctuation between the checkbox and the habit name. Same for the
progress bar: it is `aria-hidden="true"`, because `3 of 5 done` is already the
accessible text and a `role="progressbar"` would say it a second time.

## R10 — New service specs pin `today` by argument, not by `jasmine.clock()`

Executor guidance → `tasks.md`.

`habit.service.spec.ts` passes an explicit `new Date(2026, 6, 17)` into every
derivation (all of them take `today: Date = new Date()`), while
`dashboard.component.spec.ts` mocks the clock because a component cannot be
handed a date. Both new derivations must follow the *service* convention — a
spec that installs a clock to test a pure function is a spec that will be
copy-pasted into the next one.

## R11 — Guard the day-walking loops against an empty or inverted range

Executor guidance → `tasks.md`.

`perfectDays` and `poolCounts` walk `cursor = from; cursor <= to`. With no
habits there is no earliest start date to walk from, and a caller that passes
`from > to` gets an immediately-terminating loop (fine) while a caller that
passes an invalid ISO string gets `NaN` arithmetic and a loop that never
terminates — in the browser, a hung tab, not a test failure. Both functions
return `0` / `{done:0, countable:0}` for an empty habit list, and the window
helpers derive their bounds with `HabitService.todayIso(...)` arithmetic rather
than string surgery.

## R12 — Copy delta knowingly not adopted: "yesterday"

No change.

The source renders a one-day gap as `yesterday` (`v.lastAgo === 1 ? 'yesterday'
: …`); the app's `getLastDoneDaysAgo` renders `1 day ago`. The mockup shows only
the `3 days ago` case, so the target cannot adjudicate. Leaving the existing
helper untouched keeps this slice to the styling it is about. Recorded here so
§2 of the roadmap (which has its own copy deltas) does not "discover" it again.

---

## Fold-back audit (L-010)

Every claim this round overturned was grepped for elsewhere in `Analyst.md`
before signing off:

| Overturned | Found in | Fixed |
|---|---|---|
| Stat row renders unconditionally | Criterion 4 | ✅ criterion now scoped to the non-empty state |
| Overdue row "inset" | §2.5 prose | ✅ corrected to a left shift |
| Owner always shown on the streak card | §2.3 card table, criterion 6 | ✅ both say "no sub-line when the max is 0" |
| Pooled counting described without the `isDueOn` guard | §3.1 | ✅ guard named explicitly |

No other section of `Analyst.md` still carries a superseded claim.
