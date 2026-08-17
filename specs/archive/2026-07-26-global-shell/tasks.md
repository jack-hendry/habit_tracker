# tasks — global-shell (Roadmap Phase 0)

**12 steps, in order, do not skip ahead.** Every step ends at a green build —
never leave the repo non-compiling between steps.

Baseline before this slice: **107 passing specs** (`specs/STATE.md`). This slice
adds 8 (3 for `formatBarDate`, 2 for the bar in `app.component.spec.ts`, 3 for
routing) for a final total of **115** (CriticReview R13).

**Scope fence — read before Step 1.** This slice restyles the *shell only*: the
top bar, the page background, the token layer, and two stub pages. The
interiors of Dashboard, Habits and Calendar are **deliberately left
un-restyled** — they are roadmap §1–§3, each with its own spec. A full-page
design comparison in this slice will show a correct bar above largely unstyled
content, and **that is the specified, correct outcome** (CriticReview R4). Do
not "fix" it.

**Never touch, in any step:**
`src/app/dashboard/*`, `src/app/habit/*`, `src/app/calendar/*`,
`src/app/app.config.ts`, `src/index.html`, `angular.json`.

Values below were sampled from the Claude Design prototype source and
re-verified pixel-by-pixel against `design/target/dashboard.png`. **Fractional
sizes must not be rounded** — design-check is a pixel diff.

---

### Step 1 — Add the design tokens and the `body` reset to `styles.scss`

**Files**
- MODIFY `src/styles.scss` — currently one comment line, replace it wholesale
- DO NOT TOUCH: any component `.scss`, `src/index.html`

**Context**
This is the load-bearing step of the slice: every later phase consumes these
tokens instead of re-sampling hexes. Three things must all land together — the
`:root` custom properties, `body { margin: 0 }` (without it the "full-bleed"
sticky bar floats 8px from each edge and docks 8px down), and the font family
(the app currently sets **no** `font-family` anywhere, so it renders in the
browser's default serif). The status tokens are declared now but not consumed
until roadmap §1–§3 — that is intentional, not dead code.

**Do**
1. Replace the entire contents of `src/styles.scss` with:

```scss
/* ---------------------------------------------------------------------------
   Design tokens — the single source of truth for the redesign's visual
   language (specs/global-shell/Analyst.md §2.5). Values sampled from the
   Claude Design prototype source, not eyeballed. Components consume these; no
   hard-coded hex belongs in a component's SCSS for a value that has a token.
   --------------------------------------------------------------------------- */
:root {
  /* Surfaces & text */
  --page-bg: #f7f7f5;
  --surface: #fff;
  --border: #e8e8e6;
  --text-strong: #16181c;
  --text: #4c5057;
  --text-muted: #8a8f96;
  --nav-inactive: #565b63;

  /* Accent */
  --accent: #0066cc;
  --accent-tint: #e9f1fa;

  /* Controls */
  --chip-bg: #f1f1ef;
  --control-border: #d7d7d4;
  --checkbox-border: #c9cdd2;

  /* Radii */
  --radius-card: 8px;
  --radius-control: 6px;
  --radius-pill: 999px;

  /* Layout */
  --content-pad: 28px 24px 48px;

  /* Typography */
  --font-sans: 'Helvetica Neue', Helvetica, Arial, sans-serif;

  /* Status accents — declared ahead of first use so roadmap §1–§3 consume
     rather than re-sample them (Analyst §2.5, CriticReview R10). Unused in
     Phase 0 by design. */
  --done: #22c55e;
  --done-bg: #f4fbf6;
  --done-border: #e2f0e6;
  --done-text: #166534;
  --missed: #ef4444;
  --missed-bg: #fdf4f4;
  --missed-border: #f3dede;
  --danger-text: #c92a2a;
  --danger-border: #eec4c4;
  --pending: #f59e0b;
  --pending-bg: #fef3c7;
  --pending-text: #92400e;
  --row-neutral: #dcdcd9;
}

/* `margin: 0` makes the sticky bar genuinely full-bleed; the background is on
   `body` as well as the shell wrapper so a short page shows gray, not white,
   on overscroll (CriticReview R2). */
body {
  margin: 0;
  background: var(--page-bg);
  font-family: var(--font-sans);
}
```

2. Do **not** add a `color` declaration to `body` — the three existing pages set
   their own text colours and a global default would shift them.

**Done when**
- `npx ng build` succeeds with no new warnings
- `grep -c -- '--' src/styles.scss` shows the token block is present
- `grep -n 'margin: 0' src/styles.scss` returns the `body` rule

---

### Step 2 — Add the `formatBarDate` pure function and its spec

**Depends on:** Step 1

**Files**
- CREATE `src/app/format-bar-date.ts`
- CREATE `src/app/format-bar-date.spec.ts`
- DO NOT TOUCH: `src/app/habit/habit.service.ts` — this is presentation, not
  domain, and must not go on the service

**Context**
The repo already solved "pin the clock in a spec": `HabitService.todayIso(d:
Date = new Date())` is parameterised precisely so specs can fix a day. Mirror
that signature. The locale must be pinned to `'en-US'` explicitly — the ambient
default renders `23 Jul 2026` under `en-GB`, which is the worst kind of CI flake.
Written now, consumed by the template in Step 7.

**Do**
1. Create `src/app/format-bar-date.ts`:

```ts
/**
 * The top bar's date, e.g. `Thu · Jul 23, 2026`.
 *
 * The date is a parameter with a default, mirroring
 * `HabitService.todayIso(d: Date = new Date())`, so specs can pin a fixed day
 * without mocking the global clock. The locale is pinned to 'en-US' because the
 * ambient default renders `23 Jul 2026` under en-GB — green on one machine and
 * red on another (CriticReview R3).
 *
 * Presentation, not domain: it lives beside AppComponent, not on HabitService.
 * Computed once at app load — a session spanning local midnight shows the
 * previous day until reload, accepted deliberately (Analyst §3).
 */
export function formatBarDate(d: Date = new Date()): string {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const rest = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${weekday} · ${rest}`;
}
```

   The separator is U+00B7 MIDDLE DOT (`·`) surrounded by single spaces — not a
   hyphen, not a bullet (`•`).

2. Create `src/app/format-bar-date.spec.ts`:

```ts
import { formatBarDate } from './format-bar-date';

