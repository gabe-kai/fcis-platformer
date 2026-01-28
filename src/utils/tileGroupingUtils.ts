import type { TileCell } from '@/models/Level';
import { logger } from '@/utils/logger';

export interface TileCellEntry {
  cellX: number;
  cellY: number;
  tileId: string;
  passable: boolean;
}

/**
 * Finds all tiles that are connected (contiguous) to a given tile
 * Uses flood-fill algorithm to find connected tiles of the same type
 * 
 * @param tileGrid - The tile grid to search
 * @param startCellX - Starting cell X coordinate
 * @param startCellY - Starting cell Y coordinate
 * @param tileId - Optional: only group tiles with this tileId (if not provided, groups all adjacent tiles)
 * @returns Array of tile entries that are connected
 */
export function findConnectedTiles(
  tileGrid: TileCell[][],
  startCellX: number,
  startCellY: number,
  tileId?: string
): TileCellEntry[] {
  logger.debug('Finding connected tiles', {
    component: 'TileGroupingUtils',
    operation: 'findConnectedTiles',
    startCellX,
    startCellY,
    tileId,
  });

  const startRow = tileGrid[startCellY];
  const startCell = startRow?.[startCellX];

  if (!startCell || !startCell.tileId) {
    return [];
  }

  // If tileId is provided, only group tiles of that type
  const targetTileId = tileId || startCell.tileId;
  const visited = new Set<string>();
  const connected: TileCellEntry[] = [];
  const queue: Array<{ cellX: number; cellY: number }> = [{ cellX: startCellX, cellY: startCellY }];

  const getKey = (cellX: number, cellY: number) => `${cellX},${cellY}`;

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = getKey(current.cellX, current.cellY);

    if (visited.has(key)) {
      continue;
    }

    visited.add(key);

    const row = tileGrid[current.cellY];
    const cell = row?.[current.cellX];

    if (!cell || cell.tileId !== targetTileId) {
      continue;
    }

    connected.push({
      cellX: current.cellX,
      cellY: current.cellY,
      tileId: cell.tileId,
      passable: cell.passable,
    });

    // Check all 4 adjacent cells (up, down, left, right)
    const neighbors = [
      { cellX: current.cellX + 1, cellY: current.cellY }, // Right
      { cellX: current.cellX - 1, cellY: current.cellY }, // Left
      { cellX: current.cellX, cellY: current.cellY + 1 }, // Up
      { cellX: current.cellX, cellY: current.cellY - 1 }, // Down
    ];

    for (const neighbor of neighbors) {
      const neighborKey = getKey(neighbor.cellX, neighbor.cellY);
      if (!visited.has(neighborKey)) {
        queue.push(neighbor);
      }
    }
  }

  logger.info('Found connected tiles', {
    component: 'TileGroupingUtils',
    operation: 'findConnectedTiles',
    count: connected.length,
  });

  return connected;
}

/**
 * Groups tiles by connectivity (finds all separate groups of connected tiles)
 * 
 * @param tileGrid - The tile grid to group
 * @param tileId - Optional: only group tiles with this tileId
 * @returns Array of tile groups, where each group is an array of connected tiles
 */
export function groupTilesByConnectivity(
  tileGrid: TileCell[][],
  tileId?: string
): Array<TileCellEntry[]> {
  logger.debug('Grouping tiles by connectivity', {
    component: 'TileGroupingUtils',
    operation: 'groupTilesByConnectivity',
    tileId,
  });

  const groups: Array<TileCellEntry[]> = [];
  const processed = new Set<string>();

  const getKey = (entry: TileCellEntry) => `${entry.cellX},${entry.cellY}`;

  for (let y = 0; y < tileGrid.length; y++) {
    for (let x = 0; x < tileGrid[y].length; x++) {
      const cell = tileGrid[y][x];
      if (!cell?.tileId) continue;
      if (tileId && cell.tileId !== tileId) continue;

      const key = `${x},${y}`;
      if (processed.has(key)) continue;

      const connected = findConnectedTiles(tileGrid, x, y, tileId);
      for (const connectedTile of connected) {
        processed.add(getKey(connectedTile));
      }
      if (connected.length > 0) {
        groups.push(connected);
      }
    }
  }

  logger.info('Grouped tiles', {
    component: 'TileGroupingUtils',
    operation: 'groupTilesByConnectivity',
    groupCount: groups.length,
  });

  return groups;
}
