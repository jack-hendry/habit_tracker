// Print the demo habits so they can be loaded into a real browser.
//
//   node scripts/seed-demo.mjs          # a one-liner to paste into DevTools
//   node scripts/seed-demo.mjs --json   # just the habit array
//
// The data is generated relative to today, so it cannot be committed as a
// fixture — regenerate it whenever you want a fresh store.

import { buildDemoHabits, buildDemoStacks, STORAGE_KEY, STACKS_STORAGE_KEY } from './demo-data.mjs';

const habits = buildDemoHabits(new Date());
const stacks = buildDemoStacks();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ habits, stacks }, null, 2));
} else {
  console.log(`localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(habits))}); localStorage.setItem(${JSON.stringify(STACKS_STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(stacks))}); location.reload();`);
  console.error(`\n^ paste that into the DevTools console on the running app (${habits.length} habits, ~18 weeks of history).`);
  console.error('To clear it again: localStorage.removeItem("habit_tracker.habits.v1"); localStorage.removeItem("habit_tracker.stacks.v1"); location.reload();');
}
