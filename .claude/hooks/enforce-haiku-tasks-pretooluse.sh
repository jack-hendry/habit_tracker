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
# Three gates, all dormant unless the run marker names a real spec triad:
#   1. the original one -- deny a direct write to project code from the
#      top-level session, so the step goes to its subagent instead;
#   2. ask before `git commit` / `git push` from the top level, because the
#      marker says the tree is mid-run (added 2026-08-27);
#   3. ask before dispatching a subagent on opus or on no model at all, which
#      TEMPLATE.md forbids for a step (added 2026-08-27).
#
# The `git push --no-verify` warning is deliberately NOT here: it belongs in
# warn-push-bypass.sh, which is always on, because it has nothing to do with
# whether a tasks.md run is in flight.
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

decide() { # $1 = allow|ask|deny, $2 = reason (ask and deny only)
  case "$1" in
    allow)
      exit 0
      ;;
    ask|deny)
      jq -n --arg d "$1" --arg reason "$2" '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: $d,
          permissionDecisionReason: $reason
        }
      }'
      exit 0
      ;;
  esac
}

verify_reason="Verification commands like this should run inside the step's subagent (**Model: haiku** in tasks.md), not at the top level. The orchestrator's job is to read the step's report; approving once is acceptable if this is a deliberate spot check."

run_context="Active run: specs/$spec (declared by the '## Executing: $spec' line in STATE.md -- remove it when the run is done)."

# --- Gate: which model a delegated step is dispatched with -------------------
# TEMPLATE.md fixes the allowed executors globally -- haiku, sonnet, top-level,
# NEVER opus -- and says an absent `model` makes the subagent inherit
# ~/.claude/settings.json ("model": "opus", "effortLevel": "high"), the most
# expensive possible default. That rule needs no step mapping, so it is checked
# here. The other half -- "is THIS call's model the one THIS step's Model:
# field names" -- is deliberately NOT attempted: nothing in an Agent call says
# which step it is executing, and matching its free-text prompt against step
# headings is exactly the fuzzy signal L-004 is about. ASK, not DENY: a
# legitimate sonnet step and a deliberate one-off both exist.
#
# Task is matched alongside Agent because the delegation tool has carried both
# names across harness versions; keying on one is a guard that silently stops
# guarding after a rename (L-028).
case "$tool_name" in
  Agent|Task)
    model=$(jq -r '.tool_input.model // empty' <<<"$input" | tr '[:upper:]' '[:lower:]')
    subagent=$(jq -r '.tool_input.subagent_type // empty' <<<"$input")
    case "$model" in
      haiku|sonnet) exit 0 ;;
    esac
    if [[ -z "$model" ]]; then
      model_detail="no model field, so the subagent inherits ~/.claude/settings.json (opus, high effort) -- the most expensive default"
    else
      model_detail="model: $model"
    fi
    if [[ "$subagent" == "fork" ]]; then
      model_detail="$model_detail; subagent_type \"fork\" ignores a model override and always runs on the parent's model"
    fi
    decide ask "Dispatching a subagent while a tasks.md run is in flight ($model_detail). TEMPLATE.md allows haiku, sonnet or top-level for a step -- never opus -- and requires the Model: field on every step; use the model that step names. $run_context"
    ;;
esac

if [[ "$tool_name" == "Bash" ]]; then
  command=$(jq -r '.tool_input.command // empty' <<<"$input")
  if [[ -z "$command" ]]; then
    exit 0
  fi

  # A commit or push while the run marker is live. The marker exists precisely
  # to say "the tree is mid-run"; nothing else stopped the top-level session
  # from committing halfway through one. ASK rather than DENY -- a checkpoint
  # commit before merging parallel worktree branches is legitimate, and a deny
  # with no override is the fail-closed half of B-001. Subagents never reach
  # here (the agent_id check at the top of the file exits first), which is what
  # preserves CLAUDE.md's carve-out for a step's throwaway worktree branch.
  # Command-position anchored so `grep -rn "git commit" specs/` stays allowed.
  # Known false negative: global flags other than -C (`git --no-pager commit`).
  git_write_re='(^[[:space:]]*|[;&|(][[:space:]]*)git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+(commit|push)\b'
  if grep -qE "$git_write_re" <<<"$command"; then
    decide ask "A tasks.md run is in flight, and this commits or pushes from the top-level session. Per CLAUDE.md every commit on the working branch needs the user's explicit permission for that specific commit; the run marker says the tree is mid-run. Approve only if this is a deliberate checkpoint (e.g. before merging worktree branches), not a side effect. $run_context Command: $command"
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
      decide ask "$verify_reason"
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
      decide ask "$verify_reason"
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

decide deny 'Per CLAUDE.md, implement tasks.md steps via a Haiku subagent (Agent tool, model: "haiku"), not by editing code directly from the top-level session. '"$run_context"' Blocked write to: '"$target"
