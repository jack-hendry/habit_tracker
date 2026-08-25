/**
 * The top bar's date, e.g. `Thu · Jul 23, 2026`.
 *
 * The date is a parameter with a default, mirroring
 * `HabitService.todayIso(d: Date = new Date())`, so specs can pin a fixed day
 * without mocking the global clock. The locale is pinned to 'en-US' because the
 * ambient default renders `23 Jul 2026` under en-GB — green on one machine and
 * red on another (CriticReview R3).
 *
 * Presentation, not domain: it lives beside AppComponent, not on HabitService.
 * Computed once at app load — a session spanning local midnight shows the
 * previous day until reload, accepted deliberately (Analyst §3).
 */
export function formatBarDate(d: Date = new Date()): string {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  const rest = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${weekday} · ${rest}`;
}
