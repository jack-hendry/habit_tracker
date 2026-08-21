import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HABIT_COLORS, HABIT_ICONS } from '../../habit/habit.model';
import { Stack, StackPatch } from '../stack.model';

@Component({
  selector: 'app-stack-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './stack-form.component.html',
  styleUrl: './stack-form.component.scss',
})
export class StackFormComponent {
  readonly stack = input<Stack | null>(null);
  readonly save = output<StackPatch>();
  readonly cancel = output<void>();

  // Draft signals
  readonly draftName = signal('');
  readonly draftTime = signal('');
  readonly draftAnchor = signal('');
  readonly draftAglyph = signal('');
  readonly draftColor = signal('');

  // Palette/icon set
  readonly colors = HABIT_COLORS;
  readonly icons = HABIT_ICONS;

  constructor() {
    // Prefill drafts when stack input changes
    effect(() => {
      const s = this.stack();
      if (s) {
        this.draftName.set(s.name);
        this.draftTime.set(s.time);
        this.draftAnchor.set(s.anchor);
        this.draftAglyph.set(s.aglyph);
        this.draftColor.set(s.color);
      } else {
        // Null means create — clear all drafts
        this.draftName.set('');
        this.draftTime.set('');
        this.draftAnchor.set('');
        this.draftAglyph.set('');
        this.draftColor.set('');
      }
    });
  }

  canSave(): boolean {
    return !!this.draftName().trim();
  }

  onSave(): void {
    if (!this.canSave()) {
      return;
    }

    const patch: StackPatch = {
      name: this.draftName(),
      time: this.draftTime(),
      anchor: this.draftAnchor(),
      aglyph: this.draftAglyph(),
      color: this.draftColor(),
    };

    this.save.emit(patch);
  }
}
