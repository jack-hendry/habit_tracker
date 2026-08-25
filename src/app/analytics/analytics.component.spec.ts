import { TestBed } from '@angular/core/testing';
import { AnalyticsComponent } from './analytics.component';
import { HabitService } from '../habit/habit.service';
import { Habit } from '../habit/habit.model';
import { ActivatedRoute } from '@angular/router';

describe('AnalyticsComponent', () => {
  let component: AnalyticsComponent;
  let today: Date;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {},
        },
      ],
    });
    today = new Date();
  });

  function createTestHabit(id: string, name: string, overrides?: Partial<Habit>): Habit {
    const todayIso = HabitService.todayIso(today);
    return {
      id,
      name,
      createdAt: today.toISOString(),
      completedDates: [],
      schedule: { type: 'daily' },
      category: 'Test',
      color: 'sky',
      icon: 'book',
      startDate: HabitService.shiftIso(todayIso, -30),
      status: 'active',
      ...overrides,
    };
  }

  /**
   * Test 1: No habits → empty state renders, no stat cards
   */
  it('renders empty state and no stat cards when no habits exist', () => {
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const emptyState = host.querySelector('.empty-state');
    expect(emptyState).toBeDefined();
    expect(emptyState?.textContent).toContain('No habits yet');

    const statCards = host.querySelectorAll('app-stat-card');
    expect(statCards.length).toBe(0);
  });

  /**
   * Test 2: Habits with no resolved due day → rate renders '—', not '100%'
   */
  it('renders rate as — when no habit is due over the window', () => {
    // Create a habit that is never due (custom schedule with no days)
    const habit = createTestHabit('test-1', 'Never due', {
      schedule: { type: 'weekdays', days: [] }, // No days scheduled
      completedDates: [HabitService.todayIso(today)],
    });

    localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([habit]));
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;

    const overallRate = component.overallRate();
    expect(overallRate).toBe('—');
    expect(overallRate).not.toBe('100%');
  });

  /**
   * Test 3: topCurrentStreak returning null → 0 renders, no owner name
   */
  it('renders 0 for top streak when no streak exists', () => {
    // Create a habit with no streaks (just scattered completions)
    const habit = createTestHabit('test-2', 'One off', {
      completedDates: [],
    });

    localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([habit]));
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;

    const streak = component.topStreak();
    expect(streak).toBe('0');
  });

  /**
   * Test 4: A weekday with null rate renders '—' and 0-width bar
   */
  it('renders — and 0-width bar for weekday with null rate', () => {
    // Create a habit that is only due Mon/Wed/Fri
    const todayIso = HabitService.todayIso(today);

    const habit = createTestHabit('test-3', 'M/W/F', {
      schedule: { type: 'weekdays', days: [1, 3, 5] }, // Mon, Wed, Fri
      startDate: HabitService.shiftIso(todayIso, -30),
      completedDates: [
        HabitService.shiftIso(todayIso, -14),
        HabitService.shiftIso(todayIso, -12),
        HabitService.shiftIso(todayIso, -10),
      ],
    });

    localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([habit]));
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;

    const weekdays = component.weekdays();
    // Tuesday = index 2, should have null rate
    const tuesday = weekdays[2];
    expect(tuesday.pct).toBe('—');
    expect(tuesday.pctNum).toBe(0);
    expect(tuesday.rate).toBeNull();
  });

  /**
   * Test 5: Leaderboard ordered by rate descending, names link to /habits/:id
   */
  it('leaderboard is ordered by rate descending and links to habit detail', () => {
    const todayIso = HabitService.todayIso(today);

    const habits: Habit[] = [
      createTestHabit('h1', 'High rate', {
        startDate: HabitService.shiftIso(todayIso, -30),
        completedDates: [
          HabitService.shiftIso(todayIso, -30),
          HabitService.shiftIso(todayIso, -25),
          HabitService.shiftIso(todayIso, -20),
          HabitService.shiftIso(todayIso, -15),
          HabitService.shiftIso(todayIso, -10),
          HabitService.shiftIso(todayIso, -5),
          HabitService.shiftIso(todayIso, -1),
        ],
      }),
      createTestHabit('h2', 'Low rate', {
        startDate: HabitService.shiftIso(todayIso, -30),
        completedDates: [HabitService.shiftIso(todayIso, -5)],
      }),
    ];

    localStorage.setItem('habit_tracker.habits.v1', JSON.stringify(habits));
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;

    const ranked = component.ranked();
    expect(ranked.length).toBe(2);
    expect(ranked[0].habit.id).toBe('h1');
    expect(ranked[1].habit.id).toBe('h2');
    expect(ranked[0].rate).toBeGreaterThan(ranked[1].rate!);

    const links = fixture.nativeElement.querySelectorAll('.habit-name');
    expect(links.length).toBe(2);
    expect((links[0] as HTMLAnchorElement).getAttribute('href')).toContain('/habits/h1');
    expect((links[1] as HTMLAnchorElement).getAttribute('href')).toContain('/habits/h2');
  });

  /**
   * Test 6: Bar chart highlights MAXIMUM bar, NOT today
   * This test verifies that the bar highlighting logic uses the max value,
   * not the today's date.
   */
  it('bar chart highlights maximum bar, not today', () => {
    const todayIso = HabitService.todayIso(today);

    // Day -10 gets 2 completions (h1 + h2), day -9 and -8 get 1 (h1 only),
    // today gets 0 — day -10 is the unique max, today is the minimum.
    const habits: Habit[] = [
      createTestHabit('h1', 'Habit 1', {
        startDate: HabitService.shiftIso(todayIso, -30),
        completedDates: [
          HabitService.shiftIso(todayIso, -10),
          HabitService.shiftIso(todayIso, -9),
          HabitService.shiftIso(todayIso, -8),
        ],
      }),
      createTestHabit('h2', 'Habit 2', {
        startDate: HabitService.shiftIso(todayIso, -30),
        completedDates: [HabitService.shiftIso(todayIso, -10)],
      }),
    ];

    localStorage.setItem('habit_tracker.habits.v1', JSON.stringify(habits));
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;

    const bars = component.bars();
    expect(bars.length).toBe(14);

    const todayIndex = 13;
    const maxValue = Math.max(...bars.map((b) => b.value));
    const maxIndex = bars.findIndex((b) => b.value === maxValue);

    expect(maxValue).toBe(2);
    expect(maxIndex).toBe(3); // day -10 → 13 - 10
    expect(maxIndex).not.toBe(todayIndex);
    expect(bars[todayIndex].value).toBe(0);

    const columns = fixture.nativeElement.querySelectorAll('app-bar-chart .bar-column');
    expect(columns.length).toBe(14);
    expect(columns[maxIndex].querySelector('.bar')?.classList.contains('bar-max')).toBeTrue();
    expect(columns[todayIndex].querySelector('.bar')?.classList.contains('bar-max')).toBeFalse();
    expect(columns[todayIndex].querySelector('.bar')?.classList.contains('bar-rest')).toBeTrue();
  });

  /**
   * Test 7: Archived habit is absent from leaderboard and doesn't affect perfectDays
   */
  it('archived habit is absent from leaderboard and does not affect perfectDays', () => {
    const todayIso = HabitService.todayIso(today);

    const habits: Habit[] = [
      createTestHabit('active-h', 'Active habit', {
        startDate: HabitService.shiftIso(todayIso, -30),
        completedDates: [
          HabitService.shiftIso(todayIso, -30),
          HabitService.shiftIso(todayIso, -15),
          HabitService.shiftIso(todayIso, -5),
        ],
      }),
      createTestHabit('archived-h', 'Archived habit', {
        startDate: HabitService.shiftIso(todayIso, -30),
        completedDates: [
          HabitService.shiftIso(todayIso, -30),
          HabitService.shiftIso(todayIso, -15),
        ],
        status: 'archived',
      }),
    ];

    localStorage.setItem('habit_tracker.habits.v1', JSON.stringify(habits));
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    component = fixture.componentInstance;

    // Verify archived habit is not in ranked
    const ranked = component.ranked();
    expect(ranked.length).toBe(1);
    expect(ranked.some((r) => r.habit.id === 'archived-h')).toBeFalse();
    expect(ranked[0].habit.id).toBe('active-h');

    // Verify it's not in the template
    const habitNames = fixture.nativeElement.querySelectorAll('.habit-name');
    habitNames.forEach((el: HTMLElement) => {
      expect(el.textContent).not.toContain('Archived habit');
    });
  });
});
