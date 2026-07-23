#!/usr/bin/env bash
# PreToolUse hook: blocks the top-level session from directly editing code
# files while a tasks.md execution is in progress, per CLAUDE.md's rule to
# delegate tasks.md steps to a Haiku subagent (Agent tool, model: "haiku").
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

transcript_path=$(jq -r '.transcript_path // empty' <<<"$input")
cwd=$(jq -r '.cwd // empty' <<<"$input")

if [[ -z "$transcript_path" || ! -f "$transcript_path" ]]; then
  exit 0
fi

# Only fire if a tasks.md has been referenced recently in this conversation.
if ! tail -n 60 "$transcript_path" | grep -q 'tasks\.md'; then
  exit 0
fi

# Only fire once a full spec triad exists (Analyst.md + tasks.md + CriticReview.md).
triad_found=false
if [[ -n "$cwd" && -d "$cwd/specs" ]]; then
  while IFS= read -r tasks_file; do
    spec_dir=$(dirname "$tasks_file")
    if [[ -f "$spec_dir/Analyst.md" && -f "$spec_dir/CriticReview.md" ]]; then
      triad_found=true
      break
    fi
  done < <(find "$cwd/specs" -maxdepth 2 -name 'tasks.md' 2>/dev/null)
fi

if [[ "$triad_found" != "true" ]]; then
  exit 0
fi

reason="Per CLAUDE.md, implement tasks.md steps via a Haiku subagent (Agent tool, model: \"haiku\"), not by editing code directly from the top-level session. Blocked edit to: $file_path"

jq -n --arg reason "$reason" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: $reason
  }
}'
exit 0
