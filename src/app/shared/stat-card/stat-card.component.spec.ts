import { TestBed } from '@angular/core/testing';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [StatCardComponent] });
  });

  it('renders a progress bar instead of the sub-line when progress is set', () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Today');
    fixture.componentRef.setInput('value', '3');
    fixture.componentRef.setInput('unit', 'of 5 done');
    fixture.componentRef.setInput('sub', 'ignored');
    fixture.componentRef.setInput('progress', 60);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-sub')).toBeNull();
    expect((el.querySelector('.stat-fill') as HTMLElement).style.width).toBe('60%');
    expect(el.textContent).toContain('of 5 done');
  });

  it('renders nothing under the value when there is neither sub nor progress', () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Perfect days');
    fixture.componentRef.setInput('value', '34');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.stat-sub')).toBeNull();
    expect(el.querySelector('.stat-track')).toBeNull();
    expect(el.querySelector('.stat-unit')).toBeNull();
  });

  it('marks a positive tone on the sub-line', () => {
    const fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('label', 'Last 7 days');
    fixture.componentRef.setInput('value', '75%');
    fixture.componentRef.setInput('sub', '+2 pts vs prior month');
    fixture.componentRef.setInput('tone', 'positive');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.stat-sub').classList).toContain('positive');
  });
});
