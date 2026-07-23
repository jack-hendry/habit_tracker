# STATE — run marker

**Project memory lives in [`specs/STATE.md`](specs/STATE.md)** — decisions
(`AD-NNN`), blockers (`B-NNN`), lessons (`L-NNN`), quick tasks and phase
status. Put entries there, not here (AD-008).

This file exists for one thing: `.claude/hooks/enforce-haiku-tasks-pretooluse.sh`
greps the **repo root** `STATE.md` for a line of the form

```
## Executing: <spec-dir-name>
```

Add that line when starting a `tasks.md` run, and delete it when the run
finishes. Without the marker the hook stays dormant and top-level edits are not
blocked; with a stale marker every direct edit is blocked. See B-001 / L-004.

## Current work

Phase 4c (completion types, storage v2) is the only Phase 4 slice left — see
`specs/phase-4-plan.md`. 4a (metadata) and 4b (lifecycle) are done and archived.
