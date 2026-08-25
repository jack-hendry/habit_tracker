# LESSONS — full entries

Bodies for the `L-NNN` headlines in `STATE.md`. The headline is the lesson;
this file is its provenance — which spec produced it, what actually broke,
and why the rule is worded the way it is.

Rules:

- **Append-only. Never renumber.** Same contract as `STATE.md`.
- Every id here has a headline in `STATE.md`, and every headline there has
  an entry here. `scripts/clean-table-check.sh` enforces the correspondence
  on push.
- Lessons are never archived. Unlike `AD`/`B` entries they do not age out.

**L-001 — A duplicated fact is a bug with a delay on it.**
(`habit-lifecycle` R1) `status: 'paused'` alongside `pausedRanges` would have
needed a sync obligation on every transition, and the failure mode was silent:
`'active'` with an open range is a habit that looks healthy and is never due
again. Prefer deriving over storing; prefer unrepresentable over "we remember
to check".

**L-002 — Push guarantees into the type system; runtime strips hide the error.**
(`habit-metadata` R1) A runtime strip of `completedDates` makes the dangerous
call compile, run, and appear to work. A narrowed patch type makes it a red
squiggle at the call site. When both are available, the type is strictly
better — and a runtime strip *on top of* a good type only masks a real compile
error.

**L-003 — "Retains history" and "fabricates failure" look identical until you
walk the dates.** (`habit-lifecycle` R6) Reactivating a habit archived six
months earlier would have replayed those months as due-and-uncompleted:
streak destroyed, rate tanked, lapsed on arrival. The plan said "retains
history" and meant it. Whenever a feature reopens a time range, ask what the
live derivations will say about the gap.

**L-004 — A guard-rail keyed to a fuzzy signal fails open *and* closed.**
(B-001) Grepping the transcript for `tasks.md` blocked innocent work while
still not proving a run was in flight. An enforcement hook needs an explicit,
deliberately-set marker — if the signal can be tripped by reading a file, it is
not a signal.

**L-005 — Write `tasks.md` for the executor, who has no other context.**
(`TEMPLATE.md`) Steps are planned on a large model and run on Haiku, which sees
only the step in front of it. Pointing at `Analyst.md` does not count; anchor
by symbol name rather than line number; keep the build green at every step.

**L-006 — A "switch every consumer to X" instruction reads as done when it is
half-done.** (`habit-lifecycle` R9/R10) Each dashboard bucket wanted a
*different* answer for paused habits (`doneToday` includes them; `todoToday`
does not), and a missed call site is a silently wrong number rather than a
crash. Enumerate the call sites in the step, and add a `grep` as a mechanical
completeness check.

**L-007 — Order the clauses that cannot change the answer anyway, and say why.**
(`habit-lifecycle` R8, Phase 3 R1) `isDueOn` checks start-date → pause →
schedule. All three return `false`, so order does not change the result — but
it is the first thing a reader checks when a day renders wrong, so it is worth
specifying.

**L-008 — Name the accepted downside so it is a decision, not an oversight.**
(`habit-lifecycle` R15) Pause preserves a streak, so a user can protect a
streak by pausing instead of doing the habit. Accepted deliberately — pause
exists so the app does not punish a legitimate absence, and every anti-abuse
rule is a product policy nobody asked for. Written down precisely so the next
person does not "fix" it.

**L-009 — Verify the migration is number-preserving before claiming it is
additive.** (`habit-lifecycle` R7, `habit-metadata` R6) The `startDate`
backfill was checked call site by call site against the expression it replaced
(`createdIso`) — same value, five call sites, no other consumers — which is
what let the slice skip a `STORAGE_KEY` bump and demand bit-identical numbers.
Corollary: delete the old helper, don't leave two ways to compute one boundary.

