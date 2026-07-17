import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./habit/habit-list.component').then((m) => m.HabitListComponent),
  },
];
