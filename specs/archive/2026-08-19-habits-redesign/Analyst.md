# Redesign §2 — Habits (archived summary)

Finished 2026-08-19. Size: **Medium** (13 steps, 1 critic round).
Roadmap section: `specs/design-implementation-roadmap.md` §2.
Design source: `Habit Tracker Prototype.dc.html`, lines 93–139 + 405–453 / 556–573.
Mockup: `design/target/habits.png` (1440 CSS px, `deviceScaleFactor: 2`).

Decisions this spec produced live in `STATE.md` as **AD-014 … AD-017**; the
lessons as **L-015 … L-018** and **L-025**. This file is the summary kept after
the archive ritual — the full `Analyst.md` / `tasks.md` / `CriticReview.md` were
deleted deliberately, not lost.

---

## 1. What was built

`/habits` went from a text list under an always-open add form to the target's
card list. Each active row is now, left to right: a 4px left border in the
habit's colour, a 22px checkbox, glyph + name (the name is a `routerLink` to
§2b's detail page), a meta row (schedule chip / category chip / `N 🔥` /
`best N` / `N%` / `NOT TODAY`), a **30-day completion strip**, and
`Pause · Edit · Archive · Delete`.

New code:

| Thing | Where | Note |
|---|---|---|
| `recentStatuses(habit, days, today?)` | `habit.service.ts` | The one new derivation. Pure, live (AD-004). |
| `<app-day-strip>` | `shared/day-strip/` | `[statuses]` + `[hex]`. 30 × 8×22px cells at 2px gap = 298px. Reused by §2b at a longer window. |
| `<app-habit-form>` | `shared/habit-form/` | Extracted from the inline edit form. `[habit]` `null` = create. Two hosts, one component. |
| Create modal | `habit-list.component.html` | Native `<dialog>` + `showModal()`. |
| `HabitService.add` → `Habit \| null` | `habit.service.ts` | AD-017. Additive; prior callers ignore it. |
| 5 tokens | `styles.scss` | `--strip-missed`, `--strip-not-due`, `--danger-text`, `--danger-border`, `--backdrop`. |

The page column is `max-width: 1000px` — deliberately not the Dashboard's 960px.

## 2. The decisions that carry

- **AD-014 / AD-015 — the strip.** `recentStatuses` calls `dayStatus` **raw**,
  with no `isDueOn` guard, the opposite of `poolCounts`. A strip records what
  happened; a rate averages obligations. Three cell colours: done → the habit's
  hex, `missed` **and** `pending` → `--strip-missed`, `not-due` **and** `future`
  → `--strip-not-due`. **There is no red in the strip** — the roadmap claimed
  there was; the source says `#e9e9e7`. Both halves are pinned by specs so a
  later reader cannot "align" them.
- **AD-016 — create is a modal, edit stays inline, both render one form.** The
  prototype's `+ New habit` is a **dead button** (no handler, no modal markup
  anywhere in the file), so the whole create flow is ours and none of it is
  verifiable by a design check. The `<dialog>` is always rendered with its
  contents gated by `@if (creating())` — that makes "empty form on re-open"
  structural rather than a `reset()` someone must remember. Modal and inline
  editor are mutually exclusive in both directions.
- **The schedule label was wrong in two ways at once** and only against the
  target: `' · '` as separator, and `[1,2,3,4,5]` collapsing to `Weekdays`.
- **Four elements the target cannot show are kept, not deleted** (§3.8): the
  `Paused` badge, `Paused since`, the description line, and `Starts {date}`.
  The mockup simply has no habit in those states; deleting them would undo
  `habit-lifecycle` R7/R8. Each is covered by a spec, because the design check
  is structurally blind to all four.
- **Archived rows** keep the simplified card and their lone `Reactivate`
  button, on the new shell, with **no strip**.
