import { create } from 'zustand';
import type { Game } from '@/models/Game';
import { logger } from '@/utils/logger';

interface GameState {
  currentGame: Game | null;
  games: Game[];
  setCurrentGame: (game: Game | null) => void;
  setGames: (games: Game[]) => void;
  addGame: (game: Game) => void;
  updateGame: (gameId: string, updates: Partial<Game>) => void;
  deleteGame: (gameId: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentGame: null,
  games: [],
  
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
}));
