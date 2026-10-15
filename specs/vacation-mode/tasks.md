# Vacation mode — tasks

**18 steps, in order. Do not skip ahead or batch steps.** All steps run
sequentially (CriticReview R14). The baseline is **456 tests passing**
(`npx ng test --watch=false --browsers=ChromeHeadless`). Every step ends at a
green build and a green suite.

Test command used below as `TEST`:
`npx ng test --watch=false --browsers=ChromeHeadless 2>&1 | grep TOTAL`

All prototype values below were transcribed from `Habit Tracker Prototype.dc.html`
on 2026-10-15. Do not look them up anywhere else and do not "correct" them.

---

### Step 1 — Rename `HabitService.isPaused` to `isManuallyPaused`

**Model:** haiku

**Files**
- MODIFY `src/app/habit/habit.service.ts` — anchor: `isPaused(habit: Habit, today: Date = new Date())`, and its caller inside `pause(`
- MODIFY `src/app/dashboard/dashboard.component.ts` — anchor: `this.habitService.isPaused(h, this.today)` (2 hits)
- MODIFY `src/app/habit/habit-list.component.ts` — anchor: `this.habitService.isPaused(habit)`
- MODIFY `src/app/habit/habit-list.component.spec.ts`, `src/app/habit/habit.service.spec.ts` — only lines calling the **service's** `isPaused(`
- DO NOT TOUCH: the component method `HabitListComponent.isPaused(id)` and every `isPaused(` in `habit-list.component.html`. Those are the component's own method and keep their name.

**Context**
This is a pure rename, with no behaviour change. It must land on its own
before vacations exist, so that the dashboard filter's meaning cannot shift in
the same diff (CriticReview R10).

**Do**
1. Rename the service method to `isManuallyPaused`. Replace its doc comment with:
   `/** Has the user paused this habit by hand (its own pausedRanges)? Ignores vacations — this drives the Pause/Resume button, not "is it due" (vacation-mode Analyst §2.3). */`
2. Update every service call site listed above.

**Done when**
- `grep -rnE '(habitService|svc|service|this)\.isPaused\(' src/app` returns nothing
- `grep -rn "isManuallyPaused" src/app | wc -l` gives 5 or more (the definition, `pause()`, dashboard ×2, habit-list ×1, and any spec hits)
- `TEST` gives `456 SUCCESS`

**If blocked**
If a hit isn't in the Files list, STOP and report it. Don't rename it.

---

### Step 2 — Add the `Vacation` type, its guard, and `'paused'` in `DayStatus`

**Model:** haiku

**Files**
- MODIFY `src/app/habit/habit.model.ts` — anchors: `export interface PausedRange`, `export type DayStatus`

**Do**
1. Directly after the `PausedRange` interface, add:
```ts
/**
 * A global vacation: every habit is paused across the half-open `[from, to)`.
 * `to` is the RESUME date and is never null (vacation-mode AD-035). Stored
 * separately from habits under `habit_tracker.vacations.v1`. Past vacations
 * are kept forever — deleting one would turn its days back into `missed`.
 */
export interface Vacation {
  from: string; // YYYY-MM-DD, inclusive
  to: string;   // YYYY-MM-DD, EXCLUSIVE — the day habits resume
}

/** Runtime guard for a stored `Vacation`. Non-empty ranges only (`from < to`). */
export function isVacation(value: unknown): value is Vacation {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v['from'] === 'string' &&
    ISO_DATE.test(v['from']) &&
    typeof v['to'] === 'string' &&
    ISO_DATE.test(v['to']) &&
    v['from'] < v['to']
  );
}
```
   `ISO_DATE` is declared *below* in the same file. Move the `ISO_DATE`
   declaration (and its comment) up so it sits above `PausedRange`.
2. Change `DayStatus` to
   `'not-due' | 'done' | 'missed' | 'pending' | 'future' | 'paused'`, and
   append this to its comment: `'paused' (vacation-mode AD-036): inside a manual pause range or a vacation, on/after the start date — including future days.`

**Done when**
- `npx ng build` succeeds
- `TEST` gives `456 SUCCESS`

---

### Step 3 — The vacation store: signal, load and persist (no behaviour change yet)

**Model:** haiku

**Depends on:** Step 2 — it imports `Vacation` and `isVacation`.

**Files**
- MODIFY `src/app/habit/habit.service.ts` — anchors: `private static readonly STORAGE_KEY`, `private persist()`, `private load()`
- MODIFY `src/app/habit/habit.service.spec.ts` — append a new top-level `describe`

**Context**
`HabitService` owns vacations directly. A separate injected service would break
the 62 `new HabitService()` calls in the spec (CriticReview R1). Mirror the
existing `persist()` / `load()` exactly.

**Do**
1. Add `Vacation, isVacation` to the import from `./habit.model`.
2. Under `STORAGE_KEY`, add
   `private static readonly VACATIONS_KEY = 'habit_tracker.vacations.v1';`
3. Under `readonly habits = ...`, add:
```ts
  // --- Vacation (vacation-mode Analyst §2.1) --------------------------------
  private readonly _vacations = signal<Vacation[]>(this.loadVacations());
  /** Every vacation, past included. Read-only; mutate via start/update/endVacation. */
  readonly vacations = this._vacations.asReadonly();
```
4. Directly after `private load()`, add:
```ts
  /** Persist vacations. Same quota guard as `persist()`. */
  private persistVacations(): void {
    try {
      localStorage.setItem(HabitService.VACATIONS_KEY, JSON.stringify(this._vacations()));
    } catch {
      // Same as persist(): no error UI yet.
    }
  }

  /**
   * Same fail-soft contract as `load()` (AD-002): missing key, non-array or
   * parse error → []; malformed rows dropped, valid rows survive. A lost
   * vacation re-exposes its days as `missed` — accepted (CriticReview R9).
   */
  private loadVacations(): Vacation[] {
    try {
      const raw = localStorage.getItem(HabitService.VACATIONS_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isVacation) : [];
    } catch {
      return [];
    }
  }
```
5. Spec: append `describe('HabitService — vacation store', ...)` with
   `beforeEach(() => localStorage.clear())` and these tests:
   - `'vacations() is [] when the key is missing'`
   - `'loads valid rows and drops malformed ones'`. Seed
     `[{from:'2026-07-20',to:'2026-07-27'}, {from:'bad',to:'2026-07-27'}, {from:'2026-07-27',to:'2026-07-20'}, null]`
     and expect exactly the first.
   - `'a non-array value loads as []'`

**Done when**
- `TEST` gives `459 SUCCESS`

---

