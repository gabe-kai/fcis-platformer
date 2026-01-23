import { describe, it, expect } from 'vitest';
import { createPlatform, updatePlatform, validatePlatform, isPlatform, type CreatePlatformData } from './Platform';
import type { Rectangle } from '@/types';

describe('Platform Model', () => {
  const validBounds: Rectangle = { x: 100, y: 200, width: 50, height: 20 };

  describe('validatePlatform', () => {
    it('should pass validation for valid platform data', () => {
      const data: CreatePlatformData = {
        levelId: 'level-123',
        bounds: validBounds,
      };
      const errors = validatePlatform(data);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should fail validation for missing levelId', () => {
      const data = { bounds: validBounds };
      const errors = validatePlatform(data);
      expect(errors.levelId).toBeDefined();
    });

    it('should fail validation for invalid bounds', () => {
      const data = { levelId: 'level-123', bounds: { x: 0, y: 0, width: -10, height: 20 } };
      const errors = validatePlatform(data);
      expect(errors.bounds).toBeDefined();
    });

    it('should fail validation for invalid type', () => {
      const data = { levelId: 'level-123', bounds: validBounds, type: 'invalid' as any };
      const errors = validatePlatform(data);
      expect(errors.type).toBeDefined();
    });
  });

  describe('createPlatform', () => {
    it('should create platform with valid data', () => {
      const data: CreatePlatformData = {
        levelId: 'level-123',
        bounds: validBounds,
      };
      const platform = createPlatform(data);
      expect(platform.levelId).toBe('level-123');
      expect(platform.bounds).toEqual(validBounds);
      expect(platform.type).toBe('solid');
      expect(platform.createdAt).toBeDefined();
    });

    it('should set platform type', () => {
      const data: CreatePlatformData = {
        levelId: 'level-123',
        bounds: validBounds,
        type: 'moving',
      };
      const platform = createPlatform(data);
      expect(platform.type).toBe('moving');
    });

    it('should include movement path for moving platforms', () => {
      const data: CreatePlatformData = {
        levelId: 'level-123',
        bounds: validBounds,
        type: 'moving',
        movementPath: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        movementSpeed: 50,
      };
      const platform = createPlatform(data);
      expect(platform.movementPath).toBeDefined();
      expect(platform.movementSpeed).toBe(50);
    });
  });

  describe('updatePlatform', () => {
    const basePlatform = createPlatform({
      levelId: 'level-123',
      bounds: validBounds,
    });

    it('should update bounds', () => {
      const newBounds: Rectangle = { x: 200, y: 300, width: 100, height: 30 };
      const updated = updatePlatform(basePlatform, { bounds: newBounds });
      expect(updated.bounds).toEqual(newBounds);
    });

    it('should update type', () => {
      const updated = updatePlatform(basePlatform, { type: 'destructible' });
      expect(updated.type).toBe('destructible');
    });

    it('should throw error for invalid bounds', () => {
      expect(() => updatePlatform(basePlatform, { bounds: { x: 0, y: 0, width: -10, height: 20 } })).toThrow();
    });
  });

  describe('isPlatform', () => {
    it('should return true for valid platform object', () => {
      const platform = createPlatform({
        levelId: 'level-123',
        bounds: validBounds,
      });
      expect(isPlatform(platform)).toBe(true);
    });

    it('should return false for invalid object', () => {
      expect(isPlatform({ id: '123' })).toBe(false);
    });
  });
});
