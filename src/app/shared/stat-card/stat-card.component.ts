import { Component, input } from '@angular/core';

/** How a stat card's sub-line reads: neutral, an improvement, a regression. */
export type StatTone = 'muted' | 'positive' | 'negative';

/**
 * The label / value / sub triad used by the Dashboard's stat row and (later)
 * the Analytics cards — one component so the two pages cannot drift
 * (design-implementation-roadmap §1 Critic Review).
 *
 * A card shows EITHER a sub-line OR a progress bar. `progress` wins when both
 * are set; that combination is not used by any mockup.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  /** Sentence case — the uppercasing is CSS, so the DOM keeps readable text. */
  readonly label = input.required<string>();
  /** Pre-formatted: '34', '75%', '3'. The card does no arithmetic. */
  readonly value = input.required<string>();
  /** Smaller inline unit after the value: 'days', 'of 5 done'. */
  readonly unit = input<string | null>(null);
  /** Sub-line under the value. Null renders nothing at all. */
  readonly sub = input<string | null>(null);
  readonly tone = input<StatTone>('muted');
  /** 0..100. When non-null a progress bar replaces the sub-line. */
  readonly progress = input<number | null>(null);
}
