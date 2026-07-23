# CriticReview — habit-metadata (Phase 4, slice 4a)

Two harden rounds. Focus per the Analyst: the new `update` mutation (the first
one that can corrupt an existing habit) and the "additive, no migration" claim.
**[FIX]** changed the Analyst/tasks; **[OK]** are confirmations kept as
implementation guard-rails.

## Round 1 — the `update` mutation

**R1 [FIX] `Partial<Habit>` is the wrong signature — it makes the dangerous case
type-legal and pushes the whole defence to runtime.** Analyst §2.2 says `update`
strips `id`, `createdAt`, `completedDates` at runtime, which means the compiler
happily accepts `update(id, { completedDates: [] })` and the protection is a
silent no-op the caller can't see. **Resolution:** declare an explicit patch type

```ts
export type HabitPatch = Partial<
  Pick<Habit, 'name' | 'schedule' | 'description' | 'category' | 'color' | 'icon' | 'notes'>
>;
```

and take `patch: HabitPatch`. Identity/history become *unrepresentable* rather
than stripped. Keep no runtime strip — with the narrowed type there is nothing to
strip, and a runtime strip would only hide a compile error. AC 9 stays as a test
(it documents the guarantee) but is written against the type.

**R2 [FIX] Validation must be atomic — reject the whole patch, never apply it
half-way.** The Analyst lists the two rejection rules but not what happens when a
patch is *partly* valid (`{ name: 'ok', schedule: <malformed> }`). Applying the
good half leaves the user with a rename they didn't ask for and no schedule
change, with no feedback. **Resolution:** `update` validates every key present in
the patch *first*; if any check fails, the whole call is a no-op and nothing is
persisted. Stated in tasks step 3.

**R3 [FIX] `{ ...habit, ...patch }` is subtly wrong for the clear-a-field case.**
The Analyst wants empty string → field removed. Spreading a patch whose value is
`undefined` *does* overwrite the key, so the in-memory object ends up with
`category: undefined` — a key that is present with an undefined value. It
serialises correctly (`JSON.stringify` drops it) and `isHabit` accepts it on
reload, so this is not a data bug — but it means `'category' in habit` is `true`
for a habit with no category, and any code that tests presence with `in` or
`Object.keys` will disagree with the code that tests truthiness. **Resolution:**
normalise metadata strings to `undefined` in `update`, and mandate that all
presence checks in this slice are truthiness checks (`if (habit.category)`),
never `in`/`hasOwnProperty`. Noted in tasks steps 3 and 6.

**R4 [FIX] Empty-string→undefined must NOT apply to `name`.** Same normalisation
pass would silently delete a required field. `name` is validated (non-empty after
trim → otherwise reject per R2), never normalised away. The rule is: `name` is
required-and-validated; `description`/`category`/`notes` are trimmed-then-
emptied-to-`undefined`; `color`/`icon` are ids, not trimmed prose, and are stored
as-is or cleared. Split explicitly in tasks step 3.

**R5 [FIX] Category needs a case rule or the filter fragments.** "Health" and
"health" would be two separate filter entries pointing at the same intent, and
the suggestion datalist would show both. **Resolution:** store the category with
the user's own casing (trimmed), but build the distinct-category list by
case-insensitive dedupe, keeping first-seen casing; filter comparison is likewise
case-insensitive. Cheap, no data normalisation, no migration. Added to Analyst
§2.4 scope and tasks step 7.

**R6 [OK] "No migration needed" holds.** All five fields are optional, so an
existing v1 row passes `isHabit` unchanged and `load` needs no backfill — unlike
Phase 2's `schedule`, which was required and needed one. `STORAGE_KEY` must
**not** be bumped in this slice; the v2 bump is 4c's, and doing it early would
burn the one-way migration on a model that is still moving.

**R7 [FIX] `isHabit` must still reject present-but-wrong-type metadata.**
"Optional" must not become "unchecked" — `{ category: 42 }` is corrupt data and
Phase 1/2 policy (archived R3, scheduling R1) is to drop the corrupt row, not
coerce it. Each of the five fields: `=== undefined || typeof === 'string'`. Added
to tasks step 2 with a test.

## Round 2 — rendering, UI state, re-check of Round 1

**R8 [FIX] Habit colour must not reach the calendar's day cells.** The calendar
encodes `DayStatus` as cell colour (`status-done`/`status-missed`/…). Tinting
cells by habit colour would put two meanings on one channel and make "missed"
unreadable for some palette entries. **Resolution:** habit colour/icon appear on
the calendar's *habit selector and month heading only*; day cells keep status
colouring untouched. Same principle on the list: colour is a left accent border,
not the row background. Tightened in Analyst §2.4, tasks step 8.

