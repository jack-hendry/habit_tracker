import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { HabitService } from './habit/habit.service';

describe('app routes', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  it('resolves /analytics to the Analytics stub', async () => {
    const harness = await RouterTestingHarness.create('/analytics');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Analytics');
  });

  it('resolves /stacks to the Stacks stub', async () => {
    const harness = await RouterTestingHarness.create('/stacks');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe('Habit Stacks');
  });

  it('redirects an unknown URL to the dashboard', async () => {
    await RouterTestingHarness.create('/nonsense');
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('resolves /habits/<seeded-id> to the detail component with the habit', async () => {
    // Seed a habit through HabitService
    const habitService = TestBed.inject(HabitService);
    const habit = habitService.add('Read 20 pages', { type: 'daily' })!;

    // Navigate to the habit detail
    const harness = await RouterTestingHarness.create(`/habits/${habit.id}`);
    expect(harness.routeNativeElement?.querySelector('.back-link')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('.hero')).toBeTruthy();
  });

  it('redirects /habits/nonexistent-id to /habits', async () => {
    await RouterTestingHarness.create('/habits/nonexistent-id');
    expect(TestBed.inject(Router).url).toBe('/habits');
  });
});
