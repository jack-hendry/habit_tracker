# tasks — Redesign §2: Habits

**13 steps, in order, do not skip ahead.** Every step ends at a green build and
a green suite. Baseline before Step 1: `npx ng test --watch=false
--browsers=ChromeHeadless` → **134 SUCCESS**, and `npx ng build` prints exactly
one warning (the `habit-list.component.scss` budget).

Spec: `specs/habits-redesign/Analyst.md`. Values in this file are literals
sampled from the prototype source — **transcribe them, do not round them**, and
do not add a property that is not written here (L-012: the *absence* of a
property is part of the sample).

Global stop rule: if a step's **Done when** cannot be met, STOP and report which
step did not land. Do not improvise, and never change a spec's expectation to
make it green.

---

### Step 1 — Add the five §2.4 tokens

**Files**
- MODIFY `src/styles.scss` — anchor: `--positive: #2f9e44;` (end of `:root`)
- DO NOT TOUCH: any component SCSS

**Context**
`:root` in `src/styles.scss` is the single source of truth for the redesign
palette (AD-009). Tokens are grouped by the roadmap section that introduced
them, each group under a comment saying which section and why. Follow the
existing `/* Dashboard §1 — … */` comment block's shape exactly.

**Do**
1. Append inside `:root`, after `--positive: #2f9e44;`:

```scss
  /* Habits §2 — the streak accent, the two 30-day-strip greys, the NOT TODAY
     pill, and the modal backdrop. The three near-greys (--pill-muted-bg,
     --strip-not-due and --chip-bg #f1f1ef) appear on the same row and are
     three different sampled values: do not collapse them (L-012).
     --backdrop is the one INVENTED value in this slice — no mockup exists for
     the modal (Analyst §3.5 D) — and is a token rather than an inline rgba()
     so AC 3's grep can see it (CriticReview R6). */
  --streak: #e8590c;
  --strip-missed: #e9e9e7;
  --strip-not-due: #f5f5f3;
  --pill-muted-bg: #f4f4f2;
  --backdrop: rgba(0, 0, 0, 0.32);
```

**Done when**
- `grep -c -- '--streak\|--strip-missed\|--strip-not-due\|--pill-muted-bg\|--backdrop' src/styles.scss` → `5`
- `npx ng build` succeeds, still exactly one budget warning

---

### Step 2 — Add `HabitService.recentStatuses` + specs

**Depends on:** Step 1

**Files**
- MODIFY `src/app/habit/habit.service.ts` — anchor: `monthGrid(` (~line 621); insert the new method immediately **before** it
- MODIFY `src/app/habit/habit.service.spec.ts`
- DO NOT TOUCH: `dayStatus`, `poolCounts`, `completionRate`, `isDueOn`

**Context**
Every derivation on this service is pure and takes `today: Date = new Date()` as
its last parameter — copy that shape from `monthGrid` directly above. Walk with
the existing `HabitService.shiftIso(iso, days)` static.

**Critical:** call `this.dayStatus(...)` **raw**, with **no `isDueOn` guard**.
`poolCounts` two methods above *does* guard, and this deliberately does not
(Analyst §3.1, CriticReview R4): a rate averages obligations, a strip records
what happened, so a day completed off-schedule is `done` here and correctly
excluded there. Do not "make them consistent".

**Do**
1. Add:

```ts
  /**
   * Day statuses for the `days`-day window ending today (inclusive), oldest
   * first. Drives the 30-day strip on the Habits page (§2) and the heatmap in
   * §4.
   *
   * Deliberately calls `dayStatus` with **no `isDueOn` guard**, unlike
   * `poolCounts` (habits-redesign CriticReview R4). `dayStatus` reports 'done'
   * before 'not-due', so a day completed off-schedule or during a pause paints
   * as done — which is right for a record of what happened, and wrong for a
   * rate. The two must not be unified.
   */
  recentStatuses(habit: Habit, days: number, today: Date = new Date()): DayStatus[] {
    const todayIso = HabitService.todayIso(today);
    const result: DayStatus[] = [];
    for (let offset = days - 1; offset >= 0; offset--) {
      result.push(this.dayStatus(habit, HabitService.shiftIso(todayIso, -offset), today));
    }
    return result;
  }
```

