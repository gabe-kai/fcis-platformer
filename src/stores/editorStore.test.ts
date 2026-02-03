import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editorStore';
import { createLevel, updateLevel } from '@/models/Level';
import { createPlatform } from '@/models/Platform';
import { getTileDefinition } from '@/models/Tile';
import type { TilePattern } from '@/types';

describe('EditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      currentLevel: null,
      selectedTool: 'select',
      selectedPlatform: null,
      gridEnabled: true,
      viewMode: 'texture',
      gridSize: 32,
      undoStack: [],
      redoStack: [],
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
      // New pattern state
      expect(state.selectedPattern).toBeNull();
      expect(state.selectedFillPattern == null).toBe(true); // null or undefined
      expect(state.selectedTileGroups).toEqual([]);
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

    it('should clear pendingTileGroupDelete when setting level to null', () => {
      const group = [{ cellX: 0, cellY: 0, tileId: 't1', passable: false }];
      useEditorStore.getState().setPendingTileGroupDelete(group);
      expect(useEditorStore.getState().pendingTileGroupDelete).toEqual(group);
      useEditorStore.getState().setCurrentLevel(null);
      expect(useEditorStore.getState().pendingTileGroupDelete).toBeNull();
    });

    it('should clear pendingPlaceOverwrite when setting level to null', () => {
      const payload = {
        minCellX: 0,
        maxCellX: 1,
        minCellY: 0,
        maxCellY: 1,
        tileId: 'solid',
        passable: false,
        overlappingCells: [{ cellX: 0, cellY: 0 }],
      };
      useEditorStore.getState().setPendingPlaceOverwrite(payload);
      expect(useEditorStore.getState().pendingPlaceOverwrite).toEqual(payload);
      useEditorStore.getState().setCurrentLevel(null);
      expect(useEditorStore.getState().pendingPlaceOverwrite).toBeNull();
    });

    it('should clear pendingPlaceOverwrite when loading a level', () => {
      const payload = {
        minCellX: 0,
        maxCellX: 1,
        minCellY: 0,
        maxCellY: 1,
        tileId: 'solid',
        passable: false,
        overlappingCells: [{ cellX: 0, cellY: 0 }],
      };
      useEditorStore.getState().setPendingPlaceOverwrite(payload);
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      expect(useEditorStore.getState().pendingPlaceOverwrite).toBeNull();
    });

    it('should compute validation warnings when setting level', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const warnings = useEditorStore.getState().levelValidationWarnings;
      // Empty level should have both warnings
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
    });

    it('should compute validation warnings when level is set to null', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      useEditorStore.getState().setCurrentLevel(null);
      const warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
    });

    it('should clear undo and redo stacks when setting level to null', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const tile = getTileDefinition('solid-block');
      if (tile) useEditorStore.getState().setTileAtCell(tile.id, 0, 0, false);
      expect(useEditorStore.getState().undoStack.length).toBeGreaterThan(0);
      useEditorStore.getState().setCurrentLevel(null);
      expect(useEditorStore.getState().undoStack).toHaveLength(0);
      expect(useEditorStore.getState().redoStack).toHaveLength(0);
    });

    it('should clear undo and redo stacks when loading a level', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const tile = getTileDefinition('solid-block');
      if (tile) useEditorStore.getState().setTileAtCell(tile.id, 0, 0, false);
      const level2 = createLevel({
        id: 'level-2',
        gameId: 'game-1',
        title: 'Other',
        width: 5,
        height: 5,
      });
      useEditorStore.getState().setCurrentLevel(level2);
      expect(useEditorStore.getState().undoStack).toHaveLength(0);
      expect(useEditorStore.getState().redoStack).toHaveLength(0);
    });
  });

  describe('setPendingTileGroupDelete', () => {
    it('should set and clear pending tile group for delete confirmation', () => {
      const group = [
        { cellX: 0, cellY: 0, tileId: 't1', passable: false },
        { cellX: 1, cellY: 0, tileId: 't1', passable: false },
      ];
      useEditorStore.getState().setPendingTileGroupDelete(group);
      expect(useEditorStore.getState().pendingTileGroupDelete).toEqual(group);
      useEditorStore.getState().setPendingTileGroupDelete(null);
      expect(useEditorStore.getState().pendingTileGroupDelete).toBeNull();
    });
  });

  describe('setPendingPlaceOverwrite', () => {
    it('should set and clear pending place overwrite for confirmation', () => {
      const payload = {
        minCellX: 0,
        maxCellX: 2,
        minCellY: 0,
        maxCellY: 1,
        tileId: 'solid',
        passable: false,
        overlappingCells: [{ cellX: 1, cellY: 0 }, { cellX: 2, cellY: 0 }],
      };
      useEditorStore.getState().setPendingPlaceOverwrite(payload);
      expect(useEditorStore.getState().pendingPlaceOverwrite).toEqual(payload);
      useEditorStore.getState().setPendingPlaceOverwrite(null);
      expect(useEditorStore.getState().pendingPlaceOverwrite).toBeNull();
    });
  });

  describe('fill patterns', () => {
    it('should set and clear selected fill pattern id', () => {
      const store = useEditorStore.getState();
      expect(store.selectedFillPattern).toBeNull();

      store.setSelectedFillPattern('fill-bricks');
      expect(useEditorStore.getState().selectedFillPattern).toBe('fill-bricks');

      store.setSelectedFillPattern(null);
      expect(useEditorStore.getState().selectedFillPattern).toBeNull();
    });

    it('should set fill pattern on a single cell', () => {
      const level = createLevel({
        id: 'level-fill-1',
        gameId: 'game-1',
        title: 'Fill Pattern Test',
        width: 4,
        height: 4,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const tile = getTileDefinition('solid-block');
      expect(tile).toBeDefined();

      if (tile) {
        // Place a tile at (1,1) so the cell exists with a tileId
        useEditorStore.getState().setTileAtCell(tile.id, 1, 1, false);
      }

      useEditorStore.getState().setFillPatternAtCell('fill-bricks', 1, 1);
      const updated = useEditorStore.getState().currentLevel;
      expect(updated).not.toBeNull();
      if (!updated) return;
      expect(updated.tileGrid[1][1].fillPatternId).toBe('fill-bricks');
    });

    it('should set fill pattern on a group of cells', () => {
      const level = createLevel({
        id: 'level-fill-2',
        gameId: 'game-1',
        title: 'Fill Pattern Group Test',
        width: 4,
        height: 4,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const tile = getTileDefinition('solid-block');
      expect(tile).toBeDefined();

      if (tile) {
        useEditorStore.getState().setTileAtCell(tile.id, 0, 0, false);
        useEditorStore.getState().setTileAtCell(tile.id, 1, 0, false);
      }

      const cells = [
        { cellX: 0, cellY: 0 },
        { cellX: 1, cellY: 0 },
      ];
      useEditorStore.getState().setFillPatternOnGroup('fill-bricks', cells);
      const updated = useEditorStore.getState().currentLevel;
      expect(updated).not.toBeNull();
      if (!updated) return;
      expect(updated.tileGrid[0][0].fillPatternId).toBe('fill-bricks');
      expect(updated.tileGrid[0][1].fillPatternId).toBe('fill-bricks');
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

    it('should clear selectedTileEntry and selectedTileGroup when platform is selected', () => {
      // First set a tile entry
      useEditorStore.getState().setSelectedTileEntry({
        cellX: 0,
        cellY: 0,
        tileId: 'test-tile',
        passable: false,
      });
      expect(useEditorStore.getState().selectedTileEntry).not.toBeNull();

      // Now select a platform - should clear the tile entry
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });
      useEditorStore.getState().setSelectedPlatform(platform);

      const state = useEditorStore.getState();
      expect(state.selectedPlatform).toEqual(platform);
      expect(state.selectedTileEntry).toBeNull();
      expect(state.selectedTileGroup).toBeNull();
    });
  });

  describe('setSelectedTileEntry', () => {
    it('should set selected tile entry', () => {
      const entry = {
        cellX: 5,
        cellY: 3,
        tileId: 'test-tile',
        passable: false,
      };
      useEditorStore.getState().setSelectedTileEntry(entry);

      const state = useEditorStore.getState();
      expect(state.selectedTileEntry).toEqual(entry);
    });

    it('should clear selectedPlatform when tile entry is set', () => {
      // First select a platform
      const platform = createPlatform({
        id: 'platform-1',
        levelId: 'level-1',
        bounds: { x: 100, y: 200, width: 50, height: 20 },
      });
      useEditorStore.getState().setSelectedPlatform(platform);
      expect(useEditorStore.getState().selectedPlatform).not.toBeNull();

      // Now set a tile entry - should clear the platform
      useEditorStore.getState().setSelectedTileEntry({
        cellX: 0,
        cellY: 0,
        tileId: 'test-tile',
        passable: false,
      });

      const state = useEditorStore.getState();
      expect(state.selectedTileEntry).not.toBeNull();
      expect(state.selectedPlatform).toBeNull();
    });

    it('should clear selectedTileGroup when tile entry is set to null', () => {
      // Set both tile entry and group
      useEditorStore.getState().setSelectedTileEntry({
        cellX: 0,
        cellY: 0,
        tileId: 'test-tile',
        passable: false,
      });
      useEditorStore.getState().setSelectedTileGroup([
        { cellX: 0, cellY: 0, tileId: 'test-tile', passable: false },
      ]);

      // Clear tile entry
      useEditorStore.getState().setSelectedTileEntry(null);

      const state = useEditorStore.getState();
      expect(state.selectedTileEntry).toBeNull();
      expect(state.selectedTileGroup).toBeNull();
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

  describe('cleanupOrphanedPlatforms', () => {
    it('should return 0 when no current level', () => {
      const count = useEditorStore.getState().cleanupOrphanedPlatforms();
      expect(count).toBe(0);
    });

    it('should return 0 when no platforms are orphaned', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
        gridSize: 64,
      });
      const platform = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 64, y: 64, width: 64, height: 64 },
      });
      useEditorStore.getState().setCurrentLevel(updateLevel(level, { platforms: [platform] }));
      useEditorStore.getState().setTileAtCell('solid', 1, 1, false);

      const count = useEditorStore.getState().cleanupOrphanedPlatforms();
      expect(count).toBe(0);
      expect(useEditorStore.getState().currentLevel?.platforms).toHaveLength(1);
    });

    it('should remove orphaned platforms and return count', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
        gridSize: 64,
      });
      const withTiles = updateLevel(level, { platforms: [
        createPlatform({ id: 'p1', levelId: 'level-1', bounds: { x: 0, y: 0, width: 64, height: 64 } }),
        createPlatform({ id: 'p2', levelId: 'level-1', bounds: { x: 128, y: 128, width: 64, height: 64 } }),
      ] });
      useEditorStore.getState().setCurrentLevel(withTiles);
      useEditorStore.getState().setTileAtCell('solid', 0, 0, false);
      // p2 has no tiles (cell 2,2 is empty) -> orphaned

      const count = useEditorStore.getState().cleanupOrphanedPlatforms();
      expect(count).toBe(1);
      const state = useEditorStore.getState();
      expect(state.currentLevel?.platforms).toHaveLength(1);
      expect(state.currentLevel?.platforms[0].id).toBe('p1');
    });

    it('should clear selected platform if it was orphaned and removed', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
        gridSize: 64,
      });
      const platform = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 128, y: 128, width: 64, height: 64 },
      });
      useEditorStore.getState().setCurrentLevel(updateLevel(level, { platforms: [platform] }));
      useEditorStore.getState().setSelectedPlatform(platform);
      // No tiles under p1

      useEditorStore.getState().cleanupOrphanedPlatforms();
      expect(useEditorStore.getState().selectedPlatform).toBeNull();
    });
  });

  describe('removeTileAtCell removes orphaned platforms', () => {
    it('should remove platform when last tile in its bounds is removed', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
        gridSize: 64,
      });
      const platform = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 64, y: 64, width: 64, height: 64 },
      });
      const levelWithPlatform = updateLevel(level, { platforms: [platform] });
      useEditorStore.getState().setCurrentLevel(levelWithPlatform);
      useEditorStore.getState().setTileAtCell('solid', 1, 1, false);

      useEditorStore.getState().removeTileAtCell(1, 1);

      const state = useEditorStore.getState();
      expect(state.currentLevel?.platforms).toHaveLength(0);
      expect(state.currentLevel?.tileGrid?.[1]?.[1]?.tileId).toBeUndefined();
    });
  });

  describe('removeTilesInRange removes orphaned platforms', () => {
    it('should remove platforms that have no tiles after range removal', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
        gridSize: 64,
      });
      const platform = createPlatform({
        id: 'p1',
        levelId: 'level-1',
        bounds: { x: 64, y: 64, width: 64, height: 64 },
      });
      const levelWithPlatform = updateLevel(level, { platforms: [platform] });
      useEditorStore.getState().setCurrentLevel(levelWithPlatform);
      useEditorStore.getState().setTileAtCell('solid', 1, 1, false);

      useEditorStore.getState().removeTilesInRange(0, 0, 5, 5);

      const state = useEditorStore.getState();
      expect(state.currentLevel?.platforms).toHaveLength(0);
    });
  });

  describe('placePatternAt with moving platform pattern', () => {
    it('should auto-create moving platform when pattern contains moving platform tiles', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 20,
        height: 20,
        gridSize: 64,
      });
      useEditorStore.getState().setCurrentLevel(level);

      const pattern: TilePattern = {
        id: 'moving-h',
        name: 'Moving Platform H',
        cells: [
          { relX: 0, relY: 0, tileId: 'platform-moving-horizontal', passable: false, layer: 'primary' },
        ],
        createdAt: Date.now(),
      };

      useEditorStore.getState().placePatternAt(2, 3, pattern);

      const state = useEditorStore.getState();
      expect(state.currentLevel?.platforms).toHaveLength(1);
      const platform = state.currentLevel!.platforms[0];
      expect(platform.type).toBe('moving');
      expect(platform.movementPath).toBeDefined();
      expect(platform.movementPath!.length).toBeGreaterThanOrEqual(2);
      expect(platform.movementSpeed).toBe(100);
      expect(state.currentLevel?.tileGrid?.[3]?.[2]?.tileId).toBe('platform-moving-horizontal');
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

  describe('levelValidationWarnings', () => {
    it('should update warnings when placing spawn tile', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      
      // Initially should have warnings
      let warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
      
      // Place spawn tile
      const spawnTile = getTileDefinition('spawn-player');
      if (!spawnTile) throw new Error('spawn-player tile not found');
      useEditorStore.getState().setTileAtCell(spawnTile.id, 0, 0, false);
      
      // Warnings should update
      warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(false);
      expect(warnings.missingWin).toBe(true);
    });

    it('should update warnings when placing win tile', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      
      // Place win tile
      const goalTile = getTileDefinition('goal-flag');
      if (!goalTile) throw new Error('goal-flag tile not found');
      useEditorStore.getState().setTileAtCell(goalTile.id, 5, 5, false);
      
      // Warnings should update
      const warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(false);
    });

    it('should update warnings when removing spawn tile', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      const spawnTile = getTileDefinition('spawn-player');
      if (!spawnTile) throw new Error('spawn-player tile not found');
      
      // Place spawn first using store
      useEditorStore.getState().setCurrentLevel(level);
      useEditorStore.getState().setTileAtCell(spawnTile.id, 0, 0, false);
      let warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(false);
      
      // Remove spawn
      useEditorStore.getState().removeTileAtCell(0, 0);
      
      // Warnings should update
      warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(true);
    });

    it('should update warnings when placing both spawn and win tiles', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      
      // Initially should have warnings
      let warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
      
      // Place spawn
      const spawnTile = getTileDefinition('spawn-player');
      const goalTile = getTileDefinition('goal-flag');
      if (!spawnTile || !goalTile) throw new Error('Required tiles not found');
      
      useEditorStore.getState().setTileAtCell(spawnTile.id, 0, 0, false);
      warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(false);
      expect(warnings.missingWin).toBe(true);
      
      // Place win
      useEditorStore.getState().setTileAtCell(goalTile.id, 5, 5, false);
      warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(false);
      expect(warnings.missingWin).toBe(false);
    });

    it('should update warnings when removing tiles in range', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      const spawnTile = getTileDefinition('spawn-player');
      if (!spawnTile) throw new Error('spawn-player tile not found');
      
      // Place spawn
      useEditorStore.getState().setCurrentLevel(level);
      useEditorStore.getState().setTileAtCell(spawnTile.id, 0, 0, false);
      let warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(false);
      
      // Remove tiles in range that includes spawn
      useEditorStore.getState().removeTilesInRange(0, 0, 2, 2);
      
      // Warnings should update
      warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(true);
    });

    it('should update warnings when level dimensions change', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      const spawnTile = getTileDefinition('spawn-player');
      if (!spawnTile) throw new Error('spawn-player tile not found');
      
      // Place spawn at (0, 0)
      useEditorStore.getState().setCurrentLevel(level);
      useEditorStore.getState().setTileAtCell(spawnTile.id, 0, 0, false);
      let warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(false);
      
      // Resize to smaller dimensions (might remove spawn)
      useEditorStore.getState().updateLevelDimensions(5, 5);
      
      // Warnings should be recomputed (spawn might still be there if within new bounds)
      warnings = useEditorStore.getState().levelValidationWarnings;
      // Spawn at (0,0) should still be in 5x5 grid, so no warning
      expect(warnings.missingSpawn).toBe(false);
    });

    it('should update warnings when level is updated', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      
      // Initially should have warnings
      let warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
      
      // Update level (e.g., change title) - should recompute warnings
      useEditorStore.getState().updateLevel({ title: 'Updated Title' });
      
      // Warnings should still be present (no tiles added)
      warnings = useEditorStore.getState().levelValidationWarnings;
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
    });
  });

  describe('undo and redo', () => {
    it('should have empty undo and redo stacks initially', () => {
      const state = useEditorStore.getState();
      expect(state.undoStack).toHaveLength(0);
      expect(state.redoStack).toHaveLength(0);
      expect(state.maxUndoSteps).toBe(16);
    });

    it('should push snapshot on setTileAtCell and clear redo', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const tile = getTileDefinition('solid-block');
      if (!tile) throw new Error('solid-block tile not found');

      useEditorStore.getState().setTileAtCell(tile.id, 0, 0, false);
      let state = useEditorStore.getState();
      expect(state.undoStack).toHaveLength(1);
      expect(state.redoStack).toHaveLength(0);
      expect(state.currentLevel?.tileGrid?.[0]?.[0]?.tileId).toBe(tile.id);

      useEditorStore.getState().undo();
      state = useEditorStore.getState();
      expect(state.undoStack).toHaveLength(0);
      expect(state.redoStack).toHaveLength(1);
      expect(state.currentLevel?.tileGrid?.[0]?.[0]?.tileId).toBeUndefined();
      expect(state.selectedTileEntry).toBeNull();
      expect(state.selectedTileGroup).toBeNull();

      useEditorStore.getState().redo();
      state = useEditorStore.getState();
      expect(state.undoStack).toHaveLength(1);
      expect(state.redoStack).toHaveLength(0);
      expect(state.currentLevel?.tileGrid?.[0]?.[0]?.tileId).toBe(tile.id);
    });

    it('should do nothing when undo called with empty undo stack', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const before = useEditorStore.getState().currentLevel;
      useEditorStore.getState().undo();
      const after = useEditorStore.getState().currentLevel;
      expect(after).toEqual(before);
      expect(useEditorStore.getState().undoStack).toHaveLength(0);
    });

    it('should do nothing when redo called with empty redo stack', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const tile = getTileDefinition('solid-block');
      if (tile) useEditorStore.getState().setTileAtCell(tile.id, 0, 0, false);
      const before = useEditorStore.getState().currentLevel;
      useEditorStore.getState().redo();
      const after = useEditorStore.getState().currentLevel;
      expect(after).toEqual(before);
      expect(useEditorStore.getState().redoStack).toHaveLength(0);
    });

    it('should cap undo stack at maxUndoSteps', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 20,
        height: 20,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const tile = getTileDefinition('solid-block');
      if (!tile) throw new Error('solid-block tile not found');
      for (let i = 0; i < 20; i++) {
        useEditorStore.getState().setTileAtCell(tile.id, i % 10, Math.floor(i / 10), false);
      }
      const state = useEditorStore.getState();
      expect(state.undoStack.length).toBeLessThanOrEqual(state.maxUndoSteps);
      expect(state.undoStack.length).toBe(16);
    });

    it('should undo removeTileAtCell', () => {
      const level = createLevel({
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test',
        width: 10,
        height: 10,
      });
      useEditorStore.getState().setCurrentLevel(level);
      const tile = getTileDefinition('solid-block');
      if (!tile) throw new Error('solid-block tile not found');
      useEditorStore.getState().setTileAtCell(tile.id, 1, 1, false);
      expect(useEditorStore.getState().currentLevel?.tileGrid?.[1]?.[1]?.tileId).toBe(tile.id);
      useEditorStore.getState().removeTileAtCell(1, 1);
      expect(useEditorStore.getState().currentLevel?.tileGrid?.[1]?.[1]?.tileId).toBeUndefined();
      useEditorStore.getState().undo();
      expect(useEditorStore.getState().currentLevel?.tileGrid?.[1]?.[1]?.tileId).toBe(tile.id);
    });
  });
});