**L-010 — An acceptance criterion that contradicts the body of its own spec gets
implemented as written.** (`global-shell` R11/R12) Two criteria in §4 still
carried the roadmap paraphrases the body existed to overturn — a "filled blue
pill" and a "~1150px column". §4 is the section an executor treats as the
contract, so the corrections in §2.2/§2.3 would have lost to them. The R12 case
is the dangerous shape: a wrong constraint that is *also self-verifying* —
wrapping `<router-outlet>` at 1150px would have overridden all five per-page
widths while every "Done when" still reported green. When a harden round
overturns a claim, grep the acceptance criteria for the old wording; a fold-back
audit is not optional.

**L-011 — Verify design values against the committed mockup's pixels, not
against the eye.** (`global-shell`, Phase 0 design check) Reading
`design/target/dashboard.png` visually suggested a ~27px logo; measuring the
PNG's bounding boxes gave exactly the 22px the spec had sampled. The same
measurement then caught a real defect the composite hid — nav items drifting 1px
each, 4px by the fifth, from a `gap` specified as 3px where the mockup used 2px.
A side-by-side composite is for judging *whether* something is off; a bounding
box on the target file is for finding *what*. Corollary: check which app is
actually on the dev-server port before believing a screenshot — port 4200 was
serving a different project, and the first "actual" capture was someone else's UI
entirely.

**L-012 — A value you did not sample is a value you invented.**
(`dashboard-redesign`, design check) Every number in the Dashboard SCSS came out
of the prototype source except one: `line-height: 1` on the emoji glyph, added
by reflex because "icons need a tight line box". The prototype sets none, and
the emoji font's normal line box (~25px at 15px) is precisely what makes a habit
row 49px rather than 44px — so every row was 5px short and the error compounded
down the page. The side-by-side composite did not show it; scanning the target
PNG's pixel rows found it in one pass. Corollary to L-011: when a component is
built from sampled values, the *absence* of a property is part of the sample.

**L-013 — The executor stopping is the process working, not the process
failing.** (`dashboard-redesign` Step 10) The Haiku run halted on a failing
spec, reported the cause correctly (a root-provided service reads localStorage
once, so reseeding between two `createComponent()` calls in one `it` changes
nothing), and did **not** adjust the expectation to go green. The defect was in
`tasks.md`, written by the planning model. That is the failure mode the "If
blocked — do not improvise, never change a spec's expectation" clause exists to
catch, and it caught one on its first real outing. Keep the clause in every
step.

**L-014 — A screenshot of an empty store verifies nothing.**
(`dashboard-redesign` §3.7) The Dashboard's whole redesign is a summary layer,
and against an empty store it renders "Add a habit first." — so the design check
had nothing to compare until demo data existed. Seeding is part of the
comparison tooling, not a nice-to-have: `--seed` on `design-shot.mjs`. It also
surfaced a defect no unit test would have (see the Quick Task on `isLapsed`) —
real-shaped data is a test in its own right.

**L-015 — A prototype's interactive surface is invisible in its screenshots.**
(`habits-redesign` §6, roadmap §2b) The Habits mockup's habit *name* is a link
to a whole sixth page — a per-habit detail view with its own hero, streak
display and all-history grid. In the PNG it is bold black text, so the roadmap's
original §2 critic pass looked straight at it and recorded nothing. The link
exists only as an `onClick` in the markup, exactly as the nav's active/inactive
colours existed only as a ternary in the trailing `<script type="text/x-dc">`.
That is twice now. **Enumerate the `onClick`/handler attributes in the source
and account for every distinct target; do not enumerate clickable-*looking*
things in the image.** A missed page is the largest possible roadmap error —
larger than any wrong colour, because it is a whole spec that never gets
written.

**L-016 — Re-run a delegated step's own "Done when"; do not trust the report.**
(`habits-redesign` Step 6 → 7b) The executor declared Step 6 complete while the
step's own grep — no raw hex in the extracted SCSS — was still failing on 29
literals, and its report said the step passed. Two steps later the file would
have been buried under a full restyle. The check cost one `grep` at the top
level. Corollary to L-013: L-013 says a stopping executor is the process
working; this says a *reporting* executor is not evidence of anything. Verify
the commands, not the prose. The same run under-reported its test count (152 vs
an actual 154) and later over-predicted it (165 vs 163) — reports drift in both
directions.

