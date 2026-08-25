import { Component, inject, computed, signal, effect, viewChild, ElementRef } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HabitService } from '../habit/habit.service';
import { Habit, colorOf, iconOf, hexAlpha, HabitPatch } from '../habit/habit.model';
import { scheduleLabel } from '../shared/schedule-label';
import { ActivityGridComponent } from '../shared/activity-grid/activity-grid.component';
import { HabitFormComponent } from '../shared/habit-form/habit-form.component';

@Component({
  selector: 'app-habit-detail',
  standalone: true,
  imports: [RouterLink, ActivityGridComponent, HabitFormComponent],
  templateUrl: './habit-detail.component.html',
  styleUrl: './habit-detail.component.scss',
})
export class HabitDetailComponent {
  private readonly habitService = inject(HabitService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Pinned once so every derivation on the page agrees about "today". */
  private readonly today = new Date();

  /**
   * The `:id` as a **signal**, not a one-shot `snapshot` read. Angular reuses a
   * component instance when only the route parameter changes (same route
   * config), so `/habits/a` → `/habits/b` does **not** reconstruct this class.
   * A snapshot captured in a field would pin the page to whichever habit was
   * opened first — the page would keep habit A's name, tint and stats while the
   * URL said B. Caught by AC 4's two-colour assertion; see L-022.
   */
  private readonly id = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  /**
   * Reads `habits()`, not `activeHabits()` — an archived habit's detail page
   * renders normally, so a deep link or a back-button press after archiving
   * still resolves (Analyst §2.9 F). Only `/habits` filters.
   */
  readonly habit = computed<Habit | null>(
    () => this.habitService.habits().find((h) => h.id === this.id()) ?? null,
  );

  constructor() {
    // An unknown or malformed id goes back to the list, not to a 404 — the app
    // has no designed 404 page (Analyst §2.9 E). Synchronous so the initial
    // load redirects within the same tick (`habits()` is loaded synchronously
    // from localStorage, so there is no window in which a real habit reads as
    // missing). The `effect` below covers the same check for a later parameter
    // change, which the constructor alone cannot see.
    if (this.habit() === null) {
      this.router.navigateByUrl('/habits');
    }
    effect(() => {
      if (this.habit() === null) {
        this.router.navigateByUrl('/habits');
      }
    });
  }

  hex(): string { return colorOf(this.habit()?.color).hex; }
  glyph(): string { return iconOf(this.habit()?.icon).glyph; }
  /** The hero's 9% tint, derived per habit — never a constant (AC 4). */
  heroTint(): string { return hexAlpha(this.hex(), 0.09); }

  /** Both hero stats from one traversal — one contract for the empty case
   *  (CriticReview R2). `completionRate` is deliberately not used here: it
   *  returns 1 for "nothing owed", which would read as 100% next to 0
   *  completions on a brand-new habit. AD-010 met this and chose `—`. */
  private readonly lifetime = computed(() => {
    const h = this.habit();
    return h ? this.habitService.lifetimeCounts(h, this.today) : { done: 0, countable: 0 };
  });

  /** Percent as a whole number, or null when nothing has resolved → renders `—`. */
  readonly completionPct = computed(() => {
    const { done, countable } = this.lifetime();
    return countable ? Math.round((done / countable) * 100) : null;
  });

  /** Due-day completions, not `completedDates.length` — an off-schedule tick
   *  shows in the Activity grid (AD-014) but not here (Analyst §2.9 C). */
  readonly completions = computed(() => this.lifetime().done);

  readonly currentStreak = computed(() => {
    const h = this.habit();
    return h ? this.habitService.currentStreak(h, this.today) : 0;
  });

  readonly bestStreak = computed(() => {
    const h = this.habit();
    return h ? this.habitService.longestStreak(h, this.today) : 0;
  });

  /** The Sunday-aligned 18-week window ending today. Raw `dayStatus`, no
   *  `isDueOn` guard (AD-014) — this is a record of what happened, not a rate. */
  readonly activityStatuses = computed(() => {
    const h = this.habit();
    if (!h) return [];
    return this.habitService.recentStatuses(h, this.habitService.activityWindowDays(this.today), this.today);
  });

  /** Component state, not a URL param — the page opens on the current month
   *  every visit and does not preserve it (Analyst §2.6). */
  readonly viewMonth = signal({ year: new Date().getFullYear(), month: new Date().getMonth() });

  readonly monthCells = computed(() => {
    const h = this.habit();
    if (!h) return [];
    const { year, month } = this.viewMonth();
    return this.habitService.monthGrid(h, year, month, this.today);
  });

  readonly monthLabel = computed(() => {
    const { year, month } = this.viewMonth();
    return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  readonly weekdayInitials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  readonly monthCounts = computed(() => {
    const h = this.habit();
    if (!h) return { done: 0, countable: 0 };
    const { year, month } = this.viewMonth();
    return this.habitService.monthToDateCounts(h, year, month, this.today);
  });

  /** Bar width as a percent. Zero countable → an empty track, not a full bar. */
  readonly monthPct = computed(() => {
    const { done, countable } = this.monthCounts();
    return countable ? (done / countable) * 100 : 0;
  });

  /** Title tracks the **viewed** month, not today's (`March so far` when paged back). */
  readonly monthShortLabel = computed(() => {
    const { year, month } = this.viewMonth();
    return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' });
  });

  /** One of exactly three states (Analyst §2.3). Returns the key; the template
   *  maps it to a label and a class so the two cannot drift apart. */
  readonly todayState = computed<'done' | 'pending' | 'not-due'>(() => {
    const h = this.habit();
    if (!h) return 'not-due';
    const iso = HabitService.todayIso(this.today);
    if (h.completedDates.includes(iso)) return 'done';
    return this.habitService.isDueOn(h, iso) ? 'pending' : 'not-due';
  });

  readonly todayLabel = computed(() => ({
    'done': 'Done ✓',
    'pending': 'Pending — due by midnight',
    'not-due': 'Not scheduled today',
  })[this.todayState()]);

  /** `schedule · category · since MMM D`. The category segment and its
   *  separator are omitted when absent rather than printed empty (Analyst §2.2). */
  readonly metaLine = computed(() => {
    const h = this.habit();
    if (!h) return '';
    const parts = [scheduleLabel(h.schedule)];
    if (h.category) parts.push(h.category);
    parts.push(`since ${this.sinceLabel(h)}`);
    return parts.join(' · ');
  });

  /** `MMM D` from a `YYYY-MM-DD`, built from split parts — never
   *  `new Date(iso)`, which parses as UTC and shifts the day in negative-offset
   *  timezones (AD-003). */
  private sinceLabel(habit: Habit): string {
    const iso = habit.startDate ?? HabitService.todayIso(new Date(habit.createdAt));
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /** The habit's start month, the lower bound of paging. */
  private readonly startMonth = computed(() => {
    const h = this.habit();
    if (!h) return null;
    const iso = h.startDate ?? HabitService.todayIso(new Date(h.createdAt));
    const [y, m] = iso.split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  /** Disabled in the current month — there is nothing later to show. */
  readonly canGoNext = computed(() => {
    const { year, month } = this.viewMonth();
    return year * 12 + month < this.today.getFullYear() * 12 + this.today.getMonth();
  });

  /** Disabled in the habit's start month. Both arrows disable together for a
   *  habit started this month, and for one with a future start date — correct
   *  in both cases, there is nothing to page to (CriticReview R13). */
  readonly canGoPrev = computed(() => {
    const start = this.startMonth();
    if (!start) return false;
    const { year, month } = this.viewMonth();
    return year * 12 + month > start.year * 12 + start.month;
  });

  prevMonth(): void {
    if (!this.canGoPrev()) return;
    const { year, month } = this.viewMonth();
    this.viewMonth.set(month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  }

  nextMonth(): void {
    if (!this.canGoNext()) return;
    const { year, month } = this.viewMonth();
    this.viewMonth.set(month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  }

  readonly categories = this.habitService.categories;
  readonly editing = signal(false);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('editDialog');

  openEdit(): void {
    this.editing.set(true);
    this.dialog().nativeElement.showModal();
  }

  /** Fired by Cancel, by Esc (native) and by `close`. Idempotent (AD-016). */
  closeEdit(): void {
    this.editing.set(false);
    const el = this.dialog().nativeElement;
    if (el.open) {
      el.close();
    }
  }

  saveEdit(patch: HabitPatch): void {
    const h = this.habit();
    if (h) {
      this.habitService.update(h.id, patch);
    }
    this.closeEdit();
  }

  /** Archive, then leave — staying would strand the user on the detail page of
   *  a habit that has just left the list they came from (Analyst §2.7). */
  archive(): void {
    const h = this.habit();
    if (h) {
      this.habitService.archive(h.id);
    }
    this.router.navigateByUrl('/habits');
  }
}