### Step 4 — `currentVacation`, `startVacation`, `updateVacation`, `endVacation`

**Model:** haiku

**Depends on:** Step 3 — it uses `_vacations` and `persistVacations`.

**Files**
- MODIFY `src/app/habit/habit.service.ts` — insert after `reactivate(`
- MODIFY `src/app/habit/habit.service.spec.ts` — add to the `describe` from Step 3

**Do**
1. Insert:
```ts
  /**
   * The current-or-upcoming vacation (`to > today`), or null. Invariant I1:
   * there is at most one.
   */
  currentVacation(today: Date = new Date()): Vacation | null {
    const todayIso = HabitService.todayIso(today);
    return this._vacations().find((v) => v.to > todayIso) ?? null;
  }

  /** Is `iso` inside any vacation, past or future? Half-open `[from, to)`. */
  isOnVacation(iso: string): boolean {
    return this._vacations().some((v) => v.from <= iso && iso < v.to);
  }

  /**
   * Schedule a vacation. Refused (returns false, no persist) if the dates are
   * malformed, `from` is before today (I3), the range is empty (I4), or one
   * is already current/upcoming (I1 — edit that one instead). I2 needs no
   * guard: it follows from I1 + I3 (CriticReview R12).
   */
  startVacation(from: string, to: string, today: Date = new Date()): boolean {
    const todayIso = HabitService.todayIso(today);
    if (!isVacation({ from, to }) || from < todayIso || this.currentVacation(today)) {
      return false;
    }
    this._vacations.update((list) => [...list, { from, to }]);
    this.persistVacations();
    return true;
  }

  /**
   * Replace the current/upcoming vacation. Upcoming: any valid range with
   * `from >= today`. Underway (`from <= today`): `from` is locked and the new
   * `to` must be > today (I6) — ending it today is `endVacation`, not an edit.
   */
  updateVacation(from: string, to: string, today: Date = new Date()): boolean {
    const current = this.currentVacation(today);
    const todayIso = HabitService.todayIso(today);
    if (!current || !isVacation({ from, to })) {
      return false;
    }
    if (current.from <= todayIso) {
      if (from !== current.from || to <= todayIso) {
        return false;
      }
    } else if (from < todayIso) {
      return false;
    }
    this._vacations.update((list) => list.map((v) => (v === current ? { from, to } : v)));
    this.persistVacations();
    return true;
  }

  /**
   * "I'm back" / "Cancel vacation" (I5). Underway since before today:
   * truncate to `to = today`, so elapsed days stay paused and today is live.
   * Upcoming, or started today: remove it — nothing elapsed. Never touches a
   * past vacation. Deliberately NOT the prototype's `vacation = null`, which
   * would turn elapsed days into `missed`.
   */
  endVacation(today: Date = new Date()): void {
    const current = this.currentVacation(today);
    if (!current) {
      return;
    }
    const todayIso = HabitService.todayIso(today);
    this._vacations.update((list) =>
      current.from < todayIso
        ? list.map((v) => (v === current ? { from: current.from, to: todayIso } : v))
        : list.filter((v) => v !== current),
    );
    this.persistVacations();
  }
```
2. Spec tests. Use `const WED_22 = new Date(2026, 6, 22)` as today. Each case
   is its own `it`, and each one reloads with `new HabitService()` where it
   asserts persistence:
   - `startVacation` accepts `('2026-07-22','2026-07-29')` and persists. Reload
     and see it.
   - It refuses `from` yesterday, refuses `to === from`, refuses `to < from`,
     and refuses a second while one is upcoming. Each leaves `vacations()`
     unchanged, and localStorage has no key after a refused first call.
   - `currentVacation` returns null once `to <= today`. A past vacation
     `('2026-07-01','2026-07-08')` seeded via localStorage does **not** block
     `startVacation`.
   - `updateVacation` on an upcoming one may move `from`, and refuses
     `from < today`.
   - `updateVacation` on an underway one `('2026-07-20','2026-07-27')`:
     accepts `('2026-07-20','2026-07-30')`; refuses `('2026-07-21','2026-07-30')`
     (from moved); refuses `('2026-07-20','2026-07-22')` (to <= today).
   - `endVacation`:
     - underway since `2026-07-20` → `{from:'2026-07-20', to:'2026-07-22'}`;
     - upcoming → removed;
     - started today (`from === '2026-07-22'`) → removed;
     - a past vacation seeded alongside is unchanged in every case.

**Done when**
- `TEST` gives at least `472 SUCCESS`. Record the exact number here: 475

---

### Step 5 — `isPausedOn` honours vacations

**Model:** haiku

**Depends on:** Step 4 — it uses `isOnVacation`.

**Files**
- MODIFY `src/app/habit/habit.service.ts` — anchors: `isPausedOn(habit: Habit, iso: string)`, `isManuallyPaused(`
- MODIFY `src/app/habit/habit.service.spec.ts`

**Do**
1. `isPausedOn` becomes
   `return this.isOnVacation(iso) || this.inOwnPauseRange(habit, iso);`.
   Extend its doc comment with:
   `Covers BOTH reasons — the habit's own ranges and any global vacation — so isDueOn and every derivation treat vacation days as neutral (AD-035).`
2. Add `private inOwnPauseRange(habit: Habit, iso: string): boolean`, holding
   the old `.some(...)` body.
3. `isManuallyPaused` returns
   `this.inOwnPauseRange(habit, HabitService.todayIso(today))`. It must no
   longer call `isPausedOn`.
4. Spec tests. Use a daily habit started `2026-07-01`, with today `WED_22`:
   - `isPausedOn` is true on `from` and on `to − 1`, and false on `to`
     (half-open). The habit has no `pausedRanges`.
   - A habit with `startDate` *inside* the vacation is covered.
   - `isManuallyPaused` is false for a habit covered only by a vacation, and
     true for one with an open own range.
   - `pause()` during a vacation succeeds: it appends an open range.
   - Past vacations can't go through `startVacation` (I3). Seed them by
     writing `habit_tracker.vacations.v1` to localStorage, then construct
     `new HabitService()`.
   - **Streak protection.** Completions run `07-01 … 07-10`, the vacation is
     `('2026-07-11','2026-07-18')`, and there's a completion on `07-18`.
     `currentStreak(h, new Date(2026,6,18))` is `11`. Clearing `vacations`
     (a new service with the key removed) gives `1`.
   - **Early end keeps elapsed days paused.** Completions run `07-01 … 07-10`,
     and the vacation is `('2026-07-11','2026-07-18')` started on `07-11`. Call
     `endVacation(new Date(2026,6,13))`, then complete `07-13`. Then
     `currentStreak(h, new Date(2026,6,13))` is `11`.

