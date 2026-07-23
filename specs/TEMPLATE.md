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

**Depends on:** Step N-1   (omit if independent)

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

- **Files** — the whole edit surface up front, so the executor is not
  discovering scope mid-step. `DO NOT TOUCH` is the underrated half: small
  models wander into adjacent files and refactor them. Name the exclusions.
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

## Sizing

Not every task deserves a spec. Classify BEFORE starting — see the sizing rule
in `CLAUDE.md`. Small tasks skip specs entirely and get one row in the
Quick Tasks table in `STATE.md` instead.

## Retrospective

Before archiving a spec, answer at the bottom of `Analyst.md`:
- Did Analyst.md catch anything not thought about up front?
- Did anything in tasks.md turn out to be wrong during coding? What?
