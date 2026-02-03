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

/**
 * Storage service interface
 * This is a foundation that will be fully implemented in Task 5
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
}

/**
 * Storage service implementation
 * Currently uses localStorage as a placeholder
 * Will be replaced with IndexedDB in Task 5
 */
class StorageServiceImpl implements StorageService {
  // Storage keys - will be used in Task 5
  // private readonly GAMES_KEY = 'fcis_games';
  // private readonly LEVELS_KEY = 'fcis_levels';
  // private readonly WORLDMAPS_KEY = 'fcis_worldmaps';
  // private readonly GRAPHICS_KEY = 'fcis_graphics';

  /**
   * Initialize storage service
   */
  init(): void {
    logger.info('Storage service initialized', {
      component: 'StorageService',
      operation: 'init',
    });
  }

  // Game operations
  async saveGame(game: Game): Promise<void> {
    logger.debug('Saving game', {
      component: 'StorageService',
      operation: 'saveGame',
      gameId: game.id,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  async loadGame(gameId: string): Promise<Game | null> {
    logger.debug('Loading game', {
      component: 'StorageService',
      operation: 'loadGame',
      gameId,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  async listGames(userId: string): Promise<Game[]> {
    logger.debug('Listing games', {
      component: 'StorageService',
      operation: 'listGames',
      userId,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  async deleteGame(gameId: string): Promise<void> {
    logger.debug('Deleting game', {
      component: 'StorageService',
      operation: 'deleteGame',
      gameId,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  // Level operations
  // TEMPORARY: Using localStorage for Task 4. Will be replaced with IndexedDB in Task 5.
  async saveLevel(level: Level): Promise<void> {
    logger.info('Saving level', {
      component: 'StorageService',
      operation: 'saveLevel',
      levelId: level.id,
    });
    
    try {
      const levelsKey = 'fcis_levels';
      const existing = localStorage.getItem(levelsKey);
      const levels: Record<string, Level> = existing ? JSON.parse(existing) : {};
      levels[level.id] = level;
      localStorage.setItem(levelsKey, JSON.stringify(levels));
      
      logger.info('Level saved successfully', {
        component: 'StorageService',
        operation: 'saveLevel',
        levelId: level.id,
      });
    } catch (error) {
      logger.error('Failed to save level', {
        component: 'StorageService',
        operation: 'saveLevel',
        levelId: level.id,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async loadLevel(levelId: string): Promise<Level | null> {
    logger.debug('Loading level', {
      component: 'StorageService',
      operation: 'loadLevel',
      levelId,
    });
    
    try {
      const levelsKey = 'fcis_levels';
      const existing = localStorage.getItem(levelsKey);
      if (!existing) {
        logger.debug('No levels found in storage', {
          component: 'StorageService',
          operation: 'loadLevel',
          levelId,
        });
        return null;
      }
      
      const levels: Record<string, Level> = JSON.parse(existing);
      const level = levels[levelId] || null;
      
      if (level) {
        logger.info('Level loaded successfully', {
          component: 'StorageService',
          operation: 'loadLevel',
          levelId,
        });
      } else {
        logger.debug('Level not found', {
          component: 'StorageService',
          operation: 'loadLevel',
          levelId,
        });
      }
      
      return level;
    } catch (error) {
      logger.error('Failed to load level', {
        component: 'StorageService',
        operation: 'loadLevel',
        levelId,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listLevels(gameId: string): Promise<Level[]> {
    logger.debug('Listing levels', {
      component: 'StorageService',
      operation: 'listLevels',
      gameId,
    });
    
    try {
      const levelsKey = 'fcis_levels';
      const existing = localStorage.getItem(levelsKey);
      if (!existing) {
        return [];
      }
      
      const levels: Record<string, Level> = JSON.parse(existing);
      const gameLevels = Object.values(levels).filter(level => level.gameId === gameId);
      
      logger.debug('Levels listed', {
        component: 'StorageService',
        operation: 'listLevels',
        gameId,
        count: gameLevels.length,
      });
      
      return gameLevels;
    } catch (error) {
      logger.error('Failed to list levels', {
        component: 'StorageService',
        operation: 'listLevels',
        gameId,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteLevel(levelId: string): Promise<void> {
    logger.info('Deleting level', {
      component: 'StorageService',
      operation: 'deleteLevel',
      levelId,
    });
    
    try {
      const levelsKey = 'fcis_levels';
      const existing = localStorage.getItem(levelsKey);
      if (!existing) {
        logger.warn('No levels found to delete', {
          component: 'StorageService',
          operation: 'deleteLevel',
          levelId,
        });
        return;
      }
      
      const levels: Record<string, Level> = JSON.parse(existing);
      if (!levels[levelId]) {
        logger.warn('Level not found for deletion', {
          component: 'StorageService',
          operation: 'deleteLevel',
          levelId,
        });
        return;
      }
      
      delete levels[levelId];
      localStorage.setItem(levelsKey, JSON.stringify(levels));
      
      logger.info('Level deleted successfully', {
        component: 'StorageService',
        operation: 'deleteLevel',
        levelId,
      });
    } catch (error) {
      logger.error('Failed to delete level', {
        component: 'StorageService',
        operation: 'deleteLevel',
        levelId,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // WorldMap operations
  async saveWorldMap(worldMap: WorldMap): Promise<void> {
    logger.debug('Saving world map', {
      component: 'StorageService',
      operation: 'saveWorldMap',
      worldMapId: worldMap.id,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  async loadWorldMap(worldMapId: string): Promise<WorldMap | null> {
    logger.debug('Loading world map', {
      component: 'StorageService',
      operation: 'loadWorldMap',
      worldMapId,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  async deleteWorldMap(worldMapId: string): Promise<void> {
    logger.debug('Deleting world map', {
      component: 'StorageService',
      operation: 'deleteWorldMap',
      worldMapId,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  // Graphic operations
  async saveGraphic(graphic: Graphic): Promise<void> {
    logger.debug('Saving graphic', {
      component: 'StorageService',
      operation: 'saveGraphic',
      graphicId: graphic.id,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  async loadGraphic(graphicId: string): Promise<Graphic | null> {
    logger.debug('Loading graphic', {
      component: 'StorageService',
      operation: 'loadGraphic',
      graphicId,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  async listGraphics(userId: string, gameId?: string): Promise<Graphic[]> {
    logger.debug('Listing graphics', {
      component: 'StorageService',
      operation: 'listGraphics',
      userId,
      gameId,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  async deleteGraphic(graphicId: string): Promise<void> {
    logger.debug('Deleting graphic', {
      component: 'StorageService',
      operation: 'deleteGraphic',
      graphicId,
    });
    // TODO: Implement in Task 5
    throw new Error('Not implemented yet - will be implemented in Task 5');
  }

  // User Tile operations
  private readonly USER_TILES_KEY = 'fcis_user_tiles';

  async saveUserTile(tile: TileDefinition): Promise<void> {
    logger.info('Saving user tile', {
      component: 'StorageService',
      operation: 'saveUserTile',
      tileId: tile.id,
    });

    try {
      const existing = localStorage.getItem(this.USER_TILES_KEY);
      const tiles: Record<string, TileDefinition> = existing ? JSON.parse(existing) : {};
      tiles[tile.id] = tile;
      localStorage.setItem(this.USER_TILES_KEY, JSON.stringify(tiles));

      logger.info('User tile saved successfully', {
        component: 'StorageService',
        operation: 'saveUserTile',
        tileId: tile.id,
      });
    } catch (error) {
      logger.error('Failed to save user tile', {
        component: 'StorageService',
        operation: 'saveUserTile',
        tileId: tile.id,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async loadUserTile(tileId: string): Promise<TileDefinition | null> {
    logger.debug('Loading user tile', {
      component: 'StorageService',
      operation: 'loadUserTile',
      tileId,
    });

    try {
      const existing = localStorage.getItem(this.USER_TILES_KEY);
      if (!existing) return null;

      const tiles: Record<string, TileDefinition> = JSON.parse(existing);
      return tiles[tileId] || null;
    } catch (error) {
      logger.error('Failed to load user tile', {
        component: 'StorageService',
        operation: 'loadUserTile',
        tileId,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listUserTiles(): Promise<TileDefinition[]> {
    logger.debug('Listing user tiles', {
      component: 'StorageService',
      operation: 'listUserTiles',
    });

    try {
      const existing = localStorage.getItem(this.USER_TILES_KEY);
      if (!existing) return [];

      const tiles: Record<string, TileDefinition> = JSON.parse(existing);
      return Object.values(tiles);
    } catch (error) {
      logger.error('Failed to list user tiles', {
        component: 'StorageService',
        operation: 'listUserTiles',
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteUserTile(tileId: string): Promise<void> {
    logger.info('Deleting user tile', {
      component: 'StorageService',
      operation: 'deleteUserTile',
      tileId,
    });

    try {
      const existing = localStorage.getItem(this.USER_TILES_KEY);
      if (!existing) return;

      const tiles: Record<string, TileDefinition> = JSON.parse(existing);
      if (!tiles[tileId]) return;

      delete tiles[tileId];
      localStorage.setItem(this.USER_TILES_KEY, JSON.stringify(tiles));

      logger.info('User tile deleted successfully', {
        component: 'StorageService',
        operation: 'deleteUserTile',
        tileId,
      });
    } catch (error) {
      logger.error('Failed to delete user tile', {
        component: 'StorageService',
        operation: 'deleteUserTile',
        tileId,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Background images (Library > Background images)
  private readonly BACKGROUND_IMAGES_KEY = 'fcis_background_images';

  async saveBackgroundImage(entry: { id: string; name: string; dataUrl: string; createdAt: number }): Promise<void> {
    try {
      const existing = localStorage.getItem(this.BACKGROUND_IMAGES_KEY);
      const map: Record<string, BackgroundImageEntry> = existing ? JSON.parse(existing) : {};
      map[entry.id] = entry;
      localStorage.setItem(this.BACKGROUND_IMAGES_KEY, JSON.stringify(map));
    } catch (error) {
      logger.error('Failed to save background image', {
        component: 'StorageService',
        operation: 'saveBackgroundImage',
        id: entry.id,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listBackgroundImages(): Promise<BackgroundImageEntry[]> {
    try {
      const existing = localStorage.getItem(this.BACKGROUND_IMAGES_KEY);
      if (!existing) return [];
      const map: Record<string, BackgroundImageEntry> = JSON.parse(existing);
      return Object.values(map).sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error('Failed to list background images', {
        component: 'StorageService',
        operation: 'listBackgroundImages',
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deleteBackgroundImage(id: string): Promise<void> {
    try {
      const existing = localStorage.getItem(this.BACKGROUND_IMAGES_KEY);
      if (!existing) return;
      const map: Record<string, BackgroundImageEntry> = JSON.parse(existing);
      delete map[id];
      localStorage.setItem(this.BACKGROUND_IMAGES_KEY, JSON.stringify(map));
    } catch (error) {
      logger.error('Failed to delete background image', {
        component: 'StorageService',
        operation: 'deleteBackgroundImage',
        id,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Tile patterns (Library > Patterns)
  private readonly TILE_PATTERNS_KEY = 'fcis_tile_patterns';

  async savePattern(pattern: TilePattern): Promise<void> {
    try {
      const existing = localStorage.getItem(this.TILE_PATTERNS_KEY);
      const map: Record<string, TilePattern> = existing ? JSON.parse(existing) : {};
      map[pattern.id] = pattern;
      localStorage.setItem(this.TILE_PATTERNS_KEY, JSON.stringify(map));
    } catch (error) {
      logger.error('Failed to save pattern', {
        component: 'StorageService',
        operation: 'savePattern',
        id: pattern.id,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async listPatterns(): Promise<TilePattern[]> {
    try {
      const existing = localStorage.getItem(this.TILE_PATTERNS_KEY);
      if (!existing) return [];
      const map: Record<string, TilePattern> = JSON.parse(existing);
      return Object.values(map).sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      logger.error('Failed to list patterns', {
        component: 'StorageService',
        operation: 'listPatterns',
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async deletePattern(id: string): Promise<void> {
    try {
      const existing = localStorage.getItem(this.TILE_PATTERNS_KEY);
      if (!existing) return;
      const map: Record<string, TilePattern> = JSON.parse(existing);
      delete map[id];
      localStorage.setItem(this.TILE_PATTERNS_KEY, JSON.stringify(map));
    } catch (error) {
      logger.error('Failed to delete pattern', {
        component: 'StorageService',
        operation: 'deletePattern',
        id,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageServiceImpl();

// Initialize on module load
storageService.init();
