# tasks — Habit Stacks (roadmap §5)

**17 steps, in order, do not skip ahead.** Checkpoints at 6, 10 and 14.

Baseline before Step 1: `npm test` → **339 tests, 339 SUCCESS**. Every step's
expected count is stated against that baseline as it grows.

**Sequential. No step in this plan runs in parallel with another.** Step 7 is
the only one that touches no file under `src/`, but pairing it with one other
step is not worth a cold start (`specs/TEMPLATE.md` — "parallelism pays only for
several independent, non-trivial steps"). Every step therefore omits `Assumes:`,
which the template only requires inside a parallel group.

**Every step ends at a green build.** If `npm run build` or `npm test` is red at
the end of a step, stop — do not start the next one.

**Global stop rule:** if an implementation attempt fails twice, stop and report
instead of retrying (`CLAUDE.md`).

**Do not commit anything at any point.** The wrap-up step ends by asking.

---

## Reference values used across steps

Copy from here rather than re-deriving. Every value is transcribed from the
prototype source via `Analyst.md` §2.5.

```
Page          max-width 1000px; margin 0 auto; padding 28px 24px 48px
Header row    display flex; align-items center; justify-content space-between;
              margin-bottom 6px
H1            23px / 700 / letter-spacing -0.3px / #16181c
Subtitle      margin 0 0 20px; 12.5px; #8a8f96
New-stack btn padding 9px 16px; background #0066cc; color #fff; radius 6px; 13px/600
Cards row     display flex; gap 20px; align-items flex-start; flex-wrap wrap
Card          width 452px; background #fff; border 1px solid #e8e8e6;
              border-top 3px solid {stack hex}; radius 10px; padding 16px 18px
Card header   display flex; align-items center; gap 9px; margin-bottom 12px
Stack name    14.5px / 700 / #16181c
Time pill     11px/600 #4c5057 on #f1f1ef; padding 3px 8px; radius 999px
Done pill     11px/600 #2f9e44 on #e9f7ec
Anchor box    border 1.5px dashed {hex}; background hexAlpha(hex,.09); radius 8px;
              padding 10px 14px; gap 10px
Anchor glyph  17px
Anchor column display flex; flex-direction column; gap 1px
Anchor label  9.5px / letter-spacing 1px / uppercase / 700 / {hex}
              Literal DOM text is `Anchor · After` — title case. The uppercase
              is `text-transform`, not the string (CriticReview R1-4).
Anchor text   13px / 600 / #16181c
THEN bar      2px x 7px #d8d8d5
THEN word     9px #a3a7ad uppercase letter-spacing 1.2px 600
THEN wrapper  gap 2px; padding 3px 0
Item row      gap 11px; border 1px solid #e8e8e6; radius 8px; padding 10px 13px; bg #fff
Handle        glyph ⠿; #c4c8cd; 13px; cursor grab; letter-spacing -1px
Check circle  21px round; 2px border; 12px font.
              done  -> border + background = the habit's hex, content ✓, colour #fff
              todo  -> border #c9cdd2 on #fff
              due   -> cursor pointer;  not due -> cursor not-allowed
Habit glyph   15px
Habit name    13.5px / 600 / #16181c; flex 1; hover #0066cc + underline
NOT-TODAY     10px #a3a7ad uppercase letter-spacing .5px radius 4px
              not due -> padding 3px 7px; background #f4f4f2
              due     -> padding 0;        background transparent
Streak        11.5px #e8590c 700, text `N 🔥` — rendered even when N is 0
Remove ✕      13px #c4c8cd; padding 0 2px; hover #c92a2a
Picker row    display flex; align-items center; gap 8px; flex-wrap wrap;
              margin-top 12px. Renders ABOVE the "Add footer" button, not below.
Add: label    11px / 600 / #8a8f96
Add chip      border 1px solid #bcd7ef; background #e9f1fa; radius 999px;
              padding 5px 12px; 12px/600 #0066cc
Add empty     italic 12px #a3a7ad — "every habit is already in a stack"
Add footer    margin-top 12px; width 100%; padding 9px; background #fff;
              border 1.5px dashed #c9cdd2; radius 8px; 12.5px; #75797f
Unstacked     margin-top 18px; background #fff; border 1px solid #e8e8e6;
              radius 10px; padding 13px 18px; gap 12px; flex-wrap wrap
Unst. label   11px letter-spacing .6px uppercase #8a8f96 600
Unst. chip    border 1px solid #e8e8e6; background #fff; radius 999px;
              padding 6px 13px; 12.5px/600 #16181c; cursor grab
Unst. empty   italic 12px #a3a7ad — "all habits are stacked".
              Conditional: only when the tray has no chips.
Unst. hint    12px #a3a7ad, NOT italic — permanent, renders whether or not the
              tray has chips. Verbatim, curly quotes included:
              drag a chip onto a stack, or use “+ Add habit”
Edit/delete   13px #c4c8cd; hover #0066cc (edit) / #c92a2a (delete)
```

Subtitle text, verbatim:

```
"After [current habit], I will [new habit]" — chain habits to an anchor you already do. Drag ⠿ to reorder.
```

---

## The 17 steps

Sequential; checkpoints at 6, 10 and 14. Baseline before Step 1 was 339 tests;
the run ended at **404, all green**.

| # | Step | Outcome |
|---|---|---|
| 1 | Four palette entries in `habit.model.ts` | indigo `#6366f1`, coffee ☕, moon 🌙, clock ⏰. Additive; `colorOf`/`iconOf` already fell back (AD-029). |
| 2 | `Stack` model + runtime guard | `Stack { id, name, time, anchor, aglyph, color, habitIds[] }`; guard drops a malformed persisted row instead of throwing. |
| 3 | `StacksService` storage + stack CRUD | `habit_tracker.stacks.v1`; create / update / remove. |
| 4 | `StacksService` membership + reordering | `addHabit` / `moveHabit` / `removeHabit`; one-stack limit (AD-030). |
| 5 | Prune deleted habits, hide archived ones | `effect()` over `habitService.habits()` reading via `untracked()` so the write cannot re-trigger (AD-031). |
| 6 | CHECKPOINT | — |
| 7 | Seed demo stacks for the design check | Two stacks in `scripts/demo-data.mjs`; later revised, see below. |
| 8 | Render cards, anchor, connectors, item rows | The static page. |
| 9 | Non-drag interactions | Toggle, remove, add-picker. |
| 10 | CHECKPOINT | — |
| 11 | Native HTML5 drag and drop | Reorder within, move between, drag from the tray (AD-028). |
| 12 | Empty state + `+ New stack` | Full-width dashed card when no stacks exist. |
| 13 | Inline stack editor and delete | `StackForm` following `HabitFormComponent`, not a modal (AD-032). |
| 14 | CHECKPOINT | — |
| 15 | `stacks.design.spec.ts` | Computed-style assertions transcribed from the prototype source, not the SCSS (L-022). |
| 16 | Design comparison round | Found three real defects; see below. |
| 17 | Regression, docs, wrap-up | AD-028…032, B-003, L-031…037; roadmap §5; this archive. |

---

## What changed from the plan

**The demo seed became day-proof mid-run (approved by the user).** Step 7 seeded
the prototype's two stacks. That left `stack-item-not-due` rendering only on
Tue/Thu/Sat/Sun, because `demo-run` is scheduled Mon/Wed/Fri — so the *same
code and the same seed* produced `5 of 5 declared` on four days and
`4 of 5 … NOT RENDERED: stack-item-not-due` on the other three. A seventh
habit, `demo-journal`, weekend-only `[0, 6]`, was added to the Evening stack so
some member is always not-due. Accepted cost: the evening card gains a row that
`design/target/stacks.png` does not have. This is **L-031**.

That change also invalidated Step 2's stated expectation, and the remaining
steps' prose was not updated — an expected absence silently became a failure
condition. This is **L-037**: when a mid-run change invalidates an assumption,
grep the remaining steps for it before dispatching.

**The NOT-TODAY reference value above is wrong, and shipped wrong.** The
Reference values block says a *due* row gets `padding 0; background transparent`.
That was implemented as `.stack-item-not-due .not-today-chip { … }` — a
descendant selector for two classes that are siblings, so it matched nothing,
and its declarations were inverted anyway. It was dead code that looked like
coverage. Step 16 deleted it. This is **L-033** and **L-034**.

**Step 16 found two more defects no earlier check caught**: the `Unstacked`
label was missing from the tray entirely, and `.done-pill` had no `padding` or
`border-radius`, so it rendered as bare text rather than matching `.time-pill`'s
geometry.

**The anchor box's `1.5px` dashed border is verified by nothing.**
`design-shot.mjs` captures at dpr 1 against a dpr-2 target and downscales both
halves, so the composite cannot resolve sub-2px detail (**L-035**); and
ChromeHeadless at dpr 1 reports `border-width: 1.5px` as computed `'1px'`, so
the spec cannot assert it either (**L-036**). `stacks.design.spec.ts` therefore
accepts `['1px', '1.5px']`. The two blind spots overlap exactly on this value.

**Acceptance criterion 2's literals are day-dependent.** It names
`"2 of 2 done today"` on Morning kickstart and a `NOT TODAY` chip on Morning
run, both transcribed from the prototype's capture day. On a Friday all three
morning habits are due, so the pill correctly reads `2 of 3 done today` and the
chip moves to the evening card. Correct behaviour, over-specified criterion —
**L-032**.

---

## Blockers

**B-003** — reordering is drag-only. There is no keyboard or touch path; the
`+ Add habit` chip picker covers membership but not order. Accepted cost of
AD-028 (native HTML5 DnD, no `@angular/cdk` dependency).
