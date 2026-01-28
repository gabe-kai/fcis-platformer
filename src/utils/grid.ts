import { logger } from '@/utils/logger';
import { getVisibleCells } from './cellCoordinates';
import { cellToCanvas } from './cellCoordinates';

/**
 * Calculates the grid position for a given coordinate, snapping to the nearest grid cell.
 * 
 * @param x - The x coordinate in pixels
 * @param y - The y coordinate in pixels
 * @param gridSize - The size of each grid cell in pixels
 * @returns The snapped grid position
 */
export function calculateGridPosition(x: number, y: number, gridSize: number): { x: number; y: number } {
  logger.debug('Calculating grid position', {
    component: 'GridUtils',
    operation: 'calculateGridPosition',
  }, { x, y, gridSize });

  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
  };
}

/**
 * Snaps a single value to the nearest grid cell.
 * 
 * @param value - The value to snap
 * @param gridSize - The size of each grid cell in pixels
 * @returns The snapped value
 */
export function snapToGrid(value: number, gridSize: number): number {
  // JS `Math.round` rounds -0.5 to -0 (tie goes toward +Infinity),
  // which breaks symmetric snapping for negative values. We want
  // snapping to behave the same in both directions, so we round the
  // magnitude then re-apply the sign.
  const snappedMagnitude = Math.round(Math.abs(value) / gridSize) * gridSize;
  if (snappedMagnitude === 0) return 0;
  return Math.sign(value) * snappedMagnitude;
}

/**
 * Draws a grid overlay on a canvas context using cell-based coordinates.
 * 
 * @param ctx - The canvas 2D rendering context
 * @param gridSize - The size of each grid cell in pixels
 * @param zoom - Current zoom level
 * @param scrollLeft - Scroll position from left (pixels)
 * @param scrollTop - Scroll position from top (pixels)
 * @param canvasWidth - The width of the canvas
 * @param canvasHeight - The height of the canvas
 * @param mapWidthCells - Width of map in cells
 * @param mapHeightCells - Height of map in cells
 * @param color - Optional grid line color (default: rgba(255, 255, 255, 0.2))
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  gridSize: number,
  zoom: number,
  scrollLeft: number,
  scrollTop: number,
  canvasWidth: number,
  canvasHeight: number,
  mapWidthCells: number,
  mapHeightCells: number,
  color: string = 'rgba(255, 255, 255, 0.2)'
): void {
  logger.debug('Drawing grid', {
    component: 'GridUtils',
    operation: 'drawGrid',
  }, { gridSize, zoom, scrollLeft, scrollTop, canvasWidth, canvasHeight, mapWidthCells, mapHeightCells });

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  // Get visible cell range
  const visible = getVisibleCells(
    scrollLeft,
    scrollTop,
    canvasWidth,
    canvasHeight,
    mapWidthCells,
    mapHeightCells,
    gridSize,
    zoom
  );

  const cellSizePixels = gridSize * zoom;

  // Draw vertical lines
  // Draw lines for all visible X positions, including outside map bounds
  const startCellX = Math.floor(scrollLeft / cellSizePixels) - 1;
  const endCellX = Math.ceil((scrollLeft + canvasWidth) / cellSizePixels) + 1;
  
  for (let cellX = startCellX; cellX <= endCellX; cellX++) {
    // Convert cell X to canvas X
    const canvasX = cellX * cellSizePixels - scrollLeft;
    
    // Only draw if visible on canvas (with small margin for partial visibility)
    if (canvasX < -cellSizePixels || canvasX > canvasWidth + cellSizePixels) continue;
    
    // Draw line across full canvas height
    // Grid extends beyond map bounds to show full coordinate system
    ctx.beginPath();
    ctx.moveTo(canvasX, 0);
    ctx.lineTo(canvasX, canvasHeight);
    ctx.stroke();
  }

  // Draw horizontal lines
  // Use a Set to track drawn lines and avoid duplicates
  const drawnLines = new Set<number>();

  // Calculate visible Y range based on scroll position
  // We need to iterate through all possible cellY values that could be visible
  // Start from a range that covers the visible area plus margin
  for (let cellY = visible.minY; cellY <= visible.maxY; cellY++) {
    // Convert cell Y to canvas Y (works for any cellY, including outside map bounds)
    const mapHeightPixels = mapHeightCells * cellSizePixels;
    const canvasY = (mapHeightPixels - cellY * cellSizePixels) - scrollTop;
    
    // Only draw if visible on canvas (with small margin for partial visibility)
    if (canvasY < -cellSizePixels || canvasY > canvasHeight + cellSizePixels) continue;
    
    // Round to avoid floating point precision issues
    const roundedCanvasY = Math.round(canvasY);
    if (drawnLines.has(roundedCanvasY)) continue;
    drawnLines.add(roundedCanvasY);
    
    // Draw line across full canvas width
    // Grid extends beyond map bounds to show full coordinate system
    ctx.beginPath();
    ctx.moveTo(0, roundedCanvasY);
    ctx.lineTo(canvasWidth, roundedCanvasY);
    ctx.stroke();
  }

  // Always draw a line at cellY = 0 (bottom of map) if visible
  const mapHeightPixels = mapHeightCells * cellSizePixels;
  const bottomLineY = Math.round((mapHeightPixels - 0 * cellSizePixels) - scrollTop);
  
  if (bottomLineY >= -cellSizePixels && bottomLineY <= canvasHeight + cellSizePixels && !drawnLines.has(bottomLineY)) {
    // Draw line across full canvas width
    ctx.beginPath();
    ctx.moveTo(0, bottomLineY);
    ctx.lineTo(canvasWidth, bottomLineY);
    ctx.stroke();
  }

  ctx.restore();
}
