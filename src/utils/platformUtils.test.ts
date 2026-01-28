import { describe, it, expect } from 'vitest';
import { platformsOverlap, wouldOverlap, findOverlappingPlatform } from './platformUtils';
import { createPlatform } from '@/models/Platform';

describe('Platform Utilities', () => {
  describe('platformsOverlap', () => {
    it('should return true when platforms overlap', () => {
      const p1 = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      const p2 = createPlatform({
        id: 'p2',
        levelId: 'level-1',
        bounds: { x: 50, y: 25, width: 100, height: 50 },
      });
      
      expect(platformsOverlap(p1, p2)).toBe(true);
    });

    it('should return false when platforms do not overlap', () => {
      const p1 = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      const p2 = createPlatform({
        id: 'p2',
        levelId: 'level-1',
        bounds: { x: 150, y: 0, width: 100, height: 50 },
      });
      
      expect(platformsOverlap(p1, p2)).toBe(false);
    });

    it('should return true when platforms are adjacent (touching)', () => {
      const p1 = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      const p2 = createPlatform({
        id: 'p2',
        levelId: 'level-1',
        bounds: { x: 100, y: 0, width: 100, height: 50 },
      });
      
      // p1 ends at x=100, p2 starts at x=100, so they touch
      // Our overlap function treats touching as overlapping
      expect(platformsOverlap(p1, p2)).toBe(true);
    });

    it('should return true when one platform contains another', () => {
      const p1 = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 200, height: 200 },
      });
      const p2 = createPlatform({
        id: 'p2',
        levelId: 'level-1',
        bounds: { x: 50, y: 50, width: 100, height: 100 },
      });
      
      expect(platformsOverlap(p1, p2)).toBe(true);
    });
  });

  describe('wouldOverlap', () => {
    it('should return true if new platform overlaps with existing', () => {
      const existing = createPlatform({
        id: 'existing',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      const newPlatform = createPlatform({
        id: 'new',
        levelId: 'level-1',
        bounds: { x: 50, y: 25, width: 100, height: 50 },
      });
      
      expect(wouldOverlap(newPlatform, [existing])).toBe(true);
    });

    it('should return false if new platform does not overlap', () => {
      const existing = createPlatform({
        id: 'existing',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      const newPlatform = createPlatform({
        id: 'new',
        levelId: 'level-1',
        bounds: { x: 150, y: 0, width: 100, height: 50 },
      });
      
      expect(wouldOverlap(newPlatform, [existing])).toBe(false);
    });

    it('should not check overlap with itself', () => {
      const platform = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      
      // Platform should not overlap with itself
      expect(wouldOverlap(platform, [platform])).toBe(false);
    });
  });

  describe('findOverlappingPlatform', () => {
    it('should find overlapping platform', () => {
      const p1 = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      const p2 = createPlatform({
        id: 'p2',
        levelId: 'level-1',
        bounds: { x: 50, y: 25, width: 100, height: 50 },
      });
      const p3 = createPlatform({
        id: 'p3',
        levelId: 'level-1',
        bounds: { x: 200, y: 0, width: 100, height: 50 },
      });
      
      const overlapping = findOverlappingPlatform(p2, [p1, p2, p3]);
      expect(overlapping).not.toBeNull();
      expect(overlapping?.id).toBe('p1');
    });

    it('should return null if no overlap found', () => {
      const p1 = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      const p2 = createPlatform({
        id: 'p2',
        levelId: 'level-1',
        bounds: { x: 150, y: 0, width: 100, height: 50 },
      });
      
      const overlapping = findOverlappingPlatform(p2, [p1, p2]);
      expect(overlapping).toBeNull();
    });

    it('should not check overlap with itself', () => {
      const platform = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      
      const overlapping = findOverlappingPlatform(platform, [platform]);
      expect(overlapping).toBeNull();
    });
  });
});
