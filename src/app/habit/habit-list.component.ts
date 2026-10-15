import { Component, inject, signal, computed, viewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HabitService } from './habit.service';
import { DayStripComponent } from '../shared/day-strip/day-strip.component';
import { HabitFormComponent } from '../shared/habit-form/habit-form.component';
import { scheduleLabel } from '../shared/schedule-label';
import {
  Habit,
  HabitPatch,
  Schedule,
  HABIT_COLORS,
  HABIT_ICONS,
  colorOf,
  iconOf,
  DayStatus,
} from './habit.model';

/** Sentinel for the "no category" filter option — distinct from `null` (= All). */
const UNCATEGORISED = '\0uncategorised';

@Component({
  selector: 'app-habit-list',
  standalone: true,
  imports: [FormsModule, CommonModule, DayStripComponent, HabitFormComponent, RouterLink],
  templateUrl: './habit-list.component.html',
  styleUrl: './habit-list.component.scss',
})
export class HabitListComponent {
  private readonly habitService = inject(HabitService);
  readonly habits = this.habitService.habits;

  /** Sentinel constant for uncategorised filter. */
  readonly uncategorised = UNCATEGORISED;

  // ---------------------------------------------------------------------------
  // Edit state (Phase 4a). Drafts moved to HabitFormComponent; only editingId
  // remains here to track which row is in edit mode.
  // ---------------------------------------------------------------------------

  readonly editingId = signal<string | null>(null);

  // ---------------------------------------------------------------------------
  // Archive view (Phase 4b)
  // ---------------------------------------------------------------------------

  readonly showArchived = signal(false);

  // ---------------------------------------------------------------------------
  // Create modal (Step 8)
  // ---------------------------------------------------------------------------

  readonly creating = signal(false);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('createDialog');

  // ---------------------------------------------------------------------------
  // Delete confirm (Phase 4b) — two-click inline latch
  // ---------------------------------------------------------------------------

  readonly confirmingDeleteId = signal<string | null>(null);

  /** The habit currently being edited, or null. Re-reads `habits()` so a deleted
   *  habit can never leave a form open over a row that no longer exists
   *  (CriticReview R11). */
  readonly editingHabit = computed(() => {
    const id = this.editingId();
    return id ? (this.habits().find((h) => h.id === id) ?? null) : null;
  });

  // ---------------------------------------------------------------------------
  // Category filter (Phase 4a)
  // ---------------------------------------------------------------------------

  /** `null` = All. View state only — deliberately not persisted. */
  readonly categoryFilter = signal<string | null>(null);

  readonly categories = this.habitService.categories;

  /** True when at least one active habit has no category — gates the extra filter option. */
  readonly hasUncategorised = computed(() => this.habitService.activeHabits().some((h) => !h.category));

  readonly visibleHabits = computed(() => {
    const showArchived = this.showArchived();
    const allHabits = showArchived ? this.habits() : this.habitService.activeHabits();
    const filter = this.categoryFilter();

    if (filter === null) {
      return allHabits;
    }
    if (filter === UNCATEGORISED) {
      return allHabits.filter((h) => !h.category);
    }
    const key = filter.toLowerCase();
    return allHabits.filter((h) => h.category?.toLowerCase() === key);
  });

  /** Open the create modal. Closes an open inline editor first (§3.5 E). */
  openCreate(): void {
    this.editingId.set(null);
    this.confirmingDeleteId.set(null);
    this.creating.set(true);
    this.dialog().nativeElement.showModal();
  }

  /** Fired by Cancel, by Esc (native) and by `close`. Idempotent. */
  closeCreate(): void {
    this.creating.set(false);
    const el = this.dialog().nativeElement;
    if (el.open) {
      el.close();
    }
  }

  /** Persist a new habit from the modal's form, then close it. */
  createHabit(patch: HabitPatch): void {
    if (!patch.name?.trim() || !patch.schedule) {
      return;
    }
    const created = this.habitService.add(patch.name, patch.schedule);
    if (created) {
      this.habitService.update(created.id, patch);
    }
    this.closeCreate();
  }

  // ---------------------------------------------------------------------------
  // Edit form (Phase 4a) — moved to HabitFormComponent
  // ---------------------------------------------------------------------------

  /** Open the inline editor. The form component handles prefilling (AC 2). */
  startEdit(habit: Habit): void {
    this.closeCreate();
    this.confirmingDeleteId.set(null);
    this.editingId.set(habit.id);
  }

  /** Discard edit (inline form closes). */
  cancelEdit(): void {
    this.editingId.set(null);
  }

