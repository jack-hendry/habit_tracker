# Analyst — global-shell (Roadmap Phase 0)

Size: **Medium**, with one caveat. It touches only two layers (routing + UI) and
adds no data model, no service derivation, and no new async — which keeps it out
of Large. But it introduces **one genuinely new pattern the project has never
had: a global design-token layer** that every later phase consumes. That single
decision carries Large-level risk even though the diff is small, so it gets its
own harden focus (see §5). Per CLAUDE.md "when unsure, size UP" the token layer
is treated with more care than a Medium normally earns.

Roadmap source: `specs/design-implementation-roadmap.md` §"0 — Global shell".
Design source: the Claude Design prototype linked at the top of the roadmap.
This is the **first** slice of the redesign and the one the roadmap's build order
puts first, because the 5-item nav and both new routes are coupled (§2.1).

## 1. What problem are we solving?

The app has shipped its data model and three working pages (Dashboard, Habits,
Calendar), but its chrome is still `ng new` boilerplate:

- `app.component.html` is a bare `<nav>` with three text links and a
  `<router-outlet>`. No logo, no wordmark, no date, no page background, no
  content column — every page renders flush-left on white.
- There is **no shared visual system**. Each component's SCSS invents its own
  colours and spacing inline; there is no palette, no radius scale, no
  card/surface treatment, no accent colour that the pages agree on. The roadmap's
  five pages all assume the same light-gray page / white-rounded-card / blue-pill
  surface, and nothing in the repo defines it.
- The nav shows **three** items, but the redesign has **five** — and two of them
  (Analytics, Stacks) do not exist as routes yet. The shell literally cannot be
  built honestly (a 5-item nav) until those two routes at least resolve.

Phase 0 lays the foundation the other five sections stand on: the top bar, the
page shell, the two new routes (stubbed), and — the load-bearing piece — the
shared design tokens. Get the tokens wrong and every subsequent page inherits the
wrong palette; get them right and Calendar/Dashboard/Habits restyles become
"consume the variables" instead of "reinvent the colours."

## 2. What is in scope?

### 2.1 The two new routes (stubbed) — why they ship with the shell

The nav cannot show five honest items while `/analytics` and `/stacks` 404. So
Phase 0 registers both routes in `app.routes.ts` (lazy `loadComponent`, matching
the existing three) pointing at **placeholder stub components**:

- `AnalyticsComponent` and `StacksComponent`. **Their structure is specified, not
  described** (CriticReview R5): each renders the prototype's page-container
  pattern — `max-width` (Analytics `1000px`, Stacks `900px`, per §2.3) +
  `margin:0 auto` + `padding:28px 24px 48px` — containing an `<h1>` at
  `23px` / `letter-spacing:-0.3px` / `#16181c` reading `Analytics` /
  `Habit Stacks`, plus one muted (`--text-muted`) line of placeholder copy.
  Nothing else. Left vague, the executor invents a container and §4/§5 inherit
  the divergence.
- Files follow the repo's existing convention exactly:
  `src/app/analytics/analytics.component.{ts,html,scss}` and
  `src/app/stacks/stacks.component.{ts,html,scss}` — `standalone: true` written
  explicitly, `styleUrl` singular, `.component.ts` suffix, matching
  `dashboard.component.ts`. (Not the suffix-free idiom from the user's other
  Angular repo.) Both directories **already exist and are empty** (CriticReview
  R14) — create the files in place; this is not a blocker.
- No aggregations, no data model, no drag-and-drop — those are roadmap §4 and §5,
  each with its own full spec. The stubs exist **only** so the nav is honest and
  the active-pill state has a real target; §4/§5 replace them wholesale.
- **A `**` wildcard route is added in the same step** (CriticReview R7):
  `{ path: '**', redirectTo: '' }`, last. Going from three routes to five makes a
  typo'd URL render a polished bar above an empty gray page, which reads as a
  broken app. Explicitly *not* a designed 404 page — that is not in the prototype.

This coupling is the roadmap critic's explicit finding: "the nav can't show 5
items until those routes at least stub out."

### 2.2 The top bar

A **sticky** top bar spanning the viewport, three regions:

