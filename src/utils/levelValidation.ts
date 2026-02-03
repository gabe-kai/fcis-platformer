import type { Level } from '@/models/Level';
import { getTileDefinition } from '@/models/Tile';
import { getTileAtCell } from './tileMapUtils';

/**
 * Level validation warnings (non-blocking)
 */
export interface LevelValidationWarnings {
  missingSpawn: boolean;
  missingWin: boolean;
}

/**
 * Validates a level and returns warnings (non-blocking).
 * Checks for required gameplay elements: spawn point and win condition.
 * 
 * @param level - The level to validate
 * @returns Warnings object indicating missing elements
 */
export function validateLevel(level: Level | null): LevelValidationWarnings {
  if (!level || !level.tileGrid) {
    return {
      missingSpawn: true,
      missingWin: true,
    };
  }

  const tileGrid = level.tileGrid;
  let hasSpawn = false;
  let hasWin = false;

  // Scan all cells in the primary layer for spawn and win tiles
  for (let y = 0; y < tileGrid.length; y++) {
    const row = tileGrid[y];
    for (let x = 0; x < row.length; x++) {
      const cell = getTileAtCell(tileGrid, x, y);
      if (!cell?.tileId || cell.layer !== 'primary') continue;

      const tileDef = getTileDefinition(cell.tileId);
      if (!tileDef) continue;

      // Check for spawn point (type='spawn' with spawnType='player')
      if (tileDef.type === 'spawn' && tileDef.properties?.spawnType === 'player') {
        hasSpawn = true;
      }

      // Check for win condition (type='goal')
      if (tileDef.type === 'goal') {
        hasWin = true;
      }

      // Early exit if both found
      if (hasSpawn && hasWin) break;
    }
    if (hasSpawn && hasWin) break;
  }

  return {
    missingSpawn: !hasSpawn,
    missingWin: !hasWin,
  };
}