  /** Persist edits from the form component. */
  saveEdit(patch: HabitPatch): void {
    const id = this.editingId();
    if (!id) {
      return;
    }

    this.habitService.update(id, patch);
    this.editingId.set(null);
  }

  toggleToday(id: string): void {
    this.habitService.toggleToday(id);
  }

  toggleDeleteConfirm(id: string): void {
    // First click arms the delete (only one row can be armed at a time).
    // Arming a different row disarms the previous one.
    if (this.confirmingDeleteId() === id) {
      // Already armed; this would be the second click (delete), handled by remove()
      return;
    }
    this.confirmingDeleteId.set(id);
  }

  cancelDelete(): void {
    this.confirmingDeleteId.set(null);
  }

  remove(id: string): void {
    // Close the editor and delete confirm if they were open over this habit (R11, R12).
    if (this.editingId() === id) {
      this.editingId.set(null);
    }
    this.confirmingDeleteId.set(null);
    this.habitService.remove(id);
  }

  pause(id: string): void {
    this.habitService.pause(id);
  }

  resume(id: string): void {
    this.habitService.resume(id);
  }

  archive(id: string): void {
    // Close the editor if it was open over this habit (R11).
    if (this.editingId() === id) {
      this.editingId.set(null);
    }
    this.habitService.archive(id);
  }

  reactivate(id: string): void {
    // Close the editor if it was open over this habit (R11).
    if (this.editingId() === id) {
      this.editingId.set(null);
    }
    this.habitService.reactivate(id);
  }

  // ---------------------------------------------------------------------------
  // Display helpers. New Phase 4a helpers take the `Habit` the template already
  // has in scope rather than re-`find`ing by id — 4a adds no new lookups
  // (CriticReview R14); the existing id-based helpers are left alone for 4b's
  // consumer sweep.
  // ---------------------------------------------------------------------------

  /** Hex for a habit's colour accent — decoration only, never status-bearing. */
  colorHex(habit: Habit): string {
    return colorOf(habit.color).hex;
  }

  /** Glyph for a habit's icon, or the default dot. */
  iconGlyph(habit: Habit): string {
    return iconOf(habit.icon).glyph;
  }

  isDoneToday(id: string): boolean {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.isDoneToday(habit) : false;
  }

  isDueToday(id: string): boolean {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.isDueOn(habit, HabitService.todayIso()) : false;
  }

  isPaused(id: string): boolean {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.isManuallyPaused(habit) : false;
  }

  isPausedOn(habit: Habit, iso: string): boolean {
    return this.habitService.isPausedOn(habit, iso);
  }

  /** The "not today" chip reads "paused" when today is paused for any reason (Analyst §2.3, Q1). */
  notTodayLabel(habit: Habit): string {
    return this.habitService.isPausedOn(habit, HabitService.todayIso()) ? 'paused' : 'not today';
  }

  getPausedSinceLabel(habit: Habit): string {
    const ranges = habit.pausedRanges ?? [];
    const openRange = ranges.find((r) => r.to === null);
    if (openRange) {
      return `Paused since ${openRange.from}`;
    }
    return '';
  }

  isArchived(id: string): boolean {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? habit.status === 'archived' : false;
  }

  isConfirmingDelete(id: string): boolean {
    return this.confirmingDeleteId() === id;
  }

  getScheduleLabel(id: string): string {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? scheduleLabel(habit.schedule) : '';
  }

  getCurrentStreak(id: string): number {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.currentStreak(habit) : 0;
  }

  getLongestStreak(id: string): number {
    const habit = this.habits().find((h) => h.id === id);
    return habit ? this.habitService.longestStreak(habit) : 0;
  }

  getCompletionPercentage(id: string): string {
    const habit = this.habits().find((h) => h.id === id);
    if (!habit) return '';
    const rate = this.habitService.completionRate(habit);
    return Math.round(rate * 100) + '%';
  }

  getCompletionPercentageForHabit(habit: Habit): string | null {
    // R13: A habit with a future startDate shows "Starts <date>" instead of a percentage
    if (habit.startDate && habit.startDate > HabitService.todayIso()) {
      return null;
    }
    const rate = this.habitService.completionRate(habit);
    return Math.round(rate * 100) + '%';
  }

  getStartsLabel(habit: Habit): string {
    if (habit.startDate && habit.startDate > HabitService.todayIso()) {
      return `Starts ${habit.startDate}`;
    }
    return '';
  }

  /** The last 30 days of status for the strip (§3.1). */
  strip30(habit: Habit): DayStatus[] {
    return this.habitService.recentStatuses(habit, 30);
  }
}
