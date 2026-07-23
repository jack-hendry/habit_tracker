#!/usr/bin/env bash
# UserPromptSubmit hook: reminds the top-level session to delegate tasks.md
# step execution to a Haiku subagent, per CLAUDE.md.
set -euo pipefail

input=$(cat)
prompt=$(jq -r '.prompt // empty' <<<"$input")

# Fire when the prompt references tasks.md alongside an execution verb.
if echo "$prompt" | grep -qiE 'tasks\.md' && \
   echo "$prompt" | grep -qiE '\b(execute|implement|run|do|start|continue|next)\b'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: "Reminder (from CLAUDE.md): steps from tasks.md must be implemented by delegating to a subagent via the Agent tool with model: \"haiku\" — do not implement them directly in this top-level session."
    }
  }'
fi
exit 0
