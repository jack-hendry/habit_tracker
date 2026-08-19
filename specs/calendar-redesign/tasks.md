# tasks — Redesign §3: Calendar

Plan: `Analyst.md` (read its 🔴 correction banner first).
Harden round: `CriticReview.md` — **it supersedes Analyst §2.5 and §2.8.**
Every value below is already reconciled against the critic; where the Analyst
and the critic disagree, the text here follows the critic. Do not re-derive
values from the Analyst.

Baseline: **236 tests passing** (`npx ng test --watch=false --browsers=ChromeHeadless`,
measured 2026-08-19). Expected at the end: **241** (236 + the 5 specs Step 3 adds).

**All six steps run sequentially.** Steps 4 and 5 both rewrite files that Step
2 and Step 1 set up, and Steps 4/5/6 all read the same component; there is no
pair with disjoint `Files` lists worth a worktree. Do not parallelise.

Before starting: add `## Executing: calendar-redesign` to the **root**
`STATE.md` (two-space-indented examples in that file are not markers — add a
real, unindented one). Remove it when Step 6 finishes.

---

### Step 1 — Add the ten calendar tokens to `src/styles.scss`

**Depends on:** nothing.

**Files**
- MODIFY `src/styles.scss` — anchor: the `/* Habit detail §2b …` comment block, the last group inside `:root`
- DO NOT TOUCH: any file under `src/app/`

**Context**
`src/styles.scss` is the single home for the redesign's visual language
(AD-009); component SCSS may not contain a hex for any value that has a token.
Tokens are grouped by the roadmap section that introduced them, each group
opening with a comment that says *why* the values are not some neighbouring
token — follow the `/* Habit detail §2b … */` block immediately above as the
shape to imitate. **Do not touch `--done-bg`, `--missed-bg` or
`--radius-card-lg`**: the first two are the Dashboard's pale row tints and are
deliberately *not* the calendar's fills (CriticReview R1), and the third
already exists at 10px from habit-detail (R4).

**Do**
1. Append this group inside `:root`, after the `--hero-tile-border` line and
   before the closing brace:

```scss
  /* Calendar §3 — the day-grid palette. Deliberately NOT the dashboard's
     --done-bg / --missed-bg (#f4fbf6 / #fdf4f4): those are pale row tints
     behind a list row, these are saturated fills for a 52px cell
     (CriticReview R1). There is no --cal-off-*: the prototype's sixth 'off'
     state (pre-history days) has no DayStatus in this app and is deliberately
     not adopted (R3). --cal-label is a fourth near-grey, distinct from
     --text / --nav-inactive / --text-sub — do not collapse them (L-012). */
  --cal-label: #3a3f45;
  --cal-done-bg: #dcfce7;
  --cal-missed-bg: #fee2e2;
  --cal-missed-text: #991b1b;
  --cal-not-due: #d1d5db;
  --cal-not-due-bg: #f3f4f6;
  --cal-not-due-text: #9aa1ab;
  --cal-future: #8f95e8;
  --cal-future-bg: #e7eaff;
  --cal-future-text: #4338ca;
```

**Done when**
- `grep -c -- '--cal-' src/styles.scss` prints **10**
- `grep -n -- '--radius-card-lg\|--done-bg\|--missed-bg' src/styles.scss` still
  shows exactly one declaration of each, unchanged
- `npx ng build` succeeds

---

### Step 2 — Add `todayIso`, `dayNumber`, and the `today` class to the component

**Depends on:** nothing (Step 1 touches only `src/styles.scss`), but runs after
it so the SCSS in Step 5 has tokens to consume.

**Files**
- MODIFY `src/app/calendar/calendar.component.ts` — anchors: `private readonly today = new Date();` and `getCellClass`
- DO NOT TOUCH: `src/app/habit/habit.service.ts`, `src/app/habit/habit.model.ts`

**Context**
`HabitService.todayIso(d?: Date)` is a **static** method returning `YYYY-MM-DD`
in local time — call it as `HabitService.todayIso(this.today)`, not on the
injected instance. `this.today` is already captured at construction and already
feeds `monthGrid`, so reusing it keeps one notion of "today" on the page.

The Today ring is orthogonal to status (Analyst §3.5): a `pending`, `done` or
`missed` cell can be today, a `future` or blank one never is. It is returned as
a **second class from `getCellClass`** rather than a separate `[class.today]`
binding, because the cell already carries one `[ngClass]` and this repo pairs
`ngClass` with `class.x` nowhere (CriticReview R10).

