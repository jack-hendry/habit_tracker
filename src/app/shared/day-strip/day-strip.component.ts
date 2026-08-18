import { Component, input } from '@angular/core';
import { DayStatus } from '../../habit/habit.model';

/**
 * The 30-day completion strip on the Habits page (roadmap §2). One 8×22px cell
 * per day, oldest first. Presentation only — the caller supplies the window.
 */
@Component({
  selector: 'app-day-strip',
  standalone: true,
  templateUrl: './day-strip.component.html',
  styleUrl: './day-strip.component.scss',
})
export class DayStripComponent {
  readonly statuses = input.required<DayStatus[]>();
  /** The owning habit's colour, from `colorOf(habit.color).hex`. */
  readonly hex = input.required<string>();
  /** Sentence case here, uppercased in CSS (Analyst §2.3). */
  readonly label = input('Last 30 days');

  /**
   * Five DayStatus values, three cell colours (Analyst §3.1). `pending` shares
   * the missed grey — measured on the target, not chosen: `Read 20 pages` is
   * daily and unticked on the mockup's today and its last cell is #e9e9e7.
   * `future` cannot occur in a window ending today; mapped for totality.
   */
  cellColor(status: DayStatus): string {
    if (status === 'done') return this.hex();
    if (status === 'missed' || status === 'pending') return 'var(--strip-missed)';
    return 'var(--strip-not-due)';
  }
}
