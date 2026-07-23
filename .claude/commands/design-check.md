---
description: Screenshot a route, compare it to its design mockup, and close the gaps
argument-hint: <name> [--width 1440] [--viewport-only]
allowed-tools: Bash(npm start:*), Bash(node scripts/design-shot.mjs:*), Bash(curl -s http://localhost:4200*), Read, Edit, Glob
---

Compare the rendered app against a design mockup and iterate until it's close enough.

Target: `$ARGUMENTS`

## Loop

1. **Check the dev server.** `curl -s -o /dev/null -w '%{http_code}' http://localhost:4200`. If it isn't answering, start it in the background with `npm start` and wait for it to respond before continuing.

2. **Match the viewport to the mockup.** Read `design/target/<name>.png` and note its pixel width. Pass that width via `--width` so the comparison isn't polluted by breakpoint differences — this is the step that matters most for accuracy. If no target image exists, say so and stop; there's nothing to compare against.

3. **Shoot.** `node scripts/design-shot.mjs <name> --width <mockup-width>`

4. **Compare.** `Read` the `design/compare/<name>.png` it prints — one image with target on the left, actual on the right. Read only the composite, not the two source images; that keeps each round to a single image.

5. **List the deltas** before changing anything. Be concrete and ordered by visual weight: layout/structure first, then spacing, then type scale and weight, then colour, then detail. Skip anything that is already close enough — the goal is approximate, not pixel-exact.

6. **Fix the top few deltas** in the component's `.scss` / template. Prefer existing variables and utility classes over new one-off values.

7. **Re-shoot and re-compare.** Stop when the remaining differences are cosmetic, or after 3 rounds — if it hasn't converged by then, report what's still off and why rather than continuing to iterate.

## Notes

- Only what's visible in a static screenshot gets checked. Hover, focus, empty, and error states need their own mockups and their own runs.
- `design/actual/` and `design/compare/` are generated and gitignored. Only `design/target/` is committed.
- Don't edit files under `specs/` during this loop.
