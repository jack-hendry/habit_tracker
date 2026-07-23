# Spec-Driven Development State

## Quick Tasks (small fixes / one-offs, no spec needed)

_(none yet)_

## Phases

| Phase | Feature | Status | Spec |
|---|---|---|---|
| **1** | Habit checklist (create/check-off/delete, localStorage) | ✅ Merged | `archive/2026-07-17-habit-checklist/` |
| **2** | Scheduling + streaks (daily/weekdays, streak math) | ✅ Merged | `archive/2026-07-17-scheduling-streaks/` |
| **3** | Dashboard + calendar + stats (today buckets, monthly grid, %) | ✅ Merged | `archive/2026-07-17-dashboard-calendar-stats/` |
| **4** | Rich habits (types, categories, colors, edit, archive, pause) | 📋 Planned | — |
| **5** | Notifications (time-based reminders, PWA) | 📋 Planned | — |

## Notes

- Router: `/` = Dashboard, `/habits` = Manage, `/calendar` = Per-habit monthly view
- Dashboard: To-do today / Done today / Overdue-slipping buckets + overall %
- Calendar: Color-coded cells (done/pending/missed/not-due/future) with month paging
- Service: Pure derivations (`dayStatus`, `completionRate`, `isLapsed`, `monthGrid`)
- All Phase 3 acceptance criteria verified at localhost:4200
