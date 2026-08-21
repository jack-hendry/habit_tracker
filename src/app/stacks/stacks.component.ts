import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { colorOf, hexAlpha, iconOf, Habit } from '../habit/habit.model';
import { HabitService } from '../habit/habit.service';
import { StackPatch } from './stack.model';
import { StacksService } from './stacks.service';
import { StackFormComponent } from './stack-form/stack-form.component';

interface StackItem {
  habit: Habit;
  glyph: string;
  hex: string;
  done: boolean;
  dueToday: boolean;
  streak: number;
}

@Component({
  selector: 'app-stacks',
  standalone: true,
  imports: [RouterLink, StackFormComponent],
  templateUrl: './stacks.component.html',
  styleUrl: './stacks.component.scss',
})
export class StacksComponent {
  private readonly habitSvc = inject(HabitService);
  private readonly stacksSvc = inject(StacksService);

  /** Pinned once so every derivation on the page agrees about "today". */
  private readonly today = new Date();
  private readonly todayIso = HabitService.todayIso(this.today);

  readonly adding = signal<string | null>(null);
  readonly editing = signal<string | null>(null);

  private drag: { from: string | null; habitId: string } | null = null;

  newStack(): void {
    const created = this.stacksSvc.create();
    this.adding.set(created.id);
  }

  readonly cards = computed(() =>
    this.stacksSvc.stacks().map((stack) => {
      const hex = colorOf(stack.color).hex;
      const members = this.stacksSvc.visibleHabits(stack);
      const due = members.filter((h) => this.habitSvc.isDueOn(h, this.todayIso));
      const doneCount = due.filter((h) => this.habitSvc.isDoneToday(h)).length;
      return {
        stack,
        hex,
        tint: hexAlpha(hex, 0.09),
        aglyph: iconOf(stack.aglyph).glyph,
        doneLabel: `${doneCount} of ${due.length} done today`,
        items: members.map((habit) => ({
          habit,
          glyph: iconOf(habit.icon).glyph,
          hex: colorOf(habit.color).hex,
          done: this.habitSvc.isDoneToday(habit),
          dueToday: this.habitSvc.isDueOn(habit, this.todayIso),
          streak: this.habitSvc.currentStreak(habit, this.today),
        })),
      };
    })
  );

  readonly unstacked = computed(() => this.stacksSvc.unstacked());

  toggle(item: StackItem): void {
    if (!item.dueToday) return;
    this.habitSvc.toggleToday(item.habit.id);
  }

  removeFromStack(stackId: string, habitId: string): void {
    this.stacksSvc.removeHabit(stackId, habitId);
  }

  toggleAdding(stackId: string): void {
    this.adding.set(this.adding() === stackId ? null : stackId);
  }

  pick(stackId: string, habitId: string): void {
    this.stacksSvc.addHabit(stackId, habitId);
    this.adding.set(null);
  }

  onDragStart(habitId: string, from: string | null): void {
    this.drag = { from, habitId };
  }

  /** Required — without preventDefault the drop event never fires. */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, toStackId: string, index: number): void {
    event.preventDefault();
    event.stopPropagation();
    const drag = this.drag;
    this.drag = null;
    if (!drag) {
      return;
    }
    this.stacksSvc.moveHabit(drag.habitId, toStackId, index);
  }

  startEdit(id: string): void {
    this.editing.set(id);
  }

  cancelEdit(): void {
    this.editing.set(null);
  }

  saveEdit(id: string, patch: StackPatch): void {
    this.stacksSvc.update(id, patch);
    this.editing.set(null);
  }

  deleteStack(id: string): void {
    this.stacksSvc.remove(id);
    if (this.editing() === id) {
      this.editing.set(null);
    }
    if (this.adding() === id) {
      this.adding.set(null);
    }
  }
}
