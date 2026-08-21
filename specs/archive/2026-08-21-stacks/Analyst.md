# Analyst — Habit Stacks (roadmap §5)

**Size: Complex.** New persisted entity + a new interaction primitive
(drag-and-drop) the project has never had. Per `CLAUDE.md`: full spec, 2 harden
rounds, and a review after coding. The roadmap says so itself — "Do **not** size
it with the other pages."

Source of truth for every value below is the prototype `.dc.html`, block
`isStacks` (markup lines 317–378) and its `<script type="text/x-dc">`
(state 383–397, drag/view logic 515–557, `newStack` 593–599). Values were read
out of the source, not eyeballed off `design/target/stacks.png`.

---

## 0. What the roadmap got wrong

Every prior section found the roadmap's prose drifted from the prototype. §5 is
the worst so far — it is wrong or silent on eight points, three of which change
the data model.

| # | Roadmap says | Source actually says |
|---|---|---|
| 1 | Use "Angular CDK `DragDrop`" | `@angular/cdk` **is not a dependency**. The prototype uses native HTML5 DnD (`draggable`, `onDragStart`/`onDragOver`/`onDrop`). |
| 2 | `{ id, name, time, color, anchorText, habitIds[] }` | `{ name, time, anchor, aglyph, color, items[] }` — the roadmap **drops `aglyph`**, the anchor emoji (☕ / 🌙), which is visible in the mockup. |
| 3 | "create / rename / set time / set anchor / delete" | The prototype has **only** create-with-defaults, add habit, remove habit, reorder. No rename, no time/anchor/colour editor, no delete anywhere in the file. |
| 4 | "N of M done" over member habits | `doneLabel` is `doneItems.length + ' of ' + dueItems.length` — the denominator is **members due today**, not members. The mockup's "2 of 2 done today" on a 3-item stack is the proof: Morning run is not due today, so it leaves the denominator. |
| 5 | (silent) | The item's habit **name is a link to `/habits/:id`** (`style-hover` → `#0066cc` + underline). Same omission §4 made with its leaderboard. |
| 6 | Only the "+ Add habit to this stack" footer | There is also an inline **"Add:" chip picker** (`addingNow` / `addChips` / `noneLeft`) that the footer button toggles open, plus an empty message "every habit is already in a stack". |
| 7 | "the unstacked tray implies a habit can belong to at most one stack — decide and document that constraint" | **The source settles it.** `dragTo` splices the habit out of its origin stack, `if (tgt.includes(d.h)) return` blocks duplicates, and both `unstackedNow` and `addChips` filter on `!stacks.some(x => x.items.includes(k))`. One stack maximum. |
| 8 | "Read the width out of the source" (open question) | **1000px**, same as Habits. The current `stacks.component.scss` stub says 900px and is wrong. |

Two further things the prototype **cannot** answer, because its habits are a
fixed array indexed by position and can never be deleted or archived:
referential integrity (§3.4) and the zero-stacks empty state (§3.6).

---

## 1. What problem are we solving?

Habit stacking is the "After [current habit], I will [new habit]" technique: you
chain a new habit onto something you already do reliably. The app today has no
way to express that a set of habits belongs to a routine, or that a routine
hangs off a real-world anchor ("I pour my morning coffee").

`/stacks` is registered in `app.routes.ts` and renders an `<h1>` and a
placeholder paragraph. This spec replaces that stub with the page.

## 2. What is in scope?

### 2.1 The `Stack` entity

```ts
export interface Stack {
  id: string;            // stable uuid; the prototype's array index is not durable
  name: string;
  time: string;          // free text — '7:00 AM', 'anytime'. Not parsed, not scheduled.
  anchor: string;        // free text — 'I pour my morning coffee'. NOT a habit ref.
  aglyph: string;        // HABIT_ICONS id, resolved via iconOf()
  color: string;         // HABIT_COLORS id, resolved via colorOf()
  habitIds: string[];    // ordered references to live habits. Never copies.
}
```

Three decisions are baked in here:

- **`anchor` is free text, not a habit reference.** The roadmap's critic note
  flagged this and the source agrees — the anchor is a thing you already do in
  the world, which may well not be a tracked habit.
- **`habitIds` are references, never copies.** Ticking a habit inside a stack
  ticks the same habit the dashboard and habits page tick. There is no
  stack-local completion state.
- **`color` and `aglyph` hold palette ids, not raw hex/emoji.** This is an
  existing project invariant (`habit.model.ts` lines 42–45, habit-metadata
  CriticReview R9), and honouring it costs two small palette additions —
  see §3.2. Typed `string`, not a branded id type: `Habit.color` and
  `Habit.icon` are plain `string`, there are no `HabitColorId`/`HabitIconId`
  aliases in `habit.model.ts`, and inventing them for stacks alone would leave
  the two entities describing the same palette two different ways.
  `Stack.name/time/anchor` are required (unlike `Habit`'s optional metadata) —
  a stack with no name has nothing to render in its header.

Persisted at `habit_tracker.stacks.v1`, following `HabitService`'s pattern
exactly: a private `signal<Stack[]>(this.load())`, a public `asReadonly()`,
a private `persist()`, and a `load()` that runtime-validates and drops anything
malformed rather than throwing.

### 2.2 Behaviour ported verbatim from the prototype

- **`+ New stack`** appends a defaulted stack and immediately opens its chip
  picker. Prototype default is `{name:'New stack', time:'anytime', anchor:'I … (choose an anchor)', aglyph:'⏰', color:'#0066cc'}`;
  on palette ids that becomes `aglyph:'clock'`, `color:'sky'` (see §3.2).
- **`+ Add habit to this stack`** toggles an inline `Add:` chip row listing
  every currently-unstacked habit. Clicking a chip appends it and closes the
  picker. With nothing left it shows the italic "every habit is already in a
  stack".
- **`✕`** on an item row removes that habit from the stack (the habit itself is
  untouched — it returns to the Unstacked tray).
- **Drag `⠿`** reorders within a stack, moves between stacks, and accepts a drop
  from the Unstacked tray. Dropping onto the footer button appends to the end
  (`dropEnd` = `dragTo(si, 99)`, clamped to `tgt.length`). Dropping a habit onto
  a stack it is already in is a no-op.
- **The check circle** toggles the habit's completion for today via
  `HabitService.toggleToday()` — but only when the habit is due today
  (`cursor: not-allowed` otherwise).
- **The habit name** links to `/habits/:id`.
- **Unstacked tray** lists every habit in no stack as a draggable chip; empty it
  reads "all habits are stacked".

### 2.3 Behaviour added beyond the prototype

The user chose "prototype + edit + delete": create-with-defaults alone is a dead
end, because every stack would be called "New stack" forever and none could ever
be removed.

- **Edit stack** — an inline editor inside the card (name, time, anchor, aglyph,
  colour), following `HabitFormComponent`'s pattern (`input<T|null>` + `save` /
  `cancel` outputs), **not** a modal. The codebase has no modal primitive and
  the design has no mockup for one.
- **Delete stack** — removes the stack. Its habits are untouched and fall back
  into the Unstacked tray.

Both are reached from small icon buttons in the card header, styled like the
existing row `✕` (13px, `#c4c8cd`; hover `#0066cc` for edit, `#c92a2a` for
delete).

### 2.4 Demo data

`scripts/demo-data.mjs` gains `buildDemoStacks()` reproducing the prototype's
two stacks, and `design-shot.mjs --seed` writes them to
`habit_tracker.stacks.v1`. **Without this the design check is worthless** — an
unseeded store renders the zero-stacks empty state, which is exactly the failure
`CLAUDE.md` warns about for `--seed`.

Prototype `items` are indices into its habit array
(read 0, run 1, meditate 2, water 3, ship 4, sleep 5), so:

