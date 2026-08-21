# tasks — Habit Stacks (roadmap §5)

**17 steps, in order, do not skip ahead.** Checkpoints at 6, 10 and 14.

Baseline before Step 1: `npm test` → **339 tests, 339 SUCCESS**. Every step's
expected count is stated against that baseline as it grows.

**Sequential. No step in this plan runs in parallel with another.** Step 7 is
the only one that touches no file under `src/`, but pairing it with one other
step is not worth a cold start (`specs/TEMPLATE.md` — "parallelism pays only for
several independent, non-trivial steps"). Every step therefore omits `Assumes:`,
which the template only requires inside a parallel group.

**Every step ends at a green build.** If `npm run build` or `npm test` is red at
the end of a step, stop — do not start the next one.

**Global stop rule:** if an implementation attempt fails twice, stop and report
instead of retrying (`CLAUDE.md`).

**Do not commit anything at any point.** The wrap-up step ends by asking.

---

## Reference values used across steps

Copy from here rather than re-deriving. Every value is transcribed from the
prototype source via `Analyst.md` §2.5.

```
Page          max-width 1000px; margin 0 auto; padding 28px 24px 48px
Header row    display flex; align-items center; justify-content space-between;
              margin-bottom 6px
H1            23px / 700 / letter-spacing -0.3px / #16181c
Subtitle      margin 0 0 20px; 12.5px; #8a8f96
New-stack btn padding 9px 16px; background #0066cc; color #fff; radius 6px; 13px/600
Cards row     display flex; gap 20px; align-items flex-start; flex-wrap wrap
Card          width 452px; background #fff; border 1px solid #e8e8e6;
              border-top 3px solid {stack hex}; radius 10px; padding 16px 18px
Card header   display flex; align-items center; gap 9px; margin-bottom 12px
Stack name    14.5px / 700 / #16181c
Time pill     11px/600 #4c5057 on #f1f1ef; padding 3px 8px; radius 999px
Done pill     11px/600 #2f9e44 on #e9f7ec
Anchor box    border 1.5px dashed {hex}; background hexAlpha(hex,.09); radius 8px;
              padding 10px 14px; gap 10px
Anchor glyph  17px
Anchor column display flex; flex-direction column; gap 1px
Anchor label  9.5px / letter-spacing 1px / uppercase / 700 / {hex}
              Literal DOM text is `Anchor · After` — title case. The uppercase
              is `text-transform`, not the string (CriticReview R1-4).
Anchor text   13px / 600 / #16181c
THEN bar      2px x 7px #d8d8d5
THEN word     9px #a3a7ad uppercase letter-spacing 1.2px 600
THEN wrapper  gap 2px; padding 3px 0
Item row      gap 11px; border 1px solid #e8e8e6; radius 8px; padding 10px 13px; bg #fff
Handle        glyph ⠿; #c4c8cd; 13px; cursor grab; letter-spacing -1px
Check circle  21px round; 2px border; 12px font.
              done  -> border + background = the habit's hex, content ✓, colour #fff
              todo  -> border #c9cdd2 on #fff
              due   -> cursor pointer;  not due -> cursor not-allowed
Habit glyph   15px
Habit name    13.5px / 600 / #16181c; flex 1; hover #0066cc + underline
NOT-TODAY     10px #a3a7ad uppercase letter-spacing .5px radius 4px
              not due -> padding 3px 7px; background #f4f4f2
              due     -> padding 0;        background transparent
Streak        11.5px #e8590c 700, text `N 🔥` — rendered even when N is 0
Remove ✕      13px #c4c8cd; padding 0 2px; hover #c92a2a
Picker row    display flex; align-items center; gap 8px; flex-wrap wrap;
              margin-top 12px. Renders ABOVE the "Add footer" button, not below.
Add: label    11px / 600 / #8a8f96
Add chip      border 1px solid #bcd7ef; background #e9f1fa; radius 999px;
              padding 5px 12px; 12px/600 #0066cc
Add empty     italic 12px #a3a7ad — "every habit is already in a stack"
Add footer    margin-top 12px; width 100%; padding 9px; background #fff;
              border 1.5px dashed #c9cdd2; radius 8px; 12.5px; #75797f
Unstacked     margin-top 18px; background #fff; border 1px solid #e8e8e6;
              radius 10px; padding 13px 18px; gap 12px; flex-wrap wrap
Unst. label   11px letter-spacing .6px uppercase #8a8f96 600
Unst. chip    border 1px solid #e8e8e6; background #fff; radius 999px;
              padding 6px 13px; 12.5px/600 #16181c; cursor grab
Unst. empty   italic 12px #a3a7ad — "all habits are stacked".
              Conditional: only when the tray has no chips.
Unst. hint    12px #a3a7ad, NOT italic — permanent, renders whether or not the
              tray has chips. Verbatim, curly quotes included:
              drag a chip onto a stack, or use “+ Add habit”
Edit/delete   13px #c4c8cd; hover #0066cc (edit) / #c92a2a (delete)
```

Subtitle text, verbatim:

```
"After [current habit], I will [new habit]" — chain habits to an anchor you already do. Drag ⠿ to reorder.
```

---

## Step 1 — Add four palette entries to `habit.model.ts`

**Depends on:** nothing.

**Files**
- MODIFY `src/app/habit/habit.model.ts` — anchors: `HABIT_COLORS`, `HABIT_ICONS`
- DO NOT TOUCH: `src/app/habit/habit.service.ts`, `src/app/shared/habit-form/*`,
  any component that renders a swatch or icon picker. The pickers read the
  arrays; they need no change.

**Context**
The prototype stores raw hex (`#f59e0b`, `#6366f1`) and raw emoji (☕, 🌙, ⏰)
on its stacks. `habit.model.ts` lines 42–45 forbid storing raw values — palette
ids only — so the palette is extended instead of the rule broken (AD-029).
Additive only: `colorOf`/`iconOf` already fall back to entry `[0]` for unknown
ids, so nothing existing is affected. Deliberate side effect: habits gain one
colour and three icons in their pickers.

**Do**
1. Append to `HABIT_COLORS`, after the `orange` entry:
   `{ id: 'indigo', label: 'Indigo', hex: '#6366f1' },`
2. Append to `HABIT_ICONS`, after the `heart` entry, in this order:
   ```ts
   { id: 'coffee', label: 'Coffee', glyph: '☕' },
   { id: 'moon', label: 'Night', glyph: '🌙' },
   { id: 'clock', label: 'Time', glyph: '⏰' },
   ```
3. Append nothing else and reorder nothing. Existing ids must keep their
   positions — `HABIT_COLORS[0]` / `HABIT_ICONS[0]` are the documented defaults.

**Done when**
- `npm run build` succeeds.
- `npm test` — **339 tests pass** (unchanged; this step adds no test).
- `grep -c "id: '" src/app/habit/habit.model.ts` — the colour array has 9
  entries and the icon array has 15. Verify by eye that `slate` is still first
  in `HABIT_COLORS` and `dot` is still first in `HABIT_ICONS`.

**If blocked**
If `npm test` drops below 339, an existing spec asserts a palette length or a
full-array equality. STOP and report which spec — do not edit that spec to
match.

---

## Step 2 — Create the `Stack` model and its runtime guard

**Depends on:** Step 1 — the `clock` icon id and the `sky` colour id used by
`NEW_STACK_DEFAULTS` must exist in the palettes.

**Files**
- CREATE `src/app/stacks/stack.model.ts`
- CREATE `src/app/stacks/stack.model.spec.ts`
- DO NOT TOUCH: `src/app/habit/habit.model.ts` (finished in Step 1),
  `src/app/stacks/stacks.component.*` (Step 8 replaces those wholesale).

**Context**
Mirror `isHabit` in `src/app/habit/habit.model.ts` (~line 221): a guard used for
corrupt-data recovery, so one malformed row is dropped while valid rows survive.
Unlike `Habit`, every `Stack` field is **required** — a stack has no legacy
shape to migrate, so "absent" is corrupt, not defaulted.

**Do**
1. Create `src/app/stacks/stack.model.ts` with exactly this content:

```ts
/**
 * A named routine: an anchor you already do, plus an ordered list of habits
 * chained onto it ("After I pour my morning coffee, I will meditate").
 *
 * `habitIds` are **references** to live habits, never copies — ticking a habit
 * inside a stack ticks the same habit the dashboard ticks. There is no
 * stack-local completion state (Analyst §2.1).
 *
 * `color` and `aglyph` hold **palette ids** (`HABIT_COLORS` / `HABIT_ICONS`),
 * never raw hex or raw emoji, matching the invariant `Habit` already follows
 * (AD-029). Resolve them through `colorOf` / `iconOf`.
 *
 * `time` and `anchor` are free text and are never parsed. `time` is a label,
 * not a schedule: nothing in the app reads it to decide when anything is due.
 */
export interface Stack {
  id: string;
  name: string;
  time: string;
  anchor: string;
  aglyph: string;
  color: string;
  habitIds: string[];
}

/** The fields `StacksService.update` may change. `id` and `habitIds` are excluded
 *  rather than stripped: editing a stack's label must not be able to rewrite its
 *  membership, and making that unrepresentable beats validating it at runtime. */
export type StackPatch = Partial<Pick<Stack, 'name' | 'time' | 'anchor' | 'aglyph' | 'color'>>;

/**
 * `+ New stack` defaults, ported from the prototype's `newStack`. The prototype's
 * raw `#0066cc` has no palette equivalent, so the colour becomes `sky` (#0ea5e9)
 * — no mockup covers a freshly created stack, so nothing regresses (AD-029).
 */
export const NEW_STACK_DEFAULTS = {
  name: 'New stack',
  time: 'anytime',
  anchor: 'I … (choose an anchor)',
  aglyph: 'clock',
  color: 'sky',
} as const;

/**
 * Runtime type guard for corrupt-data recovery, same contract as `isHabit`: a
 * malformed row is dropped and valid stacks survive. Every field is required —
 * a `Stack` has no legacy shape, so a missing field is corruption, not a
 * migration. An *unknown* palette id is not corrupt (`colorOf`/`iconOf` fall
 * back at render time); a non-string one is.
 */
export function isStack(value: unknown): value is Stack {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const s = value as Record<string, unknown>;
  return (
    typeof s['id'] === 'string' &&
    typeof s['name'] === 'string' &&
    typeof s['time'] === 'string' &&
    typeof s['anchor'] === 'string' &&
    typeof s['aglyph'] === 'string' &&
    typeof s['color'] === 'string' &&
    Array.isArray(s['habitIds']) &&
    s['habitIds'].every((id) => typeof id === 'string')
  );
}
```

2. Create `src/app/stacks/stack.model.spec.ts` with **7** specs, all in one
   `describe('isStack')`:
   - accepts a fully populated valid stack;
   - accepts a stack with an empty `habitIds` array;
   - accepts an unknown `color` id (`'chartreuse'`) — unknown is not corrupt;
   - rejects `null` and rejects a non-object (`'nope'`) — one spec, two expects;
   - rejects a stack missing `anchor`;
   - rejects a stack whose `color` is a number;
   - rejects a stack whose `habitIds` contains a non-string.

**Done when**
- `npm run build` succeeds.
- `npm test` — **346 tests pass** (339 + 7).
- `grep -rn "NEW_STACK_DEFAULTS\|isStack" src/` returns hits only in
  `src/app/stacks/stack.model.ts` and `src/app/stacks/stack.model.spec.ts`.

**If blocked**
If `NEW_STACK_DEFAULTS.aglyph` does not resolve — i.e. `iconOf('clock')` returns
the `dot` entry — Step 1 did not land. STOP and report.

---

## Step 3 — `StacksService`: storage and stack-level CRUD

**Depends on:** Step 2 — consumes `Stack`, `StackPatch`, `NEW_STACK_DEFAULTS`
and `isStack`.

**Files**
- CREATE `src/app/stacks/stacks.service.ts`
- CREATE `src/app/stacks/stacks.service.spec.ts`
- DO NOT TOUCH: `src/app/habit/habit.service.ts`. The dependency direction is
  Stacks → Habits and never the reverse; `HabitService` must not learn that
  stacks exist.

**Context**
Copy `HabitService`'s persistence pattern exactly (`src/app/habit/habit.service.ts`):
a `private static readonly STORAGE_KEY`, a `private readonly _stacks =
signal<Stack[]>(this.load())`, a public `readonly stacks = this._stacks.asReadonly()`,
a `private persist()` wrapped in `try/catch` so a full quota never crashes, and a
`private load()` that fails soft (missing key / parse error / non-array → `[]`,
malformed rows filtered out). New ids come from `crypto.randomUUID()`, as in
`HabitService.add` (~line 96).

This step deliberately implements **no** membership operations — those are Step 4
— so `create()` returns a stack with an empty `habitIds`.

**Do**
1. Create `src/app/stacks/stacks.service.ts`:

```ts
import { Injectable, signal } from '@angular/core';
import { Stack, StackPatch, NEW_STACK_DEFAULTS, isStack } from './stack.model';

/**
 * Client-side store for habit stacks, persisted to localStorage alongside
 * habits. Signal-based, mirroring `HabitService`.
 *
 * Holds *references* to habits by id. It never copies habit data and never
 * writes to `HabitService` — the dependency runs one way only (Analyst §3.4).
 */
@Injectable({ providedIn: 'root' })
export class StacksService {
  private static readonly STORAGE_KEY = 'habit_tracker.stacks.v1';

  private readonly _stacks = signal<Stack[]>(this.load());
  readonly stacks = this._stacks.asReadonly();

  /** Append a defaulted stack and return it. The caller opens its chip picker. */
  create(): Stack {
    const stack: Stack = { id: crypto.randomUUID(), ...NEW_STACK_DEFAULTS, habitIds: [] };
    this._stacks.update((list) => [...list, stack]);
    this.persist();
    return stack;
  }

  /** Edit a stack's labels. Membership and identity are not patchable by design. */
  update(id: string, patch: StackPatch): void {
    this._stacks.update((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    this.persist();
  }

  /** Delete a stack. Its habits are untouched and fall back to the unstacked tray. */
  remove(id: string): void {
    this._stacks.update((list) => list.filter((s) => s.id !== id));
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(StacksService.STORAGE_KEY, JSON.stringify(this._stacks()));
    } catch {
      // Same posture as HabitService: no error UI yet.
    }
  }

  private load(): Stack[] {
    try {
      const raw = localStorage.getItem(StacksService.STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isStack);
    } catch {
      return [];
    }
  }
}
```

2. Create `src/app/stacks/stacks.service.spec.ts`. Follow
   `src/app/habit/habit.service.spec.ts` for setup. In `beforeEach`, call
   `localStorage.clear()` **before** `TestBed.configureTestingModule({})`, then
   get the service with `TestBed.inject(StacksService)` — the service reads
   localStorage in its field initialiser, so seeding must happen first.
   Write **8** specs:
   - starts empty when nothing is persisted;
   - `create()` appends a stack with the `NEW_STACK_DEFAULTS` values, a
     non-empty id, and an empty `habitIds`;
   - `create()` twice yields two different ids;
   - `update()` changes only the patched fields and leaves `habitIds` alone;
   - `update()` with an unknown id is a no-op (length and contents unchanged);
   - `remove()` deletes only the named stack;
   - a stack written to `habit_tracker.stacks.v1` is read back on construction
     (seed the key, `TestBed.resetTestingModule()`, then **`TestBed.configureTestingModule({})`
     again** before the next `TestBed.inject` — after a reset the injector is
     gone and `inject` on an unconfigured TestBed throws — then assert);
   - `load()` **drops a malformed row and keeps the valid one** — seed an array
     of `[validStack, { id: 'x' }]` and assert the service holds exactly one
     stack. (Acceptance criterion §5.8.)

**Done when**
- `npm run build` succeeds.
- `npm test` — **354 tests pass** (346 + 8).
- `grep -n "habit_tracker.stacks.v1" src/app/stacks/stacks.service.ts` returns
  exactly one hit.
- `grep -rn "StacksService" src/app/habit/` returns **nothing**.

**If blocked**
If the persisted-read-back spec fails because the service was constructed before
the key was seeded, move `localStorage.setItem` above `TestBed.inject`. Do not
add a public `reload()` method to the service to work around it.

---

## Step 4 — `StacksService`: membership and reordering

**Depends on:** Step 3 — extends the class it creates and its spec file.

**Files**
- MODIFY `src/app/stacks/stacks.service.ts` — anchor: `remove(id: string): void`
- MODIFY `src/app/stacks/stacks.service.spec.ts` — append a new `describe`
- DO NOT TOUCH: `src/app/stacks/stack.model.ts`, `src/app/habit/*`

**Context**
This is the drag-and-drop engine, ported from the prototype's `dragTo`
(Analyst §0 row 7). The single invariant it enforces is **AD-030: a habit
belongs to at most one stack** — the unstacked tray is defined as the complement
of the union of all `habitIds`, which is only well-defined under that rule.

The prototype's `dragTo`, for reference:

```js
const stacks = cloneStacks();
if (d.s >= 0) { const src = stacks[d.s].items, pos = src.indexOf(d.h); if (pos >= 0) src.splice(pos, 1); }
const tgt = stacks[sTo].items;
if (tgt.includes(d.h)) { this.set({ stacks }); return; }   // already there: no-op
let at = iTo; if (at < 0 || at > tgt.length) at = tgt.length;  // clamp
tgt.splice(at, 0, d.h);
```

One correction to that port: the prototype's early `return` after splicing out
of the origin is only a no-op because origin and target are the same stack. Here
the same-stack case must still **reorder**, so implement it as: remove from
wherever it is; if the target already contained it, re-insert at the clamped
index rather than returning early.

**Do**
1. Add these three methods after `remove()`:

```ts
  /** Which stack a habit currently belongs to, or `null` if it is unstacked. */
  stackIdOf(habitId: string): string | null {
    return this._stacks().find((s) => s.habitIds.includes(habitId))?.id ?? null;
  }

  /** Append a habit to a stack, removing it from whichever stack it was in (AD-030). */
  addHabit(stackId: string, habitId: string): void {
    this.moveHabit(habitId, stackId, Number.MAX_SAFE_INTEGER);
  }

  /** Remove a habit from a stack. The habit itself is untouched; it returns to the tray. */
  removeHabit(stackId: string, habitId: string): void {
    this._stacks.update((list) =>
      list.map((s) => (s.id === stackId ? { ...s, habitIds: s.habitIds.filter((id) => id !== habitId) } : s)),
    );
    this.persist();
  }

  /**
   * Move a habit into `toStackId` at `index`, removing it from any stack it was
   * already in — including `toStackId` itself, which is how same-stack
   * reordering works. `index` is clamped to the target's length *after* the
   * removal, so dropping onto the footer button (index 99) appends.
   *
   * A no-op if `toStackId` does not exist, so a stale drop target cannot
   * silently delete the habit from its current stack.
   */
  moveHabit(habitId: string, toStackId: string, index: number): void {
    if (!this._stacks().some((s) => s.id === toStackId)) {
      return;
    }
    this._stacks.update((list) => {
      const stripped = list.map((s) => ({ ...s, habitIds: s.habitIds.filter((id) => id !== habitId) }));
      return stripped.map((s) => {
        if (s.id !== toStackId) {
          return s;
        }
        const at = Math.max(0, Math.min(index, s.habitIds.length));
        const habitIds = [...s.habitIds];
        habitIds.splice(at, 0, habitId);
        return { ...s, habitIds };
      });
    });
    this.persist();
  }
```

2. Append `describe('membership')` to the spec with **9** specs. Build two
   stacks in `beforeEach` via `create()` + `addHabit`, so ids are real:
   - `addHabit` appends to the end of the target stack;
   - `addHabit` on a habit already in another stack **removes it from that
     stack** (assert both stacks, not just the target — acceptance §5.5);
   - `addHabit` on a habit already in *this* stack leaves the stack's length
     unchanged and moves it to the end;
   - `moveHabit` into another stack at index 0 inserts it first there and leaves
     the origin without it;
   - `moveHabit` within the same stack from position 0 to position 2 puts it at
     index 2 and **preserves the other members' relative order** (assert the
     whole array, not just the moved element);
   - `moveHabit` with an index past the end appends (pass 99);
   - `moveHabit` with a negative index inserts at 0;
   - `moveHabit` to an unknown stack id is a complete no-op — assert the habit
     is still in its original stack at its original position;
   - `removeHabit` removes it from the named stack only, and `stackIdOf` then
     returns `null`.

**Done when**
- `npm run build` succeeds.
- `npm test` — **363 tests pass** (354 + 9).
- `grep -c "moveHabit" src/app/stacks/stacks.service.ts` — at least 3 hits
  (`addHabit`'s delegation, the doc comment, the definition).

**If blocked**
If the same-stack reorder spec fails with the habit at the end instead of index
2, the clamp is being computed against the pre-removal length. STOP and report —
the clamp must run on the array the habit has already been spliced out of.

---

## Step 5 — `StacksService`: prune deleted habits, hide archived ones

**Depends on:** Step 4 — extends the same class and spec.

**Files**
- MODIFY `src/app/stacks/stacks.service.ts` — anchors: the import line,
  `private readonly _stacks`, `moveHabit`
- MODIFY `src/app/stacks/stacks.service.spec.ts` — append a new `describe`
- DO NOT TOUCH: `src/app/habit/habit.service.ts` — read from it, never write to it.

**Context**
AD-031, chosen by the user: **delete prunes, archive hides.** A deleted habit's
id is stripped from every stack and persisted immediately; an archived habit's
id **stays** in `habitIds` so reactivating restores its original position, but
its row is not rendered and it does not count toward "N of M done today".

The mechanism is an `effect()` over `habitService.habits()` — the full list,
**not** `activeHabits()`, because archived habits must keep their ids. It reads
its own state through `untracked()` so writing `_stacks` cannot re-trigger the
effect. Both facts were verified against Angular 21.2.18: signal writes inside
`effect()` are allowed by default (`allowSignalWrites` is deprecated with "no
longer required"), and `untracked` is exported from `@angular/core`.

**Effects do not run automatically in Karma.** Call `TestBed.tick()` to flush
them — `TestBed.flushEffects()` is deprecated in this version.

**Do**
1. Change the imports to
   `import { Injectable, signal, computed, effect, untracked, inject } from '@angular/core';`
   and add `import { Habit } from '../habit/habit.model';` plus
   `import { HabitService } from '../habit/habit.service';`.
2. Add `private readonly habitService = inject(HabitService);` above `_stacks`.
3. Add these members after `_stacks` / `stacks`:

```ts
  /**
   * Active habits belonging to no stack, in `activeHabits()` order. The
   * complement of the union of every `habitIds` — well-defined only because a
   * habit belongs to at most one stack (AD-030).
   */
  readonly unstacked = computed<Habit[]>(() => {
    const claimed = new Set(this._stacks().flatMap((s) => s.habitIds));
    return this.habitService.activeHabits().filter((h) => !claimed.has(h.id));
  });

  constructor() {
    // Referential integrity, one direction only (AD-031). A *deleted* habit is
    // pruned from every stack; an *archived* one is not, so reactivating it
    // restores its original position. `habits()` rather than `activeHabits()`
    // is what makes that distinction — archived rows are still in `habits()`.
    // `untracked` keeps the write from re-entering the effect.
    effect(() => {
      const live = new Set(this.habitService.habits().map((h) => h.id));
      const current = untracked(this._stacks);
      let changed = false;
      const pruned = current.map((s) => {
        const kept = s.habitIds.filter((id) => live.has(id));
        if (kept.length === s.habitIds.length) {
          return s;
        }
        changed = true;
        return { ...s, habitIds: kept };
      });
      if (changed) {
        this._stacks.set(pruned);
        this.persist();
      }
    });
  }
```

4. Add the visible-members helper after `stackIdOf`:

```ts
  /**
   * The habits of a stack that should render, in stack order: members that
   * still exist and are not archived. Archived members keep their place in
   * `habitIds` but are hidden here (AD-031).
   */
  visibleHabits(stack: Stack): Habit[] {
    const byId = new Map(this.habitService.activeHabits().map((h) => [h.id, h]));
    return stack.habitIds.map((id) => byId.get(id)).filter((h): h is Habit => h !== undefined);
  }
```

5. Append `describe('referential integrity')` to the spec with **6** specs.
   Inject both services; create real habits via `habitService.add(...)` so the
   ids are real. Call `TestBed.tick()` after every mutation of habits.
   - deleting a habit (`habitService.remove`) strips its id from **every** stack
     that held it (use two stacks holding different habits, delete from one,
     assert the other is untouched);
   - after that delete, the pruned state is persisted — read
     `localStorage.getItem('habit_tracker.stacks.v1')` and assert the id is gone
     from the JSON, not just from the signal;
   - deleting a habit that is in no stack changes nothing and leaves the stacks
     array **identical by reference** (proves the effect does not churn);
   - archiving a habit (`habitService.archive`) leaves `habitIds` unchanged;
   - `visibleHabits()` omits the archived member and keeps the others in stack
     order;
   - reactivating (`habitService.reactivate`) puts it back at its original
     index in `visibleHabits()` — assert against a 3-member stack where the
     archived habit was in the **middle**, so a naive append would fail.
6. Add **2** specs to `describe('membership')` for `unstacked`: it lists active
   habits in no stack, and it excludes an archived habit even when that habit is
   in no stack.

**Done when**
- `npm run build` succeeds.
- `npm test` — **371 tests pass** (363 + 6 + 2).
- `grep -n "activeHabits()\|habits()" src/app/stacks/stacks.service.ts` — the
  `effect` uses `habits()`, `unstacked` and `visibleHabits` use `activeHabits()`.
  If the effect uses `activeHabits()`, archiving will silently delete membership.
- `grep -rn "flushEffects" src/` returns nothing.

**If blocked**
If a spec hangs or Karma reports an infinite loop, the effect is re-triggering
itself: `untracked(this._stacks)` was written as `this._stacks()`. STOP and
report rather than adding a guard flag.

---

## Step 6 — CHECKPOINT (no new code)

**Depends on:** Steps 1–5.

**Files**
- DO NOT TOUCH: anything. This step writes no code.

**Do**
1. `npm run build` — must succeed.
2. `npm test` — must report **371 SUCCESS**.
3. Re-confirm each earlier "Done when" grep:
   - `HABIT_COLORS` has 9 entries, `HABIT_ICONS` has 15, `slate`/`dot` still first;
   - `grep -rn "StacksService" src/app/habit/` returns nothing;
   - the effect in `stacks.service.ts` reads `this.habitService.habits()`, not
     `activeHabits()`;
   - `src/app/stacks/` contains exactly: `stack.model.ts`, `stack.model.spec.ts`,
     `stacks.service.ts`, `stacks.service.spec.ts`, and the three untouched
     `stacks.component.*` stub files.
4. Report the test count and anything that did not match. Change nothing.

**Done when**
- Build green, `371 SUCCESS`, all four greps as described, reported out loud.

**If blocked**
If the count is not 371, say which step's specs are missing rather than adding
tests to reach the number.

---

## Step 7 — Seed demo stacks for the design check

**Depends on:** Step 2 — the persisted shape must match `Stack` exactly, or
`isStack` drops every seeded row and the page renders empty.

**Files**
- MODIFY `scripts/demo-data.mjs` — anchors: `export const STORAGE_KEY`, `DEFS`
- MODIFY `scripts/design-shot.mjs` — anchors: the `import { buildDemoHabits`
  line, `const STATES = {`, `if (args.seed) {`
- MODIFY `scripts/seed-demo.mjs` — anchor: `--json`
- DO NOT TOUCH: anything under `src/`. These scripts are tooling; nothing in
  `src/` imports them.

**Context**
`design:shot --seed` currently seeds habits only. With no stacks the page renders
the zero-stacks empty state and the composite compares against nothing — exactly
the failure `CLAUDE.md` warns about for `--seed` (Analyst §2.4).

The prototype's `items` are indices into its habit array, and `DEFS` in
`demo-data.mjs` is already in that same order — read 0, run 1, meditate 2,
water 3, ship 4, sleep 5. So `[2,1,3]` is meditate/run/water and `[0,5]` is
read/sleep, leaving ship unstacked. Habit ids are `demo-<key>`.

**Do**
1. In `scripts/demo-data.mjs`, next to the existing `STORAGE_KEY`, add:
   ```js
   export const STACKS_STORAGE_KEY = 'habit_tracker.stacks.v1';
   ```
2. Add `buildDemoStacks()` at the end of the file. Ids are fixed strings, not
   `randomUUID` — a seed that changes every run is not reproducible:
   ```js
   /**
    * The prototype's two stacks, reproducing design/target/stacks.png exactly:
    * Morning kickstart holds meditate/run/water; Evening wind-down holds
    * read/sleep; ship is left unstacked.
    *
    * The done label is weekday-dependent and that is correct, not a bug:
    * demo-run is weekdays [1,3,5], so on Tue/Thu/Sat/Sun it is not due and the
    * label reads "2 of 2 done today", while on Mon/Wed/Fri it is due and the
    * label reads "2 of 3". Do not "fix" the denominator to make it read 2 of 2.
    *
    * Palette ids, not raw hex/emoji — see AD-029.
    */
   export function buildDemoStacks() {
     return [
       {
         id: 'demo-stack-morning',
         name: 'Morning kickstart',
         time: '7:00 AM',
         anchor: 'I pour my morning coffee',
         aglyph: 'coffee',
         color: 'amber',
         habitIds: ['demo-meditate', 'demo-run', 'demo-water'],
       },
       {
         id: 'demo-stack-evening',
         name: 'Evening wind-down',
         time: '9:30 PM',
         anchor: 'I close my work laptop',
         aglyph: 'moon',
         color: 'indigo',
         habitIds: ['demo-read', 'demo-sleep'],
       },
     ];
   }
   ```
3. In `scripts/design-shot.mjs`, extend the import to
   `import { buildDemoHabits, buildDemoStacks, STORAGE_KEY, STACKS_STORAGE_KEY } from './demo-data.mjs';`
4. In the `if (args.seed)` block, after the existing habits `addInitScript`, add
   a second one for stacks and a matching `console.log` line
   (`seeded:  2 demo stacks`). Keep them as two separate `addInitScript` calls
   so the habits line is untouched.
5. Add a `stacks` entry to `STATES`, exactly:
   ```js
   stacks: ['stack-item-done', 'stack-item-todo', 'stack-item-not-due', 'stack-streak', 'unstacked-chip'],
   ```
6. In `scripts/seed-demo.mjs`, print the stacks alongside the habits: extend the
   one-liner to set both keys, and have `--json` print
   `{ habits, stacks }`. Update the trailing "To clear it again" line to remove
   both keys.

**Done when**
- `node scripts/seed-demo.mjs --json` prints an object with `habits` (6 entries)
  and `stacks` (2 entries), and exits 0.
- `node -e "import('./scripts/demo-data.mjs').then(m => { const s = m.buildDemoStacks(); const h = new Set(m.buildDemoHabits(new Date()).map(x => x.id)); const missing = s.flatMap(k => k.habitIds).filter(id => !h.has(id)); console.log(missing.length === 0 ? 'ids ok' : 'MISSING: ' + missing); })"`
  prints `ids ok`. **This is the check that matters** — a typo'd habit id
  produces an empty-looking stack and no error.
- `npm test` — still **371 tests pass** (nothing under `src/` changed).
- `grep -n "stacks:" scripts/design-shot.mjs` shows both the `ROUTES` entry and
  the new `STATES` entry.

**If blocked**
If the id check prints `MISSING`, the `demo-<key>` keys in `DEFS` differ from
what is written above. Read `DEFS` and use its actual keys — do not rename the
habits to match this step.

---

## Step 8 — Render the stacks page: cards, anchor, connectors, item rows

**Depends on:** Step 5 — consumes `StacksService.stacks`, `visibleHabits()` and
`unstacked`.

**Files**
- MODIFY `src/app/stacks/stacks.component.ts` — replace the class body wholesale
- MODIFY `src/app/stacks/stacks.component.html` — replace wholesale
- MODIFY `src/app/stacks/stacks.component.scss` — replace wholesale
- DO NOT TOUCH: `src/app/app.routes.ts` (`/stacks` is already registered via
  `loadComponent`), `src/app/stacks/stacks.service.ts`, any other component.

**Context**
Follow `src/app/analytics/analytics.component.ts` for shape: `inject()` for
services, a `private readonly today = new Date()` pinned once so every
derivation on the page agrees about today, and `computed()` chains for
everything the template reads. Resolve colours and glyphs through `colorOf` /
`iconOf` / `hexAlpha` from `../habit/habit.model` — never hardcode a hex for a
stack or a habit.

This step renders a **read-only** page. No clicks, no drag, no editor — those
are Steps 9, 11 and 13. It must still end green and look right against the
mockup for everything it does render.

All values come from "Reference values" at the top of this file.

**Do**
1. Rewrite `stacks.component.ts`. Build one view-model per stack in a
   `computed()` so the template stays declarative:
   ```ts
   readonly cards = computed(() => this.stacksSvc.stacks().map((stack) => {
     const hex = colorOf(stack.color).hex;
     const members = this.stacksSvc.visibleHabits(stack);
     const due = members.filter((h) => this.habitSvc.isDueOn(h, this.todayIso));
     const doneCount = due.filter((h) => this.habitSvc.isDoneToday(h)).length;
     return {
       stack, hex,
       tint: hexAlpha(hex, 0.09),
       aglyph: iconOf(stack.aglyph).glyph,
       doneLabel: `${doneCount} of ${due.length} done today`,
       items: members.map((habit) => ({
         habit,
         glyph: iconOf(habit.icon).glyph,
         hex: colorOf(habit.color).hex,
         done: this.habitSvc.isDoneToday(habit),
         dueToday: this.habitSvc.isDueOn(habit, this.todayIso),
         streak: this.habitSvc.currentStreak(habit, this.today),
       })),
     };
   }));
   ```
   The **denominator is members due today**, not all members (Analyst §0 row 4).
   `todayIso` comes from `HabitService.todayIso(this.today)`.
2. Rewrite `stacks.component.html`:
   - `.page-container` > `h1` "Habit Stacks" + `p.subtitle` with the verbatim
     subtitle text from Reference values + the `+ New stack` button (inert this
     step: render it, wire it in Step 12).
   - `.cards` row, one `.stack-card` per entry, with
     `[style.border-top-color]="card.hex"`.
   - Card header: `.stack-name`, `.time-pill`, `<span class="spacer"></span>`,
     `.done-pill` showing `card.doneLabel`.
   - `.anchor-box` with `[style.border-color]="card.hex"` and
     `[style.background]="card.tint"`; inside it `.anchor-glyph`, then a column
     holding `.anchor-label` and `.anchor-text`. The label's literal text is
     **`Anchor · After`** in title case with `[style.color]="card.hex"`; the SCSS
     applies `text-transform: uppercase`. Do not type it pre-uppercased — that
     makes the `text-transform` rule dead code no assertion can catch.
   - `@for` over `card.items`; **before every item, including the first**, emit
     the `.then` connector (`<i></i><span>then</span><i></i>`).
   - Item row: `.handle` (`⠿`), the check circle, the habit glyph, the habit
     name as `<a [routerLink]="['/habits', item.habit.id]" draggable="false">`,
     the NOT-TODAY chip, the streak. The check circle and the ✕ have no click
     handler this step — but the circle's **cursor is conditional from the
     start**: `[style.cursor]="item.dueToday ? 'pointer' : 'not-allowed'"`. The
     row is visually complete after this step; Step 9 only adds behaviour.

     `draggable="false"` is not optional. An `<a href>` is implicitly draggable
     in HTML5, so without it the anchor hijacks `dragstart` from the row Step 11
     makes draggable, and dragging by the habit name — the biggest target in the
     row — silently does nothing while the handle works (CriticReview R1-1).
   - Class hooks the design check needs (Step 7 declared them):
     `stack-item-done` when `item.done`, `stack-item-todo` when not,
     `stack-item-not-due` when `!item.dueToday`, `stack-streak` on the streak
     span, `unstacked-chip` on each tray chip.
   - `.unstacked` tray listing `stacksSvc.unstacked()` as chips. Two distinct
     texts, per Reference values — do not collapse them into one:
     the italic `all habits are stacked`, rendered **only** when the tray has no
     chips; and the permanent, non-italic hint
     `drag a chip onto a stack, or use “+ Add habit”`, rendered always.
   - Import `RouterLink` in the component's `imports`.
3. Rewrite `stacks.component.scss` from Reference values. **`max-width: 1000px`**
   — the stub's 900px is wrong (Analyst §0 row 8). Colours that belong to a
   stack or habit are bound inline from the view-model; only the fixed greys and
   the `#0066cc` accent live in SCSS.

**Done when**
- `npm run build` succeeds.
- `npm test` — still **371 tests pass**. (The stub had no spec; this step adds
  none. Component specs land in Step 9.)
- `grep -n "max-width" src/app/stacks/stacks.component.scss` shows `1000px` and
  no `900px` anywhere in the file.
- `grep -c "stack-item-done\|stack-item-todo\|stack-item-not-due\|stack-streak\|unstacked-chip" src/app/stacks/stacks.component.html`
  — all five class names present.
- `grep -n 'draggable="false"' src/app/stacks/stacks.component.html` — matches
  the habit-name anchor.
- Manual: **check today's weekday first** (`date +%A`), because one expectation
  below depends on it. With the dev server running and the demo data seeded
  (`node scripts/seed-demo.mjs`, paste into DevTools), `/stacks` shows two
  cards side by side, an amber and an indigo top border, `THEN` above every
  item including the first, one "Ship side project" chip in the Unstacked tray,
  and on Morning kickstart a done label reading:
  - `2 of 2 done today` on Tue/Thu/Sat/Sun — `demo-run` is not due, so it is
    excluded from the denominator and shows the NOT-TODAY chip;
  - `2 of 3 done today` on Mon/Wed/Fri — `demo-run` **is** due and correctly
    counts. No NOT-TODAY chip renders anywhere on the page that day.

**If blocked**
If the done label reads "2 of 3" on a Tue/Thu/Sat/Sun, the denominator is
counting all members instead of members due today. On Mon/Wed/Fri "2 of 3" is
the correct answer — do not change the denominator to force "2 of 2". If the
cards stack vertically instead of side by side, the row is missing
`flex-wrap: wrap` at 452px + 20px gap inside 1000px.
Fix either; if a third thing is wrong, STOP and report.

---

## Step 9 — Wire the page's non-drag interactions

**Depends on:** Step 8 — extends the component it rewrites.

**Files**
- MODIFY `src/app/stacks/stacks.component.ts` — anchor: `readonly cards = computed(`
- MODIFY `src/app/stacks/stacks.component.html` — anchors: the check circle,
  the `✕`, the add footer
- MODIFY `src/app/stacks/stacks.component.scss` — anchor: the end of the file
- CREATE `src/app/stacks/stacks.component.spec.ts`
- DO NOT TOUCH: `src/app/stacks/stacks.service.ts` (finished in Step 5),
  `src/app/habit/habit.service.ts`

**Context**
Ports the prototype's `addingNow` / `addChips` / `noneLeft` picker. `adding` is
transient UI state (which stack's picker is open), so it is a plain
`signal<string | null>(null)` on the component and is never persisted.

The check circle calls `HabitService.toggleToday(id)` — the same method the
dashboard and habits page use — but **only when the habit is due today**;
otherwise it is `cursor: not-allowed` and does nothing.

**Do**
1. Add `readonly adding = signal<string | null>(null);` and these methods:
   - `toggle(item)` — `if (!item.dueToday) return;` then
     `this.habitSvc.toggleToday(item.habit.id)`.
   - `removeFromStack(stackId, habitId)` — delegates to
     `stacksSvc.removeHabit`.
   - `toggleAdding(stackId)` — sets `adding` to `stackId`, or `null` if it is
     already that stack.
   - `pick(stackId, habitId)` — `stacksSvc.addHabit(...)` then
     `this.adding.set(null)`.
2. In the template, wire `(click)` on the check circle, the `✕`, the add footer
   button, and each add chip. Render the picker row only when
   `adding() === card.stack.id`; its chips are `stacksSvc.unstacked()`, and when
   that is empty show the italic "every habit is already in a stack".
   The picker row sits **above** the `+ Add habit to this stack` footer button,
   between the item list and the button — not below it.
3. Add the picker and chip styling from Reference values: the row itself is
   `display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:12px`,
   opening with the `Add:` label at 11px/600 #8a8f96.
4. Create `src/app/stacks/stacks.component.spec.ts`. Use a real `TestBed` with
   both real services and seed localStorage before `TestBed.inject` (same
   pattern as the service spec). Write **7** specs:
   - renders one card per persisted stack;
   - the done label counts **only members due today** — seed a 3-member stack
     where one member is not due, assert the text is `"N of 2 done today"`
     (acceptance §5.5);
   - the unstacked tray lists exactly the habits in no stack;
   - clicking a due habit's check circle calls through and flips `isDoneToday`;
   - clicking a **not-due** habit's check circle does nothing (assert
     `completedDates` is unchanged);
   - clicking `✕` removes that habit from the stack and it appears in the tray;
   - the add picker opens on the footer button, and clicking a chip adds that
     habit to the stack and closes the picker.

**Done when**
- `npm run build` succeeds.
- `npm test` — **378 tests pass** (371 + 7).
- `grep -n "toggleToday" src/app/stacks/stacks.component.ts` — exactly one hit,
  guarded by a `dueToday` check on the line above or in the same method.
- Manual: on `/stacks`, `+ Add habit to this stack` opens a chip row containing
  "Ship side project"; clicking it moves the chip out of the tray and into the
  card.

**If blocked**
If clicking a not-due habit still toggles it, the guard is in the template
(`[disabled]`) on a non-button element, where it does nothing. Put the guard in
the component method.

---

## Step 10 — CHECKPOINT (no new code)

**Depends on:** Steps 7–9.

**Files**
- DO NOT TOUCH: anything.

**Do**
1. `npm run build` — must succeed.
2. `npm test` — must report **378 SUCCESS**.
3. Re-run the Step 7 id check (`node -e ...` → `ids ok`).
4. With the dev server running, `npm run design:shot -- stacks --width 1440 --seed`.
   Do **not** fix anything yet — Step 16 is the design round. Record two things:
   the `seeded:` lines (must mention both habits and stacks) and the `states:`
   line (which of the five declared states rendered).
5. Report the test count, the `states:` line verbatim, and anything unexpected.

**Done when**
- Build green, `378 SUCCESS`, `ids ok`, and the `states:` line reported verbatim.

**If blocked**
If `design:shot` reports `states: none declared for "stacks"`, Step 7's `STATES`
entry did not land. If the page screenshots empty, the seeded stacks are being
dropped by `isStack` — compare the seed object's keys against `Stack`.

---

## Step 11 — Native HTML5 drag and drop

**Depends on:** Step 9 — extends the component and its spec.

**Files**
- MODIFY `src/app/stacks/stacks.component.ts` — anchor: `readonly adding = signal`
- MODIFY `src/app/stacks/stacks.component.html` — anchors: the item row, the
  add footer, the unstacked chip
- MODIFY `src/app/stacks/stacks.component.scss` — anchor: `.handle`
- MODIFY `src/app/stacks/stacks.component.spec.ts` — append a new `describe`
- DO NOT TOUCH: `src/app/stacks/stacks.service.ts` — `moveHabit` already does
  all of the work; this step only wires events to it.

**Context**
AD-028: **native HTML5 DnD, not Angular CDK.** `@angular/cdk` is not a
dependency and is not being added. The drag payload is transient component
state, not a signal and not persisted:

```ts
private drag: { from: string | null; habitId: string } | null = null;
```

`from === null` means the drag started in the Unstacked tray. All the reordering
logic already lives in `StacksService.moveHabit`, which strips the habit from
wherever it was — so the handlers do not need to know the origin at all beyond
recording it for clarity.

Accepted cost, recorded as **B-003**: no keyboard reorder path, and HTML5 DnD
does not fire on touch. The chip picker from Step 9 is the non-drag way to add a
habit to a stack, so the page is usable without dragging; reordering is not.

**Do**
1. Add the three handlers:
   ```ts
   onDragStart(habitId: string, from: string | null): void {
     this.drag = { from, habitId };
   }

   /** Required — without preventDefault the drop event never fires. */
   onDragOver(event: DragEvent): void {
     event.preventDefault();
   }

   onDrop(event: DragEvent, toStackId: string, index: number): void {
     event.preventDefault();
     event.stopPropagation();
     const drag = this.drag;
     this.drag = null;
     if (!drag) {
       return;
     }
     this.stacksSvc.moveHabit(drag.habitId, toStackId, index);
   }
   ```
2. In the template:
   - item row: `draggable="true"` — on the **row**, matching the prototype, not
     on the `⠿` handle. The handle is a `cursor: grab` affordance only; moving
     `draggable` onto it looks tidier and breaks dragging from the rest of the
     row. The row's habit-name anchor already carries `draggable="false"` from
     Step 8, without which it would steal every `dragstart` (CriticReview R1-1);
   - item row also: `(dragstart)="onDragStart(item.habit.id, card.stack.id)"`,
     `(dragover)="onDragOver($event)"`, `(drop)="onDrop($event, card.stack.id, $index)"`;
   - add footer button: `(dragover)="onDragOver($event)"` and
     `(drop)="onDrop($event, card.stack.id, 99)"` — dropping onto it appends,
     because `moveHabit` clamps the index (prototype `dropEnd`);
   - unstacked chip: `draggable="true"`,
     `(dragstart)="onDragStart(habit.id, null)"`.
   The tray is **not** a drop target — the prototype has no "drag back out"
   gesture, and `✕` already does that job.
3. `.handle` and the unstacked chip get `cursor: grab`.
4. Append `describe('drag and drop')` with **4** specs. Dispatch real
   `DragEvent`s (`new DragEvent('dragstart')` etc.) on the queried elements, or
   call the handlers directly if constructing `DragEvent` is unreliable in
   headless Chrome — either is acceptable, but assert through the rendered DOM
   afterwards:
   - dragging an item from stack A and dropping it on stack B's first item
     leaves A and appears in B at index 0 (acceptance §5.5);
   - dropping a habit onto a stack it is already in at its own index leaves the
     stack's order unchanged (the no-op case);
   - dropping on the add footer appends to the end;
   - dragging a chip from the Unstacked tray onto a stack adds it there and
     removes it from the tray.

**Done when**
- `npm run build` succeeds.
- `npm test` — **382 tests pass** (378 + 4).
- `grep -rn "@angular/cdk" src/ package.json` returns **nothing**.
- `grep -n "preventDefault" src/app/stacks/stacks.component.ts` — at least two
  hits (`onDragOver` and `onDrop`).
- `grep -n 'draggable="false"' src/app/stacks/stacks.component.html` — still
  matches the habit-name anchor (Step 8 added it; this step must not lose it).
- Manual: drag an item between the two seeded cards **by the habit name, not
  just the ⠿ handle** — both must work. It moves and survives a page reload.

**If blocked**
If drops never fire, `onDragOver` is missing its `preventDefault()` on the drop
target — that is the usual cause, not the handler binding. If it still fails
after fixing that, STOP and report; do not add Angular CDK.

---

## Step 12 — Empty state and `+ New stack`

**Depends on:** Step 11 — extends the same component.

**Files**
- MODIFY `src/app/stacks/stacks.component.ts` — anchor: `readonly adding = signal`
- MODIFY `src/app/stacks/stacks.component.html` — anchors: `.cards`, the
  `+ New stack` button
- MODIFY `src/app/stacks/stacks.component.scss` — anchor: end of file
- MODIFY `src/app/stacks/stacks.component.spec.ts` — append a new `describe`
- DO NOT TOUCH: `src/app/stacks/stack.model.ts` — `NEW_STACK_DEFAULTS` is
  already correct.

**Context**
The prototype ships with two stacks and has **no empty state**; a real first run
has none, so this surface is **invented, not transcribed** (Analyst §3.6) — keep
it minimal and reuse styling that already exists on the page rather than
introducing anything new.

`newStack` in the prototype appends the defaulted stack *and immediately opens
its chip picker* (`adding: this.state.stacks.length`). Preserve that: a new
stack with no habits and no open picker looks broken.

**Do**
1. Add:
   ```ts
   newStack(): void {
     const created = this.stacksSvc.create();
     this.adding.set(created.id);
   }
   ```
   `create()` returns the `Stack` — do not re-read the list to find it.
2. Wire `(click)="newStack()"` on the `+ New stack` button from Step 8.
3. When `stacksSvc.stacks()` is empty, render `.stacks-empty` **instead of**
   `.cards`: one full-width dashed card reusing the add-footer styling
   (`1.5px dashed #c9cdd2`, radius 8px, `#75797f`, background `#fff`),
   containing one explanatory line —
   `Stack habits onto something you already do: "After I pour my morning coffee, I will meditate."`
   — and a `+ New stack` button styled like the header one. Do **not** give it
   the `empty-state` class: `design-shot.mjs` deliberately excludes that from
   `STATES`, and reusing the name would be misleading.
4. Hide the `.unstacked` tray as well when `stacksSvc.stacks()` is empty. The
   tray is a **sibling** of `.cards`, so without this it survives the swap and
   the first run shows an invitation to create a stack directly above every
   habit the user owns, under a permanent hint reading "drag a chip onto a
   stack" — when there is no stack to drag onto (CriticReview R2-1). The tray
   describes a *remainder*; with no stacks there is no remainder.
5. Append `describe('empty state and creation')` with **3** specs — note the
   tray assertion folds into the first spec rather than adding a fourth, so the
   downstream counts in Steps 13–15 are unchanged:
   - with no persisted stacks, `.stacks-empty` renders and **neither**
     `.stack-card` **nor** `.unstacked` does;
   - `+ New stack` from the empty state creates one card named "New stack" with
     its picker open, and `.stacks-empty` is gone;
   - `+ New stack` from the header appends a card without disturbing the
     existing ones (assert the existing cards' names are unchanged and in order).

**Done when**
- `npm run build` succeeds.
- `npm test` — **385 tests pass** (382 + 3).
- `grep -c "empty-state" src/app/stacks/stacks.component.html` returns 0.
- Manual: `localStorage.removeItem('habit_tracker.stacks.v1'); location.reload()`
  on `/stacks` shows the empty card **and no Unstacked tray**; clicking
  `+ New stack` produces a usable stack with its picker already open, and the
  tray reappears with the remaining habits (acceptance §5.6).

**If blocked**
If the new stack renders with a `•` glyph instead of `⏰`, `iconOf('clock')` is
falling back — Step 1's icon additions did not land. STOP and report.

---

## Step 13 — Inline stack editor and delete

**Depends on:** Step 12 — extends the same component; consumes
`StacksService.update` / `remove` from Step 3 and `StackPatch` from Step 2.

**Files**
- CREATE `src/app/stacks/stack-form/stack-form.component.ts`
- CREATE `src/app/stacks/stack-form/stack-form.component.html`
- CREATE `src/app/stacks/stack-form/stack-form.component.scss`
- CREATE `src/app/stacks/stack-form/stack-form.component.spec.ts`
- MODIFY `src/app/stacks/stacks.component.ts` — anchor: `readonly adding = signal`
- MODIFY `src/app/stacks/stacks.component.html` — anchor: the card header
- MODIFY `src/app/stacks/stacks.component.spec.ts` — append a new `describe`
- DO NOT TOUCH: `src/app/shared/habit-form/*` — imitate it, do not modify or
  generalise it. A shared form abstraction is not in scope.

**Context**
AD-032: **inline, not modal.** `src/app/shared/habit-form/habit-form.component.ts`
is the house pattern — `input<T | null>(null)`, `output<Patch>()` named `save`,
`output<void>()` named `cancel`, rendered inline where the thing lives (see its
use at `habit-list.component.html:80`). The codebase has no modal primitive and
the design has no mockup for one; do not invent either.

The editor lives in `src/app/stacks/stack-form/` rather than `src/app/shared/`
because exactly one page uses it.

**Do**
1. Create `StackFormComponent`, standalone, `selector: 'app-stack-form'`:
   ```ts
   readonly stack = input<Stack | null>(null);
   readonly save = output<StackPatch>();
   readonly cancel = output<void>();
   ```
   Fields: name (text), time (text), anchor (text), aglyph (a picker over
   `HABIT_ICONS`, showing `glyph` with `label` as the accessible name), colour
   (a picker over `HABIT_COLORS`, showing `hex` swatches with `label` as the
   accessible name). Emit `save` with **all five patchable fields every time**,
   changed or not; emit `cancel` on the cancel button. Reject a
   blank/whitespace-only `name` by not emitting — `Stack.name` is required.

   Do not diff against the `stack` input to send only what changed: `update()`
   spreads the patch over the existing stack, so the result is identical, and
   diffing adds real logic with a real failure mode — a field edited and then
   reverted mid-edit drops out of the patch (CriticReview R2-2). `StackPatch`
   stays `Partial<...>` because `update()` serves future single-field callers;
   this form is not one of them.

   The colour swatch picker shows its own selection while editing. The card's
   3px top border updates on **save**, not live — live preview would mean
   pushing form state back into the parent's view-model for a value the user is
   already looking at in the picker.
2. Create its spec with **4** specs: prefills from the `stack` input; `save`
   emits the edited values; `cancel` emits without saving; a whitespace-only
   name does not emit `save`.
3. In `stacks.component.ts` add `readonly editing = signal<string | null>(null);`
   plus `startEdit(id)`, `cancelEdit()`,
   `saveEdit(id, patch)` (calls `stacksSvc.update` then clears `editing`), and
   `deleteStack(id)` (calls `stacksSvc.remove`; also clears `editing` and
   `adding` if they pointed at it).
4. In the card header add two small icon buttons after the done pill: edit
   (`✎`) and delete (`🗑`), 13px `#c4c8cd`, hover `#0066cc` and `#c92a2a`. When
   `editing() === card.stack.id`, render `<app-stack-form>` in place of the
   anchor box and item list. **Do not use `confirm()`** — a native dialog blocks
   the page; delete is immediate, consistent with the rest of the app
   (Analyst §4, "Undo").
5. Append `describe('editing and deleting')` to the component spec with **3**
   specs: the edit button opens the form and hides the item list; saving a new
   name updates the card header and persists; deleting a stack removes the card
   and its habits reappear in the Unstacked tray.

**Done when**
- `npm run build` succeeds.
- `npm test` — **392 tests pass** (385 + 4 + 3).
- `grep -rn "confirm(" src/app/stacks/` returns nothing.
- `git status --short src/app/shared/` shows **no** modified files.
- Manual: rename a seeded stack, reload, the new name persists.

**If blocked**
If the editor renders but the pickers are empty, `HABIT_ICONS`/`HABIT_COLORS`
were imported from the wrong path — they live in `../../habit/habit.model` from
inside `stack-form/`. If two attempts at the picker markup fail, STOP and
report.

---

## Step 14 — CHECKPOINT (no new code)

**Depends on:** Steps 11–13.

**Files**
- DO NOT TOUCH: anything.

**Do**
1. `npm run build` — must succeed.
2. `npm test` — must report **392 SUCCESS**.
3. Re-confirm: `grep -rn "@angular/cdk" src/ package.json` returns nothing;
   `grep -rn "confirm(" src/app/stacks/` returns nothing;
   `git status --short src/app/shared/ src/app/habit/habit.service.ts` shows no
   modified files.
4. Walk `Analyst.md` §5 criteria 5, 6, 7 and 8 by hand and say which are met.
   Criteria 2, 3 and 4 are Steps 15–16 — do not attempt them here.
5. Report the count and any criterion not met. Change nothing.

**Done when**
- Build green, `392 SUCCESS`, three greps clean, and criteria 5–8 reported on
  individually.

**If blocked**
If a criterion in 5–8 is not met, name it and which step should have delivered
it. Do not fix it inside this step.

---

## Step 15 — `stacks.design.spec.ts`

**Depends on:** Step 13 — the page is feature-complete, so the computed styles
it asserts are final.

**Files**
- CREATE `src/app/stacks/stacks.design.spec.ts`
- DO NOT TOUCH: `src/app/stacks/stacks.component.scss`. If an assertion fails,
  that is a finding for Step 16 — **do not** edit the SCSS from inside this step
  and do not soften the expectation to match it.

**Context**
Follow `src/app/calendar/calendar.design.spec.ts` exactly — it is the worked
example. Two rules from `CLAUDE.md` that this file exists to satisfy:

- Expected values are transcribed from the **prototype source** (the "Reference
  values" block at the top of this file), **never** copied out of
  `stacks.component.scss`. Copying the SCSS makes the spec a change-detector
  that agrees with whatever the component happens to say (L-025).
- Assert via `getComputedStyle`, not by reading stylesheet text — that is what
  catches a rule that is correct but loses on specificity.

This file covers what a screenshot cannot: exact pixel values, and the states
the seeded shot does not render.

**Do**
1. Seed a fixture store covering **all five** declared states in one render: a
   stack with a done member, a todo member, and a not-due member; a member with
   a zero streak; and at least one unstacked habit.
2. Assert, with `getComputedStyle`, at minimum:
   - `.page-container` `max-width` is `1000px`;
   - the card is `452px` wide with `border-top-width: 3px` and a `border-top-color`
     equal to the stack's palette hex in `rgb()` form;
   - the anchor box has a `1.5px` dashed border in the stack's hex and a
     background equal to `hexAlpha(hex, .09)`;
   - a **done** check circle's `background-color` and `border-color` both equal
     the habit's own hex — not a shared green;
   - a **todo** check circle's `border-color` is `rgb(201, 205, 210)` (`#c9cdd2`);
   - a **not-due** row's check circle has `cursor: not-allowed`, and a due row's
     is `pointer`;
   - the NOT-TODAY chip has `padding: 3px 7px` and background `#f4f4f2` on a
     not-due row, and `padding: 0` with a transparent background on a due row;
   - the streak span is `#e8590c`, `700`, and **renders at 0** — assert its text
     is `0 🔥`, not that it is absent;
   - the THEN connector renders before the **first** item (assert the first
     child of the item list is a connector, not a row).
3. Convert every expected hex to the `rgb(r, g, b)` string Chrome returns;
   `getComputedStyle` never returns hex.

**Done when**
- `npm run build` succeeds.
- `npm test` — **passes**, with at least **10** new specs (expect ~402; report
  the actual number).
- `grep -c "#" src/app/stacks/stacks.design.spec.ts` — hex literals appear only
  in comments naming the source value; the assertions use `rgb(...)`.

**If blocked**
If an assertion fails, that is a real finding — record it and carry it into
Step 16. Do not change the assertion. If more than three fail, STOP and report
the list rather than working through them here.

---

## Step 16 — Design comparison round

**Depends on:** Step 15 — carries in any failing assertion as a known finding.

**Files**
- MODIFY `src/app/stacks/stacks.component.scss` — the expected place for fixes
- MODIFY `src/app/stacks/stacks.component.html` — only if a fix is structural
- DO NOT TOUCH: `src/app/stacks/stacks.design.spec.ts` — the spec is the
  reference; the component moves to meet it, never the reverse.

**Context**
`npm run design:shot -- stacks --width 1440 --seed` needs the dev server already
running (`npm start`). `--width 1440` must match the mockup or breakpoint
differences read as design bugs. Read **only** `design/compare/stacks.png` — the
composite — not the two source images.

**Do**
1. Run `date +%A` and **write the weekday into the step's report**. Two of the
   checks below depend on it, and the demo data is not weekday-stable:
   `demo-run` is `weekdays [1,3,5]` and is the only non-daily demo habit.
2. Start the dev server if it is not running.
3. `npm run design:shot -- stacks --width 1440 --seed`.
4. Read `design/compare/stacks.png`. Compare against
   `design/target/stacks.png` on: card width and gap, the amber and indigo top
   borders, the anchor tint and dashed border, the THEN connectors, one
   "Ship side project" chip in the tray, and:
   - **Tue/Thu/Sat/Sun** — the NOT-TODAY chip renders on Morning run, and
     Morning kickstart reads `2 of 2 done today`.
   - **Mon/Wed/Fri** — run is due, so there is **no** NOT-TODAY chip anywhere on
     the page and Morning kickstart reads `2 of 3 done today`. Both are correct.
     Do not edit the component to reproduce the mockup's Tuesday.
   - every item row renders a streak chip, **including at least one showing 0**
     (`0 🔥` is rendered, not hidden). Do not assert a specific number: the demo
     streaks come from pseudo-random history (`p: 0.56` for sleep) and the
     values are plausible, not guaranteed.
5. Fix differences in the SCSS, re-shoot, repeat. **Two rounds maximum** — if it
   is still wrong after two, STOP and report what differs.
6. Check the `states:` line. On Tue/Thu/Sat/Sun all five declared states must be
   listed as rendered. **On Mon/Wed/Fri, `stack-item-not-due` will correctly
   appear under `NOT RENDERED`** — no demo habit is off-schedule that day. That
   is the expected result, not a failure: report it, and name the
   `stacks.design.spec.ts` not-due assertions (the `cursor: not-allowed` and
   NOT-TODAY-chip specs, which build their own fixture) as the coverage. Any
   *other* state under `NOT RENDERED` is a real gap — say so explicitly and name
   which `stacks.design.spec.ts` assertion covers it instead. Do not silently
   accept a gap.
7. Re-run `npm test` after every SCSS change — a fix can break a design-spec
   assertion.

**Done when**
- The weekday is recorded in the report.
- `design/compare/stacks.png` matches the target on every point in step 4, or
  the remaining differences are listed explicitly with a reason.
- The `states:` line reports **5 of 5** on Tue/Thu/Sat/Sun, or **4 of 5 with
  `stack-item-not-due` the only omission** on Mon/Wed/Fri. Any other uncovered
  state is named alongside the assertion that covers it (acceptance §5.3).
- `npm test` — green, same count as Step 15.

**If blocked**
If the composite is skipped with "no target at design/target/stacks.png", the
mockup was never captured. STOP and report — do not proceed by eye.

---

## Step 17 — Regression, docs, and wrap-up

**Depends on:** Steps 1–16.

**Files**
- MODIFY `specs/STATE.md` — AD/B/L entries
- MODIFY `specs/LESSONS.md` — the body of every `L-NNN` added
- MODIFY `specs/stacks/Analyst.md` — §6 retrospective
- MODIFY `specs/design-implementation-roadmap.md` — mark §5 built
- MODIFY `CLAUDE.md` — only if the palette additions or the stacks store change
  what a newcomer needs to know
- DO NOT TOUCH: the root `STATE.md` beyond removing the `## Executing:` marker.

**Context**
This is the end-of-feature ritual from `CLAUDE.md`, in its required order:
(1) docs, (2) `AD`/`B`/`L` into `specs/STATE.md` with lesson **bodies** in
`specs/LESSONS.md`, (3) summarize the spec folder down, (4) archive.

The pre-push hook enforces 2–4 and will reject a push where an `L-NNN` headline
has no body or vice versa, or where a newly archived file exceeds 20 KB.

**Do**
1. `npm run build` and `npm test` — both green. Report the final count.
2. Walk **all eight** acceptance criteria in `Analyst.md` §5 and state, one by
   one, whether each is met and how it was verified.
3. Write into `specs/STATE.md`: **AD-028** (native HTML5 DnD, not CDK),
   **AD-029** (stack colour/glyph are palette ids; palette gains indigo, coffee,
   moon, clock), **AD-030** (a habit belongs to at most one stack),
   **AD-031** (delete prunes, archive hides), **AD-032** (inline stack editor,
   not modal), and **B-003** (no keyboard or touch reordering). Append only —
   never renumber.
4. Write the lesson headlines the feature actually produced, starting at
   **L-031**, into `specs/STATE.md`, with each body in `specs/LESSONS.md`.
   Write only lessons that were genuinely learned during the run — if a step's
   plan turned out wrong, that is the lesson. Do not invent one per decision.
5. Fill in `Analyst.md` §6: did the Analyst catch anything not thought about up
   front, and did anything in `tasks.md` turn out wrong during coding.
6. Update `specs/design-implementation-roadmap.md` §5 to record that it is
   built, in the same style §4 uses.
7. Summarize `specs/stacks/` down: keep the final `Analyst.md`, the decisions,
   and what changed from the plan. Delete drafts and long back-and-forth notes.
   Then move the folder to `specs/archive/2026-08-20-stacks/`.
8. Remove the `## Executing: stacks` line from the **root** `STATE.md`.
9. **Do not commit. Do not push.** Report what changed and ask the user for
   permission, naming the files. The archive move and the `specs/STATE.md`
   change must go in the **same** commit when permission is given.

**Done when**
- `npm test` green, final count reported.
- All eight acceptance criteria walked individually with a verdict each.
- `grep -c "L-0" specs/STATE.md` and `grep -c "L-0" specs/LESSONS.md` — every
  headline has a body and vice versa (the hook's third gate).
- `ls specs/archive/2026-08-20-stacks/` shows the summarized folder, and
  `find specs/archive/2026-08-20-stacks -size +20k` returns nothing.
- `grep -n "Executing" STATE.md` returns nothing.
- The final message asks for commit permission and does **not** commit.

**If blocked**
If any acceptance criterion is unmet, report it plainly as unmet with the reason.
Do not soften the criterion, and do not archive the spec until the user has seen
the list.
