# CriticReview — Habit Stacks (roadmap §5)

Two harden rounds, as `CLAUDE.md` requires for a **Complex** task. Round 1 is
the signature pass (L-018) plus a line-by-line reread of `tasks.md` against the
prototype source. Round 2 focuses on **the ambiguous parts** — which for this
feature means the two surfaces that have no mockup at all (the zero-stacks empty
state and the inline editor) and the archive/delete semantics of AD-031.

Findings marked **BLOCKING** were fixed in `tasks.md` before this file was
finished. Findings marked *note* are recorded but changed nothing.

---

## Round 1 — signatures and prototype fidelity

### R1-1 BLOCKING — the habit-name link steals every drag

Step 8 renders the habit name as `<a [routerLink]="['/habits', item.habit.id]">`.
Step 11 then puts `draggable="true"` on the row that contains it.

An `<a href>` is **implicitly draggable in HTML5**. Starting a drag on the name —
the largest, most obvious target in the row — fires `dragstart` on the anchor
with a URL payload instead of on the row, so `onDragStart` never runs, `this.drag`
stays `null`, and the drop silently does nothing. The handle would work and the
name would not, which reads as a flaky feature rather than a bug.

**Fix applied:** Step 8 now puts `draggable="false"` on the anchor, and Step 11's
"Done when" greps for it.

### R1-2 BLOCKING — Step 16 asserts values the demo data does not guarantee

Step 16 told the implementer to check for `"2 of 2 done today"` and `0 🔥` on
Sleep. Neither is stable:

- `demo-run` is `{ type: 'weekdays', days: [1, 3, 5] }`. **On a Monday, Wednesday
  or Friday it is due**, so Morning kickstart's denominator is 3, the label reads
  `"2 of 3 done today"`, and — since run is the only non-daily demo habit — **no
  row on the page is not-due at all.** The `states:` line then reports
  `stack-item-not-due` under `NOT RENDERED`, and Step 16's "must report 5 of 5"
  gate is unreachable through no fault of the implementation.
- Sleep's streak comes from `p: 0.56` pseudo-random history. `0 🔥` is a
  plausible value, not a guaranteed one.

This is precisely the trap `CLAUDE.md` describes: a data-dependent state that
"appears only if the seed data happens to produce it". Asserting an unstable
value teaches the implementer to edit the check until it passes.

