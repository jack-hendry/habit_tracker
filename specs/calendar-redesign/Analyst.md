# Analyst — Redesign §3: Calendar

Roadmap section: `specs/design-implementation-roadmap.md` §3.
Design source: `Habit Tracker Prototype.dc.html` in the Claude Design project
[Habit tracker design exploration](https://claude.ai/design/p/7089b0b3-0042-4029-bd4c-bef0ce5a6d19),
lines 141–178 (markup) and 476–494 (`MONTHS`, `statusOf`, `CS`, `gridFor`).
Mockup: `design/target/calendar.png` (1440 CSS px, `deviceScaleFactor: 2`).

Size: **Medium** — a restyle of an existing page plus one small template
addition (the Today ring). No new route, no new persisted entity, no data
model change, **no new service method** — `monthGrid` and `dayStatus` already
return everything this page needs. 7 steps; the lightest of the five sections,
as the roadmap said, but with more restyle delta than its summary implied.

---

## 1. What problem are we solving?

`/calendar` is closest to the target of any page in the app — it already has
the habit selector, the month grid, five status colours and Prev/Next nav. The
roadmap's own summary calls this "mostly a restyle" and undersells it: reading
the source rather than the screenshot turns up a real structural change (the
nav, grid and legend move from three separately-boxed pieces into **one**
card) and two things the app is simply wrong about today — the `future` tint
and the day-number colour.

Four things make this more than the "lightest section, no new features" the
roadmap's critic pass called it:

1. **Nav, grid, and legend become one card**, not three (§3.2).
2. **The day number's colour depends on the cell's status** — done days get a
   dark-green numeral, missed a dark-red one, and so on. The app renders every
   day number in one flat grey (§3.3).
3. **`future`'s colours are wrong**, not just "could be closer" — the app uses
   an indigo the source does not (§3.4).
4. **The `Today` treatment is a `box-shadow` ring, not a border**, and does
   not exist in the app at all yet (§3.5) — the one genuinely new markup in
   this spec.

---

## 2. Values sampled from the prototype source

Read out of the `.dc.html`, not eyeballed from the PNG (skill `design-to-roadmap`
→ "re-derive exact values from source"; L-011). Everything below is a literal
from the source unless marked *derived*.

### 2.1 Page column and header

```
max-width: 900px; margin: 0 auto; padding: 28px 24px 48px;
```

`900px` is **already** what the app uses today — no change. `28px 24px 48px`
is the `--content-pad` token (AD-009); the app hardcodes `2rem 1rem` (32px
16px) and must move to the token.

`h1`: `margin:0 0 18px; font-size:23px; letter-spacing:-0.3px; color:#16181c`
— the bottom margin sits directly on the `h1` here (this page's header has no
button beside it, unlike Habits'), not on a wrapping flex row.

### 2.2 The habit-selector row

`display:flex; align-items:center; gap:12px; margin-bottom:16px`. The app uses
`gap:1rem; margin-bottom:2rem` — both wrong.

| Part | Value |
|---|---|
| `Select habit:` label | `font-size:13px; font-weight:600; color:#3a3f45` |
| `<select>` | `padding:8px 10px; border:1px solid #d7d7d4; border-radius:6px; font-size:13px; background:#fff; color:#16181c` |
| habit dot | `width:11px; height:11px; border-radius:50%` |
| habit glyph | `font-size:14px` |
| habit name | `font-size:13.5px; font-weight:700; color:#16181c` |
| category chip | `background:#f1f1ef; color:#4c5057; font-weight:500; padding:3px 9px; border-radius:999px; font-size:11.5px` |

`#3a3f45` is a new value — close to `--text` (`#4c5057`) but not equal; do not
substitute the existing token. The `<select>`'s border/radius/background do
already match tokens (`--control-border`, `--radius-control`, `--surface`,
`--text-strong`) — no new tokens needed for it. The habit name is **700**
weight; the app renders it at 600.

### 2.3 The card

```
background:#fff; border:1px solid #e8e8e6; border-radius:10px;
padding:18px 20px
```

**This is new structure, not a restyle of what exists.** Today the month-nav
row sits bare above the page, the grid is its own boxed element (grey
background showing through 2px gaps as pseudo-gridlines), and the legend is a
third, separately-bordered box below. The target wraps all three — nav, grid,
legend — inside **one** white card. `10px` is a new radius, distinct from the
existing `--radius-card` (8px, used everywhere else) — this is the one place
in the app so far with a larger radius.

### 2.4 Month nav

`display:flex; align-items:center; justify-content:space-between;
margin-bottom:14px`.

| Part | Value |
|---|---|
| `Prev`/`Next` button | `padding:6px 12px; background:#fff; border:1px solid #d7d7d4; border-radius:6px; font-size:12px; font-family:inherit` |
| button colour, enabled | `#4c5057` |
| button colour, disabled | `#d5d5d2` |
| month label | `font-size:15px; font-weight:700; color:#16181c` |

**The disabled state does not apply here.** In the source, `Prev`/`Next` grey
out at the edges of the prototype's fixed 5-month synthetic window
(`calM === 0` / `calM === 4`) — an artifact of its fake dataset having only
126 days of history, not a product decision. `HabitService.monthGrid` already
takes an arbitrary `year`/`month` and has no such bound (confirmed by reading
it: no clamp exists, `prevMonth`/`nextMonth` on `CalendarComponent` already
navigate freely). **Do not add a bound.** The colour pair above is sampled
faithfully; the *condition* that switches between them is not adopted.

### 2.5 The grid

Weekday header row: `display:grid; grid-template-columns:repeat(7,1fr); gap:4px;
margin-bottom:4px`, each cell `text-align:center; font-size:11px;
font-weight:700; color:#8a8f96; padding:4px 0`.

Day grid: `display:grid; grid-template-columns:repeat(7,1fr); gap:4px;
margin-bottom:14px`.

Each day cell: `min-height:52px; background:{bg}; border-left:3px solid {bd};
border-radius:4px; position:relative; box-shadow:{sh}`. Day number:
`position:absolute; top:5px; right:7px; font-size:11px; font-weight:600;
color:{tc}`.

**Three properties per status**, not two — `bg`, `bd` (border-left) **and**
`tc` (the day-number's own colour). Today's app has `bg`/`bd` but paints every
number the same flat grey (`#666`) regardless of status. From `CS` in the
source:

| Status | `bg` | `bd` (border-left) | `tc` (day number) |
|---|---|---|---|
| `done` | `#dcfce7` | `#22c55e` | `#166534` |
| `missed` | `#fee2e2` | `#ef4444` | `#991b1b` |
| `pending` | `#fef3c7` | `#f59e0b` | `#92400e` |
| `not-due` | `#f3f4f6` | `#d1d5db` | `#9aa1ab` |
| `future` | `#e7eaff` | `#8f95e8` | `#4338ca` |
| *(blank/off)* | `#fafaf9` | `transparent` | *(no number)* |

Comparing to the app's current values: `done`, `missed`, `pending`, `not-due`
already match on `bg`/`bd`. **`future` does not** — the app uses `#e0e7ff` /
`#6366f1` (a bluer indigo); the source's is `#e7eaff` / `#8f95e8` (paler,
more lavender). This is the exact defect the original roadmap's own critic
flagged ("future days are visibly lavender-tinted... confirm the current
`status-future` color matches") — confirmed here as a real mismatch, not a
maybe. Border-left is **3px**, the app uses 4px. Cell radius is **4px**, the
app uses 2px. Min-height is **52px**, the app uses 60px.

Blank (leading/trailing) cells: the app already renders these as `{ blank:
true }` with `background:#fafafa` — one hex off from the source's `#fafaf9`.
Sample the exact value.

### 2.6 The Today ring

```
box-shadow: {i === T ? '0 0 0 2px #0066cc' : 'none'}
```

A **`box-shadow` ring**, not a border — a border would shift the cell's
content by its width; `box-shadow` does not. `#0066cc` is `--accent`. This is
the one piece of markup in this spec that is genuinely new: nothing in the
component today asks "is this cell today?"

### 2.7 The legend

`display:flex; gap:16px; font-size:11.5px; color:#75797f; flex-wrap:wrap`.
Each item: `display:flex; align-items:center; gap:5px`; swatch `width:14px;
height:14px; border-radius:3px; border:1px solid {bd}`, `bd` matching the
cell's border-left colour for that status. **Six** items — the five statuses
plus a sixth:

```
Today: background:#fff; border:2px solid #0066cc
```

The app's legend has five items today (no `Today`), and its own box (padding,
border, background) separate from the grid card — folded into the one card
per §2.3.

### 2.8 New tokens

```scss
--cal-label:        #3a3f45;  /* "Select habit:" label */
--cal-missed-text:  #991b1b;  /* missed day-number colour — distinct from --danger-text #c92a2a */
--cal-notdue-text:  #9aa1ab;  /* not-due day-number colour */
--cal-future-bg:    #e7eaff;  /* corrected future cell fill */
--cal-future-border:#8f95e8;  /* corrected future cell border-left / legend swatch */
--cal-future-text:  #4338ca;  /* future day-number colour */
--cal-off-bg:       #fafaf9;  /* blank leading/trailing cell — one hex off the app's #fafafa */
--radius-card-lg:   10px;     /* the one larger-radius card on this page */
```

`done`'s day-number colour (`#166534`) already has a token — `--done-text`,
declared in `dashboard-redesign` §1 and unused there since (the header pill
uses it; the calendar cell did not exist as a consumer yet). `pending`'s day-
number colour (`#92400e`) already has a token too — `--pending-text`. Reuse
both; do not create duplicates.

Every other colour in §2.2–§2.7 already has a token: `#d7d7d4`
`--control-border`, `#fff` `--surface`, `#16181c` `--text-strong`, `#4c5057`
`--text`, `#8a8f96` `--text-muted`, `#f1f1ef` `--chip-bg`, `#e8e8e6` `--border`,
`#0066cc` `--accent`, `#75797f` `--text-sub`, and the unmodified `done` /
`missed` / `pending` / `not-due` `bg`/`bd` pairs (`--done`/`--done-bg`,
`--missed`/`--missed-bg`, `--pending`/`--pending-bg`, and new tokens are only
needed where §2.5 found a mismatch or a gap).

---

## 3. Decisions

### 3.1 No new service method

`HabitService.monthGrid(habit, year, month, today)` already returns
`{ iso, status }` per real day and `{ blank: true }` for padding, and
`dayStatus`'s five-value `DayStatus` already covers everything `CS` encodes.
The only thing the component needs and does not have is "is this cell's `iso`
today" — a one-line comparison in the template
(`cell.iso === todayIso`), not a derivation worth a service method. This is
the reason the section is genuinely the lightest of the five: no new pure
function, no new spec surface on `HabitService`.

### 3.2 One card, not three

§2.3. `.calendar-card` wraps the month-nav row, the grid (weekday headers +
day cells) and the legend. The existing three-piece structure (bare nav, a
grey-background grid simulating gridlines via padding, a separately-bordered
legend box) is replaced, not layered under the new card. The grid's visible
"gridlines" today come from a grey container background peeking through 2px
gaps — with the card now white and the grid gap at 4px transparent, that trick
is removed; cells sit directly on the white card background with a real 4px
gap between them.

### 3.3 The day number's colour is a per-status lookup, not a constant

§2.5. Today's app hardcodes `color: #666` on `.day-number`. The target's `tc`
column shows this was never meant to be constant — every status has its own
number colour, matching (roughly, not identically) its border-left hue.
`getCellClass(cell)` already returns `status-{status}`; the SCSS keys off the
same class the background/border already use, so no new binding is needed —
only new declarations under the existing `.status-*` selectors.

### 3.4 `future` gets corrected, not just restyled

§2.5. The roadmap's own critic pass for this section said to "confirm the
current `status-future` color matches" the target's lavender tint — read as a
maybe. It does not match: `#e0e7ff`/`#6366f1` (today) vs `#e7eaff`/`#8f95e8`
(source). Both are lavenders to the eye at a glance, which is exactly how this
kind of near-miss survives a screenshot comparison; the hex values are
different colours and the fix is a straight substitution, not a judgement
call.

### 3.5 Today is a template addition, not a pure restyle

§2.6. The one new piece of markup: a `[class.today]` (or equivalent) binding
on the cell, comparing `cell.iso` against `HabitService.todayIso()`, driving a
`box-shadow` ring in SCSS. `today` is boolean and orthogonal to `status` — a
future day cannot be today, but a `pending`, `done`, or `missed` day can, so
the ring must be independent of the status class rather than folded into one
of the five `.status-*` blocks.

### 3.6 Disabled Prev/Next is not adopted

§2.4. The source's grey-out condition exists because its dataset is a fixed
5-month window; the app's is not, and `monthGrid` already handles arbitrary
months. Copying the disabled condition would silently cap the app's calendar
at whatever range happened to match the prototype's fake data — a regression,
not fidelity. `Prev`/`Next` keep their current always-enabled behaviour; only
their **visual style** (padding, border, radius, font, colour) is sampled.

---

## 4. Scope

### In

- The eight tokens in §2.8 (two of which — `--done-text`, `--pending-text` —
  already exist and are reused, not redeclared).
- `calendar.component.html`/`.scss` restyled to §2: the one-card wrapper, the
  corrected grid, per-status day-number colour, the `Today` ring, the sixth
  legend item, and the habit-selector row.
- One new template comparison (`cell.iso === todayIso`) — no new component
  state, no new service method.

### Out

- **Dashboard, Habits, Analytics, Stacks.** Untouched.
- **Bounding month navigation to a fixed range** (§3.6) — a deliberate
  non-adoption.
- **The habit detail page's own calendar-shaped grid** (`cellsAll` in the
  source, roadmap §2b) — a different component, all-history rather than
  one-month, out of scope here.
- **Hover, focus and error states.** No mockup; a static screenshot cannot
  verify them (`CLAUDE.md` → Design comparison). The `<select>`'s native focus
  ring is untouched.
- **Responsive / narrow-viewport behaviour.** The mockup is 1440px only.
- **`STORAGE_KEY` bump / any data-model change.** Nothing here touches
  persistence.
- **Committing.** Ask first.

---

## 5. Acceptance criteria

Each is checkable by a command or by one look at `design/compare/calendar.png`.

1. `npx ng test --watch=false --browsers=ChromeHeadless` → **≥163 passing**
   (the baseline going into this spec — confirm the exact figure before Step 1;
   this section adds no new derivation, so any growth is component-spec-only).
2. `npx ng build` succeeds, `calendar.component.scss` prints no new budget
   warning.
3. `grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' src/app/calendar/calendar.component.scss`
   returns **nothing** — every colour comes from a token (AD-009).
4. The page column stays `max-width: 900px`, padding moves to the
   `--content-pad` token.
5. Month-nav, the day grid, and the legend render inside **one** card:
   `background:var(--surface); border:1px solid var(--border);
   border-radius:var(--radius-card-lg); padding:18px 20px`.
6. Each day cell is 52px min-height, 4px radius, a 3px left border, with its
   background/border/day-number colour keyed by status per §2.5's table —
   including the **corrected** `future` colours.
7. Today's cell (and only today's) shows a `0 0 0 2px var(--accent)`
   box-shadow ring, independent of its status colouring. Covered by a spec
   comparing a cell whose `iso` is today against one that is not.
8. The legend has **six** items in source order (`Done, Pending, Missed, Not
   scheduled, Future, Today`), the sixth being an unfilled swatch with a 2px
   accent border.
9. `Prev`/`Next` remain **always enabled** — clicking `Next` from the current
   month still advances past it (no clamp adopted from §3.6).
10. `DESIGN_BASE_URL=… npm run design:shot -- calendar --width 1440 --seed`
    produces `design/compare/calendar.png` in which the card, the grid
    colours (especially `future`), the day-number colours and the Today ring
    line up with the target. Judged on the composite; anything that looks off
    is then **measured** against `design/target/calendar.png`, never
    re-judged by eye (L-011).

---

## 6. Retrospective

*Filled in before archiving.*

**Did `Analyst.md` catch anything not thought about up front?**

**Did anything in `tasks.md` turn out to be wrong during coding?**
