# Analyst — dashboard-calendar-stats (Phase 3)

**Size:** Large → Complex. Touches the service (new pure, date-injectable
derivations: per-day status, completion %, "overdue"/lapsed detection, month-grid
generation) **and** several new UI surfaces (a dashboard with today's buckets, a
per-habit calendar, stat readouts) **and** app navigation (a dashboard becomes the
home; the create/manage list moves behind a nav). Nothing here changes the data
model — Phase 3 is read-only *over* the history Phases 1–2 already record. The
ambiguous part is the meaning of **"overdue"** in an app where completions are
today-only (no backfill), so per the "size up" rule the two harden passes focus
there and on the boundaries of every %/status calculation (today-not-yet-done,
future days, the `createdAt` floor, timezone-safe day cells). Full spec + 2 harden
rounds + a review after coding.

## 1. What problem are we solving?

Phases 1–2 record everything needed to *see how you're doing* — a schedule and a
list of completed dates per habit — but the UI still shows only a flat list with a
single 🔥 number. There is no way to answer the questions that make a tracker
worth opening: **What do I still owe today? What have I already done? Where am I
slipping? What does my month look like? What % of the time do I actually keep this
habit?** Phase 3 turns the recorded history into views: a **dashboard** that sorts
today's habits into actionable buckets, a **calendar** that shows a habit's history
at a glance, and **completion %** stats. No new data is captured — this slice is
pure presentation and derivation over existing `completedDates` + `schedule`.

## 2. What is in scope?

### Service (`HabitService`) — new *pure, date-injectable* derivations
All follow the Phase 2 pattern: no side effects, accept an injectable `today`
`Date`, reuse the existing timezone-safe helpers (`todayIso`, `weekdayOf`,
`prevIso`, `nextIso`, `createdIso`/`localDateOf`). Streak/`isDueOn` logic is
untouched and reused.

- **`dayStatus(habit, iso, today): DayStatus`** — the single source of truth every
  view derives from. One of:
  - `'not-due'` — habit not scheduled that day (or `iso` before `createdIso`).
  - `'done'` — `iso` in `completedDates` (whether or not it was due — an
    off-schedule completion still renders as done on the calendar).
  - `'missed'` — due, not completed, and `iso` is a **past** day (`iso < today`).
  - `'pending'` — due, not completed, and `iso === today` (the day isn't over).
  - `'future'` — `iso > today` (no judgement yet).
- **`completionRate(habit, today): number`** — `0..1`. Numerator = completed
  **due** days in `[createdIso .. today]`. Denominator = **due** days in the same
  range **excluding** a `pending` today and excluding `future` (there are none in
  range) so an in-progress day never drags the number down. Denominator 0 (no due
  days yet) → define as `1` (nothing owed = perfect) — flag R-candidate for the
  critic. Off-schedule completions are **not** counted (numerator is due-days
  only), consistent with streak math (Phase 2 R6).
- **`isLapsed(habit, today): boolean`** — true iff there is ≥1 `missed` day in
  `[createdIso .. prev(today)]`. This is the precise meaning of **"overdue"** for
  this app (see the Overdue decision below). A `pending` today alone does **not**
  make a habit lapsed.
- **`monthGrid(habit, year, month, today): DayCell[]`** — an ordered list of cells
  for a calendar month (leading/trailing blanks to align weekday columns), each
  carrying its `iso` and `dayStatus`. Pure; month/year injectable so the calendar
  can page prev/next. Weekday column order Sun→Sat to match the Phase 2 picker.

### Dashboard view (new) — today, grouped
Today's habits sorted into **distinct, useful sections** (not a strict partition —
a lapsed habit due today appears in both its today-bucket and the lapsed count):
- **To do today** — due today and not yet completed (`dayStatus(today) ===
  'pending'`). The actionable agenda.
- **Done today** — completed today (`today ∈ completedDates`), including
  off-schedule completions.
- **Overdue / slipping** — habits where `isLapsed` is true (a past due day was
  missed). Informational — completions are today-only so these can't be actioned
  retroactively; the point is to surface the slip. Shows the habit and, e.g., "last
  done N days ago".
- **Overall completion %** — a single headline number across all active habits
  (average of per-habit `completionRate`, or completed-due ÷ total-due pooled —
  pick one, flag for critic) plus a per-habit % on each row.

### Calendar view (new) — per habit, monthly
- A **monthly grid** for a selected habit, rendered from `monthGrid`. Each day cell
  is colour/marker-coded by `dayStatus` (done / missed / pending-today / not-due /
  future), with the month + year labelled and **prev/next month** navigation.
- "Daily / weekly" granularities from the roadmap are **narrowed** for this slice
  to: monthly grid is the core; a compact **current-week strip** (7 cells) may be
  shown on the dashboard as the "weekly" view. A standalone day view is deferred
  (see OUT of scope) — a single day is already the dashboard's whole subject.

### Navigation (new)
- Introduce a small top-level nav. **Dashboard** becomes the default route (`''`);
  the existing create/check-off/delete list moves to **`/habits`**; the calendar is
  **`/calendar`** (or a section within the dashboard — flag for critic). Routing
  already exists (`provideRouter`, lazy `loadComponent`); add routes + a nav
  component/links. `AppComponent`'s leftover scaffold placeholder HTML is removed.

### Tests (`habit.service.spec.ts`)
New specs (pin `today`), covering the boundary cases the critic will care about:
- `dayStatus`: each of the five states, incl. `iso < createdIso` → `not-due`,
  off-schedule completion → `done`, due-past-uncompleted → `missed`,
  due-today-uncompleted → `pending`, `iso > today` → `future`.