describe('formatBarDate', () => {
  it('formats a pinned date as "Thu · Jul 23, 2026"', () => {
    // Constructed from local parts, never `new Date('2026-07-23')` (AD-003).
    expect(formatBarDate(new Date(2026, 6, 23))).toBe('Thu · Jul 23, 2026');
  });

  it('formats a single-digit day without padding', () => {
    expect(formatBarDate(new Date(2026, 0, 1))).toBe('Thu · Jan 1, 2026');
  });

  it('defaults to today when called with no argument', () => {
    expect(formatBarDate()).toBe(formatBarDate(new Date()));
  });
});
```

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` reports **110 SUCCESS**
  (was 107)
- All three `formatBarDate` specs pass by name

**If blocked**
If the first spec fails on the separator, check that the source file contains
U+00B7 and not a look-alike. Do not change the expected string to match a wrong
implementation.

---

### Step 3 — Create the Analytics stub component

**Depends on:** Step 2

**Files**
- CREATE `src/app/analytics/analytics.component.ts`
- CREATE `src/app/analytics/analytics.component.html`
- CREATE `src/app/analytics/analytics.component.scss`
- DO NOT TOUCH: `src/app/app.routes.ts` (that is Step 6)

**Context**
`src/app/analytics/` **already exists as an empty directory** — create the files
in place; an unexpected directory is not a blocker (CriticReview R14). Follow
`src/app/dashboard/dashboard.component.ts` exactly: `standalone: true` written
explicitly, `styleUrl` singular, `.component.ts` suffix. This is a placeholder
only — roadmap §4 replaces it wholesale. It exists so the nav can show five
honest items. **No aggregations, no charts, no service injection.**

**Do**
1. Create `src/app/analytics/analytics.component.ts`:

```ts
import { Component } from '@angular/core';

/**
 * Placeholder so the five-item nav is honest and `/analytics` resolves.
 * Roadmap §4 replaces this wholesale (Analyst §2.1).
 */
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {}
```

2. Create `src/app/analytics/analytics.component.html`:

```html
<div class="page-container">
  <h1>Analytics</h1>
  <p class="placeholder">Charts, streak history and the completion heatmap land in roadmap §4.</p>
</div>
```

3. Create `src/app/analytics/analytics.component.scss`:

