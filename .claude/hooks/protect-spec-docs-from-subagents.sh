#!/usr/bin/env bash
# PreToolUse hook: blocks delegated subagents (the Haiku tasks.md executor) from
# MODIFYING the spec planning docs — Analyst.md, tasks.md, CriticReview.md.
# Reading them is fine: the executor needs to see its own step. Writing is not —
# a subagent that edits them can silently rewrite the plan it is meant to follow.
set -euo pipefail

input=$(cat)

# Top-level session (no agent_id) is unrestricted — it authors these files.
agent_id=$(jq -r '.agent_id // empty' <<<"$input")
if [[ -z "$agent_id" ]]; then
  exit 0
fi

protected_re='(analyst\.md|tasks\.md|criticreview\.md)'

tool_name=$(jq -r '.tool_name // empty' <<<"$input")

# Read-only tools are always fine, even if the matcher ever widens.
case "$tool_name" in
  Read|Grep|Glob|NotebookRead) exit 0 ;;
esac

if [[ "$tool_name" == "Bash" ]]; then
  # Reads (cat/grep/head) stay allowed; only in-place writes are blocked.
  command=$(jq -r '.tool_input.command // empty' <<<"$input")
  if ! echo "$command" | tr '[:upper:]' '[:lower:]' | grep -qE "$protected_re"; then
    exit 0
  fi
  if ! echo "$command" | grep -qE '(>>?[[:space:]]*[^|]*'"$protected_re"'|sed[[:space:]]+-i|tee[[:space:]]|mv[[:space:]]|cp[[:space:]]|rm[[:space:]]|truncate[[:space:]])'; then
    exit 0
  fi
  target="$command"
else
  target=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
  if [[ -z "$target" ]]; then
    exit 0
  fi
  if ! echo "$target" | tr '[:upper:]' '[:lower:]' | grep -qE "$protected_re"; then
    exit 0
  fi
fi

reason="Subagents may READ spec planning docs but may not modify them (Analyst.md, tasks.md, CriticReview.md). Those are owned by the top-level session — checking off tasks.md and revising the plan are its job, not the executor's. Blocked write to: $target"

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
exit 0
