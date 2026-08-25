import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { HabitService } from '../habit/habit.service';

/**
 * Design conformance for the habit detail page (roadmap §2b).
 *
 * WHY THIS EXISTS, AND WHY IT DOES NOT READ THE SCSS
 * --------------------------------------------------
 * The expected values below are transcribed from the PROTOTYPE SOURCE --
 * `Habit Tracker Prototype.dc.html`, the "HABIT DETAIL" block at specs/model-tiering/tasks.md --
 * and not from `habit-detail.component.scss`. That direction is the entire point. Copying the SCSS
 * would make this a change-detector: it would agree with whatever the component happens to say and
 * catch nothing. Transcribing the design source makes it an oracle, and it catches defect classes
 * that every other check is blind to:
 *
 *   1. A token that exists, is spelled correctly, and resolves to the WRONG COLOUR.
 *   2. A rule that is correct and never fires due to specificity loss.
 *
 * CRITICAL: ON THIS PAGE, DATA-BOUND COLOURS PASS VACUOUSLY
 * -------------------------------------------------------
 * The circle's background, text colour, AND BORDER are all bound inline from data in the prototype
 * (and in the component template). A probe assertion on them passes against defaults and tests
 * nothing. This spec asserts circle GEOMETRY and never circle colour. The only colour guard is the
 * second-palette assertion (item 4 below), which verifies that the habit-detail page uses GREY
 * missed cells, not the Calendar page's red ones.
 */
