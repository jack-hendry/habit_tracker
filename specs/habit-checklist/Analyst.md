# Analyst — habit-checklist

**Size:** Medium (single client-side layer, under 10 steps).
Borderline note: this is the repo's first real feature, so the service/persistence
pattern is new to the project. Per the "size up" rule, the critic pass should focus
on the persistence and date-handling decisions, where a bad first pattern would be
most expensive.

## 1. What problem are we solving?

The app is empty Angular boilerplate — it tracks nothing. The core value of a habit
tracker is the daily loop: see my habits, tick off the ones I did today, and trust
that the data is still there tomorrow. This feature builds that minimal loop.

## 2. What is in scope?

- A `Habit` model: `id`, `name`, `createdAt`, and a record of completed dates
  (date-only strings, e.g. `2026-07-17`, in the user's local timezone).
- A `HabitService` (signal-based, `providedIn: 'root'`) that:
  - creates and deletes habits,
  - toggles a habit's completion for **today**,
  - persists all state to `localStorage` and reloads it on startup,
  - tolerates missing/corrupt stored data by starting empty (no crash).
- One standalone page component, `HabitListComponent`, registered as the default
  route (`''`), containing:
  - an input + button (and Enter key) to add a habit; empty/whitespace names rejected,
  - the list of habits, each with a checkbox reflecting "done today",
  - a delete control per habit,
  - an empty state message when there are no habits.
- Unit tests for `HabitService` (add, delete, toggle, persistence round-trip,
  corrupt-data recovery).

## 3. What is OUT of scope?

- **Streaks, statistics, or any history view** — the completion record is stored,
  but nothing displays past days.
- **Checking off any day other than today** (no backfill, no editing yesterday).
- **Editing/renaming habits** — delete and re-add is fine for now.
- **Scheduling** (weekly habits, "3x per week", reminders, notifications).
- **Backend, sync, accounts, auth** — localStorage only, single device.
- **Visual polish** — layout must be usable, not beautiful; no design system,
  no theming, no animations.
- **Migration strategy for the storage format** — a versioned storage key is enough.
- **Component tests for `HabitListComponent`** — service tests plus manual
  verification cover this feature; component tests come with the next feature
  if the template grows logic.

## 4. How do we know it is done?

All of the following, verified by hand at `localhost:4200` unless a test is named:

1. Adding "Read 20 min" shows it in the list; reloading the page keeps it.
2. Checking it marks it done for today; reloading keeps the checkmark.
3. Unchecking works and also survives reload.
4. Deleting removes it and it stays gone after reload.
5. Adding an empty or whitespace-only name does nothing.
6. With `localStorage` cleared or containing garbage under the app's key, the app
   loads with the empty state instead of crashing.
7. `npm test` passes, including the new `HabitService` specs.
8. `npm run build` succeeds.

## Retrospective (fill in before archiving)

- Did Analyst.md catch anything not thought about up front?
- Did anything in tasks.md turn out to be wrong during coding? What?
