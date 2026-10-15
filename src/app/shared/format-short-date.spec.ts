import { formatShortDate } from './format-short-date';

describe('formatShortDate', () => {
  it('formats a mid-year date as "Thu, Jul 23"', () => {
    expect(formatShortDate('2026-07-23')).toBe('Thu, Jul 23');
  });

  it('formats a single-digit day without padding', () => {
    expect(formatShortDate('2026-01-01')).toBe('Thu, Jan 1');
  });
});
