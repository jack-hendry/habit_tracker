import { StacksService } from './stacks.service';
import { Stack, NEW_STACK_DEFAULTS } from './stack.model';
import { HabitService } from '../habit/habit.service';
import { TestBed } from '@angular/core/testing';

describe('StacksService', () => {
  let service: StacksService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StacksService);
  });

  it('starts empty when nothing is persisted', () => {
    expect(service.stacks().length).toBe(0);
  });

  it('create() appends a stack with NEW_STACK_DEFAULTS, non-empty id, and empty habitIds', () => {
    const created = service.create();

    expect(created.name).toBe(NEW_STACK_DEFAULTS.name);
    expect(created.time).toBe(NEW_STACK_DEFAULTS.time);
    expect(created.anchor).toBe(NEW_STACK_DEFAULTS.anchor);
    expect(created.aglyph).toBe(NEW_STACK_DEFAULTS.aglyph);
    expect(created.color).toBe(NEW_STACK_DEFAULTS.color);
    expect(created.id).toBeTruthy();
    expect(created.habitIds).toEqual([]);
    expect(service.stacks().length).toBe(1);
  });

  it('create() twice yields two different ids', () => {
    const first = service.create();
    const second = service.create();

    expect(first.id).not.toBe(second.id);
    expect(service.stacks().length).toBe(2);
  });

  it('update() changes only the patched fields and leaves other fields alone', () => {
    const created = service.create();
    const originalTime = created.time;
    const originalAnchor = created.anchor;

    service.update(created.id, { name: 'Updated Name', color: 'indigo' });

    const updated = service.stacks()[0];
    expect(updated.name).toBe('Updated Name');
    expect(updated.color).toBe('indigo');
    expect(updated.time).toBe(originalTime);
    expect(updated.anchor).toBe(originalAnchor);
  });

  it('update() with an unknown id is a no-op', () => {
    const created = service.create();
    const originalName = created.name;

    service.update('unknown-id', { name: 'Changed' });

    expect(service.stacks()[0].name).toBe(originalName);
    expect(service.stacks().length).toBe(1);
  });

  it('remove() deletes only the named stack', () => {
    const first = service.create();
    const second = service.create();

    service.remove(first.id);

    expect(service.stacks().length).toBe(1);
    expect(service.stacks()[0].id).toBe(second.id);
  });

  it('a stack written to habit_tracker.stacks.v1 is read back on construction', () => {
    const stack: Stack = {
      id: 'test-stack',
      name: 'Test Stack',
      time: '7:00 AM',
      anchor: 'I pour coffee',
      aglyph: 'coffee',
      color: 'amber',
      habitIds: ['habit-1'],
    };

    localStorage.setItem('habit_tracker.stacks.v1', JSON.stringify([stack]));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(StacksService);

    expect(newService.stacks().length).toBe(1);
    expect(newService.stacks()[0].id).toBe('test-stack');
    expect(newService.stacks()[0].name).toBe('Test Stack');
  });

  it('reload preserves stack order and membership', () => {
    const first: Stack = {
      id: 'stack-first',
      name: 'First Stack',
      time: '7:00 AM',
      anchor: 'I pour coffee',
      aglyph: 'coffee',
      color: 'amber',
      habitIds: ['h-a', 'h-b'],
    };
    const second: Stack = {
      id: 'stack-second',
      name: 'Second Stack',
      time: '9:00 AM',
      anchor: 'I sit down',
      aglyph: 'book',
      color: 'sky',
      habitIds: ['h-c', 'h-d', 'h-e'],
    };

    localStorage.setItem('habit_tracker.stacks.v1', JSON.stringify([first, second]));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const svc = TestBed.inject(StacksService);

    expect(svc.stacks().map((s) => s.id)).toEqual(['stack-first', 'stack-second']);
    expect(svc.stacks()[0].habitIds).toEqual(['h-a', 'h-b']);
    expect(svc.stacks()[1].habitIds).toEqual(['h-c', 'h-d', 'h-e']);
  });

  it('load() drops a malformed row and keeps the valid one', () => {
    const validStack: Stack = {
      id: 'valid',
      name: 'Valid Stack',
      time: '7:00 AM',
      anchor: 'I pour coffee',
      aglyph: 'coffee',
      color: 'amber',
      habitIds: [],
    };
    const malformed = { id: 'x' }; // Missing required fields

    localStorage.setItem('habit_tracker.stacks.v1', JSON.stringify([validStack, malformed]));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const newService = TestBed.inject(StacksService);

    expect(newService.stacks().length).toBe(1);
    expect(newService.stacks()[0].id).toBe('valid');
  });
});

