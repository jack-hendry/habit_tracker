// Screenshot a route and composite it beside its design mockup for visual comparison.
//
//   node scripts/design-shot.mjs dashboard
//   node scripts/design-shot.mjs habits --width 390
//   node scripts/design-shot.mjs dashboard --route /habits --viewport-only
//   node scripts/design-shot.mjs dashboard --seed    # demo habits, not an empty store
//
// Reads design/target/<name>.png (optional) and writes:
//   design/actual/<name>.png   — what the app currently renders
//   design/compare/<name>.png  — target | actual, side by side (only if a target exists)

import { chromium } from 'playwright';
import { buildDemoHabits, buildDemoStacks, STORAGE_KEY, STACKS_STORAGE_KEY } from './demo-data.mjs';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.DESIGN_BASE_URL ?? 'http://localhost:4200';

// Fallback route lookup so `design-shot.mjs habits` works without --route.
const ROUTES = {
  dashboard: '/',
  habits: '/habits',
  calendar: '/calendar',
  analytics: '/analytics',
  stacks: '/stacks',
  'habit-detail': '/habits/demo-read',
};

// Each column in the composite is capped at this width. Keeps the output legible
// for spacing/colour judgements without producing a needlessly large image.
const COLUMN_WIDTH = 520;

// Data-dependent states each route can render, as CSS class names.
//
// A screenshot only exercises the states its seed data happens to produce, and
// says NOTHING about the rest -- but it looks equally correct either way, so
// the gap is invisible. Concretely: `design:shot calendar --seed` opens the
// first demo habit (daily) on the current month, which has no missed and no
// off-schedule days, so `status-missed` and `status-not-due` never render.
// Two of five status colours were verified by nothing at all, and the
// composite could not have told you (calendar-redesign CriticReview R1-R3).
//
// This is NOT the caveat CLAUDE.md already carries about hover/focus/empty
// states. Those hide behind interaction. These are in the same static view --
// same page, same shot, different data.
//
// Listing a state here does not assert it must appear; it declares that this
// route can render it, so the run can say out loud which ones it did not
// cover. Deliberately excludes `empty-state`, which is the opposite of a
// seeded run and would warn on every single shot -- a warning that always
// fires is one nobody reads.
//
// Limitation: only class-encoded states are visible here. `<app-day-strip>`
// and `<app-activity-grid>` set their cell colour with `[style.background]`
// via `stripCellColor()` (AD-015), so their three states carry no class and
// this cannot see them. Cover those the way roadmap §3 ended up covering the
// calendar's -- with a design-conformance spec asserting computed styles
// (`src/app/calendar/calendar.design.spec.ts`).
const STATES = {
  calendar: [
    'status-done',
    'status-missed',
    'status-pending',
    'status-not-due',
    'status-future',
    'blank',
    'today',
  ],
  habits: ['checked', 'not-due-today', 'archived', 'paused-badge'],
  dashboard: ['done', 'last-done'],
  analytics: ['heat-0', 'heat-1', 'heat-2', 'heat-3', 'heat-4', 'bar-max', 'bar-rest', 'dow-best', 'dow-rest'],
  'habit-detail': ['cell-blank'],
  stacks: ['stack-item-done', 'stack-item-todo', 'stack-item-not-due', 'stack-streak', 'unstacked-chip'],
};

function parseArgs(argv) {
  const [name, ...rest] = argv;
  if (!name || name.startsWith('--')) {
    throw new Error(
      'Usage: node scripts/design-shot.mjs <name> [--route /path] [--width 1440] [--height 900] [--viewport-only] [--seed]',
    );
  }

  const args = { name, width: 1440, height: 900, fullPage: true, seed: false, route: ROUTES[name] };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (flag === '--viewport-only') args.fullPage = false;
    else if (flag === '--seed') args.seed = true;
    else if (flag === '--route') args.route = rest[++i];
    else if (flag === '--width') args.width = Number(rest[++i]);
    else if (flag === '--height') args.height = Number(rest[++i]);
    else throw new Error(`Unknown flag: ${flag}`);
  }

  if (args.route === undefined) {
    throw new Error(`No route known for "${name}". Pass --route /some/path, or add it to ROUTES in this script.`);
  }
  if (!Number.isFinite(args.width) || !Number.isFinite(args.height)) {
    throw new Error('--width and --height must be numbers');
  }
  return args;
}

async function assertServerUp() {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw new Error(`Dev server not reachable at ${BASE_URL} (${err.message}). Start it with \`npm start\` first.`);
  }
}

function dataUri(path) {
  return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
}