2. Add a `describe('recentStatuses')` block with **5** specs. Follow the
   fixture style already used by the `poolCounts` describe in the same file
   (a fixed `today` `Date`, habits built by the local helper):
   - returns exactly `days` entries
   - the **last** entry is today's status
   - the entries are oldest-first (a habit done only yesterday puts `'done'` at
     index `days - 2`)
   - a habit whose `startDate` falls **inside** the window reports `'not-due'`
     for the days before it, **not** `'missed'`
   - a day in `completedDates` that the schedule did **not** cover reports
     `'done'` (the no-guard decision above)

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **139 SUCCESS**
- `npx ng build` succeeds

**If blocked**
If `HabitService.shiftIso` is not a public static on the service, STOP — Step 1
of `dashboard-redesign` did not land and this step's walk has no date helper.

---

### Step 3 — `getScheduleLabel`: `' · '` separator and the `Weekdays` collapse

**Depends on:** Step 2

**Files**
- MODIFY `src/app/habit/habit-list.component.ts` — anchor: `getScheduleLabel(id: string): string`
- CREATE `src/app/habit/habit-list.component.spec.ts`
- DO NOT TOUCH: `habit.service.ts`, the template, the SCSS

**Context**
The method returns `labels.join(' ')` today. The prototype renders
`Mon · Wed · Fri` and collapses `[1,2,3,4,5]` to `Weekdays` (Analyst §3.4).
Separator is U+00B7 MIDDLE DOT with a space either side, matching the shell's
date format. **No `Weekends` case** — no sampled value exists for it, and
inventing one is the exact failure this spec exists to avoid.

This step creates the page's **first** component spec file (CriticReview R1) —
there is none today. Use `dashboard.component.spec.ts` as the TestBed pattern.

**Do**
1. Replace the body after the `daily` branch with, in order: return `'Weekdays'`
   when `days.length === 5 && days.every((d, i) => d === i + 1)`; otherwise
   `labels.join(' · ')`.
2. Create `habit-list.component.spec.ts` with a `describe('getScheduleLabel')`
   holding **3** specs: `daily` → `'Daily'`; `[1,2,3,4,5]` → `'Weekdays'`;
   `[1,3,5]` → `'Mon · Wed · Fri'`.

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **142 SUCCESS**
- `grep -c "' · '" src/app/habit/habit-list.component.ts` → `1`

---

### Step 4 — Create `<app-day-strip>` + specs

**Depends on:** Step 3

**Files**
- CREATE `src/app/shared/day-strip/day-strip.component.ts`
- CREATE `src/app/shared/day-strip/day-strip.component.html`
- CREATE `src/app/shared/day-strip/day-strip.component.scss`
- CREATE `src/app/shared/day-strip/day-strip.component.spec.ts`
- DO NOT TOUCH: `habit-list.*` — nothing consumes this yet

**Context**
Follow `src/app/shared/stat-card/` exactly — standalone component, `input.required`
signal inputs, a separate `.html` and `.scss`. This component is pure
presentation: it takes statuses and a hex and renders cells.

`Last 30 days` is **sentence case in the DOM, uppercased in CSS** (Analyst §2.3
uppercase rule). Do not type `LAST 30 DAYS`.

**Do**
1. `day-strip.component.ts`:

```ts
import { Component, input } from '@angular/core';
import { DayStatus } from '../../habit/habit.model';

/**
 * The 30-day completion strip on the Habits page (roadmap §2). One 8×22px cell
 * per day, oldest first. Presentation only — the caller supplies the window.
 */
@Component({
  selector: 'app-day-strip',
  standalone: true,
  templateUrl: './day-strip.component.html',
  styleUrl: './day-strip.component.scss',
})
export class DayStripComponent {
  readonly statuses = input.required<DayStatus[]>();
  /** The owning habit's colour, from `colorOf(habit.color).hex`. */
  readonly hex = input.required<string>();
  /** Sentence case here, uppercased in CSS (Analyst §2.3). */
  readonly label = input('Last 30 days');

  /**
   * Five DayStatus values, three cell colours (Analyst §3.1). `pending` shares
   * the missed grey — measured on the target, not chosen: `Read 20 pages` is
   * daily and unticked on the mockup's today and its last cell is #e9e9e7.
   * `future` cannot occur in a window ending today; mapped for totality.
   */
  cellColor(status: DayStatus): string {
    if (status === 'done') return this.hex();
    if (status === 'missed' || status === 'pending') return 'var(--strip-missed)';
    return 'var(--strip-not-due)';
  }
}
```

2. `day-strip.component.html`:

```html
<div class="day-strip">
  <div class="cells">
    @for (status of statuses(); track $index) {
      <span class="cell" [style.background]="cellColor(status)"></span>
    }
  </div>
  <span class="strip-label">{{ label() }}</span>
</div>
```

