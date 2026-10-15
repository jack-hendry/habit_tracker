# Design Roadmap v2 — prototype re-check (2026-10-15)

Source: [Habit Tracker Prototype](https://claude.ai/design/p/7089b0b3-0042-4029-bd4c-bef0ce5a6d19?file=Habit+Tracker+Prototype.dc.html) (Claude Design).
The prototype file was edited after `design-implementation-roadmap.md` was written
(July), and every section of that roadmap has since shipped
(`specs/archive/2026-07-26-global-shell` … `2026-08-21-stacks`). So this
document is a **delta against the built app**, not a fresh plan. It is a
roadmap, not a spec.

**Headline:** the prototype has the same 5 nav pages as the app. The desktop
pages have one new feature, **Vacation mode** (§1). It also has a complete
**mobile mode** under 720px (§6), which the desktop-width tour did not see.
Everything else is already built.

Method: a page tour of the live prototype (the screenshots are in the job tmp
dir, not committed), diffed against `app.routes.ts`, each page's template, and
`HabitService`. No colours or sizes are recorded here. Read them from source via
`design-value-sampling` when a section is built.

---

## 0 — Global shell

**Current state.** `app.component.html` already has the logo, wordmark, five
nav pills with `routerLinkActive`, and the right-aligned `barDate`.

**UI changes.** None found.

**New features.** None.

**Critic Review.**
- The prototype now **lands on Habits**, not Dashboard. Treat this as a prototype
  artefact (it's whichever page was last open), not a request to change the `''`
  route. Flag it to the user rather than acting on it.
- The tour reported no per-habit detail page, but the source has one: the
  `page: 'goal'` view, opened by clicking a habit name, with the nav showing
  Habits as active. It matches the app's `habits/:id` (shipped 2026-08-18).
  Re-diffed in Phase 0, below.

**Phase 0 result (2026-10-15, read from source).**
- **Desktop shell: no delta.** Every value in the prototype's bar (54px sticky,
  `0 28px` padding, 24px gap, logo 22px/6px radius, wordmark 14.5/700, pills
  `7px 13px` 13.5px, active `#e9f1fa`/`#0066cc`/600, inactive `#565b63`/500,
  date 12.5px `#8a8f96`) matches `app.component.scss` and the `styles.scss`
  tokens. The mobile bar is §6.
- **Habit detail (`page: 'goal'`): static layout unchanged.** The hero, Activity
  (18 weeks), month circles and "<Month> so far" card match
  `habit-detail.component.html`. Three *behavioural* deltas, none for §0 to
  build:
  1. **Month circles are clickable (backfill).** `toggleDay` acts only on
     `done` / `missed` / `pending` cells, never `paused`, `notdue` or `future`;
     clicking today toggles today. Tooltips: "Click to mark done", "Done · click
     to undo". No back-window limit within the data. This answers two of 6a's
     Analyst questions, so hand it to `backfill-completion`.
  2. **A "logged late" marker exists:** a 4px white dot at the cell bottom and
     the tooltip "Logged late · click to undo". `phase-6-plan.md` 6a puts this
     explicitly **out of scope**. A conflict for the user / 6a Analyst to settle.
  3. **A `paused` status is styled:** the detail circle is `#eef2f7` bg,
     `#7b8794` text, `1.5px dashed #b6c2d0`, tooltip "Vacation · paused"; the
     Calendar's status map (`CS`) has `paused: { bg #eef2f7, bd #b6c2d0,
     tc #7b8794 }`. The Calendar legend still has **no** Paused item. This
     partly settles §1's `DayStatus` question: the design does want a distinct
     paused status. A habit card's "not today" chip also reads **"paused"** on
     a vacation day.

## 1 — Dashboard

**Current state.** The page already has:
- the "Overall completion" header;
- the four stat cards: Today with a progress bar, Longest active streak with
  its owner, Perfect days, and Last 7 days with a "vs prior month" delta and
  tone;
- the To do / Done / Overdue-slipping sections.

All of it is derived in `HabitService` (`dueTodayCounts`, `topCurrentStreak`,
`perfectDays`, `isLapsed`, `lastDoneIso`).

**UI changes.**
- A **"Vacation mode" button** (palm icon) in the header row, left of the
  overall-completion block.

**New features — Vacation mode (the only real delta in this pass).**

The modal holds:
- the title, the line "Pause every habit while you're away. Paused days don't
  count as missed, so streaks stay intact.", and a close ×;
- a **range-picker month calendar** with prev/next and Sun–Sat headers. Past
  days are disabled, and today is the default start. Clicking sets the start,
  then the end. The selected range shows end-caps plus a tinted middle;
- **Quick-length pills** (3 days / 5 days / 1 week, the default / 2 weeks),
  applied *from the start date*;
- a **derived summary box**: "Paused · N days" with the date span, "Habits
  resume" with the resume date, and "✓ K active streaks (longest L days) will
  be kept";
- the buttons Cancel and **Start vacation**.

Most of the model already exists. `pausedRanges: { from, to }` is a
half-open `[from, to)` interval, and `isDueOn` / streaks / `dayStatus` already
treat paused days as neutral. The prototype's "7 days, Jul 23–29, resumes
Jul 30" is exactly `{ from: '2026-07-23', to: '2026-07-30' }`. So the work is:
- a `HabitService.pauseAll(from, to)`, or a `pauseRange(id, from, to)` applied
  across the active habits;
- the modal component and the range-picker calendar;
- the summary derivation.

**Critic Review.**
- **Bounded and future ranges break existing invariants.** Today's code assumes
  a pause opens *today* with `to: null`. `resume()` looks for the open
  (`to === null`) range, and `archive()` closes open ranges. A vacation range
  is closed from birth and may start in the future. Questions the spec must
  answer:
  - Does Habits' Pause/Resume button show "Resume" during a vacation? With
    today's code `isPaused` is true but `resume()` is a no-op, because no
    range is open. **That is a bug waiting to happen.**
  - What happens to a habit that is already manually paused when a vacation
    starts? Overlapping ranges are legal under `.some()` but need a decision.
  - What happens when a habit is archived mid-vacation?
- **The after-state, read from the prototype source.** The tour didn't click
  Start vacation, so this comes from the code:
  - The prototype holds vacation as **one global `{ start, days }`**, not
    per-habit.
  - While a vacation is on, the Dashboard header button reads **"Edit
    vacation"**.
  - A **banner** reads "On vacation · Jul 23 – Jul 29" before the vacation
    starts, or "Vacation scheduled · …" once it is underway. Its sub-line is
    "All habits paused · streaks protected · resumes …". The banner has an
    **Edit** button (which reopens the modal pre-filled) and an **"I'm back —
    end vacation"** button.
  - The "To do" empty state gets a vacation-specific line.
  - The mobile drawer also carries the vacation button.
- **"I'm back" must truncate, not delete.** The prototype's `vacEnd` sets the
  vacation to `null`, which would turn the already-elapsed vacation days into
  *missed* and break the very streaks the feature promised to protect. In the
  app, ending early must set `to = today` on the range. Editing a vacation that
  has already started needs the same care.
- **Model choice: a global vacation vs. a per-habit range.** The prototype's
  single global object fits a separate `vacation` record better than writing
  `pausedRanges` into every habit. The trade-off goes in the Analyst, and gets
  an `AD` entry. A per-habit range reuses all the existing math; a global
  record keeps "edit / end vacation" a one-record operation.
- **"K active streaks" is a real derivation**, not copy: active habits with
  `currentStreak > 0`. The demo gives 5, because Sleep by 11pm has streak 0
  and is excluded. "Longest L" reuses `topCurrentStreak`. Decide whether a
  habit that is already paused counts.
- **Calendar has no "Paused" legend item.** A vacation day currently renders as
  `not-due` ("Not scheduled"). Decide whether that's acceptable or whether
  `DayStatus` gains `'paused'`, which would touch `STATUSES`, the legend,
  `status-colors.ts` and `calendar.design.spec.ts`.
- **The range picker is a new widget**, distinct from Calendar's status grid. It
  has selectable days, disabled past days, and start/end/between states.
  Interaction states like these need their own mockup capture, because a static
  shot won't show the hover and selection states (CLAUDE.md, Design comparison).
- **The resume date is the exclusive `to`.** Keep the model's existing
  half-open convention. Do not store the inclusive end and add 1 in a dozen
  places.
- **Phase 6a interaction:** `backfill-completion` lets you tick past days. That
  must not be blocked on a vacation day, which counts as not-due, or that
  behaviour must be decided explicitly. Whichever of the two specs opens second
  owns the cross-check.
- **Roadmap tie-in:** this answers the long-deferred open question "Can users
  skip holidays?" in `ROADMAP.md`. The habit-lifecycle Analyst explicitly
  deferred "vacation presets", so it's in-scope now, and both should be updated
  when it ships.

**Size:** **Large**, under `CLAUDE.md`. It touches the service invariants,
persistence semantics, a new modal and picker, and possibly `DayStatus` across
three pages. It needs its own `specs/vacation-mode/` with Analyst + 2 harden
rounds + a post-code review. Not Complex: modals exist (`habit-list`,
`habit-detail`) and the pause model exists.

## 2 — Habits

**Current state.** Built:
- the category filter with an Uncategorised option, and Show archived;
- per-habit cards with the accent stripe, schedule, category, streak and best
  chips;
- the "not today" state, the 30-day sparkline (`recentStatuses`), and the
  Pause / Edit / Archive / Delete actions;
- the habit form.

**UI / new features.** None found.

**Critic Review.**
- The tour couldn't open "+ New habit", "Edit" or "Show archived", because they
  are non-functional in the prototype. So **the forms were not re-verified**
  against the new prototype. Run `/design-check habits` with `--seed` to
  confirm the static list still matches, and treat the forms as unchanged.
- The Pause button's label is coupled to the Vacation critic point above.

## 3 — Calendar

**Current state.** Built:
- the habit `<select>` plus the identity strip, and Prev/Next month navigation;
- the status grid (`monthGrid`, `dayStatus`) and the six-item legend.

**UI / new features.** None found.

**Critic Review.**
- Whether Next is disabled in the current month wasn't checked against the
  app. The prototype disables it. Verify that in the app; it's a one-line fix
  if missing (a Small task).
- The tour saw only done / missed / future / today. **Pending and Not scheduled
  went unverified by this pass.** `calendar.design.spec.ts` already pins those
  via computed styles (L-025), so no action is needed.
- A Vacation `'paused'` status, if adopted, lands here (see §1).

## 4 — Analytics

**Current state.** Built:
- the four stat cards and the 18-week heat grid (`heat-grid`);
- the leaderboard;
- the 14-day bar chart (`bar-chart`, `dailyDoneCounts`);
- the weekday bars with the "…s are your strongest" insight (`weekdayRates`).

**UI / new features.** None found.

**Critic Review.**
- **The weekday tie-break:** Thu and Fri both show 86%, the insight names
  Thursday, and only Thursday is highlighted. Tie-breaking is by weekday order.
  Check the app does the same, rather than picking the last max or highlighting
  both. This is a candidate one-line spec assertion.
- **The 14-day chart highlights the first bar (day 10)**, which is the tallest,
  not today. Confirm the app highlights the *peak*, or note it as a deliberate
  divergence.

## 5 — Stacks

**Current state.** Built:
- `Stack` model, `StacksService` and `stack-form`;
- the anchor box, the THEN chain, drag-to-reorder, the per-stack "N of M done
  today" (scheduled-today only), and the unstacked tray.

**UI / new features.** None found.

**Critic Review.**
- In the prototype, Read 20 pages shows streak **23** on Stacks and **22** on
  Habits after a same-session check-in. This is a prototype inconsistency, so
  don't copy it. The app derives both from `currentStreak`, so they agree.
- The prototype's "+ New stack" appends a default card with no form. The app's
  `stack-form` is richer, so keep it.

## 6 — Mobile layout (prototype source only; the tour was desktop-width)

**Current state.** `src/` has zero `@media` queries. Phase 6b
(`mobile-layout`, in `specs/phase-6-plan.md`) is planned on the assumption that
"every mockup in `design/target/` is desktop". **That assumption is now
out of date:** the prototype has a full mobile mode. The tour missed it, and so
did the first draft of this roadmap.

**How the prototype does it.** It uses no CSS media queries. JavaScript
watches `window.innerWidth` on resize, and one breakpoint applies: under
**720px**, a mobile layout object switches paddings, grids and widths.
Translate that to SCSS `@media (max-width: 719.98px)`, and don't port the JS
approach.

**UI changes (per area, mobile only).**
- **Shell:** the desktop bar is replaced by:
  - a **hamburger** (44×44 tap target);
  - the logo plus **the current page's title**, not the wordmark;
  - a short date ("Jul 23").

  The hamburger opens a **slide-in drawer**, with a backdrop, the logo,
  wordmark, a ✕, the five nav items and the Vacation button. It is a new shell
  component, and none of this exists today.
- **Stat-card rows:** four columns become **two**, on Dashboard and Analytics.
- **Two-column sections** (Analytics cards, the habit-detail layout) become a
  single **column**. A desktop-only vertical divider is hidden.
- **Calendar:** the cells become fluid width (`minmax(0,1fr)` × 7) instead of
  fixed, and shorter.
- **Analytics leaderboard:** the label column gets narrower.
- **Stacks:** the cards go full width.

**New features (mobile only — behaviour, not layout).**
- **Swipe to check off** on the Dashboard habit rows, with the hint "Swipe a
  habit left or right to check it off". Swiping is horizontal-drag tracking
  with a transform. A completed swipe triggers a **haptic tick**
  (`navigator.vibrate`) and a check-circle "pop" scale animation.
- **Pull-to-refresh** at the top of the page: pull, then "refreshing", then
  "done". It is suppressed while the drawer or the vacation modal is open.
  With localStorage there is nothing to refresh, so it is cosmetic until
  Phase 6d gives it a real meaning: re-fetching from the server.
- **Stacks edit mode.** Drag is **disabled** on mobile. A mobile-only **Edit**
  toggle in the header shows reorder arrows and the × remove buttons, and
  hides the check circles and the streak meta. The unstacked hint changes to
  "use '+ Add habit' on a stack".

**Critic Review.**
- **This belongs in Phase 6b, not a new phase.** Rewrite 6b's per-page slices
  against this source, not against a guessed layout. 6b becomes **less
  Complex**, because the design questions are answered. But it gains three
  interaction features (swipe, pull-to-refresh, Stacks edit mode) that were
  not in its scope.
- **The swipe gesture and Phase 6a overlap.** 6a adds tappable past-day cells,
  and swipe is a second check-off path for *today*. Both should call the same
  `toggleOn(id, iso)`.
- **Pull-to-refresh is a 6d dependency in disguise.** Don't build it in 6b, or
  build only the gesture. Without a server it's theatre.
- **Mockups:** `design/target/` needs **390px** captures per page. Use
  `design-value-sampling` to capture the prototype at that width. The
  prototype's own breakpoint is 720, so any width below it renders the mobile
  layout.
- **The drawer, swipe and edit-mode states** are interaction states. A static
  shot won't verify them; they need their own captures or computed-style specs.

---

## Suggested build order

1. **Update `specs/phase-6-plan.md` slice 6b** to point at this section. Its
   "no mobile mockups" premise is wrong.
2. **Three Small checks** from the critic passes, each a Quick Task:
   - Calendar Next disabled in the current month;
   - the Analytics weekday tie-break;
   - the Analytics 14-day peak highlight.
3. **`vacation-mode` (Large)**, with its own spec. Sequence it relative to
   Phase 6a, since both touch past/paused-day semantics. Open it **before** 6a
   if possible, so 6a's `toggleOn(id, iso)` is written knowing about bounded
   pause ranges.

## Shared primitives

- **Range-picker calendar.** It is new, but it should reuse the month-grid
  date math (`monthGrid`'s week layout) rather than re-deriving weeks.
- **The modal shell.** Two ad-hoc modals already exist (habit-list and
  habit-detail), and Vacation would be the third. Extract a shared
  `app-modal` (backdrop, close ×, focus trap, Esc) as step 1 of vacation-mode
  instead of copying a third time.
- **`pauseRange(id, from, to)`.** It generalises `pause()`. Write it once in the
  service, and have both manual pause and vacation go through it.
