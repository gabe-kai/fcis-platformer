import { create } from 'zustand';
import type { WorldMap, WorldMapPath, WorldMapPathStop } from '@/models/WorldMap';
import type { Point } from '@/types';
import { logger } from '@/utils/logger';
import { splitCurveAtT } from '@/utils/bezier';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export type WorldMapTool = 'select' | 'drawPath';

/** When a path is selected: edit path (show control points/handles) or place stop (no handles). */
export type SelectedPathEditMode = 'editPath' | 'placeStop';

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

/** When false, drag pans the map in the direction of the drag (natural). When true, drag pans the opposite way. */
export type PanInvertPreference = boolean;

interface WorldMapState {
  worldMap: WorldMap | null;
  viewport: Viewport;
  saveStatus: SaveStatus;
  selectedPathId: string | null;
  selectedStopId: string | null;
  /** When a path is selected: show handles (editPath) or hide them (placeStop). */
  selectedPathEditMode: SelectedPathEditMode;
  tool: WorldMapTool;
  /** Control points being placed for a new path (drawPath mode). */
  pendingControlPoints: Point[];
  /** Angle (radians) for the next segment's in-handle (point about to be placed). Wheel rotates this. */
  pendingHandleAngle: number;
  /** When exactly one anchor is placed, its out-handle angle (locked; wheel no longer changes it). */
  firstAnchorOutAngle: number | null;
  /** Out-handle angle of the last placed anchor (2nd, 3rd, …). Fixed until next anchor is placed. */
  lastAnchorCommittedOutAngle: number | null;
  /** If true, pan direction is inverted (drag right = map moves left). */
  panInverted: boolean;

  setWorldMap: (map: WorldMap | null) => void;
  setViewport: (v: Partial<Viewport>) => void;
  panViewport: (dx: number, dy: number) => void;
  setPanInverted: (inverted: boolean) => void;
  zoomViewport: (centerX: number, centerY: number, delta: number) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setSelectedPathId: (id: string | null) => void;
  setSelectedStopId: (id: string | null) => void;
  setSelectedPathEditMode: (mode: SelectedPathEditMode) => void;
  setTool: (tool: WorldMapTool) => void;
  addPendingControlPoint: (point: Point) => void;
  setPendingHandleAngle: (angle: number) => void;
  clearPendingControlPoints: () => void;
  addPath: (path: WorldMapPath) => void;
  updatePathControlPoints: (pathId: string, controlPoints: Point[]) => void;
  updatePathStyle: (pathId: string, color?: string, thickness?: number) => void;
  removePath: (pathId: string) => void;
  setMapSize: (width: number, height: number) => void;
  updateWorldMapBackgroundImage: (url: string | undefined) => void;
  addPathControlPointAtT: (pathId: string, t: number) => void;
  removePathControlPoint: (pathId: string, pointIndex: number) => void;
  addStopToPath: (pathId: string, t: number) => void;
  removeStop: (pathId: string, stopId: string) => void;
  updateStopT: (pathId: string, stopId: string, t: number) => void;
  assignLevelToStop: (pathId: string, stopId: string, levelId: string | undefined) => void;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 4;
const DEFAULT_SCALE = 1;
const DEFAULT_PENDING_HANDLE_LENGTH = 80;

export const useWorldMapStore = create<WorldMapState>((set, get) => ({
  worldMap: null,
  viewport: { x: 0, y: 0, scale: DEFAULT_SCALE },
  saveStatus: 'idle',
  selectedPathId: null,
  selectedStopId: null,
  selectedPathEditMode: 'placeStop',
  tool: 'select',
  pendingControlPoints: [],
  pendingHandleAngle: 0,
  firstAnchorOutAngle: null,
  lastAnchorCommittedOutAngle: null,
  panInverted: false,

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
      pendingControlPoints: [],
      firstAnchorOutAngle: null,
      lastAnchorCommittedOutAngle: null,
    });
  },

  setViewport: (v) => {
    set((state) => ({
      viewport: { ...state.viewport, ...v },
    }));
  },

  panViewport: (dx, dy) => {
    const { viewport, panInverted } = get();
    const sign = panInverted ? 1 : -1;
    set({
      viewport: {
        ...viewport,
        x: viewport.x + sign * dx,
        y: viewport.y + sign * dy,
      },
    });
  },

  setPanInverted: (inverted) => {
    set({ panInverted: inverted });
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
    set({ selectedPathId: id, selectedStopId: null, selectedPathEditMode: 'placeStop' });
  },

