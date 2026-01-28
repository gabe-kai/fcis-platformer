import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';
import { createLevel, updateLevel } from '@/models/Level';
import { createPlatform } from '@/models/Platform';

describe('EditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      currentLevel: null,
      selectedTool: 'select',
      selectedPlatform: null,
      gridEnabled: true,
      viewMode: 'texture',
      gridSize: 32,
    });
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const state = useEditorStore.getState();
      expect(state.currentLevel).toBeNull();
      expect(state.selectedTool).toBe('select');
      expect(state.selectedPlatform).toBeNull();
      expect(state.gridEnabled).toBe(true);
      expect(state.gridSize).toBe(32);
    });
  });

  describe('setCurrentLevel', () => {
    it('should set current level and clear selected platform', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      useEditorStore.getState().setCurrentLevel(level);

      const state = useEditorStore.getState();
      expect(state.currentLevel).toEqual(level);
      expect(state.selectedPlatform).toBeNull();
    });

    it('should set current level to null', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      useEditorStore.getState().setCurrentLevel(level);
      useEditorStore.getState().setCurrentLevel(null);

      const state = useEditorStore.getState();
      expect(state.currentLevel).toBeNull();
    });
  });

  describe('setSelectedTool', () => {
    it('should set selected tool and clear selected platform', () => {
      useEditorStore.getState().setSelectedTool('platform');

      const state = useEditorStore.getState();
      expect(state.selectedTool).toBe('platform');
      expect(state.selectedPlatform).toBeNull();
    });

    it('should switch between tools', () => {
      useEditorStore.getState().setSelectedTool('platform');
      expect(useEditorStore.getState().selectedTool).toBe('platform');

      useEditorStore.getState().setSelectedTool('select');
      expect(useEditorStore.getState().selectedTool).toBe('select');
    });
  });

  describe('setSelectedPlatform', () => {
    it('should set selected platform', () => {
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      useEditorStore.getState().setSelectedPlatform(platform);

      const state = useEditorStore.getState();
      expect(state.selectedPlatform).toEqual(platform);
    });

    it('should clear selected platform when set to null', () => {
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      useEditorStore.getState().setSelectedPlatform(platform);
      useEditorStore.getState().setSelectedPlatform(null);

      const state = useEditorStore.getState();
      expect(state.selectedPlatform).toBeNull();
    });
  });

  describe('toggleGrid', () => {
    it('should toggle grid from enabled to disabled', () => {
      expect(useEditorStore.getState().gridEnabled).toBe(true);
      useEditorStore.getState().toggleGrid();
      expect(useEditorStore.getState().gridEnabled).toBe(false);
    });

    it('should toggle grid from disabled to enabled', () => {
      useEditorStore.setState({ gridEnabled: false });
      useEditorStore.getState().toggleGrid();
      expect(useEditorStore.getState().gridEnabled).toBe(true);
    });
  });

  describe('setGridSize', () => {
    it('should set grid size', () => {
      useEditorStore.getState().setGridSize(64);
      expect(useEditorStore.getState().gridSize).toBe(64);
    });
  });

  describe('setViewMode', () => {
    it('should set view mode to grid', () => {
      useEditorStore.getState().setViewMode('grid');
      expect(useEditorStore.getState().viewMode).toBe('grid');
    });

    it('should set view mode to texture', () => {
      useEditorStore.getState().setViewMode('grid');
      useEditorStore.getState().setViewMode('texture');
      expect(useEditorStore.getState().viewMode).toBe('texture');
    });
  });

  describe('placePlatform', () => {
    it('should add platform to current level', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      useEditorStore.getState().setCurrentLevel(level);
      useEditorStore.getState().placePlatform(platform);

      const state = useEditorStore.getState();
      expect(state.currentLevel?.platforms).toHaveLength(1);
      expect(state.currentLevel?.platforms[0]).toEqual(platform);
      expect(state.currentLevel?.updatedAt).toBeGreaterThanOrEqual(level.updatedAt);
    });

    it('should add multiple platforms to level', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const platform1 = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      const platform2 = createPlatform({
        id: 'platform-2',
        levelId: 'level-1',
        bounds: { x: 200, y: 300, width: 60, height: 30 },
      });

      useEditorStore.getState().setCurrentLevel(level);
      useEditorStore.getState().placePlatform(platform1);
      useEditorStore.getState().placePlatform(platform2);

      const state = useEditorStore.getState();
      expect(state.currentLevel?.platforms).toHaveLength(2);
    });

    it('should not place platform when no current level', () => {
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      useEditorStore.getState().placePlatform(platform);

      const state = useEditorStore.getState();
      expect(state.currentLevel).toBeNull();
    });

    it('should prevent placing overlapping platforms', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const platform1 = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });

      const platform2 = createPlatform({
        id: 'platform-2',
        levelId: 'level-1',
        bounds: { x: 50, y: 25, width: 100, height: 50 }, // Overlaps with platform1
      });

      useEditorStore.getState().setCurrentLevel(level);
      useEditorStore.getState().placePlatform(platform1);
      
      // Try to place overlapping platform
      useEditorStore.getState().placePlatform(platform2);

      const state = useEditorStore.getState();
      // Should only have platform1 (platform2 was rejected due to overlap)
      expect(state.currentLevel?.platforms).toHaveLength(1);
      expect(state.currentLevel?.platforms[0].id).toBe('platform-1');
    });
  });

  describe('deletePlatform', () => {
    it('should remove platform from current level', () => {
      const platform1 = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      const platform2 = createPlatform({
        id: 'platform-2',
        levelId: 'level-1',
        bounds: { x: 200, y: 300, width: 60, height: 30 },
      });

      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });
      const levelWithPlatforms = updateLevel(level, { platforms: [platform1, platform2] });

      useEditorStore.getState().setCurrentLevel(levelWithPlatforms);
      useEditorStore.getState().deletePlatform('platform-1');

      const state = useEditorStore.getState();
      expect(state.currentLevel?.platforms).toHaveLength(1);
      expect(state.currentLevel?.platforms[0].id).toBe('platform-2');
    });

    it('should clear selected platform if it was deleted', () => {
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });
      const levelWithPlatform = updateLevel(level, { platforms: [platform] });

      useEditorStore.getState().setCurrentLevel(levelWithPlatform);
      useEditorStore.getState().setSelectedPlatform(platform);
      useEditorStore.getState().deletePlatform('platform-1');

      const state = useEditorStore.getState();
      expect(state.selectedPlatform).toBeNull();
    });

    it('should not delete platform when no current level', () => {
      useEditorStore.getState().deletePlatform('platform-1');
      const state = useEditorStore.getState();
      expect(state.currentLevel).toBeNull();
    });
  });

  describe('updatePlatformProperties', () => {
    it('should update platform properties', () => {
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        type: 'solid',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });
      const levelWithPlatform = updateLevel(level, { platforms: [platform] });

      useEditorStore.getState().setCurrentLevel(levelWithPlatform);
      useEditorStore.getState().updatePlatformProperties('platform-1', {
        type: 'moving',
        bounds: { x: 150, y: 250, width: 60, height: 25 },
      });

      const state = useEditorStore.getState();
      const updated = state.currentLevel?.platforms.find((p) => p.id === 'platform-1');
      expect(updated?.type).toBe('moving');
      expect(updated?.bounds.x).toBe(150);
      expect(updated?.bounds.y).toBe(250);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(platform.updatedAt);
    });

    it('should update selected platform if it was modified', () => {
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });

      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });
      const levelWithPlatform = updateLevel(level, { platforms: [platform] });

      useEditorStore.getState().setCurrentLevel(levelWithPlatform);
      useEditorStore.getState().setSelectedPlatform(platform);
      useEditorStore.getState().updatePlatformProperties('platform-1', {
        bounds: { x: 150, y: 250, width: 60, height: 25 },
      });

      const state = useEditorStore.getState();
      expect(state.selectedPlatform?.bounds.x).toBe(150);
      expect(state.selectedPlatform?.bounds.y).toBe(250);
    });

    it('should not update platform when no current level', () => {
      useEditorStore.getState().updatePlatformProperties('platform-1', { type: 'moving' });
      const state = useEditorStore.getState();
      expect(state.currentLevel).toBeNull();
    });

    it('should prevent updating platform if it would overlap', () => {
      const p1 = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 0, y: 0, width: 100, height: 50 },
      });
      const p2 = createPlatform({
        id: 'platform-2',
        levelId: 'level-1',
        bounds: { x: 150, y: 0, width: 100, height: 50 },
      });

      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });
      const levelWithPlatforms = updateLevel(level, { platforms: [p1, p2] });

      useEditorStore.getState().setCurrentLevel(levelWithPlatforms);
      useEditorStore.getState().setSelectedPlatform(p2);
      
      // Try to move p2 to overlap with p1
      useEditorStore.getState().updatePlatformProperties('platform-2', {
        bounds: { x: 50, y: 0, width: 100, height: 50 },
      });

      const state = useEditorStore.getState();
      // Platform should not have moved (still at x: 150)
      const updated = state.currentLevel?.platforms.find((p) => p.id === 'platform-2');
      expect(updated?.bounds.x).toBe(150);
    });
  });

  describe('updateLevelDimensions', () => {
    it('should update level width and height', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const originalUpdatedAt = level.updatedAt;
      useEditorStore.getState().setCurrentLevel(level);
      
      // Small delay to ensure timestamp difference
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          useEditorStore.getState().updateLevelDimensions(1200, 900);

          const state = useEditorStore.getState();
          expect(state.currentLevel?.width).toBe(1200);
          expect(state.currentLevel?.height).toBe(900);
          expect(state.currentLevel?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt);
          resolve();
        }, 10);
      });
    });

    it('should not update if no current level', () => {
      useEditorStore.getState().setCurrentLevel(null);
      
      // Should not throw
      useEditorStore.getState().updateLevelDimensions(1200, 900);
      
      const state = useEditorStore.getState();
      expect(state.currentLevel).toBeNull();
    });
  });
});