3. `day-strip.component.scss`:

```scss
/* Sampled from the prototype source (Analyst §2.3). 30 × 8px + 29 × 2px =
   298px, confirmed by measuring design/target/habits.png. */
.day-strip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.cells {
  display: flex;
  gap: 2px;
}

.cell {
  width: 8px;
  height: 22px;
  border-radius: 2px;
}

.strip-label {
  font-size: 9.5px;
  color: var(--text-faint);
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
```

4. `day-strip.component.spec.ts` — **5** specs, following
   `stat-card.component.spec.ts`:
   - renders one `.cell` per status (30 in → 30 cells)
   - a `'done'` cell uses the `hex` input
   - a `'missed'` cell uses `var(--strip-missed)`
   - a `'pending'` cell uses `var(--strip-missed)` **too**
   - a `'not-due'` cell uses `var(--strip-not-due)`

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **147 SUCCESS**
- `grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' src/app/shared/day-strip/day-strip.component.scss` returns **nothing**

---

### Step 5 — Checkpoint

**Depends on:** Step 4

**Files** — none. No new code.

**Do**
1. Re-run the build and the full suite.
2. Re-confirm Steps 1–4's **Done when** lines still hold.

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **147 SUCCESS**, zero failures
- `npx ng build` succeeds with still exactly **one** budget warning
  (`habit-list.component.scss`, 7.82 kB) — Steps 1–4 must not have touched it

**If blocked**
If the suite is below 147 or the build prints a second budget warning, STOP and
report which of Steps 1–4 regressed. Do not continue into the extraction.

---

### Step 6 — Extract `<app-habit-form>` from the inline edit form

**Depends on:** Step 5

**Files**
- CREATE `src/app/shared/habit-form/habit-form.component.ts`
- CREATE `src/app/shared/habit-form/habit-form.component.html`
- CREATE `src/app/shared/habit-form/habit-form.component.scss`
- MODIFY `src/app/habit/habit-list.component.ts` — anchors: `readonly draftName = signal('')`, `startEdit(`, `saveEdit(`
- MODIFY `src/app/habit/habit-list.component.html` — anchor: `<div class="edit-form">`
- MODIFY `src/app/habit/habit-list.component.scss` — anchors: `.edit-form`, `.edit-field`, `.edit-label`, `.notes-input`, `.swatch-picker`, `.swatch`, `.icon-picker`, `.icon-option`, `.schedule-picker`, `.radio-group`, `.weekday-picker`, `.weekday-checkbox`, `.habit-input`, `.save-button`, `.cancel-button`, `.backdate-warning`, `.future-warning`, `.schedule-warning`
- DO NOT TOUCH: `habit.service.ts`, `habit.model.ts`, the row markup, the add form (Step 8 removes it)

**Context**
This is a **move, not a rewrite.** The markup, the SCSS rules and the draft
logic all transfer verbatim; only their home changes. There is **no existing
spec coverage for any of it** (CriticReview R1) — Step 7 adds the net
immediately after, so keep this step mechanical and resist tidying anything on
the way past.

Two behaviours regress silently if the move is careless:

- `backdateWarning` reads `this.editingHabit()` today. In the new component it
  must read the `habit()` **input**. It also injects `HabitService` for
  `isDueOn` — inject it in the new component the same way.
- `scheduleChanged` compares schedules **by value**, not by reference
  (`habit-metadata` R12). Drafts are new objects, so a `!==` would make the
  recalculation warning permanent. Move the comparison exactly as written.

**Do**
1. Create the component: `selector: 'app-habit-form'`, standalone,
   `imports: [FormsModule]`, `templateUrl`, `styleUrl`.
2. Give it `readonly habit = input<Habit | null>(null);` (null = create),
   `readonly save = output<HabitPatch>();` and `readonly cancel = output<void>();`.
3. Move these members off `HabitListComponent` into it, unchanged: `draftName`,
   `draftDescription`, `draftCategory`, `draftColor`, `draftIcon`, `draftNotes`,
   `draftStartDate`, `draftScheduleType`, `draftDays`, `toggleDraftDay`,
   `isDraftDaySelected`, `draftSchedule`, `canSave`, `isStartDateValid`,
   `scheduleChanged`, `backdateWarning`, `isFutureStartDate`, `nextIso`, and
   the `colors` / `icons` / `weekdays` lists it needs.
