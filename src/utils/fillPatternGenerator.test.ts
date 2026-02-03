import { describe, it, expect } from 'vitest';
import {
  generateFillPattern,
  SYSTEM_FILL_PATTERNS,
  getFillPatternsByCategory,
  getFillCategoryDisplayName,
} from './fillPatternGenerator';

describe('fillPatternGenerator', () => {
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

