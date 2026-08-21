import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StackFormComponent } from './stack-form.component';
import { StacksService } from '../stacks.service';

describe('StackFormComponent', () => {
  let component: StackFormComponent;
  let fixture: ComponentFixture<StackFormComponent>;
  let stacksService: StacksService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [StackFormComponent],
      providers: [StacksService],
    }).compileComponents();

    fixture = TestBed.createComponent(StackFormComponent);
    component = fixture.componentInstance;
    stacksService = TestBed.inject(StacksService);
  });

  it('prefills from the [stack] input', () => {
    const stack = stacksService.create();
    stacksService.update(stack.id, {
      name: 'Test Stack',
      time: 'morning',
      anchor: 'I drink coffee',
      aglyph: 'coffee',
      color: 'rose',
    });

    const updated = stacksService.stacks()[0];
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('stack', updated);
      fixture.detectChanges();
    });

    expect(component.draftName()).toBe('Test Stack');
    expect(component.draftTime()).toBe('morning');
    expect(component.draftAnchor()).toBe('I drink coffee');
    expect(component.draftAglyph()).toBe('coffee');
    expect(component.draftColor()).toBe('rose');
  });

  it('`save` emits the edited values', (done) => {
    const stack = stacksService.create();
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('stack', stack);
      fixture.detectChanges();
    });

    component.draftName.set('Updated Stack');
    component.draftTime.set('evening');
    component.draftAnchor.set('I finish dinner');
    component.draftAglyph.set('food');
    component.draftColor.set('emerald');

    component.save.subscribe((patch) => {
      expect(patch.name).toBe('Updated Stack');
      expect(patch.time).toBe('evening');
      expect(patch.anchor).toBe('I finish dinner');
      expect(patch.aglyph).toBe('food');
      expect(patch.color).toBe('emerald');
      done();
    });

    component.onSave();
  });

  it('`cancel` emits without saving', (done) => {
    const stack = stacksService.create();
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('stack', stack);
      fixture.detectChanges();
    });

    component.draftName.set('New Name');

    component.cancel.subscribe(() => {
      done();
    });

    component.cancel.emit();
  });

  it('a whitespace-only name does not emit `save`', () => {
    const stack = stacksService.create();
    TestBed.runInInjectionContext(() => {
      fixture.componentRef.setInput('stack', stack);
      fixture.detectChanges();
    });

    component.draftName.set('   ');
    component.draftTime.set('morning');
    component.draftAnchor.set('anchor');
    component.draftAglyph.set('clock');
    component.draftColor.set('sky');

    let emitted = false;
    component.save.subscribe(() => {
      emitted = true;
    });

    component.onSave();

    expect(emitted).toBe(false);
    expect(component.canSave()).toBe(false);
  });
});