```scss
.page-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--content-pad);
}

h1 {
  margin: 0 0 20px;
  font-size: 23px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: var(--text-strong);
}

.placeholder {
  margin: 0;
  font-size: 13.5px;
  color: var(--text-muted);
}
```

**Done when**
- `npx ng build` succeeds
- `ls src/app/analytics/` lists exactly the three new files

---

### Step 4 — Create the Stacks stub component

**Depends on:** Step 3

**Files**
- CREATE `src/app/stacks/stacks.component.ts`
- CREATE `src/app/stacks/stacks.component.html`
- CREATE `src/app/stacks/stacks.component.scss`
- DO NOT TOUCH: `src/app/app.routes.ts` (that is Step 6)

**Context**
Identical to Step 3 except the `max-width` is `900px` and the heading reads
`Habit Stacks`. `src/app/stacks/` already exists as an empty directory. No
`Stack` entity, no drag-and-drop — those are roadmap §5.

**Do**
1. Create `src/app/stacks/stacks.component.ts`:

```ts
import { Component } from '@angular/core';

/**
 * Placeholder so the five-item nav is honest and `/stacks` resolves.
 * Roadmap §5 replaces this wholesale (Analyst §2.1).
 */
@Component({
  selector: 'app-stacks',
  standalone: true,
  imports: [],
  templateUrl: './stacks.component.html',
  styleUrl: './stacks.component.scss',
})
export class StacksComponent {}
```

2. Create `src/app/stacks/stacks.component.html`:

```html
<div class="page-container">
  <h1>Habit Stacks</h1>
  <p class="placeholder">Chaining habits into ordered, reorderable stacks lands in roadmap §5.</p>
</div>
```

3. Create `src/app/stacks/stacks.component.scss` — identical to
   `analytics.component.scss` from Step 3 **except** `max-width: 900px`.

**Done when**
- `npx ng build` succeeds
- `grep -n 'max-width' src/app/stacks/stacks.component.scss` shows `900px`
- `grep -n 'max-width' src/app/analytics/analytics.component.scss` shows `1000px`

---

### Step 5 — CHECKPOINT (no new code)

**Depends on:** Step 4

**Do**
1. Run `npx ng build`.
2. Run `npx ng test --watch=false --browsers=ChromeHeadless`.
3. Re-confirm: `src/styles.scss` has both the `:root` block and the `body` reset;
   `formatBarDate` exists with a default parameter and `'en-US'`; both stub
   directories contain three files each.

**Done when**
- Build succeeds
- Test run reports **110 SUCCESS**
- Nothing in `src/app/dashboard/`, `src/app/habit/`, `src/app/calendar/` has been
  modified — confirm with `git status --short`

**If blocked**
If the test count is not 110, an earlier step did not land. STOP and report
which. Do not improvise.


### Step 6 — Register the two routes, the wildcard redirect, and the design-shot routes
---

**Depends on:** Step 5

**Files**
- MODIFY `src/app/app.routes.ts` — anchor: `path: 'calendar'`
- MODIFY `scripts/design-shot.mjs` — anchor: `const ROUTES = {`
- DO NOT TOUCH: `src/app/app.config.ts`

**Context**
Match the existing lazy `loadComponent` shape exactly. The `**` wildcard must be
**last** — Angular matches routes in order, and a wildcard placed earlier
swallows everything. It is a one-line redirect to Dashboard, explicitly **not** a
designed 404 page (that is not in the prototype). Without it, a typo'd URL after
this slice renders a polished bar above an empty gray page, which reads as a
broken app (CriticReview R7).

**Do**
1. In `src/app/app.routes.ts`, after the `calendar` route object and before the
   closing `];`, add:

```ts
  {
    path: 'analytics',
    loadComponent: () =>
      import('./analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
  {
    path: 'stacks',
    loadComponent: () =>
      import('./stacks/stacks.component').then((m) => m.StacksComponent),
  },
  // Last by necessity — Angular matches in order. A one-line redirect to
  // Dashboard, not a designed 404 page (CriticReview R7).
  { path: '**', redirectTo: '' },
```

2. In `scripts/design-shot.mjs`, extend the `ROUTES` map so it reads:

```js
const ROUTES = {
  dashboard: '/',
  habits: '/habits',
  calendar: '/calendar',
  analytics: '/analytics',
  stacks: '/stacks',
};
```

**Done when**
- `npx ng build` succeeds
- `grep -n "path: '\*\*'" src/app/app.routes.ts` returns exactly one hit, and it
  is the **last** route entry in the array
