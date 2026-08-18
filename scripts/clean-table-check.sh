#!/usr/bin/env bash
# Enforces the "clean table" ritual from CLAUDE.md's archive ritual:
#   1. Archive gate  — a push that adds files under specs/archive/ must also
#      touch specs/STATE.md in the same push (the lessons/decisions it produced).
#   2. Summary gate  — every file newly added under specs/archive/ must be
#      small. Oversized files mean the spec was archived with its drafts and
#      back-and-forth still in it instead of being summarized first.
#
# This script CHECKS. It never edits files or commits on your behalf — on
# failure it prints the exact fix and exits non-zero so the push is refused.
#
# Usage: run via the pre-push git hook (wired through pre-commit, see
# .pre-commit-config.yaml). To test without pushing for real, set
# RANGE_OVERRIDE to any <rev>..<rev> range:
#
#   RANGE_OVERRIDE=main..feature-branch scripts/clean-table-check.sh
set -euo pipefail

SIZE_LIMIT_BYTES=20480 # 20 KB

# --- Determine the diff range -----------------------------------------
if [[ -n "${RANGE_OVERRIDE:-}" ]]; then
  RANGE="$RANGE_OVERRIDE"
else
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if git rev-parse --verify --quiet "origin/${BRANCH}" >/dev/null; then
    RANGE="origin/${BRANCH}..HEAD"
  else
    # No upstream yet (first push of a new branch) — diff against the empty
    # tree so every committed file reads as newly added.
    EMPTY_TREE="$(git hash-object -t tree /dev/null)"
    RANGE="${EMPTY_TREE}..HEAD"
  fi
fi

echo "clean-table-check: checking range ${RANGE}"

DIFF_OUTPUT="$(git diff --name-status -M "$RANGE" -- || true)"

if [[ -z "$DIFF_OUTPUT" ]]; then
  echo "clean-table-check: no changes in range, nothing to check"
  exit 0
fi

# --- Walk the diff: collect newly-added archive files, note STATE.md ---
NEW_ARCHIVE_FILES=()
STATE_CHANGED=0

while IFS=$'\t' read -r status path1 path2; do
  [[ -z "$status" ]] && continue

  case "$status" in
    A*)
      path="$path1"
      is_new=1
      ;;
    R*|C*)
      # rename/copy: path2 is the new location, which is what "adds a file
      # under specs/archive/" means for a moved spec folder.
      path="$path2"
      is_new=1
      ;;
    *)
      path="$path1"
      is_new=0
      ;;
  esac

  if [[ "$path" == "specs/STATE.md" ]]; then
    STATE_CHANGED=1
  fi

  if [[ "$is_new" -eq 1 && "$path" == specs/archive/* && "$(basename "$path")" != ".gitkeep" ]]; then
    NEW_ARCHIVE_FILES+=("$path")
  fi
done <<<"$DIFF_OUTPUT"

if [[ "${#NEW_ARCHIVE_FILES[@]}" -eq 0 ]]; then
  echo "clean-table-check: no new archive files in this push, nothing to check"
  exit 0
fi

# --- Gate 1: archive gate ----------------------------------------------
if [[ "$STATE_CHANGED" -eq 0 ]]; then
  echo "You archived a spec but did not update STATE.md. Add the lessons and decisions, then push again." >&2
  exit 1
fi

# --- Gate 2: summary gate -----------------------------------------------
OVERSIZED=()
for path in "${NEW_ARCHIVE_FILES[@]}"; do
  size="$(git cat-file -s "HEAD:${path}" 2>/dev/null || echo 0)"
  if [[ "$size" -gt "$SIZE_LIMIT_BYTES" ]]; then
    OVERSIZED+=("${path} (${size} bytes)")
  fi
done

if [[ "${#OVERSIZED[@]}" -gt 0 ]]; then
  echo "Summarize this spec before archiving. These files are over ${SIZE_LIMIT_BYTES} bytes:" >&2
  for f in "${OVERSIZED[@]}"; do
    echo "  - ${f}" >&2
  done
  exit 1
fi

echo "clean-table-check: ok"
exit 0
