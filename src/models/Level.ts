import { logger } from '@/utils/logger';
import type { CameraMode, SharingScope } from '@/types';
import type { Platform } from './Platform';

/**
 * Tile cell data - represents a single grid cell in the map
 */
export interface TileCell {
  passable: boolean;
  tileId?: string; // Optional tile definition reference (used for visuals)
  layer: 'background' | 'primary' | 'foreground';
  /** User-editable display name for this cell (overrides tile definition name in UI) */
  displayName?: string;
  properties?: Record<string, unknown>; // Tile-specific properties
  /** Fill pattern ID (from Tile Patterns library) - rendered as background layer under texture */
  fillPatternId?: string;
}

/**
 * Creates an empty tile grid with all cells passable
 */
export function createEmptyTileGrid(widthTiles: number, heightTiles: number): TileCell[][] {
  const rows: TileCell[][] = [];
  for (let y = 0; y < heightTiles; y++) {
    const row: TileCell[] = [];
    for (let x = 0; x < widthTiles; x++) {
      row.push({ passable: true, layer: 'primary' });
    }
    rows.push(row);
  }
  return rows;
}


/**
 * Level model interface
 */
export interface Level {
  id: string;
  gameId: string;
  title: string;
  description?: string;
  width: number;
  height: number;
  platforms: Platform[]; // Legacy - kept for backward compatibility, will be migrated to tileGrid
  tileGrid: TileCell[][]; // Tile-based map: 2D grid of cells
  gridSize: number; // Size of each grid cell in pixels (default: 64)
  backgroundImage?: string; // Data URL or path to background image
  cameraMode: CameraMode;
  scrollSpeed?: number;
  scrollDirection?: 'left' | 'right' | 'up' | 'down';
  killZone?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  playerSpawn?: { x: number; y: number };
  createdAt: number;
  updatedAt: number;
  isShared: boolean;
  sharingScope: SharingScope;
  isTemplate: boolean;
  /** User-editable names for tile groups. Key = groupId (tileId-minCellX-minCellY), value = display name */
  groupDisplayNames?: Record<string, string>;
}

/**
 * Level creation data
 */
export interface CreateLevelData {
  id?: string;
  gameId: string;
  title: string;
  description?: string;
  width?: number; // Width in grid cells (default: 150)
  height?: number; // Height in grid cells (default: 30)
  gridSize?: number; // Grid cell size in pixels (default: 64, range: 16-256)
  cameraMode?: CameraMode;
  scrollSpeed?: number;
  scrollDirection?: 'left' | 'right' | 'up' | 'down';
  isTemplate?: boolean;
  sharingScope?: SharingScope;
}

/**
 * Level update data
 */
export interface UpdateLevelData {
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  platforms?: Platform[];
  tileGrid?: TileCell[][];
  gridSize?: number;
  backgroundImage?: string;
  cameraMode?: CameraMode;
  scrollSpeed?: number;
  scrollDirection?: 'left' | 'right' | 'up' | 'down';
  killZone?: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
  playerSpawn?: { x: number; y: number };
  isShared?: boolean;
  sharingScope?: SharingScope;
  isTemplate?: boolean;
  groupDisplayNames?: Record<string, string>;
}

/**
 * Validation errors for level data
 */
export interface LevelValidationErrors {
  id?: string;
  gameId?: string;
  title?: string;
  width?: string;
  height?: string;
  cameraMode?: string;
  sharingScope?: string;
}

/**
 * Validates level data
 */
export function validateLevel(data: Partial<CreateLevelData>): LevelValidationErrors {
  const errors: LevelValidationErrors = {};

  if (data.title === undefined || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.title = 'Level title is required and must be a non-empty string';
  } else if (data.title.length > 100) {
    errors.title = 'Level title must be 100 characters or less';
  }

  if (!data.gameId || typeof data.gameId !== 'string' || data.gameId.trim().length === 0) {
    errors.gameId = 'Game ID is required and must be a non-empty string';
  }

  if (data.width !== undefined) {
    if (typeof data.width !== 'number' || data.width <= 0) {
      errors.width = 'Width must be a positive number';
    } else if (data.width > 10000) {
      errors.width = 'Width must be 10000 cells or less';
    }
  }

  if (data.height !== undefined) {
    if (typeof data.height !== 'number' || data.height <= 0) {
      errors.height = 'Height must be a positive number';
    } else if (data.height > 10000) {
      errors.height = 'Height must be 10000 cells or less';
    }
  }

  if (data.cameraMode && !['free', 'auto-scroll-horizontal', 'auto-scroll-vertical'].includes(data.cameraMode)) {
    errors.cameraMode = 'Camera mode must be one of: free, auto-scroll-horizontal, auto-scroll-vertical';
  }

  if (data.sharingScope && !['private', 'game', 'user', 'public'].includes(data.sharingScope)) {
    errors.sharingScope = 'Sharing scope must be one of: private, game, user, public';
  }

  return errors;
}

/**
 * Creates a Level model from data
 */
