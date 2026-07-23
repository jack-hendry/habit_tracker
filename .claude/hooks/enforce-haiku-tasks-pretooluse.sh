#!/usr/bin/env bash
# PreToolUse hook: blocks the top-level session from directly editing code
# files while a tasks.md execution is in progress, per CLAUDE.md's rule to
# delegate tasks.md steps to a Haiku subagent (Agent tool, model: "haiku").
#
# Activation is explicit: the session opts in by adding a marker line to
# STATE.md when it begins executing a spec's tasks.md --
#
#     ## Executing: <spec-dir-name>
#
# and removes that line when the run finishes. Earlier revisions of this hook
# inferred an active run by grepping the transcript for the string "tasks.md",
# which misfired on any incidental mention (reading STATE.md was enough) and
# blocked unrelated Small tasks.
set -euo pipefail

input=$(cat)

# Subagent calls (Haiku executor included) are always allowed.
agent_id=$(jq -r '.agent_id // empty' <<<"$input")
if [[ -n "$agent_id" ]]; then
  exit 0
fi

file_path=$(jq -r '.tool_input.file_path // empty' <<<"$input")
if [[ -z "$file_path" || "$file_path" == *.md ]]; then
  exit 0
fi

cwd=$(jq -r '.cwd // empty' <<<"$input")
if [[ -z "$cwd" || ! -f "$cwd/STATE.md" ]]; then
  exit 0
fi

# Only fire when STATE.md declares an in-flight execution.
spec=$(grep -m1 -E '^## Executing: ' "$cwd/STATE.md" 2>/dev/null | sed -E 's/^## Executing: *//; s/ *$//' || true)
if [[ -z "$spec" ]]; then
  exit 0
fi

# The named spec must be a real one -- a full triad (Analyst.md + tasks.md +
# CriticReview.md). A marker pointing at nothing should not block work.
spec_dir="$cwd/specs/$spec"
if [[ ! -f "$spec_dir/Analyst.md" || ! -f "$spec_dir/tasks.md" || ! -f "$spec_dir/CriticReview.md" ]]; then
  exit 0
fi

reason="Per CLAUDE.md, implement tasks.md steps via a Haiku subagent (Agent tool, model: \"haiku\"), not by editing code directly from the top-level session. Active run: specs/$spec (declared by the '## Executing: $spec' line in STATE.md -- remove it when the run is done). Blocked edit to: $file_path"

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
exit 0
