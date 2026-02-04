import { useEffect, useCallback, useLayoutEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorldMapStore } from '@/stores/worldMapStore';
import { createWorldMap } from '@/models/WorldMap';
import { storageService } from '@/services/storageService';
import { logger } from '@/utils/logger';
import { WorldMapCanvas } from './WorldMapCanvas';
import './WorldMapEditor.css';

export function WorldMapEditor() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const worldMap = useWorldMapStore((s) => s.worldMap);
  const setWorldMap = useWorldMapStore((s) => s.setWorldMap);
  const setSaveStatus = useWorldMapStore((s) => s.setSaveStatus);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [contentSize, setContentSize] = useState({ width: 800, height: 600 });

  const loadOrCreateMap = useCallback(async () => {
    if (!gameId) {
      setLoadError('No game selected');
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const maps = await storageService.listWorldMapsByGameId(gameId);
      if (maps.length > 0) {
        setWorldMap(maps[0]);
        logger.info('World map loaded', {
          component: 'WorldMapEditor',
          operation: 'load',
          worldMapId: maps[0].id,
          gameId,
        });
      } else {
        const newMap = createWorldMap({
          gameId,
          title: 'World Map 1',
        });
        await storageService.saveWorldMap(newMap);
        setWorldMap(newMap);
        logger.info('World map created', {
          component: 'WorldMapEditor',
          operation: 'create',
          worldMapId: newMap.id,
          gameId,
        });
      }
    } catch (error) {
      logger.error('Failed to load or create world map', {
        component: 'WorldMapEditor',
        operation: 'loadOrCreate',
        gameId,
      }, { error: error instanceof Error ? error.message : String(error) });
      setLoadError(error instanceof Error ? error.message : 'Failed to load world map');
    } finally {
      setLoading(false);
    }
  }, [gameId, setWorldMap]);

  useEffect(() => {
    loadOrCreateMap();
  }, [loadOrCreateMap]);

  useLayoutEffect(() => {
    const el = document.querySelector('.world-map-editor-content');
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0]?.contentRect ?? { width: 800, height: 600 };
      setContentSize({ width: Math.max(100, width), height: Math.max(100, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleSave = useCallback(async () => {
    const map = useWorldMapStore.getState().worldMap;
    if (!map) return;
    setSaveStatus('saving');
    try {
      await storageService.saveWorldMap(map);
      setSaveStatus('saved');
      logger.info('World map saved', {
        component: 'WorldMapEditor',
        operation: 'save',
        worldMapId: map.id,
      });
    } catch (error) {
      setSaveStatus('error');
      logger.error('Failed to save world map', {
        component: 'WorldMapEditor',
        operation: 'save',
        worldMapId: map.id,
      }, { error: error instanceof Error ? error.message : String(error) });
    }
  }, [setSaveStatus]);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const saveStatus = useWorldMapStore((s) => s.saveStatus);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  if (loading) {
    return (
      <div className="world-map-editor">
        <div className="world-map-editor-loading">Loading world map…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="world-map-editor">
        <div className="world-map-editor-error">
          <p>{loadError}</p>
          <button type="button" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="world-map-editor">
      <header className="world-map-editor-header">
        <h1 className="world-map-editor-title">
          World Map: {worldMap?.title ?? 'Untitled'}
        </h1>
        <div className="world-map-editor-actions">
          <button type="button" className="primary" onClick={handleSave}>
            Save
          </button>
          <span
            className={`world-map-editor-save-status ${
              saveStatus === 'saved' ? 'saved' : saveStatus === 'error' ? 'error' : ''
            }`}
            role="status"
          >
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'error' && 'Save failed'}
            {saveStatus === 'idle' && ''}
          </span>
          <button type="button" onClick={handleBack}>
            Back to Dashboard
          </button>
        </div>
      </header>
      <div className="world-map-editor-content">
        <WorldMapCanvas width={contentSize.width} height={contentSize.height} />
      </div>
    </div>
  );
}
