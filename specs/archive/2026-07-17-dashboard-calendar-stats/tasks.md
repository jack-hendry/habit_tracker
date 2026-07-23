# tasks — dashboard-calendar-stats (Phase 3)

Implementation follows this order. Each step names how to verify it. Do not start
until CriticReview.md exists (harden pass done). No data-model change — `Habit`,
`Schedule`, and `STORAGE_KEY` (`v1`) are untouched; this slice only *reads*.

## 1. Service: `DayStatus` + `dayStatus(habit, iso, today)` (`habit.service.ts`)
- Export a `DayStatus = 'not-due' | 'done' | 'missed' | 'pending' | 'future'` type
  (in `habit.model.ts` alongside `Schedule`).
- Add `dayStatus(habit, iso, todayDate = new Date()): DayStatus`, pure. Order of
  checks matters (CriticReview R1):
  1. `iso > todayIso(today)` → `'future'` (evaluated **first** so a future
     completion or future due day is never mislabelled).
  2. `iso ∈ completedDates` → `'done'` (off-schedule completions still render done;
     precedes the due check on purpose).
  3. `!isDueOn(habit, iso)` → `'not-due'` (also covers `iso < createdIso`, which
     `isDueOn` already returns false for).
  4. `iso === todayIso(today)` → `'pending'` (due, not done, today not over).
  5. else → `'missed'` (due, not done, a past day).
- **Verify:** unit tests in step 5.

## 2. Service: `completionRate(habit, today)` (`habit.service.ts`)
- Iterate due days from `createdIso` to `todayIso(today)` inclusive using the
  existing `nextIso` walk (timezone-safe; do NOT build dates from `new Date(iso)`).
- Denominator = count of due days whose `dayStatus` is **not** `'pending'` and not
  `'future'` (i.e. `done` or `missed`) — a `pending` today is excluded so an
  in-progress day never lowers the score (CriticReview R2).
- Numerator = due days with `dayStatus === 'done'`. (Off-schedule completions fall
  on non-due days, so iterating due-days-only already excludes them — Phase 2 R6.)
- Denominator 0 → return `1` (nothing owed yet = 100%; CriticReview R3).
- Returns `0..1`; the component formats as a %.
- **Verify:** unit tests in step 5.

## 3. Service: `isLapsed(habit, today)` (`habit.service.ts`)
- True iff any day in `[createdIso .. prevIso(todayIso(today))]` has
  `dayStatus === 'missed'`. Walk with `nextIso`; stop at yesterday (a `pending`
  today must NOT count — CriticReview R4). Short-circuit on first `missed`.
- Also expose a small helper the dashboard needs: `lastDoneIso(habit): string |
  null` = max of `completedDates` (lexical max works for `YYYY-MM-DD`), for the
  "last done N days ago" label. (Days-ago math done in the component via `prevIso`
  counting or date diff on split parts — never `new Date(iso)`.)
- **Verify:** unit tests in step 5.

## 4. Service: `monthGrid(habit, year, month, today)` (`habit.service.ts`)
- `month` is 0-based (JS convention) to match `Date`. Return a `DayCell[]` where
  `DayCell = { iso: string; status: DayStatus } | { blank: true }` (or `iso: null`
  for leading/trailing pad cells).
- Leading blanks = weekday index (Sun=0) of the 1st of the month, so the 1st lands
  in the correct column (CriticReview R5 — compute via `new Date(year, month, 1)
  .getDay()`, a **local** construction, never from an ISO string).
- One cell per real day `1..daysInMonth` (`new Date(year, month+1, 0).getDate()`),
  each `{ iso: todayIso(new Date(year, month, day)), status: dayStatus(habit, iso,
  today) }`. Trailing blanks to fill the final week are optional (component can pad
  in CSS grid); if emitted, keep total a multiple of 7.
- Pure; `year`/`month` injectable for prev/next paging.
- **Verify:** unit tests in step 5.

## 5. Service specs (`habit.service.spec.ts`)
Add specs (pin `today` and `year/month` via injected values):
- `dayStatus`: all five states; `iso > today` with a completion still → `future`
  (order check, R1); off-schedule completion → `done`; due-past-uncompleted →
  `missed`; due-today-uncompleted → `pending`; `iso < createdIso` → `not-due`.
