import { logger } from '@/utils/logger';
import type { Rectangle } from '@/types';

/**
 * Platform type - determines platform behavior
 */
export type PlatformType = 'solid' | 'moving' | 'destructible' | 'one-way';

/**
 * Platform model interface
 */
export interface Platform {
  id: string;
  levelId: string;
  type: PlatformType;
  bounds: Rectangle;
  graphicId?: string;
  movementPath?: Array<{ x: number; y: number }>;
  movementSpeed?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Platform creation data
 */
export interface CreatePlatformData {
  id?: string;
  levelId: string;
  type?: PlatformType;
  bounds: Rectangle;
  graphicId?: string;
  movementPath?: Array<{ x: number; y: number }>;
  movementSpeed?: number;
}

/**
 * Platform update data
 */
export interface UpdatePlatformData {
  type?: PlatformType;
  bounds?: Rectangle;
  graphicId?: string;
  movementPath?: Array<{ x: number; y: number }>;
  movementSpeed?: number;
}

/**
 * Validation errors for platform data
 */
export interface PlatformValidationErrors {
  id?: string;
  levelId?: string;
  type?: string;
  bounds?: string;
  movementPath?: string;
  movementSpeed?: string;
}

/**
 * Validates platform data
 */
export function validatePlatform(data: Partial<CreatePlatformData>): PlatformValidationErrors {
  const errors: PlatformValidationErrors = {};

  if (!data.levelId || typeof data.levelId !== 'string' || data.levelId.trim().length === 0) {
    errors.levelId = 'Level ID is required and must be a non-empty string';
  }

  if (!data.bounds || typeof data.bounds !== 'object') {
    errors.bounds = 'Bounds are required and must be a Rectangle object';
  } else {
    const bounds = data.bounds;
    if (typeof bounds.x !== 'number' || typeof bounds.y !== 'number' ||
        typeof bounds.width !== 'number' || typeof bounds.height !== 'number') {
      errors.bounds = 'Bounds must have x, y, width, and height as numbers';
    } else {
      if (bounds.width <= 0 || bounds.height <= 0) {
        errors.bounds = 'Bounds width and height must be positive numbers';
      }
    }
  }

  if (data.type && !['solid', 'moving', 'destructible', 'one-way'].includes(data.type)) {
    errors.type = 'Platform type must be one of: solid, moving, destructible, one-way';
  }

  if (data.movementPath !== undefined) {
    if (!Array.isArray(data.movementPath)) {
      errors.movementPath = 'Movement path must be an array';
    } else {
      for (const point of data.movementPath) {
        if (typeof point !== 'object' || typeof point.x !== 'number' || typeof point.y !== 'number') {
          errors.movementPath = 'Movement path must be an array of {x, y} points';
          break;
        }
      }
    }
  }

  if (data.movementSpeed !== undefined) {
    if (typeof data.movementSpeed !== 'number' || data.movementSpeed < 0) {
      errors.movementSpeed = 'Movement speed must be a non-negative number';
    }
  }

  return errors;
}

/**
 * Creates a Platform model from data
 */
export function createPlatform(data: CreatePlatformData): Platform {
  logger.debug('Creating platform model', {
    component: 'PlatformModel',
    operation: 'create',
    levelId: data.levelId,
  });

  const validationErrors = validatePlatform(data);
  const hasErrors = Object.keys(validationErrors).length > 0;

  if (hasErrors) {
    logger.warn('Invalid platform data provided', {
      component: 'PlatformModel',
      operation: 'create',
    }, { validationErrors });
    throw new Error(`Invalid platform data: ${Object.values(validationErrors).join(', ')}`);
  }

  const now = Date.now();
  const platform: Platform = {
    id: data.id || `platform_${now}_${Math.random().toString(36).substring(2, 9)}`,
    levelId: data.levelId.trim(),
    type: data.type || 'solid',
    bounds: { ...data.bounds },
    createdAt: now,
    updatedAt: now,
  };

  if (data.graphicId) {
    platform.graphicId = data.graphicId.trim();
  }

  if (data.movementPath && data.movementPath.length > 0) {
    platform.movementPath = data.movementPath.map(p => ({ ...p }));
    platform.movementSpeed = data.movementSpeed || 100;
  }

  logger.info('Platform model created successfully', {
    component: 'PlatformModel',
    operation: 'create',
    platformId: platform.id,
  });

  return platform;
}

/**
 * Updates a platform with new data
 */
export function updatePlatform(platform: Platform, updates: UpdatePlatformData): Platform {
  logger.debug('Updating platform model', {
    component: 'PlatformModel',
    operation: 'update',
    platformId: platform.id,
  });

  const updated: Platform = { ...platform, updatedAt: Date.now() };

  if (updates.type !== undefined) {
    if (!['solid', 'moving', 'destructible', 'one-way'].includes(updates.type)) {
      throw new Error('Invalid platform type');
    }
    updated.type = updates.type;
  }

  if (updates.bounds !== undefined) {
    const bounds = updates.bounds;
    if (typeof bounds.x !== 'number' || typeof bounds.y !== 'number' ||
        typeof bounds.width !== 'number' || typeof bounds.height !== 'number') {
      throw new Error('Bounds must have x, y, width, and height as numbers');
    }
    if (bounds.width <= 0 || bounds.height <= 0) {
      throw new Error('Bounds width and height must be positive numbers');
    }
    updated.bounds = { ...bounds };
  }

  if (updates.graphicId !== undefined) {
    updated.graphicId = updates.graphicId ? updates.graphicId.trim() : undefined;
  }

  if (updates.movementPath !== undefined) {
    if (updates.movementPath.length > 0) {
      updated.movementPath = updates.movementPath.map(p => ({ ...p }));
      updated.movementSpeed = updates.movementSpeed ?? updated.movementSpeed ?? 100;
    } else {
      updated.movementPath = undefined;
      updated.movementSpeed = undefined;
    }
  }

  if (updates.movementSpeed !== undefined) {
    if (typeof updates.movementSpeed !== 'number' || updates.movementSpeed < 0) {
      throw new Error('Movement speed must be a non-negative number');
    }
    updated.movementSpeed = updates.movementSpeed;
  }

  logger.info('Platform model updated successfully', {
    component: 'PlatformModel',
    operation: 'update',
    platformId: platform.id,
  });

  return updated;
}

/**
 * Type guard to check if an object is a Platform
 */
export function isPlatform(obj: unknown): obj is Platform {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.levelId === 'string' &&
    typeof candidate.type === 'string' &&
    ['solid', 'moving', 'destructible', 'one-way'].includes(candidate.type) &&
    typeof candidate.bounds === 'object' &&
    candidate.bounds !== null &&
    typeof (candidate.bounds as Record<string, unknown>).x === 'number' &&
    typeof (candidate.bounds as Record<string, unknown>).y === 'number' &&
    typeof (candidate.bounds as Record<string, unknown>).width === 'number' &&
    typeof (candidate.bounds as Record<string, unknown>).height === 'number' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    (candidate.graphicId === undefined || typeof candidate.graphicId === 'string')
  );
}
