import { Component, computed, input } from '@angular/core';

/**
 * A simple bar chart showing completions per day over 14 days (roadmap §4).
 * The highest bar is highlighted, not today's bar — the prototype is
 * `bb.v === mx`, and getting this wrong produces a page that matches the
 * mockup and is wrong on every other day (Analyst §0.1).
 *
 * Presentation only — the caller supplies the bars; the component derives
 * the maximum and renders heights accordingly.
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  templateUrl: './bar-chart.component.html',
  styleUrl: './bar-chart.component.scss',
})
export class BarChartComponent {
  /** Bars to render, each with a label and numeric value. */
  readonly bars = input.required<Array<{ label: string; value: number }>>();

  /** Computed maximum value from the bars. */
  readonly max = computed(() => {
    const bars = this.bars();
    if (bars.length === 0) return 0;
    return Math.max(...bars.map((b) => b.value));
  });

  /**
   * Height per bar as a percentage string. The 6% floor keeps a zero day
   * visible as a sliver and is deliberate (Analyst §2.5).
   */
  heightPercent(value: number): string {
    const maxVal = this.max();
    return Math.max(6, Math.round((value / (maxVal || 1)) * 100)) + '%';
  }

  /**
   * True if the bar should be highlighted (max bar, not today).
   * The trailing max > 0 is a deliberate deviation from the prototype: when
   * all values are zero, highlight nothing instead of all bars.
   * Ties above zero still highlight every tied bar, which matches.
   */
  isHighlighted(value: number): boolean {
    const maxVal = this.max();
    return value === maxVal && maxVal > 0;
  }

  /**
   * Returns the plain CSS class name for a bar.
   * Used by reportStateCoverage in design:shot to count rendered states.
   */
  barClass(value: number): string {
    return this.isHighlighted(value) ? 'bar-max' : 'bar-rest';
  }
}
