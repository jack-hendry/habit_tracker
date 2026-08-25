# CI gate demo (throwaway)

Not a real feature. This folder exists to prove the clean-table gate blocks an
archived spec whose lessons were never written down — first locally at pre-push,
then again in CI when the local hook is skipped with `git push --no-verify`.

**Problem:** a spec gets archived and its decisions are never recorded, so weeks
later nobody remembers why the code is the way it is. Silent memory loss.

**In scope:** one commit that adds a file under `specs/archive/` and does not
touch `specs/STATE.md`.

**Out of scope:** any change to `src/`.

**Done when:** `clean-table-gate` fails on the pull request with
"You archived a spec but did not update STATE.md."

This branch is deleted once the demo is done.