describe('StacksService — membership', () => {
  let service: StacksService;
  let stackA: Stack;
  let stackB: Stack;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(StacksService);
    stackA = service.create();
    stackB = service.create();
  });

  it('addHabit appends to the end of the target stack', () => {
    service.addHabit(stackA.id, 'habit-1');
    service.addHabit(stackA.id, 'habit-2');

    const updated = service.stacks()[0];
    expect(updated.habitIds).toEqual(['habit-1', 'habit-2']);
  });

  it('addHabit on a habit already in another stack removes it from that stack', () => {
    service.addHabit(stackA.id, 'habit-1');
    service.addHabit(stackB.id, 'habit-1');

    const a = service.stacks()[0];
    const b = service.stacks()[1];
    expect(a.habitIds).toEqual([]);
    expect(b.habitIds).toEqual(['habit-1']);
  });

  it('addHabit on a habit already in this stack leaves the stack length unchanged and moves it to the end', () => {
    service.addHabit(stackA.id, 'habit-1');
    service.addHabit(stackA.id, 'habit-2');
    service.addHabit(stackA.id, 'habit-1');

    const updated = service.stacks()[0];
    expect(updated.habitIds.length).toBe(2);
    expect(updated.habitIds).toEqual(['habit-2', 'habit-1']);
  });

  it('moveHabit into another stack at index 0 inserts it first and leaves the origin without it', () => {
    service.addHabit(stackA.id, 'habit-1');
    service.addHabit(stackB.id, 'habit-2');
    service.addHabit(stackB.id, 'habit-3');

    service.moveHabit('habit-1', stackB.id, 0);

    const a = service.stacks()[0];
    const b = service.stacks()[1];
    expect(a.habitIds).toEqual([]);
    expect(b.habitIds).toEqual(['habit-1', 'habit-2', 'habit-3']);
  });

  it('moveHabit within the same stack from position 0 to position 2 puts it at index 2 and preserves the other members relative order', () => {
    service.addHabit(stackA.id, 'habit-1');
    service.addHabit(stackA.id, 'habit-2');
    service.addHabit(stackA.id, 'habit-3');

    service.moveHabit('habit-1', stackA.id, 2);

    const updated = service.stacks()[0];
    expect(updated.habitIds).toEqual(['habit-2', 'habit-3', 'habit-1']);
  });

  it('moveHabit with an index past the end appends', () => {
    service.addHabit(stackA.id, 'habit-1');
    service.addHabit(stackA.id, 'habit-2');

    service.moveHabit('habit-1', stackA.id, 99);

    const updated = service.stacks()[0];
    expect(updated.habitIds).toEqual(['habit-2', 'habit-1']);
  });

  it('moveHabit with a negative index inserts at 0', () => {
    service.addHabit(stackA.id, 'habit-1');
    service.addHabit(stackA.id, 'habit-2');

    service.moveHabit('habit-1', stackA.id, -5);

    const updated = service.stacks()[0];
    expect(updated.habitIds).toEqual(['habit-1', 'habit-2']);
  });

  it('moveHabit to an unknown stack id is a complete no-op', () => {
    service.addHabit(stackA.id, 'habit-1');

    service.moveHabit('habit-1', 'unknown-id', 0);

    const a = service.stacks()[0];
    expect(a.habitIds).toEqual(['habit-1']);
  });

  it('removeHabit removes it from the named stack only, and stackIdOf then returns null', () => {
    service.addHabit(stackA.id, 'habit-1');

    service.removeHabit(stackA.id, 'habit-1');

    expect(service.stackIdOf('habit-1')).toBeNull();
    const a = service.stacks()[0];
    expect(a.habitIds).toEqual([]);
  });

  it('unstacked lists active habits in no stack', () => {
    const habitSvc = TestBed.inject(HabitService);

    const h1 = habitSvc.add('Habit 1');
    const h2 = habitSvc.add('Habit 2');
    TestBed.tick();

    service.addHabit(stackA.id, h1!.id);
    TestBed.tick();

    const unst = service.unstacked();
    expect(unst.length).toBe(1);
    expect(unst[0].id).toBe(h2!.id);
  });

  it('unstacked excludes an archived habit even when that habit is in no stack', () => {
    const habitSvc = TestBed.inject(HabitService);

    const h1 = habitSvc.add('Habit 1');
    const h2 = habitSvc.add('Habit 2');
    TestBed.tick();

    habitSvc.archive(h1!.id);
    TestBed.tick();

    const unst = service.unstacked();
    expect(unst.length).toBe(1);
    expect(unst[0].id).toBe(h2!.id);
  });
});