- **Left — brand.** A checkbox-in-a-blue-rounded-square **logo** + the
  `HabitTracker` wordmark. The roadmap critic flags that the logo is specifically
  a **checkbox** glyph (the product metaphor), *not* a generic icon — do not
  substitute. Implementation options are weighed in §2.6.
- **Center/left — nav.** Five items in order: **Dashboard, Habits, Calendar,
  Analytics, Stacks**. **Correction to the roadmap:** the active item is a
  **light-blue *tinted* pill, not a solid blue one** — verified against the
  prototype source (`app.render`): active = background `#e9f1fa`, text `#0066cc`,
  weight 600; inactive = transparent background, text `#565b63`, weight 500. Each
  item is `padding:7px 13px; border-radius:6px; font-size:13.5px`. The roadmap's
  "filled blue pill" (white-on-blue) would be visibly wrong. Active state
  continues to use `routerLinkActive`; `/` (Dashboard) keeps
  `[routerLinkActiveOptions]="{ exact: true }"` so it does not light up on every
  child route (the existing gotcha — keep it). Note `routerLinkActive` toggles a
  *class*, so the tinted-vs-transparent split is expressed as `.active {}` in SCSS
  rather than the inline ternary the prototype uses.
- **Right — date.** The current date formatted `Thu · Jul 23, 2026` (weekday ·
  Mon DD, YYYY, middle-dot separator), `font-size:12.5px; color:#8a8f96`,
  right-aligned via a flex spacer between nav and date.

### 2.3 The page shell

- **Light-gray page background** `#f7f7f5` (a token, §2.5), set on a
  `min-height:100vh` wrapper, replacing the flush white.
- **A `body` reset — required, per CriticReview R2.** `styles.scss` must set
  `body { margin: 0; background: var(--page-bg); font-family: var(--font-sans); }`.
  Without `margin:0` the UA default 8px leaves the "full-bleed" sticky bar
  floating 8px from each edge with white around it, and `position:sticky; top:0`
  docks 8px down. The background goes on **both** `body` and the wrapper — the
  wrapper for the layout box, `body` so a short page doesn't show white on
  overscroll.
- **Correction to the roadmap:** there is **no single ~1150px shell column.** The
  prototype gives **each page its own** centered column — Dashboard `960px`,
  Habits `1000px`, Calendar `900px`, Analytics `1000px`, Stacks `900px`, all
  `margin:0 auto; padding:28px 24px 48px`. So the shell wrapper is *only* the
  sticky bar + the gray-background full-height container; the centered
  max-width column is a **per-page** concern, not a shell-level one. Phase 0
  therefore does **not** impose a width on `<router-outlet>`; each page keeps
  (or gains, in its own section) its own column. This also means the existing
  three pages' current flush-left layout is corrected *in their own sections*,
  not here — Phase 0 only supplies the background + bar they sit under. A single
  shared padding token can still be defined (§2.5); a single width token cannot.
- White rounded cards with subtle borders/shadows are the *surface* the pages
  paint on — but the **card component itself is not built here**. Phase 0 defines
  the tokens (radius `8px`, border `#e8e8e6`, surface `#fff`); the Dashboard
  stat-cards, habit-row cards, etc. are their own sections. Phase 0's visible
  card, if any, is only whatever wrapping the shell itself needs.

### 2.4 The date formatter

`new Date()` → `Thu · Jul 23, 2026`. Angular's `DatePipe` cannot emit the
middle-dot layout in one token, so this is a small explicit formatter. Per
CriticReview **R3** it is an exported **pure function**, not a component getter:

```ts
export function formatBarDate(d: Date = new Date()): string
```

- **The date is a parameter with a default**, mirroring the repo's existing
  `HabitService.todayIso(d: Date = new Date())` — which is `static` +
  parameterised precisely "so specs can pin a fixed day." A bare `new Date()`
  field initialiser would make AC 3 untestable without mocking the global clock.
- **The locale is pinned to `'en-US'`**, never the ambient default. Under `en-GB`
  the same call renders `23 Jul 2026`; a test green on the author's machine and
  red in CI because of a locale default is the worst kind of flake.
- It lives beside `AppComponent` (presentation, not domain) — explicitly **not**
  on `HabitService`.
