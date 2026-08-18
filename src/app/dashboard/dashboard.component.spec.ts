import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { HabitService } from '../habit/habit.service';
import { Habit } from '../habit/habit.model';

describe('DashboardComponent', () => {
  // Dates from July 2026: 13 Mon, 14 Tue, 15 Wed, 16 Thu, 17 Fri, 18 Sat, 19 Sun, 20 Mon.
  const FRI_17 = new Date(2026, 6, 17); // Friday 2026-07-17 as "today"
  const TODAY_ISO = HabitService.todayIso(FRI_17);

  function makeHabit(overrides: Partial<Habit> = {}): Habit {
    return {
      id: 'h1',
      name: 'Test Habit',
      createdAt: '2026-07-13T12:00:00Z', // Before today so it's due
      completedDates: [],
      schedule: { type: 'daily' },
      startDate: '2026-07-13',
      ...overrides,
    };
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [HabitService],
    });
    // Use Jasmine's clock to control time
    jasmine.clock().install();
    jasmine.clock().mockDate(FRI_17);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  function createComponent(): any {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('todoToday', () => {
    it('excludes archived habits AND excludes paused habits', () => {
      // Seed localStorage with three habits:
      // 1. Normal (active, not paused) — should appear
      // 2. Archived — should NOT appear
      // 3. Paused — should NOT appear
      const normal = makeHabit({ id: 'normal', name: 'Normal', status: 'active' });
      const archived = makeHabit({ id: 'archived', name: 'Archived', status: 'archived' });
      const paused = makeHabit({
        id: 'paused',
        name: 'Paused',
        status: 'active',
        pausedRanges: [{ from: '2026-07-16', to: null }], // Open pause covering today
      });

      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([normal, archived, paused]));

      // Create component fixture (clock is mocked to FRI_17)
      const fixture = createComponent();

      // todoToday should only include the normal habit
      const result = fixture.componentInstance.todoToday();
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('normal');
    });
  });

  describe('doneToday', () => {
    it('includes a paused habit that was completed today (counter-intuitive but correct)', () => {
      // The key insight from habit-lifecycle CriticReview R9: a completed habit
      // should appear in doneToday even if paused, because it was really completed.
      // Hiding it would erase a real completion.

      // Two habits:
      // 1. Paused and completed today — should appear (counter-intuitive)
      // 2. Archived and completed today — should NOT appear
      const pausedCompleted = makeHabit({
        id: 'paused-done',
        name: 'Paused but Completed',
        status: 'active',
        completedDates: [TODAY_ISO], // Completed today
        pausedRanges: [{ from: '2026-07-16', to: null }], // Open pause covering today
      });

      const archivedCompleted = makeHabit({
        id: 'archived-done',
        name: 'Archived and Completed',
        status: 'archived',
        completedDates: [TODAY_ISO], // Completed today
      });

      localStorage.setItem(
        'habit_tracker.habits.v1',
        JSON.stringify([pausedCompleted, archivedCompleted]),
      );

      // Create component fixture (clock is mocked to FRI_17)
      const fixture = createComponent();

      const result = fixture.componentInstance.doneToday();
      // Should include the paused habit (because it was completed)
      // Should NOT include the archived habit (because it's archived)
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('paused-done');
    });

    it('excludes archived habits even if completed', () => {
      // Confirms the archived exclusion in doneToday
      const archived = makeHabit({
        id: 'archived-done',
        name: 'Archived and Completed',
        status: 'archived',
        completedDates: [TODAY_ISO],
      });

      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([archived]));

      // Create component fixture (clock is mocked to FRI_17)
      const fixture = createComponent();

      const result = fixture.componentInstance.doneToday();
      expect(result.length).toBe(0);
    });
  });

  describe('lapsed', () => {
    it('excludes archived habits AND excludes paused habits', () => {
      // A lapsed habit has missed days. Three cases:
      // 1. Normal lapsed (active, not paused) — should appear
      // 2. Archived lapsed — should NOT appear
      // 3. Paused lapsed — should NOT appear (pause makes days not-due, so not-missed)

      // To make a habit lapsed: have it due in the past and not completed
      const normalLapsed = makeHabit({
        id: 'normal-lapsed',
        name: 'Normal Lapsed',
        status: 'active',
        completedDates: [], // Nothing completed, so it's lapsed
      });

      const archivedLapsed = makeHabit({
        id: 'archived-lapsed',
        name: 'Archived Lapsed',
        status: 'archived',
        completedDates: [],
      });

      const pausedLapsed = makeHabit({
        id: 'paused-lapsed',
        name: 'Paused Lapsed',
        status: 'active',
        completedDates: [],
        pausedRanges: [{ from: '2026-07-13', to: null }], // Paused since start, all days not-due
      });

      localStorage.setItem(
        'habit_tracker.habits.v1',
        JSON.stringify([normalLapsed, archivedLapsed, pausedLapsed]),
      );

      // Create component fixture (clock is mocked to FRI_17)
      const fixture = createComponent();

      const result = fixture.componentInstance.lapsed();
      // Should only include the normal lapsed habit
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('normal-lapsed');
    });
  });

  describe('overallCompletionRate', () => {
    it('excludes archived habits from the average', () => {
      // Overall completion rate averages the completion rates of active habits.
      // Archived habits should not be included in the average.

      // Three habits:
      // 1. Active with 100% completion (4/4 days done)
      // 2. Active with 50% completion (2/4 days done)
      // 3. Archived with 0% completion (0/4 days done) — should NOT affect the average

      const active100 = makeHabit({
        id: 'active-100',
        name: 'Active 100%',
        status: 'active',
        completedDates: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'],
      });

      const active50 = makeHabit({
        id: 'active-50',
        name: 'Active 50%',
        status: 'active',
        completedDates: ['2026-07-13', '2026-07-14'],
        // 15, 16 not completed; 17 (today) pending/excluded
        // Countable: 13,14,15,16 (17 pending excluded) = 4; completed: 2 → 50%
      });

      const archived0 = makeHabit({
        id: 'archived-0',
        name: 'Archived 0%',
        status: 'archived',
        completedDates: [], // 0% completion
      });

      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([active100, active50, archived0]));

      // Create component fixture (clock is mocked to FRI_17)
      const fixture = createComponent();

      const result = fixture.componentInstance.overallCompletionRate();
      // Expected: (1.0 + 0.5) / 2 = 0.75 (only the two active habits)
      expect(result).toBeCloseTo(0.75, 2);
    });

    it('includes paused habits in the average', () => {
      // Paused habits are included in the completion rate average because
      // their paused days are already not-due (and thus not missing),
      // so they contribute honestly to the average.

      const active100 = makeHabit({
        id: 'active-100',
        name: 'Active 100%',
        status: 'active',
        completedDates: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'],
      });

      const paused100 = makeHabit({
        id: 'paused-100',
        name: 'Paused 100%',
        status: 'active',
        completedDates: ['2026-07-13', '2026-07-14'], // Completed before pause
        pausedRanges: [{ from: '2026-07-15', to: null }], // Paused from 15 onward
        // Countable due days: 13 (completed), 14 (completed), 15+ (not-due due to pause)
        // Completion rate: 2/2 = 100%
      });

      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([active100, paused100]));

      // Create component fixture (clock is mocked to FRI_17)
      const fixture = createComponent();

      const result = fixture.componentInstance.overallCompletionRate();
      // Expected: (1.0 + 1.0) / 2 = 1.0 (both active habits included)
      expect(result).toBeCloseTo(1.0, 2);
    });
  });

  describe('stat row', () => {
    it('counts only DUE habits in the TODAY card, ignoring an off-schedule tick', () => {
      // due today (Fri) + done; due today + pending; not due today but ticked.
      const dueDone = makeHabit({ id: 'a', completedDates: [TODAY_ISO] });
      const duePending = makeHabit({ id: 'b', completedDates: [] });
      const offSchedule = makeHabit({
        id: 'c',
        schedule: { type: 'weekdays', days: [1] }, // Mondays; today is Friday
        completedDates: [TODAY_ISO],
      });

      localStorage.setItem(
        'habit_tracker.habits.v1',
        JSON.stringify([dueDone, duePending, offSchedule]),
      );
      const c = createComponent().componentInstance;

      expect(c.todayCounts()).toEqual({ due: 2, done: 1 });
      expect(c.todayPercent()).toBe(50);
      // The off-schedule completion still shows in the list — both are right.
      expect(c.doneToday().length).toBe(2);
    });

    // Two specs, not one: `HabitService` is root-provided and reads
    // localStorage in its constructor, so a second `createComponent()` inside
    // one `it` reuses the already-loaded signal and never sees the reseeded
    // store. A fresh spec gets a fresh TestBed, which is the only reliable
    // reseed. (Found during coding — see the retrospective.)
    it('names the owner of the longest RUNNING streak', () => {
      const broken = makeHabit({
        id: 'broken',
        name: 'Broken',
        completedDates: ['2026-07-13', '2026-07-14', '2026-07-15'], // 16 missed
      });
      const running = makeHabit({
        id: 'running',
        name: 'Running',
        icon: 'run',
        completedDates: ['2026-07-15', '2026-07-16'],
      });

      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([broken, running]));
      const c = createComponent().componentInstance;

      expect(c.topStreak()?.streak).toBe(2);
      expect(c.topStreakOwner()).toBe('🏃 Running');
    });

    it('names nobody when no streak is running', () => {
      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([makeHabit({ id: 'none' })]));
      const c = createComponent().componentInstance;

      expect(c.topStreak()).toBeNull();
      expect(c.topStreakOwner()).toBeNull();
    });

    it('reports no prior data when the month before last week is empty', () => {
      // Starts 2026-07-13, so [today-34 … today-7] holds no due day at all.
      const h = makeHabit({ completedDates: ['2026-07-13', '2026-07-14'] });
      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([h]));
      const c = createComponent().componentInstance;

      expect(c.deltaLabel()).toBe('no prior data');
      expect(c.deltaTone()).toBe('muted');
      expect(c.last7Rate()).toBeCloseTo(0.5, 2); // 13,14 done; 15,16 missed
    });

    it('pools the overall rate instead of averaging per-habit rates', () => {
      // long: due 13..16, all done → 4/4. short: starts today, nothing resolved.
      // Mean-of-rates would be (1.0 + 1.0) / 2 = 1.0 for both; pooled is 4/4
      // here, and the difference shows once `short` misses a day.
      const long = makeHabit({
        id: 'long',
        completedDates: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'],
      });
      const shortMiss = makeHabit({
        id: 'short',
        startDate: '2026-07-15',
        createdAt: '2026-07-15T12:00:00Z',
        completedDates: [], // 15 and 16 missed
      });

      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([long, shortMiss]));
      const c = createComponent().componentInstance;

      // Pooled: 4 done of 6 countable = 0.666…  Mean-of-rates would be 0.5.
      expect(c.overallCompletionRate()).toBeCloseTo(4 / 6, 3);
    });
  });
});