**R9 [FIX] Unknown `color`/`icon` id needs a defined fallback path, not just
"degrade gracefully".** Store ids; resolve through a lookup that returns the
default entry when the id is absent from the palette. Concretely: `HABIT_COLORS`
/ `HABIT_ICONS` as `readonly` arrays in `habit.model.ts` (shared by service and
all three components), plus `colorOf(id?)` / `iconOf(id?)` resolvers that return
the default for `undefined` *and* for an unrecognised id. AC 13 tests the
unrecognised case. tasks step 4.

**R10 [FIX] Colour must never be the only carrier of meaning.** The list already
distinguishes not-due rows via `.not-due-today`; adding a colour accent risks
that being read as status. Icon + text label carry identity; the accent is
decoration. Also: the swatch picker's options need accessible names (the colour's
label), not bare coloured squares.

**R11 [FIX] Dangling edit state when the edited habit disappears.** `editingId`
is a component signal; deleting the habit being edited (delete is still immediate
in this slice — 4b adds the confirm) leaves the form open over a row that no
longer exists. **Resolution:** `remove()` in the component clears `editingId` if
it matches, and the template only renders the edit form for a habit found in the
current list. tasks step 6.

**R12 [FIX] The "schedule changed" warning needs a real comparison, not a
reference check.** Draft and saved schedules are separate objects; `!==` is
always true and the warning would show permanently, training the user to ignore
it. Compare by value: same `type`, and for `weekdays` the same sorted `days`.
Reuse the existing ascending-sort rule from scheduling-streaks R9 so
`[3,1]` and `[1,3]` compare equal. tasks step 5.

**R13 [OK] Live recalculation on schedule change requires no service work.**
Every derivation already reads `habit.schedule` at call time and `habits` is a
signal, so `update` persisting a new schedule makes streaks/calendar recompute on
the next render. Nothing to invalidate — this is the payoff of Phase 2's live
derivation. Confirmed; AC 8 is a UI/wiring test, not a logic change.

**R14 [OK] Per-row `.find()` helpers get worse, and that is accepted here.**
`HabitListComponent` already looks a habit up by id in seven template-called
methods; metadata adds more. Refactoring the components to pass the `Habit`
object into the template loop is the right fix but is *consumer sprawl cleanup*
the phase-4 plan assigns to 4b, which has to sweep every call site anyway.
Deliberately not doing it here — doing it now would push 4a past its Analyst
(the plan's own scope-creep risk). New helpers take the `Habit` directly where
the template already has it, so 4a at least adds no new `.find()` calls.

**R15 [OK] Re-verified R1–R5 end-to-end.** Legacy row (no metadata) → passes
`isHabit` → renders with default colour/icon and no category chip → editable →
`update` with a narrowed patch cannot touch `completedDates` → persisted → reload
shows metadata and unchanged streaks. Wrong-typed metadata → fails `isHabit` →
dropped, consistent with Phase 1/2. No path coerces corrupt data, and no path
lets metadata editing alter history.

## Round 3 — found during implementation

**R16 [FIX] Dashboard habit colour must not overwrite the status border.** R8
instructed "colour as a left accent border" for both the habit list and the
dashboard. During step 8, the dashboard's `.habit-item` already used `border-left`
as its status channel (green for completed, red for lapsed). Binding habit colour
to the same border would have overwritten status visibility. **Resolution:** the
dashboard gives each habit row a small colour dot next to the icon instead,
leaving `border-left` as the status indicator. The habit list, which had no prior
left-border binding, implements the accent-border as planned. The principle held
(signal colour without breaking status); the implementation adapted to the
dashboard's existing design.

## Net changes applied to the spec

- Analyst §2.2: `HabitPatch` type instead of `Partial<Habit>` (R1); atomic
  validation (R2); `name` excluded from empty→undefined normalisation (R4).
- Analyst §2.4: case-insensitive category dedupe/filter (R5); calendar day cells
  explicitly untouched (R8).
- tasks step 2: `isHabit` type-checks the five new fields (R7).
- tasks step 4: `HABIT_COLORS`/`HABIT_ICONS` + `colorOf`/`iconOf` resolvers (R9).
- tasks step 5: value-comparison for the schedule-change warning (R12).
- tasks step 6: clear `editingId` on delete (R11); truthiness-only presence
  checks (R3).
- tasks step 7: case-insensitive distinct-category list (R5).
- tasks step 8: colour as accent only, never status-bearing (R8, R10); dashboard
  colour rendered as a dot to avoid overwriting status border (R16).
