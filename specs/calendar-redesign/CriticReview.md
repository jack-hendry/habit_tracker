# CriticReview — Redesign §3: Calendar (harden round 1)

Reviewed 2026-08-19 against **the prototype source**, not the Analyst's
transcription of it: `Habit Tracker Prototype.dc.html` lines 140–178 (markup)
and 483–491 (`statusOf`, `CS`, `gridFor`), read via `claude-design`
`read_file`. Also re-read against the app as it stands *today* — the Analyst
was written 2026-08-18, before `habits-redesign` and `habit-detail` were
archived, and three of its claims about the codebase have since gone stale.

Verdict: **the spec is sound in shape and wrong in detail.** §3's decisions
(one card, per-status day-number colour, corrected `future`, Today as a ring,
no clamp on Prev/Next, no new service method) all survive. Its *token table*
does not, and would have painted the grid wrong in a way a side-by-side
screenshot flags only as "the greens look washed out".

13 findings. R1–R3 are blocking.

---

## R1 — The four "already tokenised" cell fills are mostly not tokenised (BLOCKING)

Analyst §2.8 closes with: *"the unmodified `done` / `missed` / `pending` /
`not-due` `bg`/`bd` pairs (`--done`/`--done-bg`, `--missed`/`--missed-bg`,
`--pending`/`--pending-bg`)"* already have tokens. Checked one by one against
`src/styles.scss`:

| Source value | Role | Existing token | Verdict |
|---|---|---|---|
| `#22c55e` | `done.bd` | `--done` | ✅ reuse |
| `#dcfce7` | `done.bg` | `--done-bg` is **`#f4fbf6`** | ❌ **new token** |
| `#ef4444` | `missed.bd` | `--missed` | ✅ reuse |
| `#fee2e2` | `missed.bg` | `--missed-bg` is **`#fdf4f4`** | ❌ **new token** |
| `#f59e0b` | `pending.bd` | `--pending` | ✅ reuse |
| `#fef3c7` | `pending.bg` | `--pending-bg` | ✅ reuse |
| `#d1d5db` | `notdue.bd` | *(none)* | ❌ **new token** |
| `#f3f4f6` | `notdue.bg` | *(none)* | ❌ **new token** |

`--done-bg` and `--missed-bg` are the **Dashboard's pale row tints** — a
near-white wash behind a list row on a white card. The calendar's are
saturated fills for a 52px block. They are different colours doing different
jobs and share only a name. `not-due` has no token at all; `#f3f4f6` /
`#d1d5db` exist in the repo *only* as hardcoded literals inside
`calendar.component.scss` itself.

Building §2.8 as written repaints every done cell `#f4fbf6` — visually
"the green looks washed out", which is exactly the failure mode that survives
a screenshot comparison (L-011). **Four new tokens, not zero.**

## R2 — Blank padding cells are `transparent`, not `#fafaf9` (BLOCKING)

Analyst §2.5 says *"Blank (leading/trailing) cells: the app already renders
these as `{ blank: true }` with `background:#fafafa` — one hex off from the
source's `#fafaf9`."* The source disagrees. From `gridFor`:

```js
for (let k = 0; k < M.fd; k++)
  cells.push({ d:'', bg:'transparent', bd:'transparent', tc:'transparent', sh:'none' });
```

Padding cells are **fully transparent** — no fill, no border, no number. The
`#fafaf9` the Analyst grabbed is `CS.off`, which is a *different concept*
entirely (see R3). Two consequences:

- **(a)** `.blank` must become `background: transparent`, not `#fafaf9`. On a
  white card the mockup's padding cells read as card, not as a grey tile.
- **(b)** This dissolves a mismatch nobody noticed: `gridFor` pads **leading
  cells only**, while `HabitService.monthGrid` also pads **trailing** cells to
  fill the last week. With a `#fafafa` fill those trailing tiles are visible
  boxes the mockup does not have; transparent makes the extra row invisible
  and the difference moot. No service change needed — but only because the
  fill goes transparent. Do not "fix" this by trimming trailing blanks.

`--cal-off-bg` is therefore both misnamed and unnecessary. **Drop it.**

## R3 — The app has no `off` status, and must not grow one (BLOCKING — decision)

`statusOf` in the source has **six** outcomes; the app's `DayStatus` has five:

```js
const statusOf = (h,i) => i < 0 ? 'off' : i > T ? 'future' : !h.days[i].due ? 'notdue'
                        : h.days[i].done ? 'done' : i === T ? 'pending' : 'missed';
```

`'off'` (`bg:#fafaf9`, `bd:transparent`, `tc:#c2c6cc`) is a **real day that
falls before the dataset begins** — in the prototype's March, `off:-20` puts
days 1–20 at `i < 0`. It is a *sixth cell state*, and it is not padding.

