/**
 * How often a habit is "due". Phase 2 supports two deterministic schedules;
 * flexible "X times per week" is deferred (see specs/scheduling-streaks/Analyst.md).
 */
export type Schedule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }; // JS getDay(): 0=Sun … 6=Sat

/**
 * A single tracked habit.
 *
 * `createdAt` is a UTC ISO timestamp (a moment in time). `completedDates` are
 * date-only `YYYY-MM-DD` strings in the user's **local** timezone — see
 * CriticReview R1 (habit-checklist) for why the two use different representations.
 * `schedule` was added in Phase 2; legacy rows without it migrate to `daily`.
 */
export interface Habit {
  id: string;
  name: string;
  createdAt: string;
  completedDates: string[];
  schedule: Schedule;
}

/**
 * Runtime type guard for a `Schedule`: `daily` is always valid; `weekdays`
 * requires a non-empty array of integer weekdays in 0–6 (scheduling-streaks
 * CriticReview R1 — an empty/out-of-range `days` is corrupt).
 */
export function isSchedule(value: unknown): value is Schedule {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const s = value as Record<string, unknown>;
  if (s['type'] === 'daily') {
    return true;
  }
  if (s['type'] === 'weekdays') {
    const days = s['days'];
    return (
      Array.isArray(days) &&
      days.length > 0 &&
      days.every((d) => typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6)
    );
  }
  return false;
}

/**
 * Runtime type guard used for corrupt-data recovery: a single malformed row is
 * dropped while valid habits survive.
 *
 * Migration (scheduling-streaks CriticReview R1): a legacy Phase 1 row with **no**
 * `schedule` still passes (the loader backfills it to `daily`), but a row with a
 * **present but malformed** `schedule` fails and is dropped as corrupt.
 */
export function isHabit(value: unknown): value is Habit {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const h = value as Record<string, unknown>;
  const scheduleOk = h['schedule'] === undefined || isSchedule(h['schedule']);
  return (
    typeof h['id'] === 'string' &&
    typeof h['name'] === 'string' &&
    typeof h['createdAt'] === 'string' &&
    Array.isArray(h['completedDates']) &&
    h['completedDates'].every((d) => typeof d === 'string') &&
    scheduleOk
  );
}
