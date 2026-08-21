import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StacksComponent } from './stacks.component';
import { HabitService } from '../habit/habit.service';
import { StacksService } from './stacks.service';
import { hexAlpha, Habit } from '../habit/habit.model';
import { Stack } from './stack.model';

/**
 * Design conformance for the stacks page (roadmap §4).
 *
 * WHY THIS EXISTS, AND WHY IT DOES NOT READ THE SCSS
 * --------------------------------------------------
 * The expected values below are transcribed from the PROTOTYPE SOURCE --
 * `Habit Tracker Prototype.dc.html`, the "Reference values used across steps"
 * block at specs/stacks/tasks.md -- and not from `stacks.component.scss`. That
 * direction is the entire point. Copying the SCSS would make this a
 * change-detector: it would agree with whatever the component happens to say
 * and catch nothing. Transcribing the design source makes it an oracle, and it
 * catches defect classes that every other check is blind to:
 *
 *   1. A token that exists, is spelled correctly, and resolves to the WRONG
 *      colour.
 *   2. A rule that is correct and never fires due to specificity loss.
 *
 * HOW IT COVERS ALL DECLARED STATES
 * ----------------------------------
 * The blind spot this file closes is that a rendered view only exercises the
 * states its data happens to produce. This spec seeds a fixture that produces
 * all five declared states in a single render: a stack with a done member, a
 * todo member, and a not-due member; a member with a zero streak; and at least
 * one unstacked habit.
 */
