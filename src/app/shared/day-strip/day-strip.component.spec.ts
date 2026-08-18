import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DayStripComponent } from './day-strip.component';
import { Component, signal } from '@angular/core';
import { DayStatus } from '../../habit/habit.model';

// Test host component to provide inputs
@Component({
  selector: 'app-test-host',
  standalone: true,
  imports: [DayStripComponent],
  template: `
    <app-day-strip
      [statuses]="statuses()"
      [hex]="hex()"
      [label]="label()"
    ></app-day-strip>
  `,
})
class TestHostComponent {
  statuses = signal<DayStatus[]>([]);
  hex = signal('#0066cc');
  label = signal('Last 30 days');
}

describe('DayStripComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let component: DayStripComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    component = fixture.debugElement.children[0].componentInstance;
    fixture.detectChanges();
  });

  it('renders one .cell per status (30 in → 30 cells)', () => {
    const statuses: DayStatus[] = Array(30).fill('done');
    hostComponent.statuses.set(statuses);
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll('.cell');
    expect(cells.length).toBe(30);
  });

  it('a done cell uses the hex input', () => {
    const statuses: DayStatus[] = ['done'];
    hostComponent.statuses.set(statuses);
    hostComponent.hex.set('#e8590c');
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector('.cell');
    // Browser converts hex to rgb, so check that the background is set to the hex value
    expect(cell.style.background).toBe('rgb(232, 89, 12)');
  });

  it('a missed cell uses var(--strip-missed)', () => {
    const statuses: DayStatus[] = ['missed'];
    hostComponent.statuses.set(statuses);
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector('.cell');
    expect(cell.style.background).toBe('var(--strip-missed)');
  });

  it('a pending cell uses var(--strip-missed) too', () => {
    const statuses: DayStatus[] = ['pending'];
    hostComponent.statuses.set(statuses);
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector('.cell');
    expect(cell.style.background).toBe('var(--strip-missed)');
  });

  it('a not-due cell uses var(--strip-not-due)', () => {
    const statuses: DayStatus[] = ['not-due'];
    hostComponent.statuses.set(statuses);
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector('.cell');
    expect(cell.style.background).toBe('var(--strip-not-due)');
  });
});
