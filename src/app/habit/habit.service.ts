import { Injectable, signal } from '@angular/core';
import { Habit, Schedule, isHabit, isSchedule } from './habit.model';

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
   * The habit's **local** created date as `YYYY-MM-DD`. `createdAt` is a UTC
   * instant; the streak/due boundary is a local calendar day, so both `isDueOn`
   * and `currentStreak` must derive it the same way (CriticReview R5).
   */
  private static createdIso(habit: Habit): string {
    return HabitService.todayIso(new Date(habit.createdAt));
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
  add(name: string, schedule: Schedule = { type: 'daily' }): void {
    const trimmed = name.trim();
    if (!trimmed || !isSchedule(schedule)) {
      return;
    }
    const habit: Habit = {
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: new Date().toISOString(),
      completedDates: [],
      schedule,
    };
    this._habits.update((list) => [...list, habit]);
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
   * Was the habit due (scheduled) on `iso`? False before the habit's local
   * creation date; otherwise `daily` is always due and `weekdays` is due iff the
   * date's local weekday is listed.
   */
  isDueOn(habit: Habit, iso: string): boolean {
    if (iso < HabitService.createdIso(habit)) {
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
   * than breaking the streak. Bounded below by the creation date (CriticReview R4).
   */
  currentStreak(habit: Habit, today: Date = new Date()): number {
    const todayIso = HabitService.todayIso(today);
    const createdIso = HabitService.createdIso(habit);
    const completed = new Set(habit.completedDates);

    let count = 0;
    let cursor = todayIso;
    while (cursor >= createdIso) {
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
   * Longest run of consecutive completed **due** days between the creation date
   * and today (inclusive). Survives a current-streak reset.
   */
  longestStreak(habit: Habit, today: Date = new Date()): number {
    const todayIso = HabitService.todayIso(today);
    const createdIso = HabitService.createdIso(habit);
    const completed = new Set(habit.completedDates);

    let best = 0;
    let run = 0;
    let cursor = createdIso;
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
      return parsed.filter(isHabit).map((h) =>
        // Legacy Phase 1 row passed isHabit without a schedule — backfill it.
        (h as Partial<Habit>).schedule === undefined
          ? { ...h, schedule: { type: 'daily' as const } }
          : h,
      );
    } catch {
      return [];
    }
  }
}