export function createLevel(data: CreateLevelData): Level {
  logger.debug('Creating level model', {
    component: 'LevelModel',
    operation: 'create',
    gameId: data.gameId,
  });

  const validationErrors = validateLevel(data);
  const hasErrors = Object.keys(validationErrors).length > 0;

  if (hasErrors) {
    logger.warn('Invalid level data provided', {
      component: 'LevelModel',
      operation: 'create',
    }, { validationErrors });
    throw new Error(`Invalid level data: ${Object.values(validationErrors).join(', ')}`);
  }

  const now = Date.now();
  const gridSize = data.gridSize || 64; // Default 64px, user-configurable 16-256
  const defaultWidthCells = 150;
  const defaultHeightCells = 30;
  // Width and height are now in cells, not pixels
  const widthCells = data.width || defaultWidthCells;
  const heightCells = data.height || defaultHeightCells;

  const level: Level = {
    id: data.id || `level_${now}_${Math.random().toString(36).substring(2, 9)}`,
    gameId: data.gameId.trim(),
    title: data.title.trim(),
    width: widthCells, // In cells
    height: heightCells, // In cells
    platforms: [], // Legacy - will be migrated to tileGrid
    tileGrid: createEmptyTileGrid(widthCells, heightCells),
    gridSize,
    cameraMode: data.cameraMode || 'free',
    createdAt: now,
    updatedAt: now,
    isShared: false,
    sharingScope: data.sharingScope || 'private',
    isTemplate: data.isTemplate || false,
  };

  if (data.description) {
    level.description = data.description.trim();
  }

  if (data.scrollSpeed !== undefined) {
    level.scrollSpeed = data.scrollSpeed;
  }

  if (data.scrollDirection) {
    level.scrollDirection = data.scrollDirection;
  }

  logger.info('Level model created successfully', {
    component: 'LevelModel',
    operation: 'create',
    levelId: level.id,
  });

  return level;
}

/**
 * Updates a level with new data
 */
export function updateLevel(level: Level, updates: UpdateLevelData): Level {
  logger.debug('Updating level model', {
    component: 'LevelModel',
    operation: 'update',
    levelId: level.id,
  });

  const updated: Level = { ...level, updatedAt: Date.now() };

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || updates.title.trim().length === 0) {
      throw new Error('Level title must be a non-empty string');
    }
    if (updates.title.length > 100) {
      throw new Error('Level title must be 100 characters or less');
    }
    updated.title = updates.title.trim();
  }

  if (updates.description !== undefined) {
    updated.description = updates.description ? updates.description.trim() : undefined;
  }

  if (updates.width !== undefined) {
    if (typeof updates.width !== 'number' || updates.width <= 0 || updates.width > 10000) {
      throw new Error('Width must be a positive number <= 10000 cells');
    }
    updated.width = updates.width; // In cells
  }

  if (updates.height !== undefined) {
    if (typeof updates.height !== 'number' || updates.height <= 0 || updates.height > 10000) {
      throw new Error('Height must be a positive number <= 10000 cells');
    }
    updated.height = updates.height; // In cells
  }

  if (updates.platforms !== undefined) {
    if (!Array.isArray(updates.platforms)) {
      throw new Error('Platforms must be an array');
    }
    updated.platforms = updates.platforms;
  }

  if (updates.tileGrid !== undefined) {
    if (!Array.isArray(updates.tileGrid)) {
      throw new Error('Tile grid must be an array');
    }
    updated.tileGrid = updates.tileGrid;
  }

  if (updates.gridSize !== undefined) {
    if (typeof updates.gridSize !== 'number' || updates.gridSize <= 0) {
      throw new Error('Grid size must be a positive number');
    }
    updated.gridSize = updates.gridSize;
  }

  if ('backgroundImage' in updates) {
    updated.backgroundImage = updates.backgroundImage ?? undefined;
  }

  if (updates.cameraMode !== undefined) {
    if (!['free', 'auto-scroll-horizontal', 'auto-scroll-vertical'].includes(updates.cameraMode)) {
      throw new Error('Invalid camera mode');
    }
    updated.cameraMode = updates.cameraMode;
  }

  if (updates.scrollSpeed !== undefined) {
    updated.scrollSpeed = updates.scrollSpeed;
  }

  if (updates.scrollDirection !== undefined) {
    updated.scrollDirection = updates.scrollDirection;
  }

  if (updates.killZone !== undefined) {
    updated.killZone = updates.killZone;
  }

  if (updates.playerSpawn !== undefined) {
    updated.playerSpawn = updates.playerSpawn;
  }

  if (updates.isShared !== undefined) {
    updated.isShared = updates.isShared;
  }

  if (updates.sharingScope !== undefined) {
    if (!['private', 'game', 'user', 'public'].includes(updates.sharingScope)) {
      throw new Error('Invalid sharing scope');
    }
    updated.sharingScope = updates.sharingScope;
  }

  if (updates.isTemplate !== undefined) {
    updated.isTemplate = updates.isTemplate;
  }

  logger.info('Level model updated successfully', {
    component: 'LevelModel',
    operation: 'update',
    levelId: level.id,
  });

  return updated;
}

/**
 * Type guard to check if an object is a Level
 */
export function isLevel(obj: unknown): obj is Level {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.gameId === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    Array.isArray(candidate.platforms) &&
    Array.isArray(candidate.tileGrid) &&
    typeof candidate.gridSize === 'number' &&
    typeof candidate.cameraMode === 'string' &&
    ['free', 'auto-scroll-horizontal', 'auto-scroll-vertical'].includes(candidate.cameraMode) &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    typeof candidate.isShared === 'boolean' &&
    typeof candidate.sharingScope === 'string' &&
    ['private', 'game', 'user', 'public'].includes(candidate.sharingScope) &&
    typeof candidate.isTemplate === 'boolean'
  );
}
