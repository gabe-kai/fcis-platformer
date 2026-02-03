import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateSystemTileTexture } from './tileTextureGenerator';

// Mock document.createElement for canvas
const mockCanvas = {
  width: 64,
  height: 64,
  getContext: vi.fn(() => ({
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
};

describe('tileTextureGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.createElement
    global.document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return {} as HTMLElement;
      }),
    } as unknown as Document;
  });

  describe('generateSystemTileTexture', () => {
    it('should generate a texture for solid tile type', () => {
      const result = generateSystemTileTexture('solid', 64);
      expect(result).toBe('data:image/png;base64,mock');
      expect(global.document.createElement).toHaveBeenCalledWith('canvas');
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    });

    it('should generate a texture for spawn tile type', () => {
      const result = generateSystemTileTexture('spawn', 64);
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should generate a texture for goal tile type', () => {
      const result = generateSystemTileTexture('goal', 64);
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should generate a texture for checkpoint tile type', () => {
      const result = generateSystemTileTexture('checkpoint', 64);
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should generate a texture for teleporter tile type', () => {
      const result = generateSystemTileTexture('teleporter', 64);
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should generate a texture for death tile type', () => {
      const result = generateSystemTileTexture('death', 64);
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should generate a texture for bumper tile type', () => {
      const result = generateSystemTileTexture('bumper', 64);
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should generate a texture for collectible tile type', () => {
      const result = generateSystemTileTexture('collectible', 64);
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should generate a texture for platform tile type', () => {
      const result = generateSystemTileTexture('platform', 64);
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should generate a texture for path tile type', () => {
      const result = generateSystemTileTexture('path', 64);
      expect(result).toBe('data:image/png;base64,mock');
    });

    it('should use custom size when provided', () => {
      generateSystemTileTexture('solid', 128);
      expect(mockCanvas.width).toBe(128);
      expect(mockCanvas.height).toBe(128);
    });

    it('should return empty string if context is null', () => {
      const originalGetContext = mockCanvas.getContext;
      mockCanvas.getContext = vi.fn(() => null);
      
      const result = generateSystemTileTexture('solid', 64);
      expect(result).toBe('');
      
      mockCanvas.getContext = originalGetContext;
    });
  });
});