- AD-003 does not bite (it formats a live `Date`, it does not parse an ISO
  string), but the same discipline applies: read parts from the local `Date`,
  never round-trip through `toISOString()`. Its spec constructs the pinned date
  locally as `new Date(2026, 6, 23)`.
- It is computed **once at app load**, not on a live midnight timer — see §3.

### 2.5 The design-token layer (the load-bearing decision)

Introduce a single source of truth for the redesign's visual language as CSS
custom properties on `:root` in `src/styles.scss` (today an empty file). The
prototype hard-codes hexes inline (no CSS variables of its own), so **the values
below were sampled directly from the prototype source, not eyeballed**:

**Core (consumed by the shell in Phase 0):**

| Token | Value | Role |
|---|---|---|
| `--page-bg` | `#f7f7f5` | full-height page background |
| `--surface` | `#fff` | bar + card background |
| `--border` | `#e8e8e6` | hairline card/bar border |
| `--text-strong` | `#16181c` | headings, wordmark |
| `--text` | `#4c5057` | body / secondary / button text |
| `--text-muted` | `#8a8f96` | date, uppercase labels |
| `--nav-inactive` | `#565b63` | inactive nav item text |
| `--accent` | `#0066cc` | logo square, active nav text, links, % |
| `--accent-tint` | `#e9f1fa` | active nav pill background |
| `--chip-bg` | `#f1f1ef` | gray category/meta chips |
| `--control-border` | `#d7d7d4` | button / select borders |
| `--radius-card` | `8px` | cards, bar elements |
| `--radius-control` | `6px` | nav pills, buttons, logo square |
| `--radius-pill` | `999px` | chips |
| `--content-pad` | `28px 24px 48px` | per-page column padding (shared) |
| `--font-sans` | `'Helvetica Neue', Helvetica, Arial, sans-serif` | global family (R1) |

**Typography — added by CriticReview R1.** The app currently sets **no**
`font-family` anywhere (`styles.scss` is an empty comment, `index.html` sets
nothing, and the ten `font-family: inherit` rules in `habit-list.component.scss`
inherit from a `body` with no family — i.e. the browser default serif). Without
this token Phase 0 ships the right colours in the wrong typeface, which dominates
the design-check composite. Sizes in the bar are **fractional and must not be
rounded**, since design-check is a pixel diff: wordmark `14.5px/700`, nav item
`13.5px`, date `12.5px`, logo glyph `12px`, page `h1` `23px` /
`letter-spacing:-0.3px`. Setting the family on `body` also fixes the three
un-restyled pages for free, since their `inherit` rules finally resolve.

**Status accents (defined now, consumed by §1–§3 — see the scope note below):**

| Token | Value | Role |
|---|---|---|
| `--done` / `--done-bg` / `--done-border` | `#22c55e` / `#f4fbf6` / `#e2f0e6` | done rows, checked box |
| `--done-text` | `#166534` | deep green text on done tint |
| `--missed` / `--missed-bg` / `--missed-border` | `#ef4444` / `#fdf4f4` / `#f3dede` | overdue/slipping rows |
| `--danger-text` / `--danger-border` | `#c92a2a` / `#eec4c4` | Delete button |
| `--pending` / `--pending-bg` / `--pending-text` | `#f59e0b` / `#fef3c7` / `#92400e` | pending/amber |
| `--row-neutral` | `#dcdcd9` | to-do row left border |
| `--checkbox-border` | `#c9cdd2` | unchecked box |

Per AD-006, status tokens are named **by status**, and habit colour stays
decoration alongside an icon — the two never share a channel. The calendar's
lavender "future" tint (`#e7eaff` / `#8f95e8`) and the Analytics heatmap blue
ramp (`#e9f1fa → #c7dcf1 → #7fb0de → #3c87cd`) were also captured from the
prototype but belong to §3 / §4 and are **not** defined in Phase 0.

**Scope decision — declaring status tokens ahead of first use.** Phase 0's shell
uses only the core tokens. The status tokens are declared now (a handful of inert
`:root` lines) so §1–§3 *consume* rather than re-sample them, honouring the
roadmap's "extract shared primitives early." Accepted tradeoff: a few tokens sit
unused until their section lands. This is cheap and reversible; the alternative
(each page re-sampling the same greens) is how a palette drifts.

