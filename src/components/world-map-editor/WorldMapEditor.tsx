import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorldMapStore } from '@/stores/worldMapStore';
import { createWorldMap } from '@/models/WorldMap';
import type { Level } from '@/models/Level';
import { storageService } from '@/services/storageService';
import { getNextStopT } from '@/utils/stopPlacement';
import { logger } from '@/utils/logger';
import { WorldMapCanvas } from './WorldMapCanvas';
import { BackgroundImagePlacementModal } from '@/components/level-editor/BackgroundImagePlacementModal';
import '@/components/level-editor/BackgroundImagePlacementModal.css';
import './WorldMapEditor.css';

function generateId(): string {
  return `path_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function WorldMapEditor() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const worldMap = useWorldMapStore((s) => s.worldMap);
  const setWorldMap = useWorldMapStore((s) => s.setWorldMap);
  const setSaveStatus = useWorldMapStore((s) => s.setSaveStatus);
  const tool = useWorldMapStore((s) => s.tool);
  const setTool = useWorldMapStore((s) => s.setTool);
  const pendingControlPoints = useWorldMapStore((s) => s.pendingControlPoints);
  const addPath = useWorldMapStore((s) => s.addPath);
  const clearPendingControlPoints = useWorldMapStore((s) => s.clearPendingControlPoints);
  const selectedPathId = useWorldMapStore((s) => s.selectedPathId);
  const setSelectedPathId = useWorldMapStore((s) => s.setSelectedPathId);
  const updatePathStyle = useWorldMapStore((s) => s.updatePathStyle);
  const removePath = useWorldMapStore((s) => s.removePath);
  const panInverted = useWorldMapStore((s) => s.panInverted);
  const setPanInverted = useWorldMapStore((s) => s.setPanInverted);
  const setMapSize = useWorldMapStore((s) => s.setMapSize);
  const viewportScale = useWorldMapStore((s) => s.viewport.scale);
  const updateWorldMapBackgroundImage = useWorldMapStore(
    (s) => s.updateWorldMapBackgroundImage
  );
  const selectedStopId = useWorldMapStore((s) => s.selectedStopId);
  const setSelectedStopId = useWorldMapStore((s) => s.setSelectedStopId);
  const addStopToPath = useWorldMapStore((s) => s.addStopToPath);
  const removeStop = useWorldMapStore((s) => s.removeStop);
  const updateStopT = useWorldMapStore((s) => s.updateStopT);
  const assignLevelToStop = useWorldMapStore((s) => s.assignLevelToStop);
  const selectedPathEditMode = useWorldMapStore((s) => s.selectedPathEditMode);
  const setSelectedPathEditMode = useWorldMapStore((s) => s.setSelectedPathEditMode);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingBackgroundImageDataUrl, setPendingBackgroundImageDataUrl] =
    useState<string | null>(null);
  const [levels, setLevels] = useState<Level[]>([]);

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

  const selectedPath = worldMap?.paths.find((p) => p.id === selectedPathId) ?? null;

  const handleFinishPath = useCallback(() => {
    if (pendingControlPoints.length < 4) return;
    addPath({
      id: generateId(),
      controlPoints: [...pendingControlPoints],
      stops: [],
      color: '#888',
      thickness: 2,
    });
    clearPendingControlPoints();
  }, [pendingControlPoints, addPath, clearPendingControlPoints]);

  const handleCancelPath = useCallback(() => {
    clearPendingControlPoints();
    setTool('select');
  }, [clearPendingControlPoints, setTool]);

  const handleDeletePath = useCallback(() => {
    if (selectedPathId) {
      removePath(selectedPathId);
      setSelectedPathId(null);
      setSelectedStopId(null);
    }
  }, [selectedPathId, removePath, setSelectedPathId, setSelectedStopId]);

  const handleDeselect = useCallback(() => {
    setSelectedPathId(null);
    setSelectedStopId(null);
  }, [setSelectedPathId, setSelectedStopId]);

  useEffect(() => {
    if (!worldMap?.gameId) {
      setLevels([]);
      return;
    }
    let cancelled = false;
    storageService.listLevels(worldMap.gameId).then((list) => {
      if (!cancelled) setLevels(list);
    });
    return () => {
      cancelled = true;
    };
  }, [worldMap?.gameId]);

  const selectedStop =
    selectedPath?.stops?.find((s) => s.id === selectedStopId) ?? null;

  const handleAddStop = useCallback(() => {
    if (selectedPathId && selectedPath) {
      const t = getNextStopT(selectedPath.stops ?? []);
      addStopToPath(selectedPathId, t);
    }
  }, [selectedPathId, selectedPath, addStopToPath]);

  const handleRemoveStop = useCallback(() => {
    if (selectedPathId && selectedStopId) {
      removeStop(selectedPathId, selectedStopId);
      setSelectedStopId(null);
    }
  }, [selectedPathId, selectedStopId, removeStop, setSelectedStopId]);

  const handleStopTChange = useCallback(
    (percent: number) => {
      if (selectedPathId && selectedStopId) {
        updateStopT(selectedPathId, selectedStopId, Math.max(0, Math.min(1, percent / 100)));
      }
    },
    [selectedPathId, selectedStopId, updateStopT]
  );

  /** Step position by 0.5% (delta: -1 or +1). */
  const handleStopTStep = useCallback(
    (delta: number) => {
      if (selectedPathId && selectedStopId && selectedStop) {
        const t = Math.max(0, Math.min(1, selectedStop.t + delta * 0.005));
        updateStopT(selectedPathId, selectedStopId, t);
      }
    },
    [selectedPathId, selectedStopId, selectedStop, updateStopT]
  );

  const handleStopLevelChange = useCallback(
    (levelId: string) => {
      if (selectedPathId && selectedStopId) {
        assignLevelToStop(selectedPathId, selectedStopId, levelId || undefined);
      }
    },
    [selectedPathId, selectedStopId, assignLevelToStop]
  );

  const handleOpenInLevelEditor = useCallback(() => {
    if (selectedStop?.levelId) {
      navigate(`/editor/${selectedStop.levelId}`);
    }
  }, [selectedStop?.levelId, navigate]);

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
        <div className="world-map-editor-toolbar">
          <button
            type="button"
            className={tool === 'select' ? 'active' : ''}
            onClick={() => setTool('select')}
          >
            Select
          </button>
          <button
            type="button"
            className={tool === 'drawPath' ? 'active' : ''}
            onClick={() => setTool('drawPath')}
          >
            Add path
          </button>
          {tool === 'drawPath' && pendingControlPoints.length >= 4 && (
            <>
              <button type="button" className="primary" onClick={handleFinishPath}>
                Finish path
              </button>
              <button type="button" onClick={handleCancelPath}>
                Cancel
              </button>
            </>
          )}
        </div>
        <div className="world-map-editor-options">
          <div className="world-map-editor-option world-map-editor-background-control">
            <span className="world-map-editor-option-label">Background:</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const dataUrl = event.target?.result as string;
                    setPendingBackgroundImageDataUrl(dataUrl);
                    logger.info('Background image selected for placement', {
                      component: 'WorldMapEditor',
                      operation: 'uploadBackgroundImage',
                      fileSize: file.size,
                    });
                  };
                  reader.readAsDataURL(file);
                }
                e.target.value = '';
              }}
              style={{ fontSize: '0.85rem', maxWidth: '12rem' }}
            />
            {worldMap?.backgroundImageUrl && (
              <button
                type="button"
                className="world-map-editor-remove-bg"
                onClick={() => {
                  updateWorldMapBackgroundImage(undefined);
                  logger.info('Background image removed', {
                    component: 'WorldMapEditor',
                    operation: 'removeBackgroundImage',
                  });
                }}
                title="Remove background image"
              >
                Remove
              </button>
            )}
          </div>
          <label className="world-map-editor-option">
            <input
              type="checkbox"
              checked={panInverted}
              onChange={(e) => setPanInverted(e.target.checked)}
            />
            Invert pan
          </label>
          <span className="world-map-editor-option-label">Page:</span>
          <button
            type="button"
            className={worldMap && worldMap.width < worldMap.height ? 'active' : ''}
            onClick={() => worldMap && setMapSize(850, 1100)}
            title="Portrait 8.5×11"
          >
            Portrait
          </button>
          <button
            type="button"
            className={worldMap && worldMap.width > worldMap.height ? 'active' : ''}
            onClick={() => worldMap && setMapSize(1100, 850)}
            title="Landscape 11×8.5"
          >
            Landscape
          </button>
          <span className="world-map-editor-zoom" title="Current zoom level">
            Zoom: {Math.round(viewportScale * 100)}%
          </span>
        </div>
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
      {(selectedPath || (selectedStop && selectedPathId)) ? (
        <div className="world-map-editor-toolbar-rows">
          {selectedPath && (
            <div className="world-map-editor-path-panel">
              <span className="world-map-editor-path-panel-label">Path:</span>
              <div className="world-map-editor-path-mode-toggle">
                <button
                  type="button"
                  className={selectedPathEditMode === 'editPath' ? 'active' : ''}
                  onClick={() => setSelectedPathEditMode('editPath')}
                  title="Show control points to edit the curve"
                >
                  Edit path
                </button>
                <button
                  type="button"
                  className={selectedPathEditMode === 'placeStop' ? 'active' : ''}
                  onClick={() => setSelectedPathEditMode('placeStop')}
                  title="Add and place stops along the path"
                >
                  Place stop
                </button>
              </div>
              <label>
                Color
                <input
                  type="color"
                  value={selectedPath.color ?? '#888888'}
                  onChange={(e) => updatePathStyle(selectedPathId!, e.target.value)}
                />
              </label>
              <label>
                Thickness
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={selectedPath.thickness ?? 2}
                  onChange={(e) =>
                    updatePathStyle(selectedPathId!, undefined, parseInt(e.target.value, 10) || 2)
                  }
                />
              </label>
              <button type="button" onClick={handleAddStop}>
                Add stop
              </button>
              <button type="button" onClick={handleDeselect} title="Clear path and stop selection">
                Deselect
              </button>
              <button type="button" onClick={handleDeletePath} className="danger">
                Delete path
              </button>
            </div>
          )}
          {selectedStop && selectedPathId && (
            <div className="world-map-editor-stop-panel">
              <span className="world-map-editor-stop-panel-label">Stop:</span>
              <label className="world-map-editor-stop-position-row">
                <span className="world-map-editor-stop-position-label">Position (t)</span>
                <div className="world-map-editor-stop-position-controls">
                  <button
                    type="button"
                    className="world-map-editor-stop-t-step"
                    onClick={() => handleStopTStep(-1)}
                    title="Decrease by 0.5%"
                    aria-label="Decrease position by 0.5%"
                  >
                    ‹
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.5}
                    value={selectedStop.t * 100}
                    onChange={(e) =>
                      handleStopTChange(parseFloat(e.target.value))
                    }
                  />
                  <button
                    type="button"
                    className="world-map-editor-stop-t-step"
                    onClick={() => handleStopTStep(1)}
                    title="Increase by 0.5%"
                    aria-label="Increase position by 0.5%"
                  >
                    ›
                  </button>
                  <span className="world-map-editor-stop-t-value">
                    {(selectedStop.t * 100).toFixed(1)}%
                  </span>
                </div>
              </label>
              <label>
                Level
                <select
                  value={selectedStop.levelId ?? ''}
                  onChange={(e) => handleStopLevelChange(e.target.value)}
                >
                  <option value="">— None —</option>
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title || l.id}
                    </option>
                  ))}
                </select>
              </label>
              {selectedStop.levelId && (
                <button type="button" className="primary" onClick={handleOpenInLevelEditor}>
                  Open in Level Editor
                </button>
              )}
              <button type="button" onClick={handleRemoveStop} className="danger">
                Remove stop
              </button>
            </div>
          )}
        </div>
      ) : null}
      {pendingBackgroundImageDataUrl && worldMap && (
        <BackgroundImagePlacementModal
          isOpen={true}
          imageDataUrl={pendingBackgroundImageDataUrl}
          levelWidthCells={worldMap.width}
          levelHeightCells={worldMap.height}
          gridSize={1}
          onApprove={(croppedDataUrl) => {
            updateWorldMapBackgroundImage(croppedDataUrl);
            setPendingBackgroundImageDataUrl(null);
            logger.info('Background image placement approved', {
              component: 'WorldMapEditor',
              operation: 'backgroundImagePlacement',
            });
          }}
          onCancel={() => {
            setPendingBackgroundImageDataUrl(null);
            logger.info('Background image placement cancelled', {
              component: 'WorldMapEditor',
              operation: 'backgroundImagePlacement',
            });
          }}
        />
      )}
      <div className="world-map-editor-main">
        <div className="world-map-editor-content">
          <WorldMapCanvas
            layoutKey={`${selectedPathId ?? ''}-${selectedStopId ?? ''}`}
          />
        </div>
        <aside className="world-map-editor-levels-panel" aria-label="Levels">
          <h3 className="world-map-editor-levels-panel-title">Levels</h3>
          <p className="world-map-editor-levels-panel-hint">
            {selectedStop && selectedPathId
              ? 'Click a level to assign it to the selected stop.'
              : 'Select a stop on a path to assign a level.'}
          </p>
          <ul className="world-map-editor-levels-list">
            {levels.length === 0 ? (
              <li className="world-map-editor-levels-empty">No levels in this game.</li>
            ) : (
              levels.map((level) => {
                const isAssignedToSelectedStop =
                  selectedStop?.levelId === level.id;
                const canAssign = Boolean(selectedStop && selectedPathId);
                return (
                  <li key={level.id} className="world-map-editor-level-item">
                    <button
                      type="button"
                      className={`world-map-editor-level-button ${isAssignedToSelectedStop ? 'assigned' : ''} ${canAssign ? 'can-assign' : ''}`}
                      onClick={() => {
                        if (selectedPathId && selectedStopId) {
                          handleStopLevelChange(
                            isAssignedToSelectedStop ? '' : level.id
                          );
                        }
                      }}
                      disabled={!canAssign}
                      title={
                        canAssign
                          ? isAssignedToSelectedStop
                            ? 'Click to unassign from stop'
                            : `Assign "${level.title || level.id}" to selected stop`
                          : 'Select a stop to assign a level'
                      }
                    >
                      <span className="world-map-editor-level-title">
                        {level.title || level.id}
                      </span>
                      {isAssignedToSelectedStop && (
                        <span className="world-map-editor-level-badge">assigned</span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>
      </div>
    </div>
  );
}
