/**
 * `YYYY-MM-DD` → `Thu, Jul 23` — the prototype's `fmtI(i, true)` (vacation-mode
 * CriticReview R7). Built from split parts (AD-003), en-US pinned like
 * `formatBarDate`.
 */
export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const rest = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${weekday}, ${rest}`;
}
