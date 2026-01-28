import { describe, it, expect } from 'vitest';
import { clampZoom, getScrollContainerSize, getViewportOffset } from './viewportUtils';

describe('viewportUtils', () => {
  describe('clampZoom', () => {
    it('should clamp zoom to minimum when map is larger than viewport', () => {
      const mapWidthCells = 100;
      const mapHeightCells = 100;
      const gridSize = 64;
      const canvasWidth = 800;
      const canvasHeight = 600;

      // Min zoom should fit the longest dimension (100 cells * 64px = 6400px)
      // Canvas is 800px wide, so minZoom = 800 / 6400 = 0.125
      const minZoom = Math.max(
        canvasWidth / (mapWidthCells * gridSize),
        canvasHeight / (mapHeightCells * gridSize)
      );

      const result = clampZoom(0.01, mapWidthCells, mapHeightCells, gridSize, canvasWidth, canvasHeight);
      expect(result).toBeGreaterThanOrEqual(minZoom);
    });

    it('should clamp zoom to maximum (8x8 cells visible)', () => {
      const mapWidthCells = 100;
      const mapHeightCells = 100;
      const gridSize = 64;
      const canvasWidth = 800;
      const canvasHeight = 600;

      // Max zoom: at least 8x8 cells visible
      // Max zoom X: 800 / (64 * 8) = 1.5625
      // Max zoom Y: 600 / (64 * 8) = 1.171875
      // Max zoom = min(1.5625, 1.171875) = 1.171875
      const maxZoom = Math.min(
        canvasWidth / (gridSize * 8),
        canvasHeight / (gridSize * 8)
      );

      const result = clampZoom(10, mapWidthCells, mapHeightCells, gridSize, canvasWidth, canvasHeight);
      expect(result).toBeLessThanOrEqual(maxZoom);
    });

    it('should return original zoom when within valid range', () => {
      const mapWidthCells = 50;
      const mapHeightCells = 50;
      const gridSize = 64;
      const canvasWidth = 800;
      const canvasHeight = 600;

      const zoom = 1.0;
      const result = clampZoom(zoom, mapWidthCells, mapHeightCells, gridSize, canvasWidth, canvasHeight);
      expect(result).toBe(zoom);
    });

    it('should handle zero dimensions gracefully', () => {
      const result = clampZoom(1.0, 0, 0, 64, 800, 600);
      expect(result).toBe(1.0);
    });

    it('should handle very small maps', () => {
      const mapWidthCells = 1;
      const mapHeightCells = 1;
      const gridSize = 64;
      const canvasWidth = 800;
      const canvasHeight = 600;

      // Small map should allow high zoom
      const result = clampZoom(10, mapWidthCells, mapHeightCells, gridSize, canvasWidth, canvasHeight);
      expect(result).toBeGreaterThan(1);
    });

    it('should handle very large maps', () => {
      const mapWidthCells = 10000;
      const mapHeightCells = 10000;
      const gridSize = 64;
      const canvasWidth = 800;
      const canvasHeight = 600;

      // Requesting zoom below minimum returns minimum zoom for such a large map
      const result = clampZoom(0, mapWidthCells, mapHeightCells, gridSize, canvasWidth, canvasHeight);
      const minZoom = Math.max(canvasWidth / (mapWidthCells * gridSize), canvasHeight / (mapHeightCells * gridSize));
      expect(result).toBe(minZoom);
      expect(result).toBeLessThan(0.01);
    });
  });

  describe('getScrollContainerSize', () => {
    it('should calculate correct container size', () => {
      const mapWidthCells = 100;
      const mapHeightCells = 50;
      const gridSize = 64;
      const zoom = 1.0;

      const result = getScrollContainerSize(mapWidthCells, mapHeightCells, gridSize, zoom);
      expect(result.width).toBe(100 * 64 * 1.0);
      expect(result.height).toBe(50 * 64 * 1.0);
    });

    it('should scale with zoom', () => {
      const mapWidthCells = 100;
      const mapHeightCells = 50;
      const gridSize = 64;
      const zoom = 2.0;

      const result = getScrollContainerSize(mapWidthCells, mapHeightCells, gridSize, zoom);
      expect(result.width).toBe(100 * 64 * 2.0);
      expect(result.height).toBe(50 * 64 * 2.0);
    });
  });

  describe('getViewportOffset', () => {
    it('should calculate offset for normal scrolling', () => {
      const scrollLeft = 100;
      const scrollTop = 200;
      const mapWidthPixels = 2000;
      const mapHeightPixels = 1500;
      const canvasWidth = 800;
      const canvasHeight = 600;

      const result = getViewportOffset(
        scrollLeft,
        scrollTop,
        mapWidthPixels,
        mapHeightPixels,
        canvasWidth,
        canvasHeight
      );

      expect(result.x).toBe(-100); // Negative scrollLeft
      expect(result.y).toBe(1500 - 600 - 200); // mapHeight - canvasHeight - scrollTop
    });

    it('should center small maps', () => {
      const scrollLeft = 0;
      const scrollTop = 0;
      const mapWidthPixels = 400; // Smaller than canvas
      const mapHeightPixels = 300; // Smaller than canvas
      const canvasWidth = 800;
      const canvasHeight = 600;

      const result = getViewportOffset(
        scrollLeft,
        scrollTop,
        mapWidthPixels,
        mapHeightPixels,
        canvasWidth,
        canvasHeight
      );

      expect(result.x).toBe((800 - 400) / 2); // Centered horizontally
      expect(result.y).toBe((300 - 600) / 2); // Centered vertically (negative is expected)
    });
  });
});
