# Analyst — habit-metadata (Phase 4, slice 4a)

Size: **Medium→Large** (touches model + service + all three components, but is
purely additive — no derivation changes, no storage-key bump). Per CLAUDE.md:
Analyst + tasks + harden round, and a review after coding.

Slice source: `specs/phase-4-plan.md` §"Slice 4a — habit-metadata".

## 1. What problem are we solving?

After Phases 1–3 a habit is a name, a schedule, and a list of completed dates.
That is enough to be *correct* and not enough to be *usable*: with ten habits the
list is an undifferentiated wall of text, a typo in a name is permanent (the only
mutations are add / remove / toggle), and there is nowhere to record why a habit
exists or how it is meant to be done.

This slice makes habits identifiable and editable. It is deliberately the cheap
part of Phase 4 — additive optional fields plus one new mutation — so it ships
before 4b redefines "due" and 4c redefines "done".

## 2. What is in scope?

### 2.1 Model — five optional fields

`Habit` gains `description?`, `category?`, `color?`, `icon?`, `notes?`, all
optional strings. Because they are optional, `isHabit` needs no migration: an
existing v1 row without them is still valid and loads unchanged. `STORAGE_KEY`
stays `habit_tracker.habits.v1`.

- `description` — one line, the "what/why", shown under the name.
- `notes` — free multi-line text on the habit. **Not** per-day notes (see §3).
- `category` — a free-text string, trimmed. Not an entity: no ids, no CRUD, no
  cascading rename. Suggestions in the UI come from the distinct categories
  already present on existing habits.
- `color` — an id from a fixed curated palette, not a free colour picker.
- `icon` — an id from a fixed curated set (emoji), not arbitrary input.

`color` and `icon` are stored as **palette/set ids** (e.g. `'sky'`, `'run'`), not
raw hex or raw emoji, so the rendered values can be restyled later without a data
migration. A stored id that is no longer in the palette must degrade to the
default rather than break rendering.

Validation is by the same philosophy as Phase 1/2: `isHabit` rejects a row whose
metadata field is present but of the wrong *type* (corrupt → row dropped); an
unknown-but-string `color`/`icon` id is not corrupt, it just falls back at render
time.

### 2.2 Service — `update(id, patch)`

`HabitService.update(id: string, patch: HabitPatch): void` — the first
mutation that is not add/remove/toggle.

- Rejects (no-op) an invalid patch, using the same rules as `add`: a `name` in the
  patch must be non-empty after trimming; a `schedule` in the patch must satisfy
  `isSchedule`. Validation is **atomic** — every key present is checked before
  anything is applied, so a partly-valid patch changes nothing (CriticReview R2).
- Never lets a patch overwrite identity/history: `HabitPatch` omits `id`,
  `createdAt` and `completedDates` entirely, so they are *unrepresentable* rather
  than stripped at runtime (CriticReview R1 — this revised the original
  `Partial<Habit>` + runtime-strip design). This is the invariant that keeps
  4b/4c safe — `update` is a *metadata* mutation.
- Trims `name`, `category`, `description`, `notes`. Note the asymmetry
  (CriticReview R4): `name` is required-and-validated and is never normalised
  away, while the prose fields are trimmed-then-cleared.
- Empty-string metadata values are stored as `undefined` (field removed) rather
  than `''`, so "cleared the category" and "never had one" are the same state and
  the category filter has one case to handle, not two.
- Persists via the existing `persist()`.
- Unknown id → no-op.

### 2.3 Editing UI

Edit affordance on `HabitListComponent`: an "Edit" button per habit opens an
inline form over that row, with Save / Cancel. Editable: name, description,
category (text + datalist of existing categories), colour (swatch picker), icon
(icon picker), notes, and **schedule** (the same picker used by the add form).

Cancel discards; Save calls `update` once with the whole patch. Save is disabled
when the name is empty or a `weekdays` schedule has zero days selected — the two
conditions `add` already rejects.

**Schedule editing is allowed, and it recalculates history.** Every derivation
(`isDueOn`, both streaks, `dayStatus`, `completionRate`, `isLapsed`, `monthGrid`)
is computed live from `schedule`, so changing it rewrites past due-ness:
yesterday's "missed" can become "not-due" and a streak can jump. This is the
answer to the roadmap's open question "does history recalculate on schedule
change?" — **yes**, by live derivation. It is the right behaviour (the schedule
describes what the habit *is*), but it must not be a surprise: the edit form
shows an inline warning whenever the schedule is changed from its saved value.

### 2.4 Surfacing metadata

- **Habit list:** colour as a left border/accent on the row, icon before the
  name, description under it, category as a chip. Notes shown in the edit form
  only (they are reference text, not glanceable).
- **Dashboard:** icon + colour on every habit row in the today / done / lapsed
  lists.
