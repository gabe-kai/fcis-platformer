import { describe, it, expect } from 'vitest';
import { createGame, updateGame, validateGame, isGame, type CreateGameData } from './Game';

describe('Game Model', () => {
  describe('validateGame', () => {
    it('should pass validation for valid game data', () => {
      const data: CreateGameData = {
        title: 'My Game',
        userId: 'user-123',
      };
      const errors = validateGame(data);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should fail validation for missing title', () => {
      const data = { userId: 'user-123' };
      const errors = validateGame(data);
      expect(errors.title).toBeDefined();
    });

    it('should fail validation for missing userId', () => {
      const data = { title: 'My Game' };
      const errors = validateGame(data);
      expect(errors.userId).toBeDefined();
    });

    it('should fail validation for title too long', () => {
      const data: CreateGameData = {
        title: 'a'.repeat(101),
        userId: 'user-123',
      };
      const errors = validateGame(data);
      expect(errors.title).toBeDefined();
    });

    it('should fail validation for invalid sharing scope', () => {
      const data = { title: 'My Game', userId: 'user-123', sharingScope: 'invalid' as any };
      const errors = validateGame(data);
      expect(errors.sharingScope).toBeDefined();
    });
  });

  describe('createGame', () => {
    it('should create game with valid data', () => {
      const data: CreateGameData = {
        title: 'My Game',
        userId: 'user-123',
      };
      const game = createGame(data);
      expect(game.title).toBe('My Game');
      expect(game.userId).toBe('user-123');
      expect(game.levelIds).toEqual([]);
      expect(game.isShared).toBe(false);
      expect(game.sharingScope).toBe('private');
      expect(game.createdAt).toBeDefined();
      expect(game.updatedAt).toBeDefined();
    });

    it('should generate id if not provided', () => {
      const data: CreateGameData = {
        title: 'My Game',
        userId: 'user-123',
      };
      const game = createGame(data);
      expect(game.id).toBeDefined();
      expect(game.id).toMatch(/^game_\d+_[a-z0-9]+$/);
    });

    it('should use provided id', () => {
      const data: CreateGameData = {
        id: 'custom-id',
        title: 'My Game',
        userId: 'user-123',
      };
      const game = createGame(data);
      expect(game.id).toBe('custom-id');
    });

    it('should include description when provided', () => {
      const data: CreateGameData = {
        title: 'My Game',
        userId: 'user-123',
        description: 'A great game',
      };
      const game = createGame(data);
      expect(game.description).toBe('A great game');
    });

    it('should set sharing scope', () => {
      const data: CreateGameData = {
        title: 'My Game',
        userId: 'user-123',
        sharingScope: 'public',
      };
      const game = createGame(data);
      expect(game.sharingScope).toBe('public');
    });

    it('should throw error for invalid data', () => {
      const data = { title: '', userId: 'user-123' };
      expect(() => createGame(data)).toThrow();
    });
  });

  describe('updateGame', () => {
    const baseGame = createGame({
      title: 'My Game',
      userId: 'user-123',
    });

    it('should update title', () => {
      const updated = updateGame(baseGame, { title: 'New Title' });
      expect(updated.title).toBe('New Title');
      expect(updated.updatedAt).toBeGreaterThan(baseGame.updatedAt);
    });

    it('should update levelIds', () => {
      const updated = updateGame(baseGame, { levelIds: ['level-1', 'level-2'] });
      expect(updated.levelIds).toEqual(['level-1', 'level-2']);
    });

    it('should update sharing scope', () => {
      const updated = updateGame(baseGame, { sharingScope: 'public' });
      expect(updated.sharingScope).toBe('public');
    });

    it('should throw error for invalid title', () => {
      expect(() => updateGame(baseGame, { title: '' })).toThrow();
    });
  });

  describe('isGame', () => {
    it('should return true for valid game object', () => {
      const game = createGame({
        title: 'My Game',
        userId: 'user-123',
      });
      expect(isGame(game)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isGame(null)).toBe(false);
    });

    it('should return false for invalid object', () => {
      expect(isGame({ id: '123' })).toBe(false);
    });
  });
});
