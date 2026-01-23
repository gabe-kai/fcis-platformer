import { logger } from '@/utils/logger';
import type { Point } from '@/types';

/**
 * Path connection between levels on world map
 */
export interface WorldMapPath {
  id: string;
  fromLevelId: string;
  toLevelId: string;
  controlPoints: Point[]; // Bezier curve control points
  color?: string;
  thickness?: number;
}

/**
 * Level node on world map
 */
export interface WorldMapLevelNode {
  id: string;
  levelId: string;
  position: Point;
  thumbnail?: string;
}

/**
 * WorldMap model interface
 */
export interface WorldMap {
  id: string;
  gameId: string;
  title: string;
  backgroundImageUrl?: string;
  width: number;
  height: number;
  levelNodes: WorldMapLevelNode[];
  paths: WorldMapPath[];
  createdAt: number;
  updatedAt: number;
}

/**
 * WorldMap creation data
 */
export interface CreateWorldMapData {
  id?: string;
  gameId: string;
  title: string;
  backgroundImageUrl?: string;
  width?: number;
  height?: number;
}

/**
 * WorldMap update data
 */
export interface UpdateWorldMapData {
  title?: string;
  backgroundImageUrl?: string;
  width?: number;
  height?: number;
  levelNodes?: WorldMapLevelNode[];
  paths?: WorldMapPath[];
}

/**
 * Validation errors for world map data
 */
export interface WorldMapValidationErrors {
  id?: string;
  gameId?: string;
  title?: string;
  width?: string;
  height?: string;
}

/**
 * Validates world map data
 */
export function validateWorldMap(data: Partial<CreateWorldMapData>): WorldMapValidationErrors {
  const errors: WorldMapValidationErrors = {};

  if (data.title === undefined || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.title = 'World map title is required and must be a non-empty string';
  } else if (data.title.length > 100) {
    errors.title = 'World map title must be 100 characters or less';
  }

  if (!data.gameId || typeof data.gameId !== 'string' || data.gameId.trim().length === 0) {
    errors.gameId = 'Game ID is required and must be a non-empty string';
  }

  if (data.width !== undefined) {
    if (typeof data.width !== 'number' || data.width <= 0) {
      errors.width = 'Width must be a positive number';
    } else if (data.width > 50000) {
      errors.width = 'Width must be 50000 or less';
    }
  }

  if (data.height !== undefined) {
    if (typeof data.height !== 'number' || data.height <= 0) {
      errors.height = 'Height must be a positive number';
    } else if (data.height > 50000) {
      errors.height = 'Height must be 50000 or less';
    }
  }

  return errors;
}

/**
 * Creates a WorldMap model from data
 */
export function createWorldMap(data: CreateWorldMapData): WorldMap {
  logger.debug('Creating world map model', {
    component: 'WorldMapModel',
    operation: 'create',
    gameId: data.gameId,
  });

  const validationErrors = validateWorldMap(data);
  const hasErrors = Object.keys(validationErrors).length > 0;

  if (hasErrors) {
    logger.warn('Invalid world map data provided', {
      component: 'WorldMapModel',
      operation: 'create',
    }, { validationErrors });
    throw new Error(`Invalid world map data: ${Object.values(validationErrors).join(', ')}`);
  }

  const now = Date.now();
  const worldMap: WorldMap = {
    id: data.id || `worldmap_${now}_${Math.random().toString(36).substring(2, 9)}`,
    gameId: data.gameId.trim(),
    title: data.title.trim(),
    width: data.width || 5000,
    height: data.height || 5000,
    levelNodes: [],
    paths: [],
    createdAt: now,
    updatedAt: now,
  };

  if (data.backgroundImageUrl) {
    worldMap.backgroundImageUrl = data.backgroundImageUrl.trim();
  }

  logger.info('World map model created successfully', {
    component: 'WorldMapModel',
    operation: 'create',
    worldMapId: worldMap.id,
  });

  return worldMap;
}

/**
 * Updates a world map with new data
 */
export function updateWorldMap(worldMap: WorldMap, updates: UpdateWorldMapData): WorldMap {
  logger.debug('Updating world map model', {
    component: 'WorldMapModel',
    operation: 'update',
    worldMapId: worldMap.id,
  });

  const updated: WorldMap = { ...worldMap, updatedAt: Date.now() };

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || updates.title.trim().length === 0) {
      throw new Error('World map title must be a non-empty string');
    }
    if (updates.title.length > 100) {
      throw new Error('World map title must be 100 characters or less');
    }
    updated.title = updates.title.trim();
  }

  if (updates.backgroundImageUrl !== undefined) {
    updated.backgroundImageUrl = updates.backgroundImageUrl ? updates.backgroundImageUrl.trim() : undefined;
  }

  if (updates.width !== undefined) {
    if (typeof updates.width !== 'number' || updates.width <= 0 || updates.width > 50000) {
      throw new Error('Width must be a positive number <= 50000');
    }
    updated.width = updates.width;
  }

  if (updates.height !== undefined) {
    if (typeof updates.height !== 'number' || updates.height <= 0 || updates.height > 50000) {
      throw new Error('Height must be a positive number <= 50000');
    }
    updated.height = updates.height;
  }

  if (updates.levelNodes !== undefined) {
    if (!Array.isArray(updates.levelNodes)) {
      throw new Error('Level nodes must be an array');
    }
    updated.levelNodes = updates.levelNodes;
  }

  if (updates.paths !== undefined) {
    if (!Array.isArray(updates.paths)) {
      throw new Error('Paths must be an array');
    }
    updated.paths = updates.paths;
  }

  logger.info('World map model updated successfully', {
    component: 'WorldMapModel',
    operation: 'update',
    worldMapId: worldMap.id,
  });

  return updated;
}

/**
 * Type guard to check if an object is a WorldMap
 */
export function isWorldMap(obj: unknown): obj is WorldMap {
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
    Array.isArray(candidate.levelNodes) &&
    Array.isArray(candidate.paths) &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    (candidate.backgroundImageUrl === undefined || typeof candidate.backgroundImageUrl === 'string')
  );
}