- `completionRate`: all-done → 1; half → 0.5; `pending` today ignored (R2); no due
  days yet → 1 (R3); off-schedule completion doesn't inflate; `createdIso` floor
  (no phantom pre-history).
- `isLapsed`: one past missed due day → true; only-pending-today → false (R4);
  brand-new caught-up habit → false; unscheduled gap → false.
- `monthGrid`: correct leading-blank count + cell count for a known month
  (e.g. a month whose 1st is a Wednesday); per-cell `status` correct; a month
  entirely before `createdIso` → all `not-due`; timezone-safe 1st-column placement
  (R5).
- **Verify:** `npm test` all green.

## 6. Routing + nav shell (`app.routes.ts`, `app.component.*`, new nav)
- Routes: `''` → `DashboardComponent` (lazy `loadComponent`); `'habits'` →
  existing `HabitListComponent`; `'calendar'` → `CalendarComponent`. Keep lazy
  imports consistent with the current file.
- `AppComponent`: delete the scaffold placeholder HTML; add a nav with
  `routerLink`s (Dashboard / Habits / Calendar) and `routerLinkActive`, above
  `<router-outlet/>`. Import `RouterLink`/`RouterLinkActive` (standalone imports).
- **Verify:** `localhost:4200` — `/`, `/habits`, `/calendar` each render; nav
  switches without a full reload; active link is marked.

## 7. Dashboard view (`dashboard.component.*`)
- Standalone component; `inject(HabitService)`; read the `habits` signal.
- Derive today's buckets as `computed` signals (recompute reactively on toggle):
  - **To do today** = habits with `dayStatus(h, today) === 'pending'`.
  - **Done today** = habits with `todayIso() ∈ completedDates`.
  - **Overdue / slipping** = habits with `isLapsed(h)` true; show name + "last done
    N days ago" (from `lastDoneIso`), or "never" if `completedDates` empty.
  - **Overall completion %** = average of per-habit `completionRate` across all
    habits (empty list → show "—", not `NaN`; CriticReview R6). Each habit row also
    shows its own `completionRate` as a %.
- Checking a habit off here calls `habitService.toggleToday(id)` and moves it
  To-do → Done reactively (only habits due today get a checkbox here; the general
  create/toggle/delete UI stays on `/habits`).
- **Verify:** acceptance criteria §4.2–4.5 by hand.

## 8. Calendar view (`calendar.component.*`)
- Standalone; `inject(HabitService)`. A habit `<select>` bound to a stored
  `selectedId` signal; derive the **selected habit** as a `computed` that falls back
  to the first habit when `selectedId` is absent from `habits()` (guards a habit
  deleted from `/habits` while selected — CriticReview R8). Current-month state as
  `signal<{ year: number; month: number }>` seeded from `new Date()`.
- Render `monthGrid(selectedHabit, year, month, today)` as a 7-column CSS grid with
  a Sun–Sat header row; colour/marker each cell by `status` (done / missed /
  pending / not-due / future) with a small legend. Blank cells render empty.
- **Prev / next month** buttons adjust `{year, month}` (0-based month): prev on
  month 0 → `{year-1, 11}`, next on month 11 → `{year+1, 0}` (CriticReview R9).
  Legend must include a **`future`** swatch — the current month has future cells
  (R11). Read-only — cells are **not** clickable/toggleable (criterion 8).
- Empty state when there are no habits ("Add a habit first").
- **Verify:** criteria §4.6–4.9 by hand (incl. a Mon/Wed/Fri habit and paging to a
  pre-creation month).

## 9. Full manual verification + build
- Walk every acceptance criterion in `Analyst.md` §4 at `localhost:4200`. Seed a
  habit with some past completions/misses (via a few days of localStorage editing
  or by temporarily injecting a past `today`) to exercise `missed`/`lapsed`/% > 0.
- `npm test` and `npm run build` both pass; scaffold placeholder gone.
- Run a **post-code review** (Large task requires it) over the diff.
- Update `STATE.md`: mark Phase 3 done, add a Quick Tasks row if any small fixes.
- Fill the Analyst retrospective, then archive the spec to
  `specs/archive/YYYY-MM-DD-dashboard-calendar-stats/` and flip the ROADMAP row.
