# Vacation mode — Analyst

Roadmap: `specs/design-roadmap-v2.md` §1. Sized **Large** (service invariants +
persistence + a new modal and range picker + a new `DayStatus` across three
pages). Process: this Analyst → 2 harden rounds (`CriticReview.md`) →
`tasks.md` → code → post-code review.

Source of truth: `Habit Tracker Prototype.dc.html`, Claude Design project
`7089b0b3-0042-4029-bd4c-bef0ce5a6d19`. Values quoted here were read from the
source on 2026-10-15, not from screenshots.

---

## 1. What problem are we solving?

A user going away for a week has two bad options today:

- **Do nothing.** Every due day while they're away becomes `missed`, and every
  streak dies.
- **Pause each habit by hand** on the way out, then resume each one on return.
  That's 2 × N clicks. It only works if they remember on the day they leave.
  And nothing can be scheduled in advance, because `pause()` always opens
  *today* with `to: null`.

The prototype answers this with one global **Vacation mode**: pick a date range
once, and every habit is paused across it. This also closes the long-open
`ROADMAP.md` question "Can users skip holidays?".

## 2. What is in scope?

### 2.1 Model — a global vacation record, not per-habit ranges (proposed AD-035)

- **New type** `Vacation { from: string; to: string }`. It's half-open
  `[from, to)`, like `PausedRange`, so `to` is the **resume date** and is never
  null.
- **Storage:** its own localStorage key, `habit_tracker.vacations.v1`, holding a
  `Vacation[]`. It sits beside `habits.v1` and `stacks.v1`, so the habits array
  shape and its `STORAGE_KEY` are unchanged and there's no migration. Load
  follows AD-002: drop a malformed row, keep the valid ones.
- **The list keeps history.** A past vacation must stay stored forever. If it
  were deleted, its days would turn back into `missed` and the streaks it
  protected would break.
- **One predicate is the seam.** `HabitService.isPausedOn(habit, iso)` returns
  true if *either* one of the habit's own `pausedRanges` covers `iso` *or* any
  vacation covers `iso`. `isDueOn` already calls `isPausedOn`. So every
  derivation (streaks, rates, perfect days, lapsed, pooled counts, heatmaps)
  treats vacation days as neutral with **no further change** (AD-004).
- **Why global and not per-habit.** Writing a closed range into every habit's
  `pausedRanges` would reuse the existing math too, but it costs four things:
  1. a habit created *during* a vacation isn't covered;
  2. edit and end become N-record operations that must find "the vacation
     range" among each habit's manual ones;
  3. `resume()` and `archive()` reason about the open range, and would have to
     learn to skip the vacation range;
  4. the prototype's own shape is one `{ start, days }`.

  A global record keeps start, edit and end as one-record operations, and leaves
  `pause` / `resume` / `archive` / `reactivate` **untouched**.
- **Ownership: `HabitService` itself, not a new service** (CriticReview R1).
  `habit.service.spec.ts` constructs `new HabitService()` 62 times, outside
  any injection context, so a field `inject(VacationService)` would throw in
  every one of them. Instead `HabitService` gains:
  - a private `_vacations` signal, loaded from and persisted to its own key;
  - a public read-only `vacations` signal;
  - `startVacation` / `updateVacation` / `endVacation`.

  `isPausedOn` reads `_vacations()`, so every `computed` that reads a
  derivation re-runs when a vacation changes. The vacation logic lives under
  one `// --- Vacation` banner, and `Vacation` / `isVacation` live in
  `habit.model.ts`.
- **Every vacation method takes `today: Date = new Date()`**, following the
  house convention (`isPaused`, `currentStreak`), so specs can pin a date.

### 2.2 Invariants

- **I1 — At most one current-or-upcoming vacation.** That means at most one
  vacation with `to > today`. Starting a new one when one is current or upcoming
  is an *edit* of that one, not an append.
- **I2 — No overlap with past vacations.** This follows from I1 + I3 and needs
  no guard of its own (CriticReview R12). A past vacation has `to <= today`,
  and a new or edited range has `from >= today`.
- **I3 — Nothing starts in the past.** `from >= today` for a new vacation. Past
  days are disabled in the picker *and* refused by the service (guards live in
  the service, not the component, matching `toggleOn` in 6a).
