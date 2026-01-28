import type { TileCell } from '@/models/Level';
import { logger } from '@/utils/logger';

/**
 * Gets the tile at a specific grid cell, or null if empty
 */
export function getTileAtCell(
  tileGrid: TileCell[][],
  cellX: number,
  cellY: number
): TileCell | null {
  if (cellY < 0 || cellY >= tileGrid.length) return null;
  if (cellX < 0 || cellX >= tileGrid[cellY].length) return null;
  return tileGrid[cellY][cellX] || null;
}

/**
 * Sets a tile at a specific grid cell (replaces existing tile if any)
 */
export function setTileAtCell(
  tileGrid: TileCell[][],
  tileId: string,
  cellX: number,
  cellY: number,
  passable: boolean = false
): TileCell[][] {
  logger.debug('Setting tile at cell', {
    component: 'TileMapUtils',
    operation: 'setTileAtCell',
    tileId,
    cellX,
    cellY,
  });

  if (cellY < 0 || cellY >= tileGrid.length) return tileGrid;
  if (cellX < 0 || cellX >= tileGrid[cellY].length) return tileGrid;

  const existingCell = tileGrid[cellY]?.[cellX];
  const nextGrid = tileGrid.map((row, y) =>
    y === cellY ? row.map((cell, x) =>
      x === cellX
        ? {
            passable,
            tileId,
            layer: existingCell?.layer || 'primary',
            displayName: existingCell?.displayName,
            properties: existingCell?.properties,
          }
        : cell
    ) : row
  );

  return nextGrid;
}

/**
 * Removes a tile from a specific grid cell
 */
export function removeTileAtCell(
  tileGrid: TileCell[][],
  cellX: number,
  cellY: number
): TileCell[][] {
  logger.debug('Removing tile at cell', {
    component: 'TileMapUtils',
    operation: 'removeTileAtCell',
    cellX,
    cellY,
  });

  if (cellY < 0 || cellY >= tileGrid.length) return tileGrid;
  if (cellX < 0 || cellX >= tileGrid[cellY].length) return tileGrid;

  const existingCell = tileGrid[cellY]?.[cellX];
  const nextGrid = tileGrid.map((row, y) =>
    y === cellY ? row.map((cell, x) => {
      if (x === cellX) {
        return {
          passable: true,
          layer: existingCell?.layer || 'primary',
          properties: existingCell?.properties,
        };
      }
      return cell;
    }) : row
  );

  return nextGrid;
}

/**
 * Removes tiles in a range of cells
 */
export function removeTilesInRange(
  tileGrid: TileCell[][],
  minCellX: number,
  minCellY: number,
  maxCellX: number,
  maxCellY: number
): TileCell[][] {
  logger.debug('Removing tiles in range', {
    component: 'TileMapUtils',
    operation: 'removeTilesInRange',
    minCellX,
    minCellY,
    maxCellX,
    maxCellY,
  });

  const nextGrid = tileGrid.map((row, y) => {
    if (y < minCellY || y > maxCellY) return row;
    return row.map((cell, x) => {
      if (x < minCellX || x > maxCellX) return cell;
      return { passable: true };
    });
  });

  return nextGrid;
}

/**
 * Resizes a tile grid, preserving existing cells where possible
 */
export function resizeTileGrid(
  tileGrid: TileCell[][],
  widthTiles: number,
  heightTiles: number
): TileCell[][] {
  const nextGrid: TileCell[][] = [];

  for (let y = 0; y < heightTiles; y++) {
    const row: TileCell[] = [];
    for (let x = 0; x < widthTiles; x++) {
      const existing = tileGrid[y]?.[x];
      row.push(existing ? { ...existing } : { passable: true, layer: 'primary' });
    }
    nextGrid.push(row);
  }

  return nextGrid;
}

/**
 * Updates the display name of a single cell
 */
export function updateCellDisplayName(
  tileGrid: TileCell[][],
  cellX: number,
  cellY: number,
  displayName: string | undefined
): TileCell[][] {
  if (cellY < 0 || cellY >= tileGrid.length) return tileGrid;
  if (cellX < 0 || cellX >= tileGrid[cellY].length) return tileGrid;

  return tileGrid.map((row, y) =>
    y === cellY
      ? row.map((cell, x) =>
          x === cellX ? { ...cell, displayName: displayName || undefined } : cell
        )
      : row
  );
}

/**
 * Computes a stable group id from a list of connected tile entries (same tileId).
 * Uses min cell position: `${tileId}-${minX}-${minY}`.
 */
export function getGroupId(entries: Array<{ cellX: number; cellY: number; tileId: string }>): string {
  if (entries.length === 0) return '';
  const tileId = entries[0].tileId;
  let minX = entries[0].cellX;
  let minY = entries[0].cellY;
  for (const e of entries) {
    if (e.cellX < minX) minX = e.cellX;
    if (e.cellY < minY) minY = e.cellY;
  }
  return `${tileId}-${minX}-${minY}`;
}

// Note: worldToCell, cellToWorld, worldToCanvas, and canvasToWorld have been removed.
// Use cellCoordinates.ts functions instead: cellToCanvas, canvasToCell

// Note: getTileCells removed - all tiles are now 1×1 cells
// Multi-tile visuals are groups of standard 1×1 tiles
