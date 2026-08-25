import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { AnalyticsComponent } from './analytics.component';
import { HeatGridComponent } from '../shared/heat-grid/heat-grid.component';
import { BarChartComponent } from '../shared/bar-chart/bar-chart.component';

/**
 * Design conformance for the analytics charts (roadmap §4).
 *
 * WHY IT DOES NOT READ THE SCSS
 * -----------------------------
 * Every expected value below is transcribed from the PROTOTYPE SOURCE
 * (`Habit Tracker Prototype.dc.html`, markup 179–246, logic 453–474), never
 * from the component's own stylesheet. Copying the SCSS would make this a
 * change-detector that agrees with whatever the component happens to say.
 * Reading `getComputedStyle` rather than the stylesheet text is also what
 * catches a rule that is correct but loses on specificity (L-025).
 *
 * WHY IT DOES NOT SEED DATA
 * -------------------------
 * The blind spot this file exists to close is that a rendered view only
 * exercises the states its data happens to produce (L-026). The first version
 * of this file seeded localStorage and asserted against whatever came out; its
 * own mutation check proved the consequence — changing `--heat-2` to another
 * colour failed nothing at all, because no seeded day landed in that band. So
 * four of the five heat steps were verified by nothing while the suite was
 * green.
 *
 * Two techniques replace the seed, chosen per component:
 *
 *   - The two presentational charts take their data as required inputs, so
 *     they are driven DIRECTLY with values chosen to hit every band. No date
 *     arithmetic, no storage, no state that can fail to appear.
 *   - The analytics page's own rules are checked with PROBE ELEMENTS carrying
 *     the component's `_ngcontent-*` attribute (the technique documented at
 *     the top of `calendar.design.spec.ts`), which is date-independent and
 *     renders every state unconditionally.
 */

// Transcribed from the prototype. rgb() form is what getComputedStyle returns.
const HEAT = ['rgb(235, 237, 240)', 'rgb(199, 220, 241)', 'rgb(127, 176, 222)', 'rgb(60, 135, 205)', 'rgb(0, 102, 204)'];
const BAR_MAX = 'rgb(0, 102, 204)'; // #0066cc
const BAR_REST = 'rgb(189, 214, 238)'; // #bdd6ee
const BAR_LABEL_REST = 'rgb(154, 160, 168)'; // #9aa0a8
const TRACK_BG = 'rgb(240, 240, 238)'; // #f0f0ee, --card-divider
const RATE_TEXT = 'rgb(58, 63, 69)'; // #3a3f45, --cal-label

/** Reads the emulated-encapsulation attribute off a real templated element. */
function contentAttrOf(host: HTMLElement, selector: string): string {
  const templated = host.querySelector(selector);
  const found = templated
    ? Array.from(templated.attributes)
        .map((a) => a.name)
        .find((n) => n.startsWith('_ngcontent-'))
    : undefined;
  // Fail loudly: silently unstyled probes would make every assertion below
  // pass against browser defaults.
  expect(found)
    .withContext(`no _ngcontent-* on ${selector} — probes would be unstyled and these tests meaningless`)
    .toBeDefined();
  return found!;
}

describe('HeatGridComponent design conformance', () => {
  let host: HTMLElement;

  /** Renders the real component over `rates` and returns its cells. */
  function render(rates: Array<number | null>): HTMLElement[] {
    TestBed.configureTestingModule({ imports: [HeatGridComponent] });
    const fixture = TestBed.createComponent(HeatGridComponent);
    fixture.componentRef.setInput('rates', rates);
    fixture.componentRef.setInput('startIso', '2026-01-04'); // a Sunday
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);
    return Array.from(host.querySelectorAll<HTMLElement>('.cell'));
  }

  afterEach(() => {
    host?.remove();
    TestBed.resetTestingModule();
  });

  // All five steps, unconditionally — including the four that the seeded
  // version of this file left unverified.
  it('paints all five heat steps with the prototype colours', () => {
    // One rate per band, in order. null and 0 share step 0 by design
    // (Analyst §3 A / AD-010): a day with nothing due is not a day all missed.
    const cells = render([null, 0, 0.2, 0.5, 0.9, 1]);
    const expected = [0, 0, 1, 2, 3, 4];
    expect(cells.length).toBe(expected.length);
    cells.forEach((cell, i) => {
      const step = expected[i];
      expect(cell.classList).withContext(`cell ${i} class`).toContain(`heat-${step}`);
      expect(getComputedStyle(cell).backgroundColor)
        .withContext(`cell ${i} (rate index ${i}) expected heat-${step}`)
        .toBe(HEAT[step]);
    });
  });

  // If a future edit collapses the ramp, the per-step assertions above still
  // pass one at a time. This is what notices.
  it('gives the five steps five DIFFERENT colours', () => {
    const cells = render([0, 0.2, 0.5, 0.9, 1]);
    const colours = cells.map((c) => getComputedStyle(c).backgroundColor);
    expect(new Set(colours).size).toBe(5);
  });

  // The thresholds themselves, transcribed from the prototype's ladder.
  // Off-by-one on a bound is invisible in any screenshot.
  it('places each threshold boundary in the band the prototype specifies', () => {
    const cases: Array<[number, number]> = [
      [0.349, 1],
      [0.35, 2],
      [0.699, 2],
      [0.7, 3],
      [0.999, 3],
      [1, 4],
    ];
    const cells = render(cases.map(([rate]) => rate));
    cases.forEach(([rate, step], i) => {
      expect(getComputedStyle(cells[i]).backgroundColor)
        .withContext(`rate ${rate} belongs to heat-${step}`)
        .toBe(HEAT[step]);
    });
  });
});

