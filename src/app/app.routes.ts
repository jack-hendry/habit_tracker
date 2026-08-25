import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'habits',
    loadComponent: () =>
      import('./habit/habit-list.component').then((m) => m.HabitListComponent),
  },
  {
    // Before `**`, after `habits` — `path: 'habits'` is a full-path match and
    // cannot swallow `/habits/:id`, but the wildcard would. First per-entity
    // route in the app (Analyst §2.1).
    path: 'habits/:id',
    loadComponent: () =>
      import('./habit-detail/habit-detail.component').then((m) => m.HabitDetailComponent),
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./calendar/calendar.component').then((m) => m.CalendarComponent),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./analytics/analytics.component').then((m) => m.AnalyticsComponent),
  },
  {
    path: 'stacks',
    loadComponent: () =>
      import('./stacks/stacks.component').then((m) => m.StacksComponent),
  },
  // Last by necessity — Angular matches in order. A one-line redirect to
  // Dashboard, not a designed 404 page (CriticReview R7).
  { path: '**', redirectTo: '' },
];
