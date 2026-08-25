import { formatBarDate } from './format-bar-date';

describe('formatBarDate', () => {
  it('formats a pinned date as "Thu · Jul 23, 2026"', () => {
    // Constructed from local parts, never `new Date('2026-07-23')` (AD-003).
    expect(formatBarDate(new Date(2026, 6, 23))).toBe('Thu · Jul 23, 2026');
  });

  it('formats a single-digit day without padding', () => {
    expect(formatBarDate(new Date(2026, 0, 1))).toBe('Thu · Jan 1, 2026');
  });

  it('defaults to today when called with no argument', () => {
    expect(formatBarDate()).toBe(formatBarDate(new Date()));
  });
});
