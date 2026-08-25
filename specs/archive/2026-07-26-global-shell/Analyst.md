# Analyst — global-shell (Roadmap Phase 0) — summary

Size: **Medium**, with one caveat: it introduces a genuinely new pattern (a
global design-token layer every later phase consumes), so it got Large-level
scrutiny despite a small diff.

Roadmap source: `specs/design-implementation-roadmap.md` §"0 — Global shell".
First slice of the redesign; the 5-item nav and two new routes are coupled.

## Problem

The app's chrome was still `ng new` boilerplate: bare 3-link nav, no shared
visual system (each component invented its own colours/spacing), and the
redesign's nav needs 5 items — two of which (`/analytics`, `/stacks`) didn't
exist as routes yet.

## What shipped

- **Two stub routes** (`AnalyticsComponent`, `StacksComponent`) so the nav is
  honest. Page-container pattern only (max-width + centered + heading +
  placeholder copy); no aggregations, no data model — those are roadmap §4/§5.
- **Sticky top bar**: `✓`-in-blue-square logo (literal text glyph, not SVG) +
  `HabitTracker` wordmark, 5-item nav with a **tinted** active pill
  (`--accent-tint` bg, `--accent` text — not a solid/filled blue pill, which
  the roadmap's prose implied but the prototype source contradicts), and a
  right-aligned date via a pinned-locale pure function `formatBarDate(d: Date
  = new Date())` (mirrors `HabitService.todayIso`'s pinnable-date pattern;
  locale hardcoded `'en-US'` so the format doesn't flake under `en-GB`).
- **Design-token layer** on `:root` in `src/styles.scss`: surfaces, text,
  accent, radii, layout padding, font-family, and status-accent colours
  (done/missed/pending) declared ahead of first use so roadmap §1–§3 consume
  rather than re-sample them. Full token table lives in
  `src/styles.scss` itself now — not duplicated here.
- **`body` reset** (`margin: 0`, background, font-family) — without it the
  "full-bleed" sticky bar floats 8px from each edge.
- **No shell-level max-width.** Each page owns its own centered column
  (960/1000/900/1000/900px) — corrected from the roadmap's implied single
  ~1150px shell column, which doesn't exist in the prototype.
- **Wildcard redirect** (`{ path: '**', redirectTo: '' }`), last in the route
  list, so a typo'd URL lands on Dashboard instead of an empty shell.

## Explicitly out of scope

The actual Analytics/Stacks pages (stubs only), stat cards/sparklines/heatmap,
restyling Dashboard/Habits/Calendar interiors, a live midnight-updating clock,
mobile/responsive nav, dark mode, any `HabitService`/data-model change.

## What the harden round changed from the first draft

- **No global font existed anywhere** in the app — the original token table
  was colours/radii only; without a `font-family` token the shell would have
  shipped correct hexes in the browser's default serif, dominating the design
  diff. Added `--font-sans` and set it on `body`.
- **AC on full-page design match was unpassable as first written** — this
  slice deliberately leaves page interiors unstyled, so the design-check
  acceptance criterion was rescoped to judge only the top ~55px bar strip.
- **A fold-back audit caught two decisions argued in the body but never
  reached the acceptance criteria**: the tinted-not-solid active pill, and the
  no-max-width shell column. Both would have let the build report green while
  visually wrong — recorded as **L-010**.

## What changed during coding (not caught by planning)

- `.nav { gap }` was specified as `3px`; pixel measurement against the mockup
  showed ~1px/item drift (4px by "Stacks"). Corrected to `2px`. Recorded as
  **L-011**.
- First design-capture screenshotted a different project's dev server (port
  4200 was already in use, and the shot script only checks *something*
  answers on the port, not that it's this app). Worked around with
  `DESIGN_BASE_URL` + an alternate port; same lesson, **L-011**.

## Acceptance criteria — final result

All nine criteria passed. Highlights: 5 nav items with exact-match active
state on `/`; `/analytics` + `/stacks` resolve with no console errors;
`formatBarDate(new Date(2026, 6, 23)) === 'Thu · Jul 23, 2026'` under a pinned
locale; sticky bar with `--page-bg` on both `body` and wrapper, no shell
max-width; zero hard-coded hex in `app.component.scss`; `npm test` at 115
SUCCESS (was 107); build clean; bar-strip design check pixel-matched (logo,
pill, nav gaps all within 0.5px after the gap fix); unknown URLs redirect to
Dashboard.
