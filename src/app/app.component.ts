import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { formatBarDate } from './format-bar-date';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'habit_tracker';
  /** Computed once at app load, not on a live midnight timer (Analyst §3). */
  readonly barDate = formatBarDate();
}
