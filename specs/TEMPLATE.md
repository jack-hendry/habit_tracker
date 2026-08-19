# Spec structure (SDD lite)

Spec-Driven Development: write the plan documents before writing code; code follows the plan.

## Layout

```
specs/
└── <feature-name>/
    ├── Analyst.md       <- WHAT and WHY (problem, scope, what is OUT of scope)
    ├── tasks.md         <- HOW (numbered checklist of small steps)
    └── CriticReview.md  <- findings from the critic/harden pass

specs/archive/
└── YYYY-MM-DD-<feature-name>/   <- finished specs move here once merged
```

## Analyst.md — must answer 4 questions

1. **What problem are we solving?**
2. **What is in scope?**
3. **What is OUT of scope?** (the most important one — be explicit)
4. **How do we know it is done?** (concrete, checkable acceptance criteria)

## tasks.md — rules

- Numbered steps, each small enough to verify alone (run a test, open the page, call the endpoint).
- Each step says HOW to verify it, not just what to do.
- Written only after Analyst.md has been reviewed and fixed by a human.
- Implementation starts only after the harden/critic pass (CriticReview.md exists).

### Write for the executor, not for yourself

`tasks.md` is planned on a large model and executed on Haiku
(`--model haiku`, per `CLAUDE.md`). The planning model knows the whole spec;
the executing model knows only what is on the page. Everything the executor
needs must be *in the step* — pointing at `Analyst.md` does not count.

Three rules carry most of the weight:

1. **One verifiable outcome per step.** If a step contains an implicit "and",
   it is two steps. If you cannot name a command that proves it is done, it is
   too big.
2. **Every step ends with a concrete "Done when".** Not "verify it builds" —
   the literal command and the expected result. A step without one is a step
   the executor will declare finished optimistically.
3. **Anchor by unique string, not line number.** Line numbers go stale the
   moment an earlier step edits the same file. Give a symbol or a distinctive
   line to search for; `~line 140` is a hint alongside the anchor, never
   instead of it.

### tasks.md — step format

Each step follows this shape. Sections with nothing to say may be dropped —
except **Done when**, which is mandatory.

```markdown
### Step N — <one-line imperative summary>

**Depends on:** Step N-1 — <what this step consumes from it: a type, a
signature, a file it creates>   (omit only if this step shares nothing
with any other step)

**Assumes:** <behaviour this step relies on but does not implement> — pinned
by `<spec file> › <test name>`   (required only for steps in a parallel
group; see "Running steps in parallel")

**Files**
- MODIFY `path/to/file.ts` — anchor: `existingSymbolName` (~line 140)
- CREATE `path/to/new-file.ts`
- DO NOT TOUCH: <files a plausible reading would drag in but this step must not>

**Context**
The one paragraph the executor needs and cannot infer from the open files:
which existing thing is the closest analogue, what invariant must hold.
"Follow the pattern in `X`" is worth more than a paragraph of prose.

**Do**
1. <imperative, decided, no open choices>
2. <...>

**Done when**
- `npm test` — N tests pass (was N-k)
- `grep -rn "newSymbol" src/` returns exactly the expected hits
- <manual check, if the step is UI-only>

**If blocked**
If <specific precondition> is not true, STOP and report — <which earlier step
did not land>. Do not improvise a fix.
```

### What each section is for

- **Depends on** — the reason, not just the number. "Step 2" does not tell a
  reader whether Steps 3 and 4 could run at the same time; "Step 2 — consumes
  the `HabitStreak` interface it defines" does. This is the field that decides
  parallelisability, so an omitted one is a *claim*: this step shares no type,
  signature, or file with any other. Make that claim deliberately.
- **Assumes** — the behavioural rules this step leans on but does not itself
  implement, each naming the test that pins it. Required only for steps in a
  parallel group, where nothing else will catch a violation; a sequential run
  gets the same check for free by breaking the later step. Naming the test is
  what makes the field more than a declaration — see "Running steps in parallel".
- **Files** — the whole edit surface up front, so the executor is not
  discovering scope mid-step. `DO NOT TOUCH` is the underrated half: small
  models wander into adjacent files and refactor them. Name the exclusions.
  This section is also load-bearing for parallelism (below): a step that edits
  a file it did not declare is the one failure the parallel rules cannot see.
- **Context** — an exemplar to imitate. Imitation is the executing model's
  strength; inventing structure is not.
- **Do** — imperatives with **zero design decisions left open**. Naming, file
  location, signal-vs-observable — every unresolved choice is a place where the
  executor picks something plausible and inconsistent with the rest of the
  slice. Resolve them during the spec and critic passes, where the big model
  is. For new files, include the literal contents or a near-complete skeleton;
  do not describe a file and hope.
- **Done when** — commands, not intentions. Include the expected test count so
  a silently skipped suite is visible.
- **If blocked** — a *local* restatement of the global stop rule. Global rules
  get dropped over a long run; a stop condition written into the step gets
  followed. Name the precondition that would signal an earlier step broke.

### Ordering rules

