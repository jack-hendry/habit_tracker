// Screenshot a route and composite it beside its design mockup for visual comparison.
//
//   node scripts/design-shot.mjs dashboard
//   node scripts/design-shot.mjs habits --width 390
//   node scripts/design-shot.mjs dashboard --route /habits --viewport-only
//
// Reads design/target/<name>.png (optional) and writes:
//   design/actual/<name>.png   — what the app currently renders
//   design/compare/<name>.png  — target | actual, side by side (only if a target exists)

import { chromium } from 'playwright';
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
};

// Each column in the composite is capped at this width. Keeps the output legible
// for spacing/colour judgements without producing a needlessly large image.
const COLUMN_WIDTH = 520;

function parseArgs(argv) {
  const [name, ...rest] = argv;
  if (!name || name.startsWith('--')) {
    throw new Error(
      'Usage: node scripts/design-shot.mjs <name> [--route /path] [--width 1440] [--height 900] [--viewport-only]',
    );
  }

  const args = { name, width: 1440, height: 900, fullPage: true, route: ROUTES[name] };
  for (let i = 0; i < rest.length; i++) {
    const flag = rest[i];
    if (flag === '--viewport-only') args.fullPage = false;
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
  const page = await browser.newPage({ viewport: { width: COLUMN_WIDTH * 2 + 48, height: 600 } });
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
    const page = await browser.newPage({ viewport: { width: args.width, height: args.height } });
    await page.goto(`${BASE_URL}${args.route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300); // let Angular animations settle
    await page.screenshot({ path: actualPath, fullPage: args.fullPage });

    const dims = `${args.width}x${args.height}${args.fullPage ? ', full page' : ''}`;
    console.log(`actual:  design/actual/${args.name}.png  (${dims})`);

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
