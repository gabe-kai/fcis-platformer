import { create } from 'zustand';

// Placeholder types - will be replaced with proper Game model in Task 3
interface Game {
  id: string;
  title: string;
  userId: string;
}

interface GameState {
  currentGame: Game | null;
  games: Game[];
  setCurrentGame: (game: Game) => void;
  setGames: (games: Game[]) => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentGame: null,
  games: [],
  setCurrentGame: (game) => set({ currentGame: game }),
  setGames: (games) => set({ games }),
}));
