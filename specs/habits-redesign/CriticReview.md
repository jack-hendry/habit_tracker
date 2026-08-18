# Critic Review — Redesign §2: Habits

One harden round (Medium, `CLAUDE.md`). Read against `Analyst.md`,
`design/target/habits.png`, the prototype source, and the code as it stands.

Findings are numbered `R1…`; each says what the Analyst claims, why it is wrong
or incomplete, and what changes. Everything below is folded into `Analyst.md`
before `tasks.md` is written.

---

## R1 — There are **no** component specs for this page, so AC 7 is vacuous

`Analyst.md` §5 AC 7 says *"Existing edit specs pass unchanged — if one needed
editing, Decision B was not honoured."* There are no existing edit specs.
`src/app/habit/` contains `habit.service.spec.ts` and nothing else:

```
src/app/habit/
  habit-list.component.html
  habit-list.component.scss
  habit-list.component.ts
  habit.model.ts
  habit.service.spec.ts     <- the only spec
  habit.service.ts
```

Add, edit, pause, resume, archive, reactivate, delete-confirm, the category
filter and the archived toggle have **zero** component coverage. The service
beneath them is well covered; the 458-line component is not.

This changes the risk profile of the whole spec. §3.5 Decision A moves the edit
form — drafts, three warnings, `canSave`, `scheduleChanged`, `backdateWarning`,
`isFutureStartDate` — into a new component, and there is no regression net under
that move at all. The Analyst treated the extraction as mechanical *because* it
assumed specs would catch a slip.

**Change.** AC 7 is rewritten to require **new** specs rather than assert
existing ones, and the extraction step in `tasks.md` gets a spec step
immediately after it that pins the behaviours being moved — in particular
`backdateWarning` (an easy one to break, since it reads `editingHabit()` from
the *parent* today and must read its `[habit]` input after the move) and
`scheduleChanged` (compared by value, not reference — `habit-metadata` R12; a
careless move to a new component is exactly where that regresses to `!==`).

Not in scope: back-filling coverage for pause/archive/delete. Those are
untouched by this spec. Noted as a Quick Task instead.

## R2 — `showModal()` cannot be called on an element that `@if` has not created

§3.5 Decision C says the dialog is opened with `showModal()`, and AC 6 requires
that re-opening shows an **empty** form. Those two pull in opposite directions
and the Analyst does not say how they resolve.

- If the whole `<dialog>` sits inside `@if (creating())`, the element does not
  exist at the moment the click handler runs, and `showModal()` throws (or, with
  a `viewChild` + `effect` workaround, runs a frame late).
- If the `<dialog>` is always in the template, `<app-habit-form>` is constructed
  once and its draft signals survive a close — so the second `+ New habit`
  re-opens the *previous* half-typed habit, failing AC 6.

**Change.** Specify the shape rather than leaving it to the executor: the
`<dialog>` element is **always rendered**; its *contents* are wrapped in
`@if (creating())`. The element is therefore always available to
`showModal()`/`close()`, and `<app-habit-form>` is destroyed and reconstructed on
every open, which makes "empty on re-open" structural rather than something a
`reset()` call has to remember. This is the kind of choice §3.5 exists to close
— left open, the executor picks the plausible one and AC 6 fails at the end of a
twelve-step run.

## R3 — Opening the modal while an inline edit is open leaves two forms live

`startEdit` clears `confirmingDeleteId` today, but nothing clears `editingId`.
With Decision B (create = modal, edit = inline) both can be open at once: an
expanded edit form in row 3 and a modal over the top of it. Worse, `Esc` closes
the modal and reveals it, which reads like the modal edited that row.

**Change.** `openCreate()` sets `editingId` to `null` and `confirmingDeleteId`
to `null` before opening; `startEdit()` additionally closes the dialog if it is
open. Stated as a decision (§3.5 Decision E), not left to the executor.

## R4 — `dayStatus` reports `done` before `not-due`, and the strip wants that

§3.1's mapping table is right, but it does not say what happens to a day
completed while the habit was paused, or completed off-schedule. `dayStatus`
checks `done` **before** `isDueOn`, so such a day returns `'done'` and the strip
paints it in the habit's colour on a day the habit was not due.