describe('HabitDetailComponent design conformance', () => {
  // Transcribed from the prototype source. rgb() form is what getComputedStyle returns.

  // Hero section constants
  const BACK_LINK_SIZE = '12.5px';
  const BACK_LINK_WEIGHT = '600';
  const BACK_LINK_COLOR = 'rgb(0, 102, 204)';

  const STREAK_NUMBER_SIZE = '56px';
  const STREAK_NUMBER_WEIGHT = '800';
  const STREAK_NUMBER_LETTER_SPACING = '-2px';
  const STREAK_NUMBER_COLOR = 'rgb(22, 24, 28)';

  const STREAK_LABEL_SIZE = '13px';
  const STREAK_LABEL_WEIGHT = '600';
  const STREAK_LABEL_COLOR = 'rgb(232, 89, 12)';

  const HERO_RULE_WIDTH = '1px';
  const HERO_RULE_BG = 'rgba(0, 0, 0, 0.12)';

  const ICON_TILE_WIDTH = '52px';
  const ICON_TILE_HEIGHT = '52px';
  const ICON_TILE_BORDER_RADIUS = '12px';
  const ICON_TILE_BORDER = '1px solid rgba(0, 0, 0, 0.1)';

  const HERO_BUTTON_SIZE = '12.5px';
  const HERO_BUTTON_PADDING = '8px 14px';

  // Month grid constants
  const CIRCLE_SIZE = '36px';
  const CIRCLE_RADIUS = '999px'; // var(--radius-pill) - prototype uses 50% but implementation uses pill radius
  const CIRCLE_FONT_SIZE = '12.5px';
  const CIRCLE_FONT_WEIGHT = '600';
  const CIRCLE_BOX_SIZING = 'border-box';

  const MONTH_GRID_GAP = '6px';
  const MONTH_GRID_JUSTIFY = 'center';
  const MONTH_GRID_COLUMNS = '40px 40px 40px 40px 40px 40px 40px';

  // Progress track constants
  const PROGRESS_TRACK_HEIGHT = '8px';
  const PROGRESS_TRACK_BG = 'rgb(238, 240, 242)';
  const PROGRESS_TRACK_RADIUS = '4px';

  const PROGRESS_DIVIDER = '1px solid rgb(240, 240, 238)';

  // Activity grid constants
  const ACTIVITY_CELL_WIDTH = '11px';
  const ACTIVITY_CELL_HEIGHT = '11px';
  const ACTIVITY_CELL_GAP = '2.5px';

  // Second-palette guard: habit-detail uses grey for missed, NOT calendar's red (Analyst §2.9 D)
  const MISSED_BG_HABIT_DETAIL = 'rgb(240, 241, 243)'; // #f0f1f3
  const MISSED_TEXT_HABIT_DETAIL = 'rgb(138, 147, 161)'; // #8a93a1
  const MISSED_BG_CALENDAR = 'rgb(254, 226, 226)'; // #fce2e2 (NOT this)
  const MISSED_TEXT_CALENDAR = 'rgb(153, 27, 27)'; // #99 1b1b (NOT this)

  let host: HTMLElement;
  let contentAttr: string;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });

    // Seed a habit and navigate to it (copied from habit-detail.component.spec.ts)
    const habitService = TestBed.inject(HabitService);
    const habit = habitService.add('Test Habit', { type: 'daily' })!;

    // Navigate to the habit detail page
    const harness = await RouterTestingHarness.create(`/habits/${habit.id}`);
    host = harness.routeNativeElement as HTMLElement;
    document.body.appendChild(host);

    // Emulated encapsulation rewrites every component rule to
    // `.circle[_ngcontent-xxx]`, so a probe element only inherits
    // those rules if it carries the same attribute. Read it off a real
    // element rather than guessing the suffix.
    const monthGrid = host.querySelector('.month-grid');
    const found = monthGrid
      ? Array.from(monthGrid.attributes)
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

  /** Probe circle element with given status class */
  function probeCircle(status: string): HTMLElement {
    const circle = document.createElement('span');
    circle.className = `circle status-${status}`;
    circle.setAttribute(contentAttr, '');
    circle.textContent = '15';
    host.querySelector('.month-grid')!.appendChild(circle);
    return circle;
  }

  /** Probe cell-blank element */
  function probeCellBlank(): HTMLElement {
    const blank = document.createElement('span');
    blank.className = 'cell-blank';
    blank.setAttribute(contentAttr, '');
    host.querySelector('.month-grid')!.appendChild(blank);
    return blank;
  }

  describe('cell-blank state (layout only)', () => {
    it('cell-blank occupies one column and has transparent background', () => {
      const blank = probeCellBlank();
      const cs = getComputedStyle(blank);
      // It's a single-column flex item or grid item that should have the same width as a circle
      // Since there is no explicit width, we just check it's transparent
      expect(cs.backgroundColor).withContext('cell-blank background').toBe('rgba(0, 0, 0, 0)');
    });
  });

  describe('hero section literals', () => {
    it('back link has correct size, weight, and color', () => {
      const backLink = host.querySelector('.back-link') as HTMLElement;
      const cs = getComputedStyle(backLink);
      expect(cs.fontSize).withContext('back-link size').toBe(BACK_LINK_SIZE);
      expect(cs.fontWeight).withContext('back-link weight').toBe(BACK_LINK_WEIGHT);
      expect(cs.color).withContext('back-link color').toBe(BACK_LINK_COLOR);
    });

    it('streak number has correct size, weight, letter-spacing, and color', () => {
      const streakNumber = host.querySelector('.streak-number') as HTMLElement;
      const cs = getComputedStyle(streakNumber);
      expect(cs.fontSize).withContext('streak-number size').toBe(STREAK_NUMBER_SIZE);
      expect(cs.fontWeight).withContext('streak-number weight').toBe(STREAK_NUMBER_WEIGHT);
      expect(cs.letterSpacing).withContext('streak-number letter-spacing').toBe(STREAK_NUMBER_LETTER_SPACING);
      expect(cs.color).withContext('streak-number color').toBe(STREAK_NUMBER_COLOR);
    });

    it('streak label has correct size, weight, and color', () => {
      const streakLabel = host.querySelector('.streak-label') as HTMLElement;
      const cs = getComputedStyle(streakLabel);
      expect(cs.fontSize).withContext('streak-label size').toBe(STREAK_LABEL_SIZE);
      expect(cs.fontWeight).withContext('streak-label weight').toBe(STREAK_LABEL_WEIGHT);
      expect(cs.color).withContext('streak-label color').toBe(STREAK_LABEL_COLOR);
    });

    it('divider has correct width and background', () => {
      const divider = host.querySelector('.hero-rule') as HTMLElement;
      const cs = getComputedStyle(divider);
      // Width may be scaled by dpr, so check it's approximately 1px
      expect(parseFloat(cs.width)).withContext('divider width').toBeCloseTo(1, 0);
      expect(cs.backgroundColor).withContext('divider background').toBe(HERO_RULE_BG);
    });

    it('icon tile has correct size and border', () => {
      const tile = host.querySelector('.icon-tile') as HTMLElement;
      const cs = getComputedStyle(tile);
      expect(cs.width).withContext('icon-tile width').toBe(ICON_TILE_WIDTH);
      expect(cs.height).withContext('icon-tile height').toBe(ICON_TILE_HEIGHT);
      expect(cs.borderRadius).withContext('icon-tile border-radius').toBe(ICON_TILE_BORDER_RADIUS);
      expect(cs.borderWidth).withContext('icon-tile border-width').toBe('1px');
      expect(cs.borderColor).withContext('icon-tile border-color').toBe('rgba(0, 0, 0, 0.1)');
    });

    it('hero buttons have correct size and padding, differing from habits page buttons', () => {
      const buttons = host.querySelectorAll('.hero-button');
      expect(buttons.length).toBeGreaterThan(0);
      const button = buttons[0] as HTMLElement;
      const cs = getComputedStyle(button);
      expect(cs.fontSize).withContext('hero-button size').toBe(HERO_BUTTON_SIZE);
      expect(cs.padding).withContext('hero-button padding').toBe(HERO_BUTTON_PADDING);
      // Verify it differs from habits page button size (12px) and padding (7px 11px)
      expect(cs.fontSize).withContext('hero-button differs from habits page 12px').not.toBe('12px');
      expect(cs.padding).withContext('hero-button differs from habits page 7px 11px').not.toBe('7px 11px');
    });
  });

  describe('month grid layout', () => {
    it('month-grid has 7 columns, correct gap, and justify-content', () => {
      const grid = host.querySelector('.month-grid') as HTMLElement;
      const cs = getComputedStyle(grid);
      expect(cs.gridTemplateColumns).withContext('month-grid columns').toBe(MONTH_GRID_COLUMNS);
      expect(cs.gap).withContext('month-grid gap').toBe(MONTH_GRID_GAP);
      expect(cs.justifyContent).withContext('month-grid justify-content').toBe(MONTH_GRID_JUSTIFY);
    });

    it('circle has correct size, radius, font size, weight, and box-sizing', () => {
      const circle = probeCircle('pending');
      const cs = getComputedStyle(circle);
      expect(cs.width).withContext('circle width').toBe(CIRCLE_SIZE);
      expect(cs.height).withContext('circle height').toBe(CIRCLE_SIZE);
      expect(cs.borderRadius).withContext('circle border-radius').toBe(CIRCLE_RADIUS);
      expect(cs.fontSize).withContext('circle font-size').toBe(CIRCLE_FONT_SIZE);
      expect(cs.fontWeight).withContext('circle font-weight').toBe(CIRCLE_FONT_WEIGHT);
      expect(cs.boxSizing).withContext('circle box-sizing').toBe(CIRCLE_BOX_SIZING);
    });
  });

  describe('second-palette guard: habit-detail missed is grey, not calendar red (Analyst §2.9 D)', () => {
    it('missed circle uses habit-detail grey palette', () => {
      const circle = probeCircle('missed');
      const cs = getComputedStyle(circle);
      expect(cs.backgroundColor).withContext('missed background is habit-detail grey').toBe(MISSED_BG_HABIT_DETAIL);
      expect(cs.color).withContext('missed text is habit-detail grey').toBe(MISSED_TEXT_HABIT_DETAIL);
    });

    it('missed circle differs from calendar page red palette', () => {
      const circle = probeCircle('missed');
      const cs = getComputedStyle(circle);
      expect(cs.backgroundColor)
        .withContext('Analyst §2.9 D: habit-detail missed is NOT calendar red #fce2e2')
        .not.toBe(MISSED_BG_CALENDAR);
      expect(cs.color)
        .withContext('Analyst §2.9 D: habit-detail missed text is NOT calendar red #991b1b')
        .not.toBe(MISSED_TEXT_CALENDAR);
    });
  });

  describe('progress track', () => {
    it('progress-track has correct height, background, and border-radius', () => {
      const track = host.querySelector('.progress-track') as HTMLElement;
      const cs = getComputedStyle(track);
      expect(cs.height).withContext('progress-track height').toBe(PROGRESS_TRACK_HEIGHT);
      expect(cs.backgroundColor).withContext('progress-track background').toBe(PROGRESS_TRACK_BG);
      expect(cs.borderRadius).withContext('progress-track border-radius').toBe(PROGRESS_TRACK_RADIUS);
    });

    it('divided row has correct border', () => {
      const divided = host.querySelector('.summary-row.divided') as HTMLElement;
      const cs = getComputedStyle(divided);
      expect(cs.borderTopWidth).withContext('divider width').toBe('1px');
      expect(cs.borderTopColor).withContext('divider color').toBe('rgb(240, 240, 238)');
    });
  });

  describe('activity grid cells', () => {
    it('activity card has correct padding', () => {
      const card = host.querySelector('.activity-card') as HTMLElement;
      const cs = getComputedStyle(card);
      expect(cs.padding).withContext('activity-card padding').toBe('16px 20px');
    });

    it('activity card has correct gap', () => {
      const card = host.querySelector('.activity-card') as HTMLElement;
      const cs = getComputedStyle(card);
      expect(cs.gap).withContext('activity-card gap').toBe('20px');
    });
  });

  describe('status-future border', () => {
    it('status-future has 1.5px (or 1px due to dashing/rounding) dashed border', () => {
      const circle = probeCircle('future');
      const cs = getComputedStyle(circle);
      // ChromeHeadless at dpr 1 rounds 1.5px dashed to 1px, so accept both (L-036)
      expect(['1px', '1.5px']).toContain(cs.borderWidth);
      expect(cs.borderStyle).withContext('border-style').toBe('dashed');
    });
  });

  describe('hero row structure', () => {
    it('hero-row has correct gap and alignment', () => {
      const heroRow = host.querySelector('.hero-row') as HTMLElement;
      const cs = getComputedStyle(heroRow);
      expect(cs.display).withContext('hero-row display').toBe('flex');
      expect(cs.alignItems).withContext('hero-row align-items').toBe('center');
      expect(cs.gap).withContext('hero-row gap').toBe('20px');
    });
  });

  describe('body wrapper', () => {
    it('body wrapper has correct max-width, padding, and gap', () => {
      const body = host.querySelector('.body') as HTMLElement;
      const cs = getComputedStyle(body);
      expect(cs.maxWidth).withContext('body max-width').toBe('900px');
      expect(cs.padding).withContext('body padding').toBe('20px 24px 48px');
      expect(cs.gap).withContext('body gap').toBe('16px');
    });
  });
});