- Morning kickstart · 7:00 AM · ☕ · amber · `[2, 1, 3]` = meditate, run, water
- Evening wind-down · 9:30 PM · 🌙 · indigo · `[0, 5]` = read, sleep
- Unstacked: ship

which reproduces `design/target/stacks.png` exactly, including its
"2 of 2 done today" (run is Mon/Wed/Fri, so not due) and Sleep's `0 🔥`.

### 2.5 Design values

Transcribed from source. These are the `stacks.design.spec.ts` expectations —
**transcribed from the prototype, never from our own SCSS** (L-025).

- Page `max-width:1000px; margin:0 auto; padding:28px 24px 48px`
- H1 `23px / letter-spacing -0.3px / #16181c`; subtitle `margin:0 0 20px; 12.5px; #8a8f96`, text:
  `"After [current habit], I will [new habit]" — chain habits to an anchor you already do. Drag ⠿ to reorder.`
- New-stack button `9px 16px; bg #0066cc; #fff; radius 6px; 13px/600`
- Cards row `flex; gap:20px; align-items:flex-start; flex-wrap:wrap`
- Card `width:452px; bg #fff; border 1px #e8e8e6; border-top:3px solid {color}; radius 10px; padding 16px 18px`
- Header: name `14.5px/700 #16181c`; time pill `11px/600 #4c5057 on #f1f1ef, 3px 8px, radius 999px`; spacer `flex:1`; done pill `11px/600 #2f9e44 on #e9f7ec`
- Anchor box `border 1.5px dashed {color}; background hexAlpha(color, .09); radius 8px; padding 10px 14px; gap 10px`; aglyph `17px`; "ANCHOR · AFTER" `9.5px / letter-spacing 1px / uppercase / 700 / {color}`; text `13px/600 #16181c`
- THEN connector, rendered **before every item including the first**: `2px×7px #d8d8d5` bar, `then` `9px #a3a7ad uppercase letter-spacing 1.2px 600`, second bar; wrapper `gap:2px; padding:3px 0`
- Item row `gap:11px; border 1px #e8e8e6; radius 8px; padding 10px 13px; bg #fff`
- Handle `⠿ #c4c8cd 13px cursor:grab letter-spacing:-1px`
- Check circle `21px round, 2px border, 12px`; done → border+bg = the habit's hex, `✓`; else `#c9cdd2` border on `#fff`. `cursor: pointer` when due, `not-allowed` otherwise
- Glyph `15px`; name `13.5px/600 #16181c flex:1`, hover `#0066cc` + underline
- NOT-TODAY chip `10px #a3a7ad uppercase .5px radius 4px`, `padding 3px 7px` / `background #f4f4f2` when not due, `padding 0` / `transparent` when due
- Streak `11.5px #e8590c 700` + ` 🔥` — rendered even at 0
- Remove `✕ 13px #c4c8cd padding 0 2px`, hover `#c92a2a`
- Add picker: `Add:` `11px/600 #8a8f96`; chip `border 1px #bcd7ef; bg #e9f1fa; radius 999px; 5px 12px; 12px/600 #0066cc`; empty italic `12px #a3a7ad`
- Add footer `margin-top:12px; width:100%; padding:9px; bg #fff; border 1.5px dashed #c9cdd2; radius 8px; 12.5px; #75797f` — also a drop target
- Unstacked tray `margin-top:18px; bg #fff; border 1px #e8e8e6; radius 10px; padding 13px 18px; gap 12px; flex-wrap`; label `11px letter-spacing .6px uppercase #8a8f96 600`; chip `border 1px #e8e8e6; bg #fff; radius 999px; 6px 13px; 12.5px/600 #16181c; cursor:grab`; hint `12px #a3a7ad`

---

## 3. Decisions

### 3.1 AD-028 — Native HTML5 drag-and-drop, not Angular CDK

Chosen by the user. `@angular/cdk` is not installed; adding it for one page is a
dependency the prototype's own implementation does not need. Native
`dragstart`/`dragover`/`drop` reproduces the prototype's semantics exactly.