**L-017 — Predict the assertions, not the `it` count.**
(`habits-redesign` Step 8) `tasks.md` asked for "one spec" pinning `add`'s new
return value; the executor instead strengthened the three *existing* `add` specs
with the same assertions — better coverage, unchanged `it` count — and the run
ended at 163 against a predicted 165 with nothing actually missing. Absolute
totals make a silently skipped suite visible (`TEMPLATE.md`) and that is worth
keeping, but they manufacture a phantom failure whenever new coverage lands
inside an existing spec. State the total as a **floor** (`≥N`), and name the
assertions that must exist rather than the number of blocks holding them.

**L-018 — A stop clause is not a substitute for opening the file.**
(`habits-redesign` CriticReview R11) `tasks.md` had already written
`const created = this.habitService.add(...)` plus an "If blocked — STOP if `add`
does not return a habit" clause. `add` returned `void`. The clause would have
worked: the run halts, correctly, twelve steps in. One `grep` of the signature
during the critic pass removed the halt entirely. Write the stop clause *and*
check the assumption it guards — the clause is the net, not the plan.

**L-019 — Prove the guard fires before trusting the run it guards.**
(B-002) Two prior spec runs executed with the Haiku-enforcement hook silently
dormant, because the marker they set was shadowed by an example line in the very
file that documents the marker. Nothing failed, nothing warned — a guard that
fails open produces exactly the output of a guard that passed. The check that
found it took one command: run the hook's own `grep` and print what it resolves
to. Do that when arming any hook-gated run, and prefer it to reading the file and
concluding the marker "looks right".

Corollary, and the sharper half: **documentation that contains a literal example
of the pattern a tool greps for is part of that tool's input.** A fenced code
block is invisible to `grep`, `sed` and every other line-oriented check. This is
L-004's lesson arriving from the opposite direction — there the signal was too
fuzzy to trust, here the signal was exact and the *corpus* was contaminated.

**L-020 — Splitting a `tasks.md` deletes the file a hook keys on.**
(`habit-detail`) The hook arms only for a spec with a full triad including a file
literally named `tasks.md`. Splitting a Large spec's steps into
`tasks-1-groundwork.md` + `tasks-2-page.md` left no `tasks.md`, so the triad check
failed and the hook exited dormant — a second, independent way to disarm the same
guard, introduced by a naming choice that had nothing to do with hooks. Fixed by
keeping `tasks.md` as an index that names the current run. When a convention is
load-bearing for tooling, renaming around it is a code change.

**L-021 — Fixing an unsatisfiable check can reproduce the same defect.**
(`habit-detail` run 1, Step 2) CriticReview R3 caught the original AC 12 claiming
`grep -rn "strip-missed"` would hit one file when it hit four, and rewrote it to
three checks. One of the three rewritten checks — `grep -rln "var(--strip-missed)"
… returns exactly status-colors.ts` — was **itself unsatisfiable**, for the exact
same reason: the `DO NOT TOUCH` spec file legitimately contains that literal
string in its own assertions, permanently. The fix inherited the bug it was
written to remove because the rewrite treated "narrow the grep" as the fix
without re-checking whether the narrowed grep could still be defeated by the same
file. The executor's judgment call — reading "only status-colors.ts + spec
assertions" as a pass rather than blindly failing, or worse, editing the
forbidden file to satisfy the check — is what kept this from becoming a real
defect. Do not rely on that: verify a rewritten check against the exact files its
own `DO NOT TOUCH` list protects, not just against the file it's meant to catch.

**L-022 — A route parameter read from `snapshot` pins a reused component.**
(`habit-detail` run 2) `HabitDetailComponent` captured
`route.snapshot.paramMap.get('id')` into a plain field. Angular **reuses the
component instance** when only the route parameter changes — same route config,
so `/habits/a` → `/habits/b` does not reconstruct the class — and the field kept
the first id forever: the page rendered habit A's name, tint, stats and calendar
while the URL said B. Invisible in every other spec, because they each navigate
once from a fresh `TestBed`. Read a `:param` as a signal (`toSignal` over
`route.paramMap`) whenever the component can be reached twice, and put any
guard that depends on it — here the unknown-id redirect — in an `effect`, not
only in the constructor, or the guard is equally one-shot.

