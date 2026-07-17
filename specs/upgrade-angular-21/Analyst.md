# Analyst: Upgrade project to Angular 21

## Size classification: Large

Reasoning: this is a 4-major-version jump (17 → 18 → 19 → 20 → 21). Each
major version ships its own breaking changes and `ng update` migration
schematics, so this isn't a single edit — it's a sequence of upgrade steps
that each need to be applied and verified independently. It touches more
than one layer: the CLI/build tooling (`@angular/cli`, `@angular-devkit/build-angular`),
the framework core and its APIs (`@angular/core`, `common`, `forms`,
`platform-browser`, `router`), TypeScript version compatibility, and the
test toolchain (Karma/Jasmine versions pinned in `package.json`). That
matches the "Large" bar in `CLAUDE.md` (touches more than one layer), so it
gets a full spec + 2 harden rounds + a post-coding review.

---

## 1. What problem are we solving?

The project is scaffolded on Angular 17.3 (CLI 17.3.11, TypeScript ~5.4.2)
and has received no framework updates since `ng new`. Staying 4 major
versions behind means missing framework improvements (continued
signals/control-flow maturation, build performance work, zoneless support
groundwork, etc.) and makes every future upgrade progressively larger and
riskier the longer it's deferred. We want the project running on Angular 21
on a supported, current toolchain so future feature work builds on a
current foundation instead of accumulating more upgrade debt.

## 2. What is in scope?

- Upgrading all `@angular/*` packages (`animations`, `common`, `compiler`,
  `core`, `forms`, `platform-browser`, `platform-browser-dynamic`,
  `router`), `@angular/cli`, `@angular-devkit/build-angular`, and
  `@angular/compiler-cli` from 17.3 to 21, applied **one major version at a
  time** via `ng update @angular/core @angular/cli` (17→18→19→20→21),
  running each step's automated migration schematics as offered.
- Upgrading directly-coupled dependencies that Angular's own migration
  schematics touch or that are required for compatibility: `zone.js`,
  `rxjs` (only if a migration/compatibility requirement forces it),
  `typescript`, and the Karma/Jasmine test toolchain versions currently
  pinned in `package.json`, to whatever versions the Angular 21 CLI
  scaffold expects.
- Verifying Node.js version compatibility with Angular 21's supported Node
  range (current local Node is v24.16.0) and noting/adjusting if the
  supported range requires action.
- Confirming the app still builds (`ng build`), serves (`ng serve`), and
  the existing generated unit test (`ng test` — the default `AppComponent`
  spec) still passes after each major-version hop and at the final
  version.
- Applying any code-level migrations the schematics generate automatically
  (e.g. control-flow syntax, standalone bootstrap adjustments,
  `TestBed` config changes) since this repo has almost no custom code, so
  the blast radius of these auto-migrations is small.
- Updating `CLAUDE.md`'s "Project state" and "Commands" sections if the
  upgrade changes any documented version numbers, commands, or defaults
  (e.g. new build system default, new schematic defaults).

## 3. What is OUT of scope?

- **Any new habit-tracking features, components, services, or data
  models.** This is purely a dependency/tooling upgrade; no product code
  is being added.
- **Opting into new architectural patterns beyond what the migration
  schematics apply automatically** — e.g. we are not manually converting
  to zoneless change detection, not manually rewriting to use signals for
  state that doesn't exist yet, not adopting new APIs "while we're in
  here." If a schematic auto-applies something (like control-flow syntax
  updates), that's in scope; discretionary adoption of new patterns is
  not.
- **Editor/IDE tooling, CI pipeline changes, or deployment config** — none
  exist in this repo today and none will be added as part of this upgrade.
- **Adding e2e testing** — still not configured per `CLAUDE.md`; not being
  added here even though newer Angular versions changed e2e schematic
  defaults.
- **Adding a lint config** — still not configured; not being added here.
- **Upgrading unrelated tooling** not pulled in by the Angular migration
  path itself (e.g. no unrelated `package.json` devDependency bumps "for
  freshness").
- **Fixing or working around any pre-existing issues unrelated to the
  upgrade** — if something is broken before we start that the upgrade
  doesn't touch, it's not this task's job to fix it.
- **Skipping intermediate major versions.** We will not attempt to jump
  17 → 21 directly in one `ng update` call, even if it appears to work,
  because that bypasses each version's migration schematics.

## 4. How do we know it is done?

- `cat package.json` shows `@angular/core`, `@angular/cli`, and all other
  `@angular/*` packages at `^21.x` (or the exact latest 21.x at time of
  upgrade), with no leftover 17/18/19/20 version pins.
- `npx ng version` reports Angular CLI and Angular 21.x with no version
  mismatches between CLI and framework packages.
- `npm install` completes with no unresolved peer-dependency errors
  related to Angular packages.
- `npm run build` (`ng build`) completes successfully and produces output
  in `dist/habit_tracker` with no new errors introduced by the upgrade.
- `npm start` (`ng serve`) boots the dev server at `http://localhost:4200/`
  and the default app shell renders in the browser with no console errors.
- `npm test` (`ng test`) runs the existing Karma/Jasmine suite and the
  default generated `AppComponent` spec(s) pass.
- The execution record in `tasks.md` shows each major version hop
  (17→18, 18→19, 19→20, 20→21) was applied and verified as a distinct
  `ng update` step rather than one combined jump — checkable by walking
  through the completed task steps and diffs reviewed at each hop,
  independent of whether intermediate commits exist.
- A clean install (`npm ci`) succeeds against the final `package.json` /
  `package-lock.json`, confirming the lockfile isn't drifted after four
  rounds of schematic-driven edits.
- `CLAUDE.md`'s stated Angular/CLI/TypeScript version numbers match what's
  actually in `package.json` after the upgrade.

---

## Retrospective

**Did Analyst.md catch anything not thought about up front?**

Yes, one critical point: Analyst.md did not initially anticipate that
`ng update` would refuse to run with uncommitted changes. The spec said
(correctly) that we wouldn't force commits, but it didn't explicitly
surface this as a stopping point that would require user consent between
each hop. The CriticReview caught this and the final implementation
required committing at each hop boundary to proceed to the next update.

**Did anything in tasks.md turn out to be wrong during coding?**

No. The task sequence worked exactly as planned. Each hop (17→18, 18→19,
19→20, 20→21) was distinct, verifiable, and reversible. The stop
condition (fail twice, then stop) was unnecessary — every hop succeeded
on first attempt. One minor observation: the schematic-driven changes
between versions varied:
- 17→18: dependency bumps only, no code changes
- 18→19: dependency bumps + app.component.ts (removed `standalone: true`)
- 19→20: dependency bumps + angular.json (schematic defaults) +
  tsconfig.json (moduleResolution: bundler)
- 20→21: dependency bumps + main.ts (added provideZoneChangeDetection) +
  tsconfig.json (lib defaults)

The fact that changes varied by hop reinforced why the sequential
approach was necessary — skipping intermediate versions would have
bypassed each version's specific migrations.
