# Redesign §3 — Calendar (archived summary)

Roadmap section: `specs/design-implementation-roadmap.md` §3.
Design source: `Habit Tracker Prototype.dc.html` in the Claude Design project
[Habit tracker design exploration](https://claude.ai/design/p/7089b0b3-0042-4029-bd4c-bef0ce5a6d19),
lines 140–178 (markup) and 483–491 (`statusOf`, `CS`, `gridFor`).
Mockup: `design/target/calendar.png` (1440 CSS px, `deviceScaleFactor: 2`).

Size: **Medium** — 6 steps, no new route, no new persisted entity, no data
model change, **no new service method**. Built and design-checked 2026-08-19.
Tests 236 → 241, then → 251 with the follow-on conformance spec (AD-022).

Decisions produced: **AD-020, AD-021, AD-022**. Lessons: **L-026, L-027, L-028**.

---

## 1. What was built

- **One card.** Month-nav, the day grid and the legend were three separately
  boxed pieces; they are now one `.calendar-card`
  (`--surface` / `--border` / `--radius-card-lg` 10px / `18px 20px`). The old
  grid faked gridlines with a grey container background showing through 2px
  gaps — that trick is gone; cells sit on white with a real 4px gap.
- **The selector row.** `Select habit:`, the `<select>`, the habit dot, glyph,
  name and category chip are **one** flex row (`gap:12px`), not two stacked
  divs.
- **Per-status day-number colour.** Every status has its own numeral colour;
  the app painted all of them `#666`.
- **The Today ring.** `box-shadow: 0 0 0 2px var(--accent)` on today's cell —
  a shadow, not a border, which would shift the cell's contents. Orthogonal to
  status: a `done`, `missed` or `pending` cell can be today.
- **Sixth legend item** (`Today`), swatch classes renamed `status-*` →
  `swatch-*`.
- **Unpadded day numbers** — the source renders the loop integer (`1`), the app
  rendered a zero-padded ISO slice (`01`).
- **`calendar.component.spec.ts`** — the component had never had one.

### The cell table (from `CS` in the source)

| Status | background | border-left (3px) | day number |
|---|---|---|---|
| `done` | `#dcfce7` | `#22c55e` | `#166534` |
| `missed` | `#fee2e2` | `#ef4444` | `#991b1b` |
| `pending` | `#fef3c7` | `#f59e0b` | `#92400e` |
| `not-due` | `#f3f4f6` | `#d1d5db` | `#9aa1ab` |
| `future` | `#e7eaff` | `#8f95e8` | `#4338ca` |
| blank | `transparent` | transparent | *(none)* |

Cells are 52px min-height, 4px radius. Page column stays 900px (AD-009).

---

## 2. The decisions that carry

**Cell fills are page-scoped tokens (AD-020).** Ten new `--cal-*` tokens. The
four that matter: `--cal-done-bg` and `--cal-missed-bg` exist *because*
`--done-bg` (#f4fbf6) and `--missed-bg` (#fdf4f4) already exist and are
different colours doing a different job, and `not-due` had no token at all.

**The prototype's dataset shape is not adopted (AD-021).** Two non-adoptions:
its sixth `off` cell state, and its bounded `Prev`/`Next`. Both exist because
its fake dataset is 126 days long. Details in AD-021.

**No new service method.** `monthGrid` already returns `{iso, status}` per real
day and `{blank:true}` for padding, and `dayStatus`'s five values already cover
everything `CS` encodes. The only thing the component lacked was "is this cell
today" — a string comparison, folded into `getCellClass` so the whole thing is
one binding and one unit-testable function.

**Blank cells are transparent.** This is what makes `monthGrid`'s *trailing*
padding cells invisible. `gridFor` pads leading cells only, so the app
generates a row the prototype never does; with a grey fill it would be a
visible row of tiles, with `transparent` the difference does not exist. The
alternative — trimming trailing blanks in the service — was rejected as a data
change to fix a colour problem.

---

## 3. What changed from the plan

**The harden round found four wrong claims in the Analyst's own token work.**
The Analyst was written 2026-08-18 from a reading of the source; reviewed a day
later *against the source again*, four of its assertions were false (L-027):

1. **R1 (worst).** §2.8 claimed the `done`/`missed` cell fills were already
   tokenised as `--done-bg`/`--missed-bg`. They are the Dashboard's pale row
   tints. Building it would have washed every done cell to near-white — and
   AC 3's raw-hex grep, the build and the suite all stay green, because a token
   *is* being used. At the composite's 520px column width, washed-out green
   still reads as green. → AD-020.
2. **R2.** Blank padding cells are `transparent`, not `#fafaf9`. The Analyst
   had grabbed `CS.off`, a different concept entirely.
3. **R3.** `#fafaf9` is the prototype's **sixth** cell state, for real days
   before its dataset begins — not padding. → AD-021.
4. **R4.** `--radius-card-lg` already existed (habit-detail added it).

Four further gaps: the selector and identity strip are one row (R5), day
numbers are unpadded (R6), weekday headers are a separate grid (R7), and
`calendar.component.spec.ts` did not exist, so AC 7's "covered by a spec" had
no file to live in (R9). The test baseline was 236, not the Analyst's stale
"≥163" (R8).

**Two executor findings.** Step 3's "Done when" said 242 (236 + 6) while its
code block had five `it` blocks; the Haiku executor ran it, got 241, and
stopped to report the mismatch rather than inventing a sixth test to satisfy
the figure. Step 1's executor paraphrased a token comment, dropping the token
names that made it actionable and adding an unsupported claim — a literal code
block in a step protects the code but not the prose around it.

---

## 4. Acceptance criteria — final result (2026-08-19)

| AC | Result |
|---|---|
| 1. Suite ≥236 | ✅ 241 (then 251 with the conformance spec) |
| 2. Build clean, no new budget warning | ✅ |
| 3. No hex/`rgba()` in the component SCSS | ✅ grep returns nothing |
| 4. 900px column, `--content-pad` | ✅ measured: `max-width 900px`, `28px 24px 48px` |
| 5. Nav + grid + legend in one card | ✅ measured: `#fff`, `#e8e8e6`, 10px, `18px 20px` |
| 6. Cell colours per the table | ✅ all five measured in-browser + AD-022 spec |
| 7. Today ring, and only today | ✅ measured: exactly 1 cell, `rgb(0,102,204) 0 0 0 2px` |
| 8. Six legend items | ✅ Today swatch 18×18 vs others 16×16 (content-box, as the source) |
| 9. Prev/Next unbounded | ✅ no clamp adopted (AD-021) |
| 10. Design check | ✅ `design/compare/calendar.png` — but see L-026 |

**AC 10 is the one worth reading twice.** The composite could not settle the
question the section most needed settled: at a 520px column width `#dcfce7` and
`#f4fbf6` are indistinguishable, which is exactly R1's failure mode. It took
three browser measurement passes to close — the first mis-built its selectors,
the second found only three of five statuses because the default habit is daily
with a perfect current month, so `missed` and `not-due` **do not exist on that
grid**. The Mon/Wed/Fri demo habit surfaces both. → L-026, and the two
mechanisms built in response (AD-022 and the `STATES` coverage line in
`scripts/design-shot.mjs`).

---

## 5. Roadmap correction produced here

§3 said "mostly a restyle… the lightest section" and "everything else already
exists — this is the lightest section". True of the effort, wrong about the
shape: three boxes become one card, the day number's colour is a per-status
lookup, the selector is one row not two, and the page had no spec file at all.
Its critic pass said to "confirm the current `status-future` color matches"
the lavender tint — read as a maybe, it was a real mismatch
(`#e0e7ff`/`#6366f1` vs `#e7eaff`/`#8f95e8`). The roadmap banner on §3 records
all of this.