describe('BarChartComponent design conformance', () => {
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BarChartComponent] });
    const fixture = TestBed.createComponent(BarChartComponent);
    // Index 1 is the maximum. Driving the input directly means both states
    // always render, rather than depending on what a seed produces.
    fixture.componentRef.setInput('bars', [
      { label: '1', value: 2 },
      { label: '2', value: 5 },
    ]);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);
  });

  afterEach(() => {
    host?.remove();
    TestBed.resetTestingModule();
  });

  it('fills the maximum bar with the accent and the rest with the pale tint', () => {
    const bars = host.querySelectorAll<HTMLElement>('.bar');
    expect(bars.length).toBe(2);
    expect(bars[0].classList).toContain('bar-rest');
    expect(bars[1].classList).toContain('bar-max');
    expect(getComputedStyle(bars[0]).backgroundColor).withContext('non-max bar').toBe(BAR_REST);
    expect(getComputedStyle(bars[1]).backgroundColor).withContext('max bar').toBe(BAR_MAX);
  });

  it('colours the maximum bar label with the accent and the rest with the muted grey', () => {
    const labels = host.querySelectorAll<HTMLElement>('.label');
    expect(labels.length).toBe(2);
    expect(getComputedStyle(labels[0]).color).withContext('non-max label').toBe(BAR_LABEL_REST);
    expect(getComputedStyle(labels[1]).color).withContext('max label').toBe(BAR_MAX);
  });

  it('gives the bar and its label different greys when not the maximum', () => {
    // The fill is #bdd6ee and the label #9aa0a8 — two separate tokens that a
    // careless edit would collapse into one.
    const bar = host.querySelector<HTMLElement>('.bar.bar-rest')!;
    const label = host.querySelector<HTMLElement>('.label.bar-rest')!;
    expect(getComputedStyle(bar).backgroundColor).not.toBe(getComputedStyle(label).color);
  });
});

describe('AnalyticsComponent design conformance', () => {
  let host: HTMLElement;
  let root: HTMLElement;
  let contentAttr: string;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AnalyticsComponent],
      providers: [{ provide: ActivatedRoute, useValue: {} }],
    });
    const fixture = TestBed.createComponent(AnalyticsComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);
    // `.page-container` sits outside the @if, so it is present with no habits.
    contentAttr = contentAttrOf(host, '.page-container');
    root = host.querySelector<HTMLElement>('.page-container')!;
  });

  afterEach(() => {
    host?.remove();
    TestBed.resetTestingModule();
  });

  /** Builds a scoped element tree from `[class, ...children]` shorthand. */
  function probe(className: string, children: HTMLElement[] = []): HTMLElement {
    const el = document.createElement('div');
    el.className = className;
    el.setAttribute(contentAttr, '');
    children.forEach((c) => el.appendChild(c));
    return el;
  }

  function mount(el: HTMLElement): HTMLElement {
    root.appendChild(el);
    return el;
  }

  it('paints the leaderboard track with the card-divider grey', () => {
    const track = probe('track');
    mount(probe('leaderboard-row', [track]));
    expect(getComputedStyle(track).backgroundColor).toBe(TRACK_BG);
  });

  it('paints the leaderboard rate text with the cal-label grey', () => {
    const rate = mount(probe('rate-text'));
    expect(getComputedStyle(rate).color).toBe(RATE_TEXT);
    expect(getComputedStyle(rate).fontWeight).toBe('700');
  });

  it('fills the best weekday with the accent and the others with the pale tint', () => {
    for (const [state, cls, expected] of [
      ['dow-best', 'bar-max', BAR_MAX],
      ['dow-rest', 'bar-rest', BAR_REST],
    ] as const) {
      const fill = probe(`fill ${cls}`);
      mount(probe(`weekday-row ${state}`, [probe('track', [fill])]));
      expect(getComputedStyle(fill).backgroundColor).withContext(`${state} fill`).toBe(expected);
    }
  });

  // The best day is bolded against the rest. This value used to live in a
  // template [style.font-weight] binding, where no stylesheet check could
  // reach it; it is in the cascade now precisely so this can assert it.
  it('bolds the best weekday name against the others', () => {
    for (const [state, weight] of [
      ['dow-best', '700'],
      ['dow-rest', '500'],
    ] as const) {
      const name = probe('day-name');
      mount(probe(`weekday-row ${state}`, [name]));
      expect(getComputedStyle(name).fontWeight).withContext(`${state} day name`).toBe(weight);
    }
  });

  it('paints the weekday percentage with the cal-label grey', () => {
    const pct = probe('pct');
    mount(probe('weekday-row', [pct]));
    expect(getComputedStyle(pct).color).toBe(RATE_TEXT);
  });
});
