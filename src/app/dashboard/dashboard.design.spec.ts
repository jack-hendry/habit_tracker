import { TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';

/**
 * Design conformance for the dashboard habit list (roadmap §1).
 *
 * WHY THIS EXISTS, AND WHY IT DOES NOT READ THE SCSS
 * --------------------------------------------------
 * The expected values below are transcribed from the PROTOTYPE SOURCE --
 * `Habit Tracker Prototype.dc.html` -- and not from `dashboard.component.scss`.
 * That direction is the entire point. Copying the SCSS would make this a
 * change-detector: it would agree with whatever the component happens to say
 * and catch nothing. Transcribing the design source makes it an oracle, and it
 * catches the two defect classes that every other check in this repo is blind to:
 *
 *   1. A token that exists, is spelled correctly, and resolves to the WRONG
 *      COLOUR. CriticReview R1: the spec asserted the done cell fill was already
 *      tokenised as `--done-bg`, which is #f4fbf6 -- the Dashboard's pale row
 *      tint -- against the calendar's #dcfce7. AC 3's raw-hex grep passes
 *      (a token IS used), the build passes, and the suite passes, but the two
 *      colours are deliberately different (L-012, src/styles.scss:92-98).
 *   2. A rule that is correct and never fires. L-025: a rule that loses on
 *      specificity. Only a real cascade catches that, which is why these
 *      assertions read `getComputedStyle` rather than the stylesheet text.
 *
 * WHY IT PROBES INSTEAD OF SEEDING DATA
 * ------------------------------------
 * The blind spot this file closes is that a rendered view only exercises the
 * states its data happens to produce. Seeding habits produces `todo`, `done`,
 * and `lapsed` rows, but probing them unconditionally tests every state
 * independent of data. The `.dashboard` and `.page-head` containers render
 * unconditionally (dashboard.component.html:1-8 puts them outside the
 * `@if (habits().length === 0)` branch), so probes work with an empty
 * `localStorage` and no seeding is needed.
 *
 * WHY THE COLOUR DOT IS NOT ASSERTED ON ITS BACKGROUND
 * ---------------------------------------------------
 * In the prototype the colour dot's background is written `{{ h.hex }}`: it is
 * an inline per-item binding with no CSS rule behind it. A probe-based assertion
 * on it passes vacuously -- it looks like coverage and tests nothing. Assert the
 * dot's size and border-radius only, never its colour.
 */
describe('DashboardComponent design conformance', () => {
  // Transcribed from the prototype source. rgb() form is what getComputedStyle
  // returns.
  const ROW_PLAIN_BG = 'rgb(255, 255, 255)';
  const ROW_PLAIN_LEFT = 'rgb(220, 220, 217)';
  const ROW_DONE_BG = 'rgb(244, 251, 246)';
  const ROW_DONE_BORDER = 'rgb(226, 240, 230)';
  const ROW_DONE_LEFT = 'rgb(34, 197, 94)';
  const ROW_LAPSED_BG = 'rgb(253, 244, 244)';
  const ROW_LAPSED_BORDER = 'rgb(243, 222, 222)';
  const ROW_LAPSED_LEFT = 'rgb(239, 68, 68)';

  const CHECKBOX_BORDER = 'rgb(201, 205, 210)';
  const CHECKBOX_RADIUS = '6px';
  const CHECKBOX_SIZE = '20px';

  const DOT_SIZE = '9px';
  const DOT_RADIUS = '50%';

  const HABIT_NAME_SIZE = '13.5px';
  const HABIT_NAME_WEIGHT = '600';
  const HABIT_NAME_COLOR = 'rgb(22, 24, 28)';

  const RATE_SIZE = '12.5px';
  const RATE_WEIGHT = '700';
  const RATE_COLOR = 'rgb(0, 102, 204)';

  const LAST_DONE_SIZE = '12px';
  const LAST_DONE_COLOR = 'rgb(117, 121, 127)';

  const H2_BORDER = 'rgb(239, 239, 236)';
  const H2_BORDER_WIDTH = '2px';

  const ROW_RADIUS = '8px';
  const ROW_PADDING = '11px 16px';
  const ROW_GAP = '12px';

  // Token-collapse guard: --done-bg and --cal-done-bg are two different values
  // (L-012, src/styles.scss:92-98).
  const DASHBOARD_DONE_BG = 'rgb(244, 251, 246)'; // #f4fbf6
  const CALENDAR_DONE_BG = 'rgb(220, 252, 231)'; // #dcfce7

  let host: HTMLElement;
  let contentAttr: string;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [DashboardComponent] });
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);

    // Emulated encapsulation rewrites every component rule to
    // `.habit-row[_ngcontent-xxx]`, so a probe element only inherits
    // those rules if it carries the same attribute. Read it off a real
    // element rather than guessing the suffix.
    const dashboard = host.querySelector('.dashboard');
    const found = dashboard
      ? Array.from(dashboard.attributes)
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

  /** A habit row carrying `classes`, styled by the component exactly as a real one. */
  function probeRow(classes: string): HTMLElement {
    const row = document.createElement('label');
    row.className = `habit-row ${classes}`;
    row.setAttribute(contentAttr, '');
    host.appendChild(row);
    return row;
  }

  /** Probe checkbox within a row. */
  function probeCheckbox(row: HTMLElement): HTMLInputElement {
    const checkbox = document.createElement('input');
    checkbox.className = 'tick';
    checkbox.type = 'checkbox';
    checkbox.setAttribute(contentAttr, '');
    row.appendChild(checkbox);
    return checkbox;
  }

  /** Probe dot element within a row. */
  function probeDot(row: HTMLElement): HTMLElement {
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.setAttribute(contentAttr, '');
    row.appendChild(dot);
    return dot;
  }

  /** Probe habit name element. */
  function probeName(row: HTMLElement): HTMLElement {
    const name = document.createElement('span');
    name.className = 'name';
    name.setAttribute(contentAttr, '');
    name.textContent = 'Test Habit';
    row.appendChild(name);
    return name;
  }

  /** Probe rate element. */
  function probeRate(row: HTMLElement): HTMLElement {
    const rate = document.createElement('span');
    rate.className = 'rate';
    rate.setAttribute(contentAttr, '');
    rate.textContent = '100%';
    row.appendChild(rate);
    return rate;
  }

  /** Probe last-done element. */
  function probeLastDone(row: HTMLElement): HTMLElement {
    const lastDone = document.createElement('span');
    lastDone.className = 'last-done';
    lastDone.setAttribute(contentAttr, '');
    lastDone.textContent = 'last done 3 days ago';
    row.appendChild(lastDone);
    return lastDone;
  }

  describe('habit row geometry and shared styles', () => {
    it('plain row has white background and neutral left border', () => {
      const row = probeRow('');
      const cs = getComputedStyle(row);
      expect(cs.backgroundColor).withContext('plain row background').toBe(ROW_PLAIN_BG);
      expect(cs.borderLeftColor).withContext('plain row left border').toBe(ROW_PLAIN_LEFT);
      expect(cs.borderLeftWidth).withContext('plain row left border width').toBe('4px');
      expect(cs.borderRadius).withContext('plain row radius').toBe(ROW_RADIUS);
      expect(cs.padding).withContext('plain row padding').toBe(ROW_PADDING);
      expect(cs.gap).withContext('plain row gap').toBe(ROW_GAP);
    });

    it('done row has pale green background and green left border', () => {
      const row = probeRow('done');
      const cs = getComputedStyle(row);
      expect(cs.backgroundColor).withContext('done row background').toBe(ROW_DONE_BG);
      expect(cs.borderTopColor).withContext('done row border').toBe(ROW_DONE_BORDER);
      expect(cs.borderRightColor).withContext('done row border').toBe(ROW_DONE_BORDER);
      expect(cs.borderBottomColor).withContext('done row border').toBe(ROW_DONE_BORDER);
      expect(cs.borderLeftColor).withContext('done row left border').toBe(ROW_DONE_LEFT);
      expect(cs.borderRadius).withContext('done row radius').toBe(ROW_RADIUS);
      expect(cs.padding).withContext('done row padding').toBe(ROW_PADDING);
      expect(cs.gap).withContext('done row gap').toBe(ROW_GAP);
    });

    it('lapsed row has pale red background and red left border', () => {
      const row = probeRow('lapsed');
      const cs = getComputedStyle(row);
      expect(cs.backgroundColor).withContext('lapsed row background').toBe(ROW_LAPSED_BG);
      expect(cs.borderTopColor).withContext('lapsed row border').toBe(ROW_LAPSED_BORDER);
      expect(cs.borderRightColor).withContext('lapsed row border').toBe(ROW_LAPSED_BORDER);
      expect(cs.borderBottomColor).withContext('lapsed row border').toBe(ROW_LAPSED_BORDER);
      expect(cs.borderLeftColor).withContext('lapsed row left border').toBe(ROW_LAPSED_LEFT);
      expect(cs.borderRadius).withContext('lapsed row radius').toBe(ROW_RADIUS);
      expect(cs.padding).withContext('lapsed row padding').toBe(ROW_PADDING);
    });
  });

  describe('checkbox', () => {
    it('unchecked checkbox has correct size, radius, and border', () => {
      const row = probeRow('');
      const checkbox = probeCheckbox(row);
      const cs = getComputedStyle(checkbox);
      expect(cs.width).withContext('checkbox width').toBe(CHECKBOX_SIZE);
      expect(cs.height).withContext('checkbox height').toBe(CHECKBOX_SIZE);
      expect(cs.borderRadius).withContext('checkbox radius').toBe(CHECKBOX_RADIUS);
      expect(cs.borderWidth).withContext('checkbox border width').toBe('2px');
      expect(cs.borderColor).withContext('checkbox border color').toBe(CHECKBOX_BORDER);
      expect(cs.backgroundColor).withContext('checkbox background').toBe(ROW_PLAIN_BG);
    });

    it('checked checkbox has green background and border', () => {
      const row = probeRow('');
      const checkbox = probeCheckbox(row);
      checkbox.checked = true;
      const cs = getComputedStyle(checkbox);
      expect(cs.borderColor).withContext('checked checkbox border').toBe(ROW_DONE_LEFT);
      expect(cs.backgroundColor).withContext('checked checkbox background').toBe(ROW_DONE_LEFT);
    });
  });

  describe('colour dot', () => {
    it('dot has correct size and border-radius (background is data-bound)', () => {
      const row = probeRow('');
      const dot = probeDot(row);
      const cs = getComputedStyle(dot);
      expect(cs.width).withContext('dot width').toBe(DOT_SIZE);
      expect(cs.height).withContext('dot height').toBe(DOT_SIZE);
      expect(cs.borderRadius).withContext('dot border-radius').toBe(DOT_RADIUS);
    });
  });

  describe('habit name', () => {
    it('name has correct size, weight, and color', () => {
      const row = probeRow('');
      const name = probeName(row);
      const cs = getComputedStyle(name);
      expect(cs.fontSize).withContext('name size').toBe(HABIT_NAME_SIZE);
      expect(cs.fontWeight).withContext('name weight').toBe(HABIT_NAME_WEIGHT);
      expect(cs.color).withContext('name color').toBe(HABIT_NAME_COLOR);
    });
  });

  describe('rate', () => {
    it('rate has correct size, weight, and color', () => {
      const row = probeRow('');
      const rate = probeRate(row);
      const cs = getComputedStyle(rate);
      expect(cs.fontSize).withContext('rate size').toBe(RATE_SIZE);
      expect(cs.fontWeight).withContext('rate weight').toBe(RATE_WEIGHT);
      expect(cs.color).withContext('rate color').toBe(RATE_COLOR);
    });
  });

  describe('last-done', () => {
    it('last-done has correct size and color', () => {
      const row = probeRow('lapsed');
      const lastDone = probeLastDone(row);
      const cs = getComputedStyle(lastDone);
      expect(cs.fontSize).withContext('last-done size').toBe(LAST_DONE_SIZE);
      expect(cs.color).withContext('last-done color').toBe(LAST_DONE_COLOR);
    });
  });

  describe('section heading', () => {
    it('section h2 has correct border', () => {
      const section = document.createElement('section');
      section.className = 'section';
      section.setAttribute(contentAttr, '');
      const h2 = document.createElement('h2');
      h2.setAttribute(contentAttr, '');
      h2.textContent = 'To do today';
      section.appendChild(h2);
      host.appendChild(section);

      const cs = getComputedStyle(h2);
      expect(cs.borderBottomColor).withContext('h2 border color').toBe(H2_BORDER);
      expect(cs.borderBottomWidth).withContext('h2 border width').toBe(H2_BORDER_WIDTH);
    });
  });

  describe('token-collapse guard (L-012)', () => {
    it('done row background is --done-bg (#f4fbf6), not --cal-done-bg (#dcfce7)', () => {
      const row = probeRow('done');
      const cs = getComputedStyle(row);
      expect(cs.backgroundColor)
        .withContext('L-012: dashboard --done-bg is the correct pale green')
        .toBe(DASHBOARD_DONE_BG);
      expect(cs.backgroundColor)
        .withContext('L-012: dashboard done is not the calendar\'s saturated green (src/styles.scss:92-98)')
        .not.toBe(CALENDAR_DONE_BG);
    });
  });

  describe('colour distinctiveness', () => {
    it('plain, done, and lapsed rows have three different background colors', () => {
      const plain = probeRow('');
      const done = probeRow('done');
      const lapsed = probeRow('lapsed');

      const plainBg = getComputedStyle(plain).backgroundColor;
      const doneBg = getComputedStyle(done).backgroundColor;
      const lapsedBg = getComputedStyle(lapsed).backgroundColor;

      const backgrounds = new Set([plainBg, doneBg, lapsedBg]);
      expect(backgrounds.size).withContext('three distinct row backgrounds').toBe(3);
    });

    it('plain, done, and lapsed rows have three different left border colors', () => {
      const plain = probeRow('');
      const done = probeRow('done');
      const lapsed = probeRow('lapsed');

      const plainBorder = getComputedStyle(plain).borderLeftColor;
      const doneBorder = getComputedStyle(done).borderLeftColor;
      const lapsedBorder = getComputedStyle(lapsed).borderLeftColor;

      const borders = new Set([plainBorder, doneBorder, lapsedBorder]);
      expect(borders.size).withContext('three distinct left borders').toBe(3);
    });
  });

  describe('row background distinctiveness', () => {
    it('plain row background is white', () => {
      const row = probeRow('');
      expect(getComputedStyle(row).backgroundColor).toBe(ROW_PLAIN_BG);
    });

    it('done row background is pale green', () => {
      const row = probeRow('done');
      expect(getComputedStyle(row).backgroundColor).toBe(ROW_DONE_BG);
    });

    it('lapsed row background is pale red', () => {
      const row = probeRow('lapsed');
      expect(getComputedStyle(row).backgroundColor).toBe(ROW_LAPSED_BG);
    });
  });

  describe('row border distinctiveness', () => {
    it('plain row left border is neutral grey', () => {
      const row = probeRow('');
      expect(getComputedStyle(row).borderLeftColor).toBe(ROW_PLAIN_LEFT);
    });

    it('done row left border is green', () => {
      const row = probeRow('done');
      expect(getComputedStyle(row).borderLeftColor).toBe(ROW_DONE_LEFT);
    });

    it('lapsed row left border is red', () => {
      const row = probeRow('lapsed');
      expect(getComputedStyle(row).borderLeftColor).toBe(ROW_LAPSED_LEFT);
    });
  });
});
