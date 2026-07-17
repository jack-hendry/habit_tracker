# STATE — Habit Tracker

## Current work

Phase 2 (Scheduling + streaks): ✓ **COMPLETE** — all 12 acceptance criteria verified (manual + 30 passing tests).

## Quick Tasks

| Task | Status | Notes |
|---|---|---|
| habit-checklist (Phase 1) | ✓ Done | Model, service (with localStorage + signal + corruption recovery), component (add/check/delete), route, 13 passing tests, all 8 acceptance criteria verified |
| scheduling-streaks (Phase 2) | ✓ Done | `Schedule` union (daily / weekdays); `isDueOn`, `currentStreak`, `longestStreak` streak logic; schedule picker UI; reactive streak display; migration for legacy rows; 30 passing tests (8 Phase 1 + 22 Phase 2); all 12 acceptance criteria verified |

## Phases ahead

- **Phase 2:** Scheduling (daily/weekdays/X-per-week) + streaks
- **Phase 3:** Dashboard (today/overdue/streaks) + calendar + basic stats
- **Phase 4:** Rich habits (count/duration/categories/colors/icons/edit/archive)
- **Phase 5:** Notifications (PWA service worker or backend decision needed)

See `specs/ROADMAP.md` for full product vision.
