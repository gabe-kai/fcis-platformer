import { describe, it, expect } from 'vitest';
import {
  evaluateLinear,
  evaluateQuadratic,
  evaluateCubic,
  evaluateCurve,
  distanceToCurve,
} from './bezier';
import type { Point } from '@/types';

describe('bezier', () => {
  describe('evaluateLinear', () => {
    it('returns start at t=0 and end at t=1', () => {
      const p0: Point = { x: 0, y: 0 };
      const p1: Point = { x: 10, y: 20 };
      expect(evaluateLinear(p0, p1, 0)).toEqual(p0);
      expect(evaluateLinear(p0, p1, 1)).toEqual(p1);
    });

    it('returns midpoint at t=0.5', () => {
      const p0: Point = { x: 0, y: 0 };
      const p1: Point = { x: 4, y: 8 };
      expect(evaluateLinear(p0, p1, 0.5)).toEqual({ x: 2, y: 4 });
    });
  });

  describe('evaluateQuadratic', () => {
    it('returns start at t=0 and end at t=1', () => {
      const p0: Point = { x: 0, y: 0 };
      const p1: Point = { x: 5, y: 10 };
      const p2: Point = { x: 10, y: 0 };
      expect(evaluateQuadratic(p0, p1, p2, 0)).toEqual(p0);
      expect(evaluateQuadratic(p0, p1, p2, 1)).toEqual(p2);
    });
  });

  describe('evaluateCubic', () => {
    it('returns start at t=0 and end at t=1', () => {
      const p0: Point = { x: 0, y: 0 };
      const p1: Point = { x: 3, y: 6 };
      const p2: Point = { x: 7, y: 6 };
      const p3: Point = { x: 10, y: 0 };
      expect(evaluateCubic(p0, p1, p2, p3, 0)).toEqual(p0);
      expect(evaluateCubic(p0, p1, p2, p3, 1)).toEqual(p3);
    });
  });

  describe('evaluateCurve', () => {
    it('handles 2 points as line', () => {
      const pts: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
      expect(evaluateCurve(pts, 0)).toEqual({ x: 0, y: 0 });
      expect(evaluateCurve(pts, 1)).toEqual({ x: 10, y: 0 });
      expect(evaluateCurve(pts, 0.5)).toEqual({ x: 5, y: 0 });
    });

    it('handles 3 points as quadratic', () => {
      const pts: Point[] = [{ x: 0, y: 0 }, { x: 5, y: 10 }, { x: 10, y: 0 }];
      expect(evaluateCurve(pts, 0)).toEqual(pts[0]);
      expect(evaluateCurve(pts, 1)).toEqual(pts[2]);
    });

    it('handles 4 points as cubic', () => {
      const pts: Point[] = [
        { x: 0, y: 0 },
        { x: 3, y: 6 },
        { x: 7, y: 6 },
        { x: 10, y: 0 },
      ];
      expect(evaluateCurve(pts, 0)).toEqual(pts[0]);
      expect(evaluateCurve(pts, 1)).toEqual(pts[3]);
    });
  });

  describe('distanceToCurve', () => {
    it('returns 0 when point is on the curve (line)', () => {
      const pts: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
      const d = distanceToCurve({ x: 5, y: 0 }, pts);
      expect(d).toBeLessThan(0.01);
    });

    it('returns distance when point is off the curve', () => {
      const pts: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }];
      const d = distanceToCurve({ x: 5, y: 5 }, pts);
      expect(d).toBeCloseTo(5, 1);
    });
  });
});