- `grep -n "analytics\|stacks" scripts/design-shot.mjs` shows both keys in `ROUTES`

---

### Step 7 — Replace the shell markup: top bar + page wrapper

**Depends on:** Step 6

**Files**
- MODIFY `src/app/app.component.ts` — anchor: `title = 'habit_tracker';`
- MODIFY `src/app/app.component.html` — replace wholesale
- DO NOT TOUCH: `src/app/app.component.scss` (that is Step 8),
  `src/app/app.component.spec.ts` (that is Step 9)

**Context**
Five hardcoded `<a>` elements, **not** an `@for` over a nav model — each needs a
distinct `routerLink`, and Dashboard alone needs
`[routerLinkActiveOptions]="{ exact: true }"` so `/` does not light up on every
child route (an existing gotcha — keep it). Keep the class name `.nav-link`; the
existing spec's selector depends on it. The logo is a literal `✓` (U+2713) text
node in a styled span — **no SVG, no asset, no emoji variant** (`✔️`). Keep
`title = 'habit_tracker'`: it is the Angular app id, unrelated to the visible
wordmark, and a spec asserts it.

**Do**
1. In `src/app/app.component.ts`, add the import and the `barDate` field so the
   class reads:

```ts
import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { formatBarDate } from './format-bar-date';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'habit_tracker';
  /** Computed once at app load, not on a live midnight timer (Analyst §3). */
  readonly barDate = formatBarDate();
}
```

2. Replace the entire contents of `src/app/app.component.html` with:

```html
<header class="topbar">
  <div class="brand">
    <span class="logo" aria-hidden="true">✓</span>
    <span class="wordmark">HabitTracker</span>
  </div>

  <nav class="nav">
    <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-link">Dashboard</a>
    <a routerLink="/habits" routerLinkActive="active" class="nav-link">Habits</a>
    <a routerLink="/calendar" routerLinkActive="active" class="nav-link">Calendar</a>
    <a routerLink="/analytics" routerLinkActive="active" class="nav-link">Analytics</a>
    <a routerLink="/stacks" routerLinkActive="active" class="nav-link">Stacks</a>
  </nav>

  <span class="bar-date">{{ barDate }}</span>
</header>

<main class="page">
  <router-outlet />
</main>
```

3. The brand is a `<div>`, **not** a link — do not add a sixth anchor.

**Done when**
- `npx ng build` succeeds
- `grep -c 'class="nav-link"' src/app/app.component.html` returns `5`
- `grep -n 'routerLinkActiveOptions' src/app/app.component.html` returns exactly
  one hit, on the Dashboard link

---

### Step 8 — Style the top bar and page wrapper from tokens

**Depends on:** Step 7

**Files**
- MODIFY `src/app/app.component.scss` — replace wholesale
- DO NOT TOUCH: `src/styles.scss`, any page component's SCSS

**Context**
The active nav item is a **light-blue tinted pill, not a solid/filled blue one**:
`background: var(--accent-tint)` (`#e9f1fa`), `color: var(--accent)` (`#0066cc`),
`font-weight: 600`. The roadmap's "filled blue pill" (white-on-blue) is a
paraphrase and is wrong (CriticReview R11). The shell imposes **no max-width** on
`<router-outlet>` — the prototype gives each page its own centered column
(960/1000/900/1000/900), and a shell-level column would silently override all
five while every check still reported green (CriticReview R12).

Every value below was measured against `design/target/dashboard.png`: bar 54px
high + 1px border, `padding: 0 28px`, logo 22×22 at x=28, brand→nav gap 24px,
nav item gap 3px, active pill 96×30. **Do not round the fractional font sizes.**
No hard-coded hex is permitted for any value that has a token.

**Do**
1. Replace the entire contents of `src/app/app.component.scss` with:

