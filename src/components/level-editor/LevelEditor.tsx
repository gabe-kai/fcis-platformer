import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/stores/editorStore';
import { storageService } from '@/services/storageService';
import { logger } from '@/utils/logger';
import { LevelCanvas } from './LevelCanvas';
import { ToolPalette } from './ToolPalette';
import { TileLibrary } from './TileLibrary';
import { PropertiesPanel } from './PropertiesPanel';
import { BackgroundImagePlacementModal } from './BackgroundImagePlacementModal';
import './LevelEditor.css';

/**
 * Level Editor Component
 * 
 * Full-featured level editor with canvas, tools, and properties panel.
 * Supports platform placement, selection, editing, and save/load.
 */
export function LevelEditor() {
  const { levelId } = useParams<{ levelId?: string }>();
  const navigate = useNavigate();
  const {
    currentLevel,
    setCurrentLevel,
    updateLevelDimensions,
    updateLevel,
    viewMode,
    setViewMode,
    pendingBackgroundImageDataUrl,
    setPendingBackgroundImageDataUrl,
  } = useEditorStore();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [editingDimensions, setEditingDimensions] = useState(false);
  const [dimensionForm, setDimensionForm] = useState({ width: 0, height: 0 });
  const skipFirstAutosave = useRef(true);

  useEffect(() => {
    const loadLevel = async () => {
      if (!levelId) {
        logger.warn('No level ID provided', {
          component: 'LevelEditor',
          operation: 'load',
        });
        // TODO: In future, allow creating new levels
        navigate('/', { replace: true });
        return;
      }

      try {
        logger.info('Loading level for editor', {
          component: 'LevelEditor',
          operation: 'load',
          levelId,
        });

        const level = await storageService.loadLevel(levelId);
        if (!level) {
          logger.warn('Level not found', {
            component: 'LevelEditor',
            operation: 'load',
            levelId,
          });
          navigate('/', { replace: true });
          return;
        }

        setCurrentLevel(level);
        // Width and height are now in cells
        const widthCells = level.tileGrid?.[0]?.length || level.width;
        const heightCells = level.tileGrid?.length || level.height;
        setDimensionForm({ width: widthCells, height: heightCells });
        logger.info('Level loaded successfully', {
          component: 'LevelEditor',
          operation: 'load',
          levelId,
        });
      } catch (error) {
        logger.error('Failed to load level', {
          component: 'LevelEditor',
          operation: 'load',
          levelId,
        }, { error: error instanceof Error ? error.message : String(error) });
        navigate('/', { replace: true });
      }
    };

    loadLevel();
  }, [levelId, setCurrentLevel, navigate]);

  // Sync dimension form when level changes
  useEffect(() => {
    if (currentLevel) {
      // Width and height are already in cells
      const widthCells = currentLevel.tileGrid?.[0]?.length || currentLevel.width;
      const heightCells = currentLevel.tileGrid?.length || currentLevel.height;
      setDimensionForm({ width: widthCells, height: heightCells });
    }
  }, [currentLevel]);

  // Debounced autosave when level changes (skip first run after load)
  useEffect(() => {
    if (!currentLevel) return;
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false;
      return;
    }
    const id = setTimeout(async () => {
      try {
        await storageService.saveLevel(currentLevel);
        setLastSavedAt(Date.now());
        logger.info('Level autosaved', {
          component: 'LevelEditor',
          operation: 'autosave',
          levelId: currentLevel.id,
        });
      } catch (error) {
        logger.error('Failed to autosave level', {
          component: 'LevelEditor',
          operation: 'autosave',
          levelId: currentLevel.id,
        }, { error: error instanceof Error ? error.message : String(error) });
      }
    }, 2000);
    return () => clearTimeout(id);
  }, [currentLevel]);

  const handleSave = async () => {
    if (!currentLevel || isSaving) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      await storageService.saveLevel(currentLevel);
      setSaveStatus('saved');
      setLastSavedAt(Date.now());
      logger.info('Level saved', {
        component: 'LevelEditor',
        operation: 'save',
        levelId: currentLevel.id,
      });

      // Reset save status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      setSaveStatus('error');
      logger.error('Failed to save level', {
        component: 'LevelEditor',
        operation: 'save',
        levelId: currentLevel.id,
      }, { error: error instanceof Error ? error.message : String(error) });

      // Reset error status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDimensionSave = () => {
    if (!currentLevel) return;
    
    const width = Math.max(1, Math.min(10000, dimensionForm.width));
    const height = Math.max(1, Math.min(10000, dimensionForm.height));
    
    updateLevelDimensions(width, height);
    setEditingDimensions(false);
    logger.info('Level dimensions updated', {
      component: 'LevelEditor',
      operation: 'updateDimensions',
      levelId: currentLevel.id,
      width,
      height,
    });
  };

  const handleDimensionCancel = () => {
    if (currentLevel) {
      // Width and height are now in cells
      const widthCells = currentLevel.tileGrid?.[0]?.length || currentLevel.width;
      const heightCells = currentLevel.tileGrid?.length || currentLevel.height;
      setDimensionForm({ width: widthCells, height: heightCells });
    }
    setEditingDimensions(false);
  };

  if (!currentLevel) {
    return (
      <div className="level-editor">
        <div className="level-editor-loading">Loading level...</div>
      </div>
    );
  }

  return (
    <div className="level-editor">
      <header className="level-editor-header">
        <div className="header-left">
          <h1>Level Editor: {currentLevel.title}</h1>
          <div className="level-info">
            {editingDimensions ? (
              <div className="dimension-editor">
                <label>
                  Width:
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={dimensionForm.width}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, width: Number(e.target.value) })}
                    style={{ width: '80px', marginLeft: '4px', marginRight: '12px' }}
                  />
                </label>
                <label>
                  Height:
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={dimensionForm.height}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, height: Number(e.target.value) })}
                    style={{ width: '80px', marginLeft: '4px', marginRight: '8px' }}
                  />
                </label>
                <button
                  className="dimension-save-button"
                  onClick={handleDimensionSave}
                  title="Save dimensions"
                >
                  ✓
                </button>
                <button
                  className="dimension-cancel-button"
                  onClick={handleDimensionCancel}
                  title="Cancel"
                >
                  ✗
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="header-right">
          <div className="view-mode-toggle" role="group" aria-label="View mode">
            <button
              type="button"
              className={`view-mode-option ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Solid-color blocks for printing, coloring, and re-upload"
            >
              Grid
            </button>
            <button
              type="button"
              className={`view-mode-option ${viewMode === 'texture' ? 'active' : ''}`}
              onClick={() => setViewMode('texture')}
              title="Fully rendered tiles as in game"
            >
              Texture
            </button>
          </div>
          <span className="last-saved-text" title={lastSavedAt ? new Date(lastSavedAt).toLocaleString() : undefined}>
            {lastSavedAt
              ? `Last saved: ${new Date(lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
              : 'Last saved: —'}
          </span>
          <button
            className={`save-button ${saveStatus === 'saved' ? 'saved' : ''} ${saveStatus === 'error' ? 'error' : ''}`}
            onClick={handleSave}
            disabled={isSaving}
            title="Save Level (Ctrl+S)"
          >
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'error' && '✗ Error'}
            {saveStatus === 'idle' && 'Save Level'}
          </button>
          <button className="back-button" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </div>
      </header>
      <main className="level-editor-content">
        <aside className="editor-sidebar editor-sidebar-left">
          <ToolPalette />
          <TileLibrary />
        </aside>
        <div className="editor-canvas-container">
          <LevelCanvas />
        </div>
        <aside className="editor-sidebar editor-sidebar-right">
          <PropertiesPanel />
        </aside>
      </main>
      {pendingBackgroundImageDataUrl && currentLevel && (
        <BackgroundImagePlacementModal
          isOpen={true}
          imageDataUrl={pendingBackgroundImageDataUrl}
          levelWidthCells={currentLevel.tileGrid?.[0]?.length ?? currentLevel.width}
          levelHeightCells={currentLevel.tileGrid?.length ?? currentLevel.height}
          gridSize={currentLevel.gridSize ?? 64}
          onApprove={async (croppedDataUrl) => {
            updateLevel({ backgroundImage: croppedDataUrl });
            const originalUrl = pendingBackgroundImageDataUrl;
            setPendingBackgroundImageDataUrl(null);
            try {
              const timestamp = new Date().toLocaleString();
              await storageService.saveBackgroundImage({
                id: `bg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                name: `Background ${timestamp}`,
                dataUrl: originalUrl,
                createdAt: Date.now(),
              });
              window.dispatchEvent(new CustomEvent('backgroundImagesChanged'));
              logger.info('Background image placement approved and original saved to Library', {
                component: 'LevelEditor',
                operation: 'backgroundImagePlacement',
              });
            } catch (err) {
              logger.error('Failed to save original to Library', {
                component: 'LevelEditor',
                operation: 'saveBackgroundImage',
              }, { error: err instanceof Error ? err.message : String(err) });
            }
          }}
          onCancel={() => {
            setPendingBackgroundImageDataUrl(null);
            logger.info('Background image placement cancelled', {
              component: 'LevelEditor',
              operation: 'backgroundImagePlacement',
            });
          }}
        />
      )}
    </div>
  );
}
