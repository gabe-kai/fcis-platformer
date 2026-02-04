import { logger } from '@/utils/logger';
import type { Game, Level, WorldMap, Graphic } from '@/models';
import type { TileDefinition } from '@/models/Tile';
import type { TilePattern } from '@/types';

export type BackgroundImageEntry = {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
  description?: string;
};

const DB_NAME = 'FCIS_Platformer';
/** Bump when adding new stores or indexes; add upgrade logic in onupgradeneeded. */
const DB_VERSION = 1;
const MIGRATION_FLAG_KEY = 'fcis_indexeddb_migrated';
const LEGACY_LEVELS_KEY = 'fcis_levels';
const LEGACY_USER_TILES_KEY = 'fcis_user_tiles';
const LEGACY_BACKGROUND_IMAGES_KEY = 'fcis_background_images';
const LEGACY_TILE_PATTERNS_KEY = 'fcis_tile_patterns';

const STORE_NAMES = {
  GAMES: 'games',
  LEVELS: 'levels',
  WORLDMAPS: 'worldmaps',
  GRAPHICS: 'graphics',
  USER_TILES: 'userTiles',
  BACKGROUND_IMAGES: 'backgroundImages',
  PATTERNS: 'patterns',
} as const;

/**
 * Storage service interface
 * Implemented with IndexedDB (Task 5).
 */
export interface StorageService {
  // Game operations
  saveGame(game: Game): Promise<void>;
  loadGame(gameId: string): Promise<Game | null>;
  listGames(userId: string): Promise<Game[]>;
  deleteGame(gameId: string): Promise<void>;

  // Level operations
  saveLevel(level: Level): Promise<void>;
  loadLevel(levelId: string): Promise<Level | null>;
  listLevels(gameId: string): Promise<Level[]>;
  deleteLevel(levelId: string): Promise<void>;

  // WorldMap operations
  saveWorldMap(worldMap: WorldMap): Promise<void>;
  loadWorldMap(worldMapId: string): Promise<WorldMap | null>;
  deleteWorldMap(worldMapId: string): Promise<void>;

  // Graphic operations
  saveGraphic(graphic: Graphic): Promise<void>;
  loadGraphic(graphicId: string): Promise<Graphic | null>;
  listGraphics(userId: string, gameId?: string): Promise<Graphic[]>;
  deleteGraphic(graphicId: string): Promise<void>;

  // User Tile operations
  saveUserTile(tile: TileDefinition): Promise<void>;
  loadUserTile(tileId: string): Promise<TileDefinition | null>;
  listUserTiles(): Promise<TileDefinition[]>;
  deleteUserTile(tileId: string): Promise<void>;

  // Background images (Library > Background images)
  saveBackgroundImage(entry: BackgroundImageEntry): Promise<void>;
  listBackgroundImages(): Promise<BackgroundImageEntry[]>;
  deleteBackgroundImage(id: string): Promise<void>;

  // Tile patterns (Library > Patterns, saved from selection)
  savePattern(pattern: TilePattern): Promise<void>;
  listPatterns(): Promise<TilePattern[]>;
  deletePattern(id: string): Promise<void>;

  // Quota & cleanup (Task 5.5)
  getStorageEstimate(): Promise<{ usage: number; quota: number; usageRatio: number } | null>;
  getStorageBreakdown(): Promise<StorageBreakdown>;
  clearBackgroundImages(): Promise<void>;
  clearPatterns(): Promise<void>;
}

export type StorageBreakdown = {
  games: number;
  levels: number;
  worldmaps: number;
  graphics: number;
  userTiles: number;
  backgroundImages: number;
  patterns: number;
};

/** Returns true if the error is a storage quota exceeded error. */
export function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

/**
 * Opens IndexedDB and creates object stores on first version.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      logger.error('IndexedDB open failed', {
        component: 'StorageService',
        operation: 'openDb',
      }, { error: request.error?.message });
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAMES.GAMES)) {
        db.createObjectStore(STORE_NAMES.GAMES, { keyPath: 'id' }).createIndex('by_userId', 'userId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.LEVELS)) {
        db.createObjectStore(STORE_NAMES.LEVELS, { keyPath: 'id' }).createIndex('by_gameId', 'gameId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.WORLDMAPS)) {
        db.createObjectStore(STORE_NAMES.WORLDMAPS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.GRAPHICS)) {
        const g = db.createObjectStore(STORE_NAMES.GRAPHICS, { keyPath: 'id' });
        g.createIndex('by_userId', 'userId', { unique: false });
        g.createIndex('by_gameId', 'gameId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.USER_TILES)) {
        db.createObjectStore(STORE_NAMES.USER_TILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.BACKGROUND_IMAGES)) {
        db.createObjectStore(STORE_NAMES.BACKGROUND_IMAGES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_NAMES.PATTERNS)) {
        db.createObjectStore(STORE_NAMES.PATTERNS, { keyPath: 'id' });
      }
      logger.info('IndexedDB schema created', { component: 'StorageService', operation: 'onupgradeneeded', version: DB_VERSION });
    };
  });
}

/**
 * Migrate data from localStorage into IndexedDB (one-time).
 */
