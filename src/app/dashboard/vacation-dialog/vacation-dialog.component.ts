import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { HabitService } from '../../habit/habit.service';
import { RangePickerComponent, DateRange } from '../../shared/range-picker/range-picker.component';
import { formatShortDate } from '../../shared/format-short-date';

const PILLS = [
  { days: 3, label: '3 days' },
  { days: 5, label: '5 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
];

@Component({
  selector: 'app-vacation-dialog',
  standalone: true,
  imports: [RangePickerComponent],
  templateUrl: './vacation-dialog.component.html',
  styleUrl: './vacation-dialog.component.scss',
})
export class VacationDialogComponent implements OnInit {
  private readonly habitService = inject(HabitService);
  readonly today = input.required<Date>();
  readonly closed = output<void>();

  readonly pills = PILLS;
  readonly todayIso = computed(() => HabitService.todayIso(this.today()));
  /** Read once when the dialog body is created (it is @if-ed per open). */
  readonly existing = computed(() => this.habitService.currentVacation(this.today()));
  readonly underway = computed(() => {
    const v = this.existing();
    return v !== null && v.from <= this.todayIso();
  });

  readonly from = signal('');
  readonly length = signal(7);

  ngOnInit(): void {
    const v = this.existing();
    if (v) {
      this.from.set(v.from);
      this.length.set(this.daysBetween(v.from, v.to));
    } else {
      this.from.set(this.todayIso());
      this.length.set(7);
    }
  }

  readonly to = computed(() => HabitService.shiftIso(this.from(), this.length()));
  readonly rangeLabel = computed(
    () => `${formatShortDate(this.from())} – ${formatShortDate(HabitService.shiftIso(this.to(), -1))}`,
  );
  readonly resumeLabel = computed(() => formatShortDate(this.to()));
  readonly dayWord = computed(() => (this.length() === 1 ? 'day' : 'days'));

  /** K = active habits with a running streak; L = the longest (Analyst §2.6). */
  readonly keepLine = computed(() => {
    const habits = this.habitService.activeHabits();
    const k = habits.filter((h) => this.habitService.currentStreak(h, this.today()) > 0).length;
    if (k === 0) {
      return 'No active streaks to protect';
    }
    const top = this.habitService.topCurrentStreak(habits, this.today());
    return `${k} active streak${k === 1 ? '' : 's'} (longest ${top?.streak ?? 0} days) will be kept`;
  });

  readonly confirmLabel = computed(() => (this.existing() ? 'Update vacation' : 'Start vacation'));

  /** Underway: a pill whose end would not reach past today is unusable (I6). */
  pillDisabled(days: number): boolean {
    return this.underway() && HabitService.shiftIso(this.from(), days) <= this.todayIso();
  }

  setRange(range: DateRange): void {
    this.from.set(range.from);
    this.length.set(this.daysBetween(range.from, range.to));
  }

  setLength(days: number): void {
    if (!this.pillDisabled(days)) {
      this.length.set(days);
    }
  }

  confirm(): void {
    const ok = this.existing()
      ? this.habitService.updateVacation(this.from(), this.to(), this.today())
      : this.habitService.startVacation(this.from(), this.to(), this.today());
    if (ok) {
      this.closed.emit();
    }
  }

  private daysBetween(from: string, to: string): number {
    let n = 0;
    let cursor = from;
    while (cursor < to) {
      cursor = HabitService.shiftIso(cursor, 1);
      n++;
    }
    return n;
  }
}
