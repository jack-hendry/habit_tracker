# CriticReview — global-shell (Roadmap Phase 0)

One harden round (Medium, per the CLAUDE.md sizing table). Focus per the Analyst:
the **design-token layer**, because it is the piece with Large-sized blast radius,
and the **acceptance criteria**, because Phase 0 is the first slice verified by
pixel comparison rather than by unit test.

**[FIX]** changed the Analyst; **[OK]** are confirmations kept as implementation
guard-rails.

Values below were re-derived from the prototype source
(`Habit Tracker Prototype.dc.html`), not from the roadmap prose.

---

## Round 1

### R1 [FIX] The app has no global font — the single largest visual delta, and the Analyst never mentions typography.

`src/styles.scss` is an empty comment, `src/index.html` sets nothing, and the ten
`font-family: inherit` declarations in `habit-list.component.scss` inherit from a
`body` that has no family — i.e. the browser default (serif on most engines). The
prototype sets `body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}`.

Every token in Analyst §2.5 is a *colour or radius*; not one is typographic. Ship
Phase 0 as specced and the bar renders in the right colours in the wrong
typeface — a delta that dominates the design-check composite and makes every
later section's comparison untrustworthy.

**Resolution:** the token layer gains typography, applied on `body` in
`styles.scss`:

- `--font-sans: 'Helvetica Neue', Helvetica, Arial, sans-serif`
- Bar sizes are **fractional and must not be rounded** (design-check is a pixel
  diff): wordmark `14.5px/700`, nav item `13.5px`, date `12.5px`, logo glyph
  `12px`, page `h1` `23px` with `letter-spacing:-0.3px`.

The existing components' `font-family: inherit` then starts resolving to the
right family for free — this is a fix that improves the three un-restyled pages
at zero extra cost.

### R2 [FIX] `body` keeps its default 8px margin, so the "full-bleed sticky bar" will not be full-bleed.

The prototype sets `body{margin:0;background:#f7f7f5}`. The Analyst specifies the
page background on a `min-height:100vh` wrapper *inside* `app-root` but never
resets `body`. With the UA default `margin:8px`, the sticky bar floats 8px from
each edge with white showing around it, and `position:sticky; top:0` docks 8px
down. Additionally, a page shorter than the viewport shows white below the
wrapper on overscroll unless `body` also carries the background.

**Resolution:** `styles.scss` sets `body { margin: 0; background: var(--page-bg);
font-family: var(--font-sans); }`. Both the wrapper *and* `body` carry the
background — the wrapper for the layout box, `body` for overscroll.

### R3 [FIX] The date is computed from a bare `new Date()`, which makes AC 3 untestable and locale-flaky.

Two defects in one line:

1. **Untestable.** AC 3 asserts the bar reads `Thu · Jul 23, 2026` "for a pinned
   test date", but a field initialised as `new Date()` cannot be pinned without
   mocking the global clock. The repo already solved this exact problem and the
   Analyst does not reuse it: `HabitService.todayIso(d: Date = new Date())` is
   `static` + parameterised precisely "so specs can pin a fixed day."
2. **Locale-flaky.** `Intl.DateTimeFormat` / `DatePipe` with the ambient locale
   renders `23 Jul 2026` under `en-GB` and something else again elsewhere. The
   design is `en-US`. A test that passes on the author's machine and fails in CI
   because of a locale default is the worst kind of red.

**Resolution:** an exported **pure function** taking an explicit date and a pinned
locale — `formatBarDate(d: Date = new Date()): string`, formatting with an
explicit `'en-US'` and joining weekday and date with ` · `. It is presentation,
not domain, so it does **not** go on `HabitService`; put it beside `AppComponent`
and unit-test it directly with a fixed `new Date(2026, 6, 23)` (local
construction per AD-003 — never `new Date('2026-07-23')`).

### R4 [FIX] AC 8 as written cannot pass, because Phase 0 deliberately leaves the page interiors unstyled.

This is the finding most likely to waste a session. Phase 0 changes the global
background to `#f7f7f5` and adds the bar, but the Dashboard/Habits/Calendar
*interiors* are explicitly out of scope until §1–§3. A full-page
`/design-check dashboard` therefore compares the committed mockup (fully designed
stat cards, restyled rows) against an app that has a correct bar above
essentially un-restyled content. It will look like a catastrophic failure and it
is the specified, correct outcome of this slice.

**Resolution:** AC 8 is scoped to the **top bar strip only** for Phase 0 — compare
the top ~54px band (bar height is `54px` + 1px border), not the full page. Run
the capture with `--viewport-only` (already supported by `design-shot.mjs`) and
judge only the bar. The full-page comparison for `dashboard.png` becomes an
acceptance criterion of **§1 (Dashboard)**, not of Phase 0. State this in
`tasks.md` so the executor does not "fix" the unstyled interiors mid-slice —
scope creep into §1 is the specific failure mode this finding prevents.

