#!/usr/bin/env bash
# Test matrix for warn-push-bypass.sh.
#
# The hook is a two-stage regex: "is this a push?" AND "does it carry
# --no-verify?". Both stages are loosenable by accident. Stage 1 anchored to a
# command position is what keeps `grep -rn "push --no-verify" CLAUDE.md` quiet
# -- CLAUDE.md contains that exact string, so an unanchored pattern would fire
# every time the agent reads the project's own instructions. Run after touching
# the hook.
#
#   ./.claude/hooks/warn-push-bypass.test.sh
#
# Unlike enforce-haiku-tasks.test.sh this needs no fixture: the hook is always
# on, keyed to nothing but the command string.
set -uo pipefail
cd "$(dirname "$0")/../.."

HOOK=./.claude/hooks/warn-push-bypass.sh
fails=0

run() { # label expected tool tool_input_json
  local out got
  out=$(jq -n --arg t "$3" --argjson ti "$4" '{tool_name:$t, tool_input:$ti}' | "$HOOK")
  if [[ -z "$out" ]]; then
    got=ALLOW
  else
    got=$(jq -r '.hookSpecificOutput.permissionDecision // "allow"' <<<"$out" \
      | tr '[:lower:]' '[:upper:]')
  fi
  if [[ "$got" == "$2" ]]; then
    echo "  ok   $got  $1"
  else
    echo "  FAIL exp=$2 got=$got  $1"
    fails=$((fails + 1))
  fi
}

echo "== the bypass must be surfaced =="
run "push --no-verify"        ASK Bash '{"command":"git push --no-verify"}'
run "push --no-verify origin" ASK Bash '{"command":"git push --no-verify origin main"}'
run "push origin --no-verify" ASK Bash '{"command":"git push origin main --no-verify"}'
run "push -u ... --no-verify" ASK Bash '{"command":"git push -u origin feature/x --no-verify"}'
run "git -C path push bypass" ASK Bash '{"command":"git -C .claude/worktrees/a push --no-verify"}'
run "chained after &&"        ASK Bash '{"command":"git add -A && git commit -m x && git push --no-verify"}'

echo "== ordinary pushes and reads must stay clear =="
run "plain push"           ALLOW Bash '{"command":"git push"}'
run "push -u origin"       ALLOW Bash '{"command":"git push -u origin feature/x"}'
run "commit --no-verify"   ALLOW Bash '{"command":"git commit --no-verify -m x"}'
# `-n` on a push is --dry-run, which runs no hooks because it pushes nothing.
# Flagging it would prompt on the safest push there is.
run "push -n (dry run)"    ALLOW Bash '{"command":"git push -n origin main"}'
run "push --dry-run"       ALLOW Bash '{"command":"git push --dry-run"}'
# CLAUDE.md contains the literal string "--no-verify"; reading it is not a push.
run "grep CLAUDE.md"       ALLOW Bash '{"command":"grep -n \"no-verify\" CLAUDE.md"}'
run "cat CLAUDE.md"        ALLOW Bash '{"command":"cat CLAUDE.md"}'
run "grep push --no-verify" ALLOW Bash '{"command":"grep -rn \"git push --no-verify\" specs/"}'
run "pre-commit run"       ALLOW Bash '{"command":"pre-commit run --hook-stage pre-push --all-files"}'
run "npm test"             ALLOW Bash '{"command":"npm test"}'
run "non-Bash tool"        ALLOW Edit '{"file_path":"/x/src/app/a.ts"}'

echo "== not exempt for subagents: the bypass is no better from one =="
out=$(jq -n '{tool_name:"Bash",agent_id:"abc",tool_input:{command:"git push --no-verify"}}' | "$HOOK")
got=$(jq -r '.hookSpecificOutput.permissionDecision // "allow"' <<<"$out" 2>/dev/null || echo allow)
if [[ "$got" == "ask" ]]; then echo "  ok   ASK  subagent push --no-verify"; else echo "  FAIL subagent bypass was allowed"; fails=$((fails+1)); fi

echo
if [[ $fails -eq 0 ]]; then echo "all checks passed"; else echo "$fails FAILED"; fi
exit $((fails > 0))
