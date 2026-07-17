# Habit Tracker — Product Roadmap

The north-star vision, captured from the initial brainstorm. This is **not** a
commitment to build everything — it is the map we slice thin vertical features
out of. Each phase ships working, verifiable software before the next begins.

Architecture decision (locked): **client-side only, localStorage, single
device.** No backend, no accounts until a phase explicitly demands it
(notifications will force that conversation).

## Phases

| Phase | Slice | Status |
|---|---|---|
| **1 — MVP walking skeleton** | `habit-checklist`: create / check-off-today / delete a habit; persist to localStorage. Yes/No completion only. | In progress (`specs/habit-checklist/`) |
| **2 — Scheduling + streaks** | Schedule rules (daily / weekdays / X-per-week); current + longest streak. Streak math depends on "was it due?", so these ship together. | Planned |
| **3 — Dashboard + calendar + basic stats** | Today / overdue / completed-today views; daily/weekly/monthly calendar; completion %. Needs history from 1–2. | Planned |
| **4 — Rich habits** | Completion types (count / duration / numeric / checklist), categories, colors, icons, notes, edit/rename, archive vs delete, pause, start date, reactivation. | Planned |
| **5 — Notifications** | Time-based / multiple / snooze / skip-after-complete reminders. Requires a PWA service worker (or backend) — biggest architectural jump. | Planned |

## Open product questions (deferred until their phase)

Carried from the brainstorm so they are not lost:

- **Habit lifecycle:** Can habits be reactivated? Is deleting permanent, or
  archive-then-delete? Should completed/archived habits remain in history?
  → Phase 4.
- **Schedule changes:** If a schedule changes later, does history recalculate?
  Can users skip holidays? → Phase 2/3.
- **Streak rules:** Does a missed day reset immediately? What if the habit
  wasn't scheduled that day (no penalty)? → Phase 2.
- **Completion types:** Yes/No, count, duration, distance, weight, numeric,
  checklist — which do we actually support, and how are goals defined? → Phase 4.
- **Statistics:** heatmap, best streak, worst month, success-by-weekday,
  category breakdown, time trends. → Phase 3+.

## Full data model (eventual target — Phase 4)

A habit *may* eventually contain: name, description, category, icon, color,
schedule, goal, measurement type, reminder settings, notes, created date,
archived flag. Phase 1 deliberately implements only `id`, `name`, `createdAt`,
and `completedDates` — see `specs/habit-checklist/Analyst.md` for what is
explicitly out of scope and why.
