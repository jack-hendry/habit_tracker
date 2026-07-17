# Critic Review: Upgrade project to Angular 21

Large tasks get 2 harden rounds before implementation starts (per
`CLAUDE.md` sizing rule). Both rounds below were run against
`Analyst.md` + `tasks.md` before any code changes were made.

## Round 1

1. **Inconsistent acceptance criterion (Analyst.md, "done" list).** The
   criterion "git log / the upgrade history shows each major version hop
   was applied as a distinct step" assumes commits exist, but
   `CLAUDE.md`'s working agreement forbids committing without explicit
   permission, and this spec doesn't request permission to commit at each
   hop. As written, the criterion may be unverifiable through git alone.
   → **Fix:** reworded the criterion to be checkable regardless of commit
   strategy (verifiable via the `tasks.md` execution record / diffs
   reviewed at each hop, not dependent on git history existing).
2. **Typo in tasks.md** ("Rebuild, retest, reserve after the hop" appears
   in steps 7/11/15/19) — "reserve" should read "re-serve" (i.e., start
   `ng serve` again to check the dev server). Cosmetic but could confuse
   whoever executes the tasks. → **Fix:** corrected wording.
3. **No explicit stop condition when a hop's verification fails.** Tasks
   0-4 through 20 assume each hop succeeds. `CLAUDE.md` already states
   "if an implementation attempt fails twice, stop and explain the
   problem," which covers this, but the spec didn't make this hop-level
   application explicit. → **Fix:** added a note at the top of `tasks.md`
   pointing at this rule so it's not missed mid-sequence.
4. **No clean-install check at the end.** Task 22 checks build/serve/test
   but never verifies `package-lock.json` is consistent with
   `package.json` after 4 rounds of schematic-driven edits — a stale or
   drifted lockfile could pass local `npm install` (which patches
   in-place) but fail for a fresh clone. → **Fix:** added an `npm ci`
   check to the final verification step.

## Round 2

Re-reviewed `Analyst.md` and `tasks.md` after applying Round 1 fixes.

1. **Scope question: what happens to `package-lock.json` between hops?**
   Not addressed — but this is implementation detail (the lockfile
   naturally updates via `npm install` during each `ng update`), not a
   scope gap. No fix needed.
2. **Are the four target intermediate versions (18, 19, 20) guaranteed to
   exist as real released majors between 17 and 21?** This can't be
   verified until implementation runs `npx ng update` and sees what's
   actually available. `tasks.md` steps 5, 9, 13, 17 already start each
   hop with an `ng update` *check* before applying anything, so if the
   real available upgrade path differs (e.g. a version is skipped
   upstream, or naming differs), the check step surfaces that before any
   change is applied. No fix needed — the existing structure already
   guards against this.
3. **Out-of-scope list is aggressive enough** — re-read against the
   sizing rule's "be aggressive here" guidance; no gaps found (zoneless
   migration, lint, e2e, CI, unrelated bumps, pre-existing issues, and
   version-skipping are all explicitly excluded).
4. No further findings. Spec is ready for implementation.

## Outcome

Both harden rounds complete. Round 1 findings were fixed directly in
`Analyst.md` and `tasks.md`. Round 2 surfaced no new issues requiring
changes. Proceeding to implementation.
