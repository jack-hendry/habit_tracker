# tasks — Redesign §1: Dashboard (spent)

The full 12-step executable list was ~44 KB of literal code blocks — written for
the Haiku executor, transcribed into the repo, and now carried by the code
itself. Summarised on archive per the ritual in `specs/STATE.md`; the source of
truth is the diff.

## What was built, in order

| Steps | What landed | Tests after |
|---|---|---|
| 1 | Five tokens in `src/styles.scss`: `--text-sub`, `--text-faint`, `--rule`, `--track`, `--positive` | 115 |
| 2 | `HabitService.shiftIso` / `earliestStartIso` / `poolCounts` (+ 5 specs) | 120 |
| 3 | `HabitService.perfectDays` (+ 3 specs) | 123 |
| 4 | `HabitService.topCurrentStreak` / `dueTodayCounts` (+ 3 specs) | 126 |
| 5 | Checkpoint — build + suite, no new code | 126 |
| 6 | `src/app/shared/stat-card/` — component, template, SCSS, 3 specs | 129 |
| 7 | `DashboardComponent` wiring: pooled `overallCompletionRate`, the stat computeds, `formatOverallRate` → `formatRate` | 129 |
| 8 | `dashboard.component.html` rewritten to the target markup | 129 |
| 9 | `dashboard.component.scss` rewritten to the sampled values | 129 |
| 10 | 5 Dashboard specs for the four cards | 134 |
| 11 | Checkpoint — build, suite, hex-literal greps | 134 |
| 12 | Acceptance-criteria walk (1–11 pass; 12 done afterwards by the top-level session) | 134 |

## What the run cost, and why it was cheap

Steps 8 and 9 replaced whole files from literal blocks, and both were verified
byte-identical to the spec afterwards. The executor deviated **nowhere**.

One step was wrong, and it was the planner's fault, not the executor's: Step 10
seeded `localStorage` between two `createComponent()` calls inside one `it`, but
`HabitService` is root-provided and reads storage in its constructor, so the
second component reused the loaded signal. The executor stopped and reported it
instead of adjusting the expectation; the step was split into two specs and the
run resumed. See L-013 and the retrospective in `Analyst.md` §6.

## What the design check found afterwards

`line-height: 1` on the emoji glyph — the one value in the SCSS that was not
sampled from the prototype — made every habit row 44px instead of 49px. Removing
it made the page pixel-identical to `design/target/dashboard.png` at every
layout boundary. See L-012.
