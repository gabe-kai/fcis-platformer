import type { TilePattern } from '@/types';
import { tileRegistry } from '@/models/Tile';
import { TILE_TYPE_COLORS } from '@/models/Tile';

/**
 * Generate a preview image for a tile pattern showing the actual arrangement of tiles
 * 
 * @param pattern - The tile pattern to preview
 * @param previewSize - Size of the preview in pixels (default: 48)
 * @returns Data URL of the generated preview image
 */
export function generatePatternPreview(pattern: TilePattern, previewSize: number = 48): string {
  if (pattern.cells.length === 0) {
    return '';
  }

  // Calculate pattern bounds
  const minX = Math.min(...pattern.cells.map(c => c.relX));
  const maxX = Math.max(...pattern.cells.map(c => c.relX));
  const minY = Math.min(...pattern.cells.map(c => c.relY));
  const maxY = Math.max(...pattern.cells.map(c => c.relY));
  
  const patternWidth = maxX - minX + 1;
  const patternHeight = maxY - minY + 1;
  
  // Calculate tile size to fit in preview (with padding)
  const padding = 2;
  const availableWidth = previewSize - padding * 2;
  const availableHeight = previewSize - padding * 2;
  const tileSize = Math.min(
    Math.floor(availableWidth / patternWidth),
    Math.floor(availableHeight / patternHeight)
  );
  
  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = previewSize;
  canvas.height = previewSize;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return '';
  }

  // Fill background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, previewSize, previewSize);

  // Calculate offset to center the pattern
  const totalPatternWidth = patternWidth * tileSize;
  const totalPatternHeight = patternHeight * tileSize;
  const offsetX = padding + (availableWidth - totalPatternWidth) / 2;
  const offsetY = padding + (availableHeight - totalPatternHeight) / 2;

  // Draw each tile in the pattern
  for (const cell of pattern.cells) {
    // Convert relative coordinates to canvas coordinates
    // Note: relY increases upward, but canvas Y increases downward
    const canvasX = offsetX + (cell.relX - minX) * tileSize;
    const canvasY = offsetY + (maxY - cell.relY) * tileSize; // Flip Y axis
    
    // Get tile definition to determine color
    const tileDef = cell.tileId ? tileRegistry.get(cell.tileId) : null;
    const tileColor = tileDef 
      ? (TILE_TYPE_COLORS[tileDef.type] || '#3498db')
      : '#3498db';
    
    // Draw tile
    ctx.fillStyle = cell.passable ? `${tileColor}80` : tileColor;
    ctx.fillRect(canvasX, canvasY, tileSize, tileSize);
    
    // Draw border
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 1;
    ctx.strokeRect(canvasX, canvasY, tileSize, tileSize);
  }

  return canvas.toDataURL('image/png');
}
