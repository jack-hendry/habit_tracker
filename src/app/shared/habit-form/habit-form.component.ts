import { Component, inject, input, output, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Habit, HabitPatch, HABIT_COLORS, HABIT_ICONS } from '../../habit/habit.model';
import { HabitService } from '../../habit/habit.service';

@Component({
  selector: 'app-habit-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './habit-form.component.html',
  styleUrl: './habit-form.component.scss',
})
export class HabitFormComponent {
  private readonly habitService = inject(HabitService);

  readonly habit = input<Habit | null>(null);
  readonly categories = input<string[]>([]);
  readonly save = output<HabitPatch>();
  readonly cancel = output<void>();

  // Draft signals
  readonly draftName = signal('');
  readonly draftDescription = signal('');
  readonly draftCategory = signal('');
  readonly draftColor = signal('');
  readonly draftIcon = signal('');
  readonly draftNotes = signal('');
  readonly draftStartDate = signal('');
  readonly draftScheduleType = signal<'daily' | 'weekdays'>('daily');
  readonly draftDays = signal<Set<number>>(new Set());

  // Palette/icon set
  readonly colors = HABIT_COLORS;
  readonly icons = HABIT_ICONS;

  readonly weekdays = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
  ];

  constructor() {
    // Prefill drafts when habit input changes
    effect(() => {
      const h = this.habit();
      if (h) {
        this.draftName.set(h.name);
        this.draftDescription.set(h.description ?? '');
        this.draftCategory.set(h.category ?? '');
        this.draftColor.set(h.color ?? '');
        this.draftIcon.set(h.icon ?? '');
        this.draftNotes.set(h.notes ?? '');
        this.draftStartDate.set(h.startDate ?? '');
        this.draftScheduleType.set(h.schedule.type);
        this.draftDays.set(
          h.schedule.type === 'weekdays' ? new Set(h.schedule.days) : new Set(),
        );
      } else {
        // Null means create — clear all drafts
        this.draftName.set('');
        this.draftDescription.set('');
        this.draftCategory.set('');
        this.draftColor.set('');
        this.draftIcon.set('');
        this.draftNotes.set('');
        this.draftStartDate.set('');
        this.draftScheduleType.set('daily');
        this.draftDays.set(new Set());
      }
    });
  }

  toggleDraftDay(day: number): void {
    const days = new Set(this.draftDays());
    if (days.has(day)) {
      days.delete(day);
    } else {
      days.add(day);
    }
    this.draftDays.set(days);
  }

  isDraftDaySelected(day: number): boolean {
    return this.draftDays().has(day);
  }

  /** The schedule the drafts currently describe, or null if it is incomplete. */
  private draftSchedule(): { type: 'daily' } | { type: 'weekdays'; days: number[] } | null {
    if (this.draftScheduleType() === 'daily') {
      return { type: 'daily' };
    }
    const days = Array.from(this.draftDays()).sort((a, b) => a - b);
    return days.length === 0 ? null : { type: 'weekdays', days };
  }

  /** Save is blocked by exactly the two conditions `add`/`update` reject (AC 6, AC 7). */
  canSave(): boolean {
    return !!this.draftName().trim() && this.draftSchedule() !== null && this.isStartDateValid();
  }

  isStartDateValid(): boolean {
    const draft = this.draftStartDate();
    if (!draft) return true; // Empty is valid (will clear the field)
    // ISO_DATE pattern check
    return /^\d{4}-\d{2}-\d{2}$/.test(draft);
  }

  /**
   * Has the schedule been changed from the saved one? Compared **by value** —
   * drafts are new objects, so a reference check would always be true and the
   * recalculation warning would show permanently (CriticReview R12).
   */
  scheduleChanged(): boolean {
    const h = this.habit();
    const draft = this.draftSchedule();
    if (!h || !draft) {
      return false;
    }
    if (h.schedule.type !== draft.type) {
      return true;
    }
    if (h.schedule.type === 'weekdays' && draft.type === 'weekdays') {
      const saved = [...h.schedule.days].sort((a, b) => a - b);
      return saved.length !== draft.days.length || saved.some((d, i) => d !== draft.days[i]);
    }
    return false;
  }

  /**
   * Computed backdate warning (R14). When the draft startDate is earlier than the
   * saved one, count the due days between the proposed date and today that are not
   * in completedDates and show "N days before today will count as missed".
   */
  readonly backdateWarning = computed(() => {
    const h = this.habit();
    if (!h) return null;
    const draftDate = this.draftStartDate();
    if (!draftDate) return null;
    const savedDate = h.startDate ?? HabitService.todayIso(new Date(h.createdAt));
    if (draftDate >= savedDate) return null; // Not a backdate

    // Count due days between draftDate and today not in completedDates
    const today = HabitService.todayIso();
    const completed = new Set(h.completedDates);
    let count = 0;
    let cursor = draftDate;
    while (cursor < today) {
      if (this.habitService.isDueOn(h, cursor) && !completed.has(cursor)) {
        count++;
      }
      cursor = this.nextIso(cursor);
    }
    return count > 0 ? count : null;
  });

  readonly isFutureStartDate = computed(() => {
    const h = this.habit();
    if (!h) return false;
    const draftDate = this.draftStartDate();
    if (!draftDate) return false;
    return draftDate > HabitService.todayIso();
  });

  onSave(): void {
    const schedule = this.draftSchedule();
    if (!schedule || !this.canSave()) {
      return;
    }

    const patch: HabitPatch = {
      name: this.draftName(),
      schedule,
      description: this.draftDescription(),
      category: this.draftCategory(),
      color: this.draftColor(),
      icon: this.draftIcon(),
      notes: this.draftNotes(),
      startDate: this.draftStartDate() || undefined,
    };

    this.save.emit(patch);
  }

  private nextIso(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return HabitService.todayIso(new Date(y, m - 1, d + 1));
  }
}
