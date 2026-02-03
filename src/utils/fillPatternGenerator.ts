/**
 * Fill Pattern Generator
 * 
 * Generates procedural fill patterns (stripes, dots, grids, etc.) as data URLs
 * that can be applied as overlays to tiles.
 */

export type FillPatternType =
  | 'stripes-horizontal'
  | 'stripes-vertical'
  | 'stripes-diagonal'
  | 'stripes-diagonal-reverse'
  | 'dots'
  | 'dots-large'
  | 'grid'
  | 'grid-thick'
  | 'checkerboard'
  | 'checkerboard-small'
  | 'crosshatch'
  | 'waves-horizontal'
  | 'waves-vertical'
  | 'bricks'
  | 'zigzag'
  | 'circles'
  | 'diamonds'
  | 'hexagons'
  | 'stars'
  // Symbols
  | 'symbol-spawn-arrow'
  | 'symbol-goal-star'
  | 'symbol-checkmark'
  | 'symbol-teleporter-circles'
  | 'symbol-death-x'
  | 'symbol-bumper-arrow'
  | 'symbol-coin'
  | 'symbol-platform-arrows'
  | 'symbol-path-dots'
  | 'symbol-arrow-up'
  | 'symbol-arrow-down'
  | 'symbol-arrow-left'
  | 'symbol-arrow-right'
  | 'symbol-cross'
  | 'symbol-plus'
  | 'symbol-heart'
  | 'symbol-skull'
  | 'symbol-lock'
  | 'symbol-key'
  | 'symbol-flag'
  | 'symbol-shield'
  | 'symbol-sword';

export interface FillPattern {
  id: string;
  name: string;
  type: FillPatternType;
  category: 'stripes' | 'dots' | 'grids' | 'shapes' | 'textures' | 'symbols';
  description?: string;
}

/**
 * Generate a fill pattern as a data URL
 */
export function generateFillPattern(
  type: FillPatternType,
  size: number = 64,
  color: string = '#ffffff',
  backgroundColor: string = 'transparent'
): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    return '';
  }

  // Set background
  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, size / 32);

  switch (type) {
    case 'stripes-horizontal':
      generateHorizontalStripes(ctx, size, color);
      break;
    case 'stripes-vertical':
      generateVerticalStripes(ctx, size, color);
      break;
    case 'stripes-diagonal':
      generateDiagonalStripes(ctx, size, color, false);
      break;
    case 'stripes-diagonal-reverse':
      generateDiagonalStripes(ctx, size, color, true);
      break;
    case 'dots':
      generateDots(ctx, size, color, size / 8);
      break;
    case 'dots-large':
      generateDots(ctx, size, color, size / 4);
      break;
    case 'grid':
      generateGrid(ctx, size, color, size / 8);
      break;
    case 'grid-thick':
      generateGrid(ctx, size, color, size / 4);
      break;
    case 'checkerboard':
      generateCheckerboard(ctx, size, color, size / 4);
      break;
    case 'checkerboard-small':
      generateCheckerboard(ctx, size, color, size / 8);
      break;
    case 'crosshatch':
      generateCrosshatch(ctx, size, color);
      break;
    case 'waves-horizontal':
      generateWaves(ctx, size, color, true);
      break;
    case 'waves-vertical':
      generateWaves(ctx, size, color, false);
      break;
    case 'bricks':
      generateBricks(ctx, size, color);
      break;
    case 'zigzag':
      generateZigzag(ctx, size, color);
      break;
    case 'circles':
      generateCircles(ctx, size, color);
      break;
    case 'diamonds':
      generateDiamonds(ctx, size, color);
      break;
    case 'hexagons':
      generateHexagons(ctx, size, color);
      break;
    case 'stars':
      generateStars(ctx, size, color);
      break;
    // Symbols
    case 'symbol-spawn-arrow':
      generateSpawnArrow(ctx, size, color);
      break;
    case 'symbol-goal-star':
      generateGoalStar(ctx, size, color);
      break;
    case 'symbol-checkmark':
      generateCheckmark(ctx, size, color);
      break;
    case 'symbol-teleporter-circles':
      generateTeleporterCircles(ctx, size, color);
      break;
    case 'symbol-death-x':
      generateDeathX(ctx, size, color);
      break;
    case 'symbol-bumper-arrow':
      generateBumperArrow(ctx, size, color);
      break;
    case 'symbol-coin':
      generateCoin(ctx, size, color);
      break;
    case 'symbol-platform-arrows':
      generatePlatformArrows(ctx, size, color);
      break;
    case 'symbol-path-dots':
      generatePathDots(ctx, size, color);
      break;
    case 'symbol-arrow-up':
      generateArrow(ctx, size, color, 'up');
      break;
    case 'symbol-arrow-down':
      generateArrow(ctx, size, color, 'down');
      break;
    case 'symbol-arrow-left':
      generateArrow(ctx, size, color, 'left');
      break;
    case 'symbol-arrow-right':
      generateArrow(ctx, size, color, 'right');
      break;
    case 'symbol-cross':
      generateCross(ctx, size, color);
      break;
    case 'symbol-plus':
      generatePlus(ctx, size, color);
      break;
    case 'symbol-heart':
      generateHeart(ctx, size, color);
      break;
    case 'symbol-skull':
      generateSkull(ctx, size, color);
      break;
    case 'symbol-lock':
      generateLock(ctx, size, color);
      break;
    case 'symbol-key':
      generateKey(ctx, size, color);
      break;
    case 'symbol-flag':
      generateFlag(ctx, size, color);
      break;
    case 'symbol-shield':
      generateShield(ctx, size, color);
      break;
    case 'symbol-sword':
      generateSword(ctx, size, color);
      break;
    default:
      // Unknown pattern type
      break;
  }

  return canvas.toDataURL('image/png');
}