// Composites via a throwaway Playwright page rather than an image library, so the
// only dependency stays playwright itself.
async function composite(browser, targetPath, actualPath, outPath) {
  const page = await browser.newPage({
    viewport: { width: COLUMN_WIDTH * 2 + 48, height: 600 },
    deviceScaleFactor: 2,
  });
  await page.setContent(`
    <style>
      body { margin: 0; padding: 16px; background: #1b1b1b; font: 600 13px system-ui, sans-serif; }
      .row { display: flex; gap: 16px; align-items: flex-start; }
      .col { width: ${COLUMN_WIDTH}px; }
      .label { color: #fff; padding-bottom: 6px; letter-spacing: .08em; }
      img { width: 100%; display: block; border: 1px solid #444; }
    </style>
    <div class="row">
      <div class="col"><div class="label">TARGET</div><img src="${dataUri(targetPath)}"></div>
      <div class="col"><div class="label">ACTUAL</div><img src="${dataUri(actualPath)}"></div>
    </div>
  `);
  await page.locator('.row').screenshot({ path: outPath });
  await page.close();
}

/**
 * Print which of a route's declared states this shot actually rendered.
 *
 * The point is not to fail the run -- an uncovered state is not a defect, it is
 * a silence. Naming the silence is the whole job: "4 of 7" tells you the
 * comparison you are about to read verifies four things and is mute about
 * three, which a clean-looking composite otherwise implies the opposite of.
 */
async function reportStateCoverage(page, name) {
  const declared = STATES[name];
  if (!declared) {
    console.log(`states:  none declared for "${name}" — add it to STATES in this script`);
    return;
  }

  // getElementsByClassName avoids having to escape class names into selectors.
  const counts = await page.evaluate(
    (classes) => Object.fromEntries(classes.map((c) => [c, document.getElementsByClassName(c).length])),
    declared,
  );

  const present = declared.filter((c) => counts[c] > 0);
  const absent = declared.filter((c) => counts[c] === 0);

  console.log(`states:  ${present.length} of ${declared.length} declared — ${present.map((c) => `${c}(${counts[c]})`).join(' ') || 'none'}`);
  if (absent.length) {
    console.log(`         NOT RENDERED: ${absent.join(', ')}`);
    console.log('         ^ this shot verifies nothing about them — cover them elsewhere');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await assertServerUp();

  for (const dir of ['target', 'actual', 'compare']) {
    mkdirSync(resolve(ROOT, 'design', dir), { recursive: true });
  }

  const targetPath = resolve(ROOT, 'design/target', `${args.name}.png`);
  const actualPath = resolve(ROOT, 'design/actual', `${args.name}.png`);
  const comparePath = resolve(ROOT, 'design/compare', `${args.name}.png`);

  const browser = await chromium.launch();
  try {
    // deviceScaleFactor: 2 matches design/target/*.png, which are dpr-2 captures.
    // At the default dpr 1, the composite downscaled both halves and could not
    // resolve sub-2px detail (a 1.5px border, a 9.5px label) — L-035.
    const page = await browser.newPage({
      viewport: { width: args.width, height: args.height },
      deviceScaleFactor: 2,
    });

    // Seeded before the first navigation, so the app's service reads it on
    // construction. An empty store renders the empty state, which compares
    // against nothing.
    if (args.seed) {
      const habits = JSON.stringify(buildDemoHabits(new Date()));
      await page.addInitScript(
        ([key, value]) => window.localStorage.setItem(key, value),
        [STORAGE_KEY, habits],
      );
      console.log(`seeded:  ${JSON.parse(habits).length} demo habits, ~18 weeks of history`);
      const stacks = JSON.stringify(buildDemoStacks());
      await page.addInitScript(
        ([key, value]) => window.localStorage.setItem(key, value),
        [STACKS_STORAGE_KEY, stacks],
      );
      console.log(`seeded:  2 demo stacks`);
    }

    await page.goto(`${BASE_URL}${args.route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300); // let Angular animations settle
    await page.screenshot({ path: actualPath, fullPage: args.fullPage });

    const dims = `${args.width}x${args.height}${args.fullPage ? ', full page' : ''}`;
    console.log(`actual:  design/actual/${args.name}.png  (${dims})`);

    await reportStateCoverage(page, args.name);

    if (existsSync(targetPath)) {
      await composite(browser, targetPath, actualPath, comparePath);
      console.log(`compare: design/compare/${args.name}.png  <-- read this one`);
    } else {
      console.log(`no target at design/target/${args.name}.png — skipped comparison`);
    }
  } finally {
    await browser.close();
  }
}

// Usage and connection problems are expected failure modes here, not bugs —
// print the message rather than a stack trace.
main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
