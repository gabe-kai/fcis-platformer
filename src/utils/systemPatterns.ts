import type { TilePattern } from '@/types';

/**
 * System tile patterns - procedural patterns for common level building blocks
 * These are categorized and can be initialized into the pattern library
 */

export type PatternCategory = 
  | 'platforms'
  | 'stairs'
  | 'walls'
  | 'corners'
  | 'bridges'
  | 'obstacles'
  | 'decorations'
  | 'paths'
  | 'structures';

export interface SystemPattern extends TilePattern {
  category: PatternCategory;
  description?: string;
}

/**
 * Generate a pattern ID for system patterns
 */
function systemPatternId(name: string): string {
  return `system_pattern_${name.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * System tile patterns organized by category
 */
export const SYSTEM_PATTERNS: SystemPattern[] = [
  // ========== PLATFORMS ==========
  {
    id: systemPatternId('Small Platform'),
    name: 'Small Platform',
    category: 'platforms',
    description: '2×1 platform',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Medium Platform'),
    name: 'Medium Platform',
    category: 'platforms',
    description: '3×1 platform',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Large Platform'),
    name: 'Large Platform',
    category: 'platforms',
    description: '5×1 platform',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 3, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 4, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Wide Platform'),
    name: 'Wide Platform',
    category: 'platforms',
    description: '7×1 platform',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 3, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 4, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 5, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 6, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Thick Platform'),
    name: 'Thick Platform',
    category: 'platforms',
    description: '3×2 platform',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },

  // ========== STAIRS ==========
  {
    id: systemPatternId('Stairs Up 3'),
    name: 'Stairs Up (3 steps)',
    category: 'stairs',
    description: '3-step ascending staircase',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Stairs Up 5'),
    name: 'Stairs Up (5 steps)',
    category: 'stairs',
    description: '5-step ascending staircase',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 3, relY: 3, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 4, relY: 4, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Stairs Down 3'),
    name: 'Stairs Down (3 steps)',
    category: 'stairs',
    description: '3-step descending staircase',
    cells: [
      { relX: 0, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Stairs Down 5'),
    name: 'Stairs Down (5 steps)',
    category: 'stairs',
    description: '5-step descending staircase',
    cells: [
      { relX: 0, relY: 4, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 3, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 3, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 4, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Wide Stairs Up'),
    name: 'Wide Stairs Up',
    category: 'stairs',
    description: '2-wide ascending staircase',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 3, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },

  // ========== WALLS ==========
  {
    id: systemPatternId('Wall Short'),
    name: 'Wall (2 high)',
    category: 'walls',
    description: '2-tile high wall',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Wall Medium'),
    name: 'Wall (3 high)',
    category: 'walls',
    description: '3-tile high wall',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Wall Tall'),
    name: 'Wall (5 high)',
    category: 'walls',
    description: '5-tile high wall',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 3, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 4, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Wall Section'),
    name: 'Wall Section',
    category: 'walls',
    description: '3×3 wall section',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },

  // ========== CORNERS ==========
  {
    id: systemPatternId('Corner Inner'),
    name: 'Inner Corner',
    category: 'corners',
    description: 'Inner corner (L-shape)',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Corner Outer'),
    name: 'Outer Corner',
    category: 'corners',
    description: 'Outer corner',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Corner Top Left'),
    name: 'Corner Top-Left',
    category: 'corners',
    description: 'Top-left corner block',
    cells: [
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Corner Top Right'),
    name: 'Corner Top-Right',
    category: 'corners',
    description: 'Top-right corner block',
    cells: [
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },

  // ========== BRIDGES ==========
  {
    id: systemPatternId('Bridge Short'),
    name: 'Bridge (3 wide)',
    category: 'bridges',
    description: '3-tile wide bridge',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Bridge Medium'),
    name: 'Bridge (5 wide)',
    category: 'bridges',
    description: '5-tile wide bridge',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 3, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 4, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Bridge Long'),
    name: 'Bridge (7 wide)',
    category: 'bridges',
    description: '7-tile wide bridge',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 3, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 4, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 5, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 6, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Bridge With Rails'),
    name: 'Bridge with Rails',
    category: 'bridges',
    description: 'Bridge with side decorations',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 3, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'background' },
      { relX: 3, relY: 1, tileId: 'solid-block', passable: false, layer: 'background' },
    ],
    createdAt: 0,
  },

  // ========== OBSTACLES ==========
  {
    id: systemPatternId('Spike Trap'),
    name: 'Spike Trap',
    category: 'obstacles',
    description: '3-tile spike hazard',
    cells: [
      { relX: 0, relY: 0, tileId: 'death-spikes', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'death-spikes', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'death-spikes', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Lava Pool'),
    name: 'Lava Pool',
    category: 'obstacles',
    description: '2×2 lava hazard',
    cells: [
      { relX: 0, relY: 0, tileId: 'death-lava', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'death-lava', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'death-lava', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'death-lava', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Spike Wall'),
    name: 'Spike Wall',
    category: 'obstacles',
    description: 'Vertical spike barrier',
    cells: [
      { relX: 0, relY: 0, tileId: 'death-spikes', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'death-spikes', passable: false, layer: 'primary' },
      { relX: 0, relY: 2, tileId: 'death-spikes', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Hazard Gap'),
    name: 'Hazard Gap',
    category: 'obstacles',
    description: 'Gap with spikes on both sides',
    cells: [
      { relX: 0, relY: 0, tileId: 'death-spikes', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'death-spikes', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },

  // ========== DECORATIONS ==========
  {
    id: systemPatternId('Pillar'),
    name: 'Pillar',
    category: 'decorations',
    description: 'Decorative pillar',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'background' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'background' },
      { relX: 0, relY: 2, tileId: 'solid-block', passable: false, layer: 'background' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Column'),
    name: 'Column',
    category: 'decorations',
    description: 'Decorative column',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'background' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'background' },
      { relX: 0, relY: 2, tileId: 'solid-block', passable: false, layer: 'background' },
      { relX: 0, relY: 3, tileId: 'solid-block', passable: false, layer: 'background' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Decorative Block'),
    name: 'Decorative Block',
    category: 'decorations',
    description: '2×2 decorative block',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'background' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'background' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'background' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'background' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Foreground Arch'),
    name: 'Foreground Arch',
    category: 'decorations',
    description: 'Foreground decorative arch',
    cells: [
      { relX: 0, relY: 2, tileId: 'solid-block', passable: false, layer: 'foreground' },
      { relX: 1, relY: 2, tileId: 'solid-block', passable: false, layer: 'foreground' },
      { relX: 2, relY: 2, tileId: 'solid-block', passable: false, layer: 'foreground' },
      { relX: 0, relY: 3, tileId: 'solid-block', passable: false, layer: 'foreground' },
      { relX: 2, relY: 3, tileId: 'solid-block', passable: false, layer: 'foreground' },
    ],
    createdAt: 0,
  },

  // ========== PATHS ==========
  {
    id: systemPatternId('Coin Path'),
    name: 'Coin Path',
    category: 'paths',
    description: '3 coins in a row',
    cells: [
      { relX: 0, relY: 0, tileId: 'collectible-coin', passable: true, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'collectible-coin', passable: true, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'collectible-coin', passable: true, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Coin Staircase'),
    name: 'Coin Staircase',
    category: 'paths',
    description: 'Coins leading up',
    cells: [
      { relX: 0, relY: 0, tileId: 'collectible-coin', passable: true, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'collectible-coin', passable: true, layer: 'primary' },
      { relX: 2, relY: 2, tileId: 'collectible-coin', passable: true, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Checkpoint Platform'),
    name: 'Checkpoint Platform',
    category: 'paths',
    description: 'Platform with checkpoint',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'checkpoint', passable: true, layer: 'primary' },
    ],
    createdAt: 0,
  },

  // ========== STRUCTURES ==========
  {
    id: systemPatternId('Platform Tower'),
    name: 'Platform Tower',
    category: 'structures',
    description: 'Vertical platform stack',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 0, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 2, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Platform Jump'),
    name: 'Platform Jump',
    category: 'structures',
    description: 'Two platforms with gap',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 3, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 4, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Teleporter Pair'),
    name: 'Teleporter Pair',
    category: 'structures',
    description: 'Entrance and exit teleporter',
    cells: [
      { relX: 0, relY: 0, tileId: 'teleporter-entrance', passable: true, layer: 'primary' },
      { relX: 3, relY: 2, tileId: 'teleporter-exit', passable: true, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Spawn Platform'),
    name: 'Spawn Platform',
    category: 'structures',
    description: 'Starting platform with spawn',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'spawn-player', passable: true, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Goal Platform'),
    name: 'Goal Platform',
    category: 'structures',
    description: 'End platform with goal',
    cells: [
      { relX: 0, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'solid-block', passable: false, layer: 'primary' },
      { relX: 1, relY: 1, tileId: 'goal-flag', passable: true, layer: 'primary' },
    ],
    createdAt: 0,
  },
  // ========== MOVING PLATFORMS ==========
  {
    id: systemPatternId('Moving Platform Horizontal'),
    name: 'Moving Platform (H)',
    category: 'platforms',
    description: 'Horizontal moving platform - use with Platform tool',
    cells: [
      { relX: 0, relY: 0, tileId: 'platform-moving-horizontal', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'platform-moving-horizontal', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'platform-moving-horizontal', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Moving Platform Vertical'),
    name: 'Moving Platform (V)',
    category: 'platforms',
    description: 'Vertical moving platform - use with Platform tool',
    cells: [
      { relX: 0, relY: 0, tileId: 'platform-moving-vertical', passable: false, layer: 'primary' },
      { relX: 0, relY: 1, tileId: 'platform-moving-vertical', passable: false, layer: 'primary' },
      { relX: 0, relY: 2, tileId: 'platform-moving-vertical', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
  {
    id: systemPatternId('Moving Platform Large'),
    name: 'Moving Platform (Large)',
    category: 'platforms',
    description: 'Large moving platform - use with Platform tool',
    cells: [
      { relX: 0, relY: 0, tileId: 'platform-moving-horizontal', passable: false, layer: 'primary' },
      { relX: 1, relY: 0, tileId: 'platform-moving-horizontal', passable: false, layer: 'primary' },
      { relX: 2, relY: 0, tileId: 'platform-moving-horizontal', passable: false, layer: 'primary' },
      { relX: 3, relY: 0, tileId: 'platform-moving-horizontal', passable: false, layer: 'primary' },
    ],
    createdAt: 0,
  },
];

/**
 * Get patterns grouped by category
 */
export function getPatternsByCategory(): Record<PatternCategory, SystemPattern[]> {
  const grouped: Record<string, SystemPattern[]> = {};
  
  for (const pattern of SYSTEM_PATTERNS) {
    if (!grouped[pattern.category]) {
      grouped[pattern.category] = [];
    }
    grouped[pattern.category].push(pattern);
  }
  
  return grouped as Record<PatternCategory, SystemPattern[]>;
}

/**
 * Get all category names in display order
 */
export function getCategoryOrder(): PatternCategory[] {
  return [
    'platforms',
    'stairs',
    'walls',
    'corners',
    'bridges',
    'obstacles',
    'decorations',
    'paths',
    'structures',
  ];
}

/**
 * Get display name for a category
 */
export function getCategoryDisplayName(category: PatternCategory): string {
  const names: Record<PatternCategory, string> = {
    platforms: 'Platforms',
    stairs: 'Stairs',
    walls: 'Walls',
    corners: 'Corners',
    bridges: 'Bridges',
    obstacles: 'Obstacles',
    decorations: 'Decorations',
    paths: 'Paths',
    structures: 'Structures',
  };
  return names[category];
}