async function migrateFromLocalStorage(db: IDBDatabase): Promise<void> {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;

  logger.info('Migrating localStorage to IndexedDB', { component: 'StorageService', operation: 'migrate' });

  const put = <T>(storeName: string, items: T[]): Promise<void> =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      let count = 0;
      const total = items.length;
      if (total === 0) {
        resolve();
        return;
      }
      items.forEach((item) => {
        const req = store.put(item);
        req.onsuccess = () => {
          count++;
          if (count === total) resolve();
        };
      });
      tx.onerror = () => reject(tx.error);
    });

  try {
    const levelsRaw = localStorage.getItem(LEGACY_LEVELS_KEY);
    if (levelsRaw) {
      const levels = Object.values(JSON.parse(levelsRaw) as Record<string, Level>);
      await put(STORE_NAMES.LEVELS, levels);
      logger.info('Migrated levels', { component: 'StorageService', operation: 'migrate', count: levels.length });
    }

    const tilesRaw = localStorage.getItem(LEGACY_USER_TILES_KEY);
    if (tilesRaw) {
      const tiles = Object.values(JSON.parse(tilesRaw) as Record<string, TileDefinition>);
      await put(STORE_NAMES.USER_TILES, tiles);
      logger.info('Migrated user tiles', { component: 'StorageService', operation: 'migrate', count: tiles.length });
    }

    const bgRaw = localStorage.getItem(LEGACY_BACKGROUND_IMAGES_KEY);
    if (bgRaw) {
      const entries = Object.values(JSON.parse(bgRaw) as Record<string, BackgroundImageEntry>);
      await put(STORE_NAMES.BACKGROUND_IMAGES, entries);
      logger.info('Migrated background images', { component: 'StorageService', operation: 'migrate', count: entries.length });
    }

    const patternsRaw = localStorage.getItem(LEGACY_TILE_PATTERNS_KEY);
    if (patternsRaw) {
      const patterns = Object.values(JSON.parse(patternsRaw) as Record<string, TilePattern>);
      await put(STORE_NAMES.PATTERNS, patterns);
      logger.info('Migrated patterns', { component: 'StorageService', operation: 'migrate', count: patterns.length });
    }

    localStorage.setItem(MIGRATION_FLAG_KEY, '1');
    logger.info('Migration complete', { component: 'StorageService', operation: 'migrate' });
  } catch (error) {
    logger.error('Migration failed', { component: 'StorageService', operation: 'migrate' }, { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Storage service implementation using IndexedDB.
 */
class StorageServiceImpl implements StorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase> | null = null;

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;
    this.initPromise = openIndexedDB().then(async (db) => {
      await migrateFromLocalStorage(db);
      this.db = db;
      return db;
    });
    return this.initPromise;
  }

  /**
   * Initialize storage service (logs only; real init is lazy on first use).
   */
  init(): void {
    logger.info('Storage service initialized (IndexedDB lazy init on first use)', {
      component: 'StorageService',
      operation: 'init',
    });
  }

  private async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  private async put(storeName: string, value: unknown): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => {
        const err = req.error;
        if (err && isQuotaExceededError(err)) {
          logger.warn('Storage quota exceeded', {
            component: 'StorageService',
            operation: 'put',
            storeName,
          }, { error: err.message });
        }
        reject(err);
      };
    });
  }

  private async delete(storeName: string, key: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async getAll<T>(storeName: string, indexName?: string, indexValue?: string): Promise<T[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const source = indexName && indexValue != null ? store.index(indexName) : store;
      const req = indexName && indexValue != null
        ? (source as IDBIndex).getAll(IDBKeyRange.only(indexValue))
        : (source as IDBObjectStore).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  }

  // Game operations
  async saveGame(game: Game): Promise<void> {
    logger.info('Saving game', {
      component: 'StorageService',
      operation: 'saveGame',
      gameId: game.id,
    });
    try {
      await this.put(STORE_NAMES.GAMES, game);
      logger.info('Game saved successfully', { component: 'StorageService', operation: 'saveGame', gameId: game.id });
    } catch (error) {
      logger.error('Failed to save game', { component: 'StorageService', operation: 'saveGame', gameId: game.id }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async loadGame(gameId: string): Promise<Game | null> {
    logger.debug('Loading game', { component: 'StorageService', operation: 'loadGame', gameId });
    try {
      const game = await this.get<Game>(STORE_NAMES.GAMES, gameId);
      if (game) logger.info('Game loaded', { component: 'StorageService', operation: 'loadGame', gameId });
      return game;
    } catch (error) {
      logger.error('Failed to load game', { component: 'StorageService', operation: 'loadGame', gameId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listGames(userId: string): Promise<Game[]> {
    logger.debug('Listing games', { component: 'StorageService', operation: 'listGames', userId });
    try {
      const games = await this.getAll<Game>(STORE_NAMES.GAMES, 'by_userId', userId);
      logger.debug('Games listed', { component: 'StorageService', operation: 'listGames', userId, count: games.length });
      return games;
    } catch (error) {
      logger.error('Failed to list games', { component: 'StorageService', operation: 'listGames', userId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteGame(gameId: string): Promise<void> {
    logger.info('Deleting game', { component: 'StorageService', operation: 'deleteGame', gameId });
    try {
      const levels = await this.listLevels(gameId);
      for (const level of levels) {
        await this.delete(STORE_NAMES.LEVELS, level.id);
        logger.debug('Deleted level belonging to game', { component: 'StorageService', operation: 'deleteGame', levelId: level.id });
      }
      await this.delete(STORE_NAMES.GAMES, gameId);
      logger.info('Game deleted', { component: 'StorageService', operation: 'deleteGame', gameId, levelsDeleted: levels.length });
    } catch (error) {
      logger.error('Failed to delete game', { component: 'StorageService', operation: 'deleteGame', gameId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Level operations
  async saveLevel(level: Level): Promise<void> {
    logger.info('Saving level', { component: 'StorageService', operation: 'saveLevel', levelId: level.id });
    try {
      await this.put(STORE_NAMES.LEVELS, level);
      logger.info('Level saved successfully', { component: 'StorageService', operation: 'saveLevel', levelId: level.id });
    } catch (error) {
      logger.error('Failed to save level', { component: 'StorageService', operation: 'saveLevel', levelId: level.id }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async loadLevel(levelId: string): Promise<Level | null> {
    logger.debug('Loading level', { component: 'StorageService', operation: 'loadLevel', levelId });
    try {
      const level = await this.get<Level>(STORE_NAMES.LEVELS, levelId);
      if (level) logger.info('Level loaded', { component: 'StorageService', operation: 'loadLevel', levelId });
      return level;
    } catch (error) {
      logger.error('Failed to load level', { component: 'StorageService', operation: 'loadLevel', levelId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listLevels(gameId: string): Promise<Level[]> {
    logger.debug('Listing levels', { component: 'StorageService', operation: 'listLevels', gameId });
    try {
      const levels = await this.getAll<Level>(STORE_NAMES.LEVELS, 'by_gameId', gameId);
      logger.debug('Levels listed', { component: 'StorageService', operation: 'listLevels', gameId, count: levels.length });
      return levels;
    } catch (error) {
      logger.error('Failed to list levels', { component: 'StorageService', operation: 'listLevels', gameId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteLevel(levelId: string): Promise<void> {
    logger.info('Deleting level', { component: 'StorageService', operation: 'deleteLevel', levelId });
    try {
      await this.delete(STORE_NAMES.LEVELS, levelId);
      logger.info('Level deleted', { component: 'StorageService', operation: 'deleteLevel', levelId });
    } catch (error) {
      logger.error('Failed to delete level', { component: 'StorageService', operation: 'deleteLevel', levelId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // WorldMap operations
  async saveWorldMap(worldMap: WorldMap): Promise<void> {
    logger.debug('Saving world map', { component: 'StorageService', operation: 'saveWorldMap', worldMapId: worldMap.id });
    try {
      await this.put(STORE_NAMES.WORLDMAPS, worldMap);
    } catch (error) {
      logger.error('Failed to save world map', { component: 'StorageService', operation: 'saveWorldMap', worldMapId: worldMap.id }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async loadWorldMap(worldMapId: string): Promise<WorldMap | null> {
    logger.debug('Loading world map', { component: 'StorageService', operation: 'loadWorldMap', worldMapId });
    try {
      return await this.get<WorldMap>(STORE_NAMES.WORLDMAPS, worldMapId);
    } catch (error) {
      logger.error('Failed to load world map', { component: 'StorageService', operation: 'loadWorldMap', worldMapId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteWorldMap(worldMapId: string): Promise<void> {
    logger.debug('Deleting world map', { component: 'StorageService', operation: 'deleteWorldMap', worldMapId });
    try {
      await this.delete(STORE_NAMES.WORLDMAPS, worldMapId);
    } catch (error) {
      logger.error('Failed to delete world map', { component: 'StorageService', operation: 'deleteWorldMap', worldMapId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Graphic operations
  async saveGraphic(graphic: Graphic): Promise<void> {
    logger.debug('Saving graphic', { component: 'StorageService', operation: 'saveGraphic', graphicId: graphic.id });
    try {
      await this.put(STORE_NAMES.GRAPHICS, graphic);
    } catch (error) {
      logger.error('Failed to save graphic', { component: 'StorageService', operation: 'saveGraphic', graphicId: graphic.id }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async loadGraphic(graphicId: string): Promise<Graphic | null> {
    logger.debug('Loading graphic', { component: 'StorageService', operation: 'loadGraphic', graphicId });
    try {
      return await this.get<Graphic>(STORE_NAMES.GRAPHICS, graphicId);
    } catch (error) {
      logger.error('Failed to load graphic', { component: 'StorageService', operation: 'loadGraphic', graphicId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listGraphics(userId: string, gameId?: string): Promise<Graphic[]> {
    logger.debug('Listing graphics', { component: 'StorageService', operation: 'listGraphics', userId, gameId });
    try {
      const all = await this.getAll<Graphic>(STORE_NAMES.GRAPHICS);
      let list = all.filter((g) => g.userId === userId);
      if (gameId != null) list = list.filter((g) => g.gameId === gameId);
      return list;
    } catch (error) {
      logger.error('Failed to list graphics', { component: 'StorageService', operation: 'listGraphics', userId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteGraphic(graphicId: string): Promise<void> {
    logger.debug('Deleting graphic', { component: 'StorageService', operation: 'deleteGraphic', graphicId });
    try {
      await this.delete(STORE_NAMES.GRAPHICS, graphicId);
    } catch (error) {
      logger.error('Failed to delete graphic', { component: 'StorageService', operation: 'deleteGraphic', graphicId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // User Tile operations
  async saveUserTile(tile: TileDefinition): Promise<void> {
    logger.info('Saving user tile', { component: 'StorageService', operation: 'saveUserTile', tileId: tile.id });
    try {
      await this.put(STORE_NAMES.USER_TILES, tile);
      logger.info('User tile saved successfully', { component: 'StorageService', operation: 'saveUserTile', tileId: tile.id });
    } catch (error) {
      logger.error('Failed to save user tile', { component: 'StorageService', operation: 'saveUserTile', tileId: tile.id }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async loadUserTile(tileId: string): Promise<TileDefinition | null> {
    logger.debug('Loading user tile', { component: 'StorageService', operation: 'loadUserTile', tileId });
    try {
      return await this.get<TileDefinition>(STORE_NAMES.USER_TILES, tileId);
    } catch (error) {
      logger.error('Failed to load user tile', { component: 'StorageService', operation: 'loadUserTile', tileId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listUserTiles(): Promise<TileDefinition[]> {
    logger.debug('Listing user tiles', { component: 'StorageService', operation: 'listUserTiles' });
    try {
      return await this.getAll<TileDefinition>(STORE_NAMES.USER_TILES);
    } catch (error) {
      logger.error('Failed to list user tiles', { component: 'StorageService', operation: 'listUserTiles' }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteUserTile(tileId: string): Promise<void> {
    logger.info('Deleting user tile', { component: 'StorageService', operation: 'deleteUserTile', tileId });
    try {
      await this.delete(STORE_NAMES.USER_TILES, tileId);
      logger.info('User tile deleted successfully', { component: 'StorageService', operation: 'deleteUserTile', tileId });
    } catch (error) {
      logger.error('Failed to delete user tile', { component: 'StorageService', operation: 'deleteUserTile', tileId }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Background images (Library > Background images)
  async saveBackgroundImage(entry: BackgroundImageEntry): Promise<void> {
    try {
      await this.put(STORE_NAMES.BACKGROUND_IMAGES, entry);
    } catch (error) {
      logger.error('Failed to save background image', { component: 'StorageService', operation: 'saveBackgroundImage', id: entry.id }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listBackgroundImages(): Promise<BackgroundImageEntry[]> {
    try {
      const list = await this.getAll<BackgroundImageEntry>(STORE_NAMES.BACKGROUND_IMAGES);
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error('Failed to list background images', { component: 'StorageService', operation: 'listBackgroundImages' }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteBackgroundImage(id: string): Promise<void> {
    try {
      await this.delete(STORE_NAMES.BACKGROUND_IMAGES, id);
    } catch (error) {
      logger.error('Failed to delete background image', { component: 'StorageService', operation: 'deleteBackgroundImage', id }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Tile patterns (Library > Patterns)
  async savePattern(pattern: TilePattern): Promise<void> {
    try {
      await this.put(STORE_NAMES.PATTERNS, pattern);
    } catch (error) {
      logger.error('Failed to save pattern', { component: 'StorageService', operation: 'savePattern', id: pattern.id }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listPatterns(): Promise<TilePattern[]> {
    try {
      const list = await this.getAll<TilePattern>(STORE_NAMES.PATTERNS);
      return list.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error('Failed to list patterns', { component: 'StorageService', operation: 'listPatterns' }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deletePattern(id: string): Promise<void> {
    try {
      await this.delete(STORE_NAMES.PATTERNS, id);
    } catch (error) {
      logger.error('Failed to delete pattern', { component: 'StorageService', operation: 'deletePattern', id }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Quota & cleanup (Task 5.5)
  async getStorageEstimate(): Promise<{ usage: number; quota: number; usageRatio: number } | null> {
    try {
      const nav = typeof navigator !== 'undefined' ? navigator : undefined;
      const estimate = (nav as Navigator & { storage?: { estimate?: () => Promise<{ usage: number; quota: number }> } })?.storage?.estimate;
      if (!estimate) return null;
      const { usage = 0, quota = 0 } = await estimate();
      const usageRatio = quota > 0 ? usage / quota : 0;
      if (usageRatio >= 0.8) {
        logger.warn('Storage quota warning', {
          component: 'StorageService',
          operation: 'check_quota',
        }, { usage, quota, usageRatio: Math.round(usageRatio * 100) });
      }
      return { usage, quota, usageRatio };
    } catch (error) {
      logger.debug('Storage estimate unavailable', { component: 'StorageService', operation: 'getStorageEstimate' }, { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }

  async getStorageBreakdown(): Promise<StorageBreakdown> {
    try {
      await this.getDb();
      const [games, levels, worldmaps, graphics, userTiles, backgroundImages, patterns] = await Promise.all([
        this.getAll<Game>(STORE_NAMES.GAMES),
        this.getAll<Level>(STORE_NAMES.LEVELS),
        this.getAll<unknown>(STORE_NAMES.WORLDMAPS),
        this.getAll<unknown>(STORE_NAMES.GRAPHICS),
        this.getAll<unknown>(STORE_NAMES.USER_TILES),
        this.getAll<unknown>(STORE_NAMES.BACKGROUND_IMAGES),
        this.getAll<unknown>(STORE_NAMES.PATTERNS),
      ]);
      return {
        games: games.length,
        levels: levels.length,
        worldmaps: worldmaps.length,
        graphics: graphics.length,
        userTiles: userTiles.length,
        backgroundImages: backgroundImages.length,
        patterns: patterns.length,
      };
    } catch (error) {
      logger.error('Failed to get storage breakdown', { component: 'StorageService', operation: 'getStorageBreakdown' }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async clearStore(storeName: string): Promise<void> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async clearBackgroundImages(): Promise<void> {
    try {
      await this.clearStore(STORE_NAMES.BACKGROUND_IMAGES);
      logger.info('Cleared all background images', { component: 'StorageService', operation: 'clearBackgroundImages' });
    } catch (error) {
      logger.error('Failed to clear background images', { component: 'StorageService', operation: 'clearBackgroundImages' }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async clearPatterns(): Promise<void> {
    try {
      const patterns = await this.listPatterns();
      const userPatterns = patterns.filter((p) => p.source !== 'system');
      for (const p of userPatterns) {
        await this.deletePattern(p.id);
      }
      logger.info('Cleared user patterns (system patterns kept)', {
        component: 'StorageService',
        operation: 'clearPatterns',
        deleted: userPatterns.length,
        systemKept: patterns.length - userPatterns.length,
      });
    } catch (error) {
      logger.error('Failed to clear patterns', { component: 'StorageService', operation: 'clearPatterns' }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageServiceImpl();

// Initialize on module load
storageService.init();
