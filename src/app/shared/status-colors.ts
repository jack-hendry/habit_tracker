import { DayStatus } from '../habit/habit.model';

/**
 * The three cell colours a day-status strip or grid uses (AD-015). Shared by
 * `<app-day-strip>` (§2, 30 days) and `<app-activity-grid>` (§2b, 18 weeks) so
 * the rule has one home — a colour rule pinned by a decision entry must not
 * exist twice (L-001).
 *
 * `done` takes the habit's own colour; `missed` and `pending` share the missed
 * grey; `not-due` and `future` share the fainter not-due grey.
 */
export function stripCellColor(status: DayStatus, hex: string): string {
  if (status === 'done') return hex;
  if (status === 'missed' || status === 'pending') return 'var(--strip-missed)';
  return 'var(--strip-not-due)';
}
