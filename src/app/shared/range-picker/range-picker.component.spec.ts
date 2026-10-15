import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateRange, RangePickerComponent } from './range-picker.component';

const TODAY = '2026-07-22';

describe('RangePickerComponent', () => {
  let fixture: ComponentFixture<RangePickerComponent>;
  let el: HTMLElement;
  let emitted: DateRange[];

  function create(from: string, to: string, lockStart = false): void {
    fixture = TestBed.createComponent(RangePickerComponent);
    fixture.componentRef.setInput('from', from);
    fixture.componentRef.setInput('to', to);
    fixture.componentRef.setInput('todayIso', TODAY);
    fixture.componentRef.setInput('lockStart', lockStart);
    emitted = [];
    fixture.componentInstance.rangeChange.subscribe((r) => emitted.push(r));
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  function dayButton(iso: string): HTMLButtonElement {
    return el.querySelector(`button[aria-label="${iso}"]`) as HTMLButtonElement;
  }

  function arrow(label: string): HTMLButtonElement {
    return el.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [RangePickerComponent] });
  });

  it('renders July 2026 and disables the previous-month arrow at today', () => {
    create('2026-07-22', '2026-07-29');

    expect(el.querySelector('.picker-label')?.textContent).toContain('July 2026');
    expect(arrow('Previous month').disabled).toBeTrue();
  });

  it('disables a past day and emits nothing when it is clicked', () => {
    create('2026-07-22', '2026-07-29');

    const past = dayButton('2026-07-21');
    expect(past.disabled).toBeTrue();
    past.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(0);
  });

  it('marks exactly one start, one end and five between cells', () => {
    create('2026-07-22', '2026-07-29');

    expect(el.querySelectorAll('.range-start').length).toBe(1);
    expect(el.querySelector('.range-start')?.textContent?.trim()).toBe('22');
    expect(el.querySelectorAll('.range-end').length).toBe(1);
    expect(el.querySelector('.range-end')?.textContent?.trim()).toBe('28');
    expect(el.querySelectorAll('.range-between').length).toBe(5);
  });

  it('emits a one-day range when the first of two clicks is made', () => {
    create('2026-07-22', '2026-07-29');

    dayButton('2026-07-25').click();
    fixture.detectChanges();

    expect(emitted).toEqual([{ from: '2026-07-25', to: '2026-07-26' }]);
    expect(el.querySelector('.picker-hint')?.textContent).toContain('Now click');
  });

  it('extends the range to the second click when the end phase is active', () => {
    create('2026-07-22', '2026-07-29');

    dayButton('2026-07-25').click();
    fixture.detectChanges();
    fixture.componentRef.setInput('from', '2026-07-25');
    fixture.componentRef.setInput('to', '2026-07-26');
    fixture.detectChanges();

    dayButton('2026-07-30').click();
    fixture.detectChanges();

    expect(emitted[1]).toEqual({ from: '2026-07-25', to: '2026-07-31' });
  });

  it('keeps the start fixed and moves only the end when lockStart is true', () => {
    create('2026-07-20', '2026-07-23', true);

    dayButton('2026-07-25').click();
    fixture.detectChanges();

    expect(emitted).toEqual([{ from: '2026-07-20', to: '2026-07-26' }]);
  });

  it('pages forward to August when the next arrow is clicked', () => {
    create('2026-07-22', '2026-07-29');

    arrow('Next month').click();
    fixture.detectChanges();

    expect(el.querySelector('.picker-label')?.textContent).toContain('August 2026');
  });

  it('disables the next arrow after eleven months ahead', () => {
    create('2026-07-22', '2026-07-29');

    for (let i = 0; i < 11; i++) {
      arrow('Next month').click();
      fixture.detectChanges();
    }

    expect(arrow('Next month').disabled).toBeTrue();
  });
});