  setSelectedStopId: (id) => {
    logger.debug('Selecting stop', { component: 'WorldMapStore', operation: 'setSelectedStopId', stopId: id ?? undefined });
    set({ selectedStopId: id });
  },

  setSelectedPathEditMode: (mode) => {
    set({ selectedPathEditMode: mode });
  },

  setTool: (tool) => {
    set({
      tool,
      pendingControlPoints: tool === 'drawPath' ? get().pendingControlPoints : [],
      firstAnchorOutAngle: tool === 'drawPath' ? get().firstAnchorOutAngle : null,
      lastAnchorCommittedOutAngle: tool === 'drawPath' ? get().lastAnchorCommittedOutAngle : null,
    });
  },

  addPendingControlPoint: (point) => {
    set((state) => {
      const prev = state.pendingControlPoints;
      const angle = state.pendingHandleAngle;
      const firstOut = state.firstAnchorOutAngle;
      const lastOut = state.lastAnchorCommittedOutAngle;
      if (prev.length === 0) {
        return { pendingControlPoints: [point], firstAnchorOutAngle: angle };
      }
      const lastAnchor = prev[prev.length - 1]!;
      const len = DEFAULT_PENDING_HANDLE_LENGTH;
      const outAngle =
        prev.length === 1 && firstOut !== null
          ? firstOut
          : prev.length >= 4 && lastOut !== null
            ? lastOut
            : angle;
      const cosOut = Math.cos(outAngle);
      const sinOut = Math.sin(outAngle);
      const cosIn = Math.cos(angle);
      const sinIn = Math.sin(angle);
      const H_out = { x: lastAnchor.x + len * cosOut, y: lastAnchor.y + len * sinOut };
      const H_in = { x: point.x - len * cosIn, y: point.y - len * sinIn };
      return {
        pendingControlPoints: [...prev, H_out, H_in, point],
        firstAnchorOutAngle: prev.length === 1 ? null : firstOut,
        lastAnchorCommittedOutAngle: angle,
      };
    });
  },

  setPendingHandleAngle: (angle) => {
    set({ pendingHandleAngle: angle });
  },

  clearPendingControlPoints: () => {
    set({
      pendingControlPoints: [],
      pendingHandleAngle: 0,
      firstAnchorOutAngle: null,
      lastAnchorCommittedOutAngle: null,
    });
  },

  addPath: (path) => {
    const map = get().worldMap;
    if (!map) return;
    logger.info('Adding path', { component: 'WorldMapStore', operation: 'addPath', pathId: path.id });
    set({
      worldMap: { ...map, paths: [...map.paths, path], updatedAt: Date.now() },
      pendingControlPoints: [],
      tool: 'select',
      selectedPathId: path.id,
    });
  },

  updatePathControlPoints: (pathId, controlPoints) => {
    const map = get().worldMap;
    if (!map) return;
    const paths = map.paths.map((p) => (p.id === pathId ? { ...p, controlPoints } : p));
    set({ worldMap: { ...map, paths, updatedAt: Date.now() } });
  },

  updatePathStyle: (pathId, color, thickness) => {
    const map = get().worldMap;
    if (!map) return;
    const paths = map.paths.map((p) => {
      if (p.id !== pathId) return p;
      const next = { ...p };
      if (color !== undefined) next.color = color;
      if (thickness !== undefined) next.thickness = thickness;
      return next;
    });
    set({ worldMap: { ...map, paths, updatedAt: Date.now() } });
  },

  removePath: (pathId) => {
    const map = get().worldMap;
    if (!map) return;
    logger.info('Removing path', { component: 'WorldMapStore', operation: 'removePath', pathId });
    set({
      worldMap: { ...map, paths: map.paths.filter((p) => p.id !== pathId), updatedAt: Date.now() },
      selectedPathId: get().selectedPathId === pathId ? null : get().selectedPathId,
    });
  },

  setMapSize: (width, height) => {
    const map = get().worldMap;
    if (!map || width <= 0 || height <= 0) return;
    set({ worldMap: { ...map, width, height, updatedAt: Date.now() } });
  },

  updateWorldMapBackgroundImage: (url) => {
    const map = get().worldMap;
    if (!map) return;
    logger.debug('Updating world map background image', {
      component: 'WorldMapStore',
      operation: 'updateWorldMapBackgroundImage',
      worldMapId: map.id,
    });
    set({ worldMap: { ...map, backgroundImageUrl: url, updatedAt: Date.now() } });
  },