`dashboard-redesign` §3.1 (CriticReview R1) established the opposite discipline
for *counting*: `poolCounts` must ask `isDueOn` first, or an off-schedule tick
lands in the numerator with nothing in the denominator and the header prints
`112%`. An executor who has read that spec will reasonably assume the same guard
belongs here.

**It does not.** The distinction is worth writing down because it looks like an
inconsistency and is not: a **rate** is an average over obligations, so a day
with no obligation must not enter it; a **strip** is a record of what happened,
so a day you did the thing should be coloured, obligation or no. `recentStatuses`
therefore calls `dayStatus` raw, with no `isDueOn` guard.

**Change.** Added to §3.1 as an explicit non-adoption with the reason, and AC 10
gains a spec for an off-schedule completion inside the window rendering `done`.

## R5 — Four elements the target does not show are silently in the row today

The Analyst's §2.3 transcribes the source's row and §3.7 covers archived rows,
but the *active* row in the app today also renders four things the prototype has
no equivalent for, and the Analyst says nothing about any of them:

| Element | Rendered when | In target? |
|---|---|---|
| `Paused` badge | `isPaused(habit.id)` | no habit is paused in the mockup |
| `Paused since {date}` line | same | " |
| `{{ habit.description }}` line | the habit has a description | no demo habit has one |
| `Starts {date}` label | `startDate` is in the future | no |

"Not in the target" is not the same as "should be deleted" — the mockup simply
has no habit in any of those states, exactly as it has no archived habit (§3.7,
where the Analyst *did* reach the right answer). Deleting them would silently
undo `habit-lifecycle` R7/R8 and `habit-metadata`, and nothing in the design
asks for that.

**Change.** New §3.8: all four are **kept**, restyled onto the new row. The
description line and `Paused since` sit in the middle column between the name
row and the meta row; the `Paused` badge sits in the name row after the name;
`Starts {date}` keeps its existing position in the meta row, replacing the rate
(which is what the template does today via the `@else if`). None are verifiable
by the design check, so they get specs instead — and per R1 there are none to
lean on.

## R6 — `rgba(0,0,0,0.32)` defeats AC 3 rather than satisfying it

§3.5 Decision D specifies `::backdrop { background: rgba(0,0,0,0.32) }`. AC 3
greps for `#[0-9a-fA-F]{3,6}` and an `rgba()` slips through — so the one
hardcoded colour this spec introduces is the one the criterion cannot see. AD-009
is about tokens, not about hex notation.

**Change.** A fifth token, `--backdrop: rgba(0, 0, 0, 0.32)`, and AC 3's grep is
widened to `-nE '#[0-9a-fA-F]{3,6}|rgba?\('`.

## R7 — Uppercase belongs in CSS, and the Analyst only implies it

§2.3 gives `text-transform:uppercase` for the `not today` pill and the
`Last 30 days` label, and quotes the DOM text in sentence case — correct, and
the same trick `dashboard-redesign` §2.2 used for the stat-card labels — but it
never states the rule. An executor transcribing a table will type
`LAST 30 DAYS` into the template, which looks identical and reads as shouting to
a screen reader.

**Change.** Stated once as a rule in §2.3: **every uppercase string on this page
is sentence case in the DOM and uppercased in CSS.** Applies to `not today` and
`Last 30 days`, and to nothing else on the page.

## R8 — The `flex:1` spacer will not survive the `@if` around the filter

The source right-aligns `Show archived` with an empty `<span style="flex:1">`
between it and the chips. The app wraps its whole category-filter block in
`@if (categories().length > 0)` — a fresh store has no categories, the block
vanishes, and a transcribed spacer vanishes with it, leaving `Show archived`
flush left on exactly the screen a new user sees first.

**Change.** `margin-left: auto` on the `Show archived` button instead of a
spacer element. Same result with the chips present, correct result without them,
and one less empty node. Recorded in §2.2 as a deliberate deviation from the
source's markup — the *rendered* result is identical, which is the thing being
matched.

## R9 — The SCSS budget criterion is right, and worth stating as a number

AC 2 says the warning must be *gone*. Confirmed as both necessary and
achievable, with the numbers, because "no worse" is the weaker thing an executor
will settle for:

```
▲ WARNING  src/app/habit/habit-list.component.scss exceeded maximum budget.
           Budget 6.00 kB was not met by 1.82 kB with a total of 7.82 kB.
```

