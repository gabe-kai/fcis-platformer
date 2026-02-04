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
    it('should pan viewport', () => {
      useWorldMapStore.getState().panViewport(10, 20);
      expect(useWorldMapStore.getState().viewport).toEqual({ x: 10, y: 20, scale: 1 });
      useWorldMapStore.getState().panViewport(-5, 5);
      expect(useWorldMapStore.getState().viewport).toEqual({ x: 5, y: 25, scale: 1 });
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

    it('should set selected stop', () => {
      useWorldMapStore.getState().setSelectedStopId('stop-1');
      expect(useWorldMapStore.getState().selectedStopId).toBe('stop-1');
    });
  });
});
