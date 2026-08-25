import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarChartComponent } from './bar-chart.component';
import { Component, signal } from '@angular/core';

// Test host component to provide inputs
@Component({
  selector: 'app-test-host',
  standalone: true,
  imports: [BarChartComponent],
  template: `
    <app-bar-chart [bars]="bars()"></app-bar-chart>
  `,
})
class TestHostComponent {
  bars = signal<Array<{ label: string; value: number }>>([]);
}

describe('BarChartComponent', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let component: BarChartComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    component = fixture.debugElement.children[0].componentInstance;
    fixture.detectChanges();
  });

  describe('max: computed maximum value', () => {
    it('returns 0 for empty bars', () => {
      hostComponent.bars.set([]);
      fixture.detectChanges();

      expect(component.max()).toBe(0);
    });

    it('returns the largest value from bars', () => {
      hostComponent.bars.set([
        { label: '1', value: 3 },
        { label: '2', value: 7 },
        { label: '3', value: 5 },
      ]);
      fixture.detectChanges();

      expect(component.max()).toBe(7);
    });
  });

  describe('heightPercent: bar height formula', () => {
    it('applies the 6% floor to zero values', () => {
      hostComponent.bars.set([{ label: 'zero', value: 0 }]);
      fixture.detectChanges();

      const height = component.heightPercent(0);
      expect(height).toBe('6%');
    });

    it('a zero bar among non-zero bars renders at 6%, not 0%', () => {
      hostComponent.bars.set([
        { label: 'a', value: 5 },
        { label: 'b', value: 0 },
        { label: 'c', value: 10 },
      ]);
      fixture.detectChanges();

      const height = component.heightPercent(0);
      expect(height).toBe('6%');
    });

    it('the max value renders at 100%', () => {
      hostComponent.bars.set([{ label: 'max', value: 10 }]);
      fixture.detectChanges();

      const height = component.heightPercent(10);
      expect(height).toBe('100%');
    });

    it('half the max value renders at 50%', () => {
      hostComponent.bars.set([
        { label: 'half', value: 5 },
        { label: 'max', value: 10 },
      ]);
      fixture.detectChanges();

      const height = component.heightPercent(5);
      expect(height).toBe('50%');
    });

    it('uses Math.round for intermediate values', () => {
      hostComponent.bars.set([
        { label: 'test', value: 3 },
        { label: 'max', value: 10 },
      ]);
      fixture.detectChanges();

      // 3/10 * 100 = 30%
      const height = component.heightPercent(3);
      expect(height).toBe('30%');
    });
  });

  describe('isHighlighted: highlight predicate', () => {
    it('the tallest bar is highlighted', () => {
      hostComponent.bars.set([
        { label: 'a', value: 3 },
        { label: 'b', value: 7 },
        { label: 'c', value: 5 },
      ]);
      fixture.detectChanges();

      expect(component.isHighlighted(3)).toBe(false);
      expect(component.isHighlighted(7)).toBe(true);
      expect(component.isHighlighted(5)).toBe(false);
    });

    it('other bars are not highlighted', () => {
      hostComponent.bars.set([
        { label: 'max', value: 10 },
        { label: 'other', value: 5 },
      ]);
      fixture.detectChanges();

      expect(component.isHighlighted(5)).toBe(false);
    });

    it('two bars tied at the max are both highlighted', () => {
      hostComponent.bars.set([
        { label: 'a', value: 7 },
        { label: 'b', value: 5 },
        { label: 'c', value: 7 },
      ]);
      fixture.detectChanges();

      expect(component.isHighlighted(7)).toBe(true);
      expect(component.isHighlighted(5)).toBe(false);
    });

    it('all-zero values highlight nothing', () => {
      hostComponent.bars.set([
        { label: 'a', value: 0 },
        { label: 'b', value: 0 },
        { label: 'c', value: 0 },
      ]);
      fixture.detectChanges();

      expect(component.isHighlighted(0)).toBe(false);
    });

    it('the max > 0 condition prevents highlighting when all are zero', () => {
      hostComponent.bars.set([
        { label: 'a', value: 0 },
        { label: 'b', value: 0 },
      ]);
      fixture.detectChanges();

      // All values are 0, so max is 0, and no bar should highlight
      expect(component.isHighlighted(0)).toBe(false);
    });
  });

  describe('barClass: plain CSS class names', () => {
    it('returns bar-max for the highlighted bar', () => {
      hostComponent.bars.set([
        { label: 'a', value: 3 },
        { label: 'b', value: 10 },
      ]);
      fixture.detectChanges();

      expect(component.barClass(10)).toBe('bar-max');
    });

    it('returns bar-rest for non-highlighted bars', () => {
      hostComponent.bars.set([
        { label: 'a', value: 3 },
        { label: 'b', value: 10 },
      ]);
      fixture.detectChanges();

      expect(component.barClass(3)).toBe('bar-rest');
    });

    it('returns bar-rest for all bars when all are zero', () => {
      hostComponent.bars.set([
        { label: 'a', value: 0 },
        { label: 'b', value: 0 },
      ]);
      fixture.detectChanges();

      expect(component.barClass(0)).toBe('bar-rest');
    });
  });

  describe('rendering', () => {
    it('renders one bar per entry', () => {
      hostComponent.bars.set([
        { label: '1', value: 5 },
        { label: '2', value: 3 },
        { label: '3', value: 7 },
      ]);
      fixture.detectChanges();

      const bars = fixture.nativeElement.querySelectorAll('.bar');
      expect(bars.length).toBe(3);
    });

    it('each bar carries the barClass', () => {
      hostComponent.bars.set([
        { label: 'a', value: 3 },
        { label: 'b', value: 10 },
        { label: 'c', value: 5 },
      ]);
      fixture.detectChanges();

      const bars = fixture.nativeElement.querySelectorAll('.bar');
      expect(bars[0].classList.contains('bar-rest')).toBe(true);
      expect(bars[1].classList.contains('bar-max')).toBe(true);
      expect(bars[2].classList.contains('bar-rest')).toBe(true);
    });

    it('each label carries the barClass for color', () => {
      hostComponent.bars.set([
        { label: 'a', value: 3 },
        { label: 'b', value: 10 },
      ]);
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('.label');
      expect(labels[0].classList.contains('bar-rest')).toBe(true);
      expect(labels[1].classList.contains('bar-max')).toBe(true);
    });

    it('renders bar labels', () => {
      hostComponent.bars.set([
        { label: 'Mon', value: 5 },
        { label: 'Tue', value: 3 },
      ]);
      fixture.detectChanges();

      const labels = fixture.nativeElement.querySelectorAll('.label');
      expect(labels[0].textContent.trim()).toBe('Mon');
      expect(labels[1].textContent.trim()).toBe('Tue');
    });

    it('sets bar height using heightPercent', () => {
      hostComponent.bars.set([
        { label: 'half', value: 5 },
        { label: 'max', value: 10 },
      ]);
      fixture.detectChanges();

      const bars = fixture.nativeElement.querySelectorAll('.bar');
      expect(bars[0].style.height).toBe('50%');
      expect(bars[1].style.height).toBe('100%');
    });

    it('all-zero bars still render at 6% floor', () => {
      hostComponent.bars.set([
        { label: 'a', value: 0 },
        { label: 'b', value: 0 },
      ]);
      fixture.detectChanges();

      const bars = fixture.nativeElement.querySelectorAll('.bar');
      expect(bars[0].style.height).toBe('6%');
      expect(bars[1].style.height).toBe('6%');
    });
  });
});
