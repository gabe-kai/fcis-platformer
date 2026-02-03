// Viewport utility functions

/**
 * Viewport utility functions
 * 
 * These functions calculate viewport properties from scroll position.
 * Scrollbars are the single source of truth - we only read from them.
 */

/**
 * Gets viewport offset from scroll position (for rendering calculations)
 * 
 * @param scrollLeft - Scroll position from left (pixels)
 * @param scrollTop - Scroll position from top (pixels)
 * @param mapWidthPixels - Width of map in pixels
 * @param mapHeightPixels - Height of map in pixels
 * @param canvasWidth - Width of canvas viewport
 * @param canvasHeight - Height of canvas viewport
 * @returns Viewport offset { x, y } for rendering
 */
export function getViewportOffset(
  scrollLeft: number,
  scrollTop: number,
  mapWidthPixels: number,
  mapHeightPixels: number,
  canvasWidth: number,
  canvasHeight: number
): { x: number; y: number } {
  // For maps smaller than viewport, center them
  let offsetX = -scrollLeft;
  let offsetY = mapHeightPixels - canvasHeight - scrollTop;

  if (mapWidthPixels <= canvasWidth) {
    offsetX = (canvasWidth - mapWidthPixels) / 2;
  }
  if (mapHeightPixels <= canvasHeight) {
    offsetY = (mapHeightPixels - canvasHeight) / 2;
  }

  return { x: offsetX, y: offsetY };
}

/**
 * Calculates scroll container size (map size in pixels)
 * 
 * @param mapWidthCells - Width of map in cells
 * @param mapHeightCells - Height of map in cells
 * @param gridSize - Size of each grid cell in pixels
 * @param zoom - Current zoom level
 * @returns Scroll container size { width, height } in pixels
 */
export function getScrollContainerSize(
  mapWidthCells: number,
  mapHeightCells: number,
  gridSize: number,
  zoom: number
): { width: number; height: number } {
  const cellSizePixels = gridSize * zoom;
  return {
    width: mapWidthCells * cellSizePixels,
    height: mapHeightCells * cellSizePixels,
  };
}

/**
 * Clamps zoom to valid range
 * 
 * @param zoom - Desired zoom level
 * @param mapWidthCells - Width of map in cells
 * @param mapHeightCells - Height of map in cells
 * @param gridSize - Size of each grid cell in pixels
 * @param canvasWidth - Width of canvas viewport
 * @param canvasHeight - Height of canvas viewport
 * @returns Clamped zoom level
 */
export function clampZoom(
  zoom: number,
  mapWidthCells: number,
  mapHeightCells: number,
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number
): number {
  if (mapWidthCells === 0 || mapHeightCells === 0 || canvasWidth === 0 || canvasHeight === 0) {
    return zoom;
  }

  // Min zoom: longest dimension fits viewport
  // Calculate without zoom factor first
  const minZoomX = canvasWidth / (mapWidthCells * gridSize);
  const minZoomY = canvasHeight / (mapHeightCells * gridSize);
  const minZoom = Math.max(minZoomX, minZoomY);

  // Max zoom: at least 8×8 cells visible
  const maxZoomX = canvasWidth / (gridSize * 8);
  const maxZoomY = canvasHeight / (gridSize * 8);
  const maxZoom = Math.min(maxZoomX, maxZoomY);

  return Math.max(minZoom, Math.min(maxZoom, zoom));
}