- **I4 — Non-empty.** `to > from`, so the minimum is 1 day.
- **I5 — Ending truncates, never deletes, an underway vacation.** "I'm back" on
  a vacation with `from <= today < to` sets `to = today`, so today is live
  again. On a vacation that hasn't started (`from > today`), it **removes** the
  record, because nothing elapsed. A vacation that started *today* and ends
  today gives `from === to`, which is empty and is also removed. *(This
  deliberately diverges from the prototype's `vacEnd`, which nulls the whole
  vacation and would mark the elapsed days missed.)*
- **I6 — Editing an underway vacation keeps its `from`.** Only the end can
  move, and the new end must be ≥ today (inclusive end), i.e. `to >= today + 1`.
  *(This also diverges: the prototype's `vacShow` resets the start to today,
  which silently un-pauses the elapsed days.)* Shortening the vacation to end
  today is "I'm back", not an edit.

### 2.3 Manual pause vs vacation

- `HabitService.isPaused(habit, today)` keeps its **current meaning**: the
  habit's own ranges only, i.e. "the user paused this habit". It's renamed
  `isManuallyPaused` so nobody reads it as "not due today". The Habits page's
  Pause/Resume button, "Paused" badge and "paused since" line read it.
  - **Result: during a vacation the button still says "Pause"**, and works. It
    opens an ordinary manual range that outlives the vacation. **That is the
    fix for the roadmap's "Resume is a no-op" bug.**
- A habit **already manually paused** when a vacation starts stays manually
  paused. The ranges overlap, which is harmless under `.some()`, and it still
  needs a manual Resume after the vacation ends.
- **Archiving mid-vacation:** no interaction. `archive()` only touches the
  habit's own ranges, and the vacation keeps covering it (it's not due anyway).
- On the Habits page, a habit card's "not today" chip reads **"paused"** on a
  vacation day (prototype `ntLabel`).

### 2.4 `DayStatus` gains `'paused'` (proposed AD-036)

The prototype styles a distinct paused day. On the habit-detail month circle it
is bg `#eef2f7`, text `#7b8794`, border `1.5px dashed #b6c2d0`, tooltip
"Vacation · paused". On the Calendar it is bg `#eef2f7`, border `#b6c2d0`, text
`#7b8794`. So `'not-due'` ("Not scheduled") is no longer an acceptable rendering.

- **New order in `dayStatus`:**
  1. `done` — record of what happened, AD-014. Today's completedDates are never
     future, so moving this ahead of `future` is behaviour-identical.
  2. before start date → `not-due`.
  3. `isPausedOn` → **`paused`**. This **includes future days**, so an upcoming
     vacation is visible on the Calendar, as in the prototype, where `paused`
     outranks `future`.
  4. `future`.
  5. not scheduled → `not-due`.
  6. `pending`.
  7. `missed`.
- **It covers both reasons**, manual pause and vacation, because the predicate
  is one function. A manually paused habit's days now render `paused` instead
  of `not-due`, and so do its future days while the range is open. This changes
  existing behaviour and existing tests on purpose. The two are the same
  state, so they should look the same.
- **Where it lands:**
  - the Calendar: `STATUSES`, cell class, and a **Paused legend item**. The
    prototype legend has none; adding one is a deliberate addition, because
    without it the colour carries meaning on its own (AD-006).
  - the habit-detail month circles: `status-paused`, with `title="Paused"`.
    The prototype says "Vacation · paused", but `paused` now covers manual
    pauses too (Q1), so the reason-specific text would be wrong half the time.
    The app's circles have no other tooltips, so this is the only one
    (CriticReview R6).
  - Analytics: vacation days have nothing due, so `dailyPooledRates` gives
    `null` and the heat grid renders those days as "no data". That's correct
    under AD-010 and needs no code change, but it is a visible effect and is
    listed here so it isn't mistaken for a bug (CriticReview R8).
  - `calendar.design.spec.ts` / `habit-detail.design.spec.ts`: pin the paused
    computed style, with values taken from the prototype source.
  - `stripCellColor` (day-strip, activity-grid): `paused` maps to the existing
    not-due grey. The prototype gives those small cells no paused colour, and
    AD-015 is unchanged.
