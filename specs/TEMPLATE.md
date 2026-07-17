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

## Sizing

Not every task deserves a spec. Classify BEFORE starting — see the sizing rule
in `CLAUDE.md`. Small tasks skip specs entirely and get one row in the
Quick Tasks table in `STATE.md` instead.

## Retrospective

Before archiving a spec, answer at the bottom of `Analyst.md`:
- Did Analyst.md catch anything not thought about up front?
- Did anything in tasks.md turn out to be wrong during coding? What?
