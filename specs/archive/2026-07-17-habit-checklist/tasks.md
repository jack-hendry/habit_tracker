# tasks — habit-checklist

Numbered, individually verifiable steps. Implementation follows the harden pass
(`CriticReview.md`). Idiom: standalone + signals + `inject()` + `@if`/`@for`;
`.component.ts` naming and singular `styleUrl` to match the existing
`app.component.ts`.

## 1. `Habit` model — `src/app/habit/habit.model.ts`
- `interface Habit { id: string; name: string; createdAt: string; completedDates: string[]; }`
- `createdAt` is an ISO timestamp; `completedDates` are date-only `YYYY-MM-DD`
  strings in the user's **local** timezone.
- Export an `isHabit(value): value is Habit` type guard (used for corrupt-data
  recovery) that checks id/name are strings, createdAt is a string, and
  completedDates is an array of strings.
- **Verify:** `npm run build` compiles.

## 2. `HabitService` — `src/app/habit/habit.service.ts`
- `@Injectable({ providedIn: 'root' })`, signal-based.
- Storage key `habit_tracker.habits.v1` (versioned).
- Private `_habits = signal<Habit[]>(this.load())`; expose `habits =
  _habits.asReadonly()`.
- `static todayIso(d = new Date()): string` — builds `YYYY-MM-DD` from **local**
  getFullYear/getMonth/getDate (NOT `toISOString`, which is UTC and rolls the
  date near midnight — see CriticReview R1).
- `add(name)`: trim; reject empty/whitespace; create with `crypto.randomUUID()`,
  `new Date().toISOString()`, empty `completedDates`; append; persist.
- `remove(id)`: filter out; persist.
- `toggleToday(id)`: add today's date if absent, remove if present; persist.
- `isDoneToday(habit)`: `completedDates.includes(todayIso())`.
- `load()`: read + `JSON.parse`; if missing/not-an-array/throws → return `[]`;
  filter through `isHabit` so partial corruption drops bad rows, not all data.
- `persist()`: `try/catch` around `setItem` so a full/blocked quota never
  crashes the app (CriticReview R2).
- **Verify:** covered by step 3's specs.

## 3. `HabitService` specs — `src/app/habit/habit.service.spec.ts`
- `beforeEach`: `localStorage.clear()`; construct with `new HabitService()` (not
  TestBed) so each test gets a clean load from a known localStorage state.
- Cases: add appends & rejects whitespace; remove; toggleToday on/off;
  persistence round-trip (new instance reloads the same data); corrupt data
  (`'not json'` and `'{"a":1}'` under the key) loads empty without throwing;
  partial corruption keeps valid rows only; `todayIso` formats a fixed local
  date correctly (e.g. `new Date(2026, 0, 5)` → `2026-01-05`).
- **Verify:** `npm test` — all green.

## 4. `HabitListComponent` — `src/app/habit/habit-list.component.{ts,html,scss}`
- Standalone, `imports: [FormsModule]`, `selector: 'app-habit-list'`.
- `inject(HabitService)`; expose `habits`; `newName = signal('')`.
- `add()` calls service then clears `newName`; wired to button click and
  `keyup.enter`.
- Template: input + Add button; `@if` empty-state message when no habits;
  `@for` (track `habit.id`) list rows with a checkbox reflecting `isDoneToday`
  (calls `toggleToday`) and a delete button.
- Minimal usable SCSS — readable, not designed.
- **Verify:** step 6.

## 5. Route — `src/app/app.routes.ts`
- Default route `''` → `loadComponent(() => import('./habit/habit-list.component'))`.
- **Verify:** `npm run build` compiles.

## 6. Manual acceptance at `localhost:4200`
- Walk all 8 acceptance criteria in `Analyst.md` §4 (add/persist, check/persist,
  uncheck/persist, delete/persist, reject empty, corrupt-data survives, `npm
  test`, `npm run build`).

## 7. Bookkeeping
- Add a Quick Tasks row / feature entry to `STATE.md` (create it if absent).
- Fill the retrospective in `Analyst.md` before archiving.
