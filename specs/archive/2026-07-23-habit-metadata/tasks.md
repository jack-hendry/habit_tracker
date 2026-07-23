# tasks — habit-metadata (Phase 4, slice 4a)

Written after `Analyst.md` and hardened by `CriticReview.md`. Each step is
verifiable on its own. Run `npm test` after every step that touches logic.

**Baseline before starting:** **60** tests passing, measured with
`npx ng test --watch=false --browsers=ChromeHeadless`. (STATE.md says 30 — that
figure counts only `habit.service.spec.ts` at the end of Phase 2 and was never
updated for Phase 3; the real suite is 60. Corrected in step 9.) That number must
never go down; it only goes up.

---

## 1. Model — the five optional fields + `HabitPatch`

In `src/app/habit/habit.model.ts`:

- Add to `Habit`: `description?: string`, `category?: string`, `color?: string`,
  `icon?: string`, `notes?: string`. Document that `color`/`icon` hold **palette
  ids**, not hex/emoji (CriticReview R9), and that all five are optional so no
  migration is needed (R6).
- Export `HabitPatch` (R1):
  ```ts
  export type HabitPatch = Partial<
    Pick<Habit, 'name' | 'schedule' | 'description' | 'category' | 'color' | 'icon' | 'notes'>
  >;
  ```
  `id`, `createdAt`, `completedDates` are deliberately excluded — unrepresentable,
  not stripped.

**Verify:** `npm test` — 30 still green (pure type addition, nothing else moves).

## 2. `isHabit` type-checks the new fields

Still in `habit.model.ts`. Add to `isHabit`: each of the five fields must be
`undefined` or `typeof === 'string'` (R7). Present-but-wrong-type → the row is
corrupt and gets dropped, exactly as a malformed `schedule` is.

Do **not** bump `STORAGE_KEY` (R6) — v2 belongs to slice 4c.

**Verify:** new specs in `habit.service.spec.ts`:
- a row with no metadata fields passes `isHabit` (legacy row, AC 12);
- a row with `category: 42` fails `isHabit`;
- a row with all five fields as strings passes.

## 3. `HabitService.update(id, patch)`

In `habit.service.ts`, `update(id: string, patch: HabitPatch): void`:

1. Find the habit; unknown id → return (no-op, no persist).
2. **Validate everything present, before applying anything (R2 — atomic).**
   - `patch.name !== undefined` → must be non-empty after `trim()`, else return.
   - `patch.schedule !== undefined` → must satisfy `isSchedule`, else return.
   - If any check fails: no mutation, no `persist()`.
3. Normalise (R4 — `name` is validated, never normalised away):
   - `name` → trimmed (already known non-empty).
   - `description`, `category`, `notes` → trimmed; empty result → `undefined`.
   - `color`, `icon` → stored as given; empty string → `undefined`.
   - `schedule` → if `weekdays`, sort `days` ascending (scheduling-streaks R9).
4. Apply by building the new habit from the validated/normalised values and
   persist. Fields set to `undefined` read as absent — all presence checks in
   this slice are truthiness checks, never `in`/`hasOwnProperty` (R3).

**Verify:** new specs:
- rename persists and other fields are untouched;
- `update` with an empty/whitespace `name` is a no-op (AC 6);
- `update` with a malformed `schedule` is a no-op **and** a valid `name` in the
  same patch is *not* applied (AC 7, R2);
- `update(id, { category: '  ' })` leaves the habit with no category (AC 5);
- `update` on an unknown id is a no-op;
- after `update`, `id`/`createdAt`/`completedDates` are unchanged (AC 9);
- `weekdays` days are stored sorted.

## 4. Curated palette + icon set with safe resolvers

In `habit.model.ts` (shared by service and all three components — R9):

- `HABIT_COLORS: readonly { id: string; label: string; hex: string }[]` — a small
  curated set (~8), each with an accessible `label` (R10).
- `HABIT_ICONS: readonly { id: string; label: string; glyph: string }[]` — a small
  curated emoji set (~12) with labels.
- `colorOf(id?: string)` / `iconOf(id?: string)` — return the matching entry, or
  the **default** entry for `undefined` *and* for an unrecognised id.

