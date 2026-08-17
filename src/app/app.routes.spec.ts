import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

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
});
