import { logger } from '@/utils/logger';
import type { SharingScope } from '@/types';

/**
 * Game model interface
 */
export interface Game {
  id: string;
  title: string;
  description?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  worldMapId?: string;
  levelIds: string[];
  templateId?: string;
  isShared: boolean;
  sharingScope: SharingScope;
}

/**
 * Game creation data
 */
export interface CreateGameData {
  id?: string;
  title: string;
  description?: string;
  userId: string;
  templateId?: string;
  sharingScope?: SharingScope;
}

/**
 * Game update data
 */
export interface UpdateGameData {
  title?: string;
  description?: string;
  worldMapId?: string;
  levelIds?: string[];
  isShared?: boolean;
  sharingScope?: SharingScope;
}

/**
 * Validation errors for game data
 */
export interface GameValidationErrors {
  id?: string;
  title?: string;
  userId?: string;
  sharingScope?: string;
}

/**
 * Validates game data
 */
export function validateGame(data: Partial<CreateGameData>): GameValidationErrors {
  const errors: GameValidationErrors = {};

  if (data.title === undefined || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.title = 'Game title is required and must be a non-empty string';
  } else if (data.title.length > 100) {
    errors.title = 'Game title must be 100 characters or less';
  }

  if (!data.userId || typeof data.userId !== 'string' || data.userId.trim().length === 0) {
    errors.userId = 'User ID is required and must be a non-empty string';
  }

  if (data.sharingScope && !['private', 'game', 'user', 'public'].includes(data.sharingScope)) {
    errors.sharingScope = 'Sharing scope must be one of: private, game, user, public';
  }

  return errors;
}

/**
 * Creates a Game model from data
 */
export function createGame(data: CreateGameData): Game {
  logger.debug('Creating game model', {
    component: 'GameModel',
    operation: 'create',
    userId: data.userId,
  });

  const validationErrors = validateGame(data);
  const hasErrors = Object.keys(validationErrors).length > 0;

  if (hasErrors) {
    logger.warn('Invalid game data provided', {
      component: 'GameModel',
      operation: 'create',
    }, { validationErrors });
    throw new Error(`Invalid game data: ${Object.values(validationErrors).join(', ')}`);
  }

  const now = Date.now();
  const game: Game = {
    id: data.id || `game_${now}_${Math.random().toString(36).substring(2, 9)}`,
    title: data.title.trim(),
    userId: data.userId.trim(),
    createdAt: now,
    updatedAt: now,
    levelIds: [],
    isShared: false,
    sharingScope: data.sharingScope || 'private',
  };

  if (data.description) {
    game.description = data.description.trim();
  }

  if (data.templateId) {
    game.templateId = data.templateId.trim();
  }

  logger.info('Game model created successfully', {
    component: 'GameModel',
    operation: 'create',
    gameId: game.id,
  });

  return game;
}

/**
 * Updates a game with new data
 */
export function updateGame(game: Game, updates: UpdateGameData): Game {
  logger.debug('Updating game model', {
    component: 'GameModel',
    operation: 'update',
    gameId: game.id,
  });

  const updated: Game = { ...game, updatedAt: Date.now() };

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || updates.title.trim().length === 0) {
      throw new Error('Game title must be a non-empty string');
    }
    if (updates.title.length > 100) {
      throw new Error('Game title must be 100 characters or less');
    }
    updated.title = updates.title.trim();
  }

  if (updates.description !== undefined) {
    updated.description = updates.description ? updates.description.trim() : undefined;
  }

  if (updates.worldMapId !== undefined) {
    updated.worldMapId = updates.worldMapId ? updates.worldMapId.trim() : undefined;
  }

  if (updates.levelIds !== undefined) {
    if (!Array.isArray(updates.levelIds)) {
      throw new Error('Level IDs must be an array');
    }
    updated.levelIds = updates.levelIds;
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

  logger.info('Game model updated successfully', {
    component: 'GameModel',
    operation: 'update',
    gameId: game.id,
  });

  return updated;
}

/**
 * Type guard to check if an object is a Game
 */
export function isGame(obj: unknown): obj is Game {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.userId === 'string' &&
    typeof candidate.createdAt === 'number' &&
    typeof candidate.updatedAt === 'number' &&
    Array.isArray(candidate.levelIds) &&
    typeof candidate.isShared === 'boolean' &&
    typeof candidate.sharingScope === 'string' &&
    ['private', 'game', 'user', 'public'].includes(candidate.sharingScope) &&
    (candidate.description === undefined || typeof candidate.description === 'string') &&
    (candidate.worldMapId === undefined || typeof candidate.worldMapId === 'string') &&
    (candidate.templateId === undefined || typeof candidate.templateId === 'string')
  );
}
