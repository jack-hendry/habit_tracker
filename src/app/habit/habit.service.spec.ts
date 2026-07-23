import { HabitService } from './habit.service';
import { Habit, HABIT_COLORS, HABIT_ICONS, colorOf, iconOf } from './habit.model';

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

// Phase 3 — dashboard-calendar-stats. Dates from July 2026:
// 13 Mon, 14 Tue, 15 Wed, 16 Thu, 17 Fri, 18 Sat, 19 Sun, 20 Mon.
describe('HabitService — Phase 3 (dayStatus, completionRate, isLapsed, monthGrid)', () => {
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

  describe('dayStatus', () => {
    const service = new HabitService();

    it('returns future for dates after today', () => {
      const h = makeHabit();
      expect(service.dayStatus(h, '2026-07-18', FRI_17)).toBe('future');
      expect(service.dayStatus(h, '2026-08-01', FRI_17)).toBe('future');
    });

    it('returns future even if a future date is in completedDates (order check, R1)', () => {
      const h = makeHabit({ completedDates: ['2026-07-18'] });
      expect(service.dayStatus(h, '2026-07-18', FRI_17)).toBe('future');
    });

    it('returns done for any date in completedDates (including off-schedule)', () => {
      const h = makeHabit({ completedDates: ['2026-07-14'] }); // Tue, not due
      expect(service.dayStatus(h, '2026-07-14', FRI_17)).toBe('done');
    });

    it('returns not-due for unscheduled days', () => {
      const h = makeHabit({ schedule: MWF });
      expect(service.dayStatus(h, '2026-07-14', FRI_17)).toBe('not-due'); // Tue
      expect(service.dayStatus(h, '2026-07-16', FRI_17)).toBe('not-due'); // Thu
    });

    it('returns not-due for dates before creation', () => {
      const h = makeHabit({ createdAt: '2026-07-15T12:00:00Z' }); // Created Wed
      expect(service.dayStatus(h, '2026-07-13', FRI_17)).toBe('not-due'); // Before creation
    });

    it('returns pending for today if due but not completed', () => {
      const h = makeHabit();
      expect(service.dayStatus(h, '2026-07-17', FRI_17)).toBe('pending');
    });

    it('returns missed for past due days that are not completed', () => {
      const h = makeHabit();
      expect(service.dayStatus(h, '2026-07-16', FRI_17)).toBe('missed');
      expect(service.dayStatus(h, '2026-07-13', FRI_17)).toBe('missed');
    });

    it('respects weekdays schedule for status checks', () => {
      const h = makeHabit({ schedule: MWF, completedDates: [] });
      expect(service.dayStatus(h, '2026-07-13', FRI_17)).toBe('missed'); // Mon, past, not done
      expect(service.dayStatus(h, '2026-07-14', FRI_17)).toBe('not-due'); // Tue, not due
      expect(service.dayStatus(h, '2026-07-15', FRI_17)).toBe('missed'); // Wed, past, not done
    });
  });

  describe('completionRate', () => {
    const service = new HabitService();

    it('returns 1 when all due days are completed', () => {
      const h = makeHabit({ completedDates: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17'] });
      expect(service.completionRate(h, FRI_17)).toBe(1);
    });

    it('returns 0.5 when half of due days are completed', () => {
      // 5 due days (13-17): completed 13, 15 → 2/4 countable days (17 pending excluded) = 0.5
      const h = makeHabit({ completedDates: ['2026-07-13', '2026-07-15'] });
      expect(service.completionRate(h, FRI_17)).toBe(0.5);
    });

    it('excludes pending today from denominator (R2)', () => {
      // 5 due days: completed 13,14,15,16, pending 17 → 4/4 = 1
      const h = makeHabit({ completedDates: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'] });
      expect(service.completionRate(h, FRI_17)).toBe(1);
    });

    it('returns 1 when no due days yet (denominator 0, R3)', () => {
      const h = makeHabit({ createdAt: '2026-07-19T12:00:00Z' }); // Created Sat, no due days by Fri
      expect(service.completionRate(h, FRI_17)).toBe(1);
    });

    it('ignores off-schedule completions (not in denominator)', () => {
      // Created 13 (Mon), due daily. Completed Tue 14 (off-schedule), then missed Wed-Fri.
      const h = makeHabit({ completedDates: ['2026-07-14'] }); // Only off-schedule
      // Due days: 13,14,15,16,17. Only 14 is completed but it doesn't count as due. Counts: 4 (13,15,16,17 missed/pending)
      // Actually, 14 is due (daily) and done → 1/5 done = 0.2, wait. Let me re-think.
      // Actually daily means every day is due, so 14 IS a due day and is done.
      // 13 (missed), 14 (done), 15 (missed), 16 (missed), 17 (pending, excluded)
      // Countable: 13,14,15,16 (pending today excluded) = 4; completed: 14 = 1
      // Rate = 1/4 = 0.25
      expect(service.completionRate(h, FRI_17)).toBeCloseTo(0.25, 2);
    });

    it('respects the createdIso floor (no phantom pre-history)', () => {
      const h = makeHabit({ createdAt: '2026-07-15T12:00:00Z' }); // Created Wed
      // Due days: 15, 16, 17; none completed
      // Countable: 15,16 (17 pending excluded) = 2; completed: 0
      // Rate = 0/2 = 0
      expect(service.completionRate(h, FRI_17)).toBe(0);
    });

    it('works with weekdays schedules', () => {
      const h = makeHabit({ schedule: MWF, completedDates: ['2026-07-13', '2026-07-15'] });
      // Due days: 13 (Mon), 15 (Wed), 17 (Fri, pending, excluded)
      // Countable: 13,15 = 2; completed: 2
      // Rate = 2/2 = 1
      expect(service.completionRate(h, FRI_17)).toBe(1);
    });
  });

  describe('isLapsed', () => {
    const service = new HabitService();

    it('returns true if any past due day is missed', () => {
      const h = makeHabit({ completedDates: [] }); // Nothing completed
      expect(service.isLapsed(h, FRI_17)).toBe(true);
    });

    it('returns false if only today is pending (R4)', () => {
      const h = makeHabit({
        completedDates: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'],
      });
      expect(service.isLapsed(h, FRI_17)).toBe(false);
    });

    it('returns false for a brand-new habit all caught up', () => {
      const h = makeHabit({
        createdAt: '2026-07-17T12:00:00Z',
        completedDates: [],
      });
      expect(service.isLapsed(h, FRI_17)).toBe(false);
    });

    it('returns false when unscheduled gaps exist but no actual misses', () => {
      const h = makeHabit({ schedule: MWF, completedDates: ['2026-07-13', '2026-07-15'] });
      // Due: 13 (Mon), 15 (Wed), 17 (Fri, today pending)
      // Checking [13..16]: 13 done, 14 not-due (skip), 15 done, 16 not-due (skip)
      // No misses → lapsed = false
      expect(service.isLapsed(h, FRI_17)).toBe(false);
    });

    it('does not count a pending today as a miss (walks only to yesterday)', () => {
      const h = makeHabit({ completedDates: ['2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16'] });
      // Walk [13..16], all done → not lapsed
      expect(service.isLapsed(h, FRI_17)).toBe(false);
    });
  });

  describe('lastDoneIso', () => {
    const service = new HabitService();

    it('returns null if no completions', () => {
      const h = makeHabit();
      expect(service.lastDoneIso(h)).toBeNull();
    });

    it('returns the max date lexically', () => {
      const h = makeHabit({ completedDates: ['2026-07-14', '2026-07-13', '2026-07-15'] });
      expect(service.lastDoneIso(h)).toBe('2026-07-15');
    });

    it('includes off-schedule completions', () => {
      const h = makeHabit({ schedule: MWF, completedDates: ['2026-07-14'] }); // Tue, off-schedule
      expect(service.lastDoneIso(h)).toBe('2026-07-14');
    });
  });

  describe('monthGrid', () => {
    const service = new HabitService();

    it('renders a month with correct leading blanks', () => {
      // July 2026: 1st is a Wednesday (getDay() = 3)
      const h = makeHabit();
      const grid = service.monthGrid(h, 2026, 6, FRI_17); // month 6 = July
      // Should have 3 blanks (Sun, Mon, Tue) then 1 (Wed)
      expect(grid[0]).toEqual({ blank: true });
      expect(grid[1]).toEqual({ blank: true });
      expect(grid[2]).toEqual({ blank: true });
      expect('iso' in grid[3] && grid[3].iso).toBe('2026-07-01');
    });

    it('renders all days of the month', () => {
      const h = makeHabit();
      const grid = service.monthGrid(h, 2026, 6, FRI_17);
      // July has 31 days; 3 leading blanks + 31 days + trailing blanks to reach 42 (6*7)
      // 34 + 8 = 42
      const realCells = grid.filter((cell) => 'iso' in cell);
      expect(realCells.length).toBe(31);
    });

    it('includes correct dayStatus for each day', () => {
      const h = makeHabit({ completedDates: ['2026-07-17'] }); // Fri done
      const grid = service.monthGrid(h, 2026, 6, FRI_17);
      // Find the cell for 2026-07-17 (Friday, should be index 3+16 = 19)
      const cell17 = grid.find((c) => 'iso' in c && c.iso === '2026-07-17');
      expect(cell17).toEqual({ iso: '2026-07-17', status: 'done' });
    });

    it('renders leading blanks, real days, and trailing blanks for a complete week grid', () => {
      const h = makeHabit();
      const grid = service.monthGrid(h, 2026, 6, FRI_17);
      // July 2026: starts Wed (3 blanks), 31 days = 34 total
      // 34 % 7 = 6, so add 1 trailing blank to reach 35 (5 complete weeks)
      expect(grid.length).toBe(35);
      expect(grid.length % 7).toBe(0);
    });

    it('handles dates before habit creation (all not-due)', () => {
      // June 2026 (month 5) is entirely before a July 10 creation
      const h = makeHabit({ createdAt: '2026-07-10T12:00:00Z' });
      const grid = service.monthGrid(h, 2026, 5, FRI_17); // June
      const realCells = grid.filter((c) => 'iso' in c);
      realCells.forEach((cell) => {
        if ('status' in cell) {
          expect(cell.status).toBe('not-due');
        }
      });
    });

    it('respects weekdays schedules', () => {
      const h = makeHabit({ schedule: MWF }); // Mon, Wed, Fri
      const grid = service.monthGrid(h, 2026, 6, FRI_17);
      // 13 = Mon (due), 14 = Tue (not-due), 15 = Wed (due), etc.
      const cell13 = grid.find((c) => 'iso' in c && c.iso === '2026-07-13');
      const cell14 = grid.find((c) => 'iso' in c && c.iso === '2026-07-14');
      expect('status' in cell13! && cell13!.status).toBe('missed'); // Mon, past, not done
      expect('status' in cell14! && cell14!.status).toBe('not-due'); // Tue, not scheduled
    });

    it('renders future cells correctly', () => {
      const h = makeHabit();
      const grid = service.monthGrid(h, 2026, 6, FRI_17);
      const cell18 = grid.find((c) => 'iso' in c && c.iso === '2026-07-18');
      expect('status' in cell18! && cell18!.status).toBe('future');
    });
  });
});

// Phase 4a — habit-metadata. Covers the new `update` mutation, the metadata
// type-guards, and the palette resolvers. See specs/habit-metadata/.
describe('HabitService — Phase 4a (metadata + update)', () => {
  beforeEach(() => localStorage.clear());

  function seed(): { service: HabitService; id: string } {
    const service = new HabitService();
    service.add('Read 20 min');
    return { service, id: service.habits()[0].id };
  }

  describe('update — validation is atomic (CriticReview R2)', () => {
    it('renames a habit and persists, leaving other fields untouched', () => {
      const { service, id } = seed();
      const before = service.habits()[0];

      service.update(id, { name: 'Read 30 min' });

      const after = service.habits()[0];
      expect(after.name).toBe('Read 30 min');
      expect(after.schedule).toEqual(before.schedule);
      expect(new HabitService().habits()[0].name).toBe('Read 30 min');
    });

    it('trims the new name', () => {
      const { service, id } = seed();
      service.update(id, { name: '  Spaced  ' });
      expect(service.habits()[0].name).toBe('Spaced');
    });

    it('is a no-op for an empty or whitespace-only name (AC 6)', () => {
      const { service, id } = seed();
      service.update(id, { name: '' });
      service.update(id, { name: '   ' });
      expect(service.habits()[0].name).toBe('Read 20 min');
    });

    it('is a no-op for a malformed schedule (AC 7)', () => {
      const { service, id } = seed();
      service.update(id, { schedule: { type: 'weekdays', days: [] } });
      expect(service.habits()[0].schedule).toEqual({ type: 'daily' });
    });

    it('rejects the WHOLE patch when one key is invalid — a valid name in the same patch is not applied', () => {
      const { service, id } = seed();

      service.update(id, {
        name: 'Should not be applied',
        schedule: { type: 'weekdays', days: [] }, // corrupt
      });

      expect(service.habits()[0].name).toBe('Read 20 min');
      expect(service.habits()[0].schedule).toEqual({ type: 'daily' });
    });

    it('is a no-op for an unknown id', () => {
      const { service } = seed();
      service.update('nope', { name: 'Ghost' });
      expect(service.habits().length).toBe(1);
      expect(service.habits()[0].name).toBe('Read 20 min');
    });

    it('never changes id, createdAt or completedDates (AC 9)', () => {
      const { service, id } = seed();
      service.toggleToday(id);
      const before = service.habits()[0];

      service.update(id, { name: 'Renamed', category: 'Health' });

      const after = service.habits()[0];
      expect(after.id).toBe(before.id);
      expect(after.createdAt).toBe(before.createdAt);
      expect(after.completedDates).toEqual(before.completedDates);
    });

    it('stores weekdays sorted ascending regardless of input order', () => {
      const { service, id } = seed();
      service.update(id, { schedule: { type: 'weekdays', days: [5, 1, 3] } });
      expect(service.habits()[0].schedule).toEqual({ type: 'weekdays', days: [1, 3, 5] });
    });
  });

  describe('update — metadata normalisation (CriticReview R3/R4)', () => {
    it('sets and persists all five metadata fields (AC 4)', () => {
      const { service, id } = seed();

      service.update(id, {
        description: 'Fiction before bed',
        category: 'Learning',
        color: 'sky',
        icon: 'book',
        notes: 'Currently on Dune',
      });

      const reloaded = new HabitService().habits()[0];
      expect(reloaded.description).toBe('Fiction before bed');
      expect(reloaded.category).toBe('Learning');
      expect(reloaded.color).toBe('sky');
      expect(reloaded.icon).toBe('book');
      expect(reloaded.notes).toBe('Currently on Dune');
    });

    it('trims prose fields', () => {
      const { service, id } = seed();
      service.update(id, { category: '  Health  ', notes: '  hi  ' });
      expect(service.habits()[0].category).toBe('Health');
      expect(service.habits()[0].notes).toBe('hi');
    });

    it('clears a field set to an empty/whitespace string rather than storing "" (AC 5)', () => {
      const { service, id } = seed();
      service.update(id, { category: 'Health' });
      expect(service.habits()[0].category).toBe('Health');

      service.update(id, { category: '   ' });
      expect(service.habits()[0].category).toBeUndefined();
      // and it survives a round-trip as absent, not as ''
      expect(new HabitService().habits()[0].category).toBeUndefined();
    });

    it('leaves a field alone when the patch omits it', () => {
      const { service, id } = seed();
      service.update(id, { category: 'Health', icon: 'run' });
      service.update(id, { name: 'Renamed' });

      expect(service.habits()[0].category).toBe('Health');
      expect(service.habits()[0].icon).toBe('run');
    });

    it('clears colour/icon when set to an empty string', () => {
      const { service, id } = seed();
      service.update(id, { color: 'rose', icon: 'run' });
      service.update(id, { color: '', icon: '' });
      expect(service.habits()[0].color).toBeUndefined();
      expect(service.habits()[0].icon).toBeUndefined();
    });
  });

  describe('metadata persistence and corrupt-row handling (CriticReview R6/R7)', () => {
    it('loads a pre-4a row with no metadata fields, unchanged (AC 12)', () => {
      const legacy = {
        id: 'legacy',
        name: 'Old habit',
        createdAt: '2026-07-13T12:00:00Z',
        completedDates: ['2026-07-16'],
        schedule: { type: 'daily' },
      };
      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([legacy]));

      const service = new HabitService();
      expect(service.habits().length).toBe(1);
      expect(service.habits()[0].category).toBeUndefined();
      expect(service.habits()[0].color).toBeUndefined();
    });

    it('accepts a row with all five metadata fields as strings', () => {
      const rich = {
        id: 'rich',
        name: 'Rich habit',
        createdAt: '2026-07-13T12:00:00Z',
        completedDates: [],
        schedule: { type: 'daily' },
        description: 'd',
        category: 'c',
        color: 'sky',
        icon: 'run',
        notes: 'n',
      };
      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([rich]));
      expect(new HabitService().habits().length).toBe(1);
    });

    it('drops a row whose metadata field is present but not a string', () => {
      const bad = {
        id: 'bad',
        name: 'Corrupt',
        createdAt: '2026-07-13T12:00:00Z',
        completedDates: [],
        schedule: { type: 'daily' },
        category: 42,
      };
      localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([bad]));
      expect(new HabitService().habits().length).toBe(0);
    });

    it('keeps STORAGE_KEY at v1 — the v2 bump belongs to slice 4c', () => {
      const { service } = seed();
      expect(localStorage.getItem('habit_tracker.habits.v1')).toBeTruthy();
      expect(localStorage.getItem('habit_tracker.habits.v2')).toBeNull();
      expect(service.habits().length).toBe(1);
    });
  });

  describe('schedule edits recalculate history live (AC 8, CriticReview R13)', () => {
    it('changing the schedule changes past due-ness without touching completions', () => {
      const service = new HabitService();
      service.add('Gym', { type: 'daily' });
      const id = service.habits()[0].id;

      // The next Saturday strictly after the habit's creation date — `isDueOn`
      // is false before creation, so a hardcoded past date would prove nothing.
      const saturday = HabitService.todayIso(
        (() => {
          const d = new Date();
          d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
          return d;
        })(),
      );

      // A daily habit is due on a Saturday; a Mon/Wed/Fri one is not.
      expect(service.isDueOn(service.habits()[0], saturday)).toBeTrue();

      service.update(id, { schedule: { type: 'weekdays', days: [1, 3, 5] } });

      expect(service.isDueOn(service.habits()[0], saturday)).toBeFalse();
      expect(service.habits()[0].completedDates).toEqual([]);
    });
  });
});

describe('palette resolvers (CriticReview R9)', () => {
  it('colorOf falls back to the default for undefined and for an unknown id (AC 13)', () => {
    expect(colorOf(undefined)).toBe(HABIT_COLORS[0]);
    expect(colorOf('not-a-real-colour')).toBe(HABIT_COLORS[0]);
  });

  it('iconOf falls back to the default for undefined and for an unknown id (AC 13)', () => {
    expect(iconOf(undefined)).toBe(HABIT_ICONS[0]);
    expect(iconOf('not-a-real-icon')).toBe(HABIT_ICONS[0]);
  });

  it('resolves a real id to its own entry', () => {
    expect(colorOf('sky').hex).toBe('#0ea5e9');
    expect(iconOf('book').glyph).toBe('📖');
  });
});