`dayNumber` exists because the source renders the unpadded loop integer
(`1 2 3 … 10`) while the template currently renders the zero-padded ISO slice
(`01 02 03 … 10`) — CriticReview R6.

**Do**
1. Below `private readonly today = new Date();`, add:
   ```ts
   /** Today as YYYY-MM-DD, for the Today ring (Analyst §3.5). Derived from the
    *  same `today` that feeds `monthGrid`, so the ring and the statuses cannot
    *  disagree. */
   readonly todayIso = HabitService.todayIso(this.today);
   ```
2. Replace `getCellClass` with:
   ```ts
   /**
    * Cell classes: the status class, plus `today` for the one cell whose date
    * is today. `today` is orthogonal to status — a done, missed or pending
    * cell can be today; a future or blank one cannot (CriticReview R10).
    */
   getCellClass(cell: { iso?: string; status?: string } | { blank: true }): string {
     if ('blank' in cell) {
       return 'blank';
     }
     const status = `status-${cell.status}`;
     return cell.iso === this.todayIso ? `${status} today` : status;
   }
   ```
3. Add below `getCellClass`:
   ```ts
   /** Day-of-month without the leading zero — the prototype renders `1`, not
    *  `01` (CriticReview R6). */
   dayNumber(iso: string): number {
     return Number(iso.slice(8, 10));
   }
   ```

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **236 passing**, no failures
- `grep -n "todayIso\|dayNumber" src/app/calendar/calendar.component.ts` shows
  the new field and the new method
- `grep -n "class.today" src/app/calendar/calendar.component.html` returns
  **nothing** (the ring must not also be a separate binding)

**If blocked**
If `HabitService.todayIso` is not static, STOP and report — every call site in
the service uses `HabitService.todayIso(...)`, so a non-static one means the
file being edited is not the one this step describes.

---

### Step 3 — Create `calendar.component.spec.ts`

**Depends on:** Step 2 — asserts on `todayIso`, `dayNumber` and the `today`
class it adds.

**Files**
- CREATE `src/app/calendar/calendar.component.spec.ts`
- DO NOT TOUCH: any other spec file

**Context**
The calendar component has **never had a spec** (CriticReview R9). Follow
`src/app/dashboard/dashboard.component.spec.ts` for the plain-`TestBed` shape —
this component has no route parameter, so it does **not** need
`RouterTestingHarness` (that pattern belongs to `habit-detail`, which reads
`:id`). `localStorage.clear()` in `beforeEach` is mandatory: `HabitService`
persists to localStorage and specs otherwise leak habits into each other.

Assert on `getCellClass`'s **return value**, not on rendered DOM — it is a pure
function of the cell and the assertions stay readable.

**Do**
1. Create the file with:

```ts
import { TestBed } from '@angular/core/testing';
import { CalendarComponent } from './calendar.component';
import { HabitService } from '../habit/habit.service';

describe('CalendarComponent', () => {
  let component: CalendarComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [CalendarComponent] });
    component = TestBed.createComponent(CalendarComponent).componentInstance;
  });

  it('getCellClass returns "blank" for a padding cell', () => {
    expect(component.getCellClass({ blank: true })).toBe('blank');
  });

  it('getCellClass returns the status class for each DayStatus', () => {
    for (const status of ['done', 'missed', 'pending', 'not-due', 'future']) {
      expect(component.getCellClass({ iso: '1999-01-01', status })).toBe(`status-${status}`);
    }
  });

  // AC 7. The ring is orthogonal to status: today's cell gets `today` on top of
  // whatever status it has, and no other cell does (CriticReview R10).
  it('getCellClass adds "today" only to the cell whose iso is today', () => {
    const todayIso = component.todayIso;
    expect(component.getCellClass({ iso: todayIso, status: 'pending' })).toBe('status-pending today');
    expect(component.getCellClass({ iso: '1999-01-01', status: 'missed' })).toBe('status-missed');
  });

  it('todayIso is the local calendar date, not a UTC-shifted one', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(component.todayIso).toBe(expected);
    expect(component.todayIso).toBe(HabitService.todayIso());
  });

  // CriticReview R6 — the prototype renders `1`, not `01`.
  it('dayNumber strips the leading zero', () => {
    expect(component.dayNumber('2026-07-01')).toBe(1);
    expect(component.dayNumber('2026-07-09')).toBe(9);
    expect(component.dayNumber('2026-07-23')).toBe(23);
  });
});
```

**Done when**
- `npx ng test --watch=false --browsers=ChromeHeadless` → **241 passing**
  (236 + the 5 `it` blocks above), no failures

