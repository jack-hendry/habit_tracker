---
description: Run the Analyst step for a new feature spec (SDD lite)
---

Act as the Analyst for a new feature: **$ARGUMENTS**.

First, read `specs/TEMPLATE.md` in full so you follow the spec structure and
the 4-question format exactly as documented there — don't rely on memory of
the format.

Then classify the size (Small / Medium / Large / Complex) per the sizing
rule in `CLAUDE.md`, and state your reasoning. If it's Small, stop — just do
the work directly and skip the spec.

If Medium or larger, write `specs/<feature-name>/Analyst.md` following the
structure in `specs/TEMPLATE.md`. It must answer exactly the 4 questions
defined there:

1. What problem are we solving?
2. What is in scope?
3. What is OUT of scope? (be aggressive here — this is the most important section)
4. How do we know it is done? (concrete, checkable criteria — things that can be run or clicked)

Do NOT write `tasks.md` yet, and do NOT write any code. Stop after
`Analyst.md` so the user can review and correct it first.
