// Deterministic demo habits for screenshots and manual poking.
//
// Reproduces the seven habits and ~18 weeks of history from the Claude Design
// prototype ("Habit Tracker Prototype.dc.html"), including its seeded LCG, so
// `design/actual/*.png` shows the same *kind* of data as `design/target/*.png`
// instead of an empty store. The seventh habit (demo-journal) is a local addition.
// It is not in the prototype and exists only to ensure the stacks page renders
// all data-dependent states on every day of the week.
//
// Tooling only — this file is never imported by anything under `src/`. The app
// bundle must not carry fixtures.
//
//   node scripts/seed-demo.mjs            # prints a snippet to paste in DevTools
//   npm run design:shot -- dashboard --seed

export const STORAGE_KEY = 'habit_tracker.habits.v1';
export const STACKS_STORAGE_KEY = 'habit_tracker.stacks.v1';

/** Days of history generated, index 0 = oldest, index DAYS-1 = today. */
const DAYS = 126;

// `color` and `icon` are palette *ids* from habit.model.ts, never raw hex or
// emoji — the same contract the app stores (habit-metadata CriticReview R9).
// The hexes in the comments are what those ids resolve to, and they match the
// prototype's per-habit colours exactly.
const DEFS = [
  { key: 'read',     name: 'Read 20 pages',     icon: 'book',     color: 'sky',     category: 'Mind',   schedule: { type: 'daily' },                        p: 0.84 }, // #0ea5e9
  { key: 'run',      name: 'Morning run',       icon: 'run',      color: 'emerald', category: 'Health', schedule: { type: 'weekdays', days: [1, 3, 5] },    p: 0.8 },  // #10b981
  { key: 'meditate', name: 'Meditate 10 min',   icon: 'meditate', color: 'violet',  category: 'Mind',   schedule: { type: 'daily' },                        p: 0.94 }, // #8b5cf6
  { key: 'water',    name: 'Drink 2L water',    icon: 'water',    color: 'teal',    category: 'Health', schedule: { type: 'daily' },                        p: 0.88 }, // #14b8a6
  { key: 'ship',     name: 'Ship side project', icon: 'code',     color: 'orange',  category: 'Work',   schedule: { type: 'weekdays', days: [1, 2, 3, 4, 5] }, p: 0.64 }, // #f97316
  { key: 'sleep',    name: 'Sleep by 11pm',     icon: 'sleep',    color: 'slate',   category: 'Health', schedule: { type: 'daily' },                        p: 0.56 }, // #64748b
  { key: 'journal',  name: 'Weekend journal',   icon: 'heart',    color: 'rose',    category: 'Mind',   schedule: { type: 'weekdays', days: [0, 6] },       p: 0.72 }, // #f43f5e
];

// Which habits are already ticked *today*, so the TODAY card reads "3 of 5
// done" the way the mockup does (on a weekday, when the Mon/Wed/Fri run is the
// one habit not due).
const DONE_TODAY = { meditate: true, water: true, ship: true };

const pad = (n) => String(n).padStart(2, '0');

/**
 * Local calendar date `offset` days from `today`, as `YYYY-MM-DD`. Built from
 * split parts so it never drifts a day in a negative-offset timezone (AD-003).
 */
function isoAt(today, offset) {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function weekdayAt(today, offset) {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset).getDay();
}

function isDue(def, weekday) {
  return def.schedule.type === 'daily' ? true : def.schedule.days.includes(weekday);
}

/**
 * Build the seven demo habits, in the app's own `Habit` shape, ending today.
 * Deterministic: same day in, same history out.
 */
export function buildDemoHabits(today = new Date()) {
  // The prototype's LCG, seed included, so the histories match shot for shot.
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  const T = DAYS - 1; // index of today

  const rows = DEFS.map((def) => {
    const days = [];
    for (let i = 0; i < DAYS; i++) {
      const due = isDue(def, weekdayAt(today, i - T));
      // Completion likelihood drifts slightly upward over the window, so the
      // "last 7 days vs prior month" delta has something to say.
      days.push({ due, done: due && rnd() < Math.min(0.97, def.p + (i / DAYS - 0.5) * 0.16) });
    }
    return { def, days };
  });

  const by = (key) => rows.find((r) => r.def.key === key);

  // The prototype's hand-placed streaks: a long recent run on reading, a very
  // long one on meditation (it owns the "longest active streak" card), and a
  // deliberate three-day slip on sleep so the overdue section has an occupant.
  const read = by('read');
  for (let i = T - 17; i < T; i++) read.days[i].done = read.days[i].due;

  const meditate = by('meditate');
  for (let i = T - 40; i < T; i++) meditate.days[i].done = true;

  const sleep = by('sleep');
  sleep.days[T - 1].done = false;
  sleep.days[T - 2].done = false;
  sleep.days[T - 3].done = true;

  for (const row of rows) {
    row.days[T].done = row.days[T].due && DONE_TODAY[row.def.key] === true;
  }

  const startDate = isoAt(today, -T);
  const [y, m, d] = startDate.split('-').map(Number);

  return rows.map(({ def, days }) => ({
    id: `demo-${def.key}`,
    name: def.name,
    createdAt: new Date(y, m - 1, d, 9, 0, 0).toISOString(),
    completedDates: days.map((day, i) => (day.done ? isoAt(today, i - T) : null)).filter(Boolean),
    schedule: def.schedule,
    category: def.category,
    color: def.color,
    icon: def.icon,
    startDate,
    status: 'active',
  }));
}

/**
 * The prototype's two stacks. Morning kickstart holds meditate/run/water;
 * Evening wind-down holds read/sleep/journal; ship is left unstacked.
 *
 * `demo-journal` is NOT in the prototype and is not in design/target/stacks.png.
 * It exists so the page's `stack-item-not-due` state renders on every day of
 * the week: it is weekend-only [0,6], so Mon-Fri it is the not-due member,
 * and Sat/Sun demo-run ([1,3,5]) is. Without it the seeded shot renders a
 * not-due row only on Tue/Thu/Sat/Sun, and on the other three days that state
 * is verified by nothing. The cost is one extra row in the evening card that
 * the target PNG does not have. Do not remove it to make the composite match.
 *
 * The done label is weekday-dependent and that is correct, not a bug:
 * demo-run is weekdays [1,3,5], so on Tue/Thu/Sat/Sun it is not due and the
 * Morning label reads "2 of 2 done today", while on Mon/Wed/Fri it is due and
 * the label reads "2 of 3". Do not "fix" the denominator to make it read 2 of 2.
 *
 * Palette ids, not raw hex/emoji — see AD-029.
 */
export function buildDemoStacks() {
  return [
    {
      id: 'demo-stack-morning',
      name: 'Morning kickstart',
      time: '7:00 AM',
      anchor: 'I pour my morning coffee',
      aglyph: 'coffee',
      color: 'amber',
      habitIds: ['demo-meditate', 'demo-run', 'demo-water'],
    },
    {
      id: 'demo-stack-evening',
      name: 'Evening wind-down',
      time: '9:30 PM',
      anchor: 'I close my work laptop',
      aglyph: 'moon',
      color: 'indigo',
      habitIds: ['demo-read', 'demo-sleep', 'demo-journal'],
    },
  ];
}
