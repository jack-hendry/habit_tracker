import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HabitService } from './habit.service';
import { Schedule } from './habit.model';

@Component({
  selector: 'app-habit-list',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './habit-list.component.html',
  styleUrl: './habit-list.component.scss',
})
export class HabitListComponent {
  private readonly habitService = inject(HabitService);
  readonly habits = this.habitService.habits;
  readonly newName = signal('');
  readonly scheduleType = signal<'daily' | 'weekdays'>('daily');
  readonly selectedDays = signal<Set<number>>(new Set());

  readonly weekdays = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
  ];

  add(): void {
    const name = this.newName();
    if (!name.trim()) {
      return;
    }

    let schedule: Schedule;
    if (this.scheduleType() === 'daily') {
      schedule = { type: 'daily' };
    } else {
      const days = Array.from(this.selectedDays()).sort((a, b) => a - b);
      if (days.length === 0) {
        // Specific days with no day selected — reject like an empty name
        return;
      }
      schedule = { type: 'weekdays', days };
    }

    this.habitService.add(name, schedule);
    this.newName.set('');
    this.scheduleType.set('daily');
    this.selectedDays.set(new Set());
  }

  toggleDay(day: number): void {
    const days = new Set(this.selectedDays());
    if (days.has(day)) {
      days.delete(day);
    } else {
      days.add(day);
    }
    this.selectedDays.set(days);
  }

  isDaySelected(day: number): boolean {
    return this.selectedDays().has(day);
  }

  toggleToday(id: string): void {
    this.habitService.toggleToday(id);
  }

  remove(id: string): void {
    this.habitService.remove(id);
  }

  isDoneToday(id: string): boolean {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.isDoneToday(habit) : false;
  }

  isDueToday(id: string): boolean {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.isDueOn(habit, HabitService.todayIso()) : false;
  }

  getScheduleLabel(id: string): string {
    const habit = this.habits().find((h) => h.id === id);
    if (!habit) return '';
    if (habit.schedule.type === 'daily') {
      return 'Daily';
    }
    const days = habit.schedule.days;
    const labels = days.map((d) => this.weekdays[d].label);
    return labels.join(' ');
  }

  getCurrentStreak(id: string): number {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.currentStreak(habit) : 0;
  }

  getLongestStreak(id: string): number {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.longestStreak(habit) : 0;
  }
}
