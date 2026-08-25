# Analyst — Redesign §1: Dashboard

Roadmap section: `specs/design-implementation-roadmap.md` §1.
Design source: `Habit Tracker Prototype.dc.html` in the Claude Design project
[Habit tracker design exploration](https://claude.ai/design/p/7089b0b3-0042-4029-bd4c-bef0ce5a6d19),
lines 22–92 (markup) and 425–570 (the `renderVals()` script).
Mockup: `design/target/dashboard.png` (1440 CSS px, `deviceScaleFactor: 2`).

Size: **Medium** — a restyle of an existing page plus four derivations and one
shared component. No new persisted entity, no new route. 12 steps.

---

## 1. What problem are we solving?

The Dashboard is the app's landing page and the only page the redesign gives a
*summary layer*. Today it renders a heading, one percentage, and three plain
lists; the target renders the same three lists as cards inside a 960px column,
under a four-card stat row that answers "how am I doing" before the user reads a
single habit name.

Two things make this more than a restyle:

1. **Three of the four stat cards need derivations the app does not have** —
   perfect days, a windowed (last-7-days) completion rate, and a
   month-over-month delta.
2. **The page currently has two different meanings for "completion rate"** the
   moment the new cards land — the existing header averages per-habit rates,
   every new card pools due-days. Two definitions of the headline number on one
   page is the defect this spec exists to avoid (see §3.1).

---

## 2. Values sampled from the prototype source

Read out of the `.dc.html`, not eyeballed from the PNG (skill `design-to-roadmap`
→ "re-derive exact values from source"; L-011). Everything below is a literal
from the source unless marked *derived*.

### 2.1 Page column

```
max-width: 960px; margin: 0 auto; padding: 28px 24px 48px;
```

`28px 24px 48px` is already the `--content-pad` token (AD-009). The 960px is
the Dashboard's own column — the shell imposes none.

### 2.2 Header

Every literal (`h1` at 23px/-0.3px, the 11px uppercase label, the 24px accent
value, the 18px row gap) is now recorded in `dashboard.component.scss`, which is
the live source — reproduced here only in what it means: the label is **sentence
case in the DOM and uppercased in CSS**, so the accessible text stays readable.
Same trick as the stat-card labels.

### 2.3 Stat row

```
display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px
```

Each card:

```
background:#fff; border:1px solid #e8e8e6; border-radius:8px;
padding:14px 16px; display:flex; flex-direction:column; gap:7px
```

Card internals — the same label/value/sub triad four times:

| Part | Value |
|---|---|
| label | `font-size:11px; letter-spacing:.6px; text-transform:uppercase; color:#8a8f96; font-weight:600` |
| value | `font-size:23px; font-weight:700; color:#16181c` |
| unit (inline, inside the value) | `font-size:14px; color:#8a8f96; font-weight:500` |
| sub | `font-size:12px; color:#75797f` |
| sub, positive delta | `font-size:12px; color:#2f9e44; font-weight:600` |
| progress track | `height:6px; background:#eef0f2; border-radius:3px; overflow:hidden` |
| progress fill | `width:{pct}%; height:100%; background:#0066cc; border-radius:3px` |

Card-by-card content, exactly as the source composes it:

1. `Today` — value `{todayDone}`, unit `of {todayDue} done`, then the bar.
   **No sub-line.**
2. `Longest active streak` — value `{topStreak}`, unit `days`, sub
   `{glyph} {name}` — **omitted entirely when the streak is 0** (§3.2).
3. `Perfect days` — value `{perfectDays}`, **no unit**, sub `every habit done`.
4. `Last 7 days` — value `{week7Rate}%`, **no unit**, sub
   `{deltaLabel} vs prior month` in the positive-green style.

So the card is: label, a value that may carry an inline unit, and **either** a
sub-line **or** a progress bar. Never both. That is the whole component API.

### 2.4 Section headings

15px/700 with a 2px `--rule` underline; lists are an 8px-gap column with 22px
between sections and none after the last. Empty-section copy is unchanged from
the app today (`Nothing due today!`, `No completions yet.`, `All caught up!`),
italic in `--text-faint`. Recorded in `dashboard.component.scss`.

### 2.5 Rows

All three row types share:

```
display:flex; align-items:center; gap:12px;
border-radius:8px; padding:11px 16px; border:1px solid <border>; border-left:4px solid <accent>
```

| Row | background | border | left accent |
|---|---|---|---|
| to-do | `#fff` | `#e8e8e6` | `#dcdcd9` |
| done | `#f4fbf6` | `#e2f0e6` | `#22c55e` |
| overdue | `#fdf4f4` | `#f3dede` | `#ef4444` |

Children, in source order: **checkbox** (20×20, 6px radius, 2px border — empty
on a to-do row, filled `--done` with a white ✓ on a done row, and **absent** on
an overdue row), **colour dot** (9px, the habit's hex), **icon glyph** (15px),
**name** (13.5px/600, `flex:1`), then `last done {ago}` on the overdue row only,
then the **rate** (12.5px/700, accent).

The glyph carries **no `line-height`** — the emoji font's normal line box is
what makes the row 49px tall. Pinning it to 1 makes every row 44px and the error
compounds down the page; this cost one design-check round (L-012).

The overdue row having **no checkbox** is a source fact, confirmed against the
mockup: that row starts with the colour dot, and there is **no spacer in its
place** — the whole row shifts left by the checkbox's 20px plus the 12px gap
(measured on the target: the to-do name starts at x≈478, the overdue name at
x≈435; CriticReview R5). It follows the existing app behaviour — the lapsed list
has never been tickable — so this is fidelity, not a change.

### 2.6 New tokens

Every other value above already has a token from AD-009. These five do not:

```scss
--text-sub:   #75797f;  /* stat-card sub-line, "last done N days ago" */
--text-faint: #a3a7ad;  /* italic empty-section copy */
--rule:       #efefec;  /* 2px section-heading underline */
--track:      #eef0f2;  /* progress-bar track */
--positive:   #2f9e44;  /* a delta that improved */
```

`--danger-text: #c92a2a` (already declared, unused until now) carries a delta
that regressed — see §3.4.

`--positive` is **not** a duplicate of `--done: #22c55e`, and must not be
collapsed into it (CriticReview R6): `--done` fills a 20px control and a 4px row
border where it reads as *status* (AD-006 gives the status channel to it);
`--positive` is 12px text on white, where `#22c55e` is too light to read. Two
jobs, two values.

---

## 3. Decisions

### 3.1 One definition of "completion rate": pooled due-days

`overallCompletionRate` today is the **mean of per-habit rates**. Every card the
prototype adds pools: `Math.round(dn / du * 100)` over all habits' due days.

**Decision: pool everywhere.** One service primitive returns
`{ done, countable }` over a date window, and the header, the 7-day card and the
delta all consume it.

Why pooled wins on its own merits, not just for consistency: mean-of-rates gives
a habit created yesterday the same weight as one with six months of history, so
adding a new habit visibly moves a number that is supposed to describe the past.

The window arithmetic is the existing `completionRate` contract, lifted verbatim
(AD-004, `dashboard-calendar-stats` R3): numerator = due days with status
`done`; denominator = due days with status `done` **or** `missed`. A `pending`
today is in neither — the day is not over.

"Lifted verbatim" includes the `isDueOn` guard that wraps the status check
(CriticReview R1). `dayStatus` reports `'done'` *before* it reports `'not-due'`,
so a habit ticked on a day it was not scheduled would otherwise land in the
numerator with nothing in the denominator, and the header would print `112%`.
The day loop asks `isDueOn` first and only then reads the status.

Effect on existing behaviour: both current `overallCompletionRate` specs assert
values where mean and pooled coincide (`(1.0+0.5)/2` = `6/8`; `(1.0+1.0)/2` =
`6/6`), so they keep passing. A new spec pins the case where they differ.

One deliberate change falls out: when habits exist but no due day has resolved
yet (everything created today), pooled `countable` is 0 and the header shows
`—` where it used to show `100%`. "No data yet" is the honest reading.

### 3.2 "Longest active streak" is the longest *current* streak

The roadmap says this card needs an aggregate of `longestStreak`. That is wrong,
and the source settles it: `topV = V.reduce((a,b) => b.streak > a.streak ? b : a)`
where `streak` is the backward walk from today — i.e. `currentStreak`. **Active**
is doing real work in that label: it is the best streak still *running*, which is
why the card can name its owner and why the number drops the day the streak
breaks. Using `longestStreak` would print a number from three months ago and
attribute it to a habit the user has since abandoned.

Ties resolve to the **first habit in list order** (`>` keeps the incumbent).

When the maximum is 0 there is no owner to name (CriticReview R3): the reduce in
the source still returns a habit, which would print `0 days` under the name of
whichever habit sorts first — a claim about nothing. The derivation returns
`null` when no habit has a running streak, and the card renders `0 days` with
**no sub-line**.

### 3.3 Perfect days

A day counts iff **at least one** habit was due **and every** habit that was due
was completed. The `anyDue` guard is what stops a Sunday where nothing was
scheduled from counting as a triumph.

Range: the earliest active habit's start date through today, inclusive. Today
counts only when every habit due today is already done — no grace, because
including a not-yet-finished day would make the number tick down at midnight.

Scope: active habits only, and `isDueOn` already returns `false` inside a pause
(AD-007), so a paused habit cannot spoil a day.

**Accepted downside** (CriticReview R4, L-008): because the count reads
`activeHabits`, archiving a habit removes it from every *past* day too, so days
it used to spoil become perfect retroactively — the number can go **up** when
you archive something you were failing. Kept deliberately. The header's overall
rate has always worked this way (`habit-lifecycle` R10), and the alternative —
counting an archived habit's past due days — makes archiving cosmetic and puts
two different histories on one page.

### 3.4 The delta compares the same window the card displays

The prototype computes the delta as *mean of the last four weekly buckets* minus
*mean of the previous four* — a 28-day comparison — while the card's headline is
the **7-day** rate. With the prototype's synthetic data those never contradict
each other. With real data they will: a user who had a flawless week after a bad
month can be shown `100%` next to a negative delta, and the card becomes a bug
report.

**Decision:** the delta is `last-7-days rate − prior-28-days rate`, where the
prior window is the 28 days immediately *before* the 7-day window —
`[today-34 … today-7]`. The rendered sentence then means what it says: this
week's number, against the month before it. This is a deliberate deviation from
the source's arithmetic; the label, the styling and the rounding
(`Math.round((a - b) * 100)`, sign always shown, unit `pts`) are unchanged.

Sign styling — the source hardcodes green, which would print `-6 pts` in the
colour of good news:

| delta | colour |
|---|---|
| `> 0` | `--positive` |
| `< 0` | `--danger-text` |
| `= 0` | `--text-muted`, label `no change vs prior month` |
| prior window has no countable day | `--text-muted`, label `no prior data` |

### 3.5 The TODAY counter counts due habits, not completed ones

`doneToday()` includes a habit ticked off-schedule (`completedDates` contains
today even though the habit was not due) — deliberate, from `habit-lifecycle`
R9. The card's denominator is habits **due** today. So the card must not read
its numerator off `doneToday().length`, or an off-schedule tick prints
`6 of 5 done`.

Numerator and denominator both come from the due-today set:
`due = active habits where isDueOn(h, todayIso)`;
`done = those of them whose completedDates include todayIso`.

The "Done today" *list* keeps showing the off-schedule completion. The card
counts the schedule; the list records what happened. Both are right.

Nothing due today → `0 of 0 done` and an empty bar (a bar filled to 100% for a
day with no obligations reads as an achievement).

### 3.6 The stat card is a component, not four copies

`<app-stat-card>` in `src/app/shared/stat-card/` — label, value, optional inline
unit, and *either* a sub-line (with a tone) *or* a progress percentage, per
§2.3. Roadmap §4 (Analytics) reuses it for four more cards; building it inline
here means restyling it twice.

The stat row renders **inside** the existing `@if (habits().length === 0)`
else-branch, alongside the three sections (CriticReview R2). An empty store
keeps today's behaviour — the header, then *"Add a habit first."* — rather than
four cards reporting `0 of 0 done` to someone who has not started. The header
(title + overall completion) stays outside the branch, as it is today.

### 3.7 Demo data is tooling, not app code

The dashboard is unreadable against an empty store, and `design-shot.mjs` has no
way to seed one. A generator reproduces the prototype's six habits with ~18
weeks of history and is injected into the page by Playwright before load. It
ships in `scripts/`, never in `src/` — the app bundle must not carry fixtures.

Tracked as a Quick Task in `specs/STATE.md`, not as a step in this spec: it is
tooling (2 files, no `src/` change) and the spec's acceptance criteria must not
depend on it.

---

## 4. Scope

### In

The five tokens in §2.6; a new `src/app/shared/stat-card/`; four derivations on
`HabitService` (`poolCounts`, `perfectDays`, `topCurrentStreak`,
`dueTodayCounts`) with specs; and `src/app/dashboard/*` rewritten to §2 — with
the three bucket computeds (`todoToday`, `doneToday`, `lapsed`) keeping their
current semantics untouched.

### Out

- **Habits, Calendar, Analytics, Stacks.** The stat-card is built here and
  *consumed* by §4 later; this spec does not touch `/analytics`.
- **The three bucket definitions.** `todoToday` / `doneToday` / `lapsed` decide
  *which* habits appear; this spec decides how they *look*. The paused/archived
  asymmetries in them are settled law (habit-lifecycle R9/R10).
- **Making the overdue row tickable.** It has no checkbox in the target and none
  today.
- **Hover, focus and error states.** No mockup exists for them; a static
  screenshot cannot verify them (`CLAUDE.md` → Design comparison). Keep the
  existing focus behaviour of the checkbox.
- **Responsive / narrow-viewport behaviour.** The mockup is 1440px only. The
  4-up grid may collapse however the browser sees fit below that; not specified,
  not verified.
- **`STORAGE_KEY` bump / any data-model change.** All four derivations are pure
  reads (AD-004).
- **Committing.** Ask first.

---

## 5. Acceptance criteria

Each is checkable by a command or by one look at `design/compare/dashboard.png`.

1. `npx ng test --watch=false --browsers=ChromeHeadless` → **≥128 passing**
   (was 115), zero failures.
2. `npx ng build` succeeds, and `dashboard.component.scss` stays under its
   component budget (no new budget warning in the output).
3. `grep -nE '#[0-9a-fA-F]{3,6}' src/app/dashboard/dashboard.component.scss
   src/app/shared/stat-card/stat-card.component.scss` returns **nothing** —
   every colour comes from a token (AD-009).
4. **When at least one habit exists**, the stat row renders four cards in one
   row, in order: `TODAY`, `LONGEST ACTIVE STREAK`, `PERFECT DAYS`,
   `LAST 7 DAYS`. With an empty store the page still shows the header and
   *"Add a habit first."* and **no** stat row (§3.6, CriticReview R2).
5. The `TODAY` card shows `N of M done` where `M` is the count of habits due
   today and `N ≤ M` **even when a habit not due today is ticked**, plus a
   progress bar at `round(N/M*100)%` (0% when `M = 0`). Covered by a spec.
6. `LONGEST ACTIVE STREAK` shows the maximum **current** streak across active
   habits and names its owner as `{glyph} {name}` — with **no owner sub-line
   when the maximum is 0**. Covered by a spec that distinguishes it from
   `longestStreak` (a habit whose best streak is long but whose current streak
   is 0 must not win) and by one for the all-zero case.
7. `PERFECT DAYS` counts days with ≥1 due habit where all due habits were done.
   Covered by a spec including the "nothing was due" day, which must not count.
8. `LAST 7 DAYS` shows the pooled rate over `[today-6 … today]`, and its
   sub-line shows the signed delta against `[today-34 … today-7]` with the
   four-way colour rule of §3.4. Covered by specs for a positive, a negative and
   a no-prior-data case.
9. The header's `OVERALL COMPLETION` is the pooled rate over all history, and
   renders `—` when no due day has resolved yet. Covered by a spec where pooled
   and mean-of-rates give different answers.
10. Rows match §2.5: to-do rows have an empty checkbox and a neutral left
    border; done rows are green-tinted with a filled green checkbox; overdue
    rows are red-tinted, have **no checkbox**, and show both
    `last done N days ago` and the percentage.
11. The page column is `max-width: 960px` — **not** a shell-level width, and
    **not** the 800px the page uses today.
12. `DESIGN_BASE_URL=… npm run design:shot -- dashboard --width 1440` produces
    `design/compare/dashboard.png` in which the stat row, the section rules and
    all three row types line up with the target. Judged on the composite;
    anything that looks off is then **measured** against
    `design/target/dashboard.png`, never re-judged by eye (L-011).

---

## 6. Retrospective

**Did `Analyst.md` catch anything not thought about up front?**

Three things, all from reading the prototype's `renderVals()` script rather than
its markup:

1. *Longest active streak* is `currentStreak`, not `longestStreak` — the roadmap
   had it wrong, and the wrong version would have printed a number from three
   months ago next to the name of an abandoned habit (§3.2).
2. The page was about to carry **two** definitions of "completion rate" — the
   header's mean-of-rates and the new cards' pooled due-days (§3.1). Nobody
   would have noticed until two numbers on one screen disagreed.
3. The TODAY counter's denominator is the *due* set while the Done-today list is
   the *completed* set, so reading the numerator off the list prints `6 of 5`
   the first time someone ticks a habit off-schedule (§3.5).

The critic round then caught the empty-store case (four cards reading `0 of 0`
as a new user's welcome) and a zero streak being attributed to an arbitrary
habit — both in the acceptance criteria, which is where a wrong claim survives
longest (L-010).

**Did anything in `tasks.md` turn out to be wrong during coding?**

One step, one defect. Step 10's second spec created two components in a single
`it`, seeding `localStorage` between them — but `HabitService` is root-provided
and reads storage in its constructor, so the second component reused the
already-loaded signal and the spec failed. The executor stopped and reported it
rather than adjusting the expectation, which is what the "If blocked" clause is
for. Fixed by splitting it into two specs; a fresh `it` is the only reliable
reseed. Total moved 133 → 134.

Nothing else in the twelve steps needed a correction, and the two design-value
files (template and SCSS) were transcribed byte-identically.

**One defect the design check caught that no amount of spec-reading would
have.** `line-height: 1` on the emoji glyph — a reflex, not a sampled value —
made every habit row 44px instead of 49px, and the error compounded down the
page. The prototype sets no line-height there, and the emoji font's normal line
box (~25px at 15px) is what sets the row height. Measuring the target's pixels
found it; the side-by-side composite did not show it (L-011 again, now with a
second worked example).
