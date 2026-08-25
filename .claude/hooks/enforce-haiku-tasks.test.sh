#!/usr/bin/env bash
# Test matrix for enforce-haiku-tasks-pretooluse.sh.
#
# That hook decides ALLOW/DENY for Bash commands with a REGEX HEURISTIC -- a
# shell command string cannot be parsed to find its write target, so the rule
# is "names a protected path AND looks like a write". Heuristics rot silently:
# a tightened pattern that starts blocking `npx ng test` makes every tasks.md
# run unusable, and a loosened one silently re-opens the gap this hook exists
# to close. Run this after touching the hook.
#
#   ./.claude/hooks/enforce-haiku-tasks.test.sh
#
# Creates a throwaway spec triad and a run marker, exercises the matrix, then
# removes both. The triad is CREATED rather than borrowed from a real spec: the
# hook stays dormant unless the marker names a directory holding all three of
# Analyst.md/tasks.md/CriticReview.md, so pointing this at a live spec means the
# whole matrix silently inverts to ALLOW the day that spec is archived. Not
# hypothetical -- it happened to calendar-redesign, and all 8 DENY cases
# reported ALLOW until this was fixed.
set -uo pipefail
cd "$(dirname "$0")/../.."

HOOK=./.claude/hooks/enforce-haiku-tasks-pretooluse.sh
SPEC=__hook-test-spec   # throwaway; created below, removed on exit
fails=0

mkdir -p "specs/$SPEC"
for f in Analyst.md tasks.md CriticReview.md; do
  echo "Fixture for enforce-haiku-tasks.test.sh. Safe to delete." > "specs/$SPEC/$f"
done

# Check if the marker already exists before potentially adding it
existing_marker=$(grep -m1 -E '^## Executing: ' STATE.md 2>/dev/null | sed -E 's/^## Executing: *//; s/ *$//' || true)

if [[ -z "$existing_marker" ]]; then
  printf '\n## Executing: %s\n' "$SPEC" >> STATE.md
  added=1
fi

cleanup() {
  rm -rf "specs/$SPEC"
  if [[ "${added:-0}" == 1 ]]; then
    python3 - "$SPEC" <<'PY'
import sys
s = open('STATE.md').read().replace("\n## Executing: %s\n" % sys.argv[1], "")
open('STATE.md', 'w').write(s)
PY
  fi
}
trap cleanup EXIT

# Guard against the inverted-matrix failure described above: a dormant hook
# turns every DENY case into a passing ALLOW, so the run looks plausible while
# asserting nothing. Prove it is armed before trusting a single result.
armed=$(jq -n --arg c "$PWD" '{tool_name:"Edit",cwd:$c,tool_input:{file_path:"/x/src/app/a.ts"}}' | "$HOOK")
if [[ -z "$armed" ]]; then
  echo "ABORT: hook is dormant (marker or spec triad not picked up) - the matrix would be meaningless"
  exit 1
fi