4. Prefill on construction from `habit()` using a `constructor` + `effect`, with
   the same field-by-field mapping `startEdit` uses today; when `habit()` is
   `null` every draft stays at its empty default.
5. `onSave()` builds the same `HabitPatch` object literal `saveEdit` builds
   today and emits it on `save`. It must not call `HabitService.update` — the
   parent owns persistence.
6. Move the `<div class="edit-form">…</div>` subtree from
   `habit-list.component.html` into `habit-form.component.html` verbatim,
   rewiring `saveEdit()` → `onSave()` and `cancelEdit()` → `cancel.emit()`.
   Also move the `<datalist id="category-suggestions">` — the form owns it now;
   populate it from a `categories` input.
7. Move the SCSS rules listed under **Files** out of
   `habit-list.component.scss` into `habit-form.component.scss`, verbatim,
   replacing any raw hex with the matching token from `src/styles.scss`.
8. In `habit-list.component.html`, replace the removed subtree with:

```html
<app-habit-form
  [habit]="editingHabit()"
  [categories]="categories()"
  (save)="saveEdit($event)"
  (cancel)="cancelEdit()"
/>
```

9. `HabitListComponent.saveEdit(patch: HabitPatch)` now takes the payload, calls
   `this.habitService.update(id, patch)` and clears `editingId`. `startEdit`
   keeps only `confirmingDeleteId.set(null)` and `editingId.set(habit.id)` — the
   draft prefilling moved to the form.

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **147 SUCCESS** (a move adds no specs)
- `npx ng build` succeeds
- `grep -c 'draftName' src/app/habit/habit-list.component.ts` → `0`
- `grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' src/app/shared/habit-form/habit-form.component.scss` returns **nothing**

**If blocked**
If moving a member needs a *behaviour* change to compile — not just a new import
or a rename of `editingHabit()` to `habit()` — STOP and report which member.
That is a sign the extraction boundary is wrong, and guessing at it silently
loses a behaviour no spec is watching.

---

### Step 7 — Spec `<app-habit-form>`

**Depends on:** Step 6

**Files**
- CREATE `src/app/shared/habit-form/habit-form.component.spec.ts`
- DO NOT TOUCH: any `src/app/**` file other than this new spec

**Context**
This is the regression net Step 6 did not have (CriticReview R1). If a spec here
fails, the defect is in Step 6's move — fix the component, never the
expectation.

**Do**
1. Write **5** specs:
   - `[habit]` set → every draft is prefilled from it (name, description,
     category, colour, icon, notes, start date, schedule type and days)
   - `[habit]` `null` → every draft is empty and `canSave()` is `false`
   - `canSave()` is `false` for a blank name, and `false` for
     `scheduleType === 'weekdays'` with no day selected
   - `scheduleChanged()` is **`false`** when the draft schedule is
     re-selected to the same value (proves the by-value comparison —
     a reference check returns `true` here)
   - `backdateWarning()` counts the un-completed due days between an earlier
     draft `startDate` and today, reading its `[habit]` input

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **152 SUCCESS**

---

### Step 7b — Tokenise `habit-form.component.scss` (Step 6 remediation)

**Depends on:** Step 7

**Files**
- MODIFY `src/app/shared/habit-form/habit-form.component.scss` — whole file
- DO NOT TOUCH: the component's `.ts` or `.html`, or any other file

**Context**
Step 6 sub-step 7 required raw hex to be replaced with tokens on the way across,
and its **Done when** required
`grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' src/app/shared/habit-form/habit-form.component.scss`
to return nothing. The move happened; the tokenising did not — the file carries
**29** raw colour literals. This step finishes it.

Most of these are **pre-redesign** values (`#ccc`, `#555`, `#222`, `#f0f0f0`)
that predate AD-009 and were never on the palette, which is why the mapping
below is given explicitly rather than left to judgement. Apply it literally.

**Do**
1. Replace every occurrence, exactly as mapped — this table is exhaustive:

| Literal | Replacement |
|---|---|
| `#0066cc` | `var(--accent)` |
| `#0052a3` | `var(--accent)` |
| `#fff` | `var(--surface)` |
| `#ccc` | `var(--control-border)` |
| `#bbd4e8` | `var(--control-border)` |
| `#b0c4d8` | `var(--control-border)` |
| `#f0f0f0` | `var(--chip-bg)` |
| `#e8f1f8` | `var(--accent-tint)` |
| `#222` | `var(--text-strong)` |
| `#333` | `var(--text-strong)` |
| `#555` | `var(--text)` |
| `#fff8e1` | `var(--pending-bg)` |
| `#ffe082` | `var(--pending)` |
| `#7a5900` | `var(--pending-text)` |
| `rgba(0, 102, 204, 0.1)` | `var(--accent-tint)` |