- `completionRate`: all-due-all-done → 1; half done → 0.5; a `pending` today does
  **not** lower it; no-due-days-yet → 1; off-schedule completion does not inflate
  it; respects the `createdIso` floor (no phantom pre-history).
- `isLapsed`: one missed past due day → true; only a pending today → false; brand
  new all-caught-up habit → false; non-due gaps → false.
- `monthGrid`: correct cell count + leading blank alignment for a known month;
  correct `dayStatus` per cell; a month entirely before `createdIso` is all
  `not-due`; timezone-safe (a Sunday-start month renders the 1st in the right
  column in a negative-offset zone).

## 3. What is OUT of scope? (most important)

- **Editing / backfilling past days.** Toggling stays today-only (Phase 1–2 rule).
  The calendar is **read-only** — clicking a past cell does **not** let you mark it
  done. This is the single biggest temptation and it is explicitly deferred; the
  data model and streak semantics assume no backfill.
- **Changing a schedule** and recalculating history — still Phase 4 (roadmap).
- **Rich stats:** heatmap intensity, best/worst month, success-by-weekday,
  category breakdown, time-trend charts. Phase 3 ships **completion %** and the
  month grid only; the rest is Phase 3+ / Phase 4 per the roadmap.
- **A standalone single-"day" calendar view.** The dashboard already *is* today.
- **Cross-habit aggregate calendar / heatmap.** Calendar is per-selected-habit.
- **New data model fields, backend, sync, accounts** — still localStorage, single
  device, no schema change (`STORAGE_KEY` stays `v1`).
- **Visual polish / theming / animations** — usable and readable, not beautiful.
- **Persisting UI state** (selected habit, current calendar month, active nav) —
  ephemeral in-memory; a reload may reset to defaults.

## 4. How do we know it is done?

Verified by hand at `localhost:4200` unless a test is named:

1. Landing on `/` shows the **Dashboard**; the create/manage list is reachable at
   `/habits`; nav links move between them without a full reload.
2. **To do today** lists exactly the habits due today and not yet checked off;
   checking one off moves it to **Done today** reactively (no reload).
3. **Done today** lists habits completed today, including a completion made on a
   day the habit was *not* scheduled (off-schedule done still shows as done).
4. A habit that missed a past due day appears under **Overdue / slipping**; a habit
   merely not-yet-done *today* does **not** appear there.
5. Each habit shows a **completion %**; a fully-kept habit reads 100%, a
   half-kept one ~50%, and a due-today-still-pending habit is **not** penalised
   (its % ignores today until the day ends). A brand-new habit with no due days yet
   reads 100% (nothing owed).
6. Opening the **Calendar** for a habit shows the current month; each day is marked
   done / missed / not-scheduled / today-pending / future correctly, aligned under
   the right weekday column.
7. **Prev/next month** navigation works and re-renders correctly, including a month
   entirely before the habit existed (all "not scheduled").
8. The calendar is **read-only** — no way to toggle a past day from it.
9. A Mon/Wed/Fri habit's calendar marks only Mon/Wed/Fri as due; other days render
   as not-scheduled, never as "missed".
10. All new service derivations are covered by unit tests; `npm test` passes.
11. `npm run build` succeeds; the `AppComponent` scaffold placeholder is gone.

## Decisions (human-signed-off 2026-07-17)

1. **"Overdue" = lapsed (a *past* missed due day). ✅ CONFIRMED.** A habit merely
   "due today, not done yet" stays in "To do today", not "Overdue".
2. **Calendar: monthly grid core + current-week strip on the dashboard; defer a
   standalone day view. ✅ CONFIRMED (monthly-first).**
3. **Navigation: three routes** (`/` dashboard, `/habits` manage, `/calendar`) with
   a top nav. **✅ CONFIRMED.**
4. **Completion % window: all-time** (since `createdIso`). Recommended for MVP;
   windowing (last-30-days) is a later slice. _Not separately queried — low-risk
   default; critic to sanity-check._
5. **Overall % definition: average of per-habit rates** (each habit weighs equally;
   simpler to explain) over pooled completed-due ÷ total-due. _Recommended default;
   flagged for the critic._

## Retrospective (2026-07-17)

**Did Analyst.md catch anything not thought about up front?**

Yes. The two harden passes (CriticReview R1–R12) surfaced 12 critical findings, 6 of which changed the spec:
- **R1:** `dayStatus` tie-break order was unspecified; fixed to `future→done→not-due→pending→missed`.
- **R2:** `completionRate` denominator needed to exclude `pending` today (fairness for in-progress days).
- **R4:** `isLapsed` must walk only to yesterday, not today (otherwise every pending-today habit is lapsed).
- **R5:** Month-grid alignment required local-date construction (same timezone trap as Phase 1/2).
- **R6:** Overall % over empty habit list returned NaN; added guard to render `—`.
- **R8:** Calendar deleting the selected habit left a dangling id; added fallback to first habit.

The Analyst's framing of "overdue = lapsed" (a *past* miss, not "due today but not done") was the single most load-bearing decision and defended well against confusion. The CriticReview hardened the boundaries sharply. Zero false starts; all findings corrected before coding.

**Did anything in tasks.md turn out to be wrong during coding? What?**

No. Tasks executed as written. The Haiku agent built all steps 1–8 correctly from the hardened spec: 6 new files (dashboard, calendar, nav), 8 modified (service + specs + routes + component), 60 tests pass, build succeeds. No rework needed. Code quality is high: service methods are pure and date-injectable; dashboard uses `computed` for reactive buckets; calendar handles month rollover (Dec→Jan, Jan→Dec) and deleted-habit fallback correctly; all acceptance criteria (§4, 11 points) verified at localhost:4200 end-to-end. Only note: CSS budget warnings on SCSS (cosmetic; not blocking Phase 4).