- **Every step ends at a green build.** Never leave the repo non-compiling
  between steps — the executor cannot tell "expected breakage" from "I broke
  it", and will start fixing the wrong thing.
- **State the total up front** ("12 steps, in order, do not skip ahead"). It
  reduces the tendency to batch several steps into one edit.
- **A checkpoint step every ~4 steps** — no new code, just re-run the build and
  the full suite and re-confirm the previous steps' "Done when" conditions.
  Cheap, and it catches drift before it compounds.
- **A regression + wrap-up step last**, walking the acceptance criteria in
  `Analyst.md`, updating `STATE.md`, filling in the retrospective, and ending
  with **do not commit — ask the user first**.

### What the critic pass verifies

Re-reading the plan for internal consistency is not enough — a plan can be
perfectly consistent with itself and still wrong about the code. For every step
that assumes a type, a return value, or a method signature defined elsewhere,
**open that file and confirm it**. That is how `habits-redesign` R11 caught
`HabitService.add()` returning `void` when `tasks.md` had already written
`const created = this.habitService.add(...)`; the run would have stopped twelve
steps in, on a defect one `grep` at planning time removes (L-018).

Pay particular attention to any pair of steps with **no `Depends on` link**
between them. A sequential run surfaces a wrong assumption for free — the later
step breaks, in order, visibly. Steps planned to run in parallel never get that
check, so the critic is the only place it happens.

### Running steps in parallel (optional)

Sequential is the default. Parallelism pays only for several independent,
non-trivial steps — a small step loses more to a cold start than it gains.

Two steps may run in parallel only if **all three** hold:

1. No `Depends on` link between them, in either direction.
2. **Their `Files` lists share no file at all.** Not "no overlapping lines" —
   no shared file, full stop. Git merges non-overlapping edits to the same file
   without raising a conflict, so two agents restyling different halves of
   `habit-list.component.ts` merge clean and can still be logically broken.
   Same file in two steps ⇒ those steps run sequentially. No exceptions.
3. **Every `Assumes:` entry on either step names a test that pins it.** See
   below.

### `Assumes:` — required for steps in a parallel group

Rules 1 and 2 are about *files*. They say nothing about two steps relying on the
same unwritten rule about how the app behaves — "archiving a habit closes its
open editor", "a paused habit never appears in the today list". Nothing types
that, so nothing breaks at the merge if one step quietly violates it.

A step in a parallel group therefore adds:

```markdown
**Assumes:** <behaviour this step relies on but does not implement>
— pinned by `<spec file> › <test name>`
```

The naming requirement is the whole point. Writing the assumption down and
stopping there enforces nothing — a planner writes "Assumes: nothing" and the
check passes. Naming a test *converts* the assumption from untested behaviour
into tested behaviour, and the full suite at the merge point then catches a
violation mechanically. **If no such test exists, adding it is a prerequisite
step and the group does not run in parallel until it lands.**

Two things to hold to when writing that test:

- Include the case that can *fail*. `archive()` closing the editor over its own
  habit is half the rule; the other half is that it leaves an editor open over a
  *different* habit alone. Without the second, deleting the guard entirely still
  passes (L-024 — a named assertion can still be hollow).
- Sequential steps do not need this field. The ordering already does the
  checking: a wrong assumption breaks the later step, in order, visibly. Paying
  for it there is process that does not earn its keep.

Protocol:

- Spawn each with the Agent tool using `isolation: "worktree"`, so each gets its
  own checkout. The top-level session keeps ownership of `tasks.md` — subagents
  are blocked from editing it by `protect-spec-docs-from-subagents.sh`.
- **Scope check before merging.** `git diff --name-only <branch-point>..<branch>`
  must list nothing outside that step's declared `Files`. Rule 2 protects only
  the files a step *declared*; this is what catches the step that wandered.
  Unlike the `DO NOT TOUCH` check in L-023, this one is sound: a worktree branch
  has a real commit as its baseline, which is exactly the condition L-023 found
  missing when it compared against an uncommitted working tree.
- Merge the branches back one at a time.
- **The green-build rule applies at the merge point, not per branch.** Each
  branch being green alone proves nothing about the combination. Run the full
  build and the full suite after the last merge, before the next step starts.
- Put a checkpoint step immediately after any parallel group.

What survives all of the above: an assumption nobody wrote in `Assumes:`. Rule 3
only reaches the ones a planner thought of — an unnoticed assumption is still
untyped, still untested, and invisible to the build, the suite and the merge
alike. The critic pass above is the only thing that will find it. Where coverage
is thin, run the steps sequentially and let the ordering do the checking.

## Sizing

Not every task deserves a spec. Classify BEFORE starting — see the sizing rule
in `CLAUDE.md`. Small tasks skip specs entirely and get one row in the
Quick Tasks table in `STATE.md` instead.

## Retrospective

Before archiving a spec, answer at the bottom of `Analyst.md`:
- Did Analyst.md catch anything not thought about up front?
- Did anything in tasks.md turn out to be wrong during coding? What?