2. Change nothing else — no property added, removed, or reordered.

**Done when**
- `grep -cE '#[0-9a-fA-F]{3,6}|rgba?\(' src/app/shared/habit-form/habit-form.component.scss` → `0`
- `npx ng test --watch=false --browsers=ChromeHeadless` → **154 SUCCESS**
- `npx ng build` succeeds

---

### Step 8 — `+ New habit` modal; remove the always-open add form

**Depends on:** Step 7b

**Files**
- MODIFY `src/app/habit/habit.service.ts` — anchor: `add(name: string, schedule: Schedule = { type: 'daily' }): void`
- MODIFY `src/app/habit/habit.service.spec.ts`
- MODIFY `src/app/habit/habit-list.component.html` — anchors: `<div class="add-habit">`, `<h1>My Habits</h1>`
- MODIFY `src/app/habit/habit-list.component.ts` — anchors: `readonly newName = signal('')`, `add()`, `startEdit(`
- MODIFY `src/app/habit/habit-list.component.scss` — anchors: `.add-habit`, `.form-section`, `.add-button`
- DO NOT TOUCH: `habit-form.component.*`, any other method on `habit.service.ts`

**Context**
The `<dialog>` element is **always rendered; its contents are wrapped in
`@if (creating())`** (Analyst §3.5, CriticReview R2). Both obvious alternatives
fail: a `<dialog>` inside the `@if` does not exist when `showModal()` runs, and
an always-rendered *form* keeps its drafts across a close, so the second open
shows the previous half-typed habit. Gating the contents makes "empty on
re-open" structural.

The modal and the inline editor are mutually exclusive (§3.5 E): nothing clears
`editingId` today, so both could be open at once and `Esc` would close the modal
onto an expanded edit form, reading as though the modal edited that row.

**Do**
0. `HabitService.add` returns `void` today, so the modal has no way to reach the
   habit it just created. Change its return type to `Habit | null` — `return
   habit;` after `this.persist();`, and `return null;` in the existing early
   rejection. This is **purely additive**: every current caller ignores the
   return value and none change. Do not alter the validation, the field
   defaults, or any other method. Add one spec asserting `add()` returns the
   created habit and `add('  ')` returns `null`.
1. Delete the `<div class="add-habit">…</div>` subtree, and the `newName`,
   `scheduleType`, `selectedDays`, `toggleDay`, `isDaySelected` members and the
   `add()` body's form-reading logic. Delete `.add-habit`, `.form-section` and
   `.add-button` from the SCSS.
2. Add `readonly creating = signal(false);` and
   `private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('createDialog');`
3. Add:

```ts
  /** Open the create modal. Closes an open inline editor first (§3.5 E). */
  openCreate(): void {
    this.editingId.set(null);
    this.confirmingDeleteId.set(null);
    this.creating.set(true);
    this.dialog().nativeElement.showModal();
  }

  /** Fired by Cancel, by Esc (native) and by `close`. Idempotent. */
  closeCreate(): void {
    this.creating.set(false);
    const el = this.dialog().nativeElement;
    if (el.open) {
      el.close();
    }
  }

  /** Persist a new habit from the modal's form, then close it. */
  createHabit(patch: HabitPatch): void {
    if (!patch.name?.trim() || !patch.schedule) {
      return;
    }
    const created = this.habitService.add(patch.name, patch.schedule);
    if (created) {
      this.habitService.update(created.id, patch);
    }
    this.closeCreate();
  }
```

4. In `startEdit`, add `this.closeCreate();` as the first line.
5. Add the button to the header (Step 11 styles it):

```html
<button type="button" class="new-habit-button" (click)="openCreate()">+ New habit</button>
```

6. Add the dialog at the end of the container:

```html
<dialog #createDialog class="create-dialog" (close)="closeCreate()">
  @if (creating()) {
    <h2 class="dialog-title">New habit</h2>
    <app-habit-form
      [habit]="null"
      [categories]="categories()"
      (save)="createHabit($event)"
      (cancel)="closeCreate()"
    />
  }
</dialog>
```

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **156 SUCCESS**
- `npx ng build` succeeds
- `grep -c 'add-habit\|newName' src/app/habit/habit-list.component.html src/app/habit/habit-list.component.ts` → `0` for both files