`HabitService.dayStatus` folds "before creation" into `'not-due'` — stated in
its own docstring (`'not-due' (not scheduled or before creation)`). Adopting
`off` would mean a sixth `DayStatus` value, a `dayStatus` change, a seventh
legend item, and new service spec surface. That is not a Medium restyle, and
§4's Out list already fences off data-model changes.

**Decision: not adopted.** Days before a habit's `startDate` keep rendering as
`not-due` grey. Same shape as §3.6 — sample the prototype's *style*, never
import its dataset's shape. Worth an `AD` entry at archive time; it is the
second deliberate non-adoption on this page.

## R4 — `--radius-card-lg` already exists

Analyst §2.8 lists `--radius-card-lg: 10px` as a new token and §2.3 calls 10px
*"the one place in the app so far with a larger radius"*. `habit-detail` (§2b)
declared it on 2026-08-19 and uses it on all three of its cards. **Reuse; do
not redeclare**, and drop the "one place in the app" claim.

## R5 — The selector and the selected-habit strip are ONE row, not two

The source's flex row holds all six pieces:

```
[Select habit:] [<select>] [dot] [glyph] [name] [category chip]
```

`display:flex; align-items:center; gap:12px; margin-bottom:16px` — one
container, one gap. The app splits them across `.habit-selector` and a
separate `.selected-habit` div with `margin: 0.75rem 0`, so they render as two
stacked rows. §2.2's table lists all six parts but never says they merge, and
§4's scope list says only "the habit-selector row" — an implementer following
the Analyst would restyle two rows into two prettier rows.

**Merge into one row; `.selected-habit` stops being a row of its own.** The
Phase-4a invariant its comment guards (habit colour identifies the habit in
the selector and heading, and never tints a day cell — `habit-metadata`
CriticReview R8) is unaffected by the merge and its comment must survive it.

## R6 — Day numbers are unpadded in the source, zero-padded in the app

`gridFor` pushes the loop integer: `for (let d = 1; d <= M.days; d++) …
cells.push({ d, … })`. So the mockup reads `1 2 3 … 9 10`. The app renders
`cell.iso.split('-')[2] | slice: 0 : 2` → `01 02 03 … 09 10`. At 11px in a
52px tile a leading zero is a visible difference. **Strip the pad.**

## R7 — Weekday headers are a separate grid, not `display:contents`

Source: two sibling grids inside the card — a header grid
(`repeat(7,1fr); gap:4px; margin-bottom:4px`) and then the day grid
(`repeat(7,1fr); gap:4px; margin-bottom:14px`). The app fuses them into one
grid via `.weekday-headers { display: contents }`, with the grid's own grey
`background` + `padding: 2px` + `gap: 2px` faking gridlines.

§3.2 says the card replaces the three-box structure but never says the header
row detaches from the day grid. It must: the two grids have different bottom
margins and the header cells have their own padding (`4px 0`), which
`display:contents` inside a 4px-gap grid cannot reproduce.

## R8 — The test baseline is 236, not "≥163"

AC 1 says *"≥163 passing (the baseline going into this spec — confirm the
exact figure before Step 1)"*. Confirmed just now:
`npx ng test --watch=false --browsers=ChromeHeadless` → **TOTAL: 236 SUCCESS**.
The Analyst's figure predates `habits-redesign` and `habit-detail`. AC 1 reads
**≥236**.

## R9 — `calendar.component.spec.ts` does not exist

AC 7 says the Today ring is *"covered by a spec comparing a cell whose `iso`
is today against one that is not"* — but `src/app/calendar/` contains only
`.ts`, `.html`, `.scss`. There is no spec file to add that test to, and the
component has never had one. The spec file is a **create**, not an edit, and
needs its own step: `TestBed` setup, a `HabitService` with a seeded habit, and
at minimum the today-vs-not-today assertion plus one `getCellClass` case per
status. This is the only new test surface in the section.

## R10 — Put `today` in `getCellClass`, not a second class binding

§3.5 rightly says `today` is orthogonal to `status`. The implementation detail
it leaves open: the cell already carries `[ngClass]="getCellClass(cell)"`, and
adding `[class.today]="…"` beside an `ngClass` on the same element is a
binding pattern this repo uses nowhere. Cleaner and directly unit-testable:
have `getCellClass` return `'status-done today'`, backed by a
`readonly todayIso = HabitService.todayIso(this.today)` field (`this.today` is
already captured at construction and already feeds `monthGrid`). One binding,
one function, one test — and R9's spec asserts on its return value rather than
on rendered DOM.

## R11 — `--cal-label` is genuinely new; keep it separate

