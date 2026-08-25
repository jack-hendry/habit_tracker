# Design Implementation Roadmap

Source: [Habit Tracker Prototype](https://claude.ai/design/p/7089b0b3-0042-4029-bd4c-bef0ce5a6d19) (Claude Design).
Purpose: a high-level map for bringing the running Angular app up to the mockup.
Each section states **what changes in the UI** and **what new features/derivations**
must be built. A **Critic Review** at the end of each section checks the summary
against the screenshot so nothing is missed.

Scope note: this is a *roadmap*, not a spec. Per `CLAUDE.md`, the two new pages
(Analytics, Stacks) are **Large/Complex** and each needs its own `Analyst.md` +
`tasks.md` + harden rounds before code is written. The three existing pages are
**restyle + small feature adds** (Medium).

---

## 0 — Global shell (affects every page)

**Current state.** `app.component.html` is a bare text `<nav>` with three links
(Dashboard, Habits, Calendar). No logo, no active-state styling beyond a class,
no page chrome, no date. Content sits flush-left with no background.

**UI changes.**
- Sticky top bar: checkbox-in-blue-rounded-square **logo** + `HabitTracker`
  wordmark on the left.
- Nav becomes **5 items** — Dashboard, Habits, Calendar, **Analytics (new)**,
  **Stacks (new)** — with an active item rendered as a filled blue pill.
- Right-aligned **current date** in the bar: `Thu · Jul 23, 2026`.
- Page shell: light-gray background, a centered max-width content column
  (~1150px), white rounded cards with subtle borders/shadows as the surface.

**New features.**
- Two new routes (`/analytics`, `/stacks`) registered in `app.routes.ts`.
- A live "today's date" formatter for the bar.

**Critic Review.** ✅ Matches all five screenshots (bar is identical across
pages). Gap caught: the app currently has **no** Analytics/Stacks routes, so the
shell change and the two new pages are coupled — the nav can't show 5 items until
those routes at least stub out. Note the logo is a *checkbox* glyph, reinforcing
the product metaphor; don't substitute a generic icon.

---

## 1 — Dashboard

> ✅ **Built** (2026-08-18) — spec in `specs/archive/2026-08-18-dashboard-redesign/`,
> decisions AD-010…AD-013. Two claims below were **wrong** and were corrected
> against the prototype source during the build, so read them with care:
> **LONGEST ACTIVE STREAK** is the longest *current* streak (`currentStreak`),
> not an aggregate of `longestStreak` (AD-011); and `OVERALL COMPLETION` was
> **not** "already computed" — it averaged per-habit rates where every new card
> pools due-days, so it was switched to pooled (AD-010). Both are the kind of
> paraphrase §4 and §5 should expect to find in their own sections.

**Current state.** `Dashboard` heading + "Overall Completion" %; three plain
list sections: *To do today*, *Done today*, *Overdue / slipping*. Rows are
checkbox/name/%. No stat cards, no progress bar, no streak/perfect-day summary.

**UI changes.**
- Keep the three list sections but restyle rows as cards: color dot + emoji icon
  + name on the left, completion % on the right.
  - *Done today* rows get a **green left border** and a green checked box.
  - *Overdue / slipping* rows get a **red left border** and a
    `last done N days ago` label.
- `OVERALL COMPLETION 80%` moves to a small top-right label (already computed).

**New features.**
- A **4-card stat row** at the top:
  1. **TODAY** — `3 of 5 done` with a horizontal **progress bar**.
  2. **LONGEST ACTIVE STREAK** — `92 days` + the owning habit's name/icon.
  3. **PERFECT DAYS** — `34`, "every habit done" (count of days where every
     due habit was completed).
  4. **LAST 7 DAYS** — `75%` + green **delta vs prior month** (`+2 pts`).
- Derivations to add: perfect-days count, last-7-days completion rate, prior-month
  comparison delta, "N of M due today" counter. Streak-of-all-habits already has
  the building blocks (`longestStreak` per habit) — needs an aggregate + owner.

**Critic Review.** ✅ Sections and rows match. Gaps caught vs screenshot:
- The **TODAY card's progress bar** is a distinct element, not just text — call it
  out explicitly (done above).
- *Overdue / slipping* row shows both `last done 3 days ago` **and** the % — keep
  both (existing template already has `getLastDoneDaysAgo`).
- The stat cards use small-caps gray labels + large value + tiny sub-label; that
  label/value/sub triad recurs on Analytics, so build it as one shared card
  component. **Recommend a reusable `<stat-card>`.**

---

## 2 — Habits

> ✅ **Built** (2026-08-18, design-checked and archived 2026-08-19) — spec in
> `specs/archive/2026-08-19-habits-redesign/`. Three claims
> below were **wrong** and were corrected against the prototype source during
> the build: the 30-day sparkline has **no red** in it (both non-done states are
> near-greys, `#e9e9e7` and `#f5f5f3` — the critic's "Ship-side-project shows
> red gaps" was a paraphrase); the schedule chip is blue in **every** case, not
> only for the `Mon · Wed · Fri` variant; and the `+ New habit` button in the
> prototype is **dead** — no `onClick`, no modal markup anywhere in the file —
> so the create flow was designed from scratch, not transcribed. The build also
> found a whole page the roadmap had missed: see §2b.

**Current state.** `My Habits` + always-visible inline add form (text input +
schedule radios). Category filter chips + Show-archived toggle exist. Rows show
checkbox/icon/name, a meta line (category chip, schedule label, streak, best,
%), and text actions (Pause/Edit/Archive/Delete) with an inline edit form.

**UI changes.**
- Header gains a **`+ New habit`** button (top-right). The always-open inline add
  form is replaced by a create flow triggered from that button (modal or expanding
  panel). `Show archived` becomes a top-right button.
- Category filter stays as pill chips (`All / Health / Mind / Work`) — restyle.
- Each habit row is restyled to a single wide card:
  - Left: colored status border, checkbox, icon + **bold name**.
  - Meta chips under the name: **schedule chip** (`Daily`, or a blue
    `Mon · Wed · Fri` pill, or `Weekdays`), **category chip** (gray), current
    streak `22 🔥`, `best 22`, completion `87%`.
  - `NOT TODAY` pill when the habit isn't due today (grayed).
  - Right: a **30-day completion sparkline** (mini bar strip, `LAST 30 DAYS`),
    colored in the habit's color; missed/not-due days rendered faint.
  - Far right: `Pause · Edit · Archive · Delete` text buttons.

**New features.**
- **30-day sparkline per habit** — a new mini-viz driven by `dayStatus` over the
  last 30 days (done = filled color, missed = light red/gray, not-due = faint).
- **`+ New habit` create modal** replacing the inline add (name, schedule, plus
  the Phase 4a metadata fields the edit form already collects).

**Critic Review.** ✅ Row anatomy matches. Gaps caught vs screenshot:
- The sparkline is the biggest new build and easy to under-scope — it must
  reflect **status per day**, not just done/not-done, to match the faint cells in
  the mockup (Read-20-pages shows gaps, Ship-side-project shows red gaps). Flagged.
- The `best 22` label uses a plain "best N" (not "best: N" as current template) —
  minor copy delta, worth aligning.
- Archived rows in the current app render a simplified card with only Reactivate;
  the mockup's "Show archived" view isn't shown in the screenshot, so **keep the
  existing archived behavior** — don't assume the mockup redefines it.
- Edit is still needed (button present); the existing inline edit form can stay as
  the Edit target even if Add becomes a modal.

---

## 2b — Habit detail (NEW PAGE — missed by the original pass)

> ⚠️ **Added 2026-08-18**, during the §2 build. This section did not exist in
> the first pass and is the roadmap's largest omission so far.
>
> 🔴 **Corrected 2026-08-18** when the spec was written — see
> `specs/archive/2026-08-18-habit-detail/Analyst.md` ("What the roadmap got
> wrong") for the summary. **Five claims below are
> wrong**: the body has **three** cards (Activity heatmap, month *circle*
> calendar, and a `{Month} so far` summary card the section omits entirely), the
> hero also carries three stats + Edit/Archive buttons, `<app-day-strip>` is
> **not** reusable (7-row column-flow grid vs a linear bar row), the grid is a
> fixed Sunday-aligned trailing window and **not** all-history, and the month
> cells use a **second palette in which `missed` is grey, not red**. Trust the
> Analyst, not the prose below.

**Current state.** Does not exist. No route, no component.

**How it was missed.** On the Habits page the habit **name is a link** —
`onClick="{{ h.open }}"` with a `style-hover="color:#0066cc;text-decoration:
underline"` — opening a `page: 'goal'` view. In a screenshot that name is bold
black text, indistinguishable from a label, so §2's critic pass looked straight
at it and saw nothing. The link exists only in the markup. This is the same
class of miss as the nav's active/inactive colours living in the trailing
`<script type="text/x-dc">` rather than the markup (skill `design-to-roadmap`),
and it is the second time the lesson has cost something: **a prototype's
interactive surface is not visible in its screenshots — enumerate `onClick`
attributes in the source, not clickable-looking things in the PNG.**

**UI changes (all new).** From the source (`isGoal`, lines 247–300):
- A colour-tinted hero band in the habit's own colour, `max-width:900px` inside
  it — a **third** page column width, after Dashboard's 960 and Habits' 1000.
- `← All habits` back link (12.5px, `--accent`, 600).
- A **56px/800** current-streak number at `letter-spacing:-2px` with a
  `day streak 🔥` label in `#e8590c`, a 1px vertical rule, then a 52px rounded
  icon tile (12px radius, white, `rgba(0,0,0,0.1)` border) beside the name.
- An **all-history** cell grid (`cellsAll`) — the same three-colour mapping as
  §2's 30-day strip, over every day since the start rather than 30.
- Its own month navigation (`goalM`).

**New features (all new).**
- Route `/habits/:id` + a detail component, and the habit name on §2 becomes a
  `routerLink` (§2 deliberately renders it as **static text**, not a dead link).
- Reuses `<app-day-strip>` from §2 for the all-history grid — it already takes
  `statuses` + `hex`, so only the window changes.

**Sizing.** **Large** — a new route, a new page, and the first per-entity URL in
the app (every route today is a static path). Needs its own `Analyst.md` +
`tasks.md` + 2 harden rounds.

**Critic Review.** The hero's tint is derived from the habit's hex at low alpha
via the source's `hexA(hex, a)` helper, **not** a fixed tint — so it must come
from `colorOf`, like the leaderboard bars in §4. The 900px column confirms there
is no shell-level content width (global-shell AD-009) and that each page must
state its own; three pages now have three different values, which is worth
checking against §4 and §5 before either is built.

---

## 3 — Calendar

> ✅ **Built** (2026-08-19) — spec in
> `specs/archive/2026-08-19-calendar-redesign/`, decisions AD-020…AD-022. The section
> below undersold the work: it is **not** "mostly a restyle". Reading the
> prototype source turned up a structural change (nav + grid + legend collapse
> into **one** card), a per-status **day-number colour** the app painted flat
> grey, and the selector + selected-habit strip being **one** flex row. Three
> further claims here are wrong or incomplete: `future` does not merely need
> "confirming" — it was genuinely wrong (`#e0e7ff`/`#6366f1` vs the source's
> `#e7eaff`/`#8f95e8`); the prototype has a **sixth** cell state (`off`, for
> days before the dataset begins) that this app deliberately does not adopt;
> and "everything else already exists" skipped the fact that
> `calendar.component.spec.ts` did not exist at all. See
> the archived summary's §3 (the R1–R13 findings the harden round produced).

**Current state.** Habit `<select>` + selected-habit dot/name/category, month
nav (Prev / `July 2026` / Next), a Sun–Sat status grid, and a legend
(Done/Pending/Missed/Not scheduled/Future). Closest page to the mockup already.

**UI changes.**
- Mostly a **restyle** to match spacing, cell sizing, and colors:
  - Day number sits **top-right** in each cell.
  - Status fills: done = green, pending = amber, missed = red, not-scheduled =
    plain, **future = lavender/blue tint**.
  - **Today** cell gets a highlighted ring/border (the 23rd in the mockup).
- Legend gains a **`Today`** swatch (blue outline) alongside the existing five.

**New features.**
- `Today` as an explicit legend + cell treatment (the ring). Everything else
  (`dayStatus`, month grid, nav) already exists — this is the lightest section.

**Critic Review.** ✅ Grid, nav, selector, and five status colors all present in
the current build. Gaps caught vs screenshot:
- The mockup adds a **sixth legend item, `Today`**, and a distinct today-cell
  outline — current legend has five items and no today ring. Flagged (done above).
- Future days in the mockup are visibly **lavender-tinted**, not plain; confirm
  the current `status-future` color matches that tint during restyle.
- Selected-habit row in the mockup shows dot + icon + name + category chip —
  the current template already renders exactly this; no new work.

---

## 4 — Analytics (NEW PAGE)

> ✅ **Built** (2026-08-20) — spec in `specs/archive/2026-08-20-analytics/`,
> decisions AD-023…AD-027. Two claims below were **wrong** and were corrected
> against the prototype source during the build: the bar chart highlights the
> **tallest bar in the 14-day window** (`bb.v === mx`), not "today's bar" —
> the same class of mistake as Dashboard's AD-011 and Habits' streak claim,
> now this section's own instance (AD-024); and the leaderboard is scored
> from `lifetimeCounts`, not the raw `completionRate` this section implied —
> `completionRate` returns `1` for a habit with no resolved due day, which
> would have ranked a brand-new habit first at 100% (AD-023). Two things the
> section omitted entirely: the leaderboard's habit **name is a `routerLink`
> to `/habits/:id`** (§2b), and the heatmap's month-label *placement* has no
> design source to check against — the prototype hand-positions those labels,
> so it was verified manually rather than against source, unlike every other
> value on the page.

**Current state.** Does not exist. No route, no component, no aggregations.

**UI changes (all new).**
- Header: `Analytics` + `Last 18 weeks · since Mar 20` subtitle.
- **4 stat cards** (reuse the Dashboard `<stat-card>`): Completion rate `80%`,
  Habits completed `519`, Perfect days `34`, Best active streak `92 days 🔥`.
- **All-habit activity heatmap** — GitHub-style calendar grid (Apr→Jul), 5-step
  blue intensity, `Less → More` legend.
- **Habit leaderboard** — ranked list (1–6) with icon, name, a colored progress
  bar in each habit's color, and completion %.
- **Completions per day · last 14** — a bar chart, today's bar highlighted.
- **Completion by weekday** — Sun–Sat horizontal bars with %, plus an insight
  caption (`Fridays are your strongest`).

**New features (all new).**
- Route `/analytics` + `AnalyticsComponent`.
- Aggregations across all habits: overall completion rate, total completions
  count, perfect-days count, best active streak (with owner), per-day heatmap
  intensity over ~18 weeks, per-habit completion % (leaderboard), completions per
  day for the last 14 days, per-weekday completion rate + "strongest day" pick.
- A small **bar-chart** primitive and a **heatmap** primitive (both reusable).

**Critic Review.** ✅ All six blocks captured. Gaps caught vs screenshot:
- The header carries a **date-range subtitle** (`Last 18 weeks · since Mar 20`) —
  easy to forget; it implies a fixed 18-week window that the heatmap and cards
  share. Flagged.
- `Completion by weekday` has a **generated insight line** ("Fridays are your
  strongest"), not just bars — that's logic, not decoration. Flagged.
- The `Completions per day` chart **highlights today** (the `10` bar is darker) —
  a per-bar state, not a flat series. Flagged.
- Leaderboard bars are **per-habit colored** (violet/teal/blue/green/orange/slate)
  — reuse `colorOf`, don't hardcode. Flagged.

---

## 5 — Stacks (NEW PAGE)

> ✅ **Built** (2026-08-21) — spec in `specs/archive/2026-08-21-stacks/`,
> decisions AD-028…AD-032 and blocker B-003. The section's prose was wrong on
> eight points, three of which touched the data model: `@angular/cdk` does not
> exist (the page uses native HTML5 DnD, AD-028); the prototype has no rename/time/anchor
> editor (only create-with-defaults, AD-032 adds inline edit); and `aglyph` was
> completely omitted from the feature description. The palette gains indigo,
> coffee, moon, and clock (AD-029). The **done label denominator is "due today",
> not total members** — when a habit is not due today, it does not count toward
> the M in "N of M done". The habit name is a link to `/habits/:id`. An inline
> chip-picker gates the `+ Add habit` footer. A habit belongs to **at most one
> stack** (AD-030), and deletion prunes ids immediately while archiving hides the
> row and leaves membership unchanged (AD-031). Drag-drop is mouse-only with no
> keyboard reordering (B-003). The Analyst's close reading of the proto caught
> all eight and more before any code was written; none would surface in a static
> screenshot.

**Current state.** Built — route `/stacks`, `StacksComponent`, `Stack` data
model, full CRUD + drag-and-drop. 404 tests passing.

**UI changes (all new).** ✅ Matches all mockup details:
- Header: `Habit Stacks` + subtitle
  (`"After [current habit], I will [new habit]" — chain habits to an anchor…`) +
  a **`+ New stack`** button.
- **Stack cards**:
  - Title + time badge + `N of M done today` progress badge (M = members due today).
  - **Anchor row** — `ANCHOR · AFTER` + free-text trigger, tinted to the stack's color.
  - `THEN` connectors between rows.
  - Habit rows with a **drag handle**, check state (disabled if not due today),
    streak, `NOT TODAY` chip, and a **remove (×)**.
  - Inline **edit** and **delete** buttons in the card header.
  - `+ Add habit to this stack` footer (also a drop target).
- **Unstacked tray** — chips for habits in no stack, draggable onto a stack.
- **Empty state** — when no stacks exist, a dashed card explaining the feature
  + `+ New stack` button.

**New features (all new).** ✅ All implemented:
- New **data model**: `Stack { id, name, time, anchor, aglyph, color, habitIds[] }`,
  persisted to `habit_tracker.stacks.v1`.
- Route `/stacks` + `StacksComponent`.
- **Native HTML5 drag-and-drop** (AD-028): reorder habits within a stack, move
  between stacks, drag from Unstacked tray onto a stack.
- Per-stack **today progress** (N of M done, where M = members due today, AD-031).
- **Inline editor** for stack metadata (name, time, anchor, aglyph, color) — no
  modal, follows `HabitFormComponent` pattern (AD-032).
- Stack CRUD: create, update (inline), delete. Habit membership: add, remove, reorder.
- **Referential integrity** — a deleted habit is pruned from every stack
  immediately; archiving hides it but preserves its position (AD-031).
- **One-stack limit** — a habit belongs to at most one stack; adding to stack B
  removes it from stack A (AD-030).

**Critic Review.** ✅ Card anatomy, anchor tint, THEN connectors, NOT TODAY chip
position, `0 🔥` streak on overdue habits, "2 of 2 done today" (only the member
due that day), one Unstacked chip, and the full-width empty state all match the
mockup exactly (design check with all five declared states rendered every day).
Design conformance assertions in `stacks.design.spec.ts` transcribed from the
proto source, not the SCSS (L-022). The two harden rounds found CSS bugs
invisible to every check (L-033/L-034), a fixture state coverage bug (L-031),
and over-specified acceptance criteria (L-032). **Two blind spots remain and
overlap exactly**: `design-shot.mjs` captures at dpr 1 against a dpr-2 target
and downscales both halves, so the composite cannot resolve sub-2px detail
(L-035); and ChromeHeadless rounds `border-width: 1.5px` to `'1px'`, so the spec
cannot assert it either (L-036). The anchor box's 1.5px dashed border is
therefore verified by nothing.

---

## Suggested build order

1. **Global shell** (0) — unblocks the 5-item nav and both new routes (stub
   Analytics/Stacks first so the nav is honest).
2. **Calendar** (3) — lightest; a restyle + `Today` treatment. Good warm-up.
3. **Dashboard** (1) — stat cards + `<stat-card>` component (reused by Analytics).
4. **Habits** (2) — row restyle + 30-day sparkline + create modal.
5. **Analytics** (4) — full spec; reuses `<stat-card>` and chart primitives.
6. **Habit detail** (2b) — full spec; first per-entity route. Reuses
   `<app-day-strip>` from §2, so it is cheap *after* §2 and expensive before it.
7. **Stacks** (5) — full spec; new model + CDK drag-and-drop. Build last.

Shared primitives to extract early: `<stat-card>`, a bar/sparkline component, and
the heatmap — used across Dashboard, Habits, and Analytics.

All three now exist: `<app-stat-card>` (§1), `<app-day-strip>` (§2, `statuses` +
`hex`), and `<app-heat-grid>` + `<app-bar-chart>` (§4). ~~which §2b re-uses at a
longer window~~ — **wrong**, see §2b's correction banner: §2b needs its own
7-row `<app-activity-grid>`, and only the AD-015 colour *function* is shared
with `day-strip`. §4's heatmap does **not** reuse `activity-grid` either —
AD-026 keeps `<app-heat-grid>` a separate component: same 7-row geometry, but
a different input contract (`rate: number | null` vs. a status enum) and a
mutually exclusive colour mode (5-step blue over all habits, not per-habit
status). Three grid-shaped components now exist on purpose, not by omission.

**Page column widths are per-page, not shell-level** (global-shell AD-009) and
they genuinely differ: Dashboard 960px, Habits 1000px, Habit detail 900px. Read
the width out of the source for §4 and §5 rather than inheriting a neighbour's.