**If blocked**
If sub-step 0's return-type change breaks an existing `habit.service.spec.ts`
spec, STOP and report which one. Widening a `void` return cannot change
behaviour, so a failure there means something else in this step altered the
service — and the fix is to undo that, never to adjust the spec.

---

### Step 9 — Spec the create modal

**Depends on:** Step 8

**Files**
- MODIFY `src/app/habit/habit-list.component.spec.ts` — anchor: `describe('getScheduleLabel')`
- DO NOT TOUCH: any other file

**Do**
1. Add a `describe('create modal')` with **5** specs:
   - `creating()` is `false` initially and the dialog holds no `app-habit-form`
   - `openCreate()` sets `creating()` and renders an `app-habit-form`
   - saving from the form adds a habit with the submitted name **and** its
     metadata, and leaves `creating()` `false`
   - `closeCreate()` leaves `creating()` `false` and adds **no** habit
   - `openCreate()` while `editingId` is set clears `editingId`, and
     `startEdit()` while the modal is open leaves `creating()` `false` (§3.5 E)

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **161 SUCCESS**

---

### Step 10 — Checkpoint: the budget warning must be gone

**Depends on:** Step 9

**Files** — none. No new code.

**Do**
1. Re-run the build and the full suite.

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **161 SUCCESS**, zero failures
- `npx ng build` prints **no budget warning at all** — the
  `habit-list.component.scss` line that read *"7.82 kB"* before Step 1 is gone

**If blocked**
If the budget warning is still printed, STOP and report the new size. Steps 6
and 8 were ordered here precisely so Step 11 has headroom to add the row styles
(the error threshold is 10 kB). Continuing would push the file toward a hard
build failure.

---

### Step 11 — Restyle the page to §2

**Depends on:** Step 10

**Files**
- MODIFY `src/app/habit/habit-list.component.html` — anchors: `class="habit-list-container"`, `class="controls-bar"`, `class="habit-item"`
- MODIFY `src/app/habit/habit-list.component.scss` — whole file
- MODIFY `src/app/habit/habit-list.component.ts` — anchor: `imports: [FormsModule, CommonModule]`
- DO NOT TOUCH: `habit.service.ts`, `habit.model.ts`, `day-strip.component.*`, `habit-form.component.*`

**Context**
Every number below is a literal from the prototype source. Transcribe them; do
not round, and **do not add a property that is not written here** — in
particular no `line-height` on the emoji glyph, which cost `dashboard-redesign`
a design-check round (L-012).

Four things the target cannot show are **kept** (Analyst §3.8): the `Paused`
badge, the `Paused since` line, the description line, and `Starts {date}`. The
mockup simply has no habit in those states. Deleting them would undo
`habit-lifecycle` R7/R8.

Archived rows keep today's simplified content and their lone `Reactivate`
button, on the new card shell, and get **no strip** (§3.7).

**Do**
1. Add `DayStripComponent` to the component's `imports`, and a helper:

```ts
  /** The last 30 days of status for the strip (§3.1). */
  strip30(habit: Habit): DayStatus[] {
    return this.habitService.recentStatuses(habit, 30);
  }
```

2. Wrap the `h1` in a header row and restructure the active-row markup so the
   row's three children are: the checkbox label, the middle column, the strip,
   the actions.

```html
<div class="page-header">
  <h1>My Habits</h1>
  <button type="button" class="new-habit-button" (click)="openCreate()">+ New habit</button>
</div>
```

Active row (inside the existing `@for`, replacing the `habit-main` /
`habit-actions` pair):

```html
<label class="habit-checkbox" [class.checked]="isDoneToday(habit.id)">
  <input
    type="checkbox"
    [checked]="isDoneToday(habit.id)"
    (change)="toggleToday(habit.id)"
    [attr.aria-label]="habit.name"
  />
  <span aria-hidden="true">{{ isDoneToday(habit.id) ? '✓' : '' }}</span>
</label>

<div class="habit-main">
  <div class="habit-header">
    <span class="habit-icon" aria-hidden="true">{{ iconGlyph(habit) }}</span>
    <span class="habit-name">{{ habit.name }}</span>
    @if (isPaused(habit.id)) {
      <span class="paused-badge">Paused</span>
    }
  </div>

  @if (habit.description) {
    <p class="habit-description">{{ habit.description }}</p>
  }
  @if (isPaused(habit.id)) {
    <p class="paused-since">{{ getPausedSinceLabel(habit) }}</p>
  }

  <div class="habit-meta">
    <span class="schedule-label">{{ getScheduleLabel(habit.id) }}</span>
    @if (habit.category) {
      <span class="category-chip">{{ habit.category }}</span>
    }
    <span class="streak-info">{{ getCurrentStreak(habit.id) }} 🔥</span>
    <span class="best-streak">best {{ getLongestStreak(habit.id) }}</span>
    @if (getCompletionPercentageForHabit(habit)) {
      <span class="completion-rate">{{ getCompletionPercentageForHabit(habit) }}</span>
    } @else if (getStartsLabel(habit)) {
      <span class="starts-label">{{ getStartsLabel(habit) }}</span>
    }
    @if (!isDueToday(habit.id)) {
      <span class="not-scheduled">not today</span>
    }
  </div>
</div>

<app-day-strip [statuses]="strip30(habit)" [hex]="colorHex(habit)" />

<div class="habit-actions">
  <!-- unchanged: Pause/Resume, Edit, Archive, Delete + confirm -->
</div>
```

