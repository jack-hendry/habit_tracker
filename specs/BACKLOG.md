# Backlog

Ideas that aren't scheduled yet — no process, no size classification, just a
place for them to rest until they're worth picking up. Not gated by any hook
or CI check (unlike `STATE.md`). One line per idea; add a second line only
when the "why" isn't obvious from the title alone.

Status tags: `open` (not started) · `exploring` (actively being considered) ·
`dropped` (decided against — keep the line, note why) · `done` (shipped —
move the outcome to `STATE.md` as an AD/L if it's worth remembering, then
delete the line here).

## Hooks

- [open] Detect a stale `## Executing:` marker (tasks.md has no steps left)
  — otherwise it can keep blocking unrelated Small tasks indefinitely if
  someone forgets to remove it.
- [dropped] Match an `Agent` call's model to its *specific* tasks.md step
  — the global half shipped 2026-08-27 (opus or an absent `model` is asked
  about); the per-step half is not implementable: nothing in an Agent call says
  which step it is executing, and matching its free-text prompt to a step
  heading is the fuzzy signal L-004 is about.
- [dropped] Warn on `git push --no-gpg-sign` — shipped the `--no-verify` half
  only. Nothing in this repo requires signed commits (`commit.gpgsign` and
  `user.signingkey` are both unset), so it would warn about nothing.
- [open] Run `tools/state_rotate.py --check` inline on `STATE.md` edits
  — catch the ~300-line budget at edit time instead of only at push.
- [open] Cross-check archive additions are paired with a `STATE.md` change at
  edit time, not just at push — likely low value since CI already gates this.

## Harness portability

- [open] Port the SDD harness to `Leetcode-Tracker` — first target in
  `sdd-bootstrap`'s port order: most active non-Spanish repo, git + PR workflow
  already, zero `.claude/`.
