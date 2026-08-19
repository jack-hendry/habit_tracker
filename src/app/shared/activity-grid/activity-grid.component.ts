import { Component, input } from '@angular/core';
import { DayStatus } from '../../habit/habit.model';
import { stripCellColor } from '../status-colors';

/**
 * The 18-week activity heatmap on the habit detail page (roadmap §2b). Seven
 * rows (one per weekday) flowing in columns (one per week), oldest first.
 * Presentation only — the caller supplies the window, which must be
 * Sunday-aligned (`HabitService.activityWindowDays`) or the rows are not
 * weekdays and the grid means nothing.
 *
 * Not a variant of `<app-day-strip>` (Analyst §2.9 B): different geometry and
 * different flow. The colour rule is the shared part, and it lives in
 * `status-colors.ts` so AD-015 is not written twice (L-001).
 */
@Component({
  selector: 'app-activity-grid',
  standalone: true,
  templateUrl: './activity-grid.component.html',
  styleUrl: './activity-grid.component.scss',
})
export class ActivityGridComponent {
  readonly statuses = input.required<DayStatus[]>();
  /** The owning habit's colour, from `colorOf(habit.color).hex`. */
  readonly hex = input.required<string>();

  cellColor(status: DayStatus): string { return stripCellColor(status, this.hex()); }
}
