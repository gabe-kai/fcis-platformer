// Cell-based coordinate utilities

/**
 * Cell-based coordinate system utilities
 * 
 * All coordinates use grid cells as the primary unit.
 * Bottom-left coordinate system: cellY=0 is the bottom row.
 * Pixels are only used for rendering.
 */

/**
 * Converts cell coordinates to canvas pixel coordinates
 * 
 * @param cellX - Cell X coordinate (0 = leftmost column)
 * @param cellY - Cell Y coordinate (0 = bottom row, increases upward)
 * @param gridSize - Size of each grid cell in pixels
 * @param zoom - Current zoom level
 * @param scrollLeft - Scroll position from left (pixels)
 * @param scrollTop - Scroll position from top (pixels)
 * @param canvasHeight - Height of canvas in pixels
 * @param mapHeightCells - Height of map in cells
 * @returns Canvas pixel coordinates { x, y } where (0,0) is top-left
 */
export function cellToCanvas(
  cellX: number,
  cellY: number,
  gridSize: number,
  zoom: number,
  scrollLeft: number,
  scrollTop: number,
  canvasHeight: number,
  mapHeightCells: number
): { x: number; y: number } {
  const cellSizePixels = gridSize * zoom;
  const mapHeightPixels = mapHeightCells * cellSizePixels;
  
  // X: simple left-to-right
  const x = cellX * cellSizePixels - scrollLeft;
  
  // Y: bottom-left to top-left conversion
  // Cell at cellY has its bottom edge at pixel (cellY * cellSizePixels) from bottom of map
  // In map pixels from top: (mapHeightPixels - cellY * cellSizePixels)
  // In canvas viewport: subtract scrollTop
  // But canvas Y=0 is top, so: canvasHeight - ((mapHeightPixels - cellY * cellSizePixels) - scrollTop)
  // = canvasHeight - mapHeightPixels + cellY * cellSizePixels + scrollTop
  
  // Actually, let's think step by step:
  // 1. Cell's bottom edge in map pixels (from top): mapHeightPixels - (cellY + 1) * cellSizePixels
  // 2. Cell's top edge in map pixels (from top): mapHeightPixels - cellY * cellSizePixels
  // 3. Canvas shows pixels scrollTop to scrollTop+canvasHeight from top of map
  // 4. Cell's top edge in canvas: (mapHeightPixels - cellY * cellSizePixels) - scrollTop
  // 5. But canvas Y increases downward, so: canvasY = (mapHeightPixels - cellY * cellSizePixels) - scrollTop
  
  const y = (mapHeightPixels - cellY * cellSizePixels) - scrollTop;
  
  return { x, y };
}

/**
 * Converts canvas pixel coordinates to cell coordinates
 * 
 * @param canvasX - Canvas X coordinate (0 = left edge)
 * @param canvasY - Canvas Y coordinate (0 = top edge)
 * @param gridSize - Size of each grid cell in pixels
 * @param zoom - Current zoom level
 * @param scrollLeft - Scroll position from left (pixels)
 * @param scrollTop - Scroll position from top (pixels)
 * @param canvasHeight - Height of canvas in pixels
 * @param mapHeightCells - Height of map in cells
 * @returns Cell coordinates { cellX, cellY } where cellY=0 is bottom row
 */
export function canvasToCell(
  canvasX: number,
  canvasY: number,
  gridSize: number,
  zoom: number,
  scrollLeft: number,
  scrollTop: number,
  canvasHeight: number,
  mapHeightCells: number
): { cellX: number; cellY: number } {
  const cellSizePixels = gridSize * zoom;
  const mapHeightPixels = mapHeightCells * cellSizePixels;
  
  // X: simple conversion
  const cellX = Math.floor((canvasX + scrollLeft) / cellSizePixels);
  
  // Y: top-left to bottom-left conversion
  // Canvas Y in map pixels (from top): canvasY + scrollTop
  // Map pixel from bottom: mapHeightPixels - (canvasY + scrollTop)
  // Cell Y: floor((mapHeightPixels - (canvasY + scrollTop)) / cellSizePixels)
  const cellY = Math.floor((mapHeightPixels - (canvasY + scrollTop)) / cellSizePixels);
  
  return { cellX, cellY };
}

/**
 * Gets the range of visible cells from scroll position
 * 
 * @param scrollLeft - Scroll position from left (pixels)
 * @param scrollTop - Scroll position from top (pixels)
 * @param canvasWidth - Width of canvas in pixels
 * @param canvasHeight - Height of canvas in pixels
 * @param mapWidthCells - Width of map in cells
 * @param mapHeightCells - Height of map in cells
 * @param gridSize - Size of each grid cell in pixels
 * @param zoom - Current zoom level
 * @returns Visible cell range { minX, maxX, minY, maxY } (inclusive)
 */
export function getVisibleCells(
  scrollLeft: number,
  scrollTop: number,
  canvasWidth: number,
  canvasHeight: number,
  mapWidthCells: number,
  mapHeightCells: number,
  gridSize: number,
  zoom: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  const cellSizePixels = gridSize * zoom;
  const mapHeightPixels = mapHeightCells * cellSizePixels;
  
  // X range: simple left-to-right
  // Expand by 1 cell on each side to include partially visible cells
  const minX = Math.max(0, Math.floor(scrollLeft / cellSizePixels) - 1);
  const maxX = Math.min(mapWidthCells - 1, Math.ceil((scrollLeft + canvasWidth) / cellSizePixels) + 1);
  
  // Y range: bottom-left coordinate system
  // Visible area in map pixels (from top): scrollTop to scrollTop + canvasHeight
  // Convert to pixels from bottom: (mapHeightPixels - scrollTop - canvasHeight) to (mapHeightPixels - scrollTop)
  // Convert to cells: divide by cellSizePixels
  // Expand by 1 cell on each side to include partially visible cells
  // Note: Don't clamp to map bounds here - we want to draw grid even outside map
  const minYFromTop = scrollTop;
  const maxYFromTop = scrollTop + canvasHeight;
  const minYFromBottom = mapHeightPixels - maxYFromTop;
  const maxYFromBottom = mapHeightPixels - minYFromTop;
  
  // Calculate cell range (allow negative and beyond map for grid drawing)
  const minY = Math.floor(minYFromBottom / cellSizePixels) - 1;
  const maxY = Math.ceil(maxYFromBottom / cellSizePixels) + 1;
  
  return { minX, maxX, minY, maxY };
}
