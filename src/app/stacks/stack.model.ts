/**
 * A named routine: an anchor you already do, plus an ordered list of habits
 * chained onto it ("After I pour my morning coffee, I will meditate").
 *
 * `habitIds` are **references** to live habits, never copies — ticking a habit
 * inside a stack ticks the same habit the dashboard ticks. There is no
 * stack-local completion state (Analyst §2.1).
 *
 * `color` and `aglyph` hold **palette ids** (`HABIT_COLORS` / `HABIT_ICONS`),
 * never raw hex or raw emoji, matching the invariant `Habit` already follows
 * (AD-029). Resolve them through `colorOf` / `iconOf`.
 *
 * `time` and `anchor` are free text and are never parsed. `time` is a label,
 * not a schedule: nothing in the app reads it to decide when anything is due.
 */
export interface Stack {
  id: string;
  name: string;
  time: string;
  anchor: string;
  aglyph: string;
  color: string;
  habitIds: string[];
}

/** The fields `StacksService.update` may change. `id` and `habitIds` are excluded
 *  rather than stripped: editing a stack's label must not be able to rewrite its
 *  membership, and making that unrepresentable beats validating it at runtime. */
export type StackPatch = Partial<Pick<Stack, 'name' | 'time' | 'anchor' | 'aglyph' | 'color'>>;

/**
 * `+ New stack` defaults, ported from the prototype's `newStack`. The prototype's
 * raw `#0066cc` has no palette equivalent, so the colour becomes `sky` (#0ea5e9)
 * — no mockup covers a freshly created stack, so nothing regresses (AD-029).
 */
export const NEW_STACK_DEFAULTS = {
  name: 'New stack',
  time: 'anytime',
  anchor: 'I … (choose an anchor)',
  aglyph: 'clock',
  color: 'sky',
} as const;

/**
 * Runtime type guard for corrupt-data recovery, same contract as `isHabit`: a
 * malformed row is dropped and valid stacks survive. Every field is required —
 * a `Stack` has no legacy shape, so a missing field is corruption, not a
 * migration. An *unknown* palette id is not corrupt (`colorOf`/`iconOf` fall
 * back at render time); a non-string one is.
 */
export function isStack(value: unknown): value is Stack {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const s = value as Record<string, unknown>;
  return (
    typeof s['id'] === 'string' &&
    typeof s['name'] === 'string' &&
    typeof s['time'] === 'string' &&
    typeof s['anchor'] === 'string' &&
    typeof s['aglyph'] === 'string' &&
    typeof s['color'] === 'string' &&
    Array.isArray(s['habitIds']) &&
    s['habitIds'].every((id) => typeof id === 'string')
  );
}