The transient drag payload lives in the component as
`{ from: string | null; habitId: string }`, where `from === null` means the drag
started in the Unstacked tray. It is **not** persisted and **not** a signal that
anything renders from.

Accepted cost: no keyboard reorder path, and HTML5 DnD does not fire on touch.
The `+ Add habit` chip picker is the non-drag way to add a habit to a stack, so
the page is not unusable without dragging — but reordering is drag-only. Noted
as **B-003**.

### 3.2 AD-029 — Stack colour/glyph are palette ids; the palette gains 4 entries

`habit.model.ts` documents the invariant that `color` and `icon` store palette
ids, never raw hex or emoji, so rendering can be restyled without a data
migration. Stacks follow it. Two prototype values are outside the current
palette, so the palette is extended rather than the rule broken:

- `HABIT_COLORS` += `{ id: 'indigo', label: 'Indigo', hex: '#6366f1' }`
- `HABIT_ICONS` += `coffee ☕`, `moon 🌙`, `clock ⏰`

Additive and back-compatible — `colorOf`/`iconOf` already fall back for unknown
ids, and existing habits are unaffected. Side effect, deliberate: habits gain
one more colour and three more icons in their pickers.

Consequence: the new-stack default `#0066cc` has no palette equivalent and
becomes `sky` (`#0ea5e9`). No mockup covers a freshly created stack, so nothing
regresses in the design check.

### 3.3 AD-030 — A habit belongs to at most one stack

Settled by the source (§0 row 7), not invented here. Adding a habit to stack B
removes it from stack A. The Unstacked tray is the complement of the union of
all `habitIds`, which is only well-defined under this constraint.

### 3.4 AD-031 — Delete prunes, archive hides

The prototype cannot answer this; chosen by the user.

- **Habit deleted** → its id is removed from every stack and the change is
  persisted immediately.
- **Habit archived** → the id **stays** in `habitIds`, the row is not rendered,
  and it is excluded from the "N of M done today" counts. Reactivating restores
  it to its original position.

Mechanism: `StacksService` runs an `effect()` over `habitService.habits()` and
prunes ids with no matching habit, reading its own state through `untracked()`
so the write cannot re-trigger the effect. Verified: Angular 21.2.18 marks
`allowSignalWrites` deprecated with "no longer required, signal writes are
allowed by default" (`node_modules/@angular/core/types/_discovery-chunk.d.ts`),
and `untracked` is exported from `@angular/core`. The dependency direction is
Stacks → Habits; `HabitService` must not learn about stacks.

Note in passing: `HabitService.archive()` opens a pause range covering the
archived stretch, so an archived habit is already `isDueOn() === false`. Hiding
it is therefore a rendering rule on top of an already-correct due calculation,
not a correction to it.

### 3.5 AD-032 — Stack editing is inline, not modal

`HabitFormComponent` is the house pattern for editing (`input<Habit|null>` +
`save`/`cancel` outputs, rendered inline where the thing lives). The stack
editor follows it. No modal primitive gets invented for a surface with no
mockup.

### 3.6 The zero-stacks empty state

The prototype ships with two stacks and has no empty state. A real first-run has
none. The page renders a single full-width dashed card reusing the
"+ Add habit to this stack" footer styling (`1.5px dashed #c9cdd2`, radius 8px,
`#75797f`), explaining habit stacking in one line and offering `+ New stack`.
Flagged for the critic: this is invented, not transcribed.

---

## 4. What is OUT of scope?

- **Angular CDK.** No new dependency (AD-028).
- **Keyboard and touch reordering.** B-003.
- **Reordering the stacks themselves.** Items move; cards do not.
- **A habit in two stacks.** AD-030.
- **Stack-level scheduling, reminders, or notifications.** `time` is a free-text
  label, never parsed and never used in any due calculation.
- **A "complete the whole stack" action.** Each item is ticked individually,
  through the same `toggleToday` every other page uses.
- **Surfacing stacks anywhere else.** The dashboard, habits page, calendar and
  analytics are untouched. No cross-page work.
