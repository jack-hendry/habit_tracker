/**
 * How often a habit is "due". Phase 2 supports two deterministic schedules;
 * flexible "X times per week" is deferred (see specs/scheduling-streaks/Analyst.md).
 */
export type Schedule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }; // JS getDay(): 0=Sun … 6=Sat

/**
 * A time period when a habit is paused. The interval is half-open: [from, to),
 * so `to` is exclusive. This means "paused from Monday to Friday" is from Monday
 * (inclusive) to Saturday (exclusive). When `to` is null, the pause is still open
 * (ongoing). Using half-open intervals prevents off-by-one bugs: pause-then-resume
 * on the same day yields `from === to` (an empty range affecting nothing), and
 * setting `to = todayIso()` on resume reads naturally as "paused up to, not
 * including, today — so today is live again" (habit-lifecycle CriticReview R2).
 */
export interface PausedRange {
  from: string;      // YYYY-MM-DD, inclusive
  to: string | null; // YYYY-MM-DD, EXCLUSIVE; null = still paused
}

/**
 * Status of a habit on a given day. Phase 3 uses this for calendar/dashboard
 * derivations. Order of checks (CriticReview R1): `future` → `done` → `not-due`
 * → `pending` → `missed`.
 */
export type DayStatus = 'not-due' | 'done' | 'missed' | 'pending' | 'future';

/**
 * A single tracked habit.
 *
 * `createdAt` is a UTC ISO timestamp (a moment in time). `completedDates` are
 * date-only `YYYY-MM-DD` strings in the user's **local** timezone — see
 * CriticReview R1 (habit-checklist) for why the two use different representations.
 * `schedule` was added in Phase 2; legacy rows without it migrate to `daily`.
 *
 * The five metadata fields arrived in Phase 4a and are all **optional**, which is
 * why that slice needed no migration and no `STORAGE_KEY` bump — a pre-4a row is
 * still a valid `Habit` (habit-metadata CriticReview R6).
 *
 * `color` and `icon` hold **palette ids** (`HABIT_COLORS` / `HABIT_ICONS`), never
 * raw hex or raw emoji, so the rendered values can be restyled without a data
 * migration. Resolve them through `colorOf` / `iconOf`, which fall back to the
 * default entry for an unknown id (CriticReview R9).
 *
 * Phase 4b lifecycle fields (`startDate`, `status`, `pausedRanges`) are all
 * optional and migrate in place via backfill without a `STORAGE_KEY` bump. See
 * habit-lifecycle CriticReview R7 (startDate replaces createdIso), R1 (status is
 * not 'paused'; pause is derived from pausedRanges), and R2 (pausedRanges uses
 * half-open intervals).
 */
export interface Habit {
  id: string;
  name: string;
  createdAt: string;
  completedDates: string[];
  schedule: Schedule;
  description?: string;
  category?: string;
  color?: string;
  icon?: string;
  notes?: string;
  startDate?: string;                 // YYYY-MM-DD local; backfilled on load
  status?: 'active' | 'archived';     // absent → 'active'
  pausedRanges?: PausedRange[];
}

/**
 * ISO 8601 date pattern: YYYY-MM-DD with zero-padded month and day.
 * Used by `isHabit` and `update()`'s `startDate` validation so they cannot
 * disagree (habit-lifecycle CriticReview R4).
 */
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The only fields `HabitService.update` may change. `id`, `createdAt` and
 * `completedDates` are deliberately **excluded rather than stripped at runtime**
 * (habit-metadata CriticReview R1): editing metadata must never be able to
 * rewrite identity or history, and making that unrepresentable turns a silent
 * no-op into a compile error.
 *
 * Phase 4b adds `startDate` (a habit property that the edit form legitimately
 * owns), but `status` and `pausedRanges` stay out entirely — they are history
 * (like `completedDates`), not editable fields (habit-lifecycle CriticReview R3).
 */
export type HabitPatch = Partial<
  Pick<Habit, 'name' | 'schedule' | 'description' | 'category' | 'color' | 'icon' | 'notes' | 'startDate'>
>;

/** A curated colour from the fixed palette. `hex` is presentation; `id` is stored. */
export interface HabitColor {
  id: string;
  label: string;
  hex: string;
}

/** A curated icon from the fixed set. `glyph` is presentation; `id` is stored. */
export interface HabitIcon {
  id: string;
  label: string;
  glyph: string;
}

/**
 * Fixed colour palette. First entry is the default used for habits with no
 * colour and for unrecognised ids. `label` exists so a swatch is never a bare
 * coloured square with no accessible name (CriticReview R10).
 */
export const HABIT_COLORS: readonly HabitColor[] = [
  { id: 'slate', label: 'Slate', hex: '#64748b' },
  { id: 'sky', label: 'Sky', hex: '#0ea5e9' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'amber', label: 'Amber', hex: '#f59e0b' },
  { id: 'rose', label: 'Rose', hex: '#f43f5e' },
  { id: 'violet', label: 'Violet', hex: '#8b5cf6' },
  { id: 'teal', label: 'Teal', hex: '#14b8a6' },
  { id: 'orange', label: 'Orange', hex: '#f97316' },
  { id: 'indigo', label: 'Indigo', hex: '#6366f1' },
];

