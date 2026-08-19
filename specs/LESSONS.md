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

