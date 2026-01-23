import { describe, it, expect } from 'vitest';
import { createWorldMap, updateWorldMap, validateWorldMap, isWorldMap, type CreateWorldMapData } from './WorldMap';

describe('WorldMap Model', () => {
  describe('validateWorldMap', () => {
    it('should pass validation for valid world map data', () => {
      const data: CreateWorldMapData = {
        title: 'World Map 1',
        gameId: 'game-123',
      };
      const errors = validateWorldMap(data);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should fail validation for missing title', () => {
      const data = { gameId: 'game-123' };
      const errors = validateWorldMap(data);
      expect(errors.title).toBeDefined();
    });

    it('should fail validation for invalid width', () => {
      const data: CreateWorldMapData = {
        title: 'World Map',
        gameId: 'game-123',
        width: -10,
      };
      const errors = validateWorldMap(data);
      expect(errors.width).toBeDefined();
    });
  });

  describe('createWorldMap', () => {
    it('should create world map with valid data', () => {
      const data: CreateWorldMapData = {
        title: 'World Map 1',
        gameId: 'game-123',
      };
      const worldMap = createWorldMap(data);
      expect(worldMap.title).toBe('World Map 1');
      expect(worldMap.gameId).toBe('game-123');
      expect(worldMap.width).toBe(5000);
      expect(worldMap.height).toBe(5000);
      expect(worldMap.levelNodes).toEqual([]);
      expect(worldMap.paths).toEqual([]);
    });

    it('should use custom dimensions', () => {
      const data: CreateWorldMapData = {
        title: 'World Map',
        gameId: 'game-123',
        width: 10000,
        height: 10000,
      };
      const worldMap = createWorldMap(data);
      expect(worldMap.width).toBe(10000);
      expect(worldMap.height).toBe(10000);
    });
  });

  describe('updateWorldMap', () => {
    const baseWorldMap = createWorldMap({
      title: 'World Map',
      gameId: 'game-123',
    });

    it('should update title', () => {
      const updated = updateWorldMap(baseWorldMap, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
    });

    it('should update level nodes', () => {
      const nodes = [{ id: 'node-1', levelId: 'level-1', position: { x: 100, y: 200 } }];
      const updated = updateWorldMap(baseWorldMap, { levelNodes: nodes });
      expect(updated.levelNodes).toEqual(nodes);
    });
  });

  describe('isWorldMap', () => {
    it('should return true for valid world map object', () => {
      const worldMap = createWorldMap({
        title: 'World Map',
        gameId: 'game-123',
      });
      expect(isWorldMap(worldMap)).toBe(true);
    });

    it('should return false for invalid object', () => {
      expect(isWorldMap({ id: '123' })).toBe(false);
    });
  });
});
