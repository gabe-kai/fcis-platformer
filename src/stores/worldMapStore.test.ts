import { describe, it, expect, beforeEach } from 'vitest';
import { useWorldMapStore } from './worldMapStore';
import { createWorldMap } from '@/models/WorldMap';

describe('worldMapStore', () => {
  beforeEach(() => {
    useWorldMapStore.setState({
      worldMap: null,
      viewport: { x: 0, y: 0, scale: 1 },
      saveStatus: 'idle',
      selectedPathId: null,
      selectedStopId: null,
      selectedPathEditMode: 'placeStop',
      tool: 'select',
      pendingControlPoints: [],
      panInverted: false,
    });
  });

  describe('setWorldMap', () => {
    it('should set world map and clear selection', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      useWorldMapStore.getState().setWorldMap(map);
      expect(useWorldMapStore.getState().worldMap).toBe(map);
      expect(useWorldMapStore.getState().selectedPathId).toBeNull();
      expect(useWorldMapStore.getState().selectedStopId).toBeNull();
    });

    it('should set world map to null', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      useWorldMapStore.getState().setWorldMap(map);
      useWorldMapStore.getState().setWorldMap(null);
      expect(useWorldMapStore.getState().worldMap).toBeNull();
    });
  });

  describe('viewport', () => {
    it('should pan viewport (natural: drag right moves map right, so viewport x decreases)', () => {
      useWorldMapStore.getState().panViewport(10, 20);
      expect(useWorldMapStore.getState().viewport).toEqual({ x: -10, y: -20, scale: 1 });
      useWorldMapStore.getState().panViewport(-5, 5);
      expect(useWorldMapStore.getState().viewport).toEqual({ x: -5, y: -25, scale: 1 });
    });

    it('should zoom viewport and keep center', () => {
      useWorldMapStore.getState().setViewport({ x: 100, y: 100, scale: 1 });
      useWorldMapStore.getState().zoomViewport(100, 100, 0.5);
      const { viewport } = useWorldMapStore.getState();
      expect(viewport.scale).toBeGreaterThan(1);
      expect(viewport.scale).toBeLessThanOrEqual(4);
    });

    it('should clamp scale to min and max', () => {
      useWorldMapStore.getState().setViewport({ x: 0, y: 0, scale: 1 });
      useWorldMapStore.getState().zoomViewport(0, 0, -100);
      expect(useWorldMapStore.getState().viewport.scale).toBe(0.1);
      useWorldMapStore.getState().setViewport({ x: 0, y: 0, scale: 1 });
      useWorldMapStore.getState().zoomViewport(0, 0, 100);
      expect(useWorldMapStore.getState().viewport.scale).toBe(4);
    });

    it('should respect pan invert preference', () => {
      useWorldMapStore.getState().setPanInverted(true);
      useWorldMapStore.getState().panViewport(10, 20);
      expect(useWorldMapStore.getState().viewport).toEqual({ x: 10, y: 20, scale: 1 });
    });
  });

  describe('setMapSize', () => {
    it('should update world map width and height', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      useWorldMapStore.getState().setWorldMap(map);
      useWorldMapStore.getState().setMapSize(1100, 850);
      expect(useWorldMapStore.getState().worldMap?.width).toBe(1100);
      expect(useWorldMapStore.getState().worldMap?.height).toBe(850);
    });

    it('should no-op when no world map', () => {
      useWorldMapStore.getState().setMapSize(1100, 850);
      expect(useWorldMapStore.getState().worldMap).toBeNull();
    });
  });

  describe('setSaveStatus', () => {
    it('should set save status', () => {
      useWorldMapStore.getState().setSaveStatus('saving');
      expect(useWorldMapStore.getState().saveStatus).toBe('saving');
      useWorldMapStore.getState().setSaveStatus('saved');
      expect(useWorldMapStore.getState().saveStatus).toBe('saved');
    });
  });

  describe('selection', () => {
    it('should set selected path and clear stop', () => {
      useWorldMapStore.getState().setSelectedStopId('stop-1');
      useWorldMapStore.getState().setSelectedPathId('path-1');
      expect(useWorldMapStore.getState().selectedPathId).toBe('path-1');
      expect(useWorldMapStore.getState().selectedStopId).toBeNull();
    });

    it('should set selected path and reset edit mode to placeStop', () => {
      useWorldMapStore.getState().setSelectedPathEditMode('editPath');
      useWorldMapStore.getState().setSelectedPathId('path-1');
      expect(useWorldMapStore.getState().selectedPathEditMode).toBe('placeStop');
    });

    it('should set selected stop', () => {
      useWorldMapStore.getState().setSelectedStopId('stop-1');
      expect(useWorldMapStore.getState().selectedStopId).toBe('stop-1');
    });
  });

  describe('selectedPathEditMode', () => {
    it('should set edit mode to editPath', () => {
      useWorldMapStore.getState().setSelectedPathEditMode('editPath');
      expect(useWorldMapStore.getState().selectedPathEditMode).toBe('editPath');
    });

    it('should set edit mode to placeStop', () => {
      useWorldMapStore.getState().setSelectedPathEditMode('editPath');
      useWorldMapStore.getState().setSelectedPathEditMode('placeStop');
      expect(useWorldMapStore.getState().selectedPathEditMode).toBe('placeStop');
    });

    it('defaults to placeStop', () => {
      expect(useWorldMapStore.getState().selectedPathEditMode).toBe('placeStop');
    });
  });

  describe('path actions', () => {
    it('should add path and clear pending points', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      useWorldMapStore.getState().setWorldMap(map);
      useWorldMapStore.getState().addPendingControlPoint({ x: 0, y: 0 });
      useWorldMapStore.getState().addPendingControlPoint({ x: 100, y: 50 });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 50 }],
        stops: [],
      };
      useWorldMapStore.getState().addPath(path);
      const state = useWorldMapStore.getState();
      expect(state.worldMap?.paths).toHaveLength(1);
      expect(state.worldMap?.paths[0].id).toBe('path-1');
      expect(state.pendingControlPoints).toHaveLength(0);
      expect(state.selectedPathId).toBe('path-1');
    });

    it('should update path control points', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [],
      };
      useWorldMapStore.getState().setWorldMap({
        ...map,
        paths: [path],
      });
      useWorldMapStore.getState().updatePathControlPoints('path-1', [
        { x: 10, y: 10 },
        { x: 90, y: 10 },
      ]);
      expect(useWorldMapStore.getState().worldMap?.paths[0].controlPoints).toEqual([
        { x: 10, y: 10 },
        { x: 90, y: 10 },
      ]);
    });

    it('should update path style', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().updatePathStyle('path-1', '#ff0000', 4);
      const p = useWorldMapStore.getState().worldMap?.paths[0];
      expect(p?.color).toBe('#ff0000');
      expect(p?.thickness).toBe(4);
    });

    it('should remove path and clear selection if selected', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().setSelectedPathId('path-1');
      useWorldMapStore.getState().removePath('path-1');
      const state = useWorldMapStore.getState();
      expect(state.worldMap?.paths).toHaveLength(0);
      expect(state.selectedPathId).toBeNull();
    });

    it('should add control point at t (split curve)', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().addPathControlPointAtT('path-1', 0.5);
      const pts = useWorldMapStore.getState().worldMap?.paths[0].controlPoints ?? [];
      expect(pts).toHaveLength(3);
      expect(pts[1]).toEqual({ x: 50, y: 0 });
    });

    it('should remove control point', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }],
        stops: [],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().removePathControlPoint('path-1', 1);
      const pts = useWorldMapStore.getState().worldMap?.paths[0].controlPoints ?? [];
      expect(pts).toHaveLength(2);
      expect(pts[0]).toEqual({ x: 0, y: 0 });
      expect(pts[1]).toEqual({ x: 100, y: 0 });
    });

    it('should not remove control point when only 2 remain', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().removePathControlPoint('path-1', 0);
      expect(useWorldMapStore.getState().worldMap?.paths[0].controlPoints).toHaveLength(2);
    });
  });

  describe('stop actions', () => {
    it('should add stop to path and sort by t', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [] as { id: string; t: number; levelId?: string }[],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().addStopToPath('path-1', 0.8);
      useWorldMapStore.getState().addStopToPath('path-1', 0.2);
      const stops = useWorldMapStore.getState().worldMap?.paths[0].stops ?? [];
      expect(stops).toHaveLength(2);
      expect(stops[0]!.t).toBeLessThanOrEqual(stops[1]!.t);
      expect(stops[0]!.id).toMatch(/^stop_/);
      expect(stops[1]!.id).toMatch(/^stop_/);
    });

    it('should clamp stop t to [0, 1]', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().addStopToPath('path-1', 1.5);
      const stop = useWorldMapStore.getState().worldMap?.paths[0].stops?.[0];
      expect(stop?.t).toBe(1);
      useWorldMapStore.getState().addStopToPath('path-1', -0.2);
      const stops = useWorldMapStore.getState().worldMap?.paths[0].stops ?? [];
      const added = stops.find((s) => s.t === 0);
      expect(added).toBeDefined();
    });

    it('should remove stop and clear selection when selected stop removed', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [{ id: 'stop-a', t: 0.5 }],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().setSelectedStopId('stop-a');
      useWorldMapStore.getState().removeStop('path-1', 'stop-a');
      const state = useWorldMapStore.getState();
      expect(state.worldMap?.paths[0].stops).toHaveLength(0);
      expect(state.selectedStopId).toBeNull();
    });

    it('should update stop t and keep stops sorted', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [
          { id: 'stop-a', t: 0.2 },
          { id: 'stop-b', t: 0.5 },
        ],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().updateStopT('path-1', 'stop-a', 0.8);
      const stops = useWorldMapStore.getState().worldMap?.paths[0].stops ?? [];
      expect(stops.find((s) => s.id === 'stop-a')?.t).toBe(0.8);
      expect(stops[0]!.t).toBeLessThanOrEqual(stops[1]!.t);
    });

    it('should assign level to stop', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [{ id: 'stop-a', t: 0.5 }],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().assignLevelToStop('path-1', 'stop-a', 'level-1');
      const stop = useWorldMapStore.getState().worldMap?.paths[0].stops?.[0];
      expect(stop?.levelId).toBe('level-1');
    });

    it('should unassign level when levelId is undefined', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [{ id: 'stop-a', t: 0.5, levelId: 'level-1' }],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().assignLevelToStop('path-1', 'stop-a', undefined);
      const stop = useWorldMapStore.getState().worldMap?.paths[0].stops?.[0];
      expect(stop?.levelId).toBeUndefined();
    });

    it('should no-op when path or world map missing for stop actions', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      const path = {
        id: 'path-1',
        controlPoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        stops: [{ id: 'stop-a', t: 0.5 }],
      };
      useWorldMapStore.getState().setWorldMap({ ...map, paths: [path] });
      useWorldMapStore.getState().addStopToPath('path-missing', 0.5);
      expect(useWorldMapStore.getState().worldMap?.paths[0].stops).toHaveLength(1);
      useWorldMapStore.getState().setWorldMap(null);
      useWorldMapStore.getState().addStopToPath('path-1', 0.5);
      expect(useWorldMapStore.getState().worldMap).toBeNull();
    });
  });

  describe('updateWorldMapBackgroundImage', () => {
    it('should set background image url', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      useWorldMapStore.getState().setWorldMap(map);
      useWorldMapStore.getState().updateWorldMapBackgroundImage('data:image/png;base64,abc');
      expect(useWorldMapStore.getState().worldMap?.backgroundImageUrl).toBe('data:image/png;base64,abc');
    });

    it('should clear background image when url is undefined', () => {
      const map = createWorldMap({ gameId: 'g1', title: 'Map 1' });
      useWorldMapStore.getState().setWorldMap({ ...map, backgroundImageUrl: 'data:image/png;base64,old' });
      useWorldMapStore.getState().updateWorldMapBackgroundImage(undefined);
      expect(useWorldMapStore.getState().worldMap?.backgroundImageUrl).toBeUndefined();
    });

    it('should no-op when no world map', () => {
      useWorldMapStore.getState().updateWorldMapBackgroundImage('data:image/png;base64,x');
      expect(useWorldMapStore.getState().worldMap).toBeNull();
    });
  });
});