**Fix applied:** Step 16 now requires the weekday to be recorded first and states
both expectations conditionally; the streak check became structural ("every row
renders a streak chip, including one at 0") instead of numeric. Step 8's manual
check got the same treatment. `stacks.design.spec.ts` (Step 15) already covers
not-due deterministically from a fixture, and Step 16 now points at it by name.

### R1-3 BLOCKING — the Unstacked tray was missing a permanent element

`tasks.md` recorded only the conditional `all habits are stacked` text. The
prototype's tray (line 371–373) also carries a **permanent** trailing hint that
renders whether or not the tray has chips:

```
drag a chip onto a stack, or use “+ Add habit”
```

12px, `#a3a7ad`, no italic — distinct from the italic empty text beside it.
Building from the plan as written would have shipped the tray missing an element
that is visible in `design/target/stacks.png`, and Step 16 would have found it by
eye — the slow way.

**Fix applied:** added to Reference values and to Step 8.

### R1-4 — the anchor label is title case in the DOM

Step 8 specified the literal text `ANCHOR · AFTER`. The source is
`Anchor · After` with `text-transform: uppercase` doing the work. Visually
identical, but a design-spec assertion on `textContent` would be written against
the wrong string, and copy-paste of an already-uppercased literal is how
`text-transform` silently becomes dead code.

**Fix applied:** Reference values and Step 8 now carry the literal
`Anchor · After`.

### R1-5 — six layout values were missing from Reference values

The block omitted the page header row (`display:flex; align-items:center;
justify-content:space-between; margin-bottom:6px`), the card header
(`gap:9px; margin-bottom:12px`), the anchor's inner column (`gap:1px`), and the
picker row (`margin-top:12px; gap:8px; flex-wrap:wrap; align-items:center`).
It also failed to say that the picker renders **above** the `+ Add habit to this
stack` button, not below it.

**Fix applied:** all six added.

### R1-6 — the persistence spec's setup instruction was not runnable

Step 3 said "seed the key, `TestBed.resetTestingModule()`, re-inject". After
`resetTestingModule()` the module must be **reconfigured** before the next
`TestBed.inject`.

**Fix applied:** wording corrected.

### R1-7 note — signature pass (L-018): clean

Every type, return and signature `tasks.md` assumes was opened and confirmed
rather than remembered. This is the check that caught `HabitService.add()`
returning `void` during `habits-redesign` R11.

| Assumed by `tasks.md` | Confirmed at |
|---|---|
| `isDoneToday(habit: Habit): boolean` — takes a **Habit, not an id** | `habit.service.ts:196` |
| `isDueOn(habit: Habit, iso: string): boolean` | `habit.service.ts:315` |
| `currentStreak(habit: Habit, today?: Date): number` | `habit.service.ts:335` |
| `toggleToday(id: string): void` — takes an **id, not a Habit** | `habit.service.ts:177` |
| `remove(id: string): void` (a true delete, not archive) | `habit.service.ts:171` |
| `archive(id)` / `reactivate(id)` | `habit.service.ts:264` / `:289` |
| `add(name, schedule?): Habit \| null` | `habit.service.ts:89` |
| `static todayIso(d?: Date): string` | `habit.service.ts:52` |
| `habits` / `activeHabits` readonly signals | `habit.service.ts:17` / `:20` |
| `Habit.color?: string`, `Habit.icon?: string` (no branded ids) | `habit.model.ts:53` |
| `/stacks` route already registered via `loadComponent` | `app.routes.ts` |
| `design/target/stacks.png` exists — Step 16 will not skip | `design/target/` |
| demo habit ids are `demo-<key>`; keys are `read run meditate water ship sleep` | `demo-data.mjs:24–29` |

The two signature shapes worth calling out are the asymmetric ones:
`isDoneToday` takes a `Habit` while `toggleToday` takes an `id`. Step 9 uses both,
one line apart.

### R1-8 note — drag target placement matches the prototype

`draggable="true"` sits on the **row** (proto line 347), not on the ⠿ handle;
the handle is a `cursor: grab` affordance only. An implementer who "fixes" this
by moving `draggable` onto the handle would break dragging from the rest of the
row. Recorded in Step 11 so it is not mistaken for an oversight.

Also confirmed: the tray chip has `dragStart` and **no** drop handler, so the
tray is genuinely not a drop target — Step 11's claim was right, not an omission.

---

## Round 2 — the ambiguous parts

Per `CLAUDE.md`, a Complex task's second round targets the ambiguity. Everything
below concerns a surface with **no mockup** or a semantic the prototype never
had to decide.

### R2-1 BLOCKING — the empty state and the Unstacked tray contradict each other

Step 12 renders `.stacks-empty` instead of `.cards` when there are no stacks. It
said nothing about the tray, which is a **sibling** of `.cards` and therefore
still renders. First run would show: an invitation to create a stack, and
directly beneath it every habit the user owns listed under "Unstacked", with a
permanent hint reading *"drag a chip onto a stack"* — when there is no stack to
drag onto.

The prototype ships with two stacks and never reaches this state, so it does not
answer the question. It has to be answered here.

**Fix applied:** Step 12 hides the tray entirely when `stacks()` is empty. The
tray describes a *remainder*, and with no stacks there is no remainder — every
habit is unstacked, which is the same information the empty state already gives,
phrased as a problem.

The assertion folds into Step 12's existing first spec (`.stacks-empty` renders
and `.stack-card` does not) as one more `expect`, rather than becoming a fourth
spec. A new spec would push 385 → 386 and cascade through the Step 14 checkpoint
and Step 15; folding leaves every downstream count in this file correct.

