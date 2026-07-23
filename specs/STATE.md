# Spec-Driven Development State

## Quick Tasks (small fixes / one-offs, no spec needed)

| Task | Status |
|---|---|
| Replace the literal NUL byte in `habit-list.component.ts`'s `UNCATEGORISED` sentinel with a `\0` escape — git treats the file as binary and `grep` skips it (found during 4b) | 📋 Open |
| Split `HabitListComponent` — its SCSS is 7.82 kB against a 6 kB warn budget, and 4c will add more to the same file | 📋 Open |

## Phases

| Phase | Feature | Status | Spec |
|---|---|---|---|
| **1** | Habit checklist (create/check-off/delete, localStorage) | ✅ Merged | `archive/2026-07-17-habit-checklist/` |
| **2** | Scheduling + streaks (daily/weekdays, streak math) | ✅ Merged | `archive/2026-07-17-scheduling-streaks/` |
| **3** | Dashboard + calendar + stats (today buckets, monthly grid, %) | ✅ Merged | `archive/2026-07-17-dashboard-calendar-stats/` |
| **4a** | Habit metadata (categories, colors, icons, notes, edit/rename) | ✅ Done | `habit-metadata/` |
| **4b** | Habit lifecycle (start date, pause, archive, reactivate, delete-confirm) | ✅ Done | `habit-lifecycle/` |
| **4c** | Completion types (count / duration / numeric / checklist, storage v2) | 📋 Planned | — (see `phase-4-plan.md`) |
| **5** | Notifications (time-based reminders, PWA) | 📋 Planned | — |

## Notes

- Router: `/` = Dashboard, `/habits` = Manage, `/calendar` = Per-habit monthly view
- Dashboard: To-do today / Done today / Overdue-slipping buckets + overall %
- Calendar: Color-coded cells (done/pending/missed/not-due/future) with month paging
- Service: Pure derivations (`dayStatus`, `completionRate`, `isLapsed`, `monthGrid`)
- All Phase 3 acceptance criteria verified at localhost:4200
- Test baseline after 4b: **107** passing (`npx ng test --watch=false --browsers=ChromeHeadless`)
- Phase 4 is sliced 4a/4b/4c — see `phase-4-plan.md`. 4c (completion types,
  storage v2) is the only slice left and is the one that bumps `STORAGE_KEY`
- Lifecycle model: `status` is `'active' | 'archived'` only — **paused is
  derived** from `pausedRanges`, whose `to` is **exclusive**. Archive opens a
  pause range and reactivate closes it, so an archived stretch never accrues
  missed days