describe('StacksService — referential integrity', () => {
  let habitSvc: HabitService;
  let stacksSvc: StacksService;
  let stackA: Stack;
  let stackB: Stack;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    habitSvc = TestBed.inject(HabitService);
    stacksSvc = TestBed.inject(StacksService);
    stackA = stacksSvc.create();
    stackB = stacksSvc.create();
  });

  it('deleting a habit strips its id from every stack that held it', () => {
    const h1 = habitSvc.add('Habit 1');
    const h2 = habitSvc.add('Habit 2');
    TestBed.tick();

    stacksSvc.addHabit(stackA.id, h1!.id);
    stacksSvc.addHabit(stackB.id, h1!.id);
    stacksSvc.addHabit(stackB.id, h2!.id);
    TestBed.tick();

    habitSvc.remove(h1!.id);
    TestBed.tick();

    const a = stacksSvc.stacks()[0];
    const b = stacksSvc.stacks()[1];
    expect(a.habitIds).toEqual([]);
    expect(b.habitIds).toEqual([h2!.id]);
  });

  it('after a delete, the pruned state is persisted', () => {
    const h1 = habitSvc.add('Habit 1');
    TestBed.tick();

    stacksSvc.addHabit(stackA.id, h1!.id);
    TestBed.tick();

    habitSvc.remove(h1!.id);
    TestBed.tick();

    const persisted = localStorage.getItem('habit_tracker.stacks.v1');
    expect(persisted).toBeTruthy();
    const parsed = JSON.parse(persisted!);
    expect(parsed[0].habitIds).toEqual([]);
  });

  it('deleting a habit that is in no stack changes nothing and leaves the stacks array identical by reference', () => {
    const h1 = habitSvc.add('Habit 1');
    const h2 = habitSvc.add('Habit 2');
    TestBed.tick();

    stacksSvc.addHabit(stackA.id, h1!.id);
    TestBed.tick();

    const stacksBefore = stacksSvc.stacks();
    habitSvc.remove(h2!.id);
    TestBed.tick();

    const stacksAfter = stacksSvc.stacks();
    expect(stacksAfter).toBe(stacksBefore);
  });

  it('archiving a habit leaves habitIds unchanged', () => {
    const h1 = habitSvc.add('Habit 1');
    TestBed.tick();

    stacksSvc.addHabit(stackA.id, h1!.id);
    TestBed.tick();

    const habitIdsBefore = stacksSvc.stacks()[0].habitIds.slice();
    habitSvc.archive(h1!.id);
    TestBed.tick();

    const habitIdsAfter = stacksSvc.stacks()[0].habitIds;
    expect(habitIdsAfter).toEqual(habitIdsBefore);
  });

  it('visibleHabits() omits the archived member and keeps the others in stack order', () => {
    const h1 = habitSvc.add('Habit 1');
    const h2 = habitSvc.add('Habit 2');
    const h3 = habitSvc.add('Habit 3');
    TestBed.tick();

    stacksSvc.addHabit(stackA.id, h1!.id);
    stacksSvc.addHabit(stackA.id, h2!.id);
    stacksSvc.addHabit(stackA.id, h3!.id);
    TestBed.tick();

    habitSvc.archive(h2!.id);
    TestBed.tick();

    const visible = stacksSvc.visibleHabits(stacksSvc.stacks()[0]);
    expect(visible.length).toBe(2);
    expect(visible[0].id).toBe(h1!.id);
    expect(visible[1].id).toBe(h3!.id);
  });

  it('reactivating puts it back at its original index in visibleHabits()', () => {
    const h1 = habitSvc.add('Habit 1');
    const h2 = habitSvc.add('Habit 2');
    const h3 = habitSvc.add('Habit 3');
    TestBed.tick();

    stacksSvc.addHabit(stackA.id, h1!.id);
    stacksSvc.addHabit(stackA.id, h2!.id);
    stacksSvc.addHabit(stackA.id, h3!.id);
    TestBed.tick();

    habitSvc.archive(h2!.id);
    TestBed.tick();

    habitSvc.reactivate(h2!.id);
    TestBed.tick();

    const visible = stacksSvc.visibleHabits(stacksSvc.stacks()[0]);
    expect(visible.length).toBe(3);
    expect(visible[0].id).toBe(h1!.id);
    expect(visible[1].id).toBe(h2!.id);
    expect(visible[2].id).toBe(h3!.id);
  });
});