`not today` and `Last 30 days` stay **sentence case in the DOM** — the
uppercasing is in CSS (Analyst §2.3). `best {{ … }}` has **no colon**.

3. In the controls bar, move the `Show archived` button out of its
   `.archived-toggle` wrapper so it is a direct child of `.controls-bar`
   (the SCSS right-aligns it with `margin-left: auto`, not a spacer element —
   CriticReview R8).

4. Replace `habit-list.component.scss` entirely with:

```scss
/* Redesign §2 — Habits. Every value sampled from the prototype source; see
   specs/habits-redesign/Analyst.md §2. No raw colour belongs here (AD-009):
   the habit's own hex is bound inline in the template from `colorOf`. */

.habit-list-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--content-pad);
}

/* Header ----------------------------------------------------------------- */

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

h1 {
  margin: 0;
  font-size: 23px;
  letter-spacing: -0.3px;
  color: var(--text-strong);
}

.new-habit-button {
  padding: 9px 16px;
  background: var(--accent);
  color: var(--surface);
  border: none;
  border-radius: var(--radius-control);
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
}

/* Controls bar ------------------------------------------------------------ */

.controls-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.category-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 12.5px;
  color: var(--text-sub);
}

/* A solid blue fill when active — unlike the nav's active pill, which is a
   pale --accent-tint (global-shell §2). Two pills, two treatments. */
.filter-chip {
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  background: var(--surface);
  color: var(--text);
  border: 1px solid var(--control-border);

  &.active {
    background: var(--accent);
    color: var(--surface);
    border-color: var(--accent);
  }
}

/* margin-left:auto, not the source's `flex:1` spacer: the filter block sits
   behind an @if and would take a spacer with it (CriticReview R8). */
.toggle-button {
  margin-left: auto;
  padding: 7px 13px;
  background: var(--surface);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-control);
  font-size: 12px;
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
}

/* Rows -------------------------------------------------------------------- */

.habit-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.habit-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 4px solid var(--row-neutral);
  border-radius: var(--radius-card);
  padding: 13px 18px;
}

.habit-checkbox {
  position: relative;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-control);
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  border: 2px solid var(--checkbox-border);
  background: var(--surface);
  color: var(--surface);
  cursor: pointer;
  box-sizing: border-box;

  input {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    cursor: pointer;
  }

  &.checked {
    background: var(--accent);
    border-color: var(--accent);
  }

  &:has(input:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
}

.habit-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.habit-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* No line-height: the emoji font's normal line box is what sets the row
   height. Pinning it to 1 shortens every row (L-012). */
.habit-icon {
  font-size: 16px;
}

.habit-name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-strong);
}

.habit-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-sub);
}

/* Blue in every case — Daily, Weekdays and Mon · Wed · Fri alike — and a 4px
   rectangle, while the category chip beside it is a 999px pill. */
.schedule-label {
  background: var(--accent-tint);
  color: var(--accent);
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
}

.category-chip {
  background: var(--chip-bg);
  color: var(--text);
  font-weight: 500;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
}

.streak-info {
  color: var(--streak);
  font-weight: 700;
}

.completion-rate {
  color: var(--accent);
  font-weight: 700;
}

/* Sentence case in the DOM, uppercased here (Analyst §2.3). */
.not-scheduled {
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 10px;
  border-radius: 4px;
  background: var(--pill-muted-bg);
  padding: 3px 7px;
}

/* Kept, though no mockup shows them (Analyst §3.8). */
.paused-badge {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--pending-text);
  background: var(--pending-bg);
  padding: 3px 7px;
  border-radius: 4px;
}

.habit-description,
.paused-since {
  margin: 0;
  font-size: 12px;
  color: var(--text-sub);
}

.starts-label {
  color: var(--text-faint);
}

/* Actions ----------------------------------------------------------------- */

.habit-actions {
  display: flex;
  gap: 6px;
}

.habit-actions button {
  padding: 7px 11px;
  background: var(--surface);
  border: 1px solid var(--control-border);
  border-radius: var(--radius-control);
  font-size: 12px;
  color: var(--text);
  font-family: inherit;
  cursor: pointer;
}

/* Delete differs from its neighbours in exactly two properties. */
.delete-button,
.delete-button.confirming {
  border-color: var(--danger-border);
  color: var(--danger-text);
}

/* Archived rows (§3.7) — same shell, no strip, one action. */
.habit-item.archived {
  opacity: 0.65;
}

.archived-name {
  text-decoration: line-through;
}

.empty-state {
  padding: 28px 0;
  font-size: 13px;
  color: var(--text-faint);
  font-style: italic;
}

/* Create modal (§3.5 D) — invented, no mockup exists. */
.create-dialog {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 22px 24px;
  max-width: 520px;
  width: 100%;
  color: var(--text);

  &::backdrop {
    background: var(--backdrop);
  }
}

.dialog-title {
  margin: 0 0 16px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-strong);
}
```

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **161 SUCCESS**
- `npx ng build` succeeds with **no budget warning**
- `grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' src/app/habit/habit-list.component.scss` returns **nothing**
- `grep -c 'best {{' src/app/habit/habit-list.component.html` → `1`, and
  `grep -c 'best:' src/app/habit/habit-list.component.html` → `0`

