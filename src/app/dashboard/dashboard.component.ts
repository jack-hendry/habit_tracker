import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HabitService } from '../habit/habit.service';
import { Habit, colorOf, iconOf } from '../habit/habit.model';
import { StatCardComponent } from '../shared/stat-card/stat-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  private readonly habitService = inject(HabitService);
  readonly habits = this.habitService.activeHabits;

  private readonly today = new Date();
  private readonly todayIso = HabitService.todayIso(this.today);

  readonly todoToday = computed(() => {
    return this.habits().filter(
      (h) => !this.habitService.isPaused(h, this.today) &&
             this.habitService.dayStatus(h, this.todayIso, this.today) === 'pending'
    );
  });

  readonly doneToday = computed(() => {
    return this.habits().filter((h) => h.completedDates.includes(this.todayIso));
  });

  /**
   * Deliberately NOT `HabitService.isLapsed`, which flags a habit forever once
   * it has missed even one day anywhere in its history (documented, tested
   * behaviour — habit.service.ts R4). Against real seed history nearly every
   * long-running habit has one miss somewhere, so that definition pins almost
   * the whole list here permanently and the "Overdue / slipping" panel stops
   * meaning anything (dashboard mockup shows only the one habit currently
   * slipping). This panel wants "currently slipping": not already checked off
   * today, and the most recently resolved due day before today (skipping
   * not-due days) was missed.
   */
  readonly lapsed = computed(() => {
    return this.habits().filter(
      (h) => !this.habitService.isPaused(h, this.today) &&
             this.isRecentlyLapsed(h)
    );
  });

  private isRecentlyLapsed(habit: Habit): boolean {
    if (habit.completedDates.includes(this.todayIso)) {
      return false;
    }
    const startIso = habit.startDate ?? HabitService.todayIso(new Date(habit.createdAt));
    let cursor = HabitService.shiftIso(this.todayIso, -1);
    while (cursor >= startIso) {
      const status = this.habitService.dayStatus(habit, cursor, this.today);
      if (status === 'done') {
        return false;
      }
      if (status === 'missed') {
        return true;
      }
      cursor = HabitService.shiftIso(cursor, -1);
    }
    return false;
  }

  /**
   * Pooled over every resolved due day of every active habit — NOT the mean of
   * per-habit rates it used to be (Analyst §3.1). Mean-of-rates gave a habit
   * created yesterday the same weight as one with six months of history, so
   * adding a habit moved a number that describes the past. Null (rendered '—')
   * when no due day has resolved yet.
   */
  readonly overallCompletionRate = computed(() => {
    const habits = this.habits();
    const fromIso = this.habitService.earliestStartIso(habits);
    if (fromIso === null) {
      return null;
    }
    const { done, countable } = this.habitService.poolCounts(habits, fromIso, this.todayIso, this.today);
    return countable === 0 ? null : done / countable;
  });

  // --- Stat row (Analyst §2.3) -------------------------------------------

  /** Counts DUE habits, so an off-schedule tick can never print "6 of 5". */
  readonly todayCounts = computed(() =>
    this.habitService.dueTodayCounts(this.habits(), this.today),
  );

  readonly todayPercent = computed(() => {
    const { due, done } = this.todayCounts();
    return due === 0 ? 0 : Math.round((done / due) * 100);
  });

  readonly topStreak = computed(() =>
    this.habitService.topCurrentStreak(this.habits(), this.today),
  );

  /** Null when nothing is running — the card then shows no owner (R3). */
  readonly topStreakOwner = computed(() => {
    const top = this.topStreak();
    return top === null ? null : `${iconOf(top.habit.icon).glyph} ${top.habit.name}`;
  });

  readonly perfectDays = computed(() => this.habitService.perfectDays(this.habits(), this.today));

  /** [today-6 … today] — 7 days ending today. */
  private readonly last7 = computed(() =>
    this.habitService.poolCounts(
      this.habits(),
      HabitService.shiftIso(this.todayIso, -6),
      this.todayIso,
      this.today,
    ),
  );

  /** [today-34 … today-7] — the 28 days immediately before that week. */
  private readonly priorMonth = computed(() =>
    this.habitService.poolCounts(
      this.habits(),
      HabitService.shiftIso(this.todayIso, -34),
      HabitService.shiftIso(this.todayIso, -7),
      this.today,
    ),
  );

  readonly last7Rate = computed(() => {
    const { done, countable } = this.last7();
    return countable === 0 ? null : done / countable;
  });

  /**
   * Points of difference between the week the card displays and the month
   * before it. Deliberately NOT the prototype's 28-vs-28 comparison, which
   * would put a delta next to a percentage it was not computed from
   * (Analyst §3.4).
   */
  private readonly deltaPoints = computed(() => {
    const week = this.last7();
    const prior = this.priorMonth();
    if (week.countable === 0 || prior.countable === 0) {
      return null;
    }
    return Math.round((week.done / week.countable - prior.done / prior.countable) * 100);
  });

  readonly deltaLabel = computed(() => {
    const delta = this.deltaPoints();
    if (delta === null) {
      return 'no prior data';
    }
    if (delta === 0) {
      return 'no change vs prior month';
    }
    return `${delta > 0 ? '+' : ''}${delta} pts vs prior month`;
  });

  readonly deltaTone = computed<'muted' | 'positive' | 'negative'>(() => {
    const delta = this.deltaPoints();
    if (delta === null || delta === 0) {
      return 'muted';
    }
    return delta > 0 ? 'positive' : 'negative';
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

  /** A 0..1 rate as a whole percentage; null renders as an em dash. */
  formatRate(rate: number | null): string {
    if (rate === null) {
      return '—';
    }
    return Math.round(rate * 100) + '%';
  }
}
