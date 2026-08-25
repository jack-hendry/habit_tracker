#!/usr/bin/env bash
# Enforces the "clean table" ritual from CLAUDE.md's archive ritual:
#   1. Archive gate  — a push that adds files under specs/archive/ must also
#      touch specs/STATE.md in the same push (the lessons/decisions it produced).
#   2. Summary gate  — every file newly added under specs/archive/ must be
#      small. Oversized files mean the spec was archived with its drafts and
#      back-and-forth still in it instead of being summarized first.
#   3. Lessons gate  — every L-NNN headline in specs/STATE.md has a body in
#      specs/LESSONS.md, and vice versa. The headline is the lesson and lives
#      where it will be read; the body is its provenance. Splitting them is
#      what keeps STATE.md inside its size budget, so the two must not drift.
#      Unlike gates 1-2 this runs on EVERY push, not only archive pushes —
#      a lesson can drift in any commit.
#
# This script CHECKS. It never edits files or commits on your behalf — on
# failure it prints the exact fix and exits non-zero so the push is refused.
#
# Runs in two places, and they must agree — a local pre-push hook can be
# skipped with `git push --no-verify`, CI cannot. See .github/workflows/ci.yml.
#
# Usage: run via the pre-push git hook (wired through pre-commit, see
# .pre-commit-config.yaml). To test without pushing for real, set
# RANGE_OVERRIDE to any <rev>..<rev> range:
#
#   RANGE_OVERRIDE=main..feature-branch scripts/clean-table-check.sh
set -euo pipefail

SIZE_LIMIT_BYTES=20480 # 20 KB

# --- Determine the diff range -----------------------------------------
ZERO_SHA="0000000000000000000000000000000000000000"

if [[ -n "${RANGE_OVERRIDE:-}" ]]; then
  RANGE="$RANGE_OVERRIDE"
elif [[ -n "${GITHUB_BASE_REF:-}" ]]; then
  # GitHub Actions, pull_request event. HEAD is detached here (actions/checkout
  # gives you the PR's merge commit), so the local-branch logic below would see
  # a branch literally named "HEAD", find no origin/HEAD, and fall through to
  # the empty-tree case — flagging every file in the repo as newly added. Fetch
  # the base branch explicitly (checkout only fetches the PR ref) and diff from
  # the merge base, which is correct for either checkout shape.
  git fetch --no-tags --quiet origin "$GITHUB_BASE_REF"
  if ! MERGE_BASE="$(git merge-base FETCH_HEAD HEAD)"; then
    echo "clean-table-check: no merge base with origin/${GITHUB_BASE_REF}" >&2
    exit 1
  fi
  RANGE="${MERGE_BASE}..HEAD"
elif [[ "${GITHUB_EVENT_NAME:-}" == "push" ]]; then
  # GitHub Actions, push event. BEFORE_SHA is github.event.before, passed in
  # from the workflow. It is all-zeros when the branch was just created, and
  # names a discarded commit after a force push — in both cases fall back to
  # the empty tree, the same conservative choice the local no-upstream path
  # makes below.
  BEFORE="${BEFORE_SHA:-}"
  if [[ -n "$BEFORE" && "$BEFORE" != "$ZERO_SHA" ]] \
    && git rev-parse --verify --quiet "${BEFORE}^{commit}" >/dev/null; then
    RANGE="${BEFORE}..HEAD"
  else
    EMPTY_TREE="$(git hash-object -t tree /dev/null)"
    RANGE="${EMPTY_TREE}..HEAD"
  fi
else
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
  if git rev-parse --verify --quiet "origin/${BRANCH}" >/dev/null; then
    RANGE="origin/${BRANCH}..HEAD"
  else
    # No upstream yet — the first push of a new branch. Diffing against the
    # empty tree here reads EVERY tracked file as newly added, specs/STATE.md
    # included, which satisfies the archive gate no matter what the branch
    # actually did and lets exactly the bad push this script exists to stop
    # sail through. Use the merge base with the default branch instead: what
    # the branch adds on top of main is what is being pushed.
    DEFAULT_REF="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD || echo origin/main)"
    if MERGE_BASE="$(git merge-base "$DEFAULT_REF" HEAD 2>/dev/null)"; then
      RANGE="${MERGE_BASE}..HEAD"
    else
      # Genuinely unrelated history (no default branch, or nothing in common)
      # — the empty tree is the only honest answer left.
      EMPTY_TREE="$(git hash-object -t tree /dev/null)"
      RANGE="${EMPTY_TREE}..HEAD"
    fi
  fi
fi

echo "clean-table-check: checking range ${RANGE}"

# --- Gate 3: lessons correspondence -------------------------------------
# Checked against the pushed tree (HEAD), not the working tree. No-op until
# specs/LESSONS.md exists, so this is safe on branches predating the split.
if git cat-file -e "HEAD:specs/LESSONS.md" 2>/dev/null; then
  LESSON_TMP="$(mktemp -d)"
  trap 'rm -rf "$LESSON_TMP"' EXIT

  git show HEAD:specs/STATE.md 2>/dev/null \
    | sed -n 's/^- \*\*\(L-[0-9]\{3\}\)\*\*.*/\1/p' | sort -u >"$LESSON_TMP/headlines"
  git show HEAD:specs/LESSONS.md 2>/dev/null \
    | sed -n 's/^\*\*\(L-[0-9]\{3\}\) .*/\1/p' | sort -u >"$LESSON_TMP/bodies"

  MISSING_BODY="$(grep -vxF -f "$LESSON_TMP/bodies" "$LESSON_TMP/headlines" || true)"
  MISSING_HEADLINE="$(grep -vxF -f "$LESSON_TMP/headlines" "$LESSON_TMP/bodies" || true)"

  if [[ -n "$MISSING_BODY" || -n "$MISSING_HEADLINE" ]]; then
    echo "Lessons are out of sync between specs/STATE.md and specs/LESSONS.md." >&2
    if [[ -n "$MISSING_BODY" ]]; then
      echo "  Headline in STATE.md with no body in LESSONS.md:" >&2
      echo "$MISSING_BODY" | sed 's/^/    - /' >&2
      echo "  Write the body (provenance: which spec, what broke, why)." >&2
    fi
    if [[ -n "$MISSING_HEADLINE" ]]; then
      echo "  Body in LESSONS.md with no headline in STATE.md:" >&2
      echo "$MISSING_HEADLINE" | sed 's/^/    - /' >&2
      echo "  Add '- **L-NNN** — <the lesson in one line>' to STATE.md." >&2
    fi
    exit 1
  fi
  echo "clean-table-check: lessons in sync ($(wc -l <"$LESSON_TMP/headlines" | tr -d ' ') entries)"
fi

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
