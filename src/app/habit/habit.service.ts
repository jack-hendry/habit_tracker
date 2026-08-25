import { Injectable, signal, computed } from '@angular/core';
import { Habit, HabitPatch, Schedule, isHabit, isSchedule, DayStatus, ISO_DATE, PausedRange } from './habit.model';

/**
 * Client-side habit store, persisted to localStorage (no backend, no accounts,
 * single device). Signal-based so components read `habits` reactively.
 *
 * Phase 2 adds scheduling + streaks. "Was the habit due on date D?" is the
 * foundation both features share — every streak number is defined in terms of it.
 */
@Injectable({ providedIn: 'root' })
export class HabitService {
  /** Versioned so future shape changes can migrate — legacy rows migrate in place. */
  private static readonly STORAGE_KEY = 'habit_tracker.habits.v1';

  private readonly _habits = signal<Habit[]>(this.load());
  readonly habits = this._habits.asReadonly();

  /**
   * Habits excluding archived ones. Components should use this by default;
   * `habits()` is reserved for the archived view and tests (habit-lifecycle
   * CriticReview R10).
   */
  readonly activeHabits = computed(() => this._habits().filter((h) => h.status !== 'archived'));

  /**
   * Distinct categories in use from active habits only, deduped
   * **case-insensitively** so "Health" and "health" are one entry, keeping the
   * first-seen casing (CriticReview R5). Archived habits do not contribute to
   * the filter dropdown (R10 — leaving an archived habit's category there means
   * it lingers forever in the dropdown).
   */
  readonly categories = computed(() => {
    const seen = new Map<string, string>();
    for (const habit of this.activeHabits()) {
      if (habit.category) {
        const key = habit.category.toLowerCase();
        if (!seen.has(key)) {
          seen.set(key, habit.category);
        }
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  });

  /**
   * Today's calendar date as `YYYY-MM-DD` in the user's **local** timezone.
   * Deliberately not `toISOString()`, which is UTC and would misattribute
   * evening/early-morning completions to the wrong day.
   * `static` + injectable date so specs can pin a fixed day.
   */
  static todayIso(d: Date = new Date()): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * The habit's start date as `YYYY-MM-DD` (local). For new habits, this is
   * `startDate`. For legacy habits (pre-4b), it is backfilled from `createdAt`'s
   * local date in `load()` (habit-lifecycle CriticReview R7). This function
   * guards both cases: it reads `startDate` if set, or computes from `createdAt`
   * as a fallback for habits constructed in memory. All five derivations
   * (`isDueOn`, `currentStreak`, `longestStreak`, `completionRate`, `isLapsed`)
   * use this single computation so the boundary cannot drift (R7).
   */
  private static startIso(habit: Habit): string {
    return habit.startDate ?? HabitService.todayIso(new Date(habit.createdAt));
  }

  /**
   * Local weekday (0=Sun … 6=Sat) of a `YYYY-MM-DD` string. Constructs the date
   * from split parts — `new Date(iso)` parses as UTC midnight and returns the
   * wrong weekday in negative-offset timezones (CriticReview R2).
   */
  private static weekdayOf(iso: string): number {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  }

  /** The `YYYY-MM-DD` one calendar day before `iso` (timezone-safe). */
  private static prevIso(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return HabitService.todayIso(new Date(y, m - 1, d - 1));
  }

  /** Add a habit. Empty/whitespace names and empty `weekdays` schedules are rejected. */
  add(name: string, schedule: Schedule = { type: 'daily' }): Habit | null {
    const trimmed = name.trim();
    if (!trimmed || !isSchedule(schedule)) {
      return null;
    }
    const now = new Date();
    const habit: Habit = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: now.toISOString(),
      completedDates: [],
      schedule,
      startDate: HabitService.todayIso(now),
    };
    this._habits.update((list) => [...list, habit]);
    this.persist();
    return habit;
  }

  /**
   * Edit a habit's name, schedule, metadata (Phase 4a), or start date (Phase 4b).
   * The only mutation that is not add/remove/toggle.
   *
   * Validation is **atomic** (CriticReview R2, habit-lifecycle R3): every key
   * present in the patch is checked before anything is applied, so a patch with a
   * good `name` and a malformed `startDate` changes nothing at all rather than
   * half-applying a rename the user never asked for on its own.
   *
   * `HabitPatch` cannot express `id`/`createdAt`/`completedDates`/`status`/
   * `pausedRanges`, so editing provably cannot rewrite identity or history
   * (CriticReview R1, habit-lifecycle R3).
   *
   * Note the asymmetry (CriticReview R4): `name` is *required-and-validated* —
   * a blank one rejects the call — whereas the prose metadata fields are
   * *trimmed-then-cleared*, with an empty result stored as `undefined` so that
   * "cleared it" and "never had one" are the same state (CriticReview R3).
   */
  update(id: string, patch: HabitPatch): void {
    const existing = this._habits().find((h) => h.id === id);
    if (!existing) {
      return;
    }

    // Validate everything first — no mutation, no persist, if anything fails.
    if (patch.name !== undefined && !patch.name.trim()) {
      return;
    }
    if (patch.schedule !== undefined && !isSchedule(patch.schedule)) {
      return;
    }
    if (patch.startDate !== undefined && !ISO_DATE.test(patch.startDate)) {
      return;
    }

    // Trimmed prose: empty result clears the field rather than storing ''.
    const clean = (value: string | undefined, fallback: string | undefined) =>
      value === undefined ? fallback : value.trim() || undefined;

    const schedule = patch.schedule ?? existing.schedule;

    const updated: Habit = {
      ...existing,
      name: patch.name !== undefined ? patch.name.trim() : existing.name,
      // Sort weekdays ascending so display is stable regardless of click order
      // (scheduling-streaks CriticReview R9).
      schedule:
        schedule.type === 'weekdays'
          ? { type: 'weekdays', days: [...schedule.days].sort((a, b) => a - b) }
          : schedule,
      description: clean(patch.description, existing.description),
      category: clean(patch.category, existing.category),
      notes: clean(patch.notes, existing.notes),
      // Palette ids, not prose — stored as given, empty string clears.
      color: patch.color === undefined ? existing.color : patch.color || undefined,
      icon: patch.icon === undefined ? existing.icon : patch.icon || undefined,
      startDate: patch.startDate === undefined ? existing.startDate : patch.startDate,
    };

    this._habits.update((list) => list.map((h) => (h.id === id ? updated : h)));
    this.persist();
  }

  remove(id: string): void {
    this._habits.update((list) => list.filter((h) => h.id !== id));
    this.persist();
  }

  /** Toggle whether the habit is completed for today. */
  toggleToday(id: string): void {
    const today = HabitService.todayIso();
    this._habits.update((list) =>
      list.map((h) => {
        if (h.id !== id) {
          return h;
        }
        const done = h.completedDates.includes(today);
        return {
          ...h,
          completedDates: done
            ? h.completedDates.filter((date) => date !== today)
            : [...h.completedDates, today],
        };
      }),
    );
    this.persist();
  }

  isDoneToday(habit: Habit): boolean {
    return habit.completedDates.includes(HabitService.todayIso());
  }

  /**
   * Is `iso` inside any pause range? Uses half-open interval logic (habit-lifecycle
   * CriticReview R2): a range is `[from, to)`, so `iso` is paused iff
   * `from <= iso` and (`to` is null or `iso < to`).
   */
  isPausedOn(habit: Habit, iso: string): boolean {
    return (habit.pausedRanges ?? []).some((r) => r.from <= iso && (r.to === null || iso < r.to));
  }

  /**
   * Is the habit paused right now? Convenience for the UI.
   */
  isPaused(habit: Habit, today: Date = new Date()): boolean {
    return this.isPausedOn(habit, HabitService.todayIso(today));
  }

  /**
   * Pause the habit, starting today. Appends a new open pause range `{ from:
   * todayIso(), to: null }`. No-op if already paused or archived.
   */
  pause(id: string): void {
    const habit = this._habits().find((h) => h.id === id);
    if (!habit) {
      return;
    }
    if (this.isPaused(habit) || habit.status === 'archived') {
      return;
    }
    const today = HabitService.todayIso();
    const updated = {
      ...habit,
      pausedRanges: [...(habit.pausedRanges ?? []), { from: today, to: null }],
    };
    this._habits.update((list) => list.map((h) => (h.id === id ? updated : h)));
    this.persist();
  }

  /**
   * Resume the habit by closing the open pause range with `to = todayIso()`.
   * No-op if not paused.
   */
  resume(id: string): void {
    const habit = this._habits().find((h) => h.id === id);
    if (!habit) {
      return;
    }
    const ranges = habit.pausedRanges ?? [];
    const openIndex = ranges.findIndex((r) => r.to === null);
    if (openIndex === -1) {
      return;
    }
    const today = HabitService.todayIso();
    const newRanges = [...ranges];
    newRanges[openIndex] = { from: newRanges[openIndex].from, to: today };
    const updated = { ...habit, pausedRanges: newRanges };
    this._habits.update((list) => list.map((h) => (h.id === id ? updated : h)));
    this.persist();
  }

  /**
   * Archive the habit. First closes any open pause range, then opens a fresh one
   * covering the archived stretch (habit-lifecycle CriticReview R5, R6), and sets
   * `status: 'archived'`. No-op if already archived.
   */
  archive(id: string): void {
    const habit = this._habits().find((h) => h.id === id);
    if (!habit) {
      return;
    }
    if (habit.status === 'archived') {
      return;
    }
    const ranges = [...(habit.pausedRanges ?? [])];
    const openIndex = ranges.findIndex((r) => r.to === null);
    if (openIndex !== -1) {
      const today = HabitService.todayIso();
      ranges[openIndex] = { from: ranges[openIndex].from, to: today };
    }
    const today = HabitService.todayIso();
    ranges.push({ from: today, to: null });
    const updated = { ...habit, pausedRanges: ranges, status: 'archived' as const };
    this._habits.update((list) => list.map((h) => (h.id === id ? updated : h)));
    this.persist();
  }

  /**
   * Reactivate an archived habit. Closes the open pause range (which covers the
   * archived stretch) and sets `status: 'active'`. No-op if not archived.
   */
  reactivate(id: string): void {
    const habit = this._habits().find((h) => h.id === id);
    if (!habit) {
      return;
    }
    if (habit.status !== 'archived') {
      return;
    }
    const ranges = [...(habit.pausedRanges ?? [])];
    const openIndex = ranges.findIndex((r) => r.to === null);
    if (openIndex !== -1) {
      const today = HabitService.todayIso();
      ranges[openIndex] = { from: ranges[openIndex].from, to: today };
    }
    const updated = { ...habit, pausedRanges: ranges, status: 'active' as const };
    this._habits.update((list) => list.map((h) => (h.id === id ? updated : h)));
    this.persist();
  }

  /**
   * Was the habit due (scheduled) on `iso`? False before the habit's start date
   * (habit-lifecycle CriticReview R8), inside any pause range (R2), or if the
   * date doesn't match the schedule. Clauses ordered `startDate` → pause →
   * schedule: a day before the habit existed is not-due regardless of every
   * other consideration.
   */
  isDueOn(habit: Habit, iso: string): boolean {
    if (iso < HabitService.startIso(habit)) {
      return false;
    }
    if (this.isPausedOn(habit, iso)) {
      return false;
    }
    return habit.schedule.type === 'daily'
      ? true
      : habit.schedule.days.includes(HabitService.weekdayOf(iso));
  }

  /**
   * Current streak: consecutive **due** days, walking backward from today, that
   * were completed. Non-due days are skipped (no penalty). The first missed due
   * day stops the count. Grace scoped to today only (CriticReview R3): if today
   * is due but not yet completed, the day isn't over, so it is skipped rather
   * than breaking the streak. Bounded below by the start date (habit-lifecycle
   * CriticReview R7).
   */
  currentStreak(habit: Habit, today: Date = new Date()): number {
    const todayIso = HabitService.todayIso(today);
    const startIso = HabitService.startIso(habit);
    const completed = new Set(habit.completedDates);

    let count = 0;
    let cursor = todayIso;
    while (cursor >= startIso) {
      if (this.isDueOn(habit, cursor)) {
        const done = completed.has(cursor);
        if (!done) {
          // Today not-yet-done doesn't break the streak; any earlier miss does.
          if (cursor !== todayIso) {
            break;
          }
        } else {
          count++;
        }
      }
      cursor = HabitService.prevIso(cursor);
    }
    return count;
  }

  /**
   * Longest run of consecutive completed **due** days between the start date and
   * today (inclusive). Survives a current-streak reset.
   */
  longestStreak(habit: Habit, today: Date = new Date()): number {
    const todayIso = HabitService.todayIso(today);
    const startIso = HabitService.startIso(habit);
    const completed = new Set(habit.completedDates);

    let best = 0;
    let run = 0;
    let cursor = startIso;
    while (cursor <= todayIso) {
      if (this.isDueOn(habit, cursor)) {
        if (completed.has(cursor)) {
          run++;
          best = Math.max(best, run);
        } else {
          run = 0;
        }
      }
      cursor = HabitService.nextIso(cursor);
    }
    return best;
  }

  /** The `YYYY-MM-DD` one calendar day after `iso` (timezone-safe). */
  private static nextIso(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return HabitService.todayIso(new Date(y, m - 1, d + 1));
  }

  /**
   * Status of a habit on a given day. One of: 'not-due' (not scheduled or
   * before creation), 'done' (in completedDates), 'missed' (due, not done, past),
   * 'pending' (due, not done, today), 'future' (after today). Order matters
   * (CriticReview R1): future → done → not-due → pending → missed.
   */
  dayStatus(habit: Habit, iso: string, todayDate: Date = new Date()): DayStatus {
    const todayIso = HabitService.todayIso(todayDate);

    // 1. Future: iso > today
    if (iso > todayIso) {
      return 'future';
    }

    // 2. Done: iso in completedDates (including off-schedule completions)
    if (habit.completedDates.includes(iso)) {
      return 'done';
    }

    // 3. Not due: habit not due on this day (or before creation)
    if (!this.isDueOn(habit, iso)) {
      return 'not-due';
    }

    // 4. Pending: due today, not completed
    if (iso === todayIso) {
      return 'pending';
    }

    // 5. Missed: due, not done, past day
    return 'missed';
  }

  /**
   * Completion rate as a number 0..1 (component formats as %). Numerator = due
   * days with status 'done'. Denominator = due days with status 'done' or
   * 'missed' (excludes pending today and any future). Denominator 0 → return 1
   * (nothing owed = perfect; CriticReview R3).
   */
  completionRate(habit: Habit, today: Date = new Date()): number {
    const todayIso = HabitService.todayIso(today);
    const startIso = HabitService.startIso(habit);

    let completed = 0;
    let countable = 0;

    let cursor = startIso;
    while (cursor <= todayIso) {
      if (this.isDueOn(habit, cursor)) {
        const status = this.dayStatus(habit, cursor, today);
        if (status === 'done') {
          completed++;
          countable++;
        } else if (status === 'missed') {
          countable++;
        }
        // 'pending' today is excluded; 'not-due' and 'future' never occur in this range
      }
      cursor = HabitService.nextIso(cursor);
    }

    // No due days yet → 100% (nothing owed)
    if (countable === 0) {
      return 1;
    }

    return completed / countable;
  }

  /**
   * The `YYYY-MM-DD` `days` calendar days after `iso` (negative counts back).
   * Timezone-safe: built from split parts, never parsed from the ISO string
   * (AD-003). Public because the Dashboard derives its stat windows from it.
   */
  static shiftIso(iso: string, days: number): string {
    const [y, m, d] = iso.split('-').map(Number);
    return HabitService.todayIso(new Date(y, m - 1, d + days));
  }

  /**
   * The earliest start date across `habits`, or null for an empty list. Used as
   * the lower bound of "all history" windows so the caller never has to guess
   * one (an unguarded loop bound is a hung tab, not a test failure —
   * dashboard-redesign CriticReview R11).
   */
  earliestStartIso(habits: Habit[]): string | null {
    if (habits.length === 0) {
      return null;
    }
    return habits
      .map((h) => HabitService.startIso(h))
      .reduce((min, iso) => (iso < min ? iso : min));
  }

  /**
   * Pooled completion counts over the inclusive window `[fromIso, toIso]`,
   * across all of `habits`. One definition of "completion rate" for the whole
   * Dashboard (Analyst §3.1): the caller divides `done / countable` and decides
   * what `countable === 0` should render as.
   *
   * Same contract as `completionRate`, pooled: numerator = due days that are
   * `done`; denominator = due days that are `done` or `missed`. A `pending`
   * today is in neither — the day is not over.
   *
   * The `isDueOn` guard must stay ahead of the `dayStatus` call: `dayStatus`
   * reports `'done'` before `'not-due'`, so an off-schedule completion would
   * otherwise inflate the numerator alone (CriticReview R1).
   */
  poolCounts(
    habits: Habit[],
    fromIso: string,
    toIso: string,
    today: Date = new Date(),
  ): { done: number; countable: number } {
    let done = 0;
    let countable = 0;
    if (habits.length === 0 || !ISO_DATE.test(fromIso) || !ISO_DATE.test(toIso)) {
      return { done, countable };
    }

    let cursor = fromIso;
    while (cursor <= toIso) {
      for (const habit of habits) {
        if (this.isDueOn(habit, cursor)) {
          const status = this.dayStatus(habit, cursor, today);
          if (status === 'done') {
            done++;
            countable++;
          } else if (status === 'missed') {
            countable++;
          }
        }
      }
      cursor = HabitService.nextIso(cursor);
    }

    return { done, countable };
  }

  /**
   * The length of the Sunday-aligned 18-week window ending today. 17 full weeks
   * plus the current partial week means the window's first day is always a
   * Sunday, which is what makes the 7-row grid's rows align to weekdays.
   * Range is 120–126.
   */
  activityWindowDays(today: Date = new Date()): number {
    return 17 * 7 + new Date(today).getDay() + 1;
  }

  /**
   * Completion counts for a single habit across its entire lifetime (from start
   * date to today). Uses the standard due-day contract: numerator = due days
   * that are `done`; denominator = due days that are `done` or `missed`.
   * If the habit has no resolved due day, returns `{ done: 0, countable: 0 }`.
   */
  lifetimeCounts(habit: Habit, today: Date = new Date()): { done: number; countable: number } {
    const fromIso = this.earliestStartIso([habit]);
    if (fromIso === null) {
      return { done: 0, countable: 0 };
    }
    return this.poolCounts([habit], fromIso, HabitService.todayIso(today), today);
  }

  /**
   * Completion counts for a single habit within a specific calendar month,
   * clamped at today (so a mid-month `today` does not count the rest of the
   * month as missed). Month is 0-based (JS convention, matching `monthGrid`).
   * If the whole month is in the future, `from > to` and `poolCounts` returns
   * zeros — that is correct, not a case to special-case.
   */
  monthToDateCounts(habit: Habit, year: number, month: number, today: Date = new Date()): { done: number; countable: number } {
    const firstOfMonth = HabitService.todayIso(new Date(year, month, 1));
    const lastOfMonth = HabitService.todayIso(new Date(year, month + 1, 0));
    const todayIso = HabitService.todayIso(today);
    const toIso = todayIso < lastOfMonth ? todayIso : lastOfMonth;
    return this.poolCounts([habit], firstOfMonth, toIso, today);
  }

  /**
   * Days on which **at least one** habit was due and **every** habit that was
   * due was completed, from the earliest start date through today inclusive.
   *
   * The `anyDue` guard is what stops a day where nothing was scheduled from
   * counting as a triumph. Today counts only if everything due today is already
   * done — there is no grace, because a day that counts before it is finished
   * would tick back down at midnight (Analyst §3.3).
   */
  perfectDays(habits: Habit[], today: Date = new Date()): number {
    const fromIso = this.earliestStartIso(habits);
    if (fromIso === null) {
      return 0;
    }
    const toIso = HabitService.todayIso(today);

    let count = 0;
    let cursor = fromIso;
    while (cursor <= toIso) {
      let anyDue = false;
      let allDone = true;
      for (const habit of habits) {
        if (this.isDueOn(habit, cursor)) {
          anyDue = true;
          if (!habit.completedDates.includes(cursor)) {
            allDone = false;
          }
        }
      }
      if (anyDue && allDone) {
        count++;
      }
      cursor = HabitService.nextIso(cursor);
    }
    return count;
  }

  /**
   * The habit with the longest **currently running** streak, with that streak.
   * Returns null when no habit has one — the card must then show `0 days` with
   * no owner rather than crediting whichever habit happens to sort first
   * (dashboard-redesign CriticReview R3). Ties keep the earlier habit.
   */
  topCurrentStreak(
    habits: Habit[],
    today: Date = new Date(),
  ): { habit: Habit; streak: number } | null {
    let best: { habit: Habit; streak: number } | null = null;
    for (const habit of habits) {
      const streak = this.currentStreak(habit, today);
      if (streak > 0 && (best === null || streak > best.streak)) {
        best = { habit, streak };
      }
    }
    return best;
  }

  /**
   * How many habits are **due** today and how many of those are done. Both
   * numbers come from the due-today set on purpose: `doneToday` on the
   * Dashboard also lists habits ticked off-schedule (habit-lifecycle R9), and
   * counting those would print "6 of 5 done" (Analyst §3.5).
   */
  dueTodayCounts(habits: Habit[], today: Date = new Date()): { due: number; done: number } {
    const todayIso = HabitService.todayIso(today);
    const dueHabits = habits.filter((h) => this.isDueOn(h, todayIso));
    return {
      due: dueHabits.length,
      done: dueHabits.filter((h) => h.completedDates.includes(todayIso)).length,
    };
  }

  /**
   * True iff there is ≥1 missed day in [startDate .. yesterday]. A pending
   * today does NOT make a habit lapsed (CriticReview R4). Short-circuits on the
   * first missed day.
   */
  isLapsed(habit: Habit, today: Date = new Date()): boolean {
    const todayIso = HabitService.todayIso(today);
    const startIso = HabitService.startIso(habit);
    const yesterdayIso = HabitService.prevIso(todayIso);

    let cursor = startIso;
    while (cursor <= yesterdayIso) {
      if (this.dayStatus(habit, cursor, today) === 'missed') {
        return true;
      }
      cursor = HabitService.nextIso(cursor);
    }

    return false;
  }

  /**
   * The max (most recent) completed date as `YYYY-MM-DD`, or null if never
   * completed. Used for the dashboard's "last done N days ago" label.
   */
  lastDoneIso(habit: Habit): string | null {
    if (habit.completedDates.length === 0) {
      return null;
    }
    // Lexical max works for zero-padded YYYY-MM-DD strings
    return habit.completedDates.reduce((max, date) => (date > max ? date : max));
  }

  /**
   * Day statuses for the `days`-day window ending today (inclusive), oldest
   * first. Drives the 30-day strip on the Habits page (§2) and the heatmap in
   * §4.
   *
   * Deliberately calls `dayStatus` with **no `isDueOn` guard**, unlike
   * `poolCounts` (habits-redesign CriticReview R4). `dayStatus` reports 'done'
   * before 'not-due', so a day completed off-schedule or during a pause paints
   * as done — which is right for a record of what happened, and wrong for a
   * rate. The two must not be unified.
   */
  recentStatuses(habit: Habit, days: number, today: Date = new Date()): DayStatus[] {
    const todayIso = HabitService.todayIso(today);
    const result: DayStatus[] = [];
    for (let offset = days - 1; offset >= 0; offset--) {
      result.push(this.dayStatus(habit, HabitService.shiftIso(todayIso, -offset), today));
    }
    return result;
  }

  /**
   * Pooled completion rate per day for the trailing window ending today, oldest
   * first. Each entry is the pool's completion rate (done/countable) for that
   * day's habits, or `null` if nothing was due on that day.
   *
   * The distinction between `null` and `0` is deliberate: a day on which nothing
   * was due is not a day on which everything was missed. The analytics heatmap
   * needs this to distinguish "no data" from "complete failure" (AD-010). Call
   * `poolCounts(habits, iso, iso, today)` once per day to avoid restating its
   * contract in a second place (L-001).
   *
   * Returns `[]` when `days <= 0`. An empty `habits` array yields all `null`.
   */
  dailyPooledRates(
    habits: Habit[],
    days: number,
    today: Date = new Date(),
  ): Array<number | null> {
    if (days <= 0) {
      return [];
    }
    const todayIso = HabitService.todayIso(today);
    const result: Array<number | null> = [];
    for (let offset = days - 1; offset >= 0; offset--) {
      const iso = HabitService.shiftIso(todayIso, -offset);
      const { done, countable } = this.poolCounts(habits, iso, iso, today);
      result.push(countable === 0 ? null : done / countable);
    }
    return result;
  }

  /**
   * Raw completion count per day for the trailing window ending today, oldest
   * first. Each entry counts habits whose `completedDates` includes that day's
   * ISO, regardless of whether the habit was due on that day.
   *
   * Deliberately **not** the same shape as `dailyPooledRates`: this counts
   * *what happened* (off-schedule ticks included), while rates count *what was
   * owed* (due-day guard enforced). The two must not be unified — they serve
   * different purposes and feed different charts (AD-014).
   *
   * Returns `[]` when `days <= 0`.
   */
  dailyDoneCounts(
    habits: Habit[],
    days: number,
    today: Date = new Date(),
  ): number[] {
    if (days <= 0) {
      return [];
    }
    const todayIso = HabitService.todayIso(today);
    const result: number[] = [];
    for (let offset = days - 1; offset >= 0; offset--) {
      const iso = HabitService.shiftIso(todayIso, -offset);
      let count = 0;
      for (const habit of habits) {
        if (habit.completedDates.includes(iso)) {
          count++;
        }
      }
      result.push(count);
    }
    return result;
  }

  /**
   * Pooled completion rate per weekday across all history (from earliest start
   * date through today inclusive). Returns exactly 7 entries indexed
   * `Sun = 0 … Sat = 6`, each the completion rate for that weekday or `null` if
   * nothing was ever due on that weekday.
   *
   * The distinction between `null` and `0` is deliberate: a weekday on which
   * nothing was ever due is not a weekday on which every due completion was
   * missed. Accumulates `poolCounts` per day into each day's weekday bucket
   * (Analyst §3.6).
   *
   * Extracts the weekday with the house split-parts construction:
   * `const [y, m, d] = iso.split('-').map(Number); new Date(y, m - 1, d).getDay()`.
   * Never `new Date(iso).getDay()` — that parses as UTC and shifts the weekday
   * for half the world (AD-003, CriticReview R5).
   *
   * Returns seven `null`s when `habits` is empty or `earliestStartIso` is null.
   */
  weekdayRates(
    habits: Habit[],
    today: Date = new Date(),
  ): Array<number | null> {
    const fromIso = this.earliestStartIso(habits);
    if (fromIso === null) {
      return [null, null, null, null, null, null, null];
    }

    const todayIso = HabitService.todayIso(today);
    const buckets: Array<{ done: number; countable: number }> = [
      { done: 0, countable: 0 },
      { done: 0, countable: 0 },
      { done: 0, countable: 0 },
      { done: 0, countable: 0 },
      { done: 0, countable: 0 },
      { done: 0, countable: 0 },
      { done: 0, countable: 0 },
    ];

    let cursor = fromIso;
    while (cursor <= todayIso) {
      const [y, m, d] = cursor.split('-').map(Number);
      const weekday = new Date(y, m - 1, d).getDay();

      const { done, countable } = this.poolCounts(habits, cursor, cursor, today);
      buckets[weekday].done += done;
      buckets[weekday].countable += countable;

      cursor = HabitService.nextIso(cursor);
    }

    return buckets.map((b) => (b.countable === 0 ? null : b.done / b.countable));
  }

  /**
   * Build a calendar month grid as an ordered array of cells (leading/trailing
   * blanks to align weekday columns), each with iso and status. Month is 0-based
   * (JS convention). Pure; year/month injectable for prev/next paging.
   * Cells are { iso, status } for real days or { blank: true } for padding.
   * Trailing blanks are optional (component pads in CSS grid).
   */
  monthGrid(
    habit: Habit,
    year: number,
    month: number,
    today: Date = new Date(),
  ): Array<{ iso: string; status: DayStatus } | { blank: true }> {
    const result: Array<{ iso: string; status: DayStatus } | { blank: true }> = [];

    // Leading blanks: weekday index of the 1st (Sun=0)
    const firstDayOfMonth = new Date(year, month, 1);
    const leadingBlanks = firstDayOfMonth.getDay();
    for (let i = 0; i < leadingBlanks; i++) {
      result.push({ blank: true });
    }

    // Days of the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = HabitService.todayIso(new Date(year, month, day));
      const status = this.dayStatus(habit, iso, today);
      result.push({ iso, status });
    }

    // Trailing blanks to complete the final week (optional, keeping total a multiple of 7)
    const remainingCells = result.length % 7;
    if (remainingCells !== 0) {
      const trailingBlanks = 7 - remainingCells;
      for (let i = 0; i < trailingBlanks; i++) {
        result.push({ blank: true });
      }
    }

    return result;
  }