```scss
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  height: 54px;
  padding: 0 28px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-right: 24px;
}

/* A literal ✓ in a styled square — the prototype uses no SVG and no asset. */
.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-control);
  background: var(--accent);
  color: var(--surface);
  font-size: 12px;
}

.wordmark {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-strong);
}

.nav {
  display: flex;
  align-items: center;
  /* Corrected during Step 11 from the 3px this step originally specified —
     measurement against design/target/dashboard.png showed the nav drifting
     ~1px per item (4px by "Stacks"). See Analyst §6 / L-011. */
  gap: 2px;
}

.nav-link {
  padding: 7px 13px;
  border-radius: var(--radius-control);
  background: transparent;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--nav-inactive);
  text-decoration: none;

  &:hover {
    color: var(--text-strong);
  }

  /* Tinted, NOT a solid blue pill (CriticReview R11). */
  &.active {
    background: var(--accent-tint);
    color: var(--accent);
    font-weight: 600;
  }
}

.bar-date {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--text-muted);
}

/* The shell supplies the background and the full height only. It imposes NO
   max-width — each page owns its own centered column (CriticReview R12). */
.page {
  display: block;
  min-height: calc(100vh - 55px);
  background: var(--page-bg);
}
```

2. Do not add a `max-width` anywhere in this file.

**Done when**
- `npx ng build` succeeds with **no `anyComponentStyle` budget warning** (6 kB warn
  threshold)
- `grep -nE '#[0-9a-fA-F]{3,6}' src/app/app.component.scss` returns **no hits**
- `grep -n 'max-width' src/app/app.component.scss` returns **no hits**

---

### Step 9 — Update `app.component.spec.ts` and add the routing spec

**Depends on:** Step 8

**Files**
- MODIFY `src/app/app.component.spec.ts` — anchor: `should render navigation links`
- CREATE `src/app/app.routes.spec.ts`
- DO NOT TOUCH: any other `.spec.ts` — the other 107 specs must pass **unmodified**

**Context**
The existing nav assertion is `toBeGreaterThan(0)`; tighten it to exactly 5 and
check the labels and their order. Keep the `title` assertion as-is. The routing
spec uses `RouterTestingHarness` from `@angular/router/testing`, which really
navigates and renders — this is what makes AC 2 honest rather than a config
check. `localStorage.clear()` in `beforeEach` because the wildcard test lands on
Dashboard, which reads the habit store (the same pattern
`dashboard.component.spec.ts` already uses).

**Do**
1. In `src/app/app.component.spec.ts`, add to the imports at the top:

```ts
import { formatBarDate } from './format-bar-date';
```

2. Replace the whole `it('should render navigation links', ...)` block with these
   three specs:

```ts
  it('should render five navigation links in order', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const links = compiled.querySelectorAll('.nav-link');
    expect(links.length).toBe(5);
    expect(Array.from(links).map((l) => l.textContent?.trim())).toEqual([
      'Dashboard',
      'Habits',
      'Calendar',
      'Analytics',
      'Stacks',
    ]);
  });

  it('should render the brand logo and wordmark', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.logo')?.textContent?.trim()).toBe('✓');
    expect(compiled.querySelector('.wordmark')?.textContent?.trim()).toBe('HabitTracker');
  });

  it('should render the current date in the bar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bar-date')?.textContent?.trim()).toBe(formatBarDate());
  });
```