This layer is Medium-sized work with Large-sized blast radius, which is why it is
the thing the harden round scrutinises.

### 2.6 Logo implementation (decided by the prototype)

The prototype does **not** use a checkbox glyph or an SVG — it is a literal
`✓` (U+2713) text node inside a styled `<span>`: `width:22px; height:22px;
border-radius:6px; background:#0066cc; color:#fff; font-size:12px`, flex-centered,
followed by the `HabitTracker` wordmark (`font-size:14.5px; font-weight:700;
color:#16181c`, `gap:9px`). Phase 0 reproduces exactly that — a styled span with a
`✓`, no SVG, no asset. (The roadmap called it a "checkbox"; the source is a
check*mark*. Matching the source is the correct call — it needs no asset pipeline
and is what the committed mockup shows.)

### 2.7 Tests

`app.component.spec.ts` currently asserts (a) the component creates, (b)
`title === 'habit_tracker'`, and (c) at least one `.nav-link` exists. The restyle
must keep the suite green:

- Update the nav assertion to expect **5** nav items (or keep `.nav-link` as the
  class so the count assertion still holds and tighten it to `=== 5`).
- The `title` field can stay (it is the Angular app id, unrelated to the visible
  `HabitTracker` wordmark) so that assertion need not change — the wordmark is
  literal template copy.
- Add a minimal spec (or extend) asserting the date element renders and the two
  new routes resolve to their stub components.

## 3. What is OUT of scope?

- **The actual Analytics and Stacks pages.** Phase 0 ships stubs only. Roadmap §4
  (Analytics) and §5 (Stacks) are each a full spec — new aggregations, a new
  persisted `Stack` entity, CDK drag-and-drop. None of that is here.
- **The stat cards, sparklines, heatmap, per-page card components.** Phase 0
  defines the tokens they will use; it does not build them. `<stat-card>` and the
  chart/heatmap primitives belong to their sections (Dashboard §1, Analytics §4).
- **Restyling the interiors of Dashboard / Habits / Calendar.** They move inside
  the new content column and may pick up token colours, but their row/section
  restyles are roadmap §1–§3. Phase 0 must not change their behaviour.
- **A live, self-updating "today" clock.** The date is computed once per app
  load. A session that spans local midnight will show yesterday's date until
  reload — accepted deliberately: a midnight timer is a `setInterval`/zone
  concern disproportionate to a habit tracker's session length, and every other
  date derivation in the app is likewise computed against a `today` captured at
  construction.
- **Mobile / responsive nav** (hamburger, collapsing bar). The mockups are the
  1440px desktop prototype; no mobile mockup exists, and per CLAUDE.md "only what
  a static screenshot shows gets checked." Deferred, not designed.
- **Dark mode / theming beyond the single light palette.**
- **Any data-model or `HabitService` change.** No new fields, no new derivations,
  no `STORAGE_KEY` touch (that is reserved for 4c per STATE.md).

## 4. How do we know it is done?

Acceptance criteria — each individually checkable:

