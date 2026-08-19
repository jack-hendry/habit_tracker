import { Schedule } from '../habit/habit.model';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * A schedule as display text: `Daily`, `Weekdays` for exactly Mon–Fri, or the
 * day names joined with ` · `. Shared by the Habits list (§2) and the habit
 * detail hero's meta line (§2b) so the collapse rule has one home (L-001).
 */
export function scheduleLabel(schedule: Schedule): string {
  if (schedule.type === 'daily') {
    return 'Daily';
  }
  const days = schedule.days;
  // Collapse [1,2,3,4,5] to 'Weekdays'
  if (days.length === 5 && days.every((d, i) => d === i + 1)) {
    return 'Weekdays';
  }
  return days.map((d) => WEEKDAY_LABELS[d]).join(' · ');
}
