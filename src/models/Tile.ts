import { logger } from '@/utils/logger';
import type { PlatformType } from './Platform';

/**
 * Tile type identifier
 */
export type TileType = 'solid' | 'bumper' | 'path' | 'teleporter' | 'death' | 'spawn' | 'goal' | 'checkpoint' | 'collectible' | 'platform';

/**
 * Tile definition - describes a tile template
 * 
 * Note: All tiles are 1×1 grid cells. The texture width/height are for rendering only.
 * Multi-tile visuals are groups of standard 1×1 tiles.
 */
export interface TileDefinition {
  id: string;
  name: string;
  type: TileType;
  description: string;
  texture: {
    url: string;
    width: number;   // Texture width in pixels (must equal height, square only)
    height: number;  // Texture height in pixels (must equal width, square only, max 256×256)
  };
  /** Default fill pattern ID to use when texture is not available */
  defaultFillPatternId?: string;
  platformType: PlatformType;
  properties: {
    isBumpable?: boolean; // Can be bumped from underneath (Mario style)
    // Teleporter properties
    teleporterId?: string; // ID linking teleporter pairs
    teleporterDestination?: { levelId?: string; cellX: number; cellY: number }; // Where teleporter leads
    // Death tile properties
    deathType?: 'spikes' | 'lava' | 'void' | 'poison' | 'electric'; // Type of death hazard
    // Spawn properties
    spawnType?: 'player' | 'enemy' | 'item'; // What spawns here
    // Spring/Jump Pad
    springForce?: number;
    springDirection?: 'up' | 'down' | 'left' | 'right' | 'diagonal';
    springAngle?: number;
    // Key
    keyId?: string;
    keyColor?: string;
    // Locked Door
    requiredKeyId?: string;
    locked?: boolean;
    targetLevelId?: string;
    // Hazard Zone
    hazardType?: 'spikes' | 'lava' | 'poison' | 'void' | 'custom';
    damage?: number;
  };
  source?: 'system' | 'user';
  userId?: string;
}

/**
 * Maps tile types to their default fill patterns
 */
const TILE_TYPE_DEFAULT_PATTERNS: Record<TileType, string> = {
  solid: 'fill-bricks',                    // Bricks for solid blocks
  bumper: 'fill-symbol-bumper',            // Bumper arrow symbol
  path: 'fill-symbol-path',                // Path dots symbol
  teleporter: 'fill-symbol-teleporter',    // Teleporter circles symbol
  death: 'fill-symbol-death',              // Death X symbol
  spawn: 'fill-symbol-spawn',              // Spawn arrow symbol
  goal: 'fill-symbol-goal',                // Goal star symbol
  checkpoint: 'fill-symbol-checkpoint',    // Checkpoint checkmark symbol
  collectible: 'fill-symbol-coin',         // Coin symbol
  platform: 'fill-symbol-platform',        // Platform arrows symbol
};

/**
 * Default solid block tile (used by platform tool when no tile is selected)
 */
export const DEFAULT_SOLID_BLOCK: TileDefinition = {
  id: 'solid-block',
  name: 'Solid Block',
  type: 'solid' as TileType,
  description: 'Basic solid block',
  texture: {
    url: '', // No default texture - use fill pattern instead
    width: 64,
    height: 64,
  },
  defaultFillPatternId: TILE_TYPE_DEFAULT_PATTERNS.solid,
  platformType: 'solid' as PlatformType,
  properties: {},
  source: 'system' as const,
};

/**
 * Color coding for tile types (for visual identification)
 */
export const TILE_TYPE_COLORS: Record<TileType, string> = {
  solid: '#3498db', // Blue
  bumper: '#f39c12', // Orange
  path: '#2ecc71', // Green
  teleporter: '#9b59b6', // Purple
  death: '#e74c3c', // Red
  spawn: '#1abc9c', // Teal
  goal: '#f1c40f', // Gold/Yellow
  checkpoint: '#16a085', // Dark Teal
  collectible: '#e67e22', // Orange
  platform: '#95a5a6', // Gray
};

/**
 * Creates a system tile definition with default fill pattern based on tile type.
 */
function createSystemTile(tile: Omit<TileDefinition, 'texture' | 'defaultFillPatternId'> & { texture: { url: string; width: number; height: number } }): TileDefinition {
  return {
    ...tile,
    defaultFillPatternId: TILE_TYPE_DEFAULT_PATTERNS[tile.type],
  } as TileDefinition;
}

/**
 * Default tile definitions
 */
