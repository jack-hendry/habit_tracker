import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HabitService } from '../habit/habit.service';
import { Habit, colorOf, iconOf } from '../habit/habit.model';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss',
})
export class CalendarComponent {
  private readonly habitService = inject(HabitService);
  readonly habits = this.habitService.activeHabits;

  readonly selectedId = signal<string | null>(null);
  readonly currentMonth = signal({ year: new Date().getFullYear(), month: new Date().getMonth() });

  private readonly today = new Date();

  readonly selectedHabit = computed(() => {
    const habits = this.habits();
    const selectedId = this.selectedId();

    // If no habit is selected, use the first one
    if (!selectedId) {
      return habits.length > 0 ? habits[0] : null;
    }

    // If selected habit is in the list, use it; otherwise fall back to first
    const found = habits.find((h) => h.id === selectedId);
    return found || (habits.length > 0 ? habits[0] : null);
  });

  readonly monthGrid = computed(() => {
    const habit = this.selectedHabit();
    if (!habit) {
      return [];
    }
    const { year, month } = this.currentMonth();
    return this.habitService.monthGrid(habit, year, month, this.today);
  });

  readonly monthLabel = computed(() => {
    const { year, month } = this.currentMonth();
    const date = new Date(year, month, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly weekdayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /**
   * Habit colour/icon (Phase 4a) — used on the selector and heading only. The
   * day cells encode `DayStatus` as colour, and tinting them by habit colour
   * would put two meanings on one channel (habit-metadata CriticReview R8).
   */
  colorHex(habit: Habit): string {
    return colorOf(habit.color).hex;
  }

  iconGlyph(habit: Habit): string {
    return iconOf(habit.icon).glyph;
  }

  onHabitChange(id: string): void {
    this.selectedId.set(id);
  }

  prevMonth(): void {
    const { year, month } = this.currentMonth();
    if (month === 0) {
      this.currentMonth.set({ year: year - 1, month: 11 });
    } else {
      this.currentMonth.set({ year, month: month - 1 });
    }
  }

  nextMonth(): void {
    const { year, month } = this.currentMonth();
    if (month === 11) {
      this.currentMonth.set({ year: year + 1, month: 0 });
    } else {
      this.currentMonth.set({ year, month: month + 1 });
    }
  }

  getCellClass(cell: { iso?: string; status?: string } | { blank: true }): string {
    if ('blank' in cell) {
      return 'blank';
    }
    return `status-${cell.status}`;
  }
}