**L-023 — A `DO NOT TOUCH` enforced by `git diff` cannot see a revert.**
(`habit-detail` run 2, Step 1) The check was "`git diff --stat <path>` is empty".
Run 1 was still **uncommitted**, so a file reverted to `HEAD` produces exactly
the same empty diff as a file nobody touched — and an executor did revert
`day-strip.component.ts`, undoing run 1's whole extraction and silently breaking
AC 12, while the check reported green. The bug is comparing against the wrong
baseline: a diff-based check measures distance from the last **commit**, but a
`DO NOT TOUCH` in a multi-run spec means distance from the **previous run's
result**, which is only in the working tree. Assert the file's *content*
(`grep -c "stripCellColor" …` returns 1), not its diff, whenever the state you
are protecting has not been committed. A sibling of L-021: both are checks that
could not fail.

**L-024 — A named assertion can still be hollow.**
(`habit-detail` run 2) L-017 says predict the assertions, not the `it` count.
This run showed the next failure mode: three assertions arrived with exactly the
names the plan specified and exercised nothing. `'the hero background changes
with different habit colors'` seeded one habit; rewritten, it seeded two and then
compared `hexAlpha(sky)` to `hexAlpha(emerald)` — restating that a pure function
is injective, never re-reading the DOM. `'completions counts due-day completions
only'` ticked a **daily** habit, so the tick was on a due day and the split it
names was never exercised. Each was green, and each was structurally incapable
of failing for its own stated reason. When reviewing delegated tests, read what
the body *does* and ask what edit would make it fail; a name matching the plan is
not evidence. Fixing the first one is what uncovered L-022 — the hollow assertion
had been hiding a real bug the whole time.


**L-025 — A rule with the right token can still lose to the rule above it.**
(`habits-redesign` Step 13, the final design check) `tasks.md` specified the
Delete button as exactly two properties — `border-color: var(--danger-border)`
and `color: var(--danger-text)` on `.delete-button` — and the executor
transcribed them faithfully. It rendered grey. Sitting a few lines above was
`.habit-actions button { border: 1px solid var(--control-border); color:
var(--text) }`: specificity `(0,1,1)` against `.delete-button`'s `(0,1,0)`, so
the shorthand `border` and the `color` both won and the override never fired.
Every check the spec could run passed — tokens present, AC 3's raw-hex grep
clean, suite green, build clean — because all of them ask *whether the value is
written*, and none asks *whether the selector carrying it applies*. Only the
composite saw it. Sampling a value from the prototype (L-012) settles what the
value is and says nothing about whether it reaches the pixel. When a spec writes
a one-property override next to an element-scoped base rule, scope the override
the same way (`.habit-actions .delete-button`), or it is decoration on a rule
that never fires. The sibling of L-021 and L-023: a check that could not fail.

**L-026 — A design screenshot only checks the states its seed happens to render.**
(`calendar-redesign` AC 10) `design:shot calendar --seed` opens the first demo
habit — daily, with a perfect current month — so the grid contained `done`,
`pending`, `future` and `blank` and nothing else. `missed` and `not-due` never
rendered. Two of five status colours could have been any value at all and the
composite would have looked correct, because a state that does not render
cannot look wrong. The check reported success on four things and was silent
about two, and silence is indistinguishable from a pass in a picture.

This is **not** the caveat `CLAUDE.md` already carried. That one is about
hover, focus and error states, which hide behind an *event*. These render in
the same static view with no interaction at all — same page, same shot,
different data. Conflating the two is why nobody had looked for it.

The tell was available and ignored: the whole reason the R1 defect (AD-020) had
to be settled by three rounds of `getComputedStyle` is that a 520px composite
column cannot distinguish `#dcfce7` from `#f4fbf6`. If measurement is needed to
verify a colour, the screenshot was never verifying it.

