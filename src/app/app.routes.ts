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
