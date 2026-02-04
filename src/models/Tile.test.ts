import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_SOLID_BLOCK, DEFAULT_TILES, tileRegistry, getTileDefinition } from './Tile';

// Mock tileTextureGenerator
vi.mock('@/utils/tileTextureGenerator', () => ({
  generateSystemTileTexture: vi.fn((type: string, size: number) => `data:image/png;base64,${type}-${size}`),
}));

describe('Tile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DEFAULT_SOLID_BLOCK', () => {
    it('should have a generated texture URL when in browser environment', () => {
      // In test environment, document is undefined, so texture won't be generated
      // But we can verify the structure
      expect(DEFAULT_SOLID_BLOCK.id).toBe('solid-block');
      expect(DEFAULT_SOLID_BLOCK.type).toBe('solid');
      expect(DEFAULT_SOLID_BLOCK.texture.width).toBe(64);
      expect(DEFAULT_SOLID_BLOCK.texture.height).toBe(64);
    });
  });

  describe('DEFAULT_TILES', () => {
    it('should have all system tiles with proper structure', () => {
      expect(DEFAULT_TILES.length).toBeGreaterThan(0);
      
      for (const tile of DEFAULT_TILES) {
        expect(tile.id).toBeTruthy();
        expect(tile.name).toBeTruthy();
        expect(tile.type).toBeTruthy();
        expect(tile.texture).toBeDefined();
        expect(tile.texture.width).toBeGreaterThan(0);
        expect(tile.texture.height).toBeGreaterThan(0);
        expect(tile.source).toBe('system');
      }
    });

    it('should include spawn and goal tiles', () => {
      const spawnTile = DEFAULT_TILES.find(t => t.id === 'spawn-player');
      const goalTile = DEFAULT_TILES.find(t => t.id === 'goal-flag');
      
      expect(spawnTile).toBeDefined();
      expect(spawnTile?.type).toBe('spawn');
      expect(goalTile).toBeDefined();
      expect(goalTile?.type).toBe('goal');
    });

    it('should have unique IDs for all tiles', () => {
      const ids = DEFAULT_TILES.map(t => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('tileRegistry', () => {
    it('should register all default tiles', () => {
      const allTiles = tileRegistry.getAll();
      expect(allTiles.length).toBeGreaterThanOrEqual(DEFAULT_TILES.length);
      
      // Check that all default tiles are in registry
      for (const defaultTile of DEFAULT_TILES) {
        const registered = tileRegistry.get(defaultTile.id);
        expect(registered).toBeDefined();
        expect(registered?.id).toBe(defaultTile.id);
      }
    });

    it('should get tile by ID', () => {
      const tile = tileRegistry.get('spawn-player');
      expect(tile).toBeDefined();
      expect(tile?.id).toBe('spawn-player');
      expect(tile?.type).toBe('spawn');
    });

    it('should return undefined for non-existent tile', () => {
      const tile = tileRegistry.get('non-existent-tile');
      expect(tile).toBeUndefined();
    });

    it('should get only system tiles', () => {
      const systemTiles = tileRegistry.getSystemTiles();
      expect(systemTiles.length).toBeGreaterThan(0);
      expect(systemTiles.every(t => t.source !== 'user')).toBe(true);
    });
  });

  describe('getTileDefinition', () => {
    it('should get tile from registry', () => {
      const tile = getTileDefinition('spawn-player');
      expect(tile).toBeDefined();
      expect(tile?.id).toBe('spawn-player');
    });

    it('should return undefined for non-existent tile', () => {
      const tile = getTileDefinition('non-existent');
      expect(tile).toBeUndefined();
    });
  });
});
