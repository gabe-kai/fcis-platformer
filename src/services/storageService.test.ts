import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storageService } from './storageService';
import { createLevel } from '@/models/Level';
import { createPlatform } from '@/models/Platform';
import { updateLevel } from '@/models/Level';

describe('StorageService - Level Operations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveLevel', () => {
    it('should save level to localStorage', async () => {
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

      const saved = localStorage.getItem('fcis_levels');
      expect(saved).toBeTruthy();
      const levels = JSON.parse(saved!);
      expect(levels['level-1']).toBeDefined();
      expect(levels['level-1'].id).toBe('level-1');
      expect(levels['level-1'].title).toBe('Test Level');
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

      const saved = localStorage.getItem('fcis_levels');
      const levels = JSON.parse(saved!);
      expect(levels['level-1'].title).toBe('Updated Title');
      expect(levels['level-1'].width).toBe(12);
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

      const saved = localStorage.getItem('fcis_levels');
      const levels = JSON.parse(saved!);
      expect(Object.keys(levels)).toHaveLength(2);
      expect(levels['level-1']).toBeDefined();
      expect(levels['level-2']).toBeDefined();
    });

    it('should throw error on localStorage failure', async () => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 10,
        height: 10,
      });

      await expect(storageService.saveLevel(level)).rejects.toThrow();
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('loadLevel', () => {
    it('should load level from localStorage', async () => {
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

    it('should return null when localStorage is empty', async () => {
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

    it('should throw error on localStorage parse failure', async () => {
      localStorage.setItem('fcis_levels', 'invalid json');
      await expect(storageService.loadLevel('level-1')).rejects.toThrow();
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

    it('should throw error on localStorage parse failure', async () => {
      localStorage.setItem('fcis_levels', 'invalid json');
      await expect(storageService.listLevels('game-1')).rejects.toThrow();
    });
  });

  describe('deleteLevel', () => {
    it('should delete level from localStorage', async () => {
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

    it('should handle deletion when localStorage is empty', async () => {
      await expect(storageService.deleteLevel('level-1')).resolves.not.toThrow();
    });

    it('should throw error on localStorage failure during delete', async () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 10,
        height: 10,
      });

      await storageService.saveLevel(level);

      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(storageService.deleteLevel('level-1')).rejects.toThrow();
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('Background Image Operations', () => {
    const BACKGROUND_IMAGES_KEY = 'fcis_background_images';

    it('should save background image to localStorage', async () => {
      const entry = {
        id: 'bg_1',
        name: 'My Background',
        dataUrl: 'data:image/png;base64,abc123',
        createdAt: 1000,
      };
      await storageService.saveBackgroundImage(entry);
      const saved = localStorage.getItem(BACKGROUND_IMAGES_KEY);
      expect(saved).toBeTruthy();
      const map = JSON.parse(saved!);
      expect(map['bg_1']).toBeDefined();
      expect(map['bg_1'].id).toBe('bg_1');
      expect(map['bg_1'].name).toBe('My Background');
      expect(map['bg_1'].dataUrl).toBe(entry.dataUrl);
      expect(map['bg_1'].createdAt).toBe(1000);
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
      const saved = localStorage.getItem(BACKGROUND_IMAGES_KEY);
      const map = JSON.parse(saved!);
      expect(map['bg_1']).toBeUndefined();
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
});