**Done when**
- `TEST` gives at least the Step 4 count + 7, and no failures

---

### Step 6 — `dayStatus` returns `'paused'`

**Model:** haiku

**Depends on:** Step 5 — `isPausedOn` must already include vacations.

**Files**
- MODIFY `src/app/habit/habit.service.ts` — anchor: `dayStatus(habit: Habit, iso: string, todayDate`
- MODIFY `src/app/habit/habit.service.spec.ts` — the test
  `'pause, resume, then days inside the closed range stay not-due (AC 6, R6)'`
  (~line 1014), plus new tests
- DO NOT TOUCH: `completionRate`, `poolCounts`, `perfectDays`, `isLapsed`, `stripCellColor`. They need no change (Analyst §2.4 grace check).

**Do**
1. Replace the body of `dayStatus` after `const todayIso = ...` with:
```ts
    // 1. Done — what happened wins (AD-014). completedDates never holds a
    //    future day, so checking this before `future` changes nothing.
    if (iso <= todayIso && habit.completedDates.includes(iso)) {
      return 'done';
    }
    // 2. Paused — manual or vacation, on/after start, INCLUDING future days so
    //    an upcoming vacation shows on the calendar (AD-036).
    if (iso >= HabitService.startIso(habit) && this.isPausedOn(habit, iso)) {
      return 'paused';
    }
    // 3. Future
    if (iso > todayIso) {
      return 'future';
    }
    // 4. Not due: not scheduled, or before the start date
    if (!this.isDueOn(habit, iso)) {
      return 'not-due';
    }
    // 5. Pending / 6. Missed
    return iso === todayIso ? 'pending' : 'missed';
```
   Update the method's doc comment to describe this order.
2. In the named test, rename it to
   `'pause, resume, then days inside the closed range are paused (AC 6, R6; AD-036)'`,
   and change its three `toBe('not-due')` to `toBe('paused')`. Change nothing
   else in it.
3. New tests:
   - A vacation day in the past gives `paused`, and a future vacation day gives
     `paused`, not `future`.
   - A completed vacation day gives `done`.
   - A vacation day before `startDate` gives `not-due`.
   - A future day of a habit with a future `startDate` and no pause still gives
     `future` (a regression guard on the reorder).

**Done when**
- `TEST`: no failures. The count is the Step 5 count + 4.
- `git diff --stat src/app/habit/habit.service.spec.ts` shows that the only
  edited pre-existing test is the one named above

**If blocked**
If any *other* pre-existing test fails, STOP and report its name. Don't edit it.

---

### Step 7 — Checkpoint

**Model:** haiku

**Do**
1. Run `npx ng build` and `TEST`.
2. Re-run each "Done when" grep from Steps 1–6.

**Done when**
- The build is clean, the suite is green, and every grep matches. Record the count: 488 (Step 5 added 9 tests → 484; Step 6 +4)

---

### Step 8 — `design-shot.mjs`: `--seed-vacation`, `--click`, and two new names

**Model:** haiku

**Files**
- MODIFY `scripts/design-shot.mjs` — anchors: `const ROUTES = {`, `const STATES = {`, `const args = { name`, `if (args.seed) {`, `await page.goto(`
- MODIFY `scripts/demo-data.mjs` — add an export
- MODIFY `CLAUDE.md` — the `npm run design:shot` bullet
- DO NOT TOUCH: anything under `src/`

**Do**
1. `demo-data.mjs`: add `export const VACATIONS_STORAGE_KEY = 'habit_tracker.vacations.v1';`
   and
```js
/** A 7-day vacation starting today: [today, today+7). */
export function buildDemoVacation(today = new Date()) {
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
  return [{ from: iso(today), to: iso(end) }];
}
```
2. `ROUTES`: add `'dashboard-vacation': '/'` and `'vacation-modal': '/'`.
3. `STATES`: add
   `'dashboard-vacation': ['vacation-banner']`,
   `'vacation-modal': ['range-start', 'range-end', 'range-between', 'range-past', 'pill-active']`,
   and append `'status-paused'` to `calendar`.
4. Args: add `seedVacation: false, click: null`. Parse `--seed-vacation`
   (sets the flag) and `--click <text>` (takes the next arg). Add both to the
   usage string.
5. After the `if (args.seed) { ... }` block, add: if `args.seedVacation`,
   `addInitScript` sets `VACATIONS_STORAGE_KEY` to
   `JSON.stringify(buildDemoVacation(new Date()))`, and logs
   `seeded:  1 demo vacation (7 days from today)`.
6. After `page.goto(...)` and its `waitForTimeout`: if `args.click`, run
   `await page.getByRole('button', { name: args.click, exact: true }).click(); await page.waitForTimeout(300);`
7. CLAUDE.md: extend the `design:shot` usage to
   `[--seed] [--seed-vacation] [--click "<button text>"]`, with one sentence
   explaining each.

**Done when**
- `node --check scripts/design-shot.mjs` exits 0
- `node scripts/design-shot.mjs nope --bogus` prints the usage/unknown-flag error, not a stack trace

---

### Step 9 — Capture the two vacation mockups from the prototype

**Model:** sonnet — it drives a browser and judges that the captured state is the right one.

**Depends on:** none in code. It must finish before Step 17.

**Files**
- CREATE `design/target/dashboard-vacation.png`, `design/target/vacation-modal.png`
- REPLACE `design/target/dashboard.png`. The July capture predates the 🌴
  button, so Step 17's regression check would flag the button as a diff.

