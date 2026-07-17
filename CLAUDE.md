# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working agreement

- Never commit anything (`git commit`, `git push`, etc.) without the user's explicit permission for that specific commit.
- Read the relevant existing code before making changes — don't edit blind.
- If an implementation attempt fails twice, stop and explain the problem instead of continuing to retry.

## Project state

This is a standalone Angular 17.3 application scaffolded via `ng new` (Angular CLI 17.3.11). It currently contains only the generated boilerplate (`AppComponent`, empty `routes`) — no habit-tracking features, services, or data models have been built yet. There is a single Angular project named `habit_tracker` in `angular.json`.

## Commands

- `npm start` / `ng serve` — run the dev server at `http://localhost:4200/`, auto-reloads on change.
- `npm run build` / `ng build` — production build, output to `dist/habit_tracker`.
- `npm run watch` / `ng build --watch --configuration development` — incremental dev build.
- `npm test` / `ng test` — run unit tests via Karma + Jasmine.
  - To run a single spec file, use Karma's `--include` or narrow via `fit`/`fdescribe` in the spec, since there is no built-in Angular CLI flag for a single-file run.
- There is no e2e test runner configured (`ng e2e` requires adding a package first).
- There is no lint script configured in `package.json` / `angular.json`.

## Architecture notes

- Uses Angular's standalone component API (no `NgModule`s) — bootstrapped via `ApplicationConfig` in `src/app/app.config.ts` and `bootstrapApplication` in `src/main.ts`.
- Routing is configured through `provideRouter(routes)` in `app.config.ts`, with routes defined in `src/app/app.routes.ts` (currently empty).
- Component styles use SCSS (`inlineStyleLanguage: scss`, default component schematic style is `scss`).
- New components generated via `ng generate component <name>` will follow the standalone pattern by default (Angular 17 CLI default).