run() { # label expected tool tool_input_json
  local out got
  out=$(jq -n --arg t "$3" --arg c "$PWD" --argjson ti "$4" \
    '{tool_name:$t, cwd:$c, tool_input:$ti}' | "$HOOK")
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

echo "== writes that must be BLOCKED =="
# The one that actually got through before 2026-08-19: a heredoc naming the
# target inside the script body, where no redirect operator precedes the path.
run "python3 heredoc rewriting src/styles.scss" DENY Bash '{"command":"python3 - <<'\''PY'\''\np=\"src/styles.scss\"\nopen(p,\"w\").write(\"x\")\nPY"}'
run "cat > src file, heredoc body"  DENY Bash '{"command":"cat > src/app/foo.ts <<EOF\nx\nEOF"}'
run "cat <<-EOF into src file"      DENY Bash '{"command":"cat <<-EOF > src/app/a.ts\nx\nEOF"}'
run "sed -i on a component"         DENY Bash '{"command":"sed -i '\'''\'' s/a/b/ src/app/calendar/calendar.component.scss"}'
run "rm a source file"              DENY Bash '{"command":"rm src/app/calendar/calendar.component.spec.ts"}'
run "node -e writeFileSync"         DENY Bash '{"command":"node -e \"require('\''fs'\'').writeFileSync('\''scripts/x.mjs'\'','\''y'\'')\""}'
run "plain redirect into src"       DENY Bash '{"command":"cat /tmp/x > src/styles.scss"}'

echo "== reads and normal tasks-run traffic that must stay ALLOWED =="
# `<<<` contains a `<<` pair; without the leading [^<] guard every herestring
# is a false positive and ordinary greps start getting blocked.
run "herestring read"      ALLOW Bash '{"command":"grep -q \"src/app/x.ts\" <<< \"$var\""}'
run "grep a component"     ALLOW Bash '{"command":"grep -nE \"#[0-9a-fA-F]{3,6}\" src/app/calendar/calendar.component.scss"}'
run "cat a component"      ALLOW Bash '{"command":"cat src/app/calendar/calendar.component.ts"}'
run "sed -n (read, not -i)" ALLOW Bash '{"command":"sed -n \"1,40p\" src/app/calendar/calendar.component.ts"}'
# `2>&1` must not read as a redirect-to-file.
run "ng test with 2>&1"    ASK Bash '{"command":"npx ng test --watch=false --browsers=ChromeHeadless 2>&1 | tail -3"}'
run "ng build"             ASK Bash '{"command":"npx ng build"}'
run "design:shot"          ASK Bash '{"command":"npm run design:shot -- calendar --width 1440 --seed"}'
run "node scripts/design-shot" ASK Bash '{"command":"node scripts/design-shot.mjs calendar --seed"}'
run "npm test"              ASK Bash '{"command":"npm test"}'
run "npm run build"         ASK Bash '{"command":"npm run build"}'
run "cd /Users/x && npm test" ASK Bash '{"command":"cd /Users/x && npm test"}'
run "design:shot dashboard" ASK Bash '{"command":"npm run design:shot -- dashboard --seed"}'
run "npm test > src/app/out.log" DENY Bash '{"command":"npm test > src/app/out.log"}'
run "read src, write /tmp" ALLOW Bash '{"command":"cat src/styles.scss > /tmp/copy.txt"}'
run "npm start > log"      ALLOW Bash '{"command":"npm start > /tmp/ng.log 2>&1"}'
run "throwaway at repo root" ALLOW Bash '{"command":"rm -f measure-cal.mjs"}'
run "git status"           ALLOW Bash '{"command":"git status --short"}'
run "grep npm test specs"  ALLOW Bash '{"command":"grep -rn \"npm test\" specs/"}'
run "cat design-shot.mjs"  ALLOW Bash '{"command":"cat scripts/design-shot.mjs"}'
run "bare npm start"       ALLOW Bash '{"command":"npm start"}'
run "npm run watch"        ALLOW Bash '{"command":"npm run watch"}'
run "test harness itself"  ALLOW Bash '{"command":"./.claude/hooks/enforce-haiku-tasks.test.sh"}'

echo "== file tools: behaviour predating the Bash coverage =="
run "Edit a source file" DENY  Edit '{"file_path":"/x/src/app/a.ts"}'
run "Edit a .md"         ALLOW Edit '{"file_path":"/x/specs/a/tasks.md"}'
run "Read is exempt"     ALLOW Read '{"file_path":"/x/src/styles.scss"}'

echo "== subagents are never blocked (they ARE the delegation target) =="
out=$(jq -n --arg c "$PWD" '{tool_name:"Bash",agent_id:"abc",cwd:$c,tool_input:{command:"sed -i \"\" s/a/b/ src/styles.scss"}}' | "$HOOK")
if [[ -z "$out" ]]; then echo "  ok   ALLOW  subagent sed -i"; else echo "  FAIL subagent was blocked"; fails=$((fails+1)); fi
out=$(jq -n --arg c "$PWD" '{tool_name:"Bash",agent_id:"abc",cwd:$c,tool_input:{command:"npm test"}}' | "$HOOK")
if [[ -z "$out" ]]; then echo "  ok   ALLOW  subagent npm test"; else echo "  FAIL subagent npm test was blocked"; fails=$((fails+1)); fi

echo
if [[ $fails -eq 0 ]]; then echo "all checks passed"; else echo "$fails FAILED"; fi
exit $((fails > 0))