**If blocked**
If `TestBed.createComponent(CalendarComponent)` throws on a missing provider,
STOP and report — `HabitService` is `providedIn: 'root'` and needs no explicit
provider; a failure here means the service's registration changed.

---

### Step 4 — Restructure the template: one row, one card, two grids, six legend items

**Depends on:** Step 2 — calls `dayNumber(cell.iso)`.

**Files**
- MODIFY `src/app/calendar/calendar.component.html` (full rewrite of the `@else` branch)
- DO NOT TOUCH: `src/app/calendar/calendar.component.ts`, `src/app/calendar/calendar.component.scss`

**Context**
Four structural changes, all sampled from the prototype source:

1. The selector and the selected-habit strip are **one** flex row, not two
   stacked divs (CriticReview R5).
2. Month-nav, the grids and the legend move inside **one** `.calendar-card`
   (Analyst §3.2) — today they are three separately-boxed pieces.
3. The weekday headers become their **own** grid, not `display:contents` inside
   the day grid (CriticReview R7).
4. The legend gains a **sixth** item, `Today`, and its swatch classes are
   renamed `status-*` → `swatch-*` so they no longer share names with the cell
   status classes they are no longer identical to.

The page will look *worse* after this step and correct after Step 5 — the SCSS
still targets the old structure. That is expected; do not chase it here.

The Phase-4a invariant must survive the merge: the habit's colour and icon
identify the habit in the selector row only, and **never** tint a day cell
(`habit-metadata` CriticReview R8). Keep that comment.

**Do**
1. Replace the whole file with:

```html
<div class="calendar-container">
  <div class="calendar-header">
    <h1>Calendar</h1>

    @if (habits().length === 0) {
      <div class="empty-state">
        <p>Add a habit first.</p>
      </div>
    } @else {
      <!-- Phase 4a: habit colour/icon identify the selected habit here only.
           Day cells keep their status colouring untouched (habit-metadata
           CriticReview R8). Selector and identity are ONE flex row in the
           prototype source (calendar-redesign CriticReview R5). -->
      <div class="habit-selector">
        <label for="habit-select">Select habit:</label>
        <select
          id="habit-select"
          [ngModel]="selectedHabit()?.id"
          (ngModelChange)="onHabitChange($event)"
          class="select"
        >
          @for (habit of habits(); track habit.id) {
            <option [value]="habit.id">{{ iconGlyph(habit) }} {{ habit.name }}</option>
          }
        </select>

        @if (selectedHabit(); as habit) {
          <span class="habit-dot" [style.background-color]="colorHex(habit)"></span>
          <span class="habit-icon" aria-hidden="true">{{ iconGlyph(habit) }}</span>
          <span class="selected-habit-name">{{ habit.name }}</span>
          @if (habit.category) {
            <span class="category-chip">{{ habit.category }}</span>
          }
        }
      </div>

      <!-- Nav, both grids and the legend share ONE card (Analyst §3.2). -->
      <div class="calendar-card">
        <div class="month-nav">
          <button (click)="prevMonth()" class="nav-button">← Prev</button>
          <h2 class="month-label">{{ monthLabel() }}</h2>
          <button (click)="nextMonth()" class="nav-button">Next →</button>
        </div>

        <div class="weekday-headers">
          @for (day of weekdayHeaders; track day) {
            <div class="weekday-header">{{ day }}</div>
          }
        </div>

        <div class="calendar-grid">
          @for (cell of monthGrid(); track $index) {
            <div class="cell" [ngClass]="getCellClass(cell)">
              @if (!('blank' in cell) && cell.iso) {
                <span class="day-number">{{ dayNumber(cell.iso) }}</span>
              }
            </div>
          }
        </div>

        <div class="legend">
          <div class="legend-item">
            <div class="legend-swatch swatch-done"></div>
            <span>Done</span>
          </div>
          <div class="legend-item">
            <div class="legend-swatch swatch-pending"></div>
            <span>Pending</span>
          </div>
          <div class="legend-item">
            <div class="legend-swatch swatch-missed"></div>
            <span>Missed</span>
          </div>
          <div class="legend-item">
            <div class="legend-swatch swatch-not-due"></div>
            <span>Not scheduled</span>
          </div>
          <div class="legend-item">
            <div class="legend-swatch swatch-future"></div>
            <span>Future</span>
          </div>
          <div class="legend-item">
            <div class="legend-swatch swatch-today"></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    }
  </div>
</div>
```

**Done when**
- `grep -c "legend-item" src/app/calendar/calendar.component.html` prints **6**
- `grep -n "selected-habit\"" src/app/calendar/calendar.component.html` returns
  **nothing** (the separate strip div is gone; `selected-habit-name` remains)