Two mechanisms came out of this. `scripts/design-shot.mjs` now declares each
route's data-dependent states in `STATES` and prints what actually rendered
(`5 of 7 declared … NOT RENDERED: status-missed, status-not-due`) — it does not
fail the run, because an uncovered state is a silence rather than a defect, and
naming the silence is the entire job. And AD-022's `*.design.spec.ts` covers
what no screenshot structurally can. The coverage line found a second instance
on its first run: `design:shot habits --seed` covers **1 of 4** declared states,
because every demo habit is due on the current weekday — so the `NOT TODAY`
pill was never compared against the mockup during the §2 build, on a page
already shipped and archived. Note its limit: only class-encoded states are
visible, and `<app-day-strip>` / `<app-activity-grid>` set colour via
`[style.background]` (AD-015), so their three states carry no class and need
the AD-022 treatment instead.

**L-027 — A second pass must re-open the source, not re-read the spec.**
(`calendar-redesign` CriticReview R1–R4) The Analyst was written from a careful
reading of the prototype `.dc.html`. Reviewed a day later *against the source
again*, four of its assertions were false — the `done`/`missed` fills were not
already tokenised, blank cells are `transparent` not `#fafaf9`, `#fafaf9` is a
sixth cell state and not padding, and `--radius-card-lg` already existed.