- **Grace check:** `completionRate`, `poolCounts`, `perfectDays` and
  `dueTodayCounts` all gate on `isDueOn` first, so a `paused` result never
  reaches their `done`/`missed` tally. `isLapsed` looks only for `missed`. The
  dashboard's `isRecentlyLapsed` skips anything that isn't `done`/`missed`.
  None of them change. The critic should confirm each.

### 2.5 UI — Dashboard

- **The header button**, left of "Overall completion": 🌴 plus "Vacation mode",
  or **"Edit vacation"** when a vacation is current or upcoming. It opens the
  modal.
- **The banner** (shown when a vacation is current or upcoming), placed under
  the header and above the stat row. Its text:
  - **Dates everywhere in this feature use the format "Thu, Jul 23"** — the
    prototype's `fmtI(i, true)`: short weekday, comma, short month, day, with
    `en-US` pinned as in `formatBarDate`. That covers the banner, the summary
    and the resume date (CriticReview R7).
  - the title is **"On vacation · Thu, Jul 23 – Wed, Jul 29"** when it's
    underway, and
    **"Vacation scheduled · …"** when it's upcoming. *(The roadmap had these
    two the wrong way round; the source is `vacToday ? 'On vacation' :
    'Vacation scheduled'`.)* The end shown is inclusive (`to − 1`).
  - the sub-line is "All habits paused · streaks protected · resumes <`to`>".
  - the buttons are **Edit** (reopens the modal pre-filled) and **"I'm back —
    end vacation"** (I5). On an upcoming vacation, the second button's
    behaviour is "cancel vacation". Its label is an open question (§5, Q2).
- **The To-do empty state** during an underway vacation reads "Everything's
  paused while you're away. Enjoy the break." instead of "Nothing due today!".

### 2.6 UI — the modal (native `<dialog>`, AD-016's pattern)

- **The header:** a 🌴 tile, the title "Vacation mode", the line "Pause every
  habit while you're away. Paused days don't count as missed, so streaks stay
  intact.", and a close ✕.
- **The range picker:** a new `<app-range-picker>` in `src/app/shared/`.
  - It shows a month label, ‹ › (‹ is disabled at the current month), and S–S
    headers.
  - Past days are disabled. Today has a blue inset ring when it's outside the
    range.
  - Click 1 sets the start (length 1). Click 2, on a day ≥ start, sets the end.
    Click 2 on a day before the start restarts with a new start.
  - The cell states are start/end caps (solid `#0066cc`, white text, rounded
    outer corners) and between cells (`#e9f1fa` tint, blue text, 700).
  - The hint line reads "Click a start date, then an end date", then "Now click
    the last day of your vacation".
  - Week layout reuses `monthGrid`'s blank-padding arithmetic, extracted as a
    pure helper, rather than re-deriving weeks. The paging limit (+11 months in
    the prototype) is adopted.
- **The quick-length pills:** "3 days", "5 days", "1 week" (**the default for a
  new vacation**) and "2 weeks". Each sets the length *from the current start*,
  and the active pill is solid blue.
- **The summary box:**
  - "Paused · N day(s)" with "Thu, Jul 23 – Wed, Jul 29" (calendar days, not
    due days, as in the prototype);
  - "Habits resume" with the `to` date;
  - "✓ K active streak(s) (longest L days) will be kept".
