import { create } from 'zustand';
import type { Game } from '@/models/Game';
import { logger } from '@/utils/logger';
import { storageService } from '@/services/storageService';

interface GameState {
  currentGame: Game | null;
  games: Game[];
  /** Loading/error state for persistence operations */
  gamesLoadError: string | null;
  setCurrentGame: (game: Game | null) => void;
  setGames: (games: Game[]) => void;
  addGame: (game: Game) => void;
  updateGame: (gameId: string, updates: Partial<Game>) => void;
  deleteGame: (gameId: string) => void;
  /** Load games for user from storage and set in store */
  loadGames: (userId: string) => Promise<void>;
  /** Persist game to storage and update store */
  saveGameToStorage: (game: Game) => Promise<void>;
  /** Load a single game from storage and set as current */
  loadGameFromStorage: (gameId: string) => Promise<Game | null>;
  /** Delete game from storage and remove from store */
  deleteGameFromStorage: (gameId: string) => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentGame: null,
  games: [],
  gamesLoadError: null,

  setCurrentGame: (game) => {
    logger.debug('Setting current game', {
      component: 'GameStore',
      operation: 'setCurrentGame',
      gameId: game?.id,
    });
    set({ currentGame: game });
  },
  
  setGames: (games) => {
    logger.debug('Setting games list', {
      component: 'GameStore',
      operation: 'setGames',
      count: games.length,
    });
    set({ games });
  },
  
  addGame: (game) => {
    logger.info('Adding game', {
      component: 'GameStore',
      operation: 'addGame',
      gameId: game.id,
    });
    set((state) => ({ games: [...state.games, game] }));
  },
  
  updateGame: (gameId, updates) => {
    logger.info('Updating game', {
      component: 'GameStore',
      operation: 'updateGame',
      gameId,
    });
    
    const updatedGame = get().games.find(g => g.id === gameId);
    if (!updatedGame) {
      logger.warn('Game not found for update', {
        component: 'GameStore',
        operation: 'updateGame',
        gameId,
      });
      return;
    }
    
    const newGame: Game = {
      ...updatedGame,
      ...updates,
      updatedAt: Date.now(),
    };
    
    set((state) => ({
      games: state.games.map(g => g.id === gameId ? newGame : g),
      currentGame: state.currentGame?.id === gameId ? newGame : state.currentGame,
    }));
  },
  
  deleteGame: (gameId) => {
    logger.info('Deleting game', {
      component: 'GameStore',
      operation: 'deleteGame',
      gameId,
    });
    
    set((state) => ({
      games: state.games.filter(g => g.id !== gameId),
      currentGame: state.currentGame?.id === gameId ? null : state.currentGame,
    }));
  },

  loadGames: async (userId) => {
    set({ gamesLoadError: null });
    try {
      const games = await storageService.listGames(userId);
      set({ games });
      logger.info('Games loaded from storage', {
        component: 'GameStore',
        operation: 'loadGames',
        userId,
        count: games.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to load games', {
        component: 'GameStore',
        operation: 'loadGames',
        userId,
      }, { error: message });
      set({ gamesLoadError: message, games: [] });
    }
  },

  saveGameToStorage: async (game) => {
    try {
      await storageService.saveGame(game);
      set((state) => {
        const exists = state.games.some((g) => g.id === game.id);
        const games = exists
          ? state.games.map((g) => (g.id === game.id ? game : g))
          : [...state.games, game];
        const currentGame = state.currentGame?.id === game.id ? game : state.currentGame;
        return { games, currentGame };
      });
      logger.info('Game saved to storage', {
        component: 'GameStore',
        operation: 'saveGameToStorage',
        gameId: game.id,
      });
    } catch (error) {
      logger.error('Failed to save game', {
        component: 'GameStore',
        operation: 'saveGameToStorage',
        gameId: game.id,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  loadGameFromStorage: async (gameId) => {
    try {
      const game = await storageService.loadGame(gameId);
      if (game) {
        set((state) => {
          const exists = state.games.some((g) => g.id === gameId);
          const games = exists
            ? state.games.map((g) => (g.id === gameId ? game : g))
            : [...state.games, game];
          return { currentGame: game, games };
        });
        logger.info('Game loaded from storage', {
          component: 'GameStore',
          operation: 'loadGameFromStorage',
          gameId,
        });
      }
      return game;
    } catch (error) {
      logger.error('Failed to load game', {
        component: 'GameStore',
        operation: 'loadGameFromStorage',
        gameId,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  deleteGameFromStorage: async (gameId) => {
    try {
      await storageService.deleteGame(gameId);
      get().deleteGame(gameId);
      logger.info('Game deleted from storage', {
        component: 'GameStore',
        operation: 'deleteGameFromStorage',
        gameId,
      });
    } catch (error) {
      logger.error('Failed to delete game', {
        component: 'GameStore',
        operation: 'deleteGameFromStorage',
        gameId,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
}));
