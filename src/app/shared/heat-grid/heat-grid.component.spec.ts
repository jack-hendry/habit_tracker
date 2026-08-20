import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeatGridComponent } from './heat-grid.component';
import { Component, signal } from '@angular/core';

// Test host component to provide inputs
@Component({
  selector: 'app-test-host',
  standalone: true,
  imports: [HeatGridComponent],
  template: `
    <app-heat-grid
      [rates]="rates()"
      [startIso]="startIso()"
    ></app-heat-grid>
  `,
})
class TestHostComponent {
  rates = signal<Array<number | null>>([]);
  startIso = signal('2024-01-01');
}

describe('HeatGridComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let component: HeatGridComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    component = fixture.debugElement.children[0].componentInstance;
    fixture.detectChanges();
  });

  describe('stepFor: maps rates to CSS var names', () => {
    it('null maps to --heat-0', () => {
      expect(component.stepFor(null)).toBe('--heat-0');
    });

    it('0 maps to --heat-0', () => {
      expect(component.stepFor(0)).toBe('--heat-0');
    });

    it('0.2 (< 0.35) maps to --heat-1', () => {
      expect(component.stepFor(0.2)).toBe('--heat-1');
    });

    it('0.5 (< 0.7) maps to --heat-2', () => {
      expect(component.stepFor(0.5)).toBe('--heat-2');
    });

    it('0.9 (< 1) maps to --heat-3', () => {
      expect(component.stepFor(0.9)).toBe('--heat-3');
    });

    it('1 maps to --heat-4', () => {
      expect(component.stepFor(1)).toBe('--heat-4');
    });

    it('null and 0 both map to --heat-0 (same fill)', () => {
      expect(component.stepFor(null)).toBe(component.stepFor(0));
    });
  });

  describe('stepClass: returns plain class names', () => {
    it('null returns heat-0 class', () => {
      expect(component.stepClass(null)).toBe('heat-0');
    });

    it('0 returns heat-0 class', () => {
      expect(component.stepClass(0)).toBe('heat-0');
    });

    it('0.2 (< 0.35) returns heat-1 class', () => {
      expect(component.stepClass(0.2)).toBe('heat-1');
    });

    it('0.5 (< 0.7) returns heat-2 class', () => {
      expect(component.stepClass(0.5)).toBe('heat-2');
    });

    it('0.9 (< 1) returns heat-3 class', () => {
      expect(component.stepClass(0.9)).toBe('heat-3');
    });

    it('1 returns heat-4 class', () => {
      expect(component.stepClass(1)).toBe('heat-4');
    });
  });

  describe('stepFor and stepClass lockstep: single source of truth', () => {
    it('stepFor and stepClass stay in sync for all five steps', () => {
      const testRates = [null, 0, 0.2, 0.5, 0.9, 1];
      const expectedPairs = [
        ['--heat-0', 'heat-0'],
        ['--heat-0', 'heat-0'],
        ['--heat-1', 'heat-1'],
        ['--heat-2', 'heat-2'],
        ['--heat-3', 'heat-3'],
        ['--heat-4', 'heat-4'],
      ];

      testRates.forEach((rate, idx) => {
        const [expectedVar, expectedClass] = expectedPairs[idx];
        expect(component.stepFor(rate)).toBe(
          expectedVar,
          `stepFor failed for rate ${rate}`
        );
        expect(component.stepClass(rate)).toBe(
          expectedClass,
          `stepClass failed for rate ${rate}`
        );
        // The critical assertion: the two must agree
        expect(component.stepFor(rate)).toBe(
          '--' + component.stepClass(rate),
          `stepFor and stepClass disagree for rate ${rate} (L-001)`
        );
      });
    });
  });

  describe('columnCount: derive grid column count from rates', () => {
    it('empty rates yields 0 columns', () => {
      hostComponent.rates.set([]);
      fixture.detectChanges();

      expect(component.columnCount()).toBe(0);
    });

    it('7 rates (one week) yields 1 column', () => {
      hostComponent.rates.set(Array(7).fill(0.5));
      fixture.detectChanges();

      expect(component.columnCount()).toBe(1);
    });

    it('8 rates (one week + 1 day) yields 2 columns', () => {
      hostComponent.rates.set(Array(8).fill(0.5));
      fixture.detectChanges();

      expect(component.columnCount()).toBe(2);
    });

    it('117 rates yields 17 columns', () => {
      hostComponent.rates.set(Array(117).fill(0.5));
      fixture.detectChanges();

      expect(component.columnCount()).toBe(17);
    });

    it('126 rates (18 complete weeks) yields 18 columns', () => {
      hostComponent.rates.set(Array(126).fill(0.5));
      fixture.detectChanges();

      expect(component.columnCount()).toBe(18);
    });
  });

  describe('monthLabels: derive labels from window', () => {
    it('empty rates yields empty labels', () => {
      hostComponent.rates.set([]);
      fixture.detectChanges();

      expect(component.monthLabels().length).toBe(0);
    });

    it('a 14-day window in January yields one label', () => {
      // 14 days starting 2024-01-01 (all in January)
      hostComponent.rates.set(Array(14).fill(0.5));
      hostComponent.startIso.set('2024-01-01');
      fixture.detectChanges();

      const labels = component.monthLabels();
      expect(labels.length).toBe(1);
      expect(labels[0].label).toBe('Jan');
    });

    it('window crossing January→February emits labels for both months', () => {
      // 21 days: 2024-01-28 to 2024-02-17 (spans Jan and Feb)
      // Column 1: Jan 28–Feb 3 (spans boundary)
      // Column 2: Feb 4–10 (Feb)
      // Column 3: Feb 11–17 (Feb)
      hostComponent.rates.set(Array(21).fill(0.5));
      hostComponent.startIso.set('2024-01-28');
      fixture.detectChanges();

      const labels = component.monthLabels();
      // Should emit labels for both months
      const labelTexts = labels.map((l) => l.label);
      expect(labelTexts).toContain('Jan');
      expect(labelTexts).toContain('Feb');
    });

    it('does not emit a label for columns inside the same month', () => {
      // 21 days: 2024-02-04 to 2024-02-24 (all in February)
      hostComponent.rates.set(Array(21).fill(0.5));
      hostComponent.startIso.set('2024-02-04');
      fixture.detectChanges();

      const labels = component.monthLabels();
      // All 3 weeks are in February, so only 1 label
      expect(labels.length).toBe(1);
      expect(labels[0].label).toBe('Feb');
    });

    it('renders month labels with correct 3-letter name', () => {
      // March window
      hostComponent.rates.set(Array(7).fill(0.5));
      hostComponent.startIso.set('2024-03-03');
      fixture.detectChanges();

      const labels = component.monthLabels();
      expect(labels[0].label).toBe('Mar');
    });
  });

  describe('rendering', () => {
    it('renders one .cell per rate', () => {
      const rates = [0, 0.5, 1, null, 0.2];
      hostComponent.rates.set(rates);
      fixture.detectChanges();

      const cells = fixture.nativeElement.querySelectorAll('.cell');
      expect(cells.length).toBe(5);
    });

    it('each cell carries the stepClass for its rate', () => {
      const rates = [null, 0.2, 0.5, 0.9, 1];
      hostComponent.rates.set(rates);
      fixture.detectChanges();

      const cells = fixture.nativeElement.querySelectorAll('.cell');
      expect(cells[0].classList.contains('heat-0')).toBe(true);
      expect(cells[1].classList.contains('heat-1')).toBe(true);
      expect(cells[2].classList.contains('heat-2')).toBe(true);
      expect(cells[3].classList.contains('heat-3')).toBe(true);
      expect(cells[4].classList.contains('heat-4')).toBe(true);
    });

    it('each cell has a background set from the CSS var', () => {
      hostComponent.rates.set([0.5]);
      fixture.detectChanges();

      const cell = fixture.nativeElement.querySelector('.cell');
      expect(cell.style.background).toBe('var(--heat-2)');
    });

    it('has 7 rows of geometry in the grid', () => {
      hostComponent.rates.set(Array(14).fill(0.5));
      fixture.detectChanges();

      const gridEl = fixture.nativeElement.querySelector('.grid');
      const gridTemplateRows = getComputedStyle(gridEl).gridTemplateRows;
      const rowCount = gridTemplateRows.split(' ').length;
      expect(rowCount).toBe(7);
    });

    it('labels row has grid-template-columns matching columnCount', () => {
      // 17 rates = 3 columns (ceil(17 / 7) = 3)
      hostComponent.rates.set(Array(17).fill(0.5));
      fixture.detectChanges();

      const labelsEl = fixture.nativeElement.querySelector('.labels');
      const gridTemplateColumns = getComputedStyle(labelsEl)
        .gridTemplateColumns;
      // Should be 3 tracks of 13px each: "13px 13px 13px"
      const columnCount = gridTemplateColumns.split(' ').length;
      expect(columnCount).toBe(3);
    });

    it('labels row grid-template-columns matches columnCount for 18-week window', () => {
      // 126 rates = 18 columns (ceil(126 / 7) = 18)
      hostComponent.rates.set(Array(126).fill(0.5));
      fixture.detectChanges();

      const labelsEl = fixture.nativeElement.querySelector('.labels');
      const gridTemplateColumns = getComputedStyle(labelsEl)
        .gridTemplateColumns;
      const columnCount = gridTemplateColumns.split(' ').length;
      expect(columnCount).toBe(18);
    });
  });
});
