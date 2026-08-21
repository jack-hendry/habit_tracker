import { isStack } from './stack.model';

describe('isStack', () => {
  it('accepts a fully populated valid stack', () => {
    const stack = {
      id: 'stack-1',
      name: 'Morning routine',
      time: '7:00 AM',
      anchor: 'I pour my morning coffee',
      aglyph: 'coffee',
      color: 'amber',
      habitIds: ['habit-1', 'habit-2', 'habit-3'],
    };
    expect(isStack(stack)).toBe(true);
  });

  it('accepts a stack with an empty `habitIds` array', () => {
    const stack = {
      id: 'stack-2',
      name: 'New stack',
      time: 'anytime',
      anchor: 'I … (choose an anchor)',
      aglyph: 'clock',
      color: 'sky',
      habitIds: [],
    };
    expect(isStack(stack)).toBe(true);
  });

  it('accepts an unknown `color` id', () => {
    const stack = {
      id: 'stack-3',
      name: 'Test stack',
      time: 'evening',
      anchor: 'I finish dinner',
      aglyph: 'moon',
      color: 'chartreuse',
      habitIds: ['habit-4'],
    };
    expect(isStack(stack)).toBe(true);
  });

  it('rejects null and rejects a non-object', () => {
    expect(isStack(null)).toBe(false);
    expect(isStack('nope')).toBe(false);
  });

  it('rejects a stack missing `anchor`', () => {
    const stack = {
      id: 'stack-4',
      name: 'Incomplete stack',
      time: 'morning',
      aglyph: 'run',
      color: 'emerald',
      habitIds: [],
    };
    expect(isStack(stack)).toBe(false);
  });

  it('rejects a stack whose `color` is a number', () => {
    const stack = {
      id: 'stack-5',
      name: 'Bad stack',
      time: 'noon',
      anchor: 'I eat lunch',
      aglyph: 'food',
      color: 42,
      habitIds: [],
    };
    expect(isStack(stack)).toBe(false);
  });

  it('rejects a stack whose `habitIds` contains a non-string', () => {
    const stack = {
      id: 'stack-6',
      name: 'Invalid habits',
      time: 'night',
      anchor: 'I go to bed',
      aglyph: 'sleep',
      color: 'slate',
      habitIds: ['habit-7', 123, 'habit-8'],
    };
    expect(isStack(stack)).toBe(false);
  });
});