- **The `Morning run` meta row wraps at 1440px and that is correct** — it wraps
  in the target too. Predicted from the source's CSS and written into
  `tasks.md` in advance, which is what stopped a design-check round from
  "correcting" the page away from the mockup.

## 3. What changed from the plan

- **Step 7b was added mid-run.** The executor declared Step 6 complete with a
  failing "Done when" — its grep for raw hex in the extracted
  `habit-form.component.scss` had to return zero and the file carried 29
  literals. Caught by re-running the step's own checks at the top level rather
  than trusting the report (**L-016**). Step 7b supplies an exhaustive
  literal→token mapping table; most of the 29 were *pre-AD-009* values
  (`#ccc`, `#555`, `#222`, `#f0f0f0`) never on the palette, which is exactly
  why a small model could not have mapped them by judgement.
- **The per-step test counts drifted and are the wrong instrument.** Step 8
  asked for "one spec"; the executor instead strengthened the three *existing*
  `add` specs with return-value assertions — better coverage, same `it` count —
  so the run finished at 163 against a predicted 165 with every intended
  assertion present. **Predict the assertions, not the `it` count** (**L-017**),
  or state the total as a floor.
- **The critic's R11 was the catch that mattered.** `tasks.md` had already
  written `const created = this.habitService.add(...)` plus an "If blocked"
  clause. Left alone the run would have halted correctly, twelve steps in, on
  something one `grep` at planning time removed. A stop clause is not a
  substitute for opening the file the plan assumes (**L-018**).
- **The final design check found one defect the spec could not** (**L-025**):
  `.delete-button`'s two token-correct properties lost on specificity to
  `.habit-actions button`, so Delete rendered grey against the target's red.
  Fixed by scoping the override to `.habit-actions .delete-button`.

## 4. Acceptance criteria — final result (2026-08-19)

All 13 met.

| # | Criterion | Result |
|---|---|---|
| 1 | Suite ≥165, zero failures | ✅ **236** (baseline was 134; later features added more) |
| 2 | `ng build` with **no** budget warning | ✅ the `habit-list.component.scss` 7.82 kB line is gone |
| 3 | No raw hex / `rgba(` in the three SCSS files | ✅ grep returns nothing |
| 4 | Page column `max-width: 1000px` | ✅ |
| 5 | Header + controls bar; inline add form gone | ✅ |
| 6 | Modal creates, `Cancel`/`Esc` close, re-open is empty | ✅ 5 specs |
| 7 | `Edit` still inline, prefilled, saves via `update` | ✅ 5 form specs incl. `scheduleChanged` by value and `backdateWarning` off `[habit]` |
| 8 | Row renders the full left-to-right sequence | ✅ measured on the composite |
| 9 | 30 × 8×22px cells, 2px gap, five-way mapping | ✅ 5 day-strip specs, incl. both `pending` and `not-due` |
| 10 | `recentStatuses` 30 oldest-first, last = today | ✅ 5 service specs, incl. mid-window `startDate` and an off-schedule tick |
| 11 | `Daily` / `Weekdays` / `' · '`-joined | ✅ 3 specs |
| 12 | Archived row simplified, no strip; the four §3.8 elements render | ✅ 4 row-rendering specs |
| 13 | Composite lines up, wrap included | ✅ card pitch **92px** in both; the only offset is the target's taller `Morning run` row |

Two composite differences that are **not** defects: the target was shot on a
Thursday, so `Morning run` (Mon/Wed/Fri) shows `NOT TODAY` and wraps; the actual
was shot on a Wednesday, when it is due. Everything below that row is therefore
offset by the wrap's 16px. Row pitch, strip geometry and the controls bar match
exactly.

## 5. Roadmap correction produced here

**The prototype has six pages, not five.** The habit *name* on `/habits` links
to a per-habit detail view — invisible in a screenshot, because a link looks
like bold text, so the original §2 critic pass looked straight at it. Became
roadmap §2b, shipped as `archive/2026-08-18-habit-detail/`. See **L-015**.