export const DEFAULT_TILES: TileDefinition[] = [
  DEFAULT_SOLID_BLOCK,
  createSystemTile({
    id: 'bumper-block',
    name: 'Bumper Block',
    type: 'bumper',
    description: 'Single block that can be bumped from underneath',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {
      isBumpable: true,
    },
    source: 'system',
  }),
  createSystemTile({
    id: 'teleporter-entrance',
    name: 'Teleporter Entrance',
    type: 'teleporter',
    description: 'Portal entrance - transports player to linked exit',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {
      teleporterId: '', // Will be set when linking
    },
    source: 'system',
  }),
  createSystemTile({
    id: 'teleporter-exit',
    name: 'Teleporter Exit',
    type: 'teleporter',
    description: 'Portal exit - where player arrives',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {
      teleporterId: '', // Will be set when linking
    },
    source: 'system',
  }),
  createSystemTile({
    id: 'death-spikes',
    name: 'Spikes',
    type: 'death',
    description: 'Spike trap - kills player on contact',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {
      deathType: 'spikes',
    },
    source: 'system',
  }),
  createSystemTile({
    id: 'death-lava',
    name: 'Lava',
    type: 'death',
    description: 'Lava pool - kills player on contact',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {
      deathType: 'lava',
    },
    source: 'system',
  }),
  createSystemTile({
    id: 'death-void',
    name: 'Void',
    type: 'death',
    description: 'Bottomless pit - kills player on contact',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {
      deathType: 'void',
    },
    source: 'system',
  }),
  createSystemTile({
    id: 'spawn-player',
    name: 'Player Start',
    type: 'spawn',
    description: 'Player starting position - place one per level',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {
      spawnType: 'player',
    },
    source: 'system',
  }),
  createSystemTile({
    id: 'goal-flag',
    name: 'Level Goal',
    type: 'goal',
    description: 'Level end goal - reach this to complete the level',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {},
    source: 'system',
  }),
  createSystemTile({
    id: 'checkpoint',
    name: 'Checkpoint',
    type: 'checkpoint',
    description: 'Save point - player respawns here after death',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {},
    source: 'system',
  }),
  createSystemTile({
    id: 'collectible-coin',
    name: 'Coin',
    type: 'collectible',
    description: 'Collectible item',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {},
    source: 'system',
  }),
  createSystemTile({
    id: 'platform-moving-horizontal',
    name: 'Moving Platform (H)',
    type: 'platform',
    description: 'Platform that moves horizontally',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {
      springDirection: 'left',
    },
    source: 'system',
  }),
  createSystemTile({
    id: 'platform-moving-vertical',
    name: 'Moving Platform (V)',
    type: 'platform',
    description: 'Platform that moves vertically',
    texture: {
      url: '',
      width: 64,
      height: 64,
    },
    platformType: 'solid',
    properties: {
      springDirection: 'up',
    },
    source: 'system',
  }),
];

/**
 * Tile Registry - holds both system and user tiles in memory for fast lookup
 */
class TileRegistry {
  private tiles: Map<string, TileDefinition> = new Map();

  constructor() {
    // Initialize with default tiles
    for (const tile of DEFAULT_TILES) {
      this.tiles.set(tile.id, tile);
    }
  }

  /**
   * Register a tile (user tile) in the registry
   */
  register(tile: TileDefinition): void {
    this.tiles.set(tile.id, tile);
  }

  /**
   * Unregister a tile from the registry
   */
  unregister(tileId: string): void {
    // Don't allow removing system tiles
    const tile = this.tiles.get(tileId);
    if (tile && tile.source === 'user') {
      this.tiles.delete(tileId);
    }
  }

  /**
   * Get a tile by ID
   */
  get(tileId: string): TileDefinition | undefined {
    return this.tiles.get(tileId);
  }

  /**
   * Get all registered tiles
   */
  getAll(): TileDefinition[] {
    return Array.from(this.tiles.values());
  }

  /**
   * Get only system tiles
   */
  getSystemTiles(): TileDefinition[] {
    return Array.from(this.tiles.values()).filter(t => t.source !== 'user');
  }

  /**
   * Load user tiles from an array (e.g., from storage)
   */
  loadUserTiles(tiles: TileDefinition[]): void {
    for (const tile of tiles) {
      if (tile.source === 'user') {
        this.tiles.set(tile.id, tile);
      }
    }
  }

  /**
   * Clear all user tiles from registry
   */
  clearUserTiles(): void {
    for (const [id, tile] of this.tiles.entries()) {
      if (tile.source === 'user') {
        this.tiles.delete(id);
      }
    }
  }
}

// Singleton registry instance
export const tileRegistry = new TileRegistry();

/**
 * Gets a tile definition by ID (checks both system and user tiles)
 */
export function getTileDefinition(tileId: string): TileDefinition | undefined {
  return tileRegistry.get(tileId);
}

/**
 * Gets all available tile definitions (system tiles only - use registry for user tiles)
 */
export function getAllTileDefinitions(): TileDefinition[] {
  return [...DEFAULT_TILES];
}

/**
 * Creates a tile definition (for future extensibility)
 */
export function createTileDefinition(data: Omit<TileDefinition, 'id'>): TileDefinition {
  logger.debug('Creating tile definition', {
    component: 'TileModel',
    operation: 'create',
    name: data.name,
  });

  const tile: TileDefinition = {
    id: `tile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    ...data,
  };

  logger.info('Tile definition created', {
    component: 'TileModel',
    operation: 'create',
    tileId: tile.id,
  });

  return tile;
}
