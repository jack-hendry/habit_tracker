import { StacksComponent } from './stacks.component';
import { TestBed } from '@angular/core/testing';
import { StacksService } from './stacks.service';
import { HabitService } from '../habit/habit.service';
import { Schedule } from '../habit/habit.model';
import { provideRouter } from '@angular/router';

describe('StacksComponent', () => {
  let component: StacksComponent;
  let habitSvc: HabitService;
  let stacksSvc: StacksService;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [StacksComponent],
      providers: [provideRouter([])],
    });
    habitSvc = TestBed.inject(HabitService);
    stacksSvc = TestBed.inject(StacksService);
    const fixture = TestBed.createComponent(StacksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders one card per persisted stack', () => {
    const stack1 = stacksSvc.create();
    const stack2 = stacksSvc.create();
    TestBed.tick();

    expect(component.cards().length).toBe(2);
    expect(component.cards()[0].stack.id).toBe(stack1.id);
    expect(component.cards()[1].stack.id).toBe(stack2.id);
  });

  it('the done label counts only members due today', () => {
    const stack = stacksSvc.create();
    TestBed.tick();

    const dailySchedule: Schedule = { type: 'daily' };
    const notToday = (new Date().getDay() + 3) % 7;
    const notTodaySchedule: Schedule = { type: 'weekdays', days: [notToday] };

    const h1 = habitSvc.add('Habit 1', dailySchedule);
    const h2 = habitSvc.add('Habit 2', dailySchedule);
    const h3 = habitSvc.add('Habit 3', notTodaySchedule);
    TestBed.tick();

    stacksSvc.addHabit(stack.id, h1!.id);
    stacksSvc.addHabit(stack.id, h2!.id);
    stacksSvc.addHabit(stack.id, h3!.id);
    TestBed.tick();

    habitSvc.toggleToday(h1!.id);
    TestBed.tick();

    const card = component.cards()[0];
    expect(card.doneLabel).toContain('1 of 2 done today');
  });

  it('the unstacked tray lists exactly the habits in no stack', () => {
    const stack = stacksSvc.create();
    TestBed.tick();

    const h1 = habitSvc.add('Habit 1');
    const h2 = habitSvc.add('Habit 2');
    const h3 = habitSvc.add('Habit 3');
    TestBed.tick();

    stacksSvc.addHabit(stack.id, h1!.id);
    TestBed.tick();

    const unstacked = component.unstacked();
    expect(unstacked.length).toBe(2);
    expect(unstacked.map((h) => h.id)).toContain(h2!.id);
    expect(unstacked.map((h) => h.id)).toContain(h3!.id);
    expect(unstacked.map((h) => h.id)).not.toContain(h1!.id);
  });

  it('clicking a due habit check circle calls through and flips isDoneToday', () => {
    const stack = stacksSvc.create();
    TestBed.tick();

    const habit = habitSvc.add('Test Habit');
    TestBed.tick();

    stacksSvc.addHabit(stack.id, habit!.id);
    TestBed.tick();

    const item = component.cards()[0].items[0];
    expect(item.done).toBe(false);

    component.toggle(item);
    TestBed.tick();

    const freshHabit = habitSvc.habits().find((h) => h.id === habit!.id);
    expect(habitSvc.isDoneToday(freshHabit!)).toBe(true);
  });

  it('clicking a not-due habit check circle does nothing', () => {
    const stack = stacksSvc.create();
    TestBed.tick();

    const notToday = (new Date().getDay() + 3) % 7;
    const notTodaySchedule: Schedule = { type: 'weekdays', days: [notToday] };
    const habit = habitSvc.add('Not Due Habit', notTodaySchedule);
    TestBed.tick();

    stacksSvc.addHabit(stack.id, habit!.id);
    TestBed.tick();

    const item = component.cards()[0].items[0];
    expect(item.dueToday).toBe(false);

    const before = [...habitSvc.habits().find((h) => h.id === habit!.id)!.completedDates];
    component.toggle(item);
    TestBed.tick();

    const after = habitSvc.habits().find((h) => h.id === habit!.id)!;
    expect(after.completedDates).toEqual(before);
    expect(habitSvc.isDoneToday(after)).toBe(false);
  });

  it('clicking remove button removes habit from stack and it appears in tray', () => {
    const stack = stacksSvc.create();
    TestBed.tick();

    const habit = habitSvc.add('Test Habit');
    TestBed.tick();

    stacksSvc.addHabit(stack.id, habit!.id);
    TestBed.tick();

    expect(component.cards()[0].items.length).toBe(1);
    expect(component.unstacked().length).toBe(0);

    component.removeFromStack(stack.id, habit!.id);
    TestBed.tick();

    expect(component.cards()[0].items.length).toBe(0);
    expect(component.unstacked().length).toBe(1);
    expect(component.unstacked()[0].id).toBe(habit!.id);
  });

  it('add picker opens on footer button, and clicking chip adds habit and closes picker', () => {
    const stack = stacksSvc.create();
    TestBed.tick();

    const h1 = habitSvc.add('Habit 1');
    const h2 = habitSvc.add('Habit 2');
    TestBed.tick();

    stacksSvc.addHabit(stack.id, h1!.id);
    TestBed.tick();

    expect(component.adding()).toBeNull();

    component.toggleAdding(stack.id);

    expect(component.adding()).toBe(stack.id);

    component.pick(stack.id, h2!.id);
    TestBed.tick();

    expect(component.adding()).toBeNull();
    expect(stacksSvc.stacks()[0].habitIds).toContain(h2!.id);
    expect(component.unstacked().length).toBe(0);
  });

  describe('drag and drop', () => {
    it('dragging an item from stack A and dropping it on stack B removes it from A and places it in B at index 0', () => {
      const stackA = stacksSvc.create();
      const stackB = stacksSvc.create();
      TestBed.tick();

      const h1 = habitSvc.add('Habit 1');
      const h2 = habitSvc.add('Habit 2');
      const h3 = habitSvc.add('Habit 3');
      TestBed.tick();

      stacksSvc.addHabit(stackA.id, h1!.id);
      stacksSvc.addHabit(stackA.id, h2!.id);
      stacksSvc.addHabit(stackB.id, h3!.id);
      TestBed.tick();

      // Simulate drag h1 from stackA to stackB at index 0
      component.onDragStart(h1!.id, stackA.id);
      component.onDrop(new DragEvent('drop'), stackB.id, 0);
      TestBed.tick();

      // h1 should be removed from stackA
      expect(stacksSvc.stacks()[0].habitIds).not.toContain(h1!.id);
      expect(stacksSvc.stacks()[0].habitIds).toContain(h2!.id);

      // h1 should be in stackB at index 0
      expect(stacksSvc.stacks()[1].habitIds[0]).toBe(h1!.id);
      expect(component.cards()[1].items[0].habit.id).toBe(h1!.id);
    });

    it('dropping a habit onto a stack it is already in at its own index leaves the order unchanged', () => {
      const stack = stacksSvc.create();
      TestBed.tick();

      const h1 = habitSvc.add('Habit 1');
      const h2 = habitSvc.add('Habit 2');
      const h3 = habitSvc.add('Habit 3');
      TestBed.tick();

      stacksSvc.addHabit(stack.id, h1!.id);
      stacksSvc.addHabit(stack.id, h2!.id);
      stacksSvc.addHabit(stack.id, h3!.id);
      TestBed.tick();

      const originalOrder = [...stacksSvc.stacks()[0].habitIds];

      // Simulate dragging h2 (index 1) and dropping at index 1 (itself)
      component.onDragStart(h2!.id, stack.id);
      component.onDrop(new DragEvent('drop'), stack.id, 1);
      TestBed.tick();

      // Order should remain unchanged
      expect(stacksSvc.stacks()[0].habitIds).toEqual(originalOrder);
    });

    it('dropping on the add footer appends to the end', () => {
      const stack = stacksSvc.create();
      TestBed.tick();

      const h1 = habitSvc.add('Habit 1');
      const h2 = habitSvc.add('Habit 2');
      TestBed.tick();

      stacksSvc.addHabit(stack.id, h1!.id);
      TestBed.tick();

      // h2 is in unstacked
      expect(component.unstacked().some((h) => h.id === h2!.id)).toBe(true);

      // Simulate dragging h2 and dropping on add footer (index 99)
      component.onDragStart(h2!.id, null);
      component.onDrop(new DragEvent('drop'), stack.id, 99);
      TestBed.tick();

      // h2 should now be in stack at the end
      expect(stacksSvc.stacks()[0].habitIds[stacksSvc.stacks()[0].habitIds.length - 1]).toBe(h2!.id);
      expect(component.unstacked().some((h) => h.id === h2!.id)).toBe(false);
    });

    it('dragging a chip from the unstacked tray onto a stack adds it there and removes it from the tray', () => {
      const stack = stacksSvc.create();
      TestBed.tick();

      const h1 = habitSvc.add('Habit 1');
      const h2 = habitSvc.add('Habit 2');
      TestBed.tick();

      stacksSvc.addHabit(stack.id, h1!.id);
      TestBed.tick();

      // h2 is in unstacked
      expect(component.unstacked().some((h) => h.id === h2!.id)).toBe(true);
      expect(component.cards()[0].items.some((item) => item.habit.id === h2!.id)).toBe(false);

      // Simulate dragging h2 from unstacked (from=null) to stack at index 0
      component.onDragStart(h2!.id, null);
      component.onDrop(new DragEvent('drop'), stack.id, 0);
      TestBed.tick();

      // h2 should be in stack and removed from unstacked
      expect(component.cards()[0].items.some((item) => item.habit.id === h2!.id)).toBe(true);
      expect(component.unstacked().some((h) => h.id === h2!.id)).toBe(false);
    });
  });

  describe('empty state and creation', () => {
    it('with no persisted stacks, .stacks-empty renders and neither .stack-card nor .unstacked does', () => {
      expect(component.cards().length).toBe(0);
      const fixture = TestBed.createComponent(StacksComponent);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.stacks-empty');
      const stackCards = fixture.nativeElement.querySelectorAll('.stack-card');
      const unstakedTray = fixture.nativeElement.querySelector('.unstacked');

      expect(emptyState).toBeTruthy();
      expect(stackCards.length).toBe(0);
      expect(unstakedTray).toBeFalsy();
    });

    it('+ New stack from the empty state creates one card named "New stack" with its picker open, and .stacks-empty is gone', () => {
      expect(component.cards().length).toBe(0);

      component.newStack();
      TestBed.tick();

      expect(component.cards().length).toBe(1);
      expect(component.cards()[0].stack.name).toBe('New stack');
      expect(component.adding()).toBe(component.cards()[0].stack.id);

      const fixture = TestBed.createComponent(StacksComponent);
      fixture.detectChanges();

      const emptyState = fixture.nativeElement.querySelector('.stacks-empty');
      const stackCard = fixture.nativeElement.querySelector('.stack-card');

      expect(emptyState).toBeFalsy();
      expect(stackCard).toBeTruthy();
    });

    it('+ New stack from the header appends a card without disturbing the existing ones', () => {
      const stack1 = stacksSvc.create();
      TestBed.tick();

      expect(component.cards().length).toBe(1);
      expect(component.cards()[0].stack.id).toBe(stack1.id);

      component.newStack();
      TestBed.tick();

      expect(component.cards().length).toBe(2);
      expect(component.cards()[0].stack.id).toBe(stack1.id);
      expect(component.cards()[1].stack.name).toBe('New stack');
    });
  });

  describe('editing and deleting', () => {
    it('clicking the edit button opens the form and hides the item list', () => {
      const stack = stacksSvc.create();
      TestBed.tick();

      const habit = habitSvc.add('Test Habit');
      TestBed.tick();

      stacksSvc.addHabit(stack.id, habit!.id);
      TestBed.tick();

      const fixture = TestBed.createComponent(StacksComponent);
      fixture.detectChanges();

      // Assert BEFORE: item list is visible, form is not
      expect(fixture.nativeElement.querySelectorAll('.item-row').length).toBe(1);
      expect(fixture.nativeElement.querySelector('app-stack-form')).toBeFalsy();

      // Click the edit button
      const editBtn = fixture.nativeElement.querySelector('.edit-btn');
      editBtn.click();
      TestBed.tick();
      fixture.detectChanges();

      // Assert AFTER: form is visible, item list and anchor-box are not
      expect(fixture.componentInstance.editing()).toBe(stack.id);
      expect(fixture.nativeElement.querySelector('app-stack-form')).toBeTruthy();
      expect(fixture.nativeElement.querySelectorAll('.item-row').length).toBe(0);
      expect(fixture.nativeElement.querySelector('.anchor-box')).toBeFalsy();
    });

    it('saving a new name updates the card header and persists', () => {
      const stack = stacksSvc.create();
      TestBed.tick();

      expect(component.cards()[0].stack.name).toBe('New stack');

      component.saveEdit(stack.id, { name: 'Updated Stack' });
      TestBed.tick();

      expect(component.editing()).toBeNull();
      const freshStack = stacksSvc.stacks().find((s) => s.id === stack.id);
      expect(freshStack!.name).toBe('Updated Stack');
      expect(component.cards()[0].stack.name).toBe('Updated Stack');
    });

    it('deleting a stack removes the card and its habits reappear in the Unstacked tray', () => {
      const stack1 = stacksSvc.create();
      const stack2 = stacksSvc.create();
      TestBed.tick();

      const h1 = habitSvc.add('Habit 1');
      const h2 = habitSvc.add('Habit 2');
      TestBed.tick();

      stacksSvc.addHabit(stack1.id, h1!.id);
      stacksSvc.addHabit(stack1.id, h2!.id);
      stacksSvc.addHabit(stack2.id, habitSvc.add('Habit 3')!.id);
      TestBed.tick();

      expect(component.cards().length).toBe(2);
      expect(component.unstacked().length).toBe(0);

      component.deleteStack(stack1.id);
      TestBed.tick();

      expect(component.cards().length).toBe(1);
      expect(component.cards()[0].stack.id).toBe(stack2.id);
      expect(component.unstacked().length).toBe(2);
      expect(component.unstacked().map((h) => h.id)).toContain(h1!.id);
      expect(component.unstacked().map((h) => h.id)).toContain(h2!.id);
    });
  });
});
