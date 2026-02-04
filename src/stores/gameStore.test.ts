import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import { createGame } from '@/models/Game';

describe('GameStore', () => {
  beforeEach(() => {
    useGameStore.setState({
      currentGame: null,
      games: [],
      gamesLoadError: null,
    });
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const state = useGameStore.getState();
      expect(state.currentGame).toBeNull();
      expect(state.games).toEqual([]);
    });
  });

  describe('setCurrentGame', () => {
    it('should set current game', () => {
      const game = createGame({
        id: 'game-1',
        title: 'Test Game',
        userId: 'user-1',
      });

      useGameStore.getState().setCurrentGame(game);

      const state = useGameStore.getState();
      expect(state.currentGame).toEqual(game);
    });

    it('should set current game to null', () => {
      const game = createGame({
        id: 'game-1',
        title: 'Test Game',
        userId: 'user-1',
      });

      useGameStore.getState().setCurrentGame(game);
      useGameStore.getState().setCurrentGame(null);

      const state = useGameStore.getState();
      expect(state.currentGame).toBeNull();
    });
  });

  describe('setGames', () => {
    it('should set games list', () => {
      const game1 = createGame({ id: 'game-1', title: 'Game 1', userId: 'user-1' });
      const game2 = createGame({ id: 'game-2', title: 'Game 2', userId: 'user-1' });

      useGameStore.getState().setGames([game1, game2]);

      const state = useGameStore.getState();
      expect(state.games).toHaveLength(2);
      expect(state.games.map((g) => g.id)).toContain('game-1');
      expect(state.games.map((g) => g.id)).toContain('game-2');
    });

    it('should replace existing games list', () => {
      const game1 = createGame({ id: 'game-1', title: 'Game 1', userId: 'user-1' });
      const game2 = createGame({ id: 'game-2', title: 'Game 2', userId: 'user-1' });

      useGameStore.getState().setGames([game1]);
      useGameStore.getState().setGames([game2]);

      const state = useGameStore.getState();
      expect(state.games).toHaveLength(1);
      expect(state.games[0].id).toBe('game-2');
    });
  });

  describe('addGame', () => {
    it('should add game to games list', () => {
      const game = createGame({
        id: 'game-1',
        title: 'Test Game',
        userId: 'user-1',
      });

      useGameStore.getState().addGame(game);

      const state = useGameStore.getState();
      expect(state.games).toHaveLength(1);
      expect(state.games[0]).toEqual(game);
    });

    it('should add multiple games', () => {
      const game1 = createGame({ id: 'game-1', title: 'Game 1', userId: 'user-1' });
      const game2 = createGame({ id: 'game-2', title: 'Game 2', userId: 'user-1' });

      useGameStore.getState().addGame(game1);
      useGameStore.getState().addGame(game2);

      const state = useGameStore.getState();
      expect(state.games).toHaveLength(2);
    });
  });

  describe('updateGame', () => {
    it('should update game in games list', () => {
      const game = createGame({
        id: 'game-1',
        title: 'Original Title',
        userId: 'user-1',
      });

      useGameStore.getState().addGame(game);
      useGameStore.getState().updateGame('game-1', { title: 'Updated Title' });

      const state = useGameStore.getState();
      const updated = state.games.find((g) => g.id === 'game-1');
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(game.updatedAt);
    });

    it('should update current game if it matches', () => {
      const game = createGame({
        id: 'game-1',
        title: 'Original Title',
        userId: 'user-1',
      });

      useGameStore.getState().setCurrentGame(game);
      useGameStore.getState().addGame(game);
      useGameStore.getState().updateGame('game-1', { title: 'Updated Title' });

      const state = useGameStore.getState();
      expect(state.currentGame?.title).toBe('Updated Title');
    });

    it('should not update current game if it does not match', () => {
      const game1 = createGame({ id: 'game-1', title: 'Game 1', userId: 'user-1' });
      const game2 = createGame({ id: 'game-2', title: 'Game 2', userId: 'user-1' });

      useGameStore.getState().setCurrentGame(game1);
      useGameStore.getState().addGame(game2);
      useGameStore.getState().updateGame('game-2', { title: 'Updated Game 2' });

      const state = useGameStore.getState();
      expect(state.currentGame?.title).toBe('Game 1');
    });

    it('should not update when game not found', () => {
      useGameStore.getState().updateGame('non-existent', { title: 'Updated Title' });
      const state = useGameStore.getState();
      expect(state.games).toHaveLength(0);
    });
  });

  describe('deleteGame', () => {
    it('should remove game from games list', () => {
      const game1 = createGame({ id: 'game-1', title: 'Game 1', userId: 'user-1' });
      const game2 = createGame({ id: 'game-2', title: 'Game 2', userId: 'user-1' });

      useGameStore.getState().addGame(game1);
      useGameStore.getState().addGame(game2);
      useGameStore.getState().deleteGame('game-1');

      const state = useGameStore.getState();
      expect(state.games).toHaveLength(1);
      expect(state.games[0].id).toBe('game-2');
    });

    it('should clear current game if it was deleted', () => {
      const game = createGame({
        id: 'game-1',
        title: 'Test Game',
        userId: 'user-1',
      });

      useGameStore.getState().setCurrentGame(game);
      useGameStore.getState().addGame(game);
      useGameStore.getState().deleteGame('game-1');

      const state = useGameStore.getState();
      expect(state.currentGame).toBeNull();
    });

    it('should not clear current game if different game was deleted', () => {
      const game1 = createGame({ id: 'game-1', title: 'Game 1', userId: 'user-1' });
      const game2 = createGame({ id: 'game-2', title: 'Game 2', userId: 'user-1' });

      useGameStore.getState().setCurrentGame(game1);
      useGameStore.getState().addGame(game2);
      useGameStore.getState().deleteGame('game-2');

      const state = useGameStore.getState();
      expect(state.currentGame?.id).toBe('game-1');
    });
  });
});