Budgets are `anyComponentStyle`: 6 kB warn, **10 kB error**. The file is at 7.82
kB compiled (10.5 kB on disk) — 2.18 kB from a hard build failure, and this spec
adds a row restyle to it. So the extraction in §3.2/§3.5 is not a tidy-up that
happens to be convenient; without it the step that adds the new row styles is
the step that breaks the build.

**Change.** AC 2 quotes the baseline (7.82 kB) so the executor can see the
delta, and `tasks.md` orders the two extractions **before** the restyle rather
than after.

## R10 — Test-count arithmetic

AC 1 asserts ≥148 from a baseline of 134. Rebuilt from the actual step list,
since R1 and R5 both add specs the Analyst had not counted:

| Source | Specs |
|---|---|
| `recentStatuses` (incl. `startDate` inside window, off-schedule day — R4) | 5 |
| `getScheduleLabel` (daily / Weekdays / joined) | 3 |
| `day-strip` (five-way mapping, cell count, hex binding) | 5 |
| `habit-form` (prefill, `canSave`, `scheduleChanged` by value, `backdateWarning` — R1) | 5 |
| `habit-list` create-modal (opens empty, saves, cancel/`Esc`, mutual exclusion — R3) | 5 |
| row rendering (`NOT TODAY`, paused badge, description, `Starts` — R5) | 4 |
| `HabitService.add` returning the created habit (R11) | 2 |

29 new, from a baseline confirmed by a full run.

**Change.** AC 1 becomes **≥163**, and states the baseline command that produced
134 so a silently skipped suite is visible (`TEMPLATE.md` → "Done when").

## R11 — `HabitService.add` returns `void`, so the modal cannot reach its habit

§3.5 has the modal collect the full field set — name, schedule **and** the seven
metadata fields — but the service splits creation across two calls: `add(name,
schedule)` then `update(id, patch)` for the rest. `add` returns `void`:

```ts
add(name: string, schedule: Schedule = { type: 'daily' }): void {
```

So there is no id to pass to `update`, and the modal can create a habit with a
name and a schedule and silently drop its colour, icon, category, description,
notes and start date. Nothing fails; the fields just vanish. The Analyst asserts
the full field set in AC 6 without noticing that the service cannot deliver it.

The alternatives are worse than they look: reading the last element of
`habits()` after the call assumes ordering the service does not promise, and a
new `create(patch)` method duplicates `add`'s validation.

**Change.** Widen `add` to return `Habit | null` — `null` for the existing
rejection path. Purely additive: every current caller ignores the return, so no
existing spec changes. Folded into `tasks.md` Step 8 as sub-step 0 with two
specs, rather than into Step 2, because Step 8 is the step that needs it.

Worth noting *how* this surfaced: not from reading the Analyst, but from opening
`habit.service.ts` to confirm the signature the plan assumed. The plan had
already written `const created = this.habitService.add(...)` and an "If blocked"
clause telling the executor to stop if `add` did not return a habit — which
means the run would have halted twelve steps in, correctly, on a defect that one
`grep` at planning time removes (L-013 in reverse).

---

## Not findings

Checked and correct as written; recorded so the next round does not re-litigate
them.

- **§3.1's `pending → --strip-missed`.** Measured, not reasoned:
  `Read 20 pages` is daily and unticked on Thu Jul 23, and its final cell reads
  `rgb(233,233,231)` in the target. `Morning run` is not due Thursday and reads
  `rgb(245,245,243)`. The Analyst does not overstate this.
- **§3.3's refusal to disable the checkbox.** Correct. Two prior specs depend on
  off-schedule completion, and a static screenshot cannot show a cursor.
- **§3.6's decision to reproduce the wrapped `Morning run` row.** Correct and
  correctly reasoned — it is what the sampled properties do, and "fix it" is a
  change to the design, not to this build. The Analyst also flags it as the most
  likely thing a design-check round will try to undo, which is the useful half.
- **§4's exclusion of the habit detail page.** Correct, and the roadmap
  correction in §6 is the right disposal. It is a sixth prototype view behind an
  `onClick` on the habit name, invisible in a screenshot.
- **The three near-grays** (`--pill-muted-bg` `#f4f4f2`, `--strip-not-due`
  `#f5f5f3`, `--chip-bg` `#f1f1ef`). Verified distinct in the source and on the
  same row. Keeping them separate is right (L-012).