**Context**
Run this as the `design-page-tour` agent against Claude Design project
`7089b0b3-0042-4029-bd4c-bef0ce5a6d19`, file `Habit Tracker Prototype.dc.html`.
Use 1440 width, `deviceScaleFactor: 2`, full page (the `design-value-sampling`
skill's capture rules).

**Do**
0. Go to Dashboard with no vacation and capture `dashboard.png`.
1. On Dashboard, click "Vacation mode" and leave the defaults (start today,
   1 week). Capture `vacation-modal.png`.
2. Click "Start vacation". The banner reads "On vacation · …". Capture
   `dashboard-vacation.png`.
3. Return only the paths and a one-line description of each. No images.

**Done when**
- `file design/target/dashboard.png design/target/dashboard-vacation.png design/target/vacation-modal.png` reports three PNGs, each 2880 px wide

**If blocked**
If the prototype has no "Vacation mode" button, STOP and report. The source changed.

---

### Step 10 — Extract `HabitService.monthLayout` from `monthGrid`

**Model:** haiku

**Files**
- MODIFY `src/app/habit/habit.service.ts` — anchor: `monthGrid(`
- MODIFY `src/app/habit/habit.service.spec.ts` — add to `describe('monthGrid'`

**Context**
The range picker needs the same week layout without any habit status (Analyst
§2.6). This is one definition of "where the blanks go", used by both.

**Do**
1. Add, directly above `monthGrid`:
```ts
  /**
   * The Sunday-aligned cells of a month: leading `null`s, one ISO per day,
   * trailing `null`s to a multiple of 7. Month is 0-based. Pure. Shared by
   * `monthGrid` and `<app-range-picker>` so the two cannot disagree.
   */
  static monthLayout(year: number, month: number): Array<string | null> {
    const cells: Array<string | null> = [];
    const leading = new Date(year, month, 1).getDay();
    for (let i = 0; i < leading; i++) {
      cells.push(null);
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(HabitService.todayIso(new Date(year, month, day)));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    return cells;
  }
```
2. Rewrite the body of `monthGrid` as
   `return HabitService.monthLayout(year, month).map((iso) => iso === null ? { blank: true as const } : { iso, status: this.dayStatus(habit, iso, today) });`
   The signature and doc comment are unchanged.
3. Add 2 tests: July 2026 has 3 leading nulls (the 1st is a Wednesday) and a
   length of 35; February 2026 has length 28 and no nulls (the 1st is a
   Sunday).

**Done when**
- `TEST`: green, and the count is the Step 7 count + 2. Every existing `monthGrid` test passes unedited.

---

### Step 11 — `formatShortDate` helper

**Model:** haiku

**Files**
- CREATE `src/app/shared/format-short-date.ts`, `src/app/shared/format-short-date.spec.ts`

**Do**
1. Create:
```ts
/**
 * `YYYY-MM-DD` → `Thu, Jul 23` — the prototype's `fmtI(i, true)` (vacation-mode
 * CriticReview R7). Built from split parts (AD-003), en-US pinned like
 * `formatBarDate`.
 */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const rest = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday}, ${rest}`;
}
```
2. Spec: `'2026-07-23'` gives `'Thu, Jul 23'`, and `'2026-01-01'` gives `'Thu, Jan 1'`.

**Done when**
- `TEST`: green, and the count is the Step 10 count + 2

---

### Step 12 — Checkpoint

**Model:** haiku

**Do** Run `npx ng build` and `TEST`. Confirm `design/target/` has both new PNGs.

**Done when** The build is clean and the suite is green. Record the count: 492

---

### Step 13 — `<app-range-picker>`

**Model:** haiku

**Depends on:** Step 10 (`monthLayout`) and Step 6 (nothing in code, but keep the order).

**Files**
- CREATE `src/app/shared/range-picker/range-picker.component.{ts,html,scss,spec.ts}`
- MODIFY `src/styles.scss` — add tokens

**Context**
This follows the signal-input pattern in `src/app/shared/stat-card/stat-card.component.ts`.
The component is presentational. It emits a new range and never touches a
service.

**Do**
1. `styles.scss`: add this block after the `--cal-future-text` line:
```scss
  /* Vacation mode (vacation-mode Analyst §2.4–2.6), sampled from source.
     --paused-* is ONE palette for every paused day on Calendar and the
     habit-detail circles (AD-036). */
  --paused-bg: #eef2f7;
  --paused-border: #b6c2d0;
  --paused-text: #7b8794;
  --vacation-tint: #eaf4fb;
  --vacation-border: #bcd7ef;
  --picker-past: #d0d3d7;
  --summary-rule: #ebebe8;
```
2. `range-picker.component.ts`:
```ts
import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { HabitService } from '../../habit/habit.service';

export interface DateRange { from: string; to: string } // [from, to)

interface PickerCell {
  iso: string | null;
  day: number;
  past: boolean;
  start: boolean;
  end: boolean;
  between: boolean;
  today: boolean;
}

@Component({
  selector: 'app-range-picker',
  standalone: true,
  templateUrl: './range-picker.component.html',
  styleUrl: './range-picker.component.scss',
})
export class RangePickerComponent {
  readonly from = input.required<string>();
  /** Exclusive. */
  readonly to = input.required<string>();
  /** First selectable day; also where the Today ring goes. */
  readonly todayIso = input.required<string>();
  /** Underway vacation: the start cannot move, clicks only set the end (I6). */
  readonly lockStart = input(false);
  readonly rangeChange = output<DateRange>();

  readonly weekdayInitials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  private readonly phase = signal<'start' | 'end'>('start');

