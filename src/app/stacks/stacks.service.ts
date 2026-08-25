import { Injectable, signal, computed, effect, untracked, inject } from '@angular/core';
import { Stack, StackPatch, NEW_STACK_DEFAULTS, isStack } from './stack.model';
import { Habit } from '../habit/habit.model';
import { HabitService } from '../habit/habit.service';

/**
 * Client-side store for habit stacks, persisted to localStorage alongside
 * habits. Signal-based, mirroring `HabitService`.
 *
 * Holds *references* to habits by id. It never copies habit data and never
 * writes to `HabitService` — the dependency runs one way only (Analyst §3.4).
 */
@Injectable({ providedIn: 'root' })
export class StacksService {
  private static readonly STORAGE_KEY = 'habit_tracker.stacks.v1';

  private readonly habitService = inject(HabitService);

  private readonly _stacks = signal<Stack[]>(this.load());
  readonly stacks = this._stacks.asReadonly();

  /**
   * Active habits belonging to no stack, in `activeHabits()` order. The
   * complement of the union of every `habitIds` — well-defined only because a
   * habit belongs to at most one stack (AD-030).
   */
  readonly unstacked = computed<Habit[]>(() => {
    const claimed = new Set(this._stacks().flatMap((s) => s.habitIds));
    return this.habitService.activeHabits().filter((h) => !claimed.has(h.id));
  });

  constructor() {
    // Referential integrity, one direction only (AD-031). A *deleted* habit is
    // pruned from every stack; an *archived* one is not, so reactivating it
    // restores its original position. `habits()` rather than `activeHabits()`
    // is what makes that distinction — archived rows are still in `habits()`.
    // `untracked` keeps the write from re-entering the effect.
    effect(() => {
      const live = new Set(this.habitService.habits().map((h) => h.id));
      const current = untracked(this._stacks);
      let changed = false;
      const pruned = current.map((s) => {
        const kept = s.habitIds.filter((id) => live.has(id));
        if (kept.length === s.habitIds.length) {
          return s;
        }
        changed = true;
        return { ...s, habitIds: kept };
      });
      if (changed) {
        this._stacks.set(pruned);
        this.persist();
      }
    });
  }

  /** Append a defaulted stack and return it. The caller opens its chip picker. */
  create(): Stack {
    const stack: Stack = { id: crypto.randomUUID(), ...NEW_STACK_DEFAULTS, habitIds: [] };
    this._stacks.update((list) => [...list, stack]);
    this.persist();
    return stack;
  }

  /** Edit a stack's labels. Membership and identity are not patchable by design. */
  update(id: string, patch: StackPatch): void {
    this._stacks.update((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    this.persist();
  }

  /** Delete a stack. Its habits are untouched and fall back to the unstacked tray. */
  remove(id: string): void {
    this._stacks.update((list) => list.filter((s) => s.id !== id));
    this.persist();
  }

  /** Which stack a habit currently belongs to, or `null` if it is unstacked. */
  stackIdOf(habitId: string): string | null {
    return this._stacks().find((s) => s.habitIds.includes(habitId))?.id ?? null;
  }

  /**
   * The habits of a stack that should render, in stack order: members that
   * still exist and are not archived. Archived members keep their place in
   * `habitIds` but are hidden here (AD-031).
   */
  visibleHabits(stack: Stack): Habit[] {
    const byId = new Map(this.habitService.activeHabits().map((h) => [h.id, h]));
    return stack.habitIds.map((id) => byId.get(id)).filter((h): h is Habit => h !== undefined);
  }

  /** Append a habit to a stack, removing it from whichever stack it was in (AD-030). */
  addHabit(stackId: string, habitId: string): void {
    this.moveHabit(habitId, stackId, Number.MAX_SAFE_INTEGER);
  }

  /** Remove a habit from a stack. The habit itself is untouched; it returns to the tray. */
  removeHabit(stackId: string, habitId: string): void {
    this._stacks.update((list) =>
      list.map((s) => (s.id === stackId ? { ...s, habitIds: s.habitIds.filter((id) => id !== habitId) } : s)),
    );
    this.persist();
  }

  /**
   * Move a habit into `toStackId` at `index`, removing it from any stack it was
   * already in — including `toStackId` itself, which is how same-stack
   * reordering works. `index` is clamped to the target's length *after* the
   * removal, so dropping onto the footer button (index 99) appends.
   *
   * A no-op if `toStackId` does not exist, so a stale drop target cannot
   * silently delete the habit from its current stack.
   */
  moveHabit(habitId: string, toStackId: string, index: number): void {
    if (!this._stacks().some((s) => s.id === toStackId)) {
      return;
    }
    this._stacks.update((list) => {
      const stripped = list.map((s) => ({ ...s, habitIds: s.habitIds.filter((id) => id !== habitId) }));
      return stripped.map((s) => {
        if (s.id !== toStackId) {
          return s;
        }
        const at = Math.max(0, Math.min(index, s.habitIds.length));
        const habitIds = [...s.habitIds];
        habitIds.splice(at, 0, habitId);
        return { ...s, habitIds };
      });
    });
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(StacksService.STORAGE_KEY, JSON.stringify(this._stacks()));
    } catch {
      // Same posture as HabitService: no error UI yet.
    }
  }

  private load(): Stack[] {
    try {
      const raw = localStorage.getItem(StacksService.STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(isStack);
    } catch {
      return [];
    }
  }
}
