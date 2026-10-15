import { Component, computed, input, linkedSignal, output, signal } from '@angular/core';
import { HabitService } from '../../habit/habit.service';

export interface DateRange { from: string; to: string } // [from, to)

interface PickerCell {
  iso: string | null;
  day: number;
  past: boolean;
  start: boolean;
  end: boolean;
  between: boolean;
  today: boolean;
}

@Component({
  selector: 'app-range-picker',
  standalone: true,
  templateUrl: './range-picker.component.html',
  styleUrl: './range-picker.component.scss',
})
export class RangePickerComponent {
  readonly from = input.required<string>();
  /** Exclusive. */
  readonly to = input.required<string>();
  /** First selectable day; also where the Today ring goes. */
  readonly todayIso = input.required<string>();
  /** Underway vacation: the start cannot move, clicks only set the end (I6). */
  readonly lockStart = input(false);
  readonly rangeChange = output<DateRange>();

  readonly weekdayInitials = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  private readonly phase = signal<'start' | 'end'>('start');

  /** Month on screen; follows `from` when it changes, pageable in between. */
  readonly view = linkedSignal(() => {
    const [y, m] = this.from().split('-').map(Number);
    return { year: y, month: m - 1 };
  });

  private readonly minMonth = computed(() => {
    const [y, m] = this.todayIso().split('-').map(Number);
    return y * 12 + (m - 1);
  });
  private readonly viewIndex = computed(() => this.view().year * 12 + this.view().month);
  readonly canPrev = computed(() => this.viewIndex() > this.minMonth());
  /** Prototype pages up to 11 months ahead. */
  readonly canNext = computed(() => this.viewIndex() < this.minMonth() + 11);

  readonly label = computed(() =>
    new Date(this.view().year, this.view().month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  );

  readonly hint = computed(() =>
    this.lockStart()
      ? 'Click the new last day of your vacation'
      : this.phase() === 'end'
        ? 'Now click the last day of your vacation'
        : 'Click a start date, then an end date',
  );

  readonly cells = computed<PickerCell[]>(() => {
    const from = this.from();
    const last = HabitService.shiftIso(this.to(), -1);
    const today = this.todayIso();
    return HabitService.monthLayout(this.view().year, this.view().month).map((iso) => ({
      iso,
      day: iso === null ? 0 : Number(iso.slice(-2)),
      past: iso !== null && iso < today,
      start: iso === from,
      end: iso === last,
      between: iso !== null && iso > from && iso < last,
      today: iso === today,
    }));
  });

  prev(): void {
    if (this.canPrev()) this.shift(-1);
  }

  next(): void {
    if (this.canNext()) this.shift(1);
  }

  pick(cell: PickerCell): void {
    if (cell.iso === null || cell.past) return;
    const iso = cell.iso;
    const after = HabitService.shiftIso(iso, 1);
    if (this.lockStart()) {
      if (iso >= this.from()) this.rangeChange.emit({ from: this.from(), to: after });
      return;
    }
    if (this.phase() === 'end' && iso >= this.from()) {
      this.rangeChange.emit({ from: this.from(), to: after });
      this.phase.set('start');
    } else {
      this.rangeChange.emit({ from: iso, to: after });
      this.phase.set('end');
    }
  }

  private shift(delta: number): void {
    const { year, month } = this.view();
    const d = new Date(year, month + delta, 1);
    this.view.set({ year: d.getFullYear(), month: d.getMonth() });
  }
}
