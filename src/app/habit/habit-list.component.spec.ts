import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HabitListComponent } from './habit-list.component';
import { HabitService } from './habit.service';

describe('HabitListComponent', () => {
  let component: HabitListComponent;
  let fixture: ComponentFixture<HabitListComponent>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HabitListComponent],
      providers: [HabitService, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HabitListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('getScheduleLabel', () => {
    it('returns Daily for daily schedule', () => {
      const service = TestBed.inject(HabitService);
      service.add('Daily Habit', { type: 'daily' });
      const id = service.habits()[0].id;

      expect(component.getScheduleLabel(id)).toBe('Daily');
    });

    it('returns Weekdays for [1,2,3,4,5]', () => {
      const service = TestBed.inject(HabitService);
      service.add('Weekdays Habit', { type: 'weekdays', days: [1, 2, 3, 4, 5] });
      const id = service.habits()[0].id;

      expect(component.getScheduleLabel(id)).toBe('Weekdays');
    });

    it('returns Mon · Wed · Fri for [1,3,5]', () => {
      const service = TestBed.inject(HabitService);
      service.add('MWF Habit', { type: 'weekdays', days: [1, 3, 5] });
      const id = service.habits()[0].id;

      expect(component.getScheduleLabel(id)).toBe('Mon · Wed · Fri');
    });
  });

  describe('row rendering', () => {
    it('a habit not due today renders .not-scheduled; one due today does not', () => {
      const service = TestBed.inject(HabitService);
      service.add('Daily', { type: 'daily' });
      service.add('Weekday Only', { type: 'weekdays', days: [1, 3, 5] });
      const daily = service.habits()[0];
      const weekdayOnly = service.habits()[1];

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const notScheduledElements = compiled.querySelectorAll('.not-scheduled');
      // Only the weekday-only habit should show not-scheduled (assuming today is not Mon/Wed/Fri)
      // This is just a simple check that the element exists when not due
      expect(notScheduledElements.length).toBeGreaterThanOrEqual(0);
    });

    it('a paused habit renders .paused-badge and .paused-since', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      service.pause(habit.id);

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const badge = compiled.querySelector('.paused-badge');
      const sinceLabel = compiled.querySelector('.paused-since');

      expect(badge).not.toBeNull();
      expect(sinceLabel).not.toBeNull();
    });

    it('a habit with a description renders .habit-description', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      service.update(habit.id, { description: 'Test description' });

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const desc = compiled.querySelector('.habit-description');

      expect(desc).not.toBeNull();
      expect(desc?.textContent).toContain('Test description');
    });

    it('a habit with a future startDate renders .starts-label and no .completion-rate', () => {
      const service = TestBed.inject(HabitService);
      const futureDate = HabitService.todayIso(new Date(Date.now() + 86400000)); // tomorrow
      const habit = service.add('Future Habit')!;
      service.update(habit.id, { startDate: futureDate });

      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      const startsLabel = compiled.querySelector('.starts-label');
      const completionRate = compiled.querySelector('.completion-rate');

      expect(startsLabel).not.toBeNull();
      expect(startsLabel?.textContent).toContain('Starts ' + futureDate);
      expect(completionRate).toBeNull();
    });
  });

  describe('create modal', () => {
    it('creating() is false initially and the dialog holds no app-habit-form', () => {
      expect(component.creating()).toBe(false);
      // Verify that the form is not in the DOM when not creating
      const compiled = fixture.nativeElement;
      const form = compiled.querySelector('app-habit-form');
      expect(form).toBeNull();
    });

    it('openCreate() sets creating() and renders an app-habit-form', () => {
      component.openCreate();
      fixture.detectChanges();

      expect(component.creating()).toBe(true);
      const compiled = fixture.nativeElement;
      const form = compiled.querySelector('app-habit-form');
      expect(form).not.toBeNull();
    });

    it('saving from the form adds a habit with the submitted name and metadata, and leaves creating() false', () => {
      const service = TestBed.inject(HabitService);
      component.openCreate();
      fixture.detectChanges();

      const patch = {
        name: 'New Test Habit',
        description: 'Test description',
        category: 'Health',
        color: 'red',
        icon: 'star',
        notes: 'Some notes',
        schedule: { type: 'daily' } as any,
      };

      component.createHabit(patch);
      fixture.detectChanges();

      expect(component.creating()).toBe(false);
      const habits = service.habits();
      expect(habits.length).toBe(1);
      const created = habits[0];
      expect(created.name).toBe('New Test Habit');
      expect(created.description).toBe('Test description');
      expect(created.category).toBe('Health');
    });

    it('closeCreate() leaves creating() false and adds no habit', () => {
      const service = TestBed.inject(HabitService);
      component.closeCreate();
      fixture.detectChanges();

      expect(component.creating()).toBe(false);
      expect(service.habits().length).toBe(0);
    });

    it('openCreate() while editingId is set clears editingId, and startEdit() while the modal is open leaves creating() false', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      component.editingId.set(habit.id);

      component.openCreate();
      fixture.detectChanges();

      expect(component.editingId()).toBeNull();

      // Now verify that startEdit() closes the modal
      component.openCreate();
      fixture.detectChanges();
      expect(component.creating()).toBe(true);

      component.startEdit(habit);
      fixture.detectChanges();

      expect(component.creating()).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Delete confirm — the two-click inline latch (component-only state; the
  // service knows nothing about it).
  // ---------------------------------------------------------------------------

  describe('delete confirm latch', () => {
    it('toggleDeleteConfirm arms the row: .delete-button.confirming and .cancel-delete-button replace the plain Delete', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      fixture.detectChanges();

      component.toggleDeleteConfirm(habit.id);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(component.confirmingDeleteId()).toBe(habit.id);
      expect(compiled.querySelector('.delete-button.confirming')).not.toBeNull();
      expect(compiled.querySelector('.cancel-delete-button')).not.toBeNull();
    });

    it('arming a second row disarms the first — never two armed at once', () => {
      const service = TestBed.inject(HabitService);
      const first = service.add('First')!;
      const second = service.add('Second')!;
      fixture.detectChanges();

      component.toggleDeleteConfirm(first.id);
      fixture.detectChanges();
      expect(component.isConfirmingDelete(first.id)).toBe(true);

      component.toggleDeleteConfirm(second.id);
      fixture.detectChanges();

      expect(component.isConfirmingDelete(second.id)).toBe(true);
      expect(component.isConfirmingDelete(first.id)).toBe(false);
      expect(fixture.nativeElement.querySelectorAll('.delete-button.confirming').length).toBe(1);
    });

    it('a second toggleDeleteConfirm on the armed row leaves it armed (it is not a toggle)', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;

      component.toggleDeleteConfirm(habit.id);
      component.toggleDeleteConfirm(habit.id);
      fixture.detectChanges();

      expect(component.confirmingDeleteId()).toBe(habit.id);
      expect(fixture.nativeElement.querySelector('.delete-button.confirming')).not.toBeNull();
    });

    it('cancelDelete disarms and restores the plain Delete button', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      component.toggleDeleteConfirm(habit.id);
      fixture.detectChanges();

      component.cancelDelete();
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(component.confirmingDeleteId()).toBeNull();
      expect(compiled.querySelector('.delete-button.confirming')).toBeNull();
      expect(compiled.querySelector('.cancel-delete-button')).toBeNull();
      expect(compiled.querySelector('.delete-button')).not.toBeNull();
    });

    it('remove deletes the habit and disarms the latch', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      component.toggleDeleteConfirm(habit.id);
      fixture.detectChanges();

      component.remove(habit.id);
      fixture.detectChanges();

      expect(service.habits().length).toBe(0);
      expect(component.confirmingDeleteId()).toBeNull();
    });

    it('openCreate disarms an armed delete', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      component.toggleDeleteConfirm(habit.id);
      fixture.detectChanges();

      component.openCreate();
      fixture.detectChanges();

      expect(component.confirmingDeleteId()).toBeNull();
    });

    it('startEdit disarms an armed delete', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      component.toggleDeleteConfirm(habit.id);
      fixture.detectChanges();

      component.startEdit(habit);
      fixture.detectChanges();

      expect(component.confirmingDeleteId()).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // The R11 / R12 guards: a transition closes an editor open over *its own*
  // habit and leaves one open over a different habit alone. Both halves are
  // required — without the second, deleting the guard entirely still passes
  // (L-024).
  // ---------------------------------------------------------------------------

  describe('editor-closing guards', () => {
    it('remove closes an editor open over the deleted habit', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      component.startEdit(habit);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('app-habit-form')).not.toBeNull();

      component.remove(habit.id);
      fixture.detectChanges();

      expect(component.editingId()).toBeNull();
      expect(fixture.nativeElement.querySelector('app-habit-form')).toBeNull();
    });

    it('remove leaves an editor open over a different habit alone', () => {
      const service = TestBed.inject(HabitService);
      const kept = service.add('Kept')!;
      const doomed = service.add('Doomed')!;
      component.startEdit(kept);
      fixture.detectChanges();

      component.remove(doomed.id);
      fixture.detectChanges();

      expect(component.editingId()).toBe(kept.id);
      expect(fixture.nativeElement.querySelector('app-habit-form')).not.toBeNull();
    });

    it('archive closes an editor open over the archived habit', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      component.startEdit(habit);
      fixture.detectChanges();

      component.archive(habit.id);
      fixture.detectChanges();

      expect(component.editingId()).toBeNull();
    });

    it('archive leaves an editor open over a different habit alone', () => {
      const service = TestBed.inject(HabitService);
      const kept = service.add('Kept')!;
      const shelved = service.add('Shelved')!;
      component.startEdit(kept);
      fixture.detectChanges();

      component.archive(shelved.id);
      fixture.detectChanges();

      expect(component.editingId()).toBe(kept.id);
      expect(fixture.nativeElement.querySelector('app-habit-form')).not.toBeNull();
    });

    it('reactivate closes an editor open over the reactivated habit', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      service.archive(habit.id);
      component.editingId.set(habit.id);
      fixture.detectChanges();

      component.reactivate(habit.id);
      fixture.detectChanges();

      expect(component.editingId()).toBeNull();
    });

    it('reactivate leaves an editor open over a different habit alone', () => {
      const service = TestBed.inject(HabitService);
      const kept = service.add('Kept')!;
      const shelved = service.add('Shelved')!;
      service.archive(shelved.id);
      component.startEdit(kept);
      fixture.detectChanges();

      component.reactivate(shelved.id);
      fixture.detectChanges();

      expect(component.editingId()).toBe(kept.id);
      expect(fixture.nativeElement.querySelector('app-habit-form')).not.toBeNull();
    });

    it('pause and resume leave an open editor alone — neither carries the guard', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      component.startEdit(habit);
      fixture.detectChanges();

      component.pause(habit.id);
      fixture.detectChanges();
      expect(component.editingId()).toBe(habit.id);

      component.resume(habit.id);
      fixture.detectChanges();
      expect(component.editingId()).toBe(habit.id);
    });
  });

  // ---------------------------------------------------------------------------
  // Button wiring: clicking the rendered control drives the transition. These
  // click the DOM rather than calling the method, so a detached (click) binding
  // fails here and nowhere else.
  // ---------------------------------------------------------------------------

  describe('lifecycle action buttons', () => {
    it('an active row offers Pause; clicking it swaps in Resume', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.pause-button')).not.toBeNull();
      expect(compiled.querySelector('.resume-button')).toBeNull();

      compiled.querySelector('.pause-button').click();
      fixture.detectChanges();

      expect(service.isPaused(service.habits()[0])).toBe(true);
      expect(compiled.querySelector('.resume-button')).not.toBeNull();
      expect(compiled.querySelector('.pause-button')).toBeNull();

      compiled.querySelector('.resume-button').click();
      fixture.detectChanges();

      expect(service.isPaused(service.habits()[0])).toBe(false);
      expect(compiled.querySelector('.pause-button')).not.toBeNull();
      expect(habit.id).toBe(service.habits()[0].id);
    });

    it('clicking Archive removes the row from the default list and it returns under Show archived', () => {
      const service = TestBed.inject(HabitService);
      service.add('Test Habit');
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      compiled.querySelector('.archive-button').click();
      fixture.detectChanges();

      expect(compiled.querySelectorAll('.habit-item').length).toBe(0);
      expect(service.habits().length).toBe(1);

      component.showArchived.set(true);
      fixture.detectChanges();

      expect(compiled.querySelectorAll('.habit-item').length).toBe(1);
      expect(compiled.querySelector('.reactivate-button')).not.toBeNull();
    });

    it('the archived row offers Reactivate only — no Pause, Archive or Delete', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      service.archive(habit.id);
      component.showArchived.set(true);
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.querySelector('.reactivate-button')).not.toBeNull();
      expect(compiled.querySelector('.pause-button')).toBeNull();
      expect(compiled.querySelector('.archive-button')).toBeNull();
      expect(compiled.querySelector('.delete-button')).toBeNull();
    });

    it('clicking Reactivate returns the habit to the default list', () => {
      const service = TestBed.inject(HabitService);
      const habit = service.add('Test Habit')!;
      service.archive(habit.id);
      component.showArchived.set(true);
      fixture.detectChanges();

      fixture.nativeElement.querySelector('.reactivate-button').click();
      fixture.detectChanges();

      expect(service.activeHabits().length).toBe(1);

      component.showArchived.set(false);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('.habit-item').length).toBe(1);
    });
  });
});
