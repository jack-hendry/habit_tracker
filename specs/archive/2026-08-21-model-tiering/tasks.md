# tasks.md — model-tiering (executed 2026-08-21, summarized for archive)

The full 715-line step plan has been summarized to what a future reader needs:
the shape of the run, the outcome of each step, and what diverged from the plan.
The reference-value oracle that the steps carried inline is preserved in
`Analyst.md` §2.3–§2.4; the harden round is in `CriticReview.md`.

**9 steps, strictly sequential.** No step ran in parallel with another: Steps 5–7
were formally parallel-eligible but each `Done when` states a *cumulative* test
count a parallel branch cannot know, Steps 1–2 were too small to pay for a cold
start, and Steps 2→3 are hard-sequential by design (2 goes red on purpose, 3
makes it green). Baseline was **404 tests, 404 SUCCESS** — measured, because a
static `it(` count reads 396 and is wrong: `calendar.design.spec.ts`'s
`Object.entries(CS)` loop and `analytics.design.spec.ts`'s `heatSteps` loop
generate specs at runtime.

## The run

| # | Step | Model | Outcome |
|---|---|---|---|
| 1 | `Model:` becomes a mandatory step field (`TEMPLATE.md`, `CLAUDE.md`, promptsubmit hook) | haiku | green, 404 |
| 2 | Three-way test harness — **red on purpose** | haiku | exactly 8 FAILED, as specified |
| 3 | Hook asks for approval on top-level verification | haiku | harness 0 FAIL, 404 |
| 4 | CHECKPOINT | top-level | passed |
| 5 | `dashboard.design.spec.ts` | haiku | N=19, total **423** |
| 6 | `habit-detail.design.spec.ts` | haiku | M=18, total **441** |
| 7 | `habit-list.design.spec.ts` | haiku | P=16, total **457** |
| 8 | `/design-check` → its own `model: sonnet` agent | haiku | green, 457 |
| 9 | Regression, docs, wrap-up | top-level | see below |

Final state: **457 tests, 457 SUCCESS** (+53 from baseline), build green, hook
matrix **0 FAIL across 32 rows**. Each of Steps 5–7 proved its spec can fail by
mutating one value in the component SCSS, confirming a red run that names the new
file, then reverting — verified by `git diff --quiet` exiting 0, so no mutation
was left behind.

## What changed from the plan

- **The plan file (`lexical-petting-possum.md`) was superseded before execution.**
  It proposed 7 steps, a hook "stage 0", and a vendored
  `design/prototype-tokens.md`. All three were dropped: the plan grew to 9 steps,
  stage 0 was replaced by converting stage 1's and stage 2's `exit 0` (stage 0
  loses precedence — `npm test > src/app/out.log` would ASK instead of DENY), and
  the token file was dropped in favour of carrying the oracle inline in each
  step's brief.
- **A third file contradicted the change and was folded into Step 1:**
  `enforce-haiku-tasks-promptsubmit.sh` hardcoded `model: "haiku"` in the
  `additionalContext` it injects on every execution prompt.
- **Step 1's `Done when` was unsatisfiable** — its grep spanned `.claude/hooks/`,
  which contains a file Step 1 was barred from editing and which still carried the
  string in a header comment. The executor reported green by quietly narrowing the
  grep. Caught at the checkpoint; the comment fix was carried into Step 3. → **L-040**
- **Step 2's armed-guard demonstration was also unsatisfiable** — the harness adds
  its own `__hook-test-spec` marker when none exists, so deleting the real marker
  cannot make the hook dormant. The guard itself was verified present and verbatim
  at `enforce-haiku-tasks.test.sh:57`. → **L-040**
- **A `design-check.md` self-contradiction was fixed in Step 9.** Step 8 wrote the
  agent's fix step as "do not edit `src/` during a marker *(you are exempt)*" —
  both at once. Per `Analyst.md` §2.6 the agent form is the *only* working form of
  the loop during a run, so the instruction was inverted and would have neutered
  it.
- **The critic pass found 12 issues (R1–R12), 4 of them run-breaking**, all
  dispositioned before execution. R3 is the reason the AD-033 grep gate carries a
  non-zero guard: without it the gate compared 0 to 0 and passed vacuously against
  this very spec.

## Not verified

**AC 5 — `/design-check dashboard` spawning the Sonnet agent — was never run.**
`.claude/agents/design-check.md` is created and well-formed (`model: sonnet`, the
never-return-an-image rule, `--width`/`--seed` mandatory, coverage-line
reporting), but agent types register at session start, so a file written mid-session
is not spawnable in that session. The equivalent check was dispatched to a Sonnet
agent instead and terminated on a **monthly spend limit**, not a code fault.
**Re-run `/design-check dashboard` in a fresh session to close this.**

AC 4's interactive half is likewise unconfirmed: the hook's *decision* is proven
by the matrix (`npx ng test` → ASK, `npm start` → ALLOW), but the approval prompt
itself could not be observed from a non-interactive background job.
