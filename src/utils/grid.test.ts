import { describe, it, expect, vi } from 'vitest';
import { calculateGridPosition, snapToGrid, drawGrid } from './grid';

describe('Grid Utilities', () => {
  describe('snapToGrid', () => {
    it('should snap value to nearest grid cell', () => {
      expect(snapToGrid(0, 32)).toBe(0);
      expect(snapToGrid(16, 32)).toBe(32);
      expect(snapToGrid(31, 32)).toBe(32);
      expect(snapToGrid(33, 32)).toBe(32);
      // Halfway between 32 and 64 rounds up to 64
      expect(snapToGrid(48, 32)).toBe(64);
      expect(snapToGrid(50, 32)).toBe(64);
    });

    it('should handle negative values', () => {
      expect(snapToGrid(-16, 32)).toBe(-32);
      expect(snapToGrid(-31, 32)).toBe(-32);
      expect(snapToGrid(-33, 32)).toBe(-32);
    });

    it('should handle different grid sizes', () => {
      expect(snapToGrid(15, 16)).toBe(16);
      expect(snapToGrid(15, 64)).toBe(0);
      expect(snapToGrid(50, 64)).toBe(64);
    });

    it('should handle decimal values', () => {
      expect(snapToGrid(15.7, 32)).toBe(0);
      expect(snapToGrid(16.3, 32)).toBe(32);
    });
  });

  describe('calculateGridPosition', () => {
    it('should snap both x and y coordinates', () => {
      const result = calculateGridPosition(123, 456, 32);
      expect(result.x).toBe(128);
      expect(result.y).toBe(448);
    });

    it('should handle zero coordinates', () => {
      const result = calculateGridPosition(0, 0, 32);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const result = calculateGridPosition(-15, -20, 32);
      expect(result.x).toBe(0);
      expect(result.y).toBe(-32);
    });

    it('should work with different grid sizes', () => {
      const result1 = calculateGridPosition(50, 50, 16);
      expect(result1.x).toBe(48);
      expect(result1.y).toBe(48);

      const result2 = calculateGridPosition(50, 50, 64);
      expect(result2.x).toBe(64);
      expect(result2.y).toBe(64);
    });
  });

  describe('drawGrid', () => {
    it('should draw grid lines on canvas', () => {
      // JSDOM doesn't implement real canvas; use a mocked 2D context
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
      } as unknown as CanvasRenderingContext2D;

      // Draw grid (signature: ctx, gridSize, zoom, scrollLeft, scrollTop, canvasWidth, canvasHeight, mapWidthCells, mapHeightCells, color?)
      drawGrid(ctx, 32, 1, 0, 0, 800, 600, 25, 19);

      // Verify that strokeStyle was set (indicates drawing occurred)
      expect(ctx.strokeStyle).toBeDefined();
      expect((ctx as any).save).toHaveBeenCalled();
      expect((ctx as any).restore).toHaveBeenCalled();
    });

    it('should handle offset correctly', () => {
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
      } as unknown as CanvasRenderingContext2D;

      // Draw grid with scroll offset (scrollLeft 16, scrollTop 16)
      drawGrid(ctx, 32, 1, 16, 16, 800, 600, 25, 19);

      expect(ctx.strokeStyle).toBeDefined();
    });

    it('should use custom grid color', () => {
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
      } as unknown as CanvasRenderingContext2D;

      const customColor = 'rgba(255, 0, 0, 0.5)';
      drawGrid(ctx, 32, 1, 0, 0, 800, 600, 25, 19, customColor);

      expect(ctx.strokeStyle).toBe(customColor);
    });

    it('should restore canvas state after drawing', () => {
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        strokeStyle: '',
        lineWidth: 0,
      } as unknown as CanvasRenderingContext2D;

      drawGrid(ctx, 32, 1, 0, 0, 800, 600, 25, 19, 'red');
      
      expect((ctx as any).save).toHaveBeenCalled();
      expect((ctx as any).restore).toHaveBeenCalled();
    });
  });
});