  /** Month on screen; follows `from` when it changes, pageable in between. */
  readonly view = linkedSignal(() => {
    const [y, m] = this.from().split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  private readonly minMonth = computed(() => {
    const [y, m] = this.todayIso().split('-').map(Number);
    return y * 12 + (m - 1);
  });
  private readonly viewIndex = computed(() => this.view().year * 12 + this.view().month);
  readonly canPrev = computed(() => this.viewIndex() > this.minMonth());
  /** Prototype pages up to 11 months ahead. */
  readonly canNext = computed(() => this.viewIndex() < this.minMonth() + 11);

  readonly label = computed(() =>
    new Date(this.view().year, this.view().month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

  readonly hint = computed(() =>
    this.lockStart()
      ? 'Click the new last day of your vacation'
      : this.phase() === 'end'
        ? 'Now click the last day of your vacation'
        : 'Click a start date, then an end date',
  );

  readonly cells = computed<PickerCell[]>(() => {
    const from = this.from();
    const last = HabitService.shiftIso(this.to(), -1);
    const today = this.todayIso();
    return HabitService.monthLayout(this.view().year, this.view().month).map((iso) => ({
      iso,
      day: iso === null ? 0 : Number(iso.slice(-2)),
      past: iso !== null && iso < today,
      start: iso === from,
      end: iso === last,
      between: iso !== null && iso > from && iso < last,
      today: iso === today,
    }));
  });

  prev(): void {
    if (this.canPrev()) this.shift(-1);
  }

  next(): void {
    if (this.canNext()) this.shift(1);
  }

  pick(cell: PickerCell): void {
    if (cell.iso === null || cell.past) return;
    const iso = cell.iso;
    const after = HabitService.shiftIso(iso, 1);
    if (this.lockStart()) {
      if (iso >= this.from()) this.rangeChange.emit({ from: this.from(), to: after });
      return;
    }
    if (this.phase() === 'end' && iso >= this.from()) {
      this.rangeChange.emit({ from: this.from(), to: after });
      this.phase.set('start');
    } else {
      this.rangeChange.emit({ from: iso, to: after });
      this.phase.set('end');
    }
  }

  private shift(delta: number): void {
    const { year, month } = this.view();
    const d = new Date(year, month + delta, 1);
    this.view.set({ year: d.getFullYear(), month: d.getMonth() });
  }
}
```
3. `range-picker.component.html`:
```html
<div class="picker-head">
  <button type="button" class="arrow" [disabled]="!canPrev()" (click)="prev()" aria-label="Previous month">‹</button>
  <span class="picker-label">{{ label() }}</span>
  <button type="button" class="arrow" [disabled]="!canNext()" (click)="next()" aria-label="Next month">›</button>
</div>
<div class="picker-grid">
  @for (w of weekdayInitials; track $index) {
    <span class="weekday">{{ w }}</span>
  }
  @for (cell of cells(); track $index) {
    @if (cell.iso === null) {
      <span class="cell blank"></span>
    } @else {
      <button
        type="button"
        class="cell"
        [class.range-past]="cell.past"
        [class.range-start]="cell.start"
        [class.range-end]="cell.end"
        [class.range-between]="cell.between"
        [class.range-today]="cell.today && !cell.start && !cell.end && !cell.between"
        [disabled]="cell.past"
        [attr.aria-label]="cell.iso"
        (click)="pick(cell)"
      >{{ cell.day }}</button>
    }
  }
</div>
<span class="picker-hint">{{ hint() }}</span>
```
4. `range-picker.component.scss` (prototype values):
```scss
:host { display: flex; flex-direction: column; gap: 10px; }
.picker-head { display: flex; align-items: center; justify-content: space-between; }
.arrow {
  background: none; border: none; padding: 0 8px; font: inherit; font-size: 17px;
  color: var(--text); cursor: pointer; user-select: none;
  &:disabled { color: var(--arrow-disabled); cursor: default; }
}
.picker-label { font-size: 13.5px; font-weight: 700; color: var(--text-strong); }
.picker-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); row-gap: 4px; }
.weekday { text-align: center; font-size: 10.5px; font-weight: 700; color: var(--text-faint); }
.cell {
  height: 34px; display: flex; align-items: center; justify-content: center;
  font: inherit; font-size: 12.5px; font-weight: 500; color: var(--text-strong);
  background: transparent; border: none; border-radius: 0; padding: 0;
  cursor: pointer; user-select: none;
}
.cell.blank { cursor: default; }
.range-past { color: var(--picker-past); cursor: not-allowed; }
.range-between { background: var(--accent-tint); color: var(--accent); font-weight: 700; }
.range-start, .range-end { background: var(--accent); color: var(--surface); font-weight: 700; }
.range-start { border-radius: 7px 0 0 7px; }
.range-end { border-radius: 0 7px 7px 0; }
.range-start.range-end { border-radius: 7px; }
.range-today { box-shadow: inset 0 0 0 1.5px var(--accent); }
.picker-hint { font-size: 11.5px; color: var(--text-muted); }
```
5. Spec (TestBed with `fixture.componentRef.setInput`). Use today
   `'2026-07-22'`, from `'2026-07-22'`, to `'2026-07-29'`:
   - It renders July 2026, and ‹ is disabled.
   - The `07-21` button is disabled, and clicking it emits nothing.
   - Exactly one `.range-start` (22) and one `.range-end` (28), and 5
     `.range-between`.
   - Click 25 emits `{from:'2026-07-25', to:'2026-07-26'}` and the hint
     becomes "Now click…". Then set from/to to that range, click 30, and it
     emits `{from:'2026-07-25', to:'2026-07-31'}`.
   - With `lockStart` true and from `'2026-07-20'`, clicking 25 emits
     `{from:'2026-07-20', to:'2026-07-26'}`.
   - › pages to August. After 11 clicks, › is disabled.

**Done when**
- `TEST`: green, with at least 6 more tests than Step 12. Record the count: 500

---

### Step 14 — `<app-vacation-dialog>` (modal body)

**Model:** haiku

**Depends on:** Step 4 (service API), Step 11 (`formatShortDate`), Step 13 (`RangePickerComponent`).

**Files**
- CREATE `src/app/dashboard/vacation-dialog/vacation-dialog.component.{ts,html,scss,spec.ts}`

**Context**
This is the *contents* of a native `<dialog>` that Dashboard owns. It follows
`<app-habit-form>` inside habit-list's `create-dialog`: the host `<dialog>` and
`showModal()` stay in the parent, and this component emits `closed` when it's
done.

**Do**
1. `vacation-dialog.component.ts`:
```ts
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { HabitService } from '../../habit/habit.service';
import { RangePickerComponent, DateRange } from '../../shared/range-picker/range-picker.component';
import { formatShortDate } from '../../shared/format-short-date';

const PILLS = [
  { days: 3, label: '3 days' },
  { days: 5, label: '5 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
];

@Component({
  selector: 'app-vacation-dialog',
  standalone: true,
  imports: [RangePickerComponent],
  templateUrl: './vacation-dialog.component.html',
  styleUrl: './vacation-dialog.component.scss',
})
export class VacationDialogComponent {
  private readonly habitService = inject(HabitService);
  readonly today = input.required<Date>();
  readonly closed = output<void>();

  readonly pills = PILLS;
  readonly todayIso = computed(() => HabitService.todayIso(this.today()));
  /** Read once when the dialog body is created (it is @if-ed per open). */
  readonly existing = computed(() => this.habitService.currentVacation(this.today()));
  readonly underway = computed(() => {
    const v = this.existing();
    return v !== null && v.from <= this.todayIso();
  });

  readonly from = signal('');
  readonly length = signal(7);

  ngOnInit(): void {
    const v = this.existing();
    if (v) {
      this.from.set(v.from);
      this.length.set(this.daysBetween(v.from, v.to));
    } else {
      this.from.set(this.todayIso());
      this.length.set(7);
    }
  }

  readonly to = computed(() => HabitService.shiftIso(this.from(), this.length()));
  readonly rangeLabel = computed(
    () => `${formatShortDate(this.from())} – ${formatShortDate(HabitService.shiftIso(this.to(), -1))}`,
  );
  readonly resumeLabel = computed(() => formatShortDate(this.to()));
  readonly dayWord = computed(() => (this.length() === 1 ? 'day' : 'days'));

  /** K = active habits with a running streak; L = the longest (Analyst §2.6). */
  readonly keepLine = computed(() => {
    const habits = this.habitService.activeHabits();
    const k = habits.filter((h) => this.habitService.currentStreak(h, this.today()) > 0).length;
    if (k === 0) {
      return 'No active streaks to protect';
    }
    const top = this.habitService.topCurrentStreak(habits, this.today());
    return `${k} active streak${k === 1 ? '' : 's'} (longest ${top?.streak ?? 0} days) will be kept`;
  });

  readonly confirmLabel = computed(() => (this.existing() ? 'Update vacation' : 'Start vacation'));

  /** Underway: a pill whose end would not reach past today is unusable (I6). */
  pillDisabled(days: number): boolean {
    return this.underway() && HabitService.shiftIso(this.from(), days) <= this.todayIso();
  }

  setRange(range: DateRange): void {
    this.from.set(range.from);
    this.length.set(this.daysBetween(range.from, range.to));
  }

  setLength(days: number): void {
    if (!this.pillDisabled(days)) {
      this.length.set(days);
    }
  }

  confirm(): void {
    const ok = this.existing()
      ? this.habitService.updateVacation(this.from(), this.to(), this.today())
      : this.habitService.startVacation(this.from(), this.to(), this.today());
    if (ok) {
      this.closed.emit();
    }
  }

  private daysBetween(from: string, to: string): number {
    let n = 0;
    let cursor = from;
    while (cursor < to) {
      cursor = HabitService.shiftIso(cursor, 1);
      n++;
    }
    return n;
  }
}
```
   Add `OnInit` to the imports and `implements OnInit`.
2. `vacation-dialog.component.html`:
```html
<div class="vac-head">
  <span class="vac-tile" aria-hidden="true">🌴</span>
  <div class="vac-titles">
    <h2 class="vac-title">Vacation mode</h2>
    <p class="vac-sub">Pause every habit while you're away. Paused days don't count as missed, so streaks stay intact.</p>
  </div>
  <button type="button" class="vac-close" aria-label="Close" (click)="closed.emit()">✕</button>
</div>

<app-range-picker
  [from]="from()"
  [to]="to()"
  [todayIso]="todayIso()"
  [lockStart]="underway()"
  (rangeChange)="setRange($event)"
/>

<div class="vac-quick">
  <span class="vac-eyebrow">Quick length · from start date</span>
  <div class="vac-pills">
    @for (p of pills; track p.days) {
      <button
        type="button"
        class="pill"
        [class.pill-active]="length() === p.days"
        [disabled]="pillDisabled(p.days)"
        (click)="setLength(p.days)"
      >{{ p.label }}</button>
    }
  </div>
</div>

<div class="vac-summary">
  <div class="vac-row"><span>Paused · {{ length() }} {{ dayWord() }}</span><span class="vac-val">{{ rangeLabel() }}</span></div>
  <div class="vac-row"><span>Habits resume</span><span class="vac-val">{{ resumeLabel() }}</span></div>
  <span class="vac-keep">✓ {{ keepLine() }}</span>
</div>

<div class="vac-actions">
  <button type="button" class="btn-secondary" (click)="closed.emit()">Cancel</button>
  <button type="button" class="btn-primary" (click)="confirm()">{{ confirmLabel() }}</button>
</div>
```
3. `vacation-dialog.component.scss` (prototype values):
```scss
:host { display: flex; flex-direction: column; gap: 18px; }
.vac-head { display: flex; align-items: flex-start; gap: 12px; }
.vac-tile {
  width: 38px; height: 38px; border-radius: 10px; background: var(--vacation-tint);
  display: flex; align-items: center; justify-content: center; font-size: 19px; flex: none;
}
.vac-titles { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.vac-title { margin: 0; font-size: 17px; font-weight: 700; color: var(--text-strong); }
.vac-sub { margin: 0; font-size: 12.5px; color: var(--text-sub); text-wrap: pretty; }
.vac-close {
  background: none; border: none; font: inherit; font-size: 15px; color: var(--text-faint);
  cursor: pointer; padding: 2px 4px;
  &:hover { color: var(--text-strong); }
}
.vac-quick { display: flex; flex-direction: column; gap: 8px; }
.vac-eyebrow { font-size: 11px; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
.vac-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.pill {
  padding: 6px 13px; border-radius: var(--radius-pill); font: inherit; font-size: 12.5px; font-weight: 600;
  cursor: pointer; background: var(--surface); color: var(--text); border: 1px solid var(--control-border);
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
.pill-active { background: var(--accent); color: var(--surface); border-color: var(--accent); }
.vac-summary {
  background: var(--page-bg); border-radius: var(--radius-card); padding: 12px 14px;
  display: flex; flex-direction: column; gap: 6px;
}
.vac-row { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--text); }
.vac-val { font-weight: 700; color: var(--text-strong); }
.vac-keep { font-size: 12px; color: var(--positive); font-weight: 600; padding-top: 4px; border-top: 1px solid var(--summary-rule); }
.vac-actions { display: flex; justify-content: flex-end; gap: 8px; }
.btn-secondary, .btn-primary {
  padding: 9px 16px; border-radius: var(--radius-control); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn-secondary { background: var(--surface); border: 1px solid var(--control-border); color: var(--text); }
.btn-primary { background: var(--accent); border: none; color: var(--surface); }
```
   The `.pill:disabled` opacity is **invented**. The prototype never disables
   a pill.
4. Spec (TestBed, `jasmine.clock().mockDate(new Date(2026,6,22))`,
   `setInput('today', new Date(2026,6,22))`):
   - With no vacation: the summary reads `Paused · 7 days`,
     `Wed, Jul 22 – Tue, Jul 28`, and `Wed, Jul 29`. The "1 week" pill is
     active. The confirm label is "Start vacation".
   - Clicking "2 weeks" gives `Paused · 14 days`.
   - Confirm calls `startVacation` and emits `closed`, and
     `currentVacation()` is `{from:'2026-07-22', to:'2026-07-29'}`.
   - **K/L fixture.** Habits:
     - A: streak 3;
     - B: streak 0;
     - C: archived with completions;
     - D: manually paused with a streak of 2 before the pause.

     The line reads `2 active streaks (longest 3 days) will be kept`.
     Construct the dates so that's true, and assert the exact string.
   - With no habits it reads `No active streaks to protect`.
   - With an underway vacation `('2026-07-19','2026-07-27')` seeded via
     localStorage before the service is created, and today `07-22`:
     - the confirm label is "Update vacation";
     - the "3 days" pill is disabled (`07-19 + 3 = 07-22 <= 07-22`);
     - the "5 days" pill is enabled (`07-24`).

**Done when**
- `TEST`: green, with at least 6 more tests than Step 13. Record the count: 506

---

### Step 15 — Dashboard: button, banner, dialog, empty-state line

**Model:** haiku

**Depends on:** Step 14.

**Files**
- MODIFY `src/app/dashboard/dashboard.component.{ts,html,scss,spec.ts}`
- MODIFY `src/styles.scss` — the `--backdrop` value only
- DO NOT TOUCH: `habit-list.component.*`, `habit-detail.component.*`

**Context**
This copies habit-list's create-dialog pattern exactly: `viewChild`
`<dialog>`, `showModal()` in `open…()`, a `closeVacation()` that is idempotent
and wired to `(close)`, and the body `@if`-ed on a `vacationOpen` signal so it
re-initialises on each open.

**Do**
1. `.ts`:
   - Import `signal, viewChild, ElementRef`, `VacationDialogComponent` and
     `formatShortDate`. Add `VacationDialogComponent` to `imports`.
   - Change `private readonly today = new Date();` to
     `readonly today = new Date();` so the template can pass it to the
     dialog's `[today]`.
   - Add:
```ts
  readonly vacationOpen = signal(false);
  private readonly vacationDialog = viewChild.required<ElementRef<HTMLDialogElement>>('vacationDialog');

  /** Current-or-upcoming vacation. Reactive: reads the service signal. */
  readonly vacation = computed(() => this.habitService.currentVacation(this.today));
  readonly vacationUnderway = computed(() => {
    const v = this.vacation();
    return v !== null && v.from <= this.todayIso;
  });
  readonly vacationButtonLabel = computed(() => (this.vacation() ? 'Edit vacation' : 'Vacation mode'));
  readonly bannerTitle = computed(() => {
    const v = this.vacation();
    if (!v) return '';
    const span = `${formatShortDate(v.from)} – ${formatShortDate(HabitService.shiftIso(v.to, -1))}`;
    return `${this.vacationUnderway() ? 'On vacation' : 'Vacation scheduled'} · ${span}`;
  });
  readonly bannerSub = computed(() => {
    const v = this.vacation();
    return v ? `All habits paused · streaks protected · resumes ${formatShortDate(v.to)}` : '';
  });
  /** Q2: "I'm back" only once underway; before that it cancels. */
  readonly endLabel = computed(() => (this.vacationUnderway() ? "I'm back — end vacation" : 'Cancel vacation'));

  openVacation(): void {
    this.vacationOpen.set(true);
    this.vacationDialog().nativeElement.showModal();
  }

  closeVacation(): void {
    this.vacationOpen.set(false);
    const el = this.vacationDialog().nativeElement;
    if (el.open) {
      el.close();
    }
  }

  endVacation(): void {
    this.habitService.endVacation(this.today);
  }
```
2. `.html`:
   - Wrap `.overall` and a new button in `<div class="head-actions">`, with
     the button first:
     `<button type="button" class="vacation-button" (click)="openVacation()"><span class="palm" aria-hidden="true">🌴</span>{{ vacationButtonLabel() }}</button>`
   - Directly after `</header>`, add the banner:
```html
  @if (vacation()) {
    <div class="vacation-banner">
      <span class="banner-tile" aria-hidden="true">🌴</span>
      <div class="banner-text">
        <span class="banner-title">{{ bannerTitle() }}</span>
        <span class="banner-sub">{{ bannerSub() }}</span>
      </div>
      <button type="button" class="banner-edit" (click)="openVacation()">Edit</button>
      <button type="button" class="banner-end" (click)="endVacation()">{{ endLabel() }}</button>
    </div>
  }
```
   - Replace `<p class="no-items">Nothing due today!</p>` with:
```html
        @if (vacationUnderway()) {
          <p class="no-items vacation-empty">Everything's paused while you're away. Enjoy the break.</p>
        } @else {
          <p class="no-items">Nothing due today!</p>
        }
```
   - As the last child of `.dashboard`:
```html
  <dialog #vacationDialog class="vacation-dialog" (close)="closeVacation()">
    @if (vacationOpen()) {
      <app-vacation-dialog [today]="today" (closed)="closeVacation()" />
    }
  </dialog>
```
3. `.scss` (prototype values):
```scss
.head-actions { display: flex; align-items: center; gap: 20px; }
.vacation-button {
  display: flex; align-items: center; gap: 7px; padding: 8px 14px; background: var(--surface);
  border: 1px solid var(--control-border); border-radius: var(--radius-control);
  font: inherit; font-size: 12.5px; font-weight: 600; color: var(--text); cursor: pointer;
  &:hover { border-color: var(--accent); color: var(--accent); }
}
.palm { font-size: 14px; }
.vacation-banner {
  display: flex; flex-wrap: wrap; align-items: center; gap: 14px;
  background: var(--vacation-tint); border: 1px solid var(--vacation-border);
  border-radius: var(--radius-card-lg); padding: 14px 18px; margin-bottom: 18px;
}
.banner-tile {
  width: 38px; height: 38px; border-radius: 10px; background: var(--surface);
  border: 1px solid var(--vacation-border); display: flex; align-items: center;
  justify-content: center; font-size: 19px; flex: none;
}
.banner-text { flex: 1 1 220px; display: flex; flex-direction: column; gap: 3px; }
.banner-title { font-size: 14px; font-weight: 700; color: var(--text-strong); }
.banner-sub { font-size: 12.5px; color: var(--text); }
.banner-edit, .banner-end {
  padding: 7px 13px; border-radius: var(--radius-control); font: inherit;
  font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.banner-edit { background: var(--surface); border: 1px solid var(--vacation-border); color: var(--accent); }
.banner-end { background: var(--accent); border: 1px solid var(--accent); color: var(--surface); }
.vacation-empty { color: var(--text); }
.vacation-dialog {
  width: 440px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px);
  box-sizing: border-box; overflow-y: auto; padding: 22px 24px; border: none;
  border-radius: 12px; background: var(--surface); box-shadow: 0 20px 50px rgba(0, 0, 0, 0.2);
  &::backdrop { background: var(--backdrop); }
}
```
4. `styles.scss`: change `--backdrop: rgba(0, 0, 0, 0.32);` to
   `--backdrop: rgba(22, 24, 28, 0.38);`. Edit its comment: the value is now
   sampled from the vacation modal's backdrop (vacation-mode Step 15), and is
   no longer invented. It deliberately applies to all three dialogs.
5. Spec (in the existing `describe`, which already mocks the date to FRI_17):
   - The button reads "Vacation mode", and there's no `.vacation-banner`.
   - After `startVacation(TODAY_ISO, shiftIso(TODAY_ISO, 7))` and
     `detectChanges`: the banner title starts with `On vacation · Fri, Jul 17`,
     the button reads "Edit vacation", the end button reads "I'm back — end
     vacation", To-do shows `.vacation-empty`, and the To-do list is empty
     even though a pending daily habit exists (R11).
   - An upcoming vacation from `shiftIso(TODAY_ISO, 2)` gives
     `Vacation scheduled · …` and "Cancel vacation". Clicking it removes the
     banner.
   - Clicking "I'm back" on an underway vacation started before today
     truncates it. Assert `vacations()[0].to === TODAY_ISO` and that the
     banner is gone.

**Done when**
- `TEST`: green, with at least 4 more tests than Step 14. Record the count: 510
- `npx ng build` is clean

---

### Step 16 — Paused rendering: the Calendar cell + legend, the habit-detail circle, the Habits chip

**Model:** haiku

**Depends on:** Step 6 (`'paused'` status) and Step 13 (`--paused-*` tokens).

**Files**
- MODIFY `src/app/calendar/calendar.component.{html,scss}`, `src/app/calendar/calendar.design.spec.ts`
- MODIFY `src/app/habit-detail/habit-detail.component.{html,scss}`, `src/app/habit-detail/habit-detail.design.spec.ts`
- MODIFY `src/app/habit/habit-list.component.{ts,html}`, `src/app/habit/habit-list.component.spec.ts`
- DO NOT TOUCH: `status-colors.ts`. `paused` already falls through to the not-due grey (Analyst §2.4).

**Do**
1. Calendar `.scss`: after `&.status-future { ... }`, add
```scss
  &.status-paused {
    background: var(--paused-bg);
    border-left: 3px solid var(--paused-border);

    .day-number {
      color: var(--paused-text);
    }
  }
```
   After `.swatch-future`, add
   `.swatch-paused { background: var(--paused-bg); border: 1px solid var(--paused-border); }`
2. Calendar `.html`: insert a legend item between "Future" and "Today":
   `<div class="legend-item"><div class="legend-swatch swatch-paused"></div><span>Paused</span></div>`
3. `calendar.design.spec.ts`: add
   `'status-paused': { bg: 'rgb(238, 242, 247)', bd: 'rgb(182, 194, 208)', tc: 'rgb(123, 135, 148)' }`
   to `CS`. If the existing per-status test iterates `CS`, nothing else is
   needed. Otherwise add one `it` mirroring the `status-future` one. These
   values are from the prototype's `CS.paused`. **Do not derive them from the
   SCSS.**
4. Habit-detail `.scss`: after `.status-not-due`, add
```scss
/* AD-036 — dashed like future, but in the paused palette (prototype circleFor). */
.status-paused {
  background: var(--paused-bg);
  border: 1.5px dashed var(--paused-border);
  color: var(--paused-text);
}
```
   Habit-detail `.html`: on the `<span class="circle" ...>`, add
   `[attr.title]="$any(cell).status === 'paused' ? 'Paused' : null"`.
5. `habit-detail.design.spec.ts`: add an `it` for `status-paused`, following
   the `status-future border` block: background `rgb(238, 242, 247)`, color
   `rgb(123, 135, 148)`, `borderTopStyle` `dashed`, and a border colour of
   `rgb(182, 194, 208)`.
6. Habits list `.ts`: add
```ts
  /** The "not today" chip reads "paused" when today is paused for any reason (Analyst §2.3, Q1). */
  notTodayLabel(habit: Habit): string {
    return this.habitService.isPausedOn(habit, HabitService.todayIso()) ? 'paused' : 'not today';
  }
```
   In the `.html`, replace `<span class="not-scheduled">not today</span>` with
   `<span class="not-scheduled">{{ notTodayLabel(habit) }}</span>`.
7. `habit-list.component.spec.ts`:
   - A habit during a vacation shows the chip text `paused` and a **Pause**
     button, not Resume.
   - A normal habit on an unscheduled day still shows `not today`.

**Done when**
- `TEST`: green, with at least 4 more tests than Step 15. Record the count: 514 (also generalised the calendar design spec's hard-coded "five statuses" count to `Object.keys(CS).length`)
- `grep -c "status-paused" src/app/calendar/calendar.component.scss src/app/habit-detail/habit-detail.component.scss` gives 1 each

---

### Step 17 — Design checks

**Model:** sonnet — it reads `design/compare/*.png` composites.

**Depends on:** Steps 8, 9, 15 and 16. The dev server must be running (`npm start`).

**Do**
Run the `design-check` agent (`/design-check <name>`) for each of the following, passing the flags shown:
1. `dashboard` with `--seed` (no vacation): this is the regression check. The
   only intended change is the new 🌴 button left of "Overall completion".
2. `dashboard-vacation` with `--seed --seed-vacation`, against the Step 9
   target.
3. `vacation-modal` with `--seed --click "Vacation mode"`, against the Step 9
   target.
4. `calendar` with `--seed --seed-vacation`: confirm the coverage line lists
   `status-paused` as rendered and that the legend shows "Paused". There is no
   prototype target with a vacation, so compare the paused cells against the
   Step 16 spec values only.

Fixes edit only the `.scss` files from Steps 13–16. The agent returns findings
and paths only.

**Done when**
- Each composite is reported as matching, or each residual difference is listed with a reason (e.g. the seed's dates differ from the prototype's Jul 23)
- `TEST` is still green

**If blocked**
If a fix needs a `.ts` or `.html` change, STOP and report it. Don't widen the step.

---

### Step 18 — Regression, docs and wrap-up

**Model:** top-level

**Do**
1. Run `npx ng build` and `TEST`. Record the final count.
2. Walk each acceptance criterion in `Analyst.md` §4 (1–13), and mark each one
   with the test or check that proves it.
3. Update `CLAUDE.md` "Project state" / "Architecture notes" in one line each:
   the vacation store lives in `HabitService` under its own key.
4. `specs/STATE.md`:
   - add **AD-035** (a global vacation record in `HabitService`, half-open,
     kept forever, owned by `HabitService` because of R1);
   - add **AD-036** (`DayStatus` `'paused'` covers manual + vacation, ranks
     after `done`, before `future`);
   - add any `L-NNN` headlines the run produced, with their bodies in
     `specs/LESSONS.md`;
   - update the Phase status.
5. `ROADMAP.md`: close "Can users skip holidays?", pointing to vacation-mode.
6. Fill in the Retrospective in `Analyst.md`.
7. Remove the `## Executing: vacation-mode` line from the root `STATE.md`.
8. **Do not commit. Ask the user first.** Then do the post-code review (Large).

**Done when**
- Every §4 criterion has a named proof, the build and suite are green, and the user has been asked about committing