- **K / L:** K = active (non-archived) habits with `currentStreak > 0`, and L =
  `topCurrentStreak`, both computed as of today. A manually paused habit with a
  streak counts, because its streak is kept too. When K = 0 the line reads
  "No active streaks to protect" (the prototype doesn't handle this case).
- **The buttons:** Cancel, and **Start vacation** (or **Update vacation** when
  editing).
- **When editing an underway vacation (I6):** the start is shown but locked.
  Clicks only set the end, the pills measure from the locked start, and any
  pill whose end would fall before today is disabled.
- **Default for a new vacation:** start = today, length 7.

### 2.7 Habits page

- The "not today" chip shows "paused" on a vacation day (§2.3).
- The Pause/Resume button reads `isManuallyPaused` (§2.3).

## 3. What is OUT of scope?

- **The mobile drawer's vacation entry.** The drawer doesn't exist yet. Phase 6b
  adds the item when it builds the drawer.
- **Per-habit vacation exemptions** ("keep Meditate going on holiday"). The
  prototype pauses every habit.
- **More than one upcoming vacation**, or a list/history UI of past vacations.
  Past records exist only to keep the maths right.
- **Editing or deleting a past vacation.**
- **A shared `app-modal` extraction.** The roadmap suggested it, but both
  existing modals are native `<dialog>` + `showModal()`, which already gives
  Esc, a backdrop and focus containment. A third native `<dialog>` costs a few
  lines. Extraction becomes a separate Small task if a fourth modal appears.
- **Completing a day during a vacation.** The dashboard's To-do list is empty
  then, so there's no path to it. If a `completedDates` entry exists on a
  paused day, it renders `done` and is excluded from rates, which is the
  existing behaviour. The interaction with backfill is 6a's to decide.
- **Hover-state fidelity for the picker** beyond the cursor change. The
  prototype defines no hover style for picker cells.
- **Timezone or midnight rollover while the page is open.** This is the existing
  load-time `today` convention across pages.

## 4. How do we know it is done?

Service (`*.spec.ts`; each "must not" case is its own test, per L-024):

1. The vacation store round-trips through localStorage. A malformed row is
   dropped and the valid rows survive. A missing key gives `[]`.
2. `start(from, to)` refuses `from < today`, `to <= from`, and a second
   current-or-upcoming vacation (I1–I4). Each refusal is a no-op with no persist.
3. `end()`:
   - underway → `to = today`, and the record is kept;
   - upcoming → the record is removed;
   - started today → removed;
   - a past vacation is never touched.
4. `edit` on an underway vacation keeps `from` and refuses `to <= today`.
5. `isPausedOn` is true across a vacation for a habit with no `pausedRanges`,
   and false on the resume date (half-open). A habit created mid-vacation is
   covered.
6. **Streak protection, end to end:** a habit with a 10-day streak, a 7-day
   vacation with no completions, then a completed day after it gives
   `currentStreak === 11`. With **no** vacation it gives 1. Ending the vacation
   early on day 3 keeps days 1–2 paused, so the streak survives.
7. `dayStatus` returns `paused` on vacation days (past *and* future), `done`
   wins over `paused`, and a day before `startDate` stays `not-due`. The full
   existing suite stays green except the tests that asserted manual-pause days
   are `not-due`. Those are updated to `paused`, and each one is listed in
   `tasks.md`.
8. `isManuallyPaused` is false for a habit covered only by a vacation, so the
   Habits button shows "Pause". It's true for a manually paused one.

UI:

9. The Dashboard button label switches to "Edit vacation". The banner title
   reads "Vacation scheduled · …" before the start date and "On vacation · …"
   once underway (pinned with an injected `today`). Edit reopens the modal
   pre-filled, and "I'm back" applies I5.
10. The picker:
    - a past day is disabled and clicking it does nothing;
    - click-click sets the range;
    - a pill sets the length from the start;
    - the summary shows N, the inclusive span, the resume date, and K/L
      computed from a spec fixture with a known answer. The fixture includes a
      zero-streak habit (excluded from K), an archived habit with a streak
      (excluded), and a manually paused habit with a streak (included). The
      roadmap's "K = 5" was the *prototype's* dataset, not the app seed
      (CriticReview R4).
11. The Calendar shows the paused fill and the Paused legend item.
    `calendar.design.spec.ts` pins the paused computed style against the
    prototype values. The habit-detail circle does the same in
    `habit-detail.design.spec.ts`.
12. `/design-check dashboard --seed` still matches with no vacation. Two new
    mockups are captured from the prototype at 1440px **before any UI step**,
    by the `design-page-tour` agent:
    - `design/target/dashboard-vacation.png`: an underway 7-day vacation;
    - `design/target/vacation-modal.png`: the modal open with its default
      7-day range.

    `scripts/design-shot.mjs` gains the tooling to reproduce both states
    (CriticReview R5):
    - a `--seed-vacation` flag that writes a 7-day vacation from today into
      `habit_tracker.vacations.v1`;
    - a `--click <text>` flag that clicks a button by exact text before the
      shot;
    - `ROUTES` / `STATES` entries for both names.

    Both composites match.
13. `npm test` is green, with the new count in `tasks.md`. `npm run build` is
    clean.

## 5. Decisions (user, 2026-10-15: "go with recommendations")

- **Q1 — Yes:** a manual pause renders `paused` too (§2.4). It's one predicate
  and one state. The habit card's "not today" chip also reads "paused" for a
  manually paused habit on a scheduled day.
- **Q2 — Yes:** on an *upcoming* vacation the banner's second button reads
  **"Cancel vacation"**. "I'm back — end vacation" is shown only while the
  vacation is underway.
- **Q3 — Yes:** Calendar gains a **Paused** legend item (AD-006). Its swatch
  uses the Calendar paused values: bg `#eef2f7`, border `#b6c2d0`.

---

## Retrospective

**Result.** 18 steps, run sequentially on 2026-10-15. Tests 456 → **514**,
build clean. No step needed a retry for a logic error.

**Acceptance criteria → proof** (`habit.service.spec.ts` unless noted):

| # | Proof |
|---|---|
| 1 | `HabitService — vacation store`: missing key → `[]`, malformed rows dropped, non-array → `[]` (Step 3) |
| 2 | Step 4 tests: refuses `from` yesterday, `to === from`, `to < from`, a second upcoming; no key written after a refused first call |
| 3 | Step 4 `endVacation` tests: underway → `to = today`; upcoming → removed; started today → removed; past vacation untouched |
| 4 | Step 4 `updateVacation` underway: accepts a later `to`, refuses moved `from`, refuses `to <= today` |
| 5 | Step 5 `isPausedOn honours vacations`: half-open bounds, habit started mid-vacation covered |
| 6 | Step 5 streak tests: 11 with vacation, 1 without, 11 after early end on 07-13 |
| 7 | Step 6 `dayStatus returns paused`: past + future `paused`, `done` wins, before start → `not-due`, future-start regression guard. Only edited pre-existing test: "…closed range are paused (AC 6, R6; AD-036)" |
| 8 | Step 5 `isManuallyPaused` tests; `habit-list.component.spec.ts` "paused chip on a vacation day" shows **Pause**, not Resume (Step 16) |
| 9 | `dashboard.component.spec.ts` `vacation` describe: label switch, "On vacation" / "Vacation scheduled", Cancel removes, "I'm back" truncates. Edit pre-fill: `vacation-dialog.component.spec.ts` underway case ("Update vacation", locked pills) |
| 10 | `range-picker.component.spec.ts` (8 tests) + `vacation-dialog.component.spec.ts` (6 tests, incl. the K/L fixture → `2 active streaks (longest 3 days) will be kept`) |
| 11 | `calendar.design.spec.ts` `CS['status-paused']`; `habit-detail.design.spec.ts` `status-paused circle`; design-check confirmed the "Paused" legend item and `status-paused(7)` in coverage |
| 12 | Step 9 mockups (2880 px); Step 17 design checks: `dashboard`, `dashboard-vacation`, `vacation-modal` match apart from seed-date/data residuals |
| 13 | `TOTAL: 514 SUCCESS`; `npx ng build` exit 0 |

**What changed from the plan.**
- Step 5 added 9 tests, not 7, so later "+N" arithmetic was off by 2; counts
  were recorded as actuals in `tasks.md`.
- Step 9 blocked first time: `design-page-tour` has no Claude Design MCP, so
  the top-level session minted the `serve_url` and passed it in (L-043).
- Step 16 had to generalise a pre-existing calendar design test that
  hard-coded "five statuses" (L-044).
- Step 13's "new tokens" list in the subagent brief was wrong (those were
  existing tokens); no values were invented.
- Several subagents wrapped `TEST` in `timeout`, which doesn't exist on macOS,
  and had to re-run.

**Open residual from Step 17.** In the `dashboard-vacation` target the
"Done today" card is empty; the app shows today's seeded completions. Read as
seed data (the prototype had none that day), not as "hide completions during a
vacation" — the spec never asks for the latter. Confirm with the user if in
doubt.