3. Create `src/app/app.routes.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

describe('app routes', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  it('resolves /analytics to the Analytics stub', async () => {
    const harness = await RouterTestingHarness.create('/analytics');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Analytics');
  });

  it('resolves /stacks to the Stacks stub', async () => {
    const harness = await RouterTestingHarness.create('/stacks');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Habit Stacks');
  });

  it('redirects an unknown URL to the dashboard', async () => {
    await RouterTestingHarness.create('/nonsense');
    expect(TestBed.inject(Router).url).toBe('/');
  });
});
```

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` reports **115 SUCCESS**
  (110 after Step 2, +2 in `app.component.spec.ts`, +3 in `app.routes.spec.ts`)
- `git status --short` shows no other `.spec.ts` modified

**If blocked**
If `RouterTestingHarness` is not exported from `@angular/router/testing` in this
Angular version, STOP and report — do not silently downgrade the routing specs
into assertions over the `routes` array, which would stop proving AC 2.

---

### Step 10 — CHECKPOINT (no new code)

**Depends on:** Step 9

**Do**
1. Run `npx ng build`.
2. Run `npx ng test --watch=false --browsers=ChromeHeadless`.
3. Run `git status --short` and confirm the only changed/added files are:
   `src/styles.scss`, `src/app/app.component.{ts,html,scss,spec.ts}`,
   `src/app/app.routes.ts`, `src/app/app.routes.spec.ts`,
   `src/app/format-bar-date.{ts,spec.ts}`, `src/app/analytics/*`,
   `src/app/stacks/*`, `scripts/design-shot.mjs`, `specs/global-shell/tasks.md`,
   `STATE.md`.

**Done when**
- Build succeeds, no `anyComponentStyle` budget warning
- **115 SUCCESS**
- No file outside the list above is modified

**If blocked**
If a Dashboard/Habits/Calendar spec has gone red, the shell has changed page
behaviour, which it must not. STOP and report the failing spec name.

---

### Step 11 — Design check: the top bar strip only

**Depends on:** Step 10

**Files**
- No source files. This step is verification, and **may not edit any page
  component.**

**Context**
**Read this before looking at the composite.** This slice deliberately leaves the
Dashboard/Habits/Calendar interiors un-restyled (roadmap §1–§3). The composite
**will** show a correct top bar above largely unstyled content. That is the
specified, correct outcome of Phase 0 — full-page `dashboard.png` parity is an
acceptance criterion of **roadmap §1**, not of this slice. Judge **only the top
55px band** (54px bar + 1px border). Chasing anything below it is scope creep
into §1 (CriticReview R4).

**Do**
1. Confirm the dev server is running **and is serving this app** — `design-shot.mjs`
   only checks that *something* answers on the port, so a different project's dev
   server on 4200 will be screenshotted without complaint (this happened; see
   L-011). If 4200 is taken, run `npx ng serve --port 4300` and pass
   `DESIGN_BASE_URL=http://localhost:4300`.
2. Run: `npm run design:shot -- dashboard --width 1440 --viewport-only`
   (prefix with `DESIGN_BASE_URL=http://localhost:4300` if using the alt port)
3. Open `design/compare/dashboard.png` and compare **only the top band**:
   - `✓` in a 22×22 blue rounded square at the far left, then the `HabitTracker`
     wordmark
   - five nav items in order: Dashboard, Habits, Calendar, Analytics, Stacks
   - Dashboard carries a **light-blue tinted** pill (not solid blue)
   - the date, right-aligned, reading `<Ddd> · <Mon> D, YYYY`
   - a 1px hairline border under the bar, gray page below it
4. Manually visit `http://localhost:4200/analytics`, `/stacks`, and `/nonsense`.
   Confirm the two stubs render their headings, `/nonsense` lands on Dashboard,
   and the browser console shows **no errors**.

**Done when**
- `design/compare/dashboard.png` exists and the top band matches on all five
  points above
- `/analytics` and `/stacks` render their stub headings with no console errors
- `/nonsense` redirects to the Dashboard

**If blocked**
If the top band differs in a way not listed above, report the specific
difference. Do **not** edit any file under `src/app/dashboard/`,
`src/app/habit/` or `src/app/calendar/` to close a gap — those are §1–§3.

---

### Step 12 — Regression sweep and wrap-up

**Depends on:** Step 11

**Files**
- MODIFY `specs/STATE.md` — anchor: the Quick Tasks / phase status sections
- MODIFY `specs/global-shell/Analyst.md` — anchor: `## 6. Retrospective`
- MODIFY `STATE.md` (repo root) — anchor: `## Executing: global-shell`

**Do**
1. Walk `specs/global-shell/Analyst.md` §4 and record a pass/fail for each of the
   nine acceptance criteria, quoting the command or observation that proves it.
2. Run `npx ng build` and `npx ng test --watch=false --browsers=ChromeHeadless`
   one final time.
3. Fill in `## 6. Retrospective` in `Analyst.md`, answering both questions
   concretely: did Analyst.md catch anything not thought about up front, and did
   anything in `tasks.md` turn out to be wrong during coding.
4. In `specs/STATE.md`, record the new test baseline (**115**) and add any
   architectural decision (`AD-NNN`) or lesson (`L-NNN`) this slice produced.
   Append-only — never renumber existing entries.
5. Remove the `## Executing: global-shell` line from the repo-root `STATE.md`.
   Leaving it stale blocks every subsequent direct edit (B-001 / L-004).

**Done when**
- Build succeeds; **115 SUCCESS**
- All nine acceptance criteria are recorded with evidence
- `grep -n '## Executing:' STATE.md` returns **no hits**
- `specs/STATE.md` shows the 115 baseline

**Do not commit. Do not archive the spec. Report to the user and ask first** —
per CLAUDE.md, nothing is committed without explicit permission for that
specific commit, and the archive ritual is a separate, deliberate step.