### R2-2 BLOCKING — "emit only the changed fields" is unnecessary and fragile

Step 13 asked `StackFormComponent` to emit a `StackPatch` containing only the
fields the user changed. That requires diffing against the `stack` input, which
is real logic with a real failure mode (a field reverted to its original value
mid-edit), in exchange for nothing: `update()` spreads the patch over the
existing stack, so emitting all five fields every time produces an identical
result.

**Fix applied:** Step 13 now emits all five patchable fields on save. The
`StackPatch` type stays `Partial<...>` — it is what makes `update()` usable for
future single-field callers — but the form is not one of them.

### R2-3 BLOCKING — the not-due cursor must exist before the click is wired

Step 15 asserts `cursor: not-allowed` on a not-due check circle and `pointer` on
a due one. Step 8 renders the circle "inert" and Step 9 adds the guard **in the
component method**. Neither step said the *cursor* is conditional from the start,
so a literal reading of Step 8 gives every circle one cursor and Step 15 fails on
a page that behaves correctly.

**Fix applied:** Step 8 now sets the conditional cursor when it first renders the
circle, and says explicitly that the visual state is complete before the click
handler exists.

### R2-4 — colour changes preview in the form, not on the card

Step 13 replaces the anchor box and item list with the form while editing, so the
card's top border stays visible the whole time. It did not say whether that
border tracks the colour picker live. Left unsettled, two implementers build two
different things.

**Fix applied:** stated in Step 13 — the swatch picker shows its own selection,
the card's border updates on **save**. Live preview would mean routing form state
back into the parent's view-model for a value the user sees in the picker anyway.

### R2-5 note — AD-031's archive path is correct as specified, and fragile

The distinction between "delete prunes" and "archive hides" rests on a single
token: the prune effect reads `habitService.habits()`, not `activeHabits()`.
Swap those and archiving a habit **permanently deletes its stack membership**,
with no error and no failing build — the user only discovers it when
reactivating puts the habit in the tray instead of back in its stack.

`tasks.md` already guards this three ways (the Step 5 "Done when" greps for it,
Step 5's spec 4 asserts `habitIds` is unchanged after archiving, and Step 6's
checkpoint re-greps). That is proportionate and no change was made. Recorded here
because it is the thing most likely to be "simplified" by a future edit, and it
belongs in the AD-031 body when Step 17 writes it.

### R2-6 note — the streak on an archived member

`visibleHabits()` omits archived members, so their streaks never render. No
question arises. Confirmed rather than assumed.

### R2-7 note — B-003 is a real accessibility gap, correctly scoped

Native HTML5 DnD gives no keyboard path and does not fire on touch. The chip
picker means a habit can be **added** to a stack without dragging, so the page is
usable; **reordering** is not reachable any other way. AD-028 chose native DnD to
match the prototype with zero new dependencies, which is the right call for this
build, but the gap is real and belongs in `specs/STATE.md` as B-003 rather than
in a comment. `tasks.md` Step 17 already writes it.

### R2-8 note — test arithmetic re-added

339 → 346 → 354 → 363 → 371 (checkpoint 6) → 371 → 371 → 378 → 382 → 385 → 392
(checkpoint 14) → ~402. The two checkpoints and every "Done when" count agree.
Step 15's total is deliberately approximate — it is the only step whose spec
count is a floor rather than a fixed list, and no later step keys off it.

---

## Verdict

`tasks.md` is fixed and ready to execute. Seven blocking findings were corrected
in place (R1-1, R1-2, R1-3, R2-1, R2-2, R2-3, plus R1-6's unrunnable setup);
R1-4 and R1-5 corrected transcription errors that would have surfaced late as
"design bugs"; the remaining entries are notes.

The two rounds earned their keep on R1-1 and R1-2 in particular — an anchor
hijacking `dragstart`, and a design gate that is unreachable three days a week —
neither of which a build would have diagnosed quickly from the symptom.
