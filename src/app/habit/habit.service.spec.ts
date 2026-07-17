import { HabitService } from './habit.service';
import { Habit } from './habit.model';

describe('HabitService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should add a habit and persist', () => {
    const service = new HabitService();
    service.add('Read 20 min');

    expect(service.habits().length).toBe(1);
    expect(service.habits()[0].name).toBe('Read 20 min');

    const stored = service.habits()[0];
    const reloaded = new HabitService();
    expect(reloaded.habits().length).toBe(1);
    expect(reloaded.habits()[0].id).toBe(stored.id);
  });

  it('should reject empty and whitespace-only names', () => {
    const service = new HabitService();
    service.add('');
    service.add('   ');
    service.add('\t\n');

    expect(service.habits().length).toBe(0);
  });

  it('should remove a habit and persist', () => {
    const service = new HabitService();
    service.add('Exercise');
    const id = service.habits()[0].id;

    service.remove(id);
    expect(service.habits().length).toBe(0);

    const reloaded = new HabitService();
    expect(reloaded.habits().length).toBe(0);
  });

  it('should toggle completion for today', () => {
    const service = new HabitService();
    service.add('Meditate');
    const habit = service.habits()[0];

    expect(service.isDoneToday(habit)).toBe(false);

    service.toggleToday(habit.id);
    expect(service.isDoneToday(service.habits()[0])).toBe(true);

    service.toggleToday(habit.id);
    expect(service.isDoneToday(service.habits()[0])).toBe(false);
  });

  it('should persist and reload completion state', () => {
    const service1 = new HabitService();
    service1.add('Write');
    const id = service1.habits()[0].id;
    service1.toggleToday(id);

    const service2 = new HabitService();
    const reloaded = service2.habits()[0];
    expect(service2.isDoneToday(reloaded)).toBe(true);
  });

  it('should survive full corruption (invalid JSON)', () => {
    localStorage.setItem('habit_tracker.habits.v1', 'not valid json');
    expect(() => new HabitService()).not.toThrow();
    expect(new HabitService().habits().length).toBe(0);
  });

  it('should survive full corruption (not an array)', () => {
    localStorage.setItem('habit_tracker.habits.v1', '{"a":1}');
    expect(() => new HabitService()).not.toThrow();
    expect(new HabitService().habits().length).toBe(0);
  });

  it('should recover from partial corruption (drops bad rows, keeps good ones)', () => {
    const valid = {
      id: '123',
      name: 'Good habit',
      createdAt: '2026-01-01T00:00:00Z',
      completedDates: [],
    };
    const invalid = { id: 123, name: 'Bad' }; // id is number, not string
    const mixed = [valid, invalid, valid];

    localStorage.setItem('habit_tracker.habits.v1', JSON.stringify(mixed));
    const service = new HabitService();
    expect(service.habits().length).toBe(2);
    expect(service.habits()[0].id).toBe('123');
    expect(service.habits()[1].id).toBe('123');
  });

  it('should format todayIso correctly for a fixed date', () => {
    // Month is 0-indexed in Date constructor, so Month 0 = January.
    expect(HabitService.todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(HabitService.todayIso(new Date(2026, 11, 25))).toBe('2026-12-25');
    expect(HabitService.todayIso(new Date(2026, 5, 9))).toBe('2026-06-09');
  });

  it('should handle localStorage quota exceeded gracefully', () => {
    const service = new HabitService();
    service.add('First');

    // Simulate quota exceeded by replacing setItem to throw.
    const originalSetItem = Storage.prototype.setItem;
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');

    expect(() => service.add('Second')).not.toThrow();
    // The signal updated locally even though persist failed (MVP contract).
    expect(service.habits().length).toBe(2);

    Storage.prototype.setItem = originalSetItem;
  });
});

