import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityGridComponent } from './activity-grid.component';
import { Component, signal } from '@angular/core';
import { DayStatus } from '../../habit/habit.model';

// Test host component to provide inputs
@Component({
  selector: 'app-test-host',
  standalone: true,
  imports: [ActivityGridComponent],
  template: `
    <app-activity-grid
      [statuses]="statuses()"
      [hex]="hex()"
    ></app-activity-grid>
  `,
})
class TestHostComponent {
  statuses = signal<DayStatus[]>([]);
  hex = signal('#0066cc');
}

describe('ActivityGridComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let component: ActivityGridComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    component = fixture.debugElement.children[0].componentInstance;
    fixture.detectChanges();
  });

  it('renders 126 statuses in → 126 .cell elements out', () => {
    const statuses: DayStatus[] = Array(126).fill('done');
    hostComponent.statuses.set(statuses);
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll('.cell');
    expect(cells.length).toBe(126);
  });

  it('a done cell uses the hex input as rgb', () => {
    const statuses: DayStatus[] = ['done'];
    hostComponent.statuses.set(statuses);
    hostComponent.hex.set('#e8590c');
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector('.cell');
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

  it('a future cell uses var(--strip-not-due)', () => {
    const statuses: DayStatus[] = ['future'];
    hostComponent.statuses.set(statuses);
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector('.cell');
    expect(cell.style.background).toBe('var(--strip-not-due)');
  });

  it('has 7 rows of geometry', () => {
    const statuses: DayStatus[] = Array(126).fill('done');
    hostComponent.statuses.set(statuses);
    fixture.detectChanges();

    const cellsEl = fixture.nativeElement.querySelector('.cells');
    const gridTemplateRows = getComputedStyle(cellsEl).gridTemplateRows;
    const rowCount = gridTemplateRows.split(' ').length;
    expect(rowCount).toBe(7);
  });
});
