import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VacationDialogComponent } from './vacation-dialog.component';
import { HabitService } from '../../habit/habit.service';
import { Habit } from '../../habit/habit.model';

describe('VacationDialogComponent', () => {
  const STORAGE_KEY = 'habit_tracker.habits.v1';
  const VACATIONS_KEY = 'habit_tracker.vacations.v1';
  // Wed 2026-07-22 is "today" for every test.
  const WED_22 = new Date(2026, 6, 22);

  function makeHabit(overrides: Partial<Habit> = {}): Habit {
    return {
      id: 'h',
      name: 'Habit',
      createdAt: '2026-07-01T12:00:00Z',
      completedDates: [],
      schedule: { type: 'daily' },
      startDate: '2026-07-20',
      status: 'active',
      ...overrides,
    };
  }

  function create(): ComponentFixture<VacationDialogComponent> {
    const fixture = TestBed.createComponent(VacationDialogComponent);
    fixture.componentRef.setInput('today', WED_22);
    fixture.detectChanges();
    return fixture;
  }

  function text(fixture: ComponentFixture<VacationDialogComponent>, selector: string): string {
    return (fixture.nativeElement.querySelector(selector) as HTMLElement).textContent!.replace(/\s+/g, ' ').trim();
  }

  /** Text of the nth `.vac-row`, its spans joined by a space. */
  function rowText(fixture: ComponentFixture<VacationDialogComponent>, nth: number): string {
    const row = fixture.nativeElement.querySelectorAll('.vac-row')[nth] as HTMLElement;
    return Array.from(row.querySelectorAll('span'))
      .map((s) => s.textContent!.trim())
      .join(' ');
  }

  function pillButton(fixture: ComponentFixture<VacationDialogComponent>, label: string): HTMLButtonElement {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.pill')) as HTMLButtonElement[];
    const match = buttons.find((b) => b.textContent!.trim() === label);
    if (!match) {
      throw new Error(`no pill "${label}"`);
    }
    return match;
  }

  function buttonWithText(fixture: ComponentFixture<VacationDialogComponent>, label: string): HTMLButtonElement {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const match = buttons.find((b) => b.textContent!.trim() === label);
    if (!match) {
      throw new Error(`no button "${label}"`);
    }
    return match;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [VacationDialogComponent],
      providers: [HabitService],
    });
    jasmine.clock().install();
    jasmine.clock().mockDate(WED_22);
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    localStorage.clear();
  });

  it('defaults to today + 7 days with the 1 week pill active and a Start label', () => {
    const fixture = create();

    expect(rowText(fixture, 0)).toBe('Paused · 7 days Wed, Jul 22 – Tue, Jul 28');
    expect(rowText(fixture, 1)).toBe('Habits resume Wed, Jul 29');
    expect(pillButton(fixture, '1 week').classList).toContain('pill-active');
    expect(buttonWithText(fixture, 'Start vacation')).toBeTruthy();
  });

  it('clicking "2 weeks" sets the length to 14 days', () => {
    const fixture = create();

    pillButton(fixture, '2 weeks').click();
    fixture.detectChanges();

    expect(rowText(fixture, 0)).toBe('Paused · 14 days Wed, Jul 22 – Tue, Aug 4');
    expect(pillButton(fixture, '2 weeks').classList).toContain('pill-active');
  });

  it('confirm starts the vacation, emits closed, and persists the range', () => {
    const fixture = create();
    const closed = jasmine.createSpy('closed');
    fixture.componentInstance.closed.subscribe(closed);

    buttonWithText(fixture, 'Start vacation').click();

    expect(closed).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(HabitService).currentVacation(WED_22)).toEqual({
      from: '2026-07-22',
      to: '2026-07-29',
    });
  });

  it('keep line counts active streaks and names the longest, excluding archived and paused-without-streak habits', () => {
    // A: streak 3 (done 20, 21, 22). B: streak 0 (missed 21). C: archived with
    // completions — must not count. D: manually paused from 22 with a pre-pause
    // streak of 2 (done 20, 21) — a paused habit still keeps its streak.
    // Expected: K = A + D = 2; L = max(3, 2) = 3.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        makeHabit({
          id: 'a',
          name: 'A',
          completedDates: ['2026-07-20', '2026-07-21', '2026-07-22'],
        }),
        makeHabit({ id: 'b', name: 'B', completedDates: [] }),
        makeHabit({
          id: 'c',
          name: 'C',
          status: 'archived',
          completedDates: ['2026-07-20', '2026-07-21', '2026-07-22'],
        }),
        makeHabit({
          id: 'd',
          name: 'D',
          completedDates: ['2026-07-20', '2026-07-21'],
          pausedRanges: [{ from: '2026-07-22', to: null }],
        }),
      ]),
    );

    const fixture = create();

    expect(text(fixture, '.vac-keep')).toBe(
      '✓ 2 active streaks (longest 3 days) will be kept',
    );
  });

  it('reads "No active streaks to protect" when there are no habits', () => {
    const fixture = create();

    expect(text(fixture, '.vac-keep')).toBe('✓ No active streaks to protect');
  });

  it('an underway vacation shows Update, disables the 3-day pill and enables the 5-day pill', () => {
    localStorage.setItem(VACATIONS_KEY, JSON.stringify([{ from: '2026-07-19', to: '2026-07-27' }]));

    const fixture = create();

    expect(buttonWithText(fixture, 'Update vacation')).toBeTruthy();
    expect(pillButton(fixture, '3 days').disabled).toBeTrue();
    expect(pillButton(fixture, '5 days').disabled).toBeFalse();
  });
});
