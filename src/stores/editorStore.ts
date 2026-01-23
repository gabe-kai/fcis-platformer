import { create } from 'zustand';

// Placeholder types - will be replaced with proper models in Task 3
interface Level {
  id: string;
  name: string;
  width: number;
  height: number;
}

interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface EditorState {
  currentLevel: Level | null;
  selectedTool: string;
  selectedPlatform: Platform | null;
  gridEnabled: boolean;
  gridSize: number;
  setCurrentLevel: (level: Level) => void;
  setSelectedTool: (tool: string) => void;
  setSelectedPlatform: (platform: Platform | null) => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  currentLevel: null,
  selectedTool: 'select',
  selectedPlatform: null,
  gridEnabled: true,
  gridSize: 32,
  setCurrentLevel: (level) => set({ currentLevel: level }),
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  setSelectedPlatform: (platform) => set({ selectedPlatform: platform }),
  toggleGrid: () => set((state) => ({ gridEnabled: !state.gridEnabled })),
  setGridSize: (size) => set({ gridSize: size }),
}));