---

### Step 12 — Spec the row's state-dependent elements

**Depends on:** Step 11

**Files**
- MODIFY `src/app/habit/habit-list.component.spec.ts` — anchor: `describe('create modal')`
- DO NOT TOUCH: any other file

**Context**
None of these four are visible in `design/target/habits.png` — the mockup has no
paused, described or future-dated habit — so a spec is the only thing watching
them (Analyst §3.8).

**Do**
1. Add a `describe('row rendering')` with **4** specs:
   - a habit not due today renders `.not-scheduled`; one due today does not
   - a paused habit renders `.paused-badge` and `.paused-since`
   - a habit with a `description` renders `.habit-description`
   - a habit with a future `startDate` renders `.starts-label` and **no**
     `.completion-rate`

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **165 SUCCESS**

---

### Step 13 — Design check, regression, wrap-up

**Depends on:** Step 12

**Files**
- MODIFY `src/**` only if the design check finds a defect
- DO NOT TOUCH: `specs/habits-redesign/Analyst.md`, `tasks.md`, `CriticReview.md`
  and `specs/STATE.md` — the `protect-spec-docs-from-subagents` hook blocks the
  first three, and the retrospective plus the `STATE.md` entries are the
  top-level session's job, not the executor's. **Report** them instead.

**Context**
The design check needs the dev server running **and** `--seed`; without the seed
an empty store renders the empty state and the comparison is worthless (L-014).
Port 4200 is often taken — use 4300 and `DESIGN_BASE_URL` (L-011).

**Do**
1. `npx ng serve --port 4300`, then
   `DESIGN_BASE_URL=http://localhost:4300 npm run design:shot -- habits --width 1440 --seed`.
2. Read **only** `design/compare/habits.png`. Anything that looks off is then
   **measured** against `design/target/habits.png`, never re-judged by eye
   (L-011).
3. **Expected, not a defect:** the `Morning run` meta row wraps onto two lines
   (`Mon · Wed ·` / `Fri`, with `2`/`🔥` and `best`/`14` stacked) and that row is
   taller than the other five. It does the same in the target. Do **not** add
   `white-space: nowrap` or shrink the strip to "fix" it (Analyst §3.6).
4. Walk all 13 acceptance criteria in `Analyst.md` §5 and record the result of
   each **in your final report** — met, or not met and why.
5. In the same report, hand back for the top-level session to write up: anything
   in these 13 steps that turned out wrong during coding, and anything the
   design check caught that no spec would have.
6. **Do not commit, do not create a branch, do not push.**

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **165 SUCCESS**, zero failures
- `npx ng build` succeeds with **no budget warning**
- `design/compare/habits.png` exists, and all 13 §5 criteria are in the report
  each marked met or not met
- `git status` shows **no commit made** on top of `76b6634`
