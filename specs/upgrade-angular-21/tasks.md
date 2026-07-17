# Tasks: Upgrade project to Angular 21

Reference: `specs/upgrade-angular-21/Analyst.md`. Each major-version hop is
its own step so a failure at any point is easy to isolate and the working
tree can be checked in a known-good state before moving to the next hop.

**Stop condition:** per `CLAUDE.md`'s working agreement, if any hop's
verification step fails twice in a row, stop and explain the problem
instead of continuing to the next hop or retrying further.

## 0. Baseline check

1. Confirm working tree is clean before starting.
   - Verify: `git status` shows no uncommitted changes (stash/commit
     anything present before proceeding).
2. Record current versions as the starting baseline.
   - Verify: `npx ng version` output and `cat package.json` match what's
     documented in `Analyst.md` (Angular 17.3.x, CLI 17.3.11, TS ~5.4.2).
3. Confirm the app builds, serves, and tests pass *before* any upgrade
   work, so any later failure is known to be upgrade-caused.
   - Verify: `npm run build` succeeds; `npm test -- --watch=false` passes;
     `npm start` boots and the app shell loads at
     `http://localhost:4200/` with no console errors (then stop the dev
     server).
4. Check Node.js compatibility for the target range (Angular 21's
   supported Node versions) against the local Node (`node -v` →
   confirmed v24.16.0 in this environment).
   - Verify: compare `node -v` output against the Node version range
     Angular 21's `ng update` / release notes require; note any gap here
     (expected: compatible, since v24 is current).

## 1. Angular 17 → 18

5. Run the official CLI update check for the 17→18 hop.
   - Verify: `npx ng update` lists `@angular/core` and `@angular/cli` as
     updatable to 18.x.
6. Apply the update: `npx ng update @angular/core@18 @angular/cli@18`,
   accepting the offered migration schematics.
   - Verify: command exits 0, `package.json` now shows `@angular/*` and
     `@angular/cli` at `^18.x`.
7. Rebuild, retest, re-serve after the hop.
   - Verify: `npm install` has no unresolved peer-dep errors; `npm run
     build` succeeds; `npm test -- --watch=false` passes; `npm start`
     boots and renders with no new console errors.
8. Review what the migration schematics changed.
   - Verify: `git diff` shows only expected schematic-driven changes
     (e.g. config/template syntax updates) — nothing unrelated.

## 2. Angular 18 → 19

9. Run the update check for the 18→19 hop.
   - Verify: `npx ng update` lists `@angular/core`/`@angular/cli` as
     updatable to 19.x.
10. Apply: `npx ng update @angular/core@19 @angular/cli@19`, accepting
    offered schematics.
    - Verify: command exits 0; `package.json` shows `^19.x`.
11. Rebuild, retest, re-serve after the hop.
    - Verify: same three checks as step 7 (`npm install`, `npm run
      build`, `npm test -- --watch=false`, `npm start`).
12. Review the diff for this hop.
    - Verify: `git diff` shows only expected schematic-driven changes.

## 3. Angular 19 → 20

13. Run the update check for the 19→20 hop.
    - Verify: `npx ng update` lists `@angular/core`/`@angular/cli` as
      updatable to 20.x.
14. Apply: `npx ng update @angular/core@20 @angular/cli@20`, accepting
    offered schematics.
    - Verify: command exits 0; `package.json` shows `^20.x`.
15. Rebuild, retest, re-serve after the hop.
    - Verify: same three checks as step 7.
16. Review the diff for this hop.
    - Verify: `git diff` shows only expected schematic-driven changes.

## 4. Angular 20 → 21

17. Run the update check for the 20→21 hop.
    - Verify: `npx ng update` lists `@angular/core`/`@angular/cli` as
      updatable to 21.x.
18. Apply: `npx ng update @angular/core@21 @angular/cli@21`, accepting
    offered schematics.
    - Verify: command exits 0; `package.json` shows `^21.x`.
19. Rebuild, retest, re-serve after the hop.
    - Verify: same three checks as step 7.
20. Review the diff for this hop.
    - Verify: `git diff` shows only expected schematic-driven changes.

## 5. Final verification and cleanup

21. Confirm every `@angular/*` package, `@angular/cli`, and
    `@angular-devkit/build-angular` are on 21.x with no stray old
    version pins, and check whether `zone.js`, `rxjs`, TypeScript, or
    Karma/Jasmine versions were bumped by the schematics to versions
    required for Angular 21 compatibility.
    - Verify: `cat package.json` shows consistent `^21.x` across all
      `@angular/*` entries; `npx ng version` shows no CLI/framework
      version mismatch.
22. Full final check of build, serve, and test.
    - Verify: `npm run build` succeeds and outputs to
      `dist/habit_tracker`; `npm start` boots and the app shell renders
      with no console errors; `npm test -- --watch=false` passes.
22a. Clean-install check to catch lockfile drift after four rounds of
     schematic-driven edits.
     - Verify: `rm -rf node_modules && npm ci` completes with no errors
       against the final `package.json` / `package-lock.json`.
23. Update `CLAUDE.md`'s "Project state" and "Commands" sections if
    version numbers, defaults, or commands changed as a result of the
    upgrade (e.g. CLI/TS versions cited, any new default behavior worth
    documenting).
    - Verify: version numbers and commands quoted in `CLAUDE.md` match
      `package.json` / actual CLI behavior post-upgrade.
24. Fill in the Retrospective section of `Analyst.md`.
    - Verify: both retrospective questions are answered based on what
      actually happened during steps 1–23.
