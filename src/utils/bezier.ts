import type { Point } from '@/types';

/**
 * Linear interpolation between two points (line segment).
 */
export function evaluateLinear(p0: Point, p1: Point, t: number): Point {
  return {
    x: p0.x + (p1.x - p0.x) * t,
    y: p0.y + (p1.y - p0.y) * t,
  };
}

/**
 * Quadratic Bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2.
 */
export function evaluateQuadratic(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/**
 * Cubic Bezier: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3.
 */
export function evaluateCubic(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

const DEFAULT_SAMPLES = 64;

/**
 * Evaluate a curve defined by control points at parameter t in [0, 1].
 * 2 points = line, 3 = quadratic, 4 = cubic. More than 4 = poly-Bezier (cubic segments).
 */
export function evaluateCurve(controlPoints: Point[], t: number): Point {
  if (controlPoints.length < 2) return controlPoints[0] ?? { x: 0, y: 0 };
  if (controlPoints.length === 2) return evaluateLinear(controlPoints[0], controlPoints[1], t);
  if (controlPoints.length === 3) return evaluateQuadratic(controlPoints[0], controlPoints[1], controlPoints[2], t);
  if (controlPoints.length === 4) return evaluateCubic(controlPoints[0], controlPoints[1], controlPoints[2], controlPoints[3], t);
  const n = controlPoints.length - 1;
  const numSegments = Math.floor(n / 3) + (n % 3 === 0 ? 0 : 1);
  const segT = t * numSegments;
  const seg = Math.min(Math.floor(segT), numSegments - 1);
  const localT = segT - seg;
  const i = Math.min(seg * 3, controlPoints.length - 4);
  const p0 = controlPoints[i] ?? controlPoints[0];
  const p1 = controlPoints[i + 1] ?? p0;
  const p2 = controlPoints[i + 2] ?? p0;
  const p3 = controlPoints[i + 3] ?? p0;
  return evaluateCubic(p0, p1, p2, p3, localT);
}

/**
 * Minimum distance from point to curve (sampled). Returns distance and optional closest t.
 */
export function distanceToCurve(
  point: Point,
  controlPoints: Point[],
  numSamples: number = DEFAULT_SAMPLES
): number {
  const result = getClosestT(point, controlPoints, numSamples);
  return result?.distance ?? Infinity;
}

/**
 * Find parameter t in [0, 1] where the curve is closest to the given point.
 * Returns { t, distance } or null if curve has fewer than 2 points.
 */
export function getClosestT(
  point: Point,
  controlPoints: Point[],
  numSamples: number = DEFAULT_SAMPLES
): { t: number; distance: number } | null {
  if (controlPoints.length < 2) {
    const p = controlPoints[0];
    if (!p) return null;
    return {
      t: 0,
      distance: Math.hypot(point.x - p.x, point.y - p.y),
    };
  }
  let minDist = Infinity;
  let bestT = 0;
  for (let i = 0; i <= numSamples; i++) {
    const t = i / numSamples;
    const pt = evaluateCurve(controlPoints, t);
    const d = Math.hypot(point.x - pt.x, point.y - pt.y);
    if (d < minDist) {
      minDist = d;
      bestT = t;
    }
  }
  return { t: bestT, distance: minDist };
}

/**
 * Squared distance (avoids sqrt for comparisons).
 */
export function distanceToCurveSq(
  point: Point,
  controlPoints: Point[],
  numSamples: number = DEFAULT_SAMPLES
): number {
  const d = distanceToCurve(point, controlPoints, numSamples);
  return d * d;
}

/**
 * Split quadratic Bezier at t. Returns [left 3 points, right 3 points]; shared point is at index 2 of left and 0 of right.
 */
function splitQuadraticAtT(p0: Point, p1: Point, p2: Point, t: number): { left: Point[]; right: Point[] } {
  const m1 = evaluateLinear(p0, p1, t);
  const m2 = evaluateLinear(p1, p2, t);
  const pt = evaluateLinear(m1, m2, t);
  return {
    left: [p0, m1, pt],
    right: [pt, m2, p2],
  };
}

/**
 * Split cubic Bezier at t (de Casteljau). Returns left 4 and right 4; shared point is at index 3 of left and 0 of right.
 */
function splitCubicAtT(p0: Point, p1: Point, p2: Point, p3: Point, t: number): { left: Point[]; right: Point[] } {
  const m1 = evaluateLinear(p0, p1, t);
  const m2 = evaluateLinear(p1, p2, t);
  const m3 = evaluateLinear(p2, p3, t);
  const n1 = evaluateLinear(m1, m2, t);
  const n2 = evaluateLinear(m2, m3, t);
  const pt = evaluateLinear(n1, n2, t);
  return {
    left: [p0, m1, n1, pt],
    right: [pt, n2, m3, p3],
  };
}

/**
 * Split curve at parameter t and return new control points with the point-on-curve inserted.
 * 2 pts → [P0, P(t), P1]; 3 pts → 5 pts; 4 pts → 7 pts. Poly-Bezier: finds segment and splits that segment.
 */
export function splitCurveAtT(controlPoints: Point[], t: number): Point[] {
  if (controlPoints.length < 2) return [...controlPoints];
  if (controlPoints.length === 2) {
    const pt = evaluateLinear(controlPoints[0], controlPoints[1], t);
    return [controlPoints[0], pt, controlPoints[1]];
  }
  if (controlPoints.length === 3) {
    const { left, right } = splitQuadraticAtT(controlPoints[0], controlPoints[1], controlPoints[2], t);
    return [...left, ...right.slice(1)];
  }
  if (controlPoints.length === 4) {
    const { left, right } = splitCubicAtT(
      controlPoints[0],
      controlPoints[1],
      controlPoints[2],
      controlPoints[3],
      t
    );
    return [...left, ...right.slice(1)];
  }
  const n = controlPoints.length - 1;
  const numSegments = Math.floor(n / 3) + (n % 3 === 0 ? 0 : 1);
  const segT = t * numSegments;
  const seg = Math.min(Math.floor(segT), numSegments - 1);
  const localT = segT - seg;
  const i = Math.min(seg * 3, controlPoints.length - 4);
  const p0 = controlPoints[i] ?? controlPoints[0];
  const p1 = controlPoints[i + 1] ?? p0;
  const p2 = controlPoints[i + 2] ?? p0;
  const p3 = controlPoints[i + 3] ?? p0;
  const { left, right } = splitCubicAtT(p0, p1, p2, p3, localT);
  const before = controlPoints.slice(0, i);
  const after = controlPoints.slice(i + 4);
  return [...before, ...left, ...right.slice(1), ...after];
}