**Verify:** specs — `colorOf(undefined)`, `colorOf('nope')` and `iconOf('nope')`
all return the default entry; `colorOf('<a real id>')` returns that entry (AC 13).

## 5. Edit form on `HabitListComponent` — component logic

In `habit-list.component.ts`:

- `editingId = signal<string | null>(null)`, plus draft signals for name,
  description, category, color, icon, notes, scheduleType, selectedDays.
- `startEdit(habit: Habit)` — fills every draft from the habit (drafts take the
  habit object directly; add no new `.find()` calls — R14), sets `editingId`.
- `cancelEdit()` — clears `editingId`; drafts are discarded (AC 2).
- `saveEdit()` — builds a `HabitPatch` from the drafts, calls
  `habitService.update`, clears `editingId`.
- `canSave()` — false when the draft name is blank, or scheduleType is
  `weekdays` with zero days selected (AC 6, AC 7).
- `scheduleChanged()` — **value** comparison of draft schedule vs the saved one
  (R12): same `type`, and for `weekdays` the same ascending-sorted `days`. Drives
  the recalculation warning.
- Reuse the existing `weekdays` array and day-toggle logic; the edit form's day
  picker must not share state with the add form's `selectedDays`.

**Verify:** `npm test` green; the component compiles.

## 6. Edit form + metadata rendering — habit list template

In `habit-list.component.html` / `.scss`:

- "Edit" button per row; while `editingId() === habit.id` the row renders the
  inline form (name, description, category input + `<datalist>` suggestions,
  colour swatches, icon picker, notes, schedule picker) with Save / Cancel.
- Save disabled unless `canSave()`; when `scheduleChanged()` is true, show the
  inline warning that changing the schedule recalculates past due-ness and
  streaks (AC 8).
- Row display: colour as a **left accent border** (never the row background,
  never status-bearing — R8/R10), icon before the name, description under it,
  category as a chip. Notes appear in the edit form only.
- Colour swatch and icon options carry their `label` as accessible text (R10).
- `remove(id)` clears `editingId` when it matches the removed habit (R11).

**Verify manually** (`npm start`): edit a habit, change every field, Save,
reload — values persist (AC 3, AC 4). Cancel discards. Clearing the category
removes the chip (AC 5). Changing the schedule shows the warning and the streak
updates immediately on save (AC 8).

## 7. Category filter

In `habit-list.component.ts` / `.html`:

- `categories = computed(...)` — distinct categories from `habits()`, deduped
  **case-insensitively**, keeping first-seen casing, sorted for stable display
  (R5).
- `categoryFilter = signal<string | null>(null)` (`null` = All). Not persisted.
- `visibleHabits = computed(...)` — filters `habits()` by case-insensitive
  category match; `null` shows everything. Offer an "Uncategorised" option only
  when at least one habit has no category.
- The list template iterates `visibleHabits()` instead of `habits()`; the
  empty-state message distinguishes "no habits yet" from "no habits in this
  category".

**Verify manually:** create habits in two categories, filter to each, then All
(AC 10). Rename a category on one habit and confirm the filter list updates.

## 8. Surface colour + icon on dashboard and calendar

- `dashboard.component.html`: icon + colour accent on each habit row across the
  today / done / lapsed lists (import the resolvers via a component method).
- `calendar.component.html`: icon + colour on the habit selector and the month
  heading **only** — day cells keep their `status-*` colouring untouched (R8).

**Verify manually:** a habit with a colour and icon shows both on all three
screens (AC 11).

## 9. Regression + wrap-up

- `npm test` — all previous 30 specs pass **unmodified** (AC 14), plus the new
  ones from steps 2, 3, 4.
- `npm run build` — production build clean.
- Manual: with an existing pre-slice localStorage payload, habits load, render
  with default colour/icon, no dropped rows (AC 12).
- Walk all 14 acceptance criteria in `Analyst.md` and record the result.
- Update `STATE.md`: Quick Tasks row for `habit-metadata`, current-work line.
- Fill in the retrospective in `Analyst.md` §5.
- **Do not commit** — ask the user first (CLAUDE.md working agreement).
