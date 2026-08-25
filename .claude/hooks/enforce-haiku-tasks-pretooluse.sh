#!/usr/bin/env bash
# PreToolUse hook: blocks the top-level session from directly editing code
# files while a tasks.md execution is in progress, per CLAUDE.md's rule to
# delegate tasks.md steps to a subagent (Agent tool, Model: per-step in tasks.md).
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
#
# Bash is covered as well as Edit/Write/MultiEdit (added 2026-08-19). It was
# matcher-limited to the file-editing tools, and keyed off
# `.tool_input.file_path` -- which only those tools populate. A Bash-mediated
# edit has no file_path, so the hook exited 0 and the write went through with a
# run marker active. That is not theoretical: `python3 - <<'PY'` rewriting
# src/styles.scss sailed past it during the calendar-redesign run. Sessions
# configured to prefer shell over the file tools take that path by DEFAULT, so
# the gap was the common case, not the corner case.
set -euo pipefail

input=$(cat)

# Subagent calls (Haiku executor included) are always allowed.
agent_id=$(jq -r '.agent_id // empty' <<<"$input")
if [[ -n "$agent_id" ]]; then
  exit 0
fi

cwd=$(jq -r '.cwd // empty' <<<"$input")
if [[ -z "$cwd" || ! -f "$cwd/STATE.md" ]]; then
  exit 0
fi

# Only fire when STATE.md declares an in-flight execution. Checked before any
# tool-specific parsing so the dormant case stays near-free.
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

tool_name=$(jq -r '.tool_name // empty' <<<"$input")

# Read-only tools are always fine, even if the matcher ever widens.
case "$tool_name" in
  Read|Grep|Glob|NotebookRead) exit 0 ;;
esac

# Paths this hook defends. Deliberately NOT specs/ (.md is the session's own
# to write, and protect-spec-docs-from-subagents.sh guards those from the other
# direction) and NOT throwaway scripts at the repo root -- a scratch .mjs that
# measures the running app is not the project code this rule exists to protect.
protected_re='(src|scripts|\.claude/hooks)/[a-z0-9_./-]+|(angular|package|tsconfig[a-z0-9_.-]*)\.json|\.pre-commit-config\.yaml'

decide() { # $1 = allow|ask|deny, $2 = target
  case "$1" in
    allow)
      exit 0
      ;;
    ask)
      local ask_reason="Verification commands like this should run inside the step's subagent (**Model: haiku** in tasks.md), not at the top level. The orchestrator's job is to read the step's report; approving once is acceptable if this is a deliberate spot check."
      jq -n --arg reason "$ask_reason" '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason: $reason
        }
      }'
      exit 0
      ;;
    deny)
      local target="$2"
      local deny_reason='Per CLAUDE.md, implement tasks.md steps via a Haiku subagent (Agent tool, model: "haiku"), not by editing code directly from the top-level session. Active run: specs/'"$spec"' (declared by the '"'"'## Executing: '"$spec"''"'"' line in STATE.md -- remove it when the run is done). Blocked write to: '"$target"
      jq -n --arg reason "$deny_reason" '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: $reason
        }
      }'
      exit 0
      ;;
  esac
}

if [[ "$tool_name" == "Bash" ]]; then
  command=$(jq -r '.tool_input.command // empty' <<<"$input")
  if [[ -z "$command" ]]; then
    exit 0
  fi

  # A verification command the ORCHESTRATOR should not be running by hand: the
  # step's own `Done when` already runs it inside the subagent. Anchored to a
  # command position so `grep -rn "npm test" specs/` and `cat scripts/design-shot.mjs`
  # stay allowed. Known false negative: a wrapper prefix (`time npm test`)
  # slips through -- acceptable, the decision is ASK not DENY.
  verify_re='(^[[:space:]]*|[;&|(][[:space:]]*)'
  verify_re+='((npm|pnpm|yarn)[[:space:]]+(run[[:space:]]+)?(test|build|design:shot)\b'
  verify_re+='|(npx[[:space:]]+)?ng[[:space:]]+(test|build)\b'
  verify_re+='|(node[[:space:]]+)?scripts/design-shot\.mjs)'
  is_verify=0
  grep -qE "$verify_re" <<<"$command" && is_verify=1

  # Stage 1: does it name a protected path at all? Reads (cat/grep/npx ng test)
  # mention them constantly and must stay allowed, so this alone never blocks.
  if ! tr '[:upper:]' '[:lower:]' <<<"$command" | grep -qE "$protected_re"; then
    if [[ $is_verify -eq 1 ]]; then
      decide ask
    else
      exit 0
    fi
  fi

  # Stage 2: does it look like a WRITE rather than a read? Four families:
  #   1. a redirect landing on a protected path
  #   2. the in-place editors and file movers
  #   3. a heredoc, or an interpreter fed inline source (-e/-c). The command
  #      string cannot be parsed to find the real target, so any of these that
  #      also names a protected path is treated as a write. `<<-?[stuff]`
  #      deliberately excludes `<<<` (a herestring, which is a read).
  #   4. explicit write calls from a one-liner
  write_re='>>?[[:space:]]*[^|]*('"$protected_re"')'
  write_re+='|\b(sed|perl|ruby)\b[^|;]*[[:space:]]-i'
  write_re+='|\b(tee|mv|cp|rm|truncate|patch|dd|install|ln)\b'
  write_re+='|(^|[^<])<<-?[[:space:]]*['"'"'"a-zA-Z_]'
  write_re+='|\b(python3?|node|perl|ruby|php)\b[^|]*[[:space:]]-[ec]\b'
  write_re+='|writeFileSync|write_text\(|\.write\(|open\([^)]*['"'"'"]w'

  if ! grep -qE "$write_re" <<<"$command"; then
    if [[ $is_verify -eq 1 ]]; then
      decide ask
    else
      exit 0
    fi
  fi
  target="$command"
else
  target=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty' <<<"$input")
  if [[ -z "$target" || "$target" == *.md ]]; then
    exit 0
  fi
fi

decide deny "$target"