### R5 [FIX] "A stub with a heading and 'Coming soon'" leaves the executor inventing structure that §4/§5 inherit.

Analyst §2.1 under-specifies the two stubs. Every page in the prototype shares one
container shape, and if the stubs don't adopt it, Analytics/Stacks start from
noise and the divergence is inherited by their full specs later.

**Resolution:** both stubs render the exact page-container pattern —
`max-width` (Analytics `1000px`, Stacks `900px`, per §2.3) + `margin:0 auto` +
`padding:28px 24px 48px`, containing an `<h1>` at `23px/-0.3px/#16181c` reading
`Analytics` / `Habit Stacks`, plus one muted (`--text-muted`) line of placeholder
copy. Nothing else. Files follow the repo's existing convention exactly:
`src/app/analytics/analytics.component.{ts,html,scss}` and
`src/app/stacks/stacks.component.{ts,html,scss}`, `standalone: true` written
explicitly, `styleUrl` singular, `.component.ts` suffix — matching
`dashboard.component.ts`, **not** the suffix-free Spanish-repo idiom.

### R6 [FIX] `design-shot.mjs`'s `ROUTES` map should gain the two new routes in this slice, not later.

Analyst AC 8 says Analytics/Stacks targets are "staged for §4/§5 … when those
pages are built." That is now wrong by one slice: after Phase 0 both routes
**exist** (as stubs), so `/design-check analytics` is runnable immediately and
the targets are already committed. Leaving the map stale means the next person
hits "No route known for analytics" and thinks the tooling is broken.