/** Fixed icon set. First entry is the default (used for no icon / unknown id). */
export const HABIT_ICONS: readonly HabitIcon[] = [
  { id: 'dot', label: 'None', glyph: '•' },
  { id: 'run', label: 'Exercise', glyph: '🏃' },
  { id: 'book', label: 'Reading', glyph: '📖' },
  { id: 'water', label: 'Water', glyph: '💧' },
  { id: 'sleep', label: 'Sleep', glyph: '😴' },
  { id: 'meditate', label: 'Meditation', glyph: '🧘' },
  { id: 'food', label: 'Food', glyph: '🥗' },
  { id: 'code', label: 'Code', glyph: '💻' },
  { id: 'music', label: 'Music', glyph: '🎵' },
  { id: 'money', label: 'Money', glyph: '💰' },
  { id: 'clean', label: 'Chores', glyph: '🧹' },
  { id: 'heart', label: 'Health', glyph: '❤️' },
  { id: 'coffee', label: 'Coffee', glyph: '☕' },
  { id: 'moon', label: 'Night', glyph: '🌙' },
  { id: 'clock', label: 'Time', glyph: '⏰' },
];

/**
 * Resolve a stored colour id. Returns the default entry for `undefined` **and**
 * for an id that is no longer in the palette, so retiring a colour can never
 * break rendering of habits that still reference it (CriticReview R9).
 */
export function colorOf(id?: string): HabitColor {
  return HABIT_COLORS.find((c) => c.id === id) ?? HABIT_COLORS[0];
}

/**
 * A palette hex at partial opacity, as `rgba(r,g,b,a)`. The habit-detail hero
 * band (§2b) tints itself with the habit's own colour at 9% — the tint is
 * derived per habit, never a fixed value (roadmap §2b Critic Review).
 *
 * `hex` is always a 6-digit `#rrggbb` from `HABIT_COLORS`; this is not a general
 * CSS colour parser.
 */
export function hexAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Resolve a stored icon id. Same fallback contract as `colorOf`. */
export function iconOf(id?: string): HabitIcon {
  return HABIT_ICONS.find((i) => i.id === id) ?? HABIT_ICONS[0];
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
 * Validate a `PausedRange`. Must have `from` matching `ISO_DATE` and `to` being
 * either null or matching `ISO_DATE`. See `PausedRange` for the half-open
 * interval convention.
 */
function isPausedRange(value: unknown): value is PausedRange {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const r = value as Record<string, unknown>;
  const fromOk = typeof r['from'] === 'string' && ISO_DATE.test(r['from']);
  const toOk = r['to'] === null || (typeof r['to'] === 'string' && ISO_DATE.test(r['to']));
  return fromOk && toOk;
}

/**
 * Runtime type guard used for corrupt-data recovery: a single malformed row is
 * dropped while valid habits survive.
 *
 * Migration (scheduling-streaks CriticReview R1): a legacy Phase 1 row with **no**
 * `schedule` still passes (the loader backfills it to `daily`), but a row with a
 * **present but malformed** `schedule` fails and is dropped as corrupt.
 *
 * The Phase 4a metadata fields follow the same rule (habit-metadata CriticReview
 * R7): absent is fine, present-but-not-a-string is corrupt. "Optional" must not
 * become "unchecked" — an unknown *string* `color` id is not corrupt (it falls
 * back at render time), but `color: 42` is.
 *
 * Phase 4b adds structural validation for `startDate` (must match `ISO_DATE` if
 * present), `status` (must be exactly 'active' or 'archived', not any string),
 * and `pausedRanges` (must be an array of valid `PausedRange` objects).
 * Present-but-malformed → row dropped as corrupt (habit-lifecycle CriticReview R4).
 */
export function isHabit(value: unknown): value is Habit {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const h = value as Record<string, unknown>;
  const scheduleOk = h['schedule'] === undefined || isSchedule(h['schedule']);
  const optionalStringOk = (key: string) => h[key] === undefined || typeof h[key] === 'string';
  const metadataOk = ['description', 'category', 'color', 'icon', 'notes'].every(optionalStringOk);

  // Phase 4b: lifecycle field validation
  const startDateOk = h['startDate'] === undefined || (typeof h['startDate'] === 'string' && ISO_DATE.test(h['startDate']));
  const statusOk = h['status'] === undefined || h['status'] === 'active' || h['status'] === 'archived';
  const pausedRangesOk = h['pausedRanges'] === undefined || (Array.isArray(h['pausedRanges']) && h['pausedRanges'].every(isPausedRange));

  return (
    metadataOk &&
    typeof h['id'] === 'string' &&
    typeof h['name'] === 'string' &&
    typeof h['createdAt'] === 'string' &&
    Array.isArray(h['completedDates']) &&
    h['completedDates'].every((d) => typeof d === 'string') &&
    scheduleOk &&
    startDateOk &&
    statusOk &&
    pausedRangesOk
  );
}
