import { describe, it, expect } from 'vitest';
import { validateLevel } from './levelValidation';
import { createLevel } from '@/models/Level';
import { setTileAtCell } from './tileMapUtils';
import { getTileDefinition } from '@/models/Tile';

describe('levelValidation', () => {
  describe('validateLevel', () => {
    it('returns warnings for missing spawn and win when level is null', () => {
      const warnings = validateLevel(null);
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
    });

    it('returns warnings for missing spawn and win when level has no tileGrid', () => {
      const level = createLevel({
        id: 'test-level',
        gameId: 'test-game',
        title: 'Test',
        width: 10,
        height: 10,
      });
      // Remove tileGrid
      const levelWithoutGrid = { ...level, tileGrid: [] };
      const warnings = validateLevel(levelWithoutGrid as typeof level);
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
    });

    it('returns warnings when level has empty tileGrid', () => {
      const level = createLevel({
        id: 'test-level',
        gameId: 'test-game',
        title: 'Test',
        width: 10,
        height: 10,
      });
      const warnings = validateLevel(level);
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
    });

    it('returns warning for missing spawn when only win tile is present', () => {
      const level = createLevel({
        id: 'test-level',
        gameId: 'test-game',
        title: 'Test',
        width: 10,
        height: 10,
      });
      const goalTile = getTileDefinition('goal-flag');
      if (!goalTile) throw new Error('goal-flag tile not found');
      
      let tileGrid = level.tileGrid || [];
      tileGrid = setTileAtCell(tileGrid, goalTile.id, 5, 5, false);
      const levelWithGoal = { ...level, tileGrid };
      
      const warnings = validateLevel(levelWithGoal);
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(false);
    });

    it('returns warning for missing win when only spawn tile is present', () => {
      const level = createLevel({
        id: 'test-level',
        gameId: 'test-game',
        title: 'Test',
        width: 10,
        height: 10,
      });
      const spawnTile = getTileDefinition('spawn-player');
      if (!spawnTile) throw new Error('spawn-player tile not found');
      
      let tileGrid = level.tileGrid || [];
      tileGrid = setTileAtCell(tileGrid, spawnTile.id, 0, 0, false);
      const levelWithSpawn = { ...level, tileGrid };
      
      const warnings = validateLevel(levelWithSpawn);
      expect(warnings.missingSpawn).toBe(false);
      expect(warnings.missingWin).toBe(true);
    });

    it('returns no warnings when both spawn and win tiles are present', () => {
      const level = createLevel({
        id: 'test-level',
        gameId: 'test-game',
        title: 'Test',
        width: 10,
        height: 10,
      });
      const spawnTile = getTileDefinition('spawn-player');
      const goalTile = getTileDefinition('goal-flag');
      if (!spawnTile || !goalTile) throw new Error('Required tiles not found');
      
      let tileGrid = level.tileGrid || [];
      tileGrid = setTileAtCell(tileGrid, spawnTile.id, 0, 0, false);
      tileGrid = setTileAtCell(tileGrid, goalTile.id, 9, 9, false);
      const levelWithBoth = { ...level, tileGrid };
      
      const warnings = validateLevel(levelWithBoth);
      expect(warnings.missingSpawn).toBe(false);
      expect(warnings.missingWin).toBe(false);
    });

    it('only checks tiles on primary layer', () => {
      const level = createLevel({
        id: 'test-level',
        gameId: 'test-game',
        title: 'Test',
        width: 10,
        height: 10,
      });
      const spawnTile = getTileDefinition('spawn-player');
      if (!spawnTile) throw new Error('spawn-player tile not found');
      
      // Place spawn on background layer (should be ignored)
      let tileGrid = level.tileGrid || [];
      const cell = tileGrid[0]?.[0];
      if (cell) {
        tileGrid[0][0] = {
          ...cell,
          tileId: spawnTile.id,
          layer: 'background',
        };
      }
      const levelWithSpawnOnBackground = { ...level, tileGrid };
      
      const warnings = validateLevel(levelWithSpawnOnBackground);
      // Should still warn because spawn is not on primary layer
      expect(warnings.missingSpawn).toBe(true);
      expect(warnings.missingWin).toBe(true);
    });

    it('finds spawn and win tiles at any position in the grid', () => {
      const level = createLevel({
        id: 'test-level',
        gameId: 'test-game',
        title: 'Test',
        width: 20,
        height: 20,
      });
      const spawnTile = getTileDefinition('spawn-player');
      const goalTile = getTileDefinition('goal-flag');
      if (!spawnTile || !goalTile) throw new Error('Required tiles not found');
      
      let tileGrid = level.tileGrid || [];
      // Place at different positions
      tileGrid = setTileAtCell(tileGrid, spawnTile.id, 3, 7, false);
      tileGrid = setTileAtCell(tileGrid, goalTile.id, 15, 12, false);
      const levelWithBoth = { ...level, tileGrid };
      
      const warnings = validateLevel(levelWithBoth);
      expect(warnings.missingSpawn).toBe(false);
      expect(warnings.missingWin).toBe(false);
    });
  });
});