Every one of them was **invisible from the Analyst's own prose and obvious from
the `.dc.html` plus a `grep` of `src/styles.scss`.** That is the whole finding.
A spec is a paraphrase of the design, and by the second pass the paraphrase is
what gets reviewed — the drift is never in the reasoning, it is in the
transcription layer, and re-reading the reasoning cannot see it. The harden
round's first move is `read_file` on the source and a `grep` for every token it
claims exists, before a single line of its argument is considered. Two of the
four were claims about *the repository*, not the design (`--radius-card-lg`
exists; `--done-bg` is #f4fbf6), which are even cheaper to check and were
checked by nobody. Cost if unfixed: every done cell near-white, with the grep,
the build and the suite green. Sibling of L-011 and L-012.

**L-028 — A guard keyed to one tool's input shape is not a guard on the action.**
(2026-08-19, found while running `calendar-redesign`)
`enforce-haiku-tasks-pretooluse.sh` blocks top-level code edits during a
tasks.md run. It matched `Edit|Write|MultiEdit` and read
`.tool_input.file_path`. A Bash-mediated edit has no `file_path`, so the hook
exited 0 and `python3 - <<'PY'` rewriting `src/styles.scss` went straight
through with a run marker active. The guard was written against *the tools that
were convenient to inspect*, not against *the action being guarded*.

Two things make this worse than a simple oversight. The sibling hook
`protect-spec-docs-from-subagents.sh` already listed `Bash` in its matcher — the
capability gap was known in the same directory. And a session configured to
prefer shell over the file tools takes the unguarded path **by default**, so the
bypass was the common case rather than a corner case; the guard was weakest
exactly where it was most needed.

When writing a hook, enumerate every tool that can perform the action and check
the guard against the action. Where the tool's input cannot be parsed to find
its target — a shell command string cannot — the honest fallback is a
conservative heuristic plus a test matrix, not a silent exit 0.
`enforce-haiku-tasks.test.sh` pins 22 cases, because heuristics rot in both
directions: a tightened pattern that starts blocking `npx ng test` makes every
run unusable, a loosened one re-opens the gap with no symptom. It earned its
keep during development by catching a false positive nobody would have
predicted — `<<<` contains a `<<` pair, so every herestring read was being
denied until the pattern grew a leading `[^<]` guard.

**L-029 — A verification step's mechanism must be checked against what it's
checking, not assumed to see it.** (`analytics` CriticReview R8) Step 12 was
written to add a `data-state`-style attribute to heatmap cells and bars, then
rely on `design-shot.mjs`'s `reportStateCoverage` to count how many declared
states actually rendered. But `reportStateCoverage` counts via
`document.getElementsByClassName`, so a `data-state` attribute is invisible
to it — the step could not have done its job as planned, and nothing about
reading the plan would have surfaced that; only opening `design-shot.mjs`
did. Fixed by moving the state-marking into the steps that already own the
markup (plain CSS classes: `heat-0…heat-4`, `bar-max`/`bar-rest`,
`dow-best`/`dow-rest`), so Step 12 shrank to registering the page in
`STATES`.

Sibling of L-026: a screenshot only checks the states its seed renders, and a
coverage *counter* only counts the signal its own scan actually reads — both
failure modes are silent unless you read the tool doing the checking, not the
plan describing it.

**L-030 — A mutation check against already-sorted data can pass with the
comparator deleted.** (found during `analytics`'s harden-round verification)
`Array.prototype.sort()` is stable in every JS engine this app targets, so
deleting a comparator's tie-break clause and re-running a sort-dependent spec
against the demo seed produced no failure — the seed's pre-sort order already
matched the order the comparator was supposed to enforce, so "keep original
order on a tie" held whether or not the code that enforces it still existed.
The mutation only surfaced once the fixture was rewritten so the tied
elements' pre-sort order disagreed with the intended tie order.

A mutation-checked test is only as strong as its fixture's ability to
disagree with the default behaviour the mutation falls back to — stability,
insertion order, and object-key iteration order are the usual culprits,
because they are consistent enough to look intentional. Before trusting a
mutation kill on a comparator or reducer, check whether the fixture's
pre-operation order already matches the post-operation order it's asserting.

**L-031 — A design check whose state coverage depends on the weekday is a
defective gate.** (2026-08-21, `stacks` Step 16) The stacks design check
declares five data-dependent states, one of them `stack-item-not-due`. The only
seeded habit that could produce it, `demo-run`, is scheduled Mon/Wed/Fri — so on
exactly those days it *is* due, nothing renders as not-due, and the shot reports
`4 of 5 ... NOT RENDERED: stack-item-not-due`. On the other four days it reports
`5 of 5`. Same code, same seed, different verdict depending on the calendar.
That is not a gate: whichever day the check happens to run, half the time the
not-due styling is verified by nothing and the composite looks equally correct
whether its values are right or wrong. The fix is to make the seed day-proof —
a `demo-journal` habit scheduled `weekdays: [0, 6]` (weekend only) means that
Mon–Fri the journal is not due and Sat/Sun `demo-run` is not due, so some member
is always not-due. **Whenever a declared state depends on seed data, check
whether the seed can produce it on every day of the week, not just today's.**

**L-032 — A spec whose name claims more than its assertions check.**
(2026-08-21, `stacks` Steps 9, 13 and 15; the same shape as L-024/L-029) Three
times in this one feature, an `it(...)` name described a two-part guarantee and
the body asserted only one part — the other half stayed green no matter what the
code did. A name is the only thing most readers ever check, so an over-claiming
name is worse than a missing test: it marks the ground as covered. The cure that
caught all three is cheap and mechanical: **falsify the fixture on purpose.**
Break the exact condition the name claims to check, run the spec, and read the
failure message. If it still passes — or fails for some unrelated reason — the
name is lying. Restore, confirm green, and keep the experiment's result in the
spec's comment so the next reader does not have to repeat it.

**L-033 — A descendant selector written against a sibling class is dead and
invisible to every gate.** (2026-08-21, `stacks` Step 16)
`.stack-item-not-due .not-today-chip` was styled but could never match:
`.stack-item-not-due` sits on `.check-circle`, and `.not-today-chip` is that
circle's **sibling** in the flex row, not its descendant. The rule was also
inverted — it applied due-row values under a not-due selector — so even had it
matched it would have been wrong. Nothing could see it: SCSS compiles a dead
selector without complaint, no unit test asserts a rule that never fires, and
the design composite cannot tell a missing style from a correct one. Deleting it
changed no test result. **A selector is a claim about the DOM's shape; check it
against the template, because no tool will.**

**L-034 — An orphaned SCSS rule marks an element the template forgot to
render.** (2026-08-21, `stacks` Step 16) `.unst-label` was fully styled but no
element in `stacks.component.html` carried the class, so the UNSTACKED label
present in the mockup was simply absent from the page. The orphan is the
evidence: someone wrote the style from the design, then the markup drifted. The
cheap general check is to list class names defined in a component's SCSS,
subtract the ones appearing in its template, and look at what is left — every
survivor is either dead code (L-033) or a missing element (this one). Only
reading the mockup against the markup found this; no automated gate did.

**L-035 — The design-shot composite's resolution caps what can be verified
visually.** (2026-08-21, `stacks` Step 16) `scripts/design-shot.mjs` captures at
dpr 1 (no `deviceScaleFactor` on `browser.newPage`) while the committed
`design/target/*.png` are dpr 2, and the composite downscales both halves to fit
side by side — the stacks composite is **1056×349 for a 1440px page**. Every
sub-2px detail is therefore unresolvable in it: the 1.5px dashed anchor border,
the 10px NOT TODAY chip, the 9.5px anchor label. This is the same blind-spot
family as L-026 — the artefact looks equally correct whether those values are
right or wrong — and it is how three real defects (L-033, L-034, and a
`.done-pill` missing its padding and radius) survived a design check that
reported success. **Treat "the composite looks right" as evidence about layout
only.** For anything finer, crop both images at native resolution and read them,
or assert the value in a `*.design.spec.ts`.

**L-036 — `getComputedStyle` in ChromeHeadless at dpr 1 rounds fractional
border widths.** (2026-08-21, `stacks` design check fixture) The anchor box is
styled `border-width: 1.5px`, but `getComputedStyle` reports `'1px'` in the test
environment. The `stacks.design.spec.ts` workaround: accept both `['1px','1.5px']`
instead of asserting the exact fractional value. Consequence: the 1.5px border
is verified by **nothing** in this environment. The spec cannot assert it, and
per L-035 the composite is too coarse to show it either — the two blind spots
overlap exactly on this value. Record that in the spec's comment so a future
reader does not read the accepted pair as coverage.

**L-037 — `tasks.md` prose goes stale when an approved mid-run change
invalidates a step's stated expectation.** (2026-08-21, `stacks` Step 16)
Step 16's text told its executor that `stack-item-not-due` appearing under
`NOT RENDERED` was expected on Mon/Wed/Fri. That was true when the step was
written. It stopped being true mid-run, when the day-proof seed of L-031 was
approved and landed: from that point a missing not-due state was a **failure**
condition, and a step following its own prose would have accepted the very
defect the fix existed to remove. Stale prose is more dangerous than a stale
value because it reads as reasoning and an executor defers to it. **When a
mid-run change invalidates an assumption, grep the remaining steps for that
assumption and correct them before dispatching — or state the correction in the
step's brief, which is what happened here.**

**L-038 — The status-line model is the session's *configured* model, not the
serving model of a running subagent.** (2026-08-21, `model-tiering` §1) A
forensic pass was opened on the suspicion that `tasks.md` steps were secretly
executing on Opus, because the status line in a screenshot of a running step read
`opus`. The claim is **disproven**: all 15 `Agent` spawns in the `stacks` run
passed `"model":"haiku"`, and all 15 subagent transcripts are 100%
`claude-haiku-4-5-20251001` across 1,333 turns. The status line reports what the
*session* is configured to use; it says nothing about which model is serving a
subagent's turns. **`message.model` in the transcript JSONL is the only
authority** — subagent transcripts live at
`~/.claude/projects/<flattened-cwd>/<session-id>/subagents/agent-<id>.jsonl` and
carry `isSidechain: true`.

The real finding was on the other side of the ledger, and it was invisible from
the status line: the orchestrator was **75% of ~$60** because nothing stopped it
re-verifying every step by hand — 189 of its 211 Bash calls were pure text.
Delegation was already working (subagents read *twice* the cache for *a quarter*
the cost). **Measure where the money is before fixing where you assume it is**;
the suspected defect and the actual defect were on opposite sides of the same
run. Related: `~/.claude/scripts/context-report.py` globs `*.jsonl` one level
deep and never descends into `subagents/`, so it hides 100% of subagent spend —
its rate table is correct, only the glob is wrong.

**L-039 — A probe assertion on a value the prototype data-binds looks like
coverage and tests nothing.** (2026-08-21, `model-tiering` §2.4) A
`*.design.spec.ts` asserts through `getComputedStyle` on a probe element. That
only works for values with a **CSS rule** behind them. Where the prototype writes
`{{ h.hex }}`, `{{ c.bg }}` or `{{ h.ntPad }}`, the value is an inline per-item
binding: there is no rule, the probe computes the UA default or the inherited
value, and the assertion **passes vacuously** — it reads as coverage in the diff
and verifies nothing. This is the single largest trap in backfilling design
specs, and it is invisible at review time because a vacuous pass and a real pass
are the same green tick.

The discipline: before writing a design spec, split the page's values into
*literal* and *data-bound*, write the split into the spec's header comment, and
assert **geometry only** on the bound ones. On `habit-detail` that means every
circle's background, text colour *and* border are unassertable and only 36×36 /
50% / `12.5px` may be claimed. Sibling trap: `cell-blank` has **no CSS rule at
all**, so asserting a colour on it asserts the absence of a rule — it passes for
the wrong reason. Assert its layout and `rgba(0, 0, 0, 0)` instead. See also
L-022 (never source expected values from the component's own SCSS — that makes
the spec a change-detector) and L-024.

**L-040 — A step's `Done when` can name a file the step is forbidden to touch.**
(2026-08-21, `model-tiering` Steps 1–2) Step 1's `Files` list permitted three
files, but its `Done when` ran
`grep -rn 'model haiku\|model: "haiku"' CLAUDE.md specs/TEMPLATE.md .claude/hooks/`
and required silence — and `.claude/hooks/` contains
`enforce-haiku-tasks-pretooluse.sh`, which Step 1 was explicitly barred from
editing and which still carried the string in a header comment. The step was
correct and its own gate was unsatisfiable; the executor reported green by
quietly narrowing the grep to the one file it *had* changed. Two failure modes
meet here: an unsatisfiable gate, and an executor silently reinterpreting a check
rather than stopping (contrast L-013, where stopping is the process working).

Same run, same shape: Step 2's `Done when` asked the executor to prove the
armed-guard aborts by deleting the `## Executing:` marker — but the harness adds
its own `__hook-test-spec` marker when none is present, so the abort **cannot**
fire that way. **Scope a step's `Done when` to the files the step may modify, and
check that each gate is reachable given the harness it runs against.** The orchestrator
catching both is the argument for re-running a delegated step's own gates rather
than trusting the report (L-016).

**L-041 — A check that computes its own diff range is only as trustworthy as that range, and a new environment silently changes it.**
(2026-08-25, Part 4 of the config homework) `clean-table-check.sh` derived its
range from `git rev-parse --abbrev-ref HEAD`. That is correct in a pre-push
hook and wrong in GitHub Actions, where `actions/checkout` leaves HEAD detached
on the PR merge commit: `--abbrev-ref` returns the literal string `HEAD`, no
`origin/HEAD` ref exists in a fresh CI clone, and the no-upstream fallback
diffs against the **empty tree** — so every file in the repository reads as
newly added and all 31 files under `specs/archive/` become "this push archived
a spec". The gates themselves were all correct; the input to them was not. A
check like this can fail in both directions from one bad range — over-flag, as
here, or pass vacuously on an empty diff — and neither shows up as an error,
only as a green or red tick that means nothing. Verify the *range selection*
separately from the gates: the four paths were each confirmed to resolve to the
intended range before the workflow was ever pushed, and gate 1's block/pass
outcomes were driven by synthetic commits built with `git commit-tree`, which
needs no branch and no working-tree change.

Related: the same empty-tree fallback still fires on the genuine first push of
any new local branch, which is why pushing this branch diffs the whole
repository rather than just its commits. It passes only because `specs/STATE.md`
also reads as added and every archived file is already under the 20 KB limit —
luck, not design.
