#!/usr/bin/env bash
# PreToolUse hook: surfaces a `git push` that skips the pre-push gate.
#
# scripts/clean-table-check.sh runs as a pre-push hook (wired via
# .pre-commit-config.yaml) and enforces the end-of-feature ritual: an archive
# addition paired with a specs/STATE.md change, no newly archived file over
# 20 KB, every L-NNN headline matched to a LESSONS.md body, and STATE.md inside
# its line budget. CLAUDE.md already calls that hook "a reminder for the honest
# case, not a guarantee" because `git push --no-verify` skips it outright. This
# makes reaching for the bypass a deliberate, visible act instead of a quiet
# one -- the agent is the one likeliest to type it to get past a red gate.
#
# What this is NOT: a guarantee either. It is a client-side hook flagging a
# client-side bypass, and it emits `ask`, so the push still happens if approved.
# CI (.github/workflows/ci.yml) runs the same script on every pull request and
# every push to main -- that is the actual gate. This only saves the round-trip
# of finding out there.
#
# Deliberately NOT gated on the `## Executing:` run marker, unlike
# enforce-haiku-tasks-pretooluse.sh: that hook is about delegation during a
# tasks.md run, and most pushes happen outside one. Subagents are not exempt
# either, for the same reason -- the bypass is no more acceptable from one.
set -euo pipefail

input=$(cat)

tool_name=$(jq -r '.tool_name // empty' <<<"$input")
[[ "$tool_name" == "Bash" ]] || exit 0

command=$(jq -r '.tool_input.command // empty' <<<"$input")
[[ -n "$command" ]] || exit 0

# Command-position anchored so `grep -rn "push --no-verify" specs/` and
# `cat CLAUDE.md` stay clear of it. Known false negative: global flags other
# than -C (`git --no-pager push --no-verify`).
push_re='(^[[:space:]]*|[;&|(][[:space:]]*)git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+push\b'
grep -qE "$push_re" <<<"$command" || exit 0

# `--no-verify` only. NOT `-n`: for `git push` that is `--dry-run`, which runs
# no hooks because it pushes nothing -- flagging it would be a false positive
# on the safest possible push.
grep -qE '(^|[[:space:]])--no-verify([[:space:]]|=|$)' <<<"$command" || exit 0

reason="This push skips the pre-push gate (scripts/clean-table-check.sh): the archive/STATE.md pairing, the 20 KB archived-file limit, the L-NNN <-> LESSONS.md match, and the STATE.md line budget all go unchecked. CI runs the same script on every PR and every push to main, so a violation surfaces there instead. Approve only if the bypass is deliberate and the gate is known to be wrong; otherwise fix what it is complaining about. Command: $command"

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: $reason
  }
}'
exit 0
