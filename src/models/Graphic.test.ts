import { describe, it, expect } from 'vitest';
import { createGraphic, updateGraphic, validateGraphic, isGraphic, type CreateGraphicData } from './Graphic';

describe('Graphic Model', () => {
  describe('validateGraphic', () => {
    it('should pass validation for valid graphic data', () => {
      const data: CreateGraphicData = {
        userId: 'user-123',
        name: 'My Graphic',
        imageUrl: 'https://example.com/image.png',
        width: 100,
        height: 100,
      };
      const errors = validateGraphic(data);
      expect(Object.keys(errors).length).toBe(0);
    });

    it('should fail validation for missing userId', () => {
      const data = { name: 'Graphic', imageUrl: 'https://example.com/image.png', width: 100, height: 100 };
      const errors = validateGraphic(data);
      expect(errors.userId).toBeDefined();
    });

    it('should fail validation for missing imageUrl', () => {
      const data = { userId: 'user-123', name: 'Graphic', width: 100, height: 100 };
      const errors = validateGraphic(data);
      expect(errors.imageUrl).toBeDefined();
    });

    it('should fail validation for invalid width', () => {
      const data: CreateGraphicData = {
        userId: 'user-123',
        name: 'Graphic',
        imageUrl: 'https://example.com/image.png',
        width: -10,
        height: 100,
      };
      const errors = validateGraphic(data);
      expect(errors.width).toBeDefined();
    });
  });

  describe('createGraphic', () => {
    it('should create graphic with valid data', () => {
      const data: CreateGraphicData = {
        userId: 'user-123',
        name: 'My Graphic',
        imageUrl: 'https://example.com/image.png',
        width: 100,
        height: 100,
      };
      const graphic = createGraphic(data);
      expect(graphic.userId).toBe('user-123');
      expect(graphic.name).toBe('My Graphic');
      expect(graphic.imageUrl).toBe('https://example.com/image.png');
      expect(graphic.width).toBe(100);
      expect(graphic.height).toBe(100);
      expect(graphic.category).toBe('other');
      expect(graphic.isShared).toBe(false);
    });

    it('should set category', () => {
      const data: CreateGraphicData = {
        userId: 'user-123',
        name: 'Graphic',
        imageUrl: 'https://example.com/image.png',
        width: 100,
        height: 100,
        category: 'platform',
      };
      const graphic = createGraphic(data);
      expect(graphic.category).toBe('platform');
    });
  });

  describe('updateGraphic', () => {
    const baseGraphic = createGraphic({
      userId: 'user-123',
      name: 'Graphic',
      imageUrl: 'https://example.com/image.png',
      width: 100,
      height: 100,
    });

    it('should update name', () => {
      const updated = updateGraphic(baseGraphic, { name: 'New Name' });
      expect(updated.name).toBe('New Name');
    });

    it('should update sharing scope', () => {
      const updated = updateGraphic(baseGraphic, { sharingScope: 'public' });
      expect(updated.sharingScope).toBe('public');
    });

    it('should throw error for invalid width', () => {
      expect(() => updateGraphic(baseGraphic, { width: -10 })).toThrow();
    });
  });

  describe('isGraphic', () => {
    it('should return true for valid graphic object', () => {
      const graphic = createGraphic({
        userId: 'user-123',
        name: 'Graphic',
        imageUrl: 'https://example.com/image.png',
        width: 100,
        height: 100,
      });
      expect(isGraphic(graphic)).toBe(true);
    });

    it('should return false for invalid object', () => {
      expect(isGraphic({ id: '123' })).toBe(false);
    });
  });
});
