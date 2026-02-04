import { describe, it, expect, beforeEach, vi } from 'vitest';
// @ts-expect-error - fake-indexeddb subpath has no declaration file
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import { createLevel, updateLevel } from '@/models/Level';
import { createPlatform } from '@/models/Platform';
import { createGame } from '@/models/Game';
import { isQuotaExceededError, type BackgroundImageEntry, type StorageService } from './storageService';

let storageService: StorageService;

const resetIndexedDb = () => {
  const factory = new FDBFactory();
  (globalThis as unknown as { indexedDB: IDBFactory }).indexedDB = factory as unknown as IDBFactory;
};

describe('StorageService - IndexedDB Operations', () => {
  beforeEach(async () => {
    resetIndexedDb();
    localStorage.clear();
    vi.resetModules();
    ({ storageService } = await import('./storageService'));
  });

  describe('saveLevel', () => {
    it('should save and load a level', async () => {
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 10,
        height: 10,
      });
      const levelWithPlatform = updateLevel(level, { platforms: [platform] });

      await storageService.saveLevel(levelWithPlatform);

      const loaded = await storageService.loadLevel('level-1');
      expect(loaded).toBeTruthy();
      expect(loaded?.id).toBe('level-1');
      expect(loaded?.title).toBe('Test Level');
      expect(loaded?.platforms).toHaveLength(1);
    });

    it('should update existing level', async () => {
      const level1 = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Original Title',
        width: 10,
        height: 10,
      });

      await storageService.saveLevel(level1);

      const level2 = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Updated Title',
        width: 12,
        height: 12,
      });

      await storageService.saveLevel(level2);

      const loaded = await storageService.loadLevel('level-1');
      expect(loaded?.title).toBe('Updated Title');
      expect(loaded?.width).toBe(12);
    });

    it('should save multiple levels', async () => {
      const level1 = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Level 1',
        width: 10,
        height: 10,
      });

      const level2 = createLevel({
        id: 'level-2',
        gameId: 'game-1',
        title: 'Level 2',
        width: 10,
        height: 10,
      });

      await storageService.saveLevel(level1);
      await storageService.saveLevel(level2);

      const levels = await storageService.listLevels('game-1');
      expect(levels).toHaveLength(2);
      expect(levels.map((l) => l.id)).toContain('level-1');
      expect(levels.map((l) => l.id)).toContain('level-2');
    });
  });

  describe('loadLevel', () => {
    it('should load level from storage', async () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 10,
        height: 10,
      });

      await storageService.saveLevel(level);
      const loaded = await storageService.loadLevel('level-1');

      expect(loaded).toBeTruthy();
      expect(loaded?.id).toBe('level-1');
      expect(loaded?.title).toBe('Test Level');
      expect(loaded?.width).toBe(10);
      expect(loaded?.height).toBe(10);
    });

    it('should return null when level not found', async () => {
      const loaded = await storageService.loadLevel('non-existent');
      expect(loaded).toBeNull();
    });

    it('should return null when storage is empty', async () => {
      const loaded = await storageService.loadLevel('level-1');
      expect(loaded).toBeNull();
    });

    it('should load level with platforms', async () => {
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 10,
        height: 10,
      });
      const levelWithPlatform = updateLevel(level, { platforms: [platform] });

      await storageService.saveLevel(levelWithPlatform);
      const loaded = await storageService.loadLevel('level-1');

      expect(loaded?.platforms).toHaveLength(1);
      expect(loaded?.platforms[0].id).toBe('platform-1');
    });
  });

  describe('listLevels', () => {
    it('should return empty array when no levels exist', async () => {
      const levels = await storageService.listLevels('game-1');
      expect(levels).toEqual([]);
    });

    it('should return levels for specific game', async () => {
      const level1 = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Level 1',
        width: 10,
        height: 10,
      });

      const level2 = createLevel({
        id: 'level-2',
        gameId: 'game-1',
        title: 'Level 2',
        width: 10,
        height: 10,
      });

      const level3 = createLevel({
        id: 'level-3',
        gameId: 'game-2',
        title: 'Level 3',
        width: 10,
        height: 10,
      });

      await storageService.saveLevel(level1);
      await storageService.saveLevel(level2);
      await storageService.saveLevel(level3);

      const levels = await storageService.listLevels('game-1');
      expect(levels).toHaveLength(2);
      expect(levels.map((l) => l.id)).toContain('level-1');
      expect(levels.map((l) => l.id)).toContain('level-2');
      expect(levels.map((l) => l.id)).not.toContain('level-3');
    });

    it('should return empty array for game with no levels', async () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Level 1',
        width: 10,
        height: 10,
      });

      await storageService.saveLevel(level);
      const levels = await storageService.listLevels('game-2');
      expect(levels).toEqual([]);
    });
  });

  describe('deleteLevel', () => {
    it('should delete level from storage', async () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 10,
        height: 10,
      });

      await storageService.saveLevel(level);
      await storageService.deleteLevel('level-1');

      const loaded = await storageService.loadLevel('level-1');
      expect(loaded).toBeNull();
    });

    it('should not delete other levels', async () => {
      const level1 = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Level 1',
        width: 10,
        height: 10,
      });

      const level2 = createLevel({
        id: 'level-2',
        gameId: 'game-1',
        title: 'Level 2',
        width: 10,
        height: 10,
      });

      await storageService.saveLevel(level1);
      await storageService.saveLevel(level2);
      await storageService.deleteLevel('level-1');

      const loaded1 = await storageService.loadLevel('level-1');
      const loaded2 = await storageService.loadLevel('level-2');

      expect(loaded1).toBeNull();
      expect(loaded2).toBeTruthy();
      expect(loaded2?.id).toBe('level-2');
    });

    it('should handle deletion of non-existent level gracefully', async () => {
      await expect(storageService.deleteLevel('non-existent')).resolves.not.toThrow();
    });

    it('should handle deletion when storage is empty', async () => {
      await expect(storageService.deleteLevel('level-1')).resolves.not.toThrow();
    });
  });

  describe('Game Operations', () => {
    it('should save and load a game', async () => {
      const game = createGame({ id: 'game-1', title: 'Test Game', userId: 'user-1' });
      await storageService.saveGame(game);
      const loaded = await storageService.loadGame('game-1');
      expect(loaded).toBeTruthy();
      expect(loaded?.id).toBe('game-1');
      expect(loaded?.title).toBe('Test Game');
      expect(loaded?.userId).toBe('user-1');
    });

    it('should update existing game', async () => {
      const game1 = createGame({ id: 'game-1', title: 'Original', userId: 'user-1' });
      await storageService.saveGame(game1);
      const game2 = createGame({ id: 'game-1', title: 'Updated', userId: 'user-1' });
      await storageService.saveGame(game2);
      const loaded = await storageService.loadGame('game-1');
      expect(loaded?.title).toBe('Updated');
    });

    it('should list games by userId', async () => {
      await storageService.saveGame(createGame({ id: 'g1', title: 'G1', userId: 'user-1' }));
      await storageService.saveGame(createGame({ id: 'g2', title: 'G2', userId: 'user-1' }));
      await storageService.saveGame(createGame({ id: 'g3', title: 'G3', userId: 'user-2' }));
      const list = await storageService.listGames('user-1');
      expect(list).toHaveLength(2);
      expect(list.map((g) => g.id)).toContain('g1');
      expect(list.map((g) => g.id)).toContain('g2');
      expect(list.map((g) => g.id)).not.toContain('g3');
    });

    it('should return null when game not found', async () => {
      const loaded = await storageService.loadGame('nonexistent');
      expect(loaded).toBeNull();
    });

    it('should delete game', async () => {
      const game = createGame({ id: 'game-1', title: 'To Delete', userId: 'user-1' });
      await storageService.saveGame(game);
      await storageService.deleteGame('game-1');
      const loaded = await storageService.loadGame('game-1');
      expect(loaded).toBeNull();
    });

    it('should not delete other games', async () => {
      await storageService.saveGame(createGame({ id: 'g1', title: 'G1', userId: 'user-1' }));
      await storageService.saveGame(createGame({ id: 'g2', title: 'G2', userId: 'user-1' }));
      await storageService.deleteGame('g1');
      expect(await storageService.loadGame('g1')).toBeNull();
      expect(await storageService.loadGame('g2')).toBeTruthy();
    });
  });

  describe('Background Image Operations', () => {
    it('should save background image', async () => {
      const entry: BackgroundImageEntry = {
        id: 'bg_1',
        name: 'My Background',
        dataUrl: 'data:image/png;base64,abc123',
        createdAt: 1000,
      };
      await storageService.saveBackgroundImage(entry);
      const list = await storageService.listBackgroundImages();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('bg_1');
      expect(list[0].name).toBe('My Background');
      expect(list[0].dataUrl).toBe(entry.dataUrl);
      expect(list[0].createdAt).toBe(1000);
    });

    it('should list background images sorted by createdAt descending', async () => {
      await storageService.saveBackgroundImage({
        id: 'bg_1',
        name: 'First',
        dataUrl: 'data:image/png;base64,a',
        createdAt: 1000,
      });
      await storageService.saveBackgroundImage({
        id: 'bg_2',
        name: 'Second',
        dataUrl: 'data:image/png;base64,b',
        createdAt: 2000,
      });
      const list = await storageService.listBackgroundImages();
      expect(list).toHaveLength(2);
      expect(list[0].id).toBe('bg_2');
      expect(list[1].id).toBe('bg_1');
    });

    it('should return empty array when no background images exist', async () => {
      const list = await storageService.listBackgroundImages();
      expect(list).toEqual([]);
    });

    it('should delete background image by id', async () => {
      await storageService.saveBackgroundImage({
        id: 'bg_1',
        name: 'To Delete',
        dataUrl: 'data:image/png;base64,x',
        createdAt: 1000,
      });
      await storageService.deleteBackgroundImage('bg_1');
      const list = await storageService.listBackgroundImages();
      expect(list).toHaveLength(0);
    });

    it('should not delete other background images when deleting one', async () => {
      await storageService.saveBackgroundImage({
        id: 'bg_1',
        name: 'One',
        dataUrl: 'data:image/png;base64,a',
        createdAt: 1000,
      });
      await storageService.saveBackgroundImage({
        id: 'bg_2',
        name: 'Two',
        dataUrl: 'data:image/png;base64,b',
        createdAt: 2000,
      });
      await storageService.deleteBackgroundImage('bg_1');
      const list = await storageService.listBackgroundImages();
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('bg_2');
    });
  });

  describe('isQuotaExceededError', () => {
    it('returns true for DOMException QuotaExceededError', () => {
      const err = new DOMException('Quota exceeded', 'QuotaExceededError');
      expect(isQuotaExceededError(err)).toBe(true);
    });

    it('returns false for generic Error', () => {
      expect(isQuotaExceededError(new Error('fail'))).toBe(false);
    });

    it('returns false for other DOMException', () => {
      const err = new DOMException('NotFound', 'NotFoundError');
      expect(isQuotaExceededError(err)).toBe(false);
    });
  });

  describe('getStorageEstimate', () => {
    it('returns null when navigator.storage is not available', async () => {
      const result = await storageService.getStorageEstimate();
      expect(result).toBeNull();
    });
  });

  describe('getStorageBreakdown', () => {
    it('returns counts for all stores', async () => {
      await storageService.saveGame(createGame({ id: 'g1', title: 'G1', userId: 'u1' }));
      await storageService.saveLevel(createLevel({ id: 'l1', gameId: 'g1', title: 'L1', width: 10, height: 10 }));
      await storageService.saveBackgroundImage({ id: 'bg1', name: 'Bg', dataUrl: 'data:x', createdAt: 1 });
      const breakdown = await storageService.getStorageBreakdown();
      expect(breakdown.games).toBe(1);
      expect(breakdown.levels).toBe(1);
      expect(breakdown.backgroundImages).toBe(1);
      expect(breakdown.patterns).toBe(0);
      expect(typeof breakdown.worldmaps).toBe('number');
      expect(typeof breakdown.graphics).toBe('number');
      expect(typeof breakdown.userTiles).toBe('number');
    });
  });

  describe('clearBackgroundImages', () => {
    it('removes all background images', async () => {
      await storageService.saveBackgroundImage({ id: 'b1', name: 'A', dataUrl: 'data:a', createdAt: 1 });
      await storageService.saveBackgroundImage({ id: 'b2', name: 'B', dataUrl: 'data:b', createdAt: 2 });
      await storageService.clearBackgroundImages();
      const list = await storageService.listBackgroundImages();
      expect(list).toHaveLength(0);
    });
  });

  describe('clearPatterns', () => {
    it('removes all patterns', async () => {
      await storageService.savePattern({
        id: 'p1',
        name: 'P1',
        createdAt: 1,
        cells: [{ relX: 0, relY: 0, tileId: 't1', passable: false, layer: 'primary' }],
      });
      await storageService.savePattern({
        id: 'p2',
        name: 'P2',
        createdAt: 2,
        cells: [],
      });
      await storageService.clearPatterns();
      const list = await storageService.listPatterns();
      expect(list).toHaveLength(0);
    });
  });
});
