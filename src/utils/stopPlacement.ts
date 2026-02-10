/**
 * Returns t in [0, 1] for placing a new stop: 50% when no stops exist,
 * otherwise the midpoint of the largest gap between consecutive stops (or 0–first or last–1).
 */
export function getNextStopT(stops: { t: number }[]): number {
  if (stops.length === 0) return 0.5;
  const sorted = [...stops].map((s) => s.t).sort((a, b) => a - b);
  let bestMid = 0.5;
  let bestSpan = 0;
  const span0 = sorted[0]! - 0;
  if (span0 > bestSpan) {
    bestSpan = span0;
    bestMid = sorted[0]! / 2;
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const low = sorted[i]!;
    const high = sorted[i + 1]!;
    const span = high - low;
    if (span > bestSpan) {
      bestSpan = span;
      bestMid = (low + high) / 2;
    }
  }
  const last = sorted[sorted.length - 1]!;
  const span1 = 1 - last;
  if (span1 > bestSpan) {
    bestSpan = span1;
    bestMid = (last + 1) / 2;
  }
  return bestMid;
}
