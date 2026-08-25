import { TestBed } from '@angular/core/testing';
import { CalendarComponent } from './calendar.component';

/**
 * Design conformance for the calendar day grid (roadmap §3).
 *
 * WHY THIS EXISTS, AND WHY IT DOES NOT READ THE SCSS
 * --------------------------------------------------
 * The expected values below are transcribed from the PROTOTYPE SOURCE --
 * `Habit Tracker Prototype.dc.html`, the `CS` table at ~line 484 -- and not
 * from `calendar.component.scss`. That direction is the entire point. Copying
 * the SCSS would make this a change-detector: it would agree with whatever the
 * component happens to say and catch nothing. Transcribing the design source
 * makes it an oracle, and it catches the two defect classes that every other
 * check in this repo is blind to:
 *
 *   1. A token that exists, is spelled correctly, and resolves to the WRONG
 *      COLOUR. `calendar-redesign` CriticReview R1: the spec asserted the done
 *      cell fill was already tokenised as `--done-bg`, which is #f4fbf6 -- the
 *      Dashboard's pale row tint -- against the calendar's #dcfce7. AC 3's
 *      raw-hex grep passes (a token IS used), the build passes, the suite
 *      passes, and the composite looks fine at a 520px column width, because
 *      washed-out green still reads as green.
 *   2. A rule that is correct and never fires. L-025: `.delete-button` lost on
 *      specificity to `.habit-actions button` above it and rendered grey, with
 *      every value-level check green. Only a real cascade catches that, which
 *      is why these assertions read `getComputedStyle` rather than the
 *      stylesheet text.
 *
 * WHY IT PROBES INSTEAD OF SEEDING DATA
 * -------------------------------------
 * The blind spot this file closes is that a rendered view only exercises the
 * states its data happens to produce. `design:shot calendar --seed` renders a
 * daily habit in the current month: `done`, `pending`, `future` and `blank`
 * appear, `missed` and `not-due` do not, so two of five status colours were
 * verified by nothing at all. Seeding a habit that produces all five would
 * re-introduce a date dependency (no past days on the 1st, no future days on
 * the 31st, `pending` only when today is a scheduled weekday). Probe elements
 * are date-independent and test every state unconditionally.
 */