- `grep -n "display: contents\|slice: 0 : 2" src/app/calendar/calendar.component.html` returns nothing
- `npx ng test --watch=false --browsers=ChromeHeadless` → **241 passing**

---

### Step 5 — Rewrite `calendar.component.scss` to the sampled values

**Depends on:** Step 1 (the ten tokens) and Step 4 (the new class names
`.calendar-card`, `.swatch-*`, and `.weekday-headers` as a real grid).

**Files**
- MODIFY `src/app/calendar/calendar.component.scss` (full rewrite)
- DO NOT TOUCH: `src/styles.scss`, the template, the component

**Context**
Every colour must come from a token — AC 3 greps this **whole file** for hexes
and `rgba()` and expects nothing (AD-009). `transparent` is a keyword and
passes the grep.

Three traps:

- **Do not add `box-sizing: border-box` to the legend swatches.** There is no
  global reset in `src/styles.scss` (three components set it locally), so the
  Today swatch — `14×14` with a `2px` border against the other five's `1px` —
  renders 18×18 next to 16×16. That asymmetry is what the source produces and
  what the mockup shows (CriticReview R13).
- **Blank cells are `transparent`, not a grey fill** (CriticReview R2). This is
  also what makes `monthGrid`'s trailing padding cells — which the prototype
  does not generate — invisible. Do not "fix" that by trimming them.
- **Delete the `.nav-button:hover` rule.** It greys the button on hover, which
  now contradicts its white rest state; the source has no hover styling at all
  (CriticReview R12). `cursor: pointer` stays.

**Do**
1. Replace the whole file with:

```scss
.calendar-container {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--content-pad);
}

.calendar-header h1 {
  margin: 0 0 18px;
  font-size: 23px;
  letter-spacing: -0.3px;
  color: var(--text-strong);
}

// No mockup exists for the empty state (the prototype always has data). Only
// the hardcoded grey is changed, so AC 3's hex grep passes (CriticReview R13).
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--text-sub);

  p {
    margin: 0;
    font-size: 1.125rem;
  }
}

// One row: label, select, dot, glyph, name, category chip (CriticReview R5).
.habit-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  label {
    font-size: 13px;
    font-weight: 600;
    color: var(--cal-label);
  }

  .select {
    padding: 8px 10px;
    background: var(--surface);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
    font-size: 13px;
    font-family: inherit;
    color: var(--text-strong);
  }
}

.habit-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
}

.habit-icon {
  font-size: 14px;
  line-height: 1;
}

.selected-habit-name {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-strong);
}

.category-chip {
  background: var(--chip-bg);
  color: var(--text);
  font-weight: 500;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  font-size: 11.5px;
}

// Nav, both grids and the legend live in ONE card (Analyst §3.2). The 10px
// radius is --radius-card-lg, shared with habit-detail — not --radius-card.
.calendar-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card-lg);
  padding: 18px 20px;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;

  // No hover rule: the source has none, and the old grey hover fights the
  // white rest state (CriticReview R12). Prev/Next are never disabled — the
  // prototype's grey-out is an artifact of its 5-month fake dataset and is
  // deliberately not adopted (Analyst §3.6).
  .nav-button {
    padding: 6px 12px;
    background: var(--surface);
    border: 1px solid var(--control-border);
    border-radius: var(--radius-control);
    font-size: 12px;
    font-family: inherit;
    color: var(--text);
    cursor: pointer;
  }

  .month-label {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--text-strong);
  }
}

// Two sibling grids with different bottom margins, not one grid with
// `display: contents` (CriticReview R7).
.weekday-headers {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 4px;
}

.weekday-header {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  padding: 4px 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 14px;
}

// Three properties per status, not two: background, border-left AND the day
// number's own colour (Analyst §3.3, CriticReview's corrected cell table).
.cell {
  min-height: 52px;
  border-radius: 4px;
  position: relative;

  .day-number {
    position: absolute;
    top: 5px;
    right: 7px;
    font-size: 11px;
    font-weight: 600;
  }

  // Padding cells are fully transparent in the source — which is also why
  // monthGrid's trailing blanks (the prototype generates none) are invisible
  // rather than a row of grey tiles (CriticReview R2).
  &.blank {
    background: transparent;
    border-left: 3px solid transparent;
  }

  &.status-done {
    background: var(--cal-done-bg);
    border-left: 3px solid var(--done);

    .day-number {
      color: var(--done-text);
    }
  }

  &.status-pending {
    background: var(--pending-bg);
    border-left: 3px solid var(--pending);

    .day-number {
      color: var(--pending-text);
    }
  }

  &.status-missed {
    background: var(--cal-missed-bg);
    border-left: 3px solid var(--missed);

    .day-number {
      color: var(--cal-missed-text);
    }
  }

  &.status-not-due {
    background: var(--cal-not-due-bg);
    border-left: 3px solid var(--cal-not-due);

    .day-number {
      color: var(--cal-not-due-text);
    }
  }

  &.status-future {
    background: var(--cal-future-bg);
    border-left: 3px solid var(--cal-future);

    .day-number {
      color: var(--cal-future-text);
    }
  }

  // Orthogonal to status (Analyst §3.5). A box-shadow, not a border: a border
  // would shift the cell's contents by its width.
  &.today {
    box-shadow: 0 0 0 2px var(--accent);
  }
}

.legend {
  display: flex;
  gap: 16px;
  font-size: 11.5px;
  color: var(--text-sub);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

// No box-sizing here on purpose: with no global reset, the 2px Today swatch
// renders 18x18 against the others' 16x16, which is what the source and the
// mockup show (CriticReview R13).
.legend-swatch {
  width: 14px;
  height: 14px;
  border-radius: 3px;
}

.swatch-done {
  background: var(--cal-done-bg);
  border: 1px solid var(--done);
}

.swatch-pending {
  background: var(--pending-bg);
  border: 1px solid var(--pending);
}

.swatch-missed {
  background: var(--cal-missed-bg);
  border: 1px solid var(--missed);
}

.swatch-not-due {
  background: var(--cal-not-due-bg);
  border: 1px solid var(--cal-not-due);
}

.swatch-future {
  background: var(--cal-future-bg);
  border: 1px solid var(--cal-future);
}

.swatch-today {
  background: var(--surface);
  border: 2px solid var(--accent);
}
```

