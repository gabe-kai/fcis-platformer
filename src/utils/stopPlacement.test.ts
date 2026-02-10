import { describe, it, expect } from 'vitest';
import { getNextStopT } from './stopPlacement';

describe('getNextStopT', () => {
  it('returns 0.5 when no stops', () => {
    expect(getNextStopT([])).toBe(0.5);
  });

  it('returns midpoint of [0, first] when one stop at 0.8', () => {
    expect(getNextStopT([{ t: 0.8 }])).toBe(0.4);
  });

  it('returns midpoint of [last, 1] when one stop at 0.2', () => {
    expect(getNextStopT([{ t: 0.2 }])).toBe(0.6);
  });

  it('returns midpoint of largest gap between two stops', () => {
    expect(getNextStopT([{ t: 0.2 }, { t: 0.8 }])).toBe(0.5);
    expect(getNextStopT([{ t: 0.1 }, { t: 0.9 }])).toBe(0.5);
  });

  it('places in gap from 0 to first when that is largest', () => {
    const stops = [{ t: 0.6 }, { t: 0.65 }, { t: 0.7 }];
    expect(getNextStopT(stops)).toBe(0.3);
  });

  it('places in gap from last to 1 when that is largest', () => {
    const stops = [{ t: 0.1 }, { t: 0.15 }, { t: 0.2 }];
    expect(getNextStopT(stops)).toBe(0.6);
  });

  it('places in middle gap when that is largest', () => {
    const stops = [{ t: 0.1 }, { t: 0.9 }];
    expect(getNextStopT(stops)).toBe(0.5);
  });

  it('handles unsorted stops', () => {
    expect(getNextStopT([{ t: 0.8 }, { t: 0.2 }])).toBe(0.5);
  });
});
