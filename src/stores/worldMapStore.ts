import { create } from 'zustand';
import type { WorldMap } from '@/models/WorldMap';
import { logger } from '@/utils/logger';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

interface WorldMapState {
  worldMap: WorldMap | null;
  viewport: Viewport;
  saveStatus: SaveStatus;
  selectedPathId: string | null;
  selectedStopId: string | null;

  setWorldMap: (map: WorldMap | null) => void;
  setViewport: (v: Partial<Viewport>) => void;
  panViewport: (dx: number, dy: number) => void;
  zoomViewport: (centerX: number, centerY: number, delta: number) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setSelectedPathId: (id: string | null) => void;
  setSelectedStopId: (id: string | null) => void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const DEFAULT_SCALE = 1;

export const useWorldMapStore = create<WorldMapState>((set, get) => ({
  worldMap: null,
  viewport: { x: 0, y: 0, scale: DEFAULT_SCALE },
  saveStatus: 'idle',
  selectedPathId: null,
  selectedStopId: null,

  setWorldMap: (map) => {
    logger.debug('Setting world map', {
      component: 'WorldMapStore',
      operation: 'setWorldMap',
      worldMapId: map?.id,
    });
    set({
      worldMap: map,
      selectedPathId: null,
      selectedStopId: null,
    });
  },

  setViewport: (v) => {
    set((state) => ({
      viewport: { ...state.viewport, ...v },
    }));
  },

  panViewport: (dx, dy) => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        x: state.viewport.x + dx,
        y: state.viewport.y + dy,
      },
    }));
  },

  zoomViewport: (centerX, centerY, delta) => {
    const { viewport } = get();
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * (1 + delta)));
    const factor = newScale / viewport.scale;
    set({
      viewport: {
        x: centerX - (centerX - viewport.x) * factor,
        y: centerY - (centerY - viewport.y) * factor,
        scale: newScale,
      },
    });
  },

  setSaveStatus: (status) => {
    set({ saveStatus: status });
  },

  setSelectedPathId: (id) => {
    logger.debug('Selecting path', { component: 'WorldMapStore', operation: 'setSelectedPathId', pathId: id ?? undefined });
    set({ selectedPathId: id, selectedStopId: null });
  },

  setSelectedStopId: (id) => {
    logger.debug('Selecting stop', { component: 'WorldMapStore', operation: 'setSelectedStopId', stopId: id ?? undefined });
    set({ selectedStopId: id });
  },
}));