  /** Persist all state. Guarded so a full/blocked quota never crashes. */
  private persist(): void {
    try {
      localStorage.setItem(HabitService.STORAGE_KEY, JSON.stringify(this._habits()));
    } catch {
      // No error UI yet. A "couldn't save" warning is a Phase-3+ concern.
    }
  }

  /**
   * Load from localStorage. Fails soft and granular: missing key, non-array, or
   * parse error → empty; malformed rows are dropped and valid habits survive.
   * Migration (CriticReview R1): a legacy row with **no** `schedule` is backfilled
   * to `daily`. Malformed schedules were already dropped by `isHabit`.
   *
   * Phase 4b migration (habit-lifecycle CriticReview R7): a legacy row with **no**
   * `startDate` is backfilled to the local date of `createdAt`, which is precisely
   * what `startIso` computes for habits without `startDate`. This preserves all
   * existing streaks, rates, and calendars bit-identically.
   */
  private load(): Habit[] {
    try {
      const raw = localStorage.getItem(HabitService.STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isHabit).map((h) => {
        let updated = h as Partial<Habit>;
        // Legacy Phase 1 row passed isHabit without a schedule — backfill it.
        if (updated.schedule === undefined) {
          updated = { ...updated, schedule: { type: 'daily' as const } };
        }
        // Legacy pre-4b row passed isHabit without a startDate — backfill it.
        if (updated.startDate === undefined) {
          updated = { ...updated, startDate: HabitService.todayIso(new Date(h.createdAt)) };
        }
        return updated as Habit;
      });
    } catch {
      return [];
    }
  }
}