- **Calendar:** icon + colour on the habit selector and the month heading.
- **Category filter** on the habit list: a control listing "All" plus each
  distinct category in use; selecting one filters the visible habits. A habit
  with no category is reachable via "All" and via an "Uncategorised" option only
  if uncategorised habits exist.

The filter is view state on the component (a signal), not persisted.

## 3. What is OUT of scope?

- **Category management screen** — no rename-cascade, no delete-category, no
  per-category stats. Category is a string on a habit; that is the whole feature.
- **Per-day notes.** `notes` is one string on the habit. Per-day notes are a
  different data shape (keyed by date) and belong with 4c's entry record, if ever.
- **Rich text / markdown** in description or notes. Plain strings.
- **Free colour picker / custom icon upload.** Curated sets only.
- **Drag-to-reorder, custom sort, search.** The filter is by category only.
- **Bulk edit** across habits.
- **Editing `completedDates`** (backfilling past days) — still today-only, as in
  Phases 1–3. `update` explicitly refuses it.
- **Anything from 4b/4c:** start date, pause, archive, status, delete-confirm,
  completion types, storage v2. Deleting stays immediate and permanent in this
  slice; the confirm step arrives with 4b.
- **Persisting the category filter** across reloads.

## 4. How do we know it is done?

Acceptance criteria — each individually checkable:

1. A new habit can be created with a name and schedule exactly as before; the
   add form is unchanged in behaviour.
2. Clicking Edit on a habit opens an inline form pre-filled with its current
   values; Cancel leaves the habit untouched.
3. Renaming a habit persists across a page reload.
4. Setting a description, category, colour, icon, and notes persists across a
   page reload.
5. Clearing a previously-set category leaves the habit with no category (not an
   empty-string category), and it disappears from that category's filter.
6. Saving with an empty/whitespace name is refused (Save disabled, and `update`
   itself no-ops if called).
7. Saving a `weekdays` schedule with zero days selected is refused.
8. Changing a habit's schedule updates its streaks/calendar immediately, and the
   edit form shows a warning that history will recalculate before saving.
9. `update` cannot change `id`, `createdAt`, or `completedDates` — a patch
   containing them leaves those fields as they were (unit test).
10. The habit list can be filtered to a single category, and "All" restores the
    full list.
11. Colour and icon appear on the habit list, the dashboard, and the calendar.
12. A habit stored before this slice (no metadata fields) loads and renders with
    default colour/icon and no category — no migration, no dropped rows.
13. A habit with an unrecognised `color`/`icon` id renders the default instead of
    breaking.
14. All 60 existing Phase 1–3 tests still pass unmodified.

## 5. Retrospective

**Did Analyst.md catch anything not thought about up front?**

Yes, several critical details. The Analyst locked in the type-level contract for `HabitPatch` — deliberately making `id`, `createdAt`, and `completedDates` unrepresentable rather than relying on runtime stripping (R1). This forced clarity: the type itself communicates safety, and any code that tries to pass those fields gets a compile error. The Analyst also crystallized three validation principles that could have been missed: patches must be validated *all* before applying any (R2 — atomic, so a half-valid patch changes nothing); empty trimmed strings must become `undefined`, not `''` (R3 — so the filter logic has one case, not two); and category deduplication must be case-insensitive in the UI (R5 — otherwise a "Work" and "work" habit would be two filter options from the same logical category). The colour safety constraint (R8 — habit colour must not collide with the status channels already bound to `border-left`) was also surfaced by the Analyst's review, though this became even more specific during coding (see "turned out wrong" below).

**Did anything in tasks.md turn out to be wrong during coding? What?**

Three findings, all recorded honestly:

1. **Baseline test count**: tasks.md stated the baseline as 30 passing tests, copied from STATE.md. The real suite at the end of Phase 3 was 60 — STATE.md's figure was stale since Phase 3 ended. The spec was corrected mid-flight; all 81 tests pass.

2. **Dashboard colour accent (R16)**: CriticReview R8 instructed "colour as a left accent border" for both the habit list *and* the dashboard. This was wrong for the dashboard specifically: `.habit-item` there already uses `border-left` as its status channel (green for done, red for lapsed), so binding habit colour to it would have overwritten status visibility. Fixed during step 8 by giving the dashboard habits a separate colour DOT instead, keeping `border-left` as status. The habit list, which had no prior left-border binding, implements the accent-border as specified. This is a refinement of R8, not a spec failure — the principle (signal colour without breaking status) held; the implementation adapted.

3. **SCSS bundle budget**: The default Angular `anyComponentStyle` budget of 2 kB warn / 4 kB error is enforced in `angular.json`. Once the edit form's inline SCSS landed, the production build failed. Raised the budget to 6 kB warn / 10 kB error in `angular.json` — a real config change outside the original task list. The app builds and ships clean.