1. The top bar renders five nav items in order (Dashboard, Habits, Calendar,
   Analytics, Stacks); the active item is a **light-blue tinted pill**
   (`background: var(--accent-tint)` `#e9f1fa`, `color: var(--accent)` `#0066cc`,
   `font-weight: 600`) — **not** a solid/filled blue pill (CriticReview R11; the
   roadmap's "filled blue pill" is the paraphrase §2.2 overturns). Navigating to
   `/` lights **only** Dashboard (exact match), and navigating to `/habits`
   lights only Habits.
2. `/analytics` and `/stacks` each resolve to their stub component and render
   inside the shell with **no console errors**.
3. The bar shows, left-to-right: the `✓`-in-blue-square logo + `HabitTracker`
   wordmark; the nav; and a right-aligned date. Tested directly against the pure
   function: `formatBarDate(new Date(2026, 6, 23)) === 'Thu · Jul 23, 2026'`, and
   the same assertion holds regardless of the machine's ambient locale (R3).
4. The bar is sticky (stays on scroll); **both** `body` and the shell wrapper
   carry the light-gray `--page-bg`, and `body { margin: 0 }` so the bar is
   genuinely full-bleed (R2); the three existing pages render below the bar with
   **behaviour unchanged** (their specs pass untouched). The shell imposes **no**
   max-width on `<router-outlet>` — per-page columns are each page's own concern
   (§2.3), so there is **no ~1150px column** to check (CriticReview R12; the
   roadmap's "~1150px" is superseded, see §5 #3).
5. Design tokens exist as `:root` CSS custom properties in `src/styles.scss`, and
   the shell consumes them (no hard-coded hex in `app.component.scss` for any
   value that has a token).
6. `npm test` is green: `app.component.spec.ts` updated to assert 5 nav items +
   the date element + both stub routes; all other existing specs (107 baseline
   per STATE.md) pass **unmodified**.
7. `npm run build` succeeds; no SCSS budget errors introduced (watch
   `app.component.scss` / global styles against the 6 kB warn budget noted in
   STATE.md).
8. **Design check — bar strip only** (rescoped by CriticReview R4). ✅
   Prerequisite met: all five page mockups are captured to
   `design/target/{dashboard,habits,calendar,analytics,stacks}.png` (1440px-wide,
   2× DSF, full-page, from the prototype source). The bar is identical on every
   page, so the shell is validated on Dashboard via
   `npm run design:shot -- dashboard --width 1440 --viewport-only`, **judging only
   the top ~55px band** (54px bar + 1px border): logo, 5-item nav with the tinted
   active pill, right-aligned date.

   **A full-page match is NOT a Phase 0 criterion and must not be attempted.**
   This slice deliberately leaves the Dashboard/Habits/Calendar interiors
   un-restyled (§3), so a full-page composite will show a correct bar above
   largely unstyled content. That is the specified outcome. Full-page
   `dashboard.png` parity is an acceptance criterion of **roadmap §1**, not of
   this slice — chasing it here is scope creep into §1.
9. An unknown URL (e.g. `/nonsense`) redirects to Dashboard rather than rendering
   an empty shell (R7). `scripts/design-shot.mjs`'s `ROUTES` map gains
   `analytics` and `stacks`, so `/design-check analytics` resolves (R6).

## 5. Open questions — resolved

1. **Token palette values.** ✅ Resolved — sampled directly from the prototype
   source and tabulated in §2.5.
2. **Logo: SVG vs glyph.** ✅ Resolved — the prototype uses a literal `✓` text
   node in a styled square; Phase 0 matches it (§2.6). No SVG.
3. **Content-column width.** ✅ Resolved — there is **no** single shell width; the
   prototype uses per-page widths (960/1000/900/1000/900). The shell imposes none
   (§2.3). The roadmap's "~1150px" was a paraphrase and is superseded.
4. **Nav class name.** ✅ Resolved by CriticReview R9 — keep `.nav-link` and
   restyle it. The existing spec's selector survives; the assertion only tightens
   from `> 0` to `=== 5`.
5. **Status colours in the token layer now.** ✅ Resolved — yes, declared in
   Phase 0 with the accepted "tokens ahead of first use" tradeoff (§2.5), so
   §1–§3 consume rather than re-sample. Re-examined as possible scope creep in
   CriticReview R10 and upheld.

All open questions are now resolved. The harden round (`CriticReview.md`, 1 round
per the Medium sizing) produced seven `[FIX]` findings, all folded back into this
document; the three most consequential were **R1** (the app has no global font at
all — pure colour tokens would have shipped the design in the browser's default
serif), **R3** (a bare `new Date()` makes AC 3 untestable and locale-flaky), and
**R4** (AC 8 as originally written could not pass, because this slice
intentionally leaves the page interiors unstyled).

A Round 2 fold-back audit re-verified all ten Round 1 findings against the code
and caught two `[FIX]`es that had been written into the critic's conclusions but
never reached §4: **R11** (AC 1 still demanded the "filled blue pill" §2.2
overturns) and **R12** (AC 4 still mandated the ~1150px column §2.3 abolished —
which, implemented literally, would have overridden all five per-page widths
while every "Done when" still reported green).

## 6. Retrospective

*(Filled after the slice ships, per TEMPLATE.md.)*

- Did Analyst.md catch anything not thought about up front?
- Did anything in tasks.md turn out to be wrong during coding? What?
