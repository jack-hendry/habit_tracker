import { TestBed } from '@angular/core/testing';
import { CalendarComponent } from './calendar.component';
import { HabitService } from '../habit/habit.service';

describe('CalendarComponent', () => {
  let component: CalendarComponent;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [CalendarComponent] });
    component = TestBed.createComponent(CalendarComponent).componentInstance;
  });

  it('getCellClass returns "blank" for a padding cell', () => {
    expect(component.getCellClass({ blank: true })).toBe('blank');
  });

  it('getCellClass returns the status class for each DayStatus', () => {
    for (const status of ['done', 'missed', 'pending', 'not-due', 'future']) {
      expect(component.getCellClass({ iso: '1999-01-01', status })).toBe(`status-${status}`);
    }
  });

  // AC 7. The ring is orthogonal to status: today's cell gets `today` on top of
  // whatever status it has, and no other cell does (CriticReview R10).
  it('getCellClass adds "today" only to the cell whose iso is today', () => {
    const todayIso = component.todayIso;
    expect(component.getCellClass({ iso: todayIso, status: 'pending' })).toBe('status-pending today');
    expect(component.getCellClass({ iso: '1999-01-01', status: 'missed' })).toBe('status-missed');
  });

  it('todayIso is the local calendar date, not a UTC-shifted one', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    expect(component.todayIso).toBe(expected);
    expect(component.todayIso).toBe(HabitService.todayIso());
  });

  // CriticReview R6 — the prototype renders `1`, not `01`.
  it('dayNumber strips the leading zero', () => {
    expect(component.dayNumber('2026-07-01')).toBe(1);
    expect(component.dayNumber('2026-07-09')).toBe(9);
    expect(component.dayNumber('2026-07-23')).toBe(23);
  });
});