**Resolution:** add `analytics: '/analytics'` and `stacks: '/stacks'` to `ROUTES`
in `scripts/design-shot.mjs` as part of this slice. (Their *comparisons* will of
course show stub-vs-design; that is expected and is §4/§5's problem, per R4.)

### R7 [FIX] No `**` wildcard route — going from 3 routes to 5 makes a typo'd URL render a bare shell.

`app.routes.ts` has no catch-all. Today a bad URL renders the nav and nothing
else; after Phase 0 it renders a polished bar and an empty gray page, which reads
as a broken app rather than a bad link. Pre-existing, but this slice is what makes
it *look* like a bug, and the fix is one line.

**Resolution:** add `{ path: '**', redirectTo: '' }` as the last route. Explicitly
**not** a designed 404 page — that is not in the prototype and is not in scope;
this is a one-line redirect to Dashboard.

### R8 [OK] Five hardcoded anchors, not an `@for` over a nav model.

Confirmed as the right call. The prototype uses `sc-for` over a `navItems` array
because its runtime needs one, but in Angular each item needs a distinct
`routerLink` and Dashboard alone needs `[routerLinkActiveOptions]="{exact:true}"`
— a data-driven nav would have to carry that exception as a per-item flag.
Five static `<a>` elements are clearer and let `routerLinkActive` do the work.
**Guard-rail:** the active style is a `.active` class in SCSS
(`background: var(--accent-tint); color: var(--accent); font-weight: 600`), never
the inline colour ternary the prototype source uses.

### R9 [OK] Keep the `.nav-link` class name (resolving Analyst §5 #4).

Keeping it means `app.component.spec.ts`'s existing selector survives; the
assertion only tightens from `> 0` to `=== 5`. Renaming buys nothing and costs a
spec edit. Decided: keep `.nav-link`, restyle it.

### R10 [OK] Declaring status tokens in Phase 0 is the right scope line (resolving Analyst §5 #5).

Re-examined as possible scope creep. It is not: they are inert `:root`
declarations, they add no markup, no component, and no test surface, and the
alternative — three later sections each re-sampling the same greens from the
prototype — is exactly how a palette drifts. The accepted tradeoff (a few tokens
unused until their section lands) is named in Analyst §2.5 and stands.

**Guard-rail:** the calendar lavender and the Analytics heatmap ramp stay **out**
of Phase 0. They belong to one section each, and unlike the status accents they
are not shared across sections, so there is no drift argument for hoisting them.

---

## Round 2 — fold-back audit

Not a second harden round (Medium earns one). This is a verification pass over
Round 1: every factual claim re-checked against HEAD, and every `[FIX]` traced
into `Analyst.md` to confirm it actually landed. Two had not.

### Round 1's claims re-verified against the code — all ten hold

| # | Claim | Verified against HEAD |
|---|---|---|
| R1 | App sets no `font-family` anywhere | ✅ `src/styles.scss` is one comment line; `src/index.html` sets nothing |
| R2 | No `body` reset | ✅ no `body` rule exists in the repo |
| R3 | `todayIso` is the existing pin-the-clock precedent | ✅ `src/app/habit/habit.service.ts`, `static` + parameterised; pinned at `habit.service.spec.ts:99` |
| R4 | Full-page design-check cannot pass in Phase 0 | ✅ sound — interiors are out of scope per §3 |
| R5 | Stubs under-specified | ✅ and note `src/app/analytics/` and `src/app/stacks/` already exist as **empty** dirs |
| R6 | `ROUTES` map lacks the new routes | ✅ `scripts/design-shot.mjs:20-24` — dashboard/habits/calendar only |
| R7 | No `**` wildcard route | ✅ `src/app/app.routes.ts` has exactly three routes |
| R8 | Five hardcoded anchors | ✅ judgement call, sound |
| R9 | Keep `.nav-link` | ✅ `app.component.html` uses it; spec asserts `toBeGreaterThan(0)`, needs tightening to `=== 5` |
| R10 | Status tokens declared in Phase 0 | ✅ judgement call, sound |

### R11 [FIX] AC 1 still says "filled blue pill" — the exact wording §2.2 exists to overturn.

Round 1 revised §2.2 to specify a **light-blue tinted** pill and R8 pinned the
guard-rail (`background: var(--accent-tint); color: var(--accent);
font-weight: 600`), but §4's AC 1 was never updated. It still reads "the active
item is a filled blue pill" — the roadmap paraphrase that §2.2 calls out as
"visibly wrong."

§4 is the section an executor treats as the contract. A criterion that
contradicts the correction it is meant to encode will be implemented as written.

**Resolution:** AC 1 restated with the tinted values inline and an explicit
"**not** a solid/filled blue pill."

### R12 [FIX] AC 4 still mandates the ~1150px shell column that §2.3 abolished.

The more dangerous of the two. AC 4 reads "content sits in a centered ~1150px
column", contradicted twice in the same document — §2.3 ("there is **no single
~1150px shell column** … Phase 0 therefore does **not** impose a width on
`<router-outlet>`") and §5 #3 ("the roadmap's '~1150px' was a paraphrase and is
superseded").

Failure mode: the executor wraps `<router-outlet>` in a 1150px column, silently
overriding every per-page width (960/1000/900/1000/900) and mis-rendering all
five pages — while every "Done when" in the slice still reports green. A
constraint that is wrong *and* self-verifying is the worst kind.

**Resolution:** AC 4 restated to assert the shell imposes **no** max-width, and
to fold in the R2 `body` reset it should already have mentioned.

### R13 [OK] AC 6 names the baseline but not the new total — deferred to `tasks.md`.

"Consequences for `tasks.md`" #6 requires the wrap-up step to name the exact new
test count, not "tests pass." AC 6 currently gives only the 107 baseline. That is
acceptable *here* — the new total is not knowable until `tasks.md` decides how
many specs `formatBarDate` gets — but `tasks.md` must resolve it rather than
inherit the vagueness.

### R14 [OK] `src/app/analytics/` and `src/app/stacks/` already exist as empty directories.

Untracked and harmless (git does not track empty dirs), but R5's step should be
written as "create the files in these existing dirs", not as greenfield — an
executor that finds an unexpected directory tends to stop and ask.

---

## Consequences for `tasks.md`

1. `styles.scss` step must set `body { margin: 0 }`, the font family, **and** the
   background — all three, in one step, verified by eye at the bar's top-left
   corner (R1, R2).
2. `formatBarDate` is its own step with its own unit test, pinned date and pinned
   locale, written **before** the bar template consumes it (R3).
3. The design-check step says **bar strip only**, `--viewport-only`, and states
   that unstyled page interiors are the expected outcome of this slice (R4).
4. Stub steps carry the literal container/`h1` skeleton, not a description (R5),
   and note the target dirs already exist (R14).
5. One step covers `app.routes.ts`: two new lazy routes **plus** the `**`
   redirect, and the `ROUTES` map in `scripts/design-shot.mjs` (R6, R7).
6. Expected test count must be stated explicitly. Baseline is **107**
   (`specs/STATE.md`); this slice adds the `formatBarDate` specs and tightens the
   nav-count assertion, so the wrap-up step names the exact new total rather than
   "tests pass" (R13).
7. The nav step must specify the **tinted** active pill, never "filled blue"
   (R11), and the shell step must impose **no** max-width on `<router-outlet>`
   (R12).

## Consequences for `Analyst.md`

- §2.4 (date formatter) — rewritten for the injectable-date + pinned-locale
  signature (R3).
- §2.5 (tokens) — gains the typography tokens (R1).
- §2.3 (page shell) — gains the `body` reset (R2).
- AC 1 — restated with the tinted pill values (R11).
- AC 3 — restated against `formatBarDate` directly (R3).
- AC 4 — the ~1150px column removed; shell imposes no width (R12).
- AC 8 — rescoped to the bar strip (R4).
- New AC — unknown URL redirects to Dashboard (R7).
- §5 #4 and #5 — resolved by R9 and R10.