function generateHorizontalStripes(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const stripeWidth = size / 8;
  ctx.fillStyle = color;
  for (let y = 0; y < size; y += stripeWidth * 2) {
    ctx.fillRect(0, y, size, stripeWidth);
  }
}

function generateVerticalStripes(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const stripeWidth = size / 8;
  ctx.fillStyle = color;
  for (let x = 0; x < size; x += stripeWidth * 2) {
    ctx.fillRect(x, 0, stripeWidth, size);
  }
}

function generateDiagonalStripes(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  reverse: boolean
): void {
  const stripeWidth = size / 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = stripeWidth;
  
  if (reverse) {
    for (let i = -size; i < size * 2; i += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + size, size);
      ctx.stroke();
    }
  } else {
    for (let i = -size; i < size * 2; i += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(i, size);
      ctx.lineTo(i + size, 0);
      ctx.stroke();
    }
  }
}

function generateDots(ctx: CanvasRenderingContext2D, size: number, color: string, dotSize: number): void {
  const spacing = dotSize * 2;
  ctx.fillStyle = color;
  
  for (let y = spacing / 2; y < size; y += spacing) {
    for (let x = spacing / 2; x < size; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function generateGrid(ctx: CanvasRenderingContext2D, size: number, color: string, spacing: number): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  
  // Vertical lines
  for (let x = 0; x <= size; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = 0; y <= size; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
}

function generateCheckerboard(ctx: CanvasRenderingContext2D, size: number, color: string, squareSize: number): void {
  ctx.fillStyle = color;
  const squaresPerRow = Math.ceil(size / squareSize);
  
  for (let row = 0; row < squaresPerRow; row++) {
    for (let col = 0; col < squaresPerRow; col++) {
      if ((row + col) % 2 === 0) {
        ctx.fillRect(col * squareSize, row * squareSize, squareSize, squareSize);
      }
    }
  }
}

function generateCrosshatch(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const spacing = size / 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  
  // Diagonal lines (top-left to bottom-right)
  for (let i = -size; i < size * 2; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }
  
  // Diagonal lines (top-right to bottom-left)
  for (let i = -size; i < size * 2; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, size);
    ctx.lineTo(i + size, 0);
    ctx.stroke();
  }
}

function generateWaves(ctx: CanvasRenderingContext2D, size: number, color: string, horizontal: boolean): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  if (horizontal) {
    const amplitude = size / 8;
    const frequency = 4;
    ctx.beginPath();
    for (let x = 0; x <= size; x++) {
      const y = size / 2 + Math.sin((x / size) * Math.PI * frequency) * amplitude;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  } else {
    const amplitude = size / 8;
    const frequency = 4;
    ctx.beginPath();
    for (let y = 0; y <= size; y++) {
      const x = size / 2 + Math.sin((y / size) * Math.PI * frequency) * amplitude;
      if (y === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
}

function generateBricks(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const brickWidth = size / 4;
  const brickHeight = size / 8;
  const gap = 1;
  
  ctx.fillStyle = color;
  
  // Draw enough rows and columns to ensure seamless tiling
  // Include extra columns on the left for offset rows to fill in missing half-bricks
  for (let row = 0; row < Math.ceil(size / brickHeight) + 1; row++) {
    const offset = row % 2 === 0 ? 0 : brickWidth / 2;
    const y = row * brickHeight;
    
    // Start from -1 to include the left half-brick for offset rows
    for (let col = -1; col < Math.ceil(size / brickWidth) + 1; col++) {
      const x = col * brickWidth + offset;
      
      // Only draw if brick overlaps with the visible area
      if (x + brickWidth - gap > 0 && x < size && y + brickHeight - gap > 0 && y < size) {
        // Calculate the actual drawing position and size, clamping to bounds
        const drawX = Math.max(0, x);
        const drawY = Math.max(0, y);
        const drawWidth = Math.min(brickWidth - gap, x + brickWidth - gap - drawX);
        const drawHeight = Math.min(brickHeight - gap, y + brickHeight - gap - drawY);
        
        if (drawWidth > 0 && drawHeight > 0) {
          ctx.fillRect(drawX, drawY, drawWidth, drawHeight);
        }
      }
    }
  }
}

function generateZigzag(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const segmentWidth = size / 4;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(0, size / 2);
  
  for (let x = 0; x <= size; x += segmentWidth) {
    const y = (x / segmentWidth) % 2 === 0 ? size / 4 : (3 * size) / 4;
    ctx.lineTo(x, y);
  }
  
  ctx.stroke();
}

function generateCircles(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const radius = size / 6;
  const spacing = size / 3;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  for (let y = spacing / 2; y < size; y += spacing) {
    for (let x = spacing / 2; x < size; x += spacing) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function generateDiamonds(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const diamondSize = size / 4;
  const spacing = size / 2;
  
  ctx.fillStyle = color;
  
  for (let y = spacing / 2; y < size; y += spacing) {
    for (let x = spacing / 2; x < size; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, y - diamondSize / 2);
      ctx.lineTo(x + diamondSize / 2, y);
      ctx.lineTo(x, y + diamondSize / 2);
      ctx.lineTo(x - diamondSize / 2, y);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function generateHexagons(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const radius = size / 8;
  const spacing = size / 4;
  
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  
  // Draw enough rows and columns to ensure seamless tiling
  // Include extra hexagons on left and right to fill in half-textures
  const startRow = -1;
  const endRow = Math.ceil(size / spacing) + 1;
  const startCol = -2; // Start further left to include hexagons that extend beyond
  const endCol = Math.ceil(size / spacing) + 2; // Extend further right
  
  for (let row = startRow; row < endRow; row++) {
    const y = (row * spacing) + spacing / 2;
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    
    for (let col = startCol; col < endCol; col++) {
      const x = (col * spacing) + spacing / 2 + offset;
      
      // Only draw hexagon if any part of it overlaps with visible area
      // Hexagon extends radius in all directions from center
      if (x + radius > 0 && x - radius < size && y + radius > 0 && y - radius < size) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const px = x + radius * Math.cos(angle);
          const py = y + radius * Math.sin(angle);
          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke(); // Thin outline for definition
      }
    }
  }
}

function generateStars(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const starSize = size / 8;
  const spacing = size / 3;
  
  ctx.fillStyle = color;
  
  for (let y = spacing / 2; y < size; y += spacing) {
    for (let x = spacing / 2; x < size; x += spacing) {
      drawStar(ctx, x, y, starSize / 2, starSize / 4, 5);
      ctx.fill();
    }
  }
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  points: number
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
}

// Symbol generators
function generateSpawnArrow(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
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
}

function generateGoalStar(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size * 0.3;
  const innerRadius = size * 0.15;
  drawStar(ctx, centerX, centerY, outerRadius, innerRadius, 5);
  ctx.fill();
}

function generateCheckmark(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size / 16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.25, size / 2);
  ctx.lineTo(size * 0.45, size * 0.7);
  ctx.lineTo(size * 0.75, size * 0.3);
  ctx.stroke();
}

function generateTeleporterCircles(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size / 20);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.2, 0, Math.PI * 2);
  ctx.stroke();
}

function generateDeathX(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size / 16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size * 0.2, size * 0.2);
  ctx.lineTo(size * 0.8, size * 0.8);
  ctx.moveTo(size * 0.8, size * 0.2);
  ctx.lineTo(size * 0.2, size * 0.8);
  ctx.stroke();
}

function generateBumperArrow(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size / 2, size * 0.3);
  ctx.lineTo(size * 0.3, size * 0.7);
  ctx.lineTo(size * 0.7, size * 0.7);
  ctx.closePath();
  ctx.fill();
}

function generateCoin(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  const centerX = size / 2;
  const centerY = size / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function generatePlatformArrows(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size / 32);
  ctx.lineCap = 'round';
  for (let x = size * 0.2; x < size * 0.8; x += size * 0.2) {
    ctx.beginPath();
    ctx.moveTo(x, size / 2);
    ctx.lineTo(x + size * 0.1, size * 0.4);
    ctx.moveTo(x, size / 2);
    ctx.lineTo(x + size * 0.1, size * 0.6);
    ctx.stroke();
  }
}

function generatePathDots(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = size * 0.25; y < size * 0.75; y += size * 0.25) {
    for (let x = size * 0.25; x < size * 0.75; x += size * 0.25) {
      ctx.beginPath();
      ctx.arc(x, y, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function generateArrow(ctx: CanvasRenderingContext2D, size: number, color: string, direction: 'up' | 'down' | 'left' | 'right'): void {
  ctx.fillStyle = color;
  const centerX = size / 2;
  const centerY = size / 2;
  const arrowSize = size * 0.3;
  
  ctx.beginPath();
  switch (direction) {
    case 'up':
      ctx.moveTo(centerX, centerY - arrowSize);
      ctx.lineTo(centerX - arrowSize * 0.6, centerY);
      ctx.lineTo(centerX - arrowSize * 0.3, centerY);
      ctx.lineTo(centerX - arrowSize * 0.3, centerY + arrowSize * 0.5);
      ctx.lineTo(centerX + arrowSize * 0.3, centerY + arrowSize * 0.5);
      ctx.lineTo(centerX + arrowSize * 0.3, centerY);
      ctx.lineTo(centerX + arrowSize * 0.6, centerY);
      break;
    case 'down':
      ctx.moveTo(centerX, centerY + arrowSize);
      ctx.lineTo(centerX - arrowSize * 0.6, centerY);
      ctx.lineTo(centerX - arrowSize * 0.3, centerY);
      ctx.lineTo(centerX - arrowSize * 0.3, centerY - arrowSize * 0.5);
      ctx.lineTo(centerX + arrowSize * 0.3, centerY - arrowSize * 0.5);
      ctx.lineTo(centerX + arrowSize * 0.3, centerY);
      ctx.lineTo(centerX + arrowSize * 0.6, centerY);
      break;
    case 'left':
      ctx.moveTo(centerX - arrowSize, centerY);
      ctx.lineTo(centerX, centerY - arrowSize * 0.6);
      ctx.lineTo(centerX, centerY - arrowSize * 0.3);
      ctx.lineTo(centerX + arrowSize * 0.5, centerY - arrowSize * 0.3);
      ctx.lineTo(centerX + arrowSize * 0.5, centerY + arrowSize * 0.3);
      ctx.lineTo(centerX, centerY + arrowSize * 0.3);
      ctx.lineTo(centerX, centerY + arrowSize * 0.6);
      break;
    case 'right':
      ctx.moveTo(centerX + arrowSize, centerY);
      ctx.lineTo(centerX, centerY - arrowSize * 0.6);
      ctx.lineTo(centerX, centerY - arrowSize * 0.3);
      ctx.lineTo(centerX - arrowSize * 0.5, centerY - arrowSize * 0.3);
      ctx.lineTo(centerX - arrowSize * 0.5, centerY + arrowSize * 0.3);
      ctx.lineTo(centerX, centerY + arrowSize * 0.3);
      ctx.lineTo(centerX, centerY + arrowSize * 0.6);
      break;
  }
  ctx.closePath();
  ctx.fill();
}

function generateCross(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(3, size / 16);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(size / 2, size * 0.2);
  ctx.lineTo(size / 2, size * 0.8);
  ctx.moveTo(size * 0.2, size / 2);
  ctx.lineTo(size * 0.8, size / 2);
  ctx.stroke();
}

function generatePlus(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  const barWidth = size * 0.15;
  const barLength = size * 0.5;
  ctx.fillRect(size / 2 - barLength / 2, size / 2 - barWidth / 2, barLength, barWidth);
  ctx.fillRect(size / 2 - barWidth / 2, size / 2 - barLength / 2, barWidth, barLength);
}

function generateHeart(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  const centerX = size / 2;
  const centerY = size / 2;
  const heartSize = size * 0.4;
  
  ctx.beginPath();
  const topLeftX = centerX - heartSize * 0.25;
  const topRightX = centerX + heartSize * 0.25;
  const topY = centerY - heartSize * 0.1;
  const circleRadius = heartSize * 0.25;
  
  ctx.arc(topLeftX, topY, circleRadius, 0, Math.PI * 2);
  ctx.arc(topRightX, topY, circleRadius, 0, Math.PI * 2);
  
  ctx.moveTo(centerX, centerY + heartSize * 0.4);
  ctx.lineTo(centerX - heartSize * 0.5, centerY + heartSize * 0.1);
  ctx.lineTo(centerX + heartSize * 0.5, centerY + heartSize * 0.1);
  ctx.closePath();
  ctx.fill();
}

function generateSkull(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.25;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.3, centerY - radius * 0.2, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(centerX + radius * 0.3, centerY - radius * 0.2, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = Math.max(2, size / 32);
  ctx.beginPath();
  ctx.moveTo(centerX - radius * 0.4, centerY + radius * 0.3);
  ctx.lineTo(centerX + radius * 0.4, centerY + radius * 0.6);
  ctx.moveTo(centerX + radius * 0.4, centerY + radius * 0.3);
  ctx.lineTo(centerX - radius * 0.4, centerY + radius * 0.6);
  ctx.stroke();
}

function generateLock(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size / 32);
  
  const centerX = size / 2;
  const centerY = size / 2;
  const lockWidth = size * 0.3;
  const lockHeight = size * 0.4;
  
  ctx.fillRect(centerX - lockWidth / 2, centerY, lockWidth, lockHeight);
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, lockWidth * 0.6, Math.PI, 0, false);
  ctx.lineWidth = Math.max(3, size / 20);
  ctx.stroke();
}

function generateKey(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size / 32);
  ctx.lineCap = 'round';
  
  const centerX = size / 2;
  const centerY = size / 2;
  const keySize = size * 0.3;
  
  ctx.beginPath();
  ctx.arc(centerX - keySize * 0.3, centerY, keySize * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillRect(centerX - keySize * 0.3, centerY - keySize * 0.05, keySize * 0.6, keySize * 0.1);
  
  ctx.fillRect(centerX + keySize * 0.3, centerY - keySize * 0.15, keySize * 0.1, keySize * 0.3);
  ctx.fillRect(centerX + keySize * 0.2, centerY + keySize * 0.05, keySize * 0.15, keySize * 0.1);
}

function generateFlag(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  const centerX = size / 2;
  const centerY = size / 2;
  
  ctx.fillRect(centerX - size * 0.05, centerY - size * 0.4, size * 0.1, size * 0.6);
  
  ctx.beginPath();
  ctx.moveTo(centerX + size * 0.05, centerY - size * 0.4);
  ctx.lineTo(centerX + size * 0.4, centerY - size * 0.25);
  ctx.lineTo(centerX + size * 0.05, centerY - size * 0.1);
  ctx.closePath();
  ctx.fill();
}

function generateShield(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size / 32);
  
  const centerX = size / 2;
  const centerY = size / 2;
  const shieldWidth = size * 0.4;
  const shieldHeight = size * 0.5;
  
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - shieldHeight / 2);
  ctx.lineTo(centerX - shieldWidth / 2, centerY - shieldHeight * 0.2);
  ctx.lineTo(centerX - shieldWidth / 2, centerY + shieldHeight * 0.2);
  ctx.quadraticCurveTo(centerX, centerY + shieldHeight / 2, centerX + shieldWidth / 2, centerY + shieldHeight * 0.2);
  ctx.lineTo(centerX + shieldWidth / 2, centerY - shieldHeight * 0.2);
  ctx.closePath();
  ctx.fill();
}

function generateSword(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size / 32);
  ctx.lineCap = 'round';
  
  const centerX = size / 2;
  const centerY = size / 2;
  const swordLength = size * 0.5;
  
  ctx.fillRect(centerX - size * 0.02, centerY - swordLength / 2, size * 0.04, swordLength);
  
  ctx.fillRect(centerX - size * 0.15, centerY - size * 0.02, size * 0.3, size * 0.04);
  
  ctx.fillRect(centerX - size * 0.02, centerY + swordLength / 2, size * 0.04, size * 0.15);
  
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - swordLength / 2);
  ctx.lineTo(centerX - size * 0.03, centerY - swordLength / 2 + size * 0.05);
  ctx.lineTo(centerX + size * 0.03, centerY - swordLength / 2 + size * 0.05);
  ctx.closePath();
  ctx.fill();
}

/**
 * System fill patterns
 */
export const SYSTEM_FILL_PATTERNS: FillPattern[] = [
  // Stripes
  { id: 'fill-stripes-h', name: 'Horizontal Stripes', type: 'stripes-horizontal', category: 'stripes', description: 'Horizontal stripes' },
  { id: 'fill-stripes-v', name: 'Vertical Stripes', type: 'stripes-vertical', category: 'stripes', description: 'Vertical stripes' },
  { id: 'fill-stripes-d', name: 'Diagonal Stripes', type: 'stripes-diagonal', category: 'stripes', description: 'Diagonal stripes (/)' },
  { id: 'fill-stripes-d-rev', name: 'Diagonal Stripes (\\)', type: 'stripes-diagonal-reverse', category: 'stripes', description: 'Diagonal stripes (\\)' },
  
  // Dots
  { id: 'fill-dots', name: 'Dots', type: 'dots', category: 'dots', description: 'Small polka dots' },
  { id: 'fill-dots-large', name: 'Large Dots', type: 'dots-large', category: 'dots', description: 'Large polka dots' },
  
  // Grids
  { id: 'fill-grid', name: 'Grid', type: 'grid', category: 'grids', description: 'Fine grid pattern' },
  { id: 'fill-grid-thick', name: 'Thick Grid', type: 'grid-thick', category: 'grids', description: 'Thick grid pattern' },
  { id: 'fill-checkerboard', name: 'Checkerboard', type: 'checkerboard', category: 'grids', description: 'Checkerboard pattern' },
  { id: 'fill-checkerboard-small', name: 'Small Checkerboard', type: 'checkerboard-small', category: 'grids', description: 'Small checkerboard' },
  { id: 'fill-crosshatch', name: 'Crosshatch', type: 'crosshatch', category: 'grids', description: 'Crosshatch pattern' },
  
  // Shapes
  { id: 'fill-circles', name: 'Circles', type: 'circles', category: 'shapes', description: 'Circle outlines' },
  { id: 'fill-diamonds', name: 'Diamonds', type: 'diamonds', category: 'shapes', description: 'Diamond shapes' },
  { id: 'fill-hexagons', name: 'Hexagons', type: 'hexagons', category: 'shapes', description: 'Hexagon outlines' },
  { id: 'fill-stars', name: 'Stars', type: 'stars', category: 'shapes', description: 'Star shapes' },
  
  // Textures
  { id: 'fill-waves-h', name: 'Horizontal Waves', type: 'waves-horizontal', category: 'textures', description: 'Horizontal wave pattern' },
  { id: 'fill-waves-v', name: 'Vertical Waves', type: 'waves-vertical', category: 'textures', description: 'Vertical wave pattern' },
  { id: 'fill-bricks', name: 'Bricks', type: 'bricks', category: 'textures', description: 'Brick pattern' },
  { id: 'fill-zigzag', name: 'Zigzag', type: 'zigzag', category: 'textures', description: 'Zigzag pattern' },
  
  // Symbols - Original texture symbols
  { id: 'fill-symbol-spawn', name: 'Spawn Arrow', type: 'symbol-spawn-arrow', category: 'symbols', description: 'Player spawn arrow (upward)' },
  { id: 'fill-symbol-goal', name: 'Goal Star', type: 'symbol-goal-star', category: 'symbols', description: 'Goal/flag star symbol' },
  { id: 'fill-symbol-checkpoint', name: 'Checkmark', type: 'symbol-checkmark', category: 'symbols', description: 'Checkpoint checkmark' },
  { id: 'fill-symbol-teleporter', name: 'Teleporter', type: 'symbol-teleporter-circles', category: 'symbols', description: 'Teleporter portal circles' },
  { id: 'fill-symbol-death', name: 'Death X', type: 'symbol-death-x', category: 'symbols', description: 'Death/hazard X symbol' },
  { id: 'fill-symbol-bumper', name: 'Bumper Arrow', type: 'symbol-bumper-arrow', category: 'symbols', description: 'Bumper upward arrow' },
  { id: 'fill-symbol-coin', name: 'Coin', type: 'symbol-coin', category: 'symbols', description: 'Collectible coin' },
  { id: 'fill-symbol-platform', name: 'Platform Arrows', type: 'symbol-platform-arrows', category: 'symbols', description: 'Moving platform arrows' },
  { id: 'fill-symbol-path', name: 'Path Dots', type: 'symbol-path-dots', category: 'symbols', description: 'Path waypoint dots' },
  
  // Additional symbols
  { id: 'fill-symbol-arrow-up', name: 'Arrow Up', type: 'symbol-arrow-up', category: 'symbols', description: 'Upward arrow' },
  { id: 'fill-symbol-arrow-down', name: 'Arrow Down', type: 'symbol-arrow-down', category: 'symbols', description: 'Downward arrow' },
  { id: 'fill-symbol-arrow-left', name: 'Arrow Left', type: 'symbol-arrow-left', category: 'symbols', description: 'Left arrow' },
  { id: 'fill-symbol-arrow-right', name: 'Arrow Right', type: 'symbol-arrow-right', category: 'symbols', description: 'Right arrow' },
  { id: 'fill-symbol-cross', name: 'Cross', type: 'symbol-cross', category: 'symbols', description: 'Cross symbol' },
  { id: 'fill-symbol-plus', name: 'Plus', type: 'symbol-plus', category: 'symbols', description: 'Plus sign' },
  { id: 'fill-symbol-heart', name: 'Heart', type: 'symbol-heart', category: 'symbols', description: 'Heart symbol' },
  { id: 'fill-symbol-skull', name: 'Skull', type: 'symbol-skull', category: 'symbols', description: 'Skull symbol' },
  { id: 'fill-symbol-lock', name: 'Lock', type: 'symbol-lock', category: 'symbols', description: 'Lock symbol' },
  { id: 'fill-symbol-key', name: 'Key', type: 'symbol-key', category: 'symbols', description: 'Key symbol' },
  { id: 'fill-symbol-flag', name: 'Flag', type: 'symbol-flag', category: 'symbols', description: 'Flag symbol' },
  { id: 'fill-symbol-shield', name: 'Shield', type: 'symbol-shield', category: 'symbols', description: 'Shield symbol' },
  { id: 'fill-symbol-sword', name: 'Sword', type: 'symbol-sword', category: 'symbols', description: 'Sword symbol' },
];

/**
 * Get fill patterns grouped by category
 */
export function getFillPatternsByCategory(): Record<string, FillPattern[]> {
  const grouped: Record<string, FillPattern[]> = {};
  
  for (const pattern of SYSTEM_FILL_PATTERNS) {
    if (!grouped[pattern.category]) {
      grouped[pattern.category] = [];
    }
    grouped[pattern.category].push(pattern);
  }
  
  return grouped;
}

/**
 * Get category display names
 */
export function getFillCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    stripes: 'Stripes',
    dots: 'Dots',
    grids: 'Grids',
    shapes: 'Shapes',
    textures: 'Textures',
    symbols: 'Symbols',
  };
  return names[category] || category;
}