Checked `#3a3f45` against every near-grey in `:root`: `--text` `#4c5057`,
`--nav-inactive` `#565b63`, `--text-sub` `#75797f`. All different. §2.2's
instruction not to substitute an existing token is correct and is exactly
L-012's rule. Keep.

## R12 — The nav-button hover rule contradicts the restyle and must go

§4's Out list excludes hover states ("no mockup") — correct, but that cannot
mean *leave the existing rule in place*. Today's `.nav-button` is
`background:#f0f0f0` with `&:hover { background-color:#e0e0e0 }`. The restyle
makes the button `background: var(--surface)` (white); the surviving hover
rule would flash it grey — a state that now contradicts its own rest state.
The source has **no** hover styling on these buttons at all.

**Delete the hover rule**; keep `cursor: pointer` (which the source sets).
"Out of scope" applies to *inventing* states, not to leaving behind a rule the
restyle has broken.

## R13 — AC 3's grep covers the whole file, including the parts with no mockup

`grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' src/app/calendar/calendar.component.scss`
returning nothing means **every** rule in the file, not just the ones §2
samples. Currently un-sampled literals that still have to go:

- `.empty-state { color: #999 }` — no mockup exists (the prototype always has
  data). Use `--text-sub`; it is the same job as every other muted caption.
- `.selected-habit-name { color: #333 }`, `.category-chip { background:#eee;
  color:#444 }` — all three are replaced by §2.2's sampled values via R5's
  merge.
- `.weekday-header { background:#f0f0f0 }`, `.calendar-grid { background:
  #e0e0e0 }`, `.legend { background:#f9f9f9; border-color:#e0e0e0 }`,
  `.cell { background: white }` — all deleted outright by §3.2's one-card
  restructure, not retinted.

`transparent` is a keyword and passes the grep, so R2's `.blank` fill is fine.

Note for whoever writes the SCSS: **do not add `box-sizing: border-box` to the
legend swatches.** `src/styles.scss` has no global reset (three components set
it locally), so the Today swatch — `14×14` with a `2px` border against the
other five's `1px` — renders 18×18 next to 16×16. That asymmetry is what the
source produces and what the mockup shows.

---

## Corrected token list (supersedes Analyst §2.8)

```scss
/* Calendar §3 — the day-grid palette. Deliberately NOT the dashboard's
   --done-bg / --missed-bg (#f4fbf6 / #fdf4f4): those are pale row tints
   behind a list row, these are saturated fills for a 52px cell (R1). There is
   no --cal-off-*: the app has no 'off' status and is not growing one (R3). */
--cal-label:         #3a3f45;  /* "Select habit:" — not --text/--nav-inactive (R11) */
--cal-done-bg:       #dcfce7;
--cal-missed-bg:     #fee2e2;
--cal-missed-text:   #991b1b;  /* distinct from --danger-text #c92a2a */
--cal-not-due:       #d1d5db;
--cal-not-due-bg:    #f3f4f6;
--cal-not-due-text:  #9aa1ab;
--cal-future:        #8f95e8;  /* corrected: app has #6366f1 */
--cal-future-bg:     #e7eaff;  /* corrected: app has #e0e7ff */
--cal-future-text:   #4338ca;
```

Ten new tokens. Reused unchanged: `--done` `--done-text` `--missed`
`--pending` `--pending-bg` `--pending-text` `--accent` `--surface` `--border`
`--control-border` `--chip-bg` `--text-strong` `--text` `--text-muted`
`--text-sub` `--radius-control` `--radius-card-lg` `--radius-pill`
`--content-pad`.

## Corrected cell table (supersedes Analyst §2.5)

| Cell | `background` | `border-left` | day number |
|---|---|---|---|
| `done` | `--cal-done-bg` | `3px solid var(--done)` | `--done-text` |
| `missed` | `--cal-missed-bg` | `3px solid var(--missed)` | `--cal-missed-text` |
| `pending` | `--pending-bg` | `3px solid var(--pending)` | `--pending-text` |
| `not-due` | `--cal-not-due-bg` | `3px solid var(--cal-not-due)` | `--cal-not-due-text` |
| `future` | `--cal-future-bg` | `3px solid var(--cal-future)` | `--cal-future-text` |
| `blank` | `transparent` | none | *(no number)* |

Plus, independent of status: `.today { box-shadow: 0 0 0 2px var(--accent) }`.

## What survives untouched

§3.1 (no new service method), §3.2 (one card), §3.3 (per-status number
colour), §3.4 (`future` is a correction, not a preference), §3.5 (Today is new
markup), §3.6 (no clamp on Prev/Next), and the whole of §4's Out list. The
900px column and `--content-pad` in §2.1 are confirmed literal. §2.4, §2.6 and
§2.7's values are confirmed literal, including the six-item legend and the
`2px #0066cc` Today swatch.
