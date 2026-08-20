import { Component, inject, computed } from '@angular/core';
import { StatCardComponent } from '../shared/stat-card/stat-card.component';
import { HeatGridComponent } from '../shared/heat-grid/heat-grid.component';
import { BarChartComponent } from '../shared/bar-chart/bar-chart.component';
import { RouterLink } from '@angular/router';
import { Habit, colorOf, iconOf } from '../habit/habit.model';
import { HabitService } from '../habit/habit.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [StatCardComponent, HeatGridComponent, BarChartComponent, RouterLink],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  private readonly svc = inject(HabitService);

  /** Pinned once so every derivation on the page agrees about "today". */
  private readonly today = new Date();

  readonly habits = computed(() => this.svc.activeHabits());
  readonly hasHabits = computed(() => this.habits().length > 0);

  private readonly todayIso = HabitService.todayIso(this.today);
  private readonly earliestIso = computed(() => this.svc.earliestStartIso(this.habits()) ?? this.todayIso);

  private readonly pooled = computed(() =>
    this.svc.poolCounts(this.habits(), this.earliestIso(), this.todayIso, this.today)
  );

  readonly overallRate = computed(() => {
    const { done, countable } = this.pooled();
    return countable === 0 ? '—' : Math.round((done / countable) * 100) + '%';
  });

  readonly totalDone = computed(() => String(this.pooled().done));

  readonly perfectDays = computed(() => String(this.svc.perfectDays(this.habits(), this.today)));

  readonly topStreak = computed(() => {
    const result = this.svc.topCurrentStreak(this.habits(), this.today);
    return String(result?.streak ?? 0);
  });

  readonly windowDays = computed(() => this.svc.activityWindowDays(this.today));

  readonly heatRates = computed(() => this.svc.dailyPooledRates(this.habits(), this.windowDays(), this.today));

  readonly heatStartIso = computed(() => HabitService.shiftIso(this.todayIso, -(this.windowDays() - 1)));

  readonly bars = computed(() => {
    const counts = this.svc.dailyDoneCounts(this.habits(), 14, this.today);
    return counts.map((value, i) => ({
      value,
      label: HabitService.shiftIso(this.todayIso, -(13 - i)).split('-')[2].replace(/^0/, ''),
    }));
  });

  readonly ranked = computed(() => {
    const habits = this.habits();
    return habits
      .map((h) => {
        const { done, countable } = this.svc.lifetimeCounts(h, this.today);
        const hasRate = countable > 0;
        const rate = hasRate ? Math.round((done / countable) * 100) : 0;
        return {
          habit: h,
          rate,
          hasRate,
          hex: colorOf(h.color).hex,
          glyph: iconOf(h.icon).glyph,
        };
      })
      .sort((a, b) => {
        // hasRate rows by rate descending
        if (a.hasRate && b.hasRate) {
          return b.rate - a.rate;
        }
        // hasRate rows first, !hasRate rows last
        if (a.hasRate && !b.hasRate) return -1;
        if (!a.hasRate && b.hasRate) return 1;
        // Both !hasRate: keep activeHabits() order
        return 0;
      });
  });

  readonly weekdays = computed(() => {
    const rates = this.svc.weekdayRates(this.habits(), this.today);
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Find the highest non-null rate and track earliest weekday on a tie
    let bestRate: number | null = null;
    let bestIndex = -1;
    for (let i = 0; i < rates.length; i++) {
      const r = rates[i];
      if (r !== null) {
        if (bestRate === null || r > bestRate) {
          bestRate = r;
          bestIndex = i;
        }
      }
    }

    return rates.map((rate, i) => ({
      name: names[i],
      pct: rate === null ? '—' : Math.round(rate * 100) + '%',
      pctNum: rate === null ? 0 : Math.round(rate * 100),
      best: i === bestIndex,
      hasRate: rate !== null,
      rate,
    }));
  });

  readonly bestDayName = computed(() => {
    const weekday = this.weekdays().find((w) => w.best);
    if (!weekday) return null;
    const fullNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const idx = dayNames.indexOf(weekday.name);
    return fullNames[idx];
  });

  readonly subtitle = computed(() => {
    if (!this.hasHabits()) return null;

    const earliest = this.earliestIso();
    const [y1, m1, d1] = earliest.split('-').map(Number);
    const [y2, m2, d2] = this.todayIso.split('-').map(Number);

    const startDate = new Date(y1, m1 - 1, d1);
    const endDate = new Date(y2, m2 - 1, d2);
    const monthLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Use Math.round instead of floor: across a spring-forward DST boundary,
    // the millisecond difference is one hour SHORT, so floor truncates to N-1.
    const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.ceil(daysDiff / 7);
    return `Last ${weeks} weeks · since ${monthLabel}`;
  });
}
