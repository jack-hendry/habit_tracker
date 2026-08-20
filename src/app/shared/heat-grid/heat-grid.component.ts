import { Component, computed, input } from '@angular/core';

/**
 * The Analytics all-habit activity heatmap (roadmap §4). Grid of 7 rows
 * (one per weekday) flowing in columns (one per week), oldest first, with
 * pooled completion rates colour-mapped to five steps. Also renders the
 * month-label row above the grid because label-to-grid alignment is internal
 * geometry (Analyst §3 E).
 *
 * Presentation only — the caller supplies the window (which must be
 * Sunday-aligned) and its start date; the component maps rates to steps and
 * derives month labels.
 */
@Component({
  selector: 'app-heat-grid',
  standalone: true,
  templateUrl: './heat-grid.component.html',
  styleUrl: './heat-grid.component.scss',
})
export class HeatGridComponent {
  /** Pooled completion rates (oldest first, Sunday-aligned 7-day columns). */
  readonly rates = input.required<Array<number | null>>();

  /** The ISO date of rates[0]; used to derive month labels. */
  readonly startIso = input.required<string>();

  /**
   * Single source of truth for rate-to-step mapping (0–4). Both stepFor and
   * stepClass call this to ensure the CSS var name and class name agree
   * (L-001: duplicated facts are bugs with a delay).
   */
  private stepIndex(rate: number | null): number {
    if (rate === null || rate === 0) return 0;
    if (rate < 0.35) return 1;
    if (rate < 0.7) return 2;
    if (rate < 1) return 3;
    return 4;
  }

  /**
   * Maps a single rate to its CSS var token.
   * null or 0 share a fill deliberately: a day with no due habits is not
   * a day with all habits missed (Analyst §3 A; AD-010).
   */
  stepFor(rate: number | null): string {
    return '--heat-' + this.stepIndex(rate);
  }

  /**
   * Compute the number of week columns in the grid. The grid has 7 rows and
   * flows one column per week (grid-auto-flow: column), so columnCount =
   * ceil(rates.length / 7).
   */
  readonly columnCount = computed(() => {
    const rates = this.rates();
    return Math.ceil(rates.length / 7);
  });

  /**
   * Derived month labels for the window. Walks 7-day columns; emits a label
   * at each column whose first day falls in a different month.
   */
  readonly monthLabels = computed(() => {
    const labels: Array<{ column: number; label: string }> = [];
    const rates = this.rates();
    const startIso = this.startIso();

    if (rates.length === 0) return labels;

    // Parse startIso to get the first day
    const parts = startIso.split('-');
    const startY = Number(parts[0]);
    const startM = Number(parts[1]);
    const startD = Number(parts[2]);

    let previousMonth: number | null = null;
    let columnIndex = 0;

    // Walk through 7-day columns
    for (let i = 0; i < rates.length; i += 7) {
      // Create a new date for this week's first day
      const weekDate = new Date(startY, startM - 1, startD + i);
      const month = weekDate.getMonth();

      // Emit label for the first column or when month changes
      if (previousMonth === null || month !== previousMonth) {
        const monthName = weekDate.toLocaleString('en-US', { month: 'short' });
        labels.push({ column: columnIndex + 1, label: monthName });
        previousMonth = month;
      }

      columnIndex++;
    }

    return labels;
  });

  /**
   * Returns the plain CSS class name for a rate step.
   * Used by reportStateCoverage in design:shot to count rendered states.
   */
  stepClass(rate: number | null): string {
    return 'heat-' + this.stepIndex(rate);
  }
}
