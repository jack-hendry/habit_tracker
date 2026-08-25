import { TestBed } from '@angular/core/testing';
import { HabitListComponent } from './habit-list.component';

/**
 * Design conformance for the habits list page (roadmap §2a).
 *
 * WHY THIS EXISTS, AND WHY IT DOES NOT READ THE SCSS
 * --------------------------------------------------
 * The expected values below are transcribed from the PROTOTYPE SOURCE --
 * `Habit Tracker Prototype.dc.html` -- and not from `habit-list.component.scss`.
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
 * UNASSERTED STATES AND WHY
 * -------------------------
 * Of the four declared habit-list states:
 *   - `archived` has no mockup at all
 *   - `paused-badge` has no mockup (kept in code per Analyst §3.8)
 *   - `not-due-today`'s background and padding are data-bound in the prototype,
 *     so only its literals are assertable (B-004). These assertions do NOT
 *     invent missing declarations.
 *
 * The 30-day strip is a separate child component (app-day-strip); its CSS and
 * tokens are out of scope for this file.
 */
describe('HabitListComponent design conformance', () => {
  // Transcribed from the prototype source. rgb() form is what getComputedStyle
  // returns.

  // Container and header
  const CONTAINER_MAX_WIDTH = '1000px';
  const CONTAINER_PADDING = '28px 24px 48px';

  const NEW_HABIT_BUTTON_PADDING = '9px 16px';
  const NEW_HABIT_BUTTON_BG = 'rgb(0, 102, 204)';
  const NEW_HABIT_BUTTON_COLOR = 'rgb(255, 255, 255)';
  const NEW_HABIT_BUTTON_RADIUS = '6px';
  const NEW_HABIT_BUTTON_SIZE = '13px';
  const NEW_HABIT_BUTTON_WEIGHT = '600';

  const TOGGLE_BUTTON_PADDING = '7px 13px';
  const TOGGLE_BUTTON_BG = 'rgb(255, 255, 255)';
  const TOGGLE_BUTTON_BORDER = '1px solid rgb(215, 215, 212)';
  const TOGGLE_BUTTON_RADIUS = '6px';
  const TOGGLE_BUTTON_SIZE = '12px';
  const TOGGLE_BUTTON_COLOR = 'rgb(76, 80, 87)';

  // Checkbox
  const CHECKBOX_SIZE = '22px';
  const CHECKBOX_RADIUS = '6px';
  const CHECKBOX_BOX_SIZING = 'border-box';
  const CHECKBOX_CHECKED_BG = 'rgb(0, 102, 204)';

  // Habit row
  const ROW_BG = 'rgb(255, 255, 255)';
  const ROW_BORDER = '1px solid rgb(232, 232, 230)';
  const ROW_RADIUS = '8px';
  const ROW_PADDING = '13px 18px';
  const ROW_GAP = '16px';

  // Habit name
  const HABIT_NAME_SIZE = '14.5px';
  const HABIT_NAME_WEIGHT = '600';

  // Meta row
  const META_ROW_SIZE = '12px';
  const META_ROW_COLOR = 'rgb(117, 121, 127)';

  // Schedule chip
  const SCHEDULE_CHIP_BG = 'rgb(233, 241, 250)';
  const SCHEDULE_CHIP_COLOR = 'rgb(0, 102, 204)';
  const SCHEDULE_CHIP_WEIGHT = '600';
  const SCHEDULE_CHIP_PADDING = '3px 8px';
  const SCHEDULE_CHIP_RADIUS = '4px';

  // Category chip
  const CATEGORY_CHIP_BG = 'rgb(241, 241, 239)';
  const CATEGORY_CHIP_COLOR = 'rgb(76, 80, 87)';
  const CATEGORY_CHIP_WEIGHT = '500';
  const CATEGORY_CHIP_PADDING = '3px 9px';
  const CATEGORY_CHIP_RADIUS = '999px';

  // Not-scheduled badge (literals only — background and padding are data-bound, B-004)
  const NOT_SCHEDULED_SIZE = '10px';
  const NOT_SCHEDULED_TEXT_TRANSFORM = 'uppercase';
  const NOT_SCHEDULED_LETTER_SPACING = '0.5px';
  const NOT_SCHEDULED_COLOR = 'rgb(163, 167, 173)';
  const NOT_SCHEDULED_RADIUS = '4px';

  // Streak and rate
  const STREAK_COLOR = 'rgb(232, 89, 12)';
  const STREAK_WEIGHT = '700';
  const RATE_COLOR = 'rgb(0, 102, 204)';
  const RATE_WEIGHT = '700';

  // Row action buttons
  const ROW_BUTTON_PADDING = '7px 11px';
  const ROW_BUTTON_BG = 'rgb(255, 255, 255)';
  const ROW_BUTTON_BORDER = '1px solid rgb(215, 215, 212)';
  const ROW_BUTTON_RADIUS = '6px';
  const ROW_BUTTON_SIZE = '12px';
  const ROW_BUTTON_COLOR = 'rgb(76, 80, 87)';

  // Delete button (diverges from regular buttons)
  const DELETE_BUTTON_BORDER = '1px solid rgb(238, 196, 196)';
  const DELETE_BUTTON_COLOR = 'rgb(201, 42, 42)';

  // Token-collapse guard (L-012): three near-greys must be three different values
  const CHIP_BG_RGB = 'rgb(241, 241, 239)'; // #f1f1ef
  const PILL_MUTED_BG_RGB = 'rgb(244, 244, 242)'; // #f4f4f2
  const STRIP_NOT_DUE_RGB = 'rgb(245, 245, 243)'; // #f5f5f3

  let host: HTMLElement;
  let contentAttr: string;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HabitListComponent] });
    const fixture = TestBed.createComponent(HabitListComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);

    // Emulated encapsulation rewrites every component rule to
    // `.habit-list-container[_ngcontent-xxx]`, so a probe element only inherits
    // those rules if it carries the same attribute. Read it off a real
    // element rather than guessing the suffix.
    const container = host.querySelector('.habit-list-container');
    const found = container
      ? Array.from(container.attributes)
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
    const row = document.createElement('div');
    row.className = `habit-item ${classes}`;
    row.setAttribute(contentAttr, '');
    host.appendChild(row);
    return row;
  }

  /** Probe checkbox within a row. */
  function probeCheckbox(row: HTMLElement): HTMLElement {
    const checkbox = document.createElement('div');
    checkbox.className = 'habit-checkbox';
    checkbox.setAttribute(contentAttr, '');
    row.appendChild(checkbox);
    return checkbox;
  }

  /** Probe checked checkbox (adds .checked class). */
  function probeCheckedCheckbox(row: HTMLElement): HTMLElement {
    const checkbox = document.createElement('div');
    checkbox.className = 'habit-checkbox checked';
    checkbox.setAttribute(contentAttr, '');
    row.appendChild(checkbox);
    return checkbox;
  }

  /** Probe habit name element. */
  function probeName(row: HTMLElement): HTMLElement {
    const name = document.createElement('a');
    name.className = 'habit-name';
    name.setAttribute(contentAttr, '');
    name.textContent = 'Test Habit';
    row.appendChild(name);
    return name;
  }

  /** Probe habit-main container. */
  function probeHabitMain(row: HTMLElement): HTMLElement {
    const main = document.createElement('div');
    main.className = 'habit-main';
    main.setAttribute(contentAttr, '');
    row.appendChild(main);
    return main;
  }

  /** Probe habit-meta container. */
  function probeHabitMeta(parent: HTMLElement): HTMLElement {
    const meta = document.createElement('div');
    meta.className = 'habit-meta';
    meta.setAttribute(contentAttr, '');
    parent.appendChild(meta);
    return meta;
  }

  /** Probe schedule label chip. */
  function probeScheduleLabel(parent: HTMLElement): HTMLElement {
    const chip = document.createElement('span');
    chip.className = 'schedule-label';
    chip.setAttribute(contentAttr, '');
    chip.textContent = 'Daily';
    parent.appendChild(chip);
    return chip;
  }

  /** Probe category chip. */
  function probeCategoryChip(parent: HTMLElement): HTMLElement {
    const chip = document.createElement('span');
    chip.className = 'category-chip';
    chip.setAttribute(contentAttr, '');
    chip.textContent = 'Health';
    parent.appendChild(chip);
    return chip;
  }

  /** Probe not-scheduled badge. */
  function probeNotScheduled(parent: HTMLElement): HTMLElement {
    const badge = document.createElement('span');
    badge.className = 'not-scheduled';
    badge.setAttribute(contentAttr, '');
    badge.textContent = 'not scheduled';
    parent.appendChild(badge);
    return badge;
  }

  /** Probe streak info element. */
  function probeStreak(parent: HTMLElement): HTMLElement {
    const streak = document.createElement('span');
    streak.className = 'streak-info';
    streak.setAttribute(contentAttr, '');
    streak.textContent = '7 day streak';
    parent.appendChild(streak);
    return streak;
  }

  /** Probe completion rate element. */
  function probeRate(parent: HTMLElement): HTMLElement {
    const rate = document.createElement('span');
    rate.className = 'completion-rate';
    rate.setAttribute(contentAttr, '');
    rate.textContent = '85%';
    parent.appendChild(rate);
    return rate;
  }

  /** Probe habit-actions container with buttons. */
  function probeHabitActions(row: HTMLElement): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'habit-actions';
    actions.setAttribute(contentAttr, '');
    row.appendChild(actions);
    return actions;
  }

  /** Probe regular action button within habit-actions. */
  function probeActionButton(actionsContainer: HTMLElement): HTMLElement {
    const button = document.createElement('button');
    button.setAttribute(contentAttr, '');
    button.textContent = 'Edit';
    actionsContainer.appendChild(button);
    return button;
  }

  /** Probe delete button within habit-actions. */
  function probeDeleteButton(actionsContainer: HTMLElement): HTMLElement {
    const button = document.createElement('button');
    button.className = 'delete-button';
    button.setAttribute(contentAttr, '');
    button.textContent = 'Delete';
    actionsContainer.appendChild(button);
    return button;
  }

  describe('checkbox', () => {
    it('unchecked checkbox has correct size, radius, and box-sizing', () => {
      const row = probeRow('');
      const checkbox = probeCheckbox(row);
      const cs = getComputedStyle(checkbox);
      expect(cs.width).withContext('checkbox width').toBe(CHECKBOX_SIZE);
      expect(cs.height).withContext('checkbox height').toBe(CHECKBOX_SIZE);
      expect(cs.borderRadius).withContext('checkbox border-radius').toBe(CHECKBOX_RADIUS);
      expect(cs.boxSizing).withContext('checkbox box-sizing').toBe(CHECKBOX_BOX_SIZING);
      // Note: border and background are data-bound and not asserted
    });

    it('checked checkbox has accent background', () => {
      const row = probeRow('');
      const checkbox = probeCheckedCheckbox(row);
      const cs = getComputedStyle(checkbox);
      expect(cs.backgroundColor).withContext('checked checkbox background').toBe(CHECKBOX_CHECKED_BG);
    });
  });

  describe('habit row geometry', () => {
    it('row has correct background, border-radius, padding, and gap', () => {
      const row = probeRow('');
      const cs = getComputedStyle(row);
      expect(cs.backgroundColor).withContext('row background').toBe(ROW_BG);
      // Note: left border is data-bound, so we check top/right/bottom only
      expect(cs.borderTopWidth).withContext('row border top width').toBe('1px');
      expect(cs.borderRadius).withContext('row border-radius').toBe(ROW_RADIUS);
      expect(cs.padding).withContext('row padding').toBe(ROW_PADDING);
      expect(cs.gap).withContext('row gap').toBe(ROW_GAP);
    });
  });

  describe('habit name', () => {
    it('habit name has correct size and weight', () => {
      const row = probeRow('');
      const name = probeName(row);
      const cs = getComputedStyle(name);
      expect(cs.fontSize).withContext('name size').toBe(HABIT_NAME_SIZE);
      expect(cs.fontWeight).withContext('name weight').toBe(HABIT_NAME_WEIGHT);
    });
  });

  describe('meta row', () => {
    it('meta row has correct size and color', () => {
      const row = probeRow('');
      const main = probeHabitMain(row);
      const meta = probeHabitMeta(main);
      const cs = getComputedStyle(meta);
      expect(cs.fontSize).withContext('meta row size').toBe(META_ROW_SIZE);
      expect(cs.color).withContext('meta row color').toBe(META_ROW_COLOR);
    });
  });

  describe('schedule chip', () => {
    it('schedule chip has correct background, color, weight, padding, and radius', () => {
      const row = probeRow('');
      const main = probeHabitMain(row);
      const meta = probeHabitMeta(main);
      const chip = probeScheduleLabel(meta);
      const cs = getComputedStyle(chip);
      expect(cs.backgroundColor).withContext('schedule chip background').toBe(SCHEDULE_CHIP_BG);
      expect(cs.color).withContext('schedule chip color').toBe(SCHEDULE_CHIP_COLOR);
      expect(cs.fontWeight).withContext('schedule chip weight').toBe(SCHEDULE_CHIP_WEIGHT);
      expect(cs.padding).withContext('schedule chip padding').toBe(SCHEDULE_CHIP_PADDING);
      expect(cs.borderRadius).withContext('schedule chip radius').toBe(SCHEDULE_CHIP_RADIUS);
    });
  });

  describe('category chip', () => {
    it('category chip has correct background, color, weight, padding, and radius', () => {
      const row = probeRow('');
      const main = probeHabitMain(row);
      const meta = probeHabitMeta(main);
      const chip = probeCategoryChip(meta);
      const cs = getComputedStyle(chip);
      expect(cs.backgroundColor).withContext('category chip background').toBe(CATEGORY_CHIP_BG);
      expect(cs.color).withContext('category chip color').toBe(CATEGORY_CHIP_COLOR);
      expect(cs.fontWeight).withContext('category chip weight').toBe(CATEGORY_CHIP_WEIGHT);
      expect(cs.padding).withContext('category chip padding').toBe(CATEGORY_CHIP_PADDING);
      expect(cs.borderRadius).withContext('category chip radius').toBe(CATEGORY_CHIP_RADIUS);
    });
  });

  describe('not-scheduled badge (literals only — B-004)', () => {
    it('not-scheduled has correct size, text-transform, letter-spacing, color, and radius', () => {
      const row = probeRow('');
      const main = probeHabitMain(row);
      const meta = probeHabitMeta(main);
      const badge = probeNotScheduled(meta);
      const cs = getComputedStyle(badge);
      expect(cs.fontSize).withContext('not-scheduled size').toBe(NOT_SCHEDULED_SIZE);
      expect(cs.textTransform).withContext('not-scheduled text-transform').toBe(NOT_SCHEDULED_TEXT_TRANSFORM);
      expect(cs.letterSpacing).withContext('not-scheduled letter-spacing').toBe(NOT_SCHEDULED_LETTER_SPACING);
      expect(cs.color).withContext('not-scheduled color').toBe(NOT_SCHEDULED_COLOR);
      expect(cs.borderRadius).withContext('not-scheduled radius').toBe(NOT_SCHEDULED_RADIUS);
      // Note: background and padding are data-bound (B-004) and not asserted
    });
  });

  describe('streak and rate', () => {
    it('streak has correct color and weight', () => {
      const row = probeRow('');
      const main = probeHabitMain(row);
      const meta = probeHabitMeta(main);
      const streak = probeStreak(meta);
      const cs = getComputedStyle(streak);
      expect(cs.color).withContext('streak color').toBe(STREAK_COLOR);
      expect(cs.fontWeight).withContext('streak weight').toBe(STREAK_WEIGHT);
    });

    it('completion rate has correct color and weight', () => {
      const row = probeRow('');
      const main = probeHabitMain(row);
      const meta = probeHabitMeta(main);
      const rate = probeRate(meta);
      const cs = getComputedStyle(rate);
      expect(cs.color).withContext('rate color').toBe(RATE_COLOR);
      expect(cs.fontWeight).withContext('rate weight').toBe(RATE_WEIGHT);
    });
  });

  describe('row action buttons', () => {
    it('regular action button has correct padding, background, border, radius, size, and color', () => {
      const row = probeRow('');
      const actions = probeHabitActions(row);
      const button = probeActionButton(actions);
      const cs = getComputedStyle(button);
      expect(cs.padding).withContext('button padding').toBe(ROW_BUTTON_PADDING);
      expect(cs.backgroundColor).withContext('button background').toBe(ROW_BUTTON_BG);
      expect(cs.border).withContext('button border').toContain('1px');
      expect(cs.borderRadius).withContext('button radius').toBe(ROW_BUTTON_RADIUS);
      expect(cs.fontSize).withContext('button size').toBe(ROW_BUTTON_SIZE);
      expect(cs.color).withContext('button color').toBe(ROW_BUTTON_COLOR);
    });

    it('delete button differs with red border and danger color', () => {
      const row = probeRow('');
      const actions = probeHabitActions(row);
      const button = probeDeleteButton(actions);
      const cs = getComputedStyle(button);
      expect(cs.borderColor).withContext('delete button border color').toBe('rgb(238, 196, 196)');
      expect(cs.color).withContext('delete button color').toBe(DELETE_BUTTON_COLOR);
    });
  });

  describe('token-collapse guard (L-012)', () => {
    it('three near-grey tokens resolve to three distinct values', () => {
      const root = document.documentElement;
      const chipBg = getComputedStyle(root).getPropertyValue('--chip-bg').trim();
      const pillMutedBg = getComputedStyle(root).getPropertyValue('--pill-muted-bg').trim();
      const stripNotDue = getComputedStyle(root).getPropertyValue('--strip-not-due').trim();

      const values = new Set([chipBg, pillMutedBg, stripNotDue]);
      expect(values.size)
        .withContext('L-012: --chip-bg, --pill-muted-bg, and --strip-not-due must be three distinct values')
        .toBe(3);
    });

    it('--chip-bg resolves to correct value', () => {
      const root = document.documentElement;
      const chipBg = getComputedStyle(root).getPropertyValue('--chip-bg').trim();
      expect(chipBg).withContext('L-012: --chip-bg').toBe('#f1f1ef');
    });

    it('--pill-muted-bg resolves to correct value', () => {
      const root = document.documentElement;
      const pillMutedBg = getComputedStyle(root).getPropertyValue('--pill-muted-bg').trim();
      expect(pillMutedBg).withContext('L-012: --pill-muted-bg').toBe('#f4f4f2');
    });

    it('--strip-not-due resolves to correct value', () => {
      const root = document.documentElement;
      const stripNotDue = getComputedStyle(root).getPropertyValue('--strip-not-due').trim();
      expect(stripNotDue).withContext('L-012: --strip-not-due').toBe('#f5f5f3');
    });
  });
});
