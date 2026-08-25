---
description: Compare a rendered page against its design mockup — spawns the design-check agent
argument-hint: <name> [--width 1440]
allowed-tools: Agent
---

Invoke the `design-check` agent to compare a rendered route against its design mockup and iterate until the gaps close.

## Mockups and composites

- **Mockups live in** `design/target/<name>.png`, named after the route (`dashboard`, `habits`, `calendar`, etc.).
- **The composite** is `design/compare/<name>.png` — target on the left, actual on the right. Read only the composite, not the two source images separately.
- `design/actual/` and `design/compare/` are generated and gitignored. Only `design/target/` is committed.

## Mandatory rules

- **Always pass `--width` matching the mockup's pixel width.** Mismatched viewports produce breakpoint differences that read as design bugs.
- **Always pass `--seed`,** so an unseeded localStorage doesn't render the empty state and pollute the comparison.

The agent will report these values explicitly and verify coverage before concluding.

## Static screenshots only

Only what's visible in a static screenshot gets checked. Hover, focus, empty, and error states need their own mockups and their own runs.
