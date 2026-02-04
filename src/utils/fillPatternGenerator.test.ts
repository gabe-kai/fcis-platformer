import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateFillPattern,
  SYSTEM_FILL_PATTERNS,
  getFillPatternsByCategory,
  getFillCategoryDisplayName,
} from './fillPatternGenerator';

const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgo=';

function createMockContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    setLineDash: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    canvas: { width: 64, height: 64, toDataURL: () => fakeDataUrl },
  } as unknown as CanvasRenderingContext2D;
}

describe('fillPatternGenerator', () => {
  beforeEach(() => {
    const mockCtx = createMockContext();
    (HTMLCanvasElement.prototype as unknown as { getContext: ReturnType<typeof vi.fn> }).getContext = vi.fn(function (_contextId: string) {
      return mockCtx;
    });
    (HTMLCanvasElement.prototype as unknown as { toDataURL?: (type?: string) => string }).toDataURL = vi.fn(
      () => fakeDataUrl
    );
  });

  it('should generate a non-empty data URL for basic patterns', () => {
    const stripes = generateFillPattern('stripes-horizontal', 32, '#ffffff', '#000000');
    const bricks = generateFillPattern('bricks', 32, '#ffffff', '#000000');

    expect(stripes).toMatch(/^data:image\/png;base64,/);
    expect(bricks).toMatch(/^data:image\/png;base64,/);
  });

  it('should expose system fill patterns grouped by category', () => {
    const grouped = getFillPatternsByCategory();
    // We expect at least the core categories
    expect(grouped.stripes?.length).toBeGreaterThan(0);
    expect(grouped.textures?.length).toBeGreaterThan(0);
    expect(grouped.symbols?.length).toBeGreaterThan(0);

    // Every SYSTEM_FILL_PATTERN should appear in the grouped map
    for (const pattern of SYSTEM_FILL_PATTERNS) {
      const bucket = grouped[pattern.category];
      expect(bucket).toBeDefined();
      expect(bucket!.some((p) => p.id === pattern.id)).toBe(true);
    }
  });

  it('should return friendly category display names', () => {
    expect(getFillCategoryDisplayName('stripes')).toBe('Stripes');
    expect(getFillCategoryDisplayName('symbols')).toBe('Symbols');
    // Unknown category should fall back to raw name
    expect(getFillCategoryDisplayName('unknown-category')).toBe('unknown-category');
  });
});