**Done when**
- `grep -nE '#[0-9a-fA-F]{3,6}|rgba?\(' src/app/calendar/calendar.component.scss`
  returns **nothing** (AC 3)
- `grep -n "box-sizing\|:hover" src/app/calendar/calendar.component.scss`
  returns **nothing**
- `npx ng build` succeeds with no new budget warning for
  `calendar.component.scss`
- `npx ng test --watch=false --browsers=ChromeHeadless` → **241 passing**

---

### Step 6 — Design check against `design/target/calendar.png`

**Depends on:** Steps 1–5.

**Files**
- MODIFY (only if the comparison finds a gap) `src/app/calendar/calendar.component.scss`
- DO NOT TOUCH: `specs/` (the retrospective is written by the archive ritual, not here)

**Context**
`design/target/calendar.png` was captured at 1440 CSS px — pass `--width 1440`
or breakpoint differences will read as design bugs. `--seed` is mandatory:
without it the store is empty, the page renders the empty state, and the
comparison is worthless. The dev server must already be running.

Read **only** `design/compare/calendar.png` (the composite), one image per
round. Anything that looks off is then **measured** against the target, never
re-judged by eye (L-011).

**Do**
1. Start the dev server if it is not running: `npm start`.
2. `npm run design:shot -- calendar --width 1440 --seed`
3. Open `design/compare/calendar.png` and check, in this order:
   - one card around nav + grids + legend, 10px radius
   - `future` cells are the pale lavender `#e7eaff`, not the old bluer `#e0e7ff`
   - day numbers are per-status coloured and **unpadded** (`1`, not `01`)
   - today's cell has a 2px blue ring, and no other cell does
   - the legend has six items, the sixth an unfilled 2px-blue swatch
   - blank padding cells are invisible against the card
4. Fix any gap in the SCSS only. If a gap needs a template or component change,
   STOP and report — that is a spec miss, not an implementation detail.

**Done when**
- `design/compare/calendar.png` exists and the six checks above pass
- `npx ng test --watch=false --browsers=ChromeHeadless` → **241 passing**
- `npx ng build` succeeds
- The `## Executing: calendar-redesign` line is removed from the root `STATE.md`

**If blocked**
If `npm run design:shot` cannot reach the dev server, STOP and report rather
than shooting against a stale build — a comparison against the wrong bundle is
worse than no comparison.

---

## Not in this run

Per `Analyst.md` §4 Out, and not to be attempted by any step:

- Bounding month navigation to a fixed range (§3.6).
- A sixth `DayStatus` for the prototype's `off` state (CriticReview R3).
- Trimming `monthGrid`'s trailing blank cells (CriticReview R2b).
- Hover / focus / error states, responsive behaviour, any data-model change.
- Dashboard, Habits, Analytics, Stacks.
- **Committing.** Ask first.
