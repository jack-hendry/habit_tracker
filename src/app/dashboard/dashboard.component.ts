import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HabitService } from '../habit/habit.service';
import { Habit, colorOf, iconOf } from '../habit/habit.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly habitService = inject(HabitService);
  readonly habits = this.habitService.habits;

  private readonly today = new Date();
  private readonly todayIso = HabitService.todayIso(this.today);

  readonly todoToday = computed(() => {
    return this.habits().filter(
      (h) => this.habitService.dayStatus(h, this.todayIso, this.today) === 'pending'
    );
  });

  readonly doneToday = computed(() => {
    return this.habits().filter((h) => h.completedDates.includes(this.todayIso));
  });

  readonly lapsed = computed(() => {
    return this.habits().filter((h) => this.habitService.isLapsed(h, this.today));
  });

  readonly overallCompletionRate = computed(() => {
    const habits = this.habits();
    if (habits.length === 0) {
      return null; // Will render as "—"
    }
    const total = habits.reduce((sum, h) => sum + this.habitService.completionRate(h, this.today), 0);
    return total / habits.length;
  });

  /**
   * Habit colour/icon (Phase 4a). Decoration only — the dashboard's own
   * `.done`/`.lapsed` classes carry status, so the accent must not compete with
   * them (habit-metadata CriticReview R8).
   */
  colorHex(habit: Habit): string {
    return colorOf(habit.color).hex;
  }

  iconGlyph(habit: Habit): string {
    return iconOf(habit.icon).glyph;
  }

  getCompletionPercentage(habit: Habit): string {
    const rate = this.habitService.completionRate(habit, this.today);
    return Math.round(rate * 100) + '%';
  }

  getLastDoneDaysAgo(habit: Habit): string {
    const lastDoneIso = this.habitService.lastDoneIso(habit);
    if (!lastDoneIso) {
      return 'never';
    }

    // Count days between lastDoneIso and today
    let cursor = lastDoneIso;
    let daysAgo = 0;
    while (cursor < this.todayIso) {
      cursor = this.nextIso(cursor);
      daysAgo++;
    }

    if (daysAgo === 0) {
      return 'today';
    } else if (daysAgo === 1) {
      return '1 day ago';
    }
    return `${daysAgo} days ago`;
  }

  toggleToday(id: string): void {
    this.habitService.toggleToday(id);
  }

  isDoneToday(id: string): boolean {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.isDoneToday(habit) : false;
  }

  private nextIso(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return HabitService.todayIso(new Date(y, m - 1, d + 1));
  }

  formatOverallRate(rate: number | null): string {
    if (rate === null) {
      return '—';
    }
    return Math.round(rate * 100) + '%';
  }
}
