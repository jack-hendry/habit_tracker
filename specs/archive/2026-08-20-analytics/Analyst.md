# Redesign §4 — Analytics (archived summary)

Roadmap section: `specs/design-implementation-roadmap.md` §4.
Design source: `Habit Tracker Prototype.dc.html` in the Claude Design project
[Habit tracker design exploration](https://claude.ai/design/p/7089b0b3-0042-4029-bd4c-bef0ce5a6d19),
lines 179–246 (markup) and 453–474 (`aggCells`, `bars14`, `dow`, `bestDow`,
`perfectDays`, the `du`/`dn` totals).
Mockup: `design/target/analytics.png` (1440 CSS px).

Size: **Large** — a whole new page, three new service derivations, two new
shared viz components (`<app-heat-grid>`, `<app-bar-chart>`), and the app's
first chart primitives. 14-step `tasks.md`, 2 harden rounds, plus a review
after coding.

Test count: **251 → 339** (`npx ng test --watch=false --browsers=ChromeHeadless`).

Decisions produced: **AD-023, AD-024, AD-025, AD-026, AD-027**. Lessons:
**L-029, L-030**.

---

## 1. What was built

- `/analytics` replaces the §0 placeholder wholesale: header (`Analytics` +
  a derived subtitle), a 4-up stat row, a full-width activity heatmap, and a
  two-column row (leaderboard `flex:1.35` / bar chart + weekday card `flex:1`).
- **Stat row** — Completion rate, Habits completed, Perfect days, Best active
  streak, each a bare `<app-stat-card>` (no sub-line, no owner name on the
  streak card, unlike the Dashboard's equivalent).
- **All-habit activity heatmap** (`<app-heat-grid>`, new) — Sunday-aligned
  18-week window (`activityWindowDays`), 7-row column-flow grid, 13px cells,
  five-step blue intensity ramp keyed to the pooled completion rate for that
  day across all active habits:

  | pooled rate `r` | fill |
  |---|---|
  | `0` or nothing due | `--heat-0` (`#ebedf0`) |
  | `< .35` | `--heat-1` (`#c7dcf1`) |
  | `< .7` | `--heat-2` (`#7fb0de`) |
  | `< 1` | `--heat-3` (`#3c87cd`) |
  | `1` | `--heat-4` (`--accent`, `#0066cc`) |

  Month labels are derived from the window (one per column where the month
  changes), never transcribed from the prototype's hand-positioned literals.
- **Habit leaderboard** — ranked rows (rank, icon, name as a `routerLink` to
  `/habits/:id`, a track filled in the habit's own hex, an integer rate).
  Scored from `lifetimeCounts`, not `completionRate` (AD-023). A habit with
  no resolved due day renders `—` with a 0-width bar and sorts last.
- **Completions per day · last 14** (`<app-bar-chart>`, new) — raw per-day
  completion counts (not due-guarded), 6% height floor for zero days, the
  tallest bar(s) highlighted in accent, everything else pale (AD-024).
- **Completion by weekday** — seven pooled rates over all history, the best
  weekday bolded with an accent fill and an insight line (`"<Day>s are your
  strongest"`); a genuine tie picks the earliest weekday, matching
  `topCurrentStreak`'s rule.
- **New service derivations** (`HabitService`, pure + live, AD-004):
  `dailyPooledRates`, `dailyDoneCounts`, `weekdayRates`, plus `lifetimeCounts`
  and `activityWindowDays` (used across the page).
- **New tokens** on `:root` in `src/styles.scss`: `--heat-0`…`--heat-4`,
  `--bar-max`, `--bar-rest`, `--bar-label`, named after the page (AD-020).

## 2. The decisions that carry

**AD-023 — the leaderboard ranks by `lifetimeCounts`, not `completionRate`.**
`completionRate` returns `1` (and a 0–1 fraction) for a habit with no
resolved due day; binding it directly would rank a brand-new habit first at
100% and render 1px-wide bars everywhere else. The leaderboard scores each
row from `lifetimeCounts(habit)` directly instead — a second, per-habit
caller choosing the right primitive rather than the closest-sounding one.
`completionRate` itself is untouched; it stays pinned by the Dashboard and
habit-detail specs.

**AD-024 — the bar chart and weekday "best" highlight the maximum, not
"today."** The prototype's `bb.v === mx` is the tallest bar in the window,
not the current day's — this is §4's version of AD-011. Getting it backwards
produces a page that matches the mockup today and is wrong every other day.
Deliberate deviation: an all-zero window highlights nothing, not every bar.

**AD-025 — three per-day derivations, not two** (extends AD-014).
`dailyPooledRates` (heatmap) is due-guarded like `poolCounts`; `dailyDoneCounts`
(bar chart) is a raw tally with no `isDueOn` guard, like `recentStatuses`.
Merging them into one pass would force one caller to consume the wrong
semantics — exactly the unification AD-014 already forbids.

**AD-026 — `<app-heat-grid>` stays separate from the day-strip/activity-grid
family** (extends AD-018). Same 7-row geometry, different input contract
(`rate: number | null` vs. a status enum) and mutually exclusive colour
modes — shared geometry does not imply a shared component.

**AD-027 — `--heat-4` and `--bar-max` are `--accent` by identity.** Both
declared as `var(--accent)`, not a re-sampled `#0066cc` literal, because
they are the same design role (the strongest signal on the page), not a
coincidentally-equal hex that could drift apart later.

## 3. What changed from the plan

Two harden rounds (`CriticReview.md`, now folded into this summary) found:

1. **R1/R2 🔴** — the leaderboard plan originally bound rows to
   `completionRate`, which collapses "no resolved due day" to `100%` and
   returns a 0–1 fraction, not 0–100. Both would have shipped a
   plausible-looking page with wrong numbers. Fixed → AD-023.
2. **R3 🟡** — leaderboard tie order was undefined. Fixed: ties keep
   `activeHabits()` order; zero-countable rows sort last regardless.
3. **R4 🟡** — `dailyDoneCounts` had no label source. Fixed via
   `HabitService.shiftIso` day-of-month extraction.
4. **R5 🟡** — the planned weekday extraction (`new Date(iso+'T00:00:00').getDay()`)
   invited a UTC bug. Fixed via the house split-parts construction (AD-003).
5. **R8 🔴** — Step 12 as originally written (a `data-state` attribute) was
   invisible to `design-shot.mjs`'s `reportStateCoverage`, which counts via
   `document.getElementsByClassName` — the step could not have done its job.
   Fixed by moving state classes (`heat-0…4`, `bar-max`/`bar-rest`,
   `dow-best`/`dow-rest`) into the steps that already own the markup. → L-029.
6. **R9 🟡** — the heatmap's month-label *placement* has no design source to
   check against (the prototype's labels are hand-positioned literals) —
   named as a known verification gap rather than papered over; checked
   manually across a month boundary instead.
7. **R10/R11 🟡** — confirmed, not changed: three per-day derivations stay
   three (AD-025), and `<app-heat-grid>` stays its own component (AD-026).
8. Separately, during this spec's harden-round verification: a mutation
   check against the (already correctly-ordered) demo seed passed with a
   sort comparator's tie-break clause deleted, because `Array.sort`'s
   stability made the deleted code's effect and the default behaviour
   indistinguishable on that fixture. Fixed by rewriting the fixture so the
   tied elements' pre-sort order disagreed with the intended tie order. → L-030.

## 4. Acceptance criteria — final result (2026-08-20)

| AC | Result |
|---|---|
| `/analytics` renders header, 4 stat cards, heatmap, two-column row | ✅ |
| `design:shot` composites cleanly; states coverage read and reported | ✅ 9 states in `STATES` map (`heat-0..4`, `bar-max`, `bar-rest`, `dow-best`, `dow-rest`) |
| `analytics.design.spec.ts` asserts computed style from design source | ✅ all 5 heatmap steps, both bar states, both weekday states, leaderboard track |
| Unit specs for 3 new derivations + 2 new components, incl. `null` cases | ✅ |
| Mutation-checked (highlight-on-today, due-guard collapse, tie-break) | ✅ |
| `npx ng test` passes, baseline rises | ✅ 251 → 339 |
| `npm run build` succeeds, no new budget warning | ✅ |
| No raw hex in `analytics.component.scss`; new tokens on `:root`, page-named | ✅ `--heat-*`, `--bar-*` |
| Leaderboard name navigates to `/habits/:id` | ✅ |

## 5. Roadmap correction produced here

The roadmap's §4 prose ("a bar chart, today's bar highlighted", "six stacked
blocks", no mention of leaderboard links or the month-label problem) drifted
from the design in the same ways every prior section's roadmap prose had —
see AD-024 for the highlight correction. No scope change resulted; the
corrections were confined to *how* §4 was read, not what it covers. Stacks
(§5) remains untouched and planned.