  addPathControlPointAtT: (pathId, t) => {
    const map = get().worldMap;
    if (!map) return;
    const path = map.paths.find((p) => p.id === pathId);
    if (!path?.controlPoints || path.controlPoints.length < 2) return;
    const next = splitCurveAtT(path.controlPoints, t);
    const paths = map.paths.map((p) => (p.id === pathId ? { ...p, controlPoints: next } : p));
    set({ worldMap: { ...map, paths, updatedAt: Date.now() } });
  },

  removePathControlPoint: (pathId, pointIndex) => {
    const map = get().worldMap;
    if (!map) return;
    const path = map.paths.find((p) => p.id === pathId);
    const pts = path?.controlPoints;
    if (!pts || pts.length <= 2) return;
    const isAnchorHandleFormat = pts.length >= 4 && (pts.length - 1) % 3 === 0;
    if (isAnchorHandleFormat) {
      const isAnchor = pointIndex % 3 === 0;
      if (!isAnchor || pts.length - 3 < 4) return;
      const next = pts.filter((_, i) => i < pointIndex || i > pointIndex + 2);
      const paths = map.paths.map((p) => (p.id === pathId ? { ...p, controlPoints: next } : p));
      set({ worldMap: { ...map, paths, updatedAt: Date.now() } });
    } else {
      const next = pts.filter((_, i) => i !== pointIndex);
      if (next.length < 2) return;
      const paths = map.paths.map((p) => (p.id === pathId ? { ...p, controlPoints: next } : p));
      set({ worldMap: { ...map, paths, updatedAt: Date.now() } });
    }
  },

  addStopToPath: (pathId, t) => {
    const map = get().worldMap;
    if (!map) return;
    const path = map.paths.find((p) => p.id === pathId);
    if (!path) return;
    const stops = path.stops ?? [];
    const stop: WorldMapPathStop = {
      id: `stop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      t: Math.max(0, Math.min(1, t)),
    };
    const nextStops = [...stops, stop].sort((a, b) => a.t - b.t);
    const paths = map.paths.map((p) =>
      p.id === pathId ? { ...p, stops: nextStops } : p
    );
    set({ worldMap: { ...map, paths, updatedAt: Date.now() } });
    logger.info('Stop added to path', { component: 'WorldMapStore', operation: 'addStopToPath', pathId, stopId: stop.id, t: stop.t });
  },

  removeStop: (pathId, stopId) => {
    const map = get().worldMap;
    if (!map) return;
    const path = map.paths.find((p) => p.id === pathId);
    if (!path) return;
    const stops = (path.stops ?? []).filter((s) => s.id !== stopId);
    const paths = map.paths.map((p) =>
      p.id === pathId ? { ...p, stops } : p
    );
    set({
      worldMap: { ...map, paths, updatedAt: Date.now() },
      selectedStopId: get().selectedStopId === stopId ? null : get().selectedStopId,
    });
    logger.info('Stop removed', { component: 'WorldMapStore', operation: 'removeStop', pathId, stopId });
  },

  updateStopT: (pathId, stopId, t) => {
    const map = get().worldMap;
    if (!map) return;
    const path = map.paths.find((p) => p.id === pathId);
    if (!path) return;
    const clampedT = Math.max(0, Math.min(1, t));
    const stops = (path.stops ?? []).map((s) =>
      s.id === stopId ? { ...s, t: clampedT } : s
    ).sort((a, b) => a.t - b.t);
    const paths = map.paths.map((p) =>
      p.id === pathId ? { ...p, stops } : p
    );
    set({ worldMap: { ...map, paths, updatedAt: Date.now() } });
  },

  assignLevelToStop: (pathId, stopId, levelId) => {
    const map = get().worldMap;
    if (!map) return;
    const path = map.paths.find((p) => p.id === pathId);
    if (!path) return;
    const stops = (path.stops ?? []).map((s) =>
      s.id === stopId ? { ...s, levelId } : s
    );
    const paths = map.paths.map((p) =>
      p.id === pathId ? { ...p, stops } : p
    );
    set({ worldMap: { ...map, paths, updatedAt: Date.now() } });
    logger.info('Level assigned to stop', { component: 'WorldMapStore', operation: 'assignLevelToStop', pathId, stopId, levelId });
  },
}));
