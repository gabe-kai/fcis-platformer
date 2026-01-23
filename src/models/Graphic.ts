import { logger } from '@/utils/logger';
import type { SharingScope } from '@/types';

/**
 * Graphic category for organization
 */
export type GraphicCategory = 'platform' | 'character' | 'enemy' | 'collectible' | 'decoration' | 'other';

/**
 * Graphic model interface
 */
export interface Graphic {
  id: string;
  userId: string;
  name: string;
  category: GraphicCategory;
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  gameId?: string; // If shared with specific game
  isShared: boolean;
  sharingScope: SharingScope;
  createdAt: number;
  updatedAt: number;
}

/**
 * Graphic creation data
 */
export interface CreateGraphicData {
  id?: string;
  userId: string;
  name: string;
  category?: GraphicCategory;
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  gameId?: string;
  sharingScope?: SharingScope;
}

/**
 * Graphic update data
 */
export interface UpdateGraphicData {
  name?: string;
  category?: GraphicCategory;
  imageUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  gameId?: string;
  isShared?: boolean;
  sharingScope?: SharingScope;
}

/**
 * Validation errors for graphic data
 */
export interface GraphicValidationErrors {
  id?: string;
  userId?: string;
  name?: string;
  category?: string;
  imageUrl?: string;
  width?: string;
  height?: string;
  sharingScope?: string;
}

/**
 * Validates graphic data
 */
export function validateGraphic(data: Partial<CreateGraphicData>): GraphicValidationErrors {
  const errors: GraphicValidationErrors = {};

  if (!data.userId || typeof data.userId !== 'string' || data.userId.trim().length === 0) {
    errors.userId = 'User ID is required and must be a non-empty string';
  }

  if (data.name === undefined || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.name = 'Graphic name is required and must be a non-empty string';
  } else if (data.name.length > 100) {
    errors.name = 'Graphic name must be 100 characters or less';
  }

  if (!data.imageUrl || typeof data.imageUrl !== 'string' || data.imageUrl.trim().length === 0) {
    errors.imageUrl = 'Image URL is required and must be a non-empty string';
  }

  if (data.width === undefined || typeof data.width !== 'number' || data.width <= 0) {
    errors.width = 'Width is required and must be a positive number';
  } else if (data.width > 10000) {
    errors.width = 'Width must be 10000 or less';
  }

  if (data.height === undefined || typeof data.height !== 'number' || data.height <= 0) {
    errors.height = 'Height is required and must be a positive number';
  } else if (data.height > 10000) {
    errors.height = 'Height must be 10000 or less';
  }

  if (data.category && !['platform', 'character', 'enemy', 'collectible', 'decoration', 'other'].includes(data.category)) {
    errors.category = 'Category must be one of: platform, character, enemy, collectible, decoration, other';
  }

  if (data.sharingScope && !['private', 'game', 'user', 'public'].includes(data.sharingScope)) {
    errors.sharingScope = 'Sharing scope must be one of: private, game, user, public';
  }

  return errors;
}

/**
 * Creates a Graphic model from data
 */
export function createGraphic(data: CreateGraphicData): Graphic {
  logger.debug('Creating graphic model', {
    component: 'GraphicModel',
    operation: 'create',
    userId: data.userId,
  });

  const validationErrors = validateGraphic(data);
  const hasErrors = Object.keys(validationErrors).length > 0;

  if (hasErrors) {
    logger.warn('Invalid graphic data provided', {
      component: 'GraphicModel',
      operation: 'create',
    }, { validationErrors });
    throw new Error(`Invalid graphic data: ${Object.values(validationErrors).join(', ')}`);
  }

  const now = Date.now();
  const graphic: Graphic = {
    id: data.id || `graphic_${now}_${Math.random().toString(36).substring(2, 9)}`,
    userId: data.userId.trim(),
    name: data.name.trim(),
    category: data.category || 'other',
    imageUrl: data.imageUrl.trim(),
    width: data.width,
    height: data.height,
    isShared: false,
    sharingScope: data.sharingScope || 'private',
    createdAt: now,
    updatedAt: now,
  };

  if (data.thumbnailUrl) {
    graphic.thumbnailUrl = data.thumbnailUrl.trim();
  }

  if (data.gameId) {
    graphic.gameId = data.gameId.trim();
  }

  logger.info('Graphic model created successfully', {
    component: 'GraphicModel',
    operation: 'create',
    graphicId: graphic.id,
  });

  return graphic;
}

/**
 * Updates a graphic with new data
 */
export function updateGraphic(graphic: Graphic, updates: UpdateGraphicData): Graphic {
  logger.debug('Updating graphic model', {
    component: 'GraphicModel',
    operation: 'update',
    graphicId: graphic.id,
  });

  const updated: Graphic = { ...graphic, updatedAt: Date.now() };

  if (updates.name !== undefined) {
    if (typeof updates.name !== 'string' || updates.name.trim().length === 0) {
      throw new Error('Graphic name must be a non-empty string');
    }
    if (updates.name.length > 100) {
      throw new Error('Graphic name must be 100 characters or less');
    }
    updated.name = updates.name.trim();
  }

  if (updates.category !== undefined) {
    if (!['platform', 'character', 'enemy', 'collectible', 'decoration', 'other'].includes(updates.category)) {
      throw new Error('Invalid graphic category');
    }
    updated.category = updates.category;
  }

  if (updates.imageUrl !== undefined) {
    if (typeof updates.imageUrl !== 'string' || updates.imageUrl.trim().length === 0) {
      throw new Error('Image URL must be a non-empty string');
    }
    updated.imageUrl = updates.imageUrl.trim();
  }

  if (updates.thumbnailUrl !== undefined) {
    updated.thumbnailUrl = updates.thumbnailUrl ? updates.thumbnailUrl.trim() : undefined;
  }

  if (updates.width !== undefined) {
    if (typeof updates.width !== 'number' || updates.width <= 0 || updates.width > 10000) {
      throw new Error('Width must be a positive number <= 10000');
    }
    updated.width = updates.width;
  }

  if (updates.height !== undefined) {
    if (typeof updates.height !== 'number' || updates.height <= 0 || updates.height > 10000) {
      throw new Error('Height must be a positive number <= 10000');
    }
    updated.height = updates.height;
  }

  if (updates.gameId !== undefined) {
    updated.gameId = updates.gameId ? updates.gameId.trim() : undefined;
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

  logger.info('Graphic model updated successfully', {
    component: 'GraphicModel',
    operation: 'update',
    graphicId: graphic.id,
  });

  return updated;
}

/**
 * Type guard to check if an object is a Graphic
 */
export function isGraphic(obj: unknown): obj is Graphic {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.category === 'string' &&
    ['platform', 'character', 'enemy', 'collectible', 'decoration', 'other'].includes(candidate.category) &&
    typeof candidate.imageUrl === 'string' &&
    typeof candidate.width === 'number' &&
    typeof candidate.height === 'number' &&
    typeof candidate.isShared === 'boolean' &&
    typeof candidate.sharingScope === 'string' &&
    ['private', 'game', 'user', 'public'].includes(candidate.sharingScope) &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    (candidate.thumbnailUrl === undefined || typeof candidate.thumbnailUrl === 'string') &&
    (candidate.gameId === undefined || typeof candidate.gameId === 'string')
  );
}