// Phase 2 — scheduling + streaks. Dates chosen from July 2026:
// 13 Mon, 14 Tue, 15 Wed, 16 Thu, 17 Fri, 18 Sat, 19 Sun, 20 Mon.
describe('HabitService — scheduling + streaks', () => {
  const MWF = { type: 'weekdays' as const, days: [1, 3, 5] }; // Mon/Wed/Fri
  const FRI_17 = new Date(2026, 6, 17); // "today" = Friday 2026-07-17

  function makeHabit(overrides: Partial<Habit> = {}): Habit {
    return {
      id: 'h1',
      name: 'Test',
      createdAt: '2026-07-13T12:00:00Z',
      completedDates: [],
      schedule: { type: 'daily' },
      ...overrides,
    };
  }

  beforeEach(() => localStorage.clear());

  describe('add() schedule validation', () => {
    it('stores a weekdays schedule', () => {
      const service = new HabitService();
      service.add('Gym', { type: 'weekdays', days: [1, 3, 5] });
      expect(service.habits()[0].schedule).toEqual({ type: 'weekdays', days: [1, 3, 5] });
    });

    it('rejects a weekdays schedule with no days', () => {
      const service = new HabitService();
      service.add('Gym', { type: 'weekdays', days: [] });
      expect(service.habits().length).toBe(0);
    });
  });

  describe('isDueOn', () => {
    const service = new HabitService();

    it('daily is due on any date on/after creation', () => {
      const h = makeHabit();
      expect(service.isDueOn(h, '2026-07-13')).toBe(true);
      expect(service.isDueOn(h, '2026-07-17')).toBe(true);
    });

    it('is never due before the creation date', () => {
      const h = makeHabit({ createdAt: '2026-07-15T12:00:00Z' });
      expect(service.isDueOn(h, '2026-07-13')).toBe(false); // a Monday, but pre-creation
    });

    it('weekdays is due only on listed weekdays', () => {
      const h = makeHabit({ schedule: MWF });
      expect(service.isDueOn(h, '2026-07-13')).toBe(true); // Mon
      expect(service.isDueOn(h, '2026-07-14')).toBe(false); // Tue
      expect(service.isDueOn(h, '2026-07-15')).toBe(true); // Wed
      expect(service.isDueOn(h, '2026-07-16')).toBe(false); // Thu
      expect(service.isDueOn(h, '2026-07-17')).toBe(true); // Fri
    });
  });

  describe('currentStreak', () => {
    const service = new HabitService();

    it('counts consecutive completed daily days', () => {
      const h = makeHabit({ completedDates: ['2026-07-16', '2026-07-17'] });
      expect(service.currentStreak(h, FRI_17)).toBe(2);
    });

    it('is 1 when only today is completed', () => {
      const h = makeHabit({ completedDates: ['2026-07-17'] });
      expect(service.currentStreak(h, FRI_17)).toBe(1);
    });

    it('does not break when today is due but not yet completed', () => {
      // Completed 15 & 16, today 17 not done → still 2 (today is not over).
      const h = makeHabit({ completedDates: ['2026-07-15', '2026-07-16'] });
      expect(service.currentStreak(h, FRI_17)).toBe(2);
    });

    it('skips un-due days for a weekdays schedule (Mon+Wed = 2)', () => {
      const h = makeHabit({ schedule: MWF, completedDates: ['2026-07-13', '2026-07-15'] });
      expect(service.currentStreak(h, new Date(2026, 6, 15))).toBe(2); // today = Wed
    });

    it('resets to 0 after a missed due day', () => {
      // Mon/Wed done, Fri (17) missed; today Mon 20 (not yet done) → streak 0.
      const h = makeHabit({ schedule: MWF, completedDates: ['2026-07-13', '2026-07-15'] });
      expect(service.currentStreak(h, new Date(2026, 6, 20))).toBe(0);
    });

    it('does not count phantom pre-creation misses', () => {
      // Created Wed 15; Mon 13 (a due weekday) is before creation, must not break.
      const h = makeHabit({
        schedule: MWF,
        createdAt: '2026-07-15T12:00:00Z',
        completedDates: ['2026-07-15'],
      });
      expect(service.currentStreak(h, new Date(2026, 6, 15))).toBe(1);
    });

    it('an off-schedule completion never starts a streak', () => {
      // Tue 14 completed but not a due day; Mon 13 due and missed → 0.
      const h = makeHabit({ schedule: MWF, completedDates: ['2026-07-14'] });
      expect(service.currentStreak(h, new Date(2026, 6, 14))).toBe(0);
    });
  });

  describe('longestStreak', () => {
    const service = new HabitService();

    it('reports the best historical run even after a reset', () => {
      // 13,14,15 = run of 3; 16 missed (reset); 17 = 1. Best = 3.
      const h = makeHabit({
        completedDates: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-17'],
      });
      expect(service.longestStreak(h, FRI_17)).toBe(3);
      expect(service.currentStreak(h, FRI_17)).toBe(1);
    });

    it('is 0 for a brand-new habit due today but not done', () => {
      const h = makeHabit({ createdAt: '2026-07-17T12:00:00Z', completedDates: [] });
      expect(service.longestStreak(h, FRI_17)).toBe(0);
    });

    it('ignores off-schedule completions', () => {
      const h = makeHabit({ schedule: MWF, completedDates: ['2026-07-14'] }); // Tue only
      expect(service.longestStreak(h, FRI_17)).toBe(0);
    });
  });

  describe('migration', () => {
    it('loads a legacy row (no schedule) as daily with working streaks', () => {
      const legacy = {
        id: 'legacy',
        name: 'Old habit',
        createdAt: '2026-07-13T12:00:00Z',
        completedDates: ['2026-07-16', '2026-07-17'],
      };
      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([legacy]));

      const service = new HabitService();
      expect(service.habits().length).toBe(1);
      expect(service.habits()[0].schedule).toEqual({ type: 'daily' });
      expect(service.currentStreak(service.habits()[0], FRI_17)).toBe(2);
    });

    it('drops a row with a malformed schedule', () => {
      const bad = {
        id: 'bad',
        name: 'Corrupt',
        createdAt: '2026-07-13T12:00:00Z',
        completedDates: [],
        schedule: { type: 'weekdays', days: [] }, // empty days = corrupt
      };
      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([bad]));
      expect(new HabitService().habits().length).toBe(0);
    });
  });
});
