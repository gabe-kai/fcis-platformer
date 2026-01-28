import { describe, it, expect } from 'vitest';
import { createLevel, updateLevel, validateLevel, isLevel, type CreateLevelData } from './Level';

describe('Level Model', () => {
  describe('validateLevel', () => {
    it('should pass validation for valid level data', () => {
      const data: CreateLevelData = {
        title: 'Level 1',
        gameId: 'game-123',
      };
      const errors = validateLevel(data);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should fail validation for missing title', () => {
      const data = { gameId: 'game-123' };
      const errors = validateLevel(data);
      expect(errors.title).toBeDefined();
    });

    it('should fail validation for missing gameId', () => {
      const data = { title: 'Level 1' };
      const errors = validateLevel(data);
      expect(errors.gameId).toBeDefined();
    });

    it('should fail validation for invalid width', () => {
      const data: CreateLevelData = {
        title: 'Level 1',
        gameId: 'game-123',
        width: -10,
      };
      const errors = validateLevel(data);
      expect(errors.width).toBeDefined();
    });

    it('should fail validation for invalid camera mode', () => {
      const data = { title: 'Level 1', gameId: 'game-123', cameraMode: 'invalid' as any };
      const errors = validateLevel(data);
      expect(errors.cameraMode).toBeDefined();
    });
  });

  describe('createLevel', () => {
    it('should create level with valid data', () => {
      const data: CreateLevelData = {
        title: 'Level 1',
        gameId: 'game-123',
      };
      const level = createLevel(data);
      expect(level.title).toBe('Level 1');
      expect(level.gameId).toBe('game-123');
      expect(level.width).toBe(150);
      expect(level.height).toBe(30);
      expect(level.platforms).toEqual([]);
      expect(level.tileGrid.length).toBe(30);
      expect(level.tileGrid[0].length).toBe(150);
      expect(level.cameraMode).toBe('free');
      expect(level.isTemplate).toBe(false);
    });

    it('should use custom dimensions', () => {
      const data: CreateLevelData = {
        title: 'Level 1',
        gameId: 'game-123',
        width: 40,
        height: 25,
      };
      const level = createLevel(data);
      expect(level.width).toBe(40);
      expect(level.height).toBe(25);
      expect(level.tileGrid.length).toBe(25);
      expect(level.tileGrid[0].length).toBe(40);
    });

    it('should set camera mode', () => {
      const data: CreateLevelData = {
        title: 'Level 1',
        gameId: 'game-123',
        cameraMode: 'auto-scroll-horizontal',
      };
      const level = createLevel(data);
      expect(level.cameraMode).toBe('auto-scroll-horizontal');
    });

    it('should set scroll speed and direction', () => {
      const data: CreateLevelData = {
        title: 'Level 1',
        gameId: 'game-123',
        scrollSpeed: 200,
        scrollDirection: 'right',
      };
      const level = createLevel(data);
      expect(level.scrollSpeed).toBe(200);
      expect(level.scrollDirection).toBe('right');
    });
  });

  describe('updateLevel', () => {
    const baseLevel = createLevel({
      title: 'Level 1',
      gameId: 'game-123',
    });

    it('should update title', () => {
      const updated = updateLevel(baseLevel, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
    });

    it('should update dimensions', () => {
      const updated = updateLevel(baseLevel, { width: 3000, height: 2000 });
      expect(updated.width).toBe(3000);
      expect(updated.height).toBe(2000);
    });

    it('should update camera mode', () => {
      const updated = updateLevel(baseLevel, { cameraMode: 'auto-scroll-vertical' });
      expect(updated.cameraMode).toBe('auto-scroll-vertical');
    });

    it('should update backgroundImage', () => {
      const dataUrl = 'data:image/png;base64,cropped123';
      const updated = updateLevel(baseLevel, { backgroundImage: dataUrl });
      expect(updated.backgroundImage).toBe(dataUrl);
    });

    it('should clear backgroundImage when set to undefined', () => {
      const withBg = updateLevel(baseLevel, { backgroundImage: 'data:image/png;base64,x' });
      expect(withBg.backgroundImage).toBe('data:image/png;base64,x');
      const cleared = updateLevel(withBg, { backgroundImage: undefined });
      expect(cleared.backgroundImage).toBeUndefined();
    });

    it('should throw error for invalid width', () => {
      expect(() => updateLevel(baseLevel, { width: -10 })).toThrow();
    });
  });

  describe('isLevel', () => {
    it('should return true for valid level object', () => {
      const level = createLevel({
        title: 'Level 1',
        gameId: 'game-123',
      });
      expect(isLevel(level)).toBe(true);
    });

    it('should return false for invalid object', () => {
      expect(isLevel({ id: '123' })).toBe(false);
    });
  });
});
