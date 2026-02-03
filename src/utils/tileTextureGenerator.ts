/**
 * Color map for tile types. Duplicated here to avoid circular dependency with Tile.ts.
 * Must stay in sync with TILE_TYPE_COLORS in @/models/Tile.
 */
const TILE_TYPE_COLORS: Record<string, string> = {
  solid: '#3498db',
  bumper: '#f39c12',
  path: '#2ecc71',
  teleporter: '#9b59b6',
  death: '#e74c3c',
  spawn: '#1abc9c',
  goal: '#f1c40f',
  checkpoint: '#16a085',
  collectible: '#e67e22',
  platform: '#95a5a6',
};

/**
 * Generates a programmatic texture for a system tile based on its type.
 * Creates a canvas-based data URL that can be used as a texture.
 *
 * @param tileType - The type of tile (solid, spawn, goal, etc.)
 * @param size - Size of the texture in pixels (default: 64)
 * @returns Data URL of the generated texture
 */
export function generateSystemTileTexture(tileType: string, size: number = 64): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const baseColor = TILE_TYPE_COLORS[tileType] || '#3498db';
  
  // Fill background with base color
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, size, size);

  // Add pattern/icon based on tile type
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;

  switch (tileType) {
    case 'solid':
      // Simple brick pattern
      for (let y = 0; y < size; y += size / 4) {
        for (let x = 0; x < size; x += size / 2) {
          ctx.strokeRect(x + (y % (size / 2) === 0 ? 0 : size / 4), y, size / 4, size / 4);
        }
      }
      break;

    case 'spawn':
      // Player spawn arrow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.moveTo(size / 2, size * 0.2);
      ctx.lineTo(size * 0.3, size * 0.6);
      ctx.lineTo(size * 0.4, size * 0.6);
      ctx.lineTo(size * 0.4, size * 0.8);
      ctx.lineTo(size * 0.6, size * 0.8);
      ctx.lineTo(size * 0.6, size * 0.6);
      ctx.lineTo(size * 0.7, size * 0.6);
      ctx.closePath();
      ctx.fill();
      break;

    case 'goal':
      // Flag/star icon
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      // Star shape
      const centerX = size / 2;
      const centerY = size / 2;
      const outerRadius = size * 0.3;
      const innerRadius = size * 0.15;
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;

    case 'checkpoint':
      // Checkmark
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(size * 0.25, size / 2);
      ctx.lineTo(size * 0.45, size * 0.7);
      ctx.lineTo(size * 0.75, size * 0.3);
      ctx.stroke();
      break;

    case 'teleporter':
      // Portal/circle pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'death':
      // Skull/X pattern
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 4;
      // X pattern
      ctx.beginPath();
      ctx.moveTo(size * 0.2, size * 0.2);
      ctx.lineTo(size * 0.8, size * 0.8);
      ctx.moveTo(size * 0.8, size * 0.2);
      ctx.lineTo(size * 0.2, size * 0.8);
      ctx.stroke();
      break;

    case 'bumper':
      // Bump pattern (upward arrow)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(size / 2, size * 0.3);
      ctx.lineTo(size * 0.3, size * 0.7);
      ctx.lineTo(size * 0.7, size * 0.7);
      ctx.closePath();
      ctx.fill();
      break;

    case 'collectible':
      // Coin/circle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'platform':
      // Moving platform arrows
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      // Horizontal arrows
      for (let x = size * 0.2; x < size * 0.8; x += size * 0.2) {
        ctx.beginPath();
        ctx.moveTo(x, size / 2);
        ctx.lineTo(x + size * 0.1, size * 0.4);
        ctx.moveTo(x, size / 2);
        ctx.lineTo(x + size * 0.1, size * 0.6);
        ctx.stroke();
      }
      break;

    case 'path':
      // Path/dots pattern
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let y = size * 0.25; y < size * 0.75; y += size * 0.25) {
        for (let x = size * 0.25; x < size * 0.75; x += size * 0.25) {
          ctx.beginPath();
          ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;

    default:
      // Default: simple border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.strokeRect(2, 2, size - 4, size - 4);
      break;
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generates textures for all system tiles and updates their definitions.
 * This should be called during tile registry initialization.
 *
 * @param tiles - Array of tile definitions to update
 * @returns Array of tiles with generated texture URLs
 */
export function generateSystemTileTextures(
  tiles: Array<{ type: string; texture: { url: string; width: number; height: number } }>
): Array<{ texture: { url: string; width: number; height: number } }> {
  return tiles.map((tile) => {
    // Only generate if texture URL is empty
    if (tile.texture.url) {
      return { texture: tile.texture };
    }

    const textureSize = tile.texture.width || 64;
    const textureUrl = generateSystemTileTexture(tile.type, textureSize);

    return {
      texture: {
        url: textureUrl,
        width: textureSize,
        height: textureSize,
      },
    };
  });
}
