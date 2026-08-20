import { TestBed } from '@angular/core/testing';
import { AnalyticsComponent } from './analytics.component';
import { HabitService } from '../habit/habit.service';
import { ActivatedRoute } from '@angular/router';

/**
 * Design conformance for the analytics charts (roadmap §4).
 *
 * Transcribed design values from `Habit Tracker Prototype.dc.html` (lines 179–246, 453–474).
 * Most assertions use probe elements carrying the real component's Angular
 * `_ngcontent-*` attribute (per calendar.design.spec.ts, AD-022) rather than
 * asserting against seeded/rendered data — this exercises the real CSS
 * cascade without depending on which classes the app's own logic happens to
 * produce.
 *
 * One exception: the weekday `.day-name` font-weight (700/500) is an inline
 * style bound directly to component logic (`day.best ? '700' : '500'`) —
 * analytics.component.scss has no font-weight rule for `.day-name` at all, so
 * there is no CSS cascade to probe. That one assertion renders the real
 * component instead, with seed data engineered so the "best" weekday is
 * deterministic (every weekday tied at 100% resolves to Sunday, index 0, by
 * the component's first-max-wins tie-break — see analytics.component.ts
 * `weekdays()`) regardless of which day the suite happens to run on.
 */
describe('AnalyticsComponent design conformance', () => {
  // Transcribed from the prototype. rgb() form is what getComputedStyle returns.
  const HEAT_0 = 'rgb(235, 237, 240)'; // #ebedf0
  const HEAT_1 = 'rgb(199, 220, 241)'; // #c7dcf1
  const HEAT_2 = 'rgb(127, 176, 222)'; // #7fb0de
  const HEAT_3 = 'rgb(60, 135, 205)'; // #3c87cd
  const HEAT_4 = 'rgb(0, 102, 204)'; // #0066cc

  const BAR_MAX = 'rgb(0, 102, 204)'; // #0066cc
  const BAR_REST = 'rgb(189, 214, 238)'; // #bdd6ee
  const BAR_LABEL_MAX = 'rgb(0, 102, 204)'; // #0066cc
  const BAR_LABEL_REST = 'rgb(154, 160, 168)'; // #9aa0a8

  const TRACK_BG = 'rgb(240, 240, 238)'; // #f0f0ee
  const RATE_TEXT = 'rgb(58, 63, 69)'; // #3a3f45

  let host: HTMLElement;
  let analyticsAttr: string;
  let barChartAttr: string;

  beforeEach(() => {
    localStorage.clear();

    // One habit, due and completed every day for three weeks: guarantees
    // every weekday bucket ties at rate 1, so weekdays()'s first-max-wins
    // tie-break deterministically picks Sunday (index 0) as "best" no matter
    // which real-world day this suite runs on. Also guarantees hasHabits()
    // is true, so every probe container below actually renders.
    const todayIso = HabitService.todayIso(today());
    const startIso = HabitService.shiftIso(todayIso, -20);
    const completedDates: string[] = [];
    for (let offset = 20; offset >= 0; offset--) {
      completedDates.push(HabitService.shiftIso(todayIso, -offset));
    }

    const habit = {
      id: 'probe-1',
      name: 'Probe habit',
      createdAt: today().toISOString(),
      completedDates,
      schedule: { type: 'daily' },
      category: 'Test',
      color: 'sky',
      icon: 'book',
      startDate: startIso,
      status: 'active' as const,
    };
    localStorage.setItem('habit_tracker.habits.v1', JSON.stringify([habit]));

    TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [{ provide: ActivatedRoute, useValue: {} }],
    });
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);

    analyticsAttr = ngContentAttrOf(host.querySelector('.weekday-rows'), '.weekday-rows');
    barChartAttr = ngContentAttrOf(
      host.querySelector('app-bar-chart .bar-row'),
      'app-bar-chart .bar-row',
    );
  });

  afterEach(() => host?.remove());

  function today(): Date {
    return new Date();
  }

  function ngContentAttrOf(el: Element | null, label: string): string {
    const found = el && Array.from(el.attributes).map((a) => a.name).find((n) => n.startsWith('_ngcontent-'));
    expect(found).withContext(`no _ngcontent-* found on ${label} — probes would be unstyled`).toBeDefined();
    return found!;
  }

  function probe(container: Element, classes: string, attr: string): HTMLElement {
    const el = document.createElement('div');
    el.className = classes;
    el.setAttribute(attr, '');
    container.appendChild(el);
    return el;
  }

  // Heatmap: `.cell`'s background is 100% inline-style-driven
  // (`[style.background]="'var(' + stepFor(rate) + ')'"` in heat-grid.component.html) —
  // heat-grid.component.scss has no background rule for `.cell` at all, so there is
  // no scoped rule to probe. The tokens are true global `:root` custom properties
  // (src/styles.scss), so a bare unscoped probe (no component `_ngcontent`
  // attribute needed) is sufficient to validate them.
  const heatSteps: Array<[string, string]> = [
    ['--heat-0', HEAT_0],
    ['--heat-1', HEAT_1],
    ['--heat-2', HEAT_2],
    ['--heat-3', HEAT_3],
    ['--heat-4', HEAT_4],
  ];
  for (const [token, expected] of heatSteps) {
    it(`heatmap ${token} resolves to the correct colour`, () => {
      const cell = document.createElement('div');
      cell.style.background = `var(${token})`;
      document.body.appendChild(cell);
      expect(getComputedStyle(cell).backgroundColor).toBe(expected);
      cell.remove();
    });
  }

  // Bar chart fill + label colours (bar-chart.component.scss — bar-chart's own
  // encapsulation instance, distinct from analytics's own `_ngcontent-*`).
  it('bar chart bar-max fill and label are correct', () => {
    const barRow = host.querySelector('app-bar-chart .bar-row')!;
    const bar = probe(barRow, 'bar bar-max', barChartAttr);
    const label = probe(barRow, 'label bar-max', barChartAttr);
    expect(getComputedStyle(bar).backgroundColor).toBe(BAR_MAX);
    expect(getComputedStyle(label).color).toBe(BAR_LABEL_MAX);
  });

  it('bar chart bar-rest fill and label are correct', () => {
    const barRow = host.querySelector('app-bar-chart .bar-row')!;
    const bar = probe(barRow, 'bar bar-rest', barChartAttr);
    const label = probe(barRow, 'label bar-rest', barChartAttr);
    expect(getComputedStyle(bar).backgroundColor).toBe(BAR_REST);
    expect(getComputedStyle(label).color).toBe(BAR_LABEL_REST);
  });

  // Weekday fill (analytics.component.scss: `.weekday-row .fill.bar-max`/`.bar-rest`).
  it('weekday best-day fill is bar-max coloured', () => {
    const rows = host.querySelector('.weekday-rows')!;
    const row = probe(rows, 'weekday-row dow-best', analyticsAttr);
    const track = probe(row, 'track', analyticsAttr);
    const fill = probe(track, 'fill bar-max', analyticsAttr);
    expect(getComputedStyle(fill).backgroundColor).toBe(BAR_MAX);
  });

  it('weekday rest-day fill is bar-rest coloured', () => {
    const rows = host.querySelector('.weekday-rows')!;
    const row = probe(rows, 'weekday-row dow-rest', analyticsAttr);
    const track = probe(row, 'track', analyticsAttr);
    const fill = probe(track, 'fill bar-rest', analyticsAttr);
    expect(getComputedStyle(fill).backgroundColor).toBe(BAR_REST);
  });

  // Weekday day-name font-weight: no CSS rule exists to probe against (see file
  // header) — assert the real rendered component instead, using tie-broken
  // deterministic seed data so the "best" row is always Sunday.
  it('best weekday (Sunday, tie-break winner) renders 700-weight name; a rest day renders 500', () => {
    const bestRow = host.querySelector('.weekday-row.dow-best .day-name') as HTMLElement | null;
    const restRow = host.querySelector('.weekday-row.dow-rest .day-name') as HTMLElement | null;
    expect(bestRow).withContext('expected exactly one dow-best weekday row').not.toBeNull();
    expect(restRow).withContext('expected at least one dow-rest weekday row').not.toBeNull();
    expect(bestRow!.textContent?.trim()).toBe('Sun');
    expect(getComputedStyle(bestRow!).fontWeight).toBe('700');
    expect(getComputedStyle(restRow!).fontWeight).toBe('500');
  });

  // Leaderboard track + rate-text (bare `.track`/`.rate-text` rules). Deliberately
  // NOT probed nested inside a `.weekday-row` element, which carries its own more
  // specific `.weekday-row .track` rule (10px/5px-radius vs the bare rule's
  // 12px/6px-radius) that would otherwise win the cascade and mask a regression.
  it('leaderboard track background is card-divider colour', () => {
    const rows = host.querySelector('.leaderboard-rows')!;
    const row = probe(rows, 'leaderboard-row', analyticsAttr);
    const track = probe(row, 'track', analyticsAttr);
    expect(getComputedStyle(track).backgroundColor).toBe(TRACK_BG);
  });

  it('leaderboard rate text colour is cal-label', () => {
    const rows = host.querySelector('.leaderboard-rows')!;
    const row = probe(rows, 'leaderboard-row', analyticsAttr);
    const rate = probe(row, 'rate-text', analyticsAttr);
    expect(getComputedStyle(rate).color).toBe(RATE_TEXT);
  });
});