describe('CalendarComponent design conformance', () => {
  // Transcribed from the prototype's `CS` table. rgb() form is what
  // getComputedStyle returns.
  const CS = {
    'status-done': { bg: 'rgb(220, 252, 231)', bd: 'rgb(34, 197, 94)', tc: 'rgb(22, 101, 52)' },
    'status-missed': { bg: 'rgb(254, 226, 226)', bd: 'rgb(239, 68, 68)', tc: 'rgb(153, 27, 27)' },
    'status-pending': { bg: 'rgb(254, 243, 199)', bd: 'rgb(245, 158, 11)', tc: 'rgb(146, 64, 14)' },
    'status-not-due': { bg: 'rgb(243, 244, 246)', bd: 'rgb(209, 213, 219)', tc: 'rgb(154, 161, 171)' },
    'status-future': { bg: 'rgb(231, 234, 255)', bd: 'rgb(143, 149, 232)', tc: 'rgb(67, 56, 202)' },
  };
  const ACCENT = 'rgb(0, 102, 204)';

  let host: HTMLElement;
  let contentAttr: string;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [CalendarComponent] });
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);

    // Emulated encapsulation rewrites every component rule to
    // `.cell.status-done[_ngcontent-xxx]`, so a probe element only inherits
    // those rules if it carries the same attribute. Read it off a real
    // element rather than guessing the suffix.
    const templated = host.querySelector('.calendar-container');
    const found = templated
      ? Array.from(templated.attributes)
          .map((a) => a.name)
          .find((n) => n.startsWith('_ngcontent-'))
      : undefined;
    // Fail loudly: if Angular ever changes this, silently unstyled probes
    // would make every assertion below pass against defaults.
    expect(found)
      .withContext('no _ngcontent-* attribute found — probes would be unstyled and these tests meaningless')
      .toBeDefined();
    contentAttr = found!;
  });

  afterEach(() => host?.remove());

  /** A day cell carrying `classes`, styled by the component exactly as a real one. */
  function probeCell(classes: string): { cell: HTMLElement; dayNumber: HTMLElement } {
    const cell = document.createElement('div');
    cell.className = `cell ${classes}`;
    cell.setAttribute(contentAttr, '');
    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.setAttribute(contentAttr, '');
    dayNumber.textContent = '1';
    cell.appendChild(dayNumber);
    host.querySelector('.calendar-container')!.appendChild(cell);
    return { cell, dayNumber };
  }

  // The five status colours, including the two that no seeded screenshot of
  // this page has ever rendered.
  for (const [status, expected] of Object.entries(CS)) {
    it(`${status} matches the prototype's background, border and day-number colour`, () => {
      const { cell, dayNumber } = probeCell(status);
      const cs = getComputedStyle(cell);
      expect(cs.backgroundColor).withContext(`${status} background`).toBe(expected.bg);
      expect(cs.borderLeftColor).withContext(`${status} border-left`).toBe(expected.bd);
      expect(cs.borderLeftWidth).withContext(`${status} border-left width`).toBe('3px');
      expect(cs.borderRadius).withContext(`${status} radius`).toBe('4px');
      expect(cs.minHeight).withContext(`${status} min-height`).toBe('52px');
      expect(getComputedStyle(dayNumber).color).withContext(`${status} day number`).toBe(expected.tc);
    });
  }

  // Analyst §3.3 — the day number was a flat grey before this section. If a
  // future edit collapses them back to one colour, the per-status assertions
  // above still pass one at a time; this is what notices.
  it('gives all five statuses five DIFFERENT day-number colours', () => {
    const colours = Object.keys(CS).map((s) => getComputedStyle(probeCell(s).dayNumber).color);
    expect(new Set(colours).size).toBe(5);
  });

  // CriticReview R2 — blank padding cells are transparent in the source, which
  // is also what makes monthGrid's trailing blanks (the prototype generates
  // none) invisible rather than a row of grey tiles.
  it('renders blank padding cells fully transparent', () => {
    const { cell } = probeCell('blank');
    const cs = getComputedStyle(cell);
    expect(cs.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(cs.borderLeftColor).toBe('rgba(0, 0, 0, 0)');
  });

  // Analyst §3.5 — the ring is a box-shadow, not a border (a border would
  // shift the cell's contents), and is orthogonal to status.
  it('rings today with an accent box-shadow, on top of any status', () => {
    for (const status of ['status-done', 'status-pending', 'status-missed']) {
      const { cell } = probeCell(`${status} today`);
      expect(getComputedStyle(cell).boxShadow)
        .withContext(`${status} + today`)
        .toBe(`${ACCENT} 0px 0px 0px 2px`);
      // The status fill must survive the ring.
      expect(getComputedStyle(cell).backgroundColor)
        .withContext(`${status} + today keeps its fill`)
        .toBe(CS[status as keyof typeof CS].bg);
    }
  });

  it('does not ring a cell that is not today', () => {
    expect(getComputedStyle(probeCell('status-done').cell).boxShadow).toBe('none');
  });

  // CriticReview R13 — the Today swatch is 14x14 with a 2px border against the
  // others' 1px, and there is no global box-sizing reset, so it renders 18x18
  // next to 16x16. That asymmetry is the source's, not a bug: a well-meaning
  // `box-sizing: border-box` would silently "fix" it away from the mockup.
  it('sizes the Today legend swatch 18x18 against the others at 16x16', () => {
    const swatch = (cls: string) => {
      const el = document.createElement('div');
      el.className = `legend-swatch ${cls}`;
      el.setAttribute(contentAttr, '');
      host.querySelector('.calendar-container')!.appendChild(el);
      return el.getBoundingClientRect();
    };
    for (const cls of ['swatch-done', 'swatch-pending', 'swatch-missed', 'swatch-not-due', 'swatch-future']) {
      const r = swatch(cls);
      expect(r.width).withContext(cls).toBe(16);
      expect(r.height).withContext(cls).toBe(16);
    }
    const today = swatch('swatch-today');
    expect(today.width).toBe(18);
    expect(today.height).toBe(18);
  });
});