- **Undo.** Removing a habit from a stack or deleting a stack is immediate.
  Consistent with the rest of the app.
- **Anchor autocomplete / anchor-as-habit-reference.** Free text, per §2.1.
- **Import/export or any stack sharing.**
- **A tombstone row for archived or missing habits.** Rejected in favour of
  AD-031; it would add a row state with no design source.

---

## 5. How do we know it is done?

1. `npm run build` is clean and `npm test` passes with no pre-existing test
   regressed.
2. `npm run design:shot -- stacks --width 1440 --seed` produces a composite in
   which the two seeded stacks match `design/target/stacks.png`: card widths,
   the amber and indigo top borders and anchor tints, the THEN connectors, the
   NOT-TODAY chip on Morning run, `0 🔥` on Sleep by 11pm, "2 of 2 done today"
   on Morning kickstart, and one "Ship side project" chip in the Unstacked tray.
3. The `states:` line from that run reports **every** declared stacks state as
   rendered — none listed under `NOT RENDERED`. States to declare in
   `design-shot.mjs`: `stack-item-done`, `stack-item-todo`,
   `stack-item-not-due`, `stack-streak`, `unstacked-chip`.
4. `src/app/stacks/stacks.design.spec.ts` asserts the §2.5 values that a
   screenshot cannot reach, read via `getComputedStyle`, with expectations
   transcribed from the prototype source.
5. Unit tests cover, at minimum:
   - a habit dragged from stack A to stack B leaves A and appears in B at the
     drop index;
   - dropping a habit onto a stack it is already in is a no-op;
   - reordering within a stack preserves the other members' relative order;
   - `deleting` a habit removes its id from every stack and persists;
   - `archiving` a habit hides its row and leaves `habitIds` unchanged, and
     reactivating restores it to its original position;
   - the done label counts only members due today;
   - the Unstacked tray is exactly the habits in no stack;
   - `load()` drops a malformed persisted stack instead of throwing.
6. `/stacks` with an empty store renders the zero-stacks empty state, and
   `+ New stack` from there produces a usable stack with its picker open.
7. `stacks.component.scss` says `max-width: 1000px`.
8. Reloading the page preserves stacks, their order, and their membership.

---

## 6. Retrospective

**Did Analyst.md catch anything not thought about up front?**

Yes — §0 found eight points where the roadmap's prose disagreed with the
prototype source, three of them in the data model: `@angular/cdk` is not
installed and never was (the roadmap named it as the drag-and-drop mechanism);
`aglyph` was omitted from the feature description entirely; and the done-label
denominator is **members due today**, not total members. None of the eight
would surface in a static screenshot, and all were settled before any code was
written. §3.6 also flagged the zero-stacks empty state as invented — it has no
prototype equivalent — so it went to the critic rather than being built on a
guess.

The general lesson is that the roadmap is prose and prose drifts: re-derive from
the prototype source before each section, never from the roadmap's summary of it.

**Did anything in tasks.md turn out to be wrong during coding?**

Yes, in three ways, all recorded in full under "What changed from the plan" in
`tasks.md`:

1. **A reference value was wrong and shipped wrong.** The Reference-values block
   specified a due row's NOT-TODAY chip as `padding 0; background transparent`.
   Implemented as a descendant selector across two *sibling* classes, it matched
   nothing, and its declarations were inverted regardless. Dead code that read as
   coverage until Step 16 (L-033, L-034).

2. **The plan's assumptions went stale mid-run.** The user approved a day-proof
   demo seed after Step 7; the remaining steps still carried Step 2's original
   expectation, turning an expected absence into a failure condition (L-037).

3. **Acceptance criterion 2 was over-specified.** Its literal `"2 of 2 done
   today"` and the chip's placement were transcribed from the prototype's capture
   day, so a correct build fails the criterion as written on most weekdays
   (L-032).

The step *structure* held — 17 sequential steps, three checkpoints, every step
ending green, 339 → 404 tests. What did not hold was the prose inside the steps,
which is where every defect above lived.