describe('StacksComponent design conformance', () => {
  let host: HTMLElement;

  beforeEach(() => {
    localStorage.clear();

    // Seed habits and stacks data before creating the component
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayIso = `${year}-${month}-${day}`;

    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowYear = tomorrowDate.getFullYear();
    const tomorrowMonth = String(tomorrowDate.getMonth() + 1).padStart(2, '0');
    const tomorrowDay = String(tomorrowDate.getDate()).padStart(2, '0');
    const tomorrowIso = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;

    const doneHabit: Habit = {
      id: 'habit-done',
      name: 'Done Habit',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      completedDates: [todayIso],
      schedule: { type: 'daily' },
      color: 'emerald',
      startDate: todayIso,
    };

    const todoHabit: Habit = {
      id: 'habit-todo',
      name: 'Todo Habit',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      completedDates: [],
      schedule: { type: 'daily' },
      color: 'rose',
      startDate: todayIso,
    };

    // Not-due: start date is tomorrow, so it's not due today
    const notDueHabit: Habit = {
      id: 'habit-not-due',
      name: 'Not Due Habit',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      completedDates: [],
      schedule: { type: 'daily' },
      color: 'sky',
      startDate: tomorrowIso,
    };

    const zeroStreakHabit: Habit = {
      id: 'habit-zero-streak',
      name: 'Zero Streak Habit',
      createdAt: todayIso,
      completedDates: [],
      schedule: { type: 'daily' },
      color: 'amber',
      startDate: todayIso,
    };

    const unstakedHabit: Habit = {
      id: 'habit-unstaked',
      name: 'Unstacked Habit',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      completedDates: [],
      schedule: { type: 'daily' },
      color: 'indigo',
      startDate: todayIso,
    };

    const stack: Stack = {
      id: 'stack-1',
      name: 'Morning',
      time: '7:00 AM',
      anchor: 'I pour coffee',
      aglyph: 'coffee',
      color: 'amber',
      habitIds: ['habit-done', 'habit-todo', 'habit-not-due', 'habit-zero-streak'],
    };

    localStorage.setItem(
      'habit_tracker.habits.v1',
      JSON.stringify([doneHabit, todoHabit, notDueHabit, zeroStreakHabit, unstakedHabit])
    );
    localStorage.setItem('habit_tracker.stacks.v1', JSON.stringify([stack]));

    TestBed.configureTestingModule({
      imports: [StacksComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(StacksComponent);
    host = fixture.nativeElement as HTMLElement;
    document.body.appendChild(host);
    fixture.detectChanges();
  });

  afterEach(() => host?.remove());

  it('fixture renders all five states without error', () => {
    // Assert that each of the five declared data-dependent states is rendered at least once
    expect(host.querySelector('.stack-item-done')).toBeTruthy();
    expect(host.querySelector('.stack-item-todo')).toBeTruthy();
    expect(host.querySelector('.stack-item-not-due')).toBeTruthy();
    expect(host.querySelector('.stack-streak')).toBeTruthy();
    expect(host.querySelector('.unstacked-chip')).toBeTruthy();
  });

  it('.page-container max-width is 1000px', () => {
    const container = host.querySelector('.page-container') as HTMLElement;
    const cs = getComputedStyle(container);
    expect(cs.maxWidth).toBe('1000px');
  });

  it('the card content box is 452px wide, rendering a 490px outer box (452 + 36 padding + 2 border)', () => {
    const card = host.querySelector('.stack-card') as HTMLElement;
    const cs = getComputedStyle(card);
    // Content width is 452px; with 18px padding on each side and 1px border on each side,
    // the outer offsetWidth is 452 + 36 + 2 = 490px. This repo has no global box-sizing reset,
    // so box-model is content-box (default). The target mockup corroborates 490px for the card width.
    expect(cs.width).toBe('452px');
    expect(card.offsetWidth).toBe(490);
  });

  it('the card has border-top-width 3px and border-top-color equal to stack hex', () => {
    const card = host.querySelector('.stack-card') as HTMLElement;
    const cs = getComputedStyle(card);
    expect(cs.borderTopWidth).withContext('border-top-width').toBe('3px');
    // Amber #f59e0b = rgb(245, 158, 11)
    expect(cs.borderTopColor).withContext('border-top-color').toBe('rgb(245, 158, 11)');
  });

  it('the anchor box has 1.5px dashed border in stack hex and background hexAlpha(hex, 0.09)', () => {
    const anchorBox = host.querySelector('.anchor-box') as HTMLElement;
    const cs = getComputedStyle(anchorBox);
    // ChromeHeadless rounds 1.5px to 1px, so both are accepted
    expect(['1px', '1.5px']).toContain(cs.borderWidth);
    expect(cs.borderStyle).withContext('border-style').toBe('dashed');
    // Amber #f59e0b = rgb(245, 158, 11)
    expect(cs.borderColor).withContext('border-color').toBe('rgb(245, 158, 11)');
    // hexAlpha('#f59e0b', 0.09) but getComputedStyle formatting varies, normalize both
    const expectedBg = hexAlpha('#f59e0b', 0.09).replace(/\s/g, '');
    const actualBg = cs.backgroundColor.replace(/\s/g, '');
    expect(actualBg).withContext('background-color').toBe(expectedBg);
  });

  it('a done check circle has background-color and border-color equal to habit hex', () => {
    const itemRows = host.querySelectorAll('.item-row');
    // Find the done item (first one, since it's completed)
    const doneRow = itemRows[0];
    const doneCheckCircle = doneRow.querySelector('.check-circle') as HTMLElement;
    const cs = getComputedStyle(doneCheckCircle);
    // Done habit is emerald #10b981 = rgb(16, 185, 129)
    expect(cs.backgroundColor).withContext('done background-color').toBe('rgb(16, 185, 129)');
    expect(cs.borderColor).withContext('done border-color').toBe('rgb(16, 185, 129)');
  });

  it('a todo check circle has border-color rgb(201, 205, 210)', () => {
    const itemRows = host.querySelectorAll('.item-row');
    // Find a todo item (should be among the items)
    const todoRow = itemRows[1];
    const todoCheckCircle = todoRow.querySelector('.check-circle') as HTMLElement;
    const cs = getComputedStyle(todoCheckCircle);
    expect(cs.borderColor).withContext('todo border-color').toBe('rgb(201, 205, 210)');
  });

  it('a not-due row check circle has cursor not-allowed; a due row has pointer', () => {
    // Select the not-due circle and assert its cursor is exactly 'not-allowed'
    const notDueCircle = host.querySelector('.check-circle.stack-item-not-due') as HTMLElement;
    expect(notDueCircle).withContext('should have at least one not-due circle').toBeTruthy();
    expect(getComputedStyle(notDueCircle).cursor).toBe('not-allowed');

    // Select a circle WITHOUT .stack-item-not-due and assert its cursor is exactly 'pointer'
    const dueCircles = host.querySelectorAll('.check-circle:not(.stack-item-not-due)');
    expect(dueCircles.length).withContext('should have at least one due circle').toBeGreaterThan(0);
    const dueCircle = dueCircles[0] as HTMLElement;
    expect(getComputedStyle(dueCircle).cursor).toBe('pointer');
  });

  it('NOT-TODAY chip: on not-due row it has padding 3px 7px and background rgb(244, 244, 242); on due row it is absent', () => {
    const itemRows = host.querySelectorAll('.item-row');
    let chipsFound = 0;
    let dueRowsWithoutChip = 0;

    // NOTE: This deviates from the reference block (§0 row 62-64), which describes a due-row chip
    // with padding 0 and transparent background. The template renders the chip conditionally with
    // @if (!item.dueToday) at stacks.component.html:58, so on a due row there is no element at all.

    // Find not-due rows (those with a NOT-TODAY chip)
    for (const row of Array.from(itemRows)) {
      const chip = row.querySelector('.not-today-chip') as HTMLElement | null;
      if (chip) {
        // This is a not-due row
        chipsFound++;
        const cs = getComputedStyle(chip);
        expect(cs.padding).withContext('not-due chip padding').toBe('3px 7px');
        expect(cs.backgroundColor).withContext('not-due chip background').toBe('rgb(244, 244, 242)');
      } else {
        // This is a due row, chip should not exist
        dueRowsWithoutChip++;
      }
    }

    // Assert that at least one of each was found, so the spec fails loudly if the fixture stops producing one
    expect(chipsFound).withContext('should have at least one not-due row with chip').toBeGreaterThanOrEqual(1);
    expect(dueRowsWithoutChip).withContext('should have at least one due row without chip').toBeGreaterThanOrEqual(1);
  });

  it('the streak span is rgb(232, 89, 12), font-weight 700, and renders at 0 with text "0 🔥"', () => {
    const streaks = host.querySelectorAll('.stack-streak');
    // Find a streak that is 0
    let zeroStreakFound = false;
    for (const streak of Array.from(streaks)) {
      const cs = getComputedStyle(streak);
      expect(cs.color).withContext('streak color').toBe('rgb(232, 89, 12)');
      expect(cs.fontWeight).withContext('streak font-weight').toBe('700');

      if (streak.textContent?.startsWith('0 ')) {
        zeroStreakFound = true;
        expect(streak.textContent).withContext('zero streak text').toBe('0 🔥');
      }
    }
    expect(zeroStreakFound).withContext('should have at least one zero streak').toBe(true);
  });

  it('the THEN connector renders before the first item (first child is .then-wrapper)', () => {
    const itemContainer = host.querySelector('.stack-card') as HTMLElement;
    // Find the anchor-box, then the next sibling should be .then-wrapper
    const anchorBox = itemContainer.querySelector('.anchor-box');
    const thenWrapper = anchorBox?.nextElementSibling;
    expect(thenWrapper?.classList.contains('then-wrapper')).withContext('connector before first item').toBe(true);
  });
});
