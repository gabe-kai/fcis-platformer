import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { logger } from '@/utils/logger';
import { type PlatformType, createPlatform } from '@/models/Platform';
import type { CameraMode, TilePattern } from '@/types';
import { getTileDefinition, tileRegistry } from '@/models/Tile';
import { storageService } from '@/services/storageService';
import type { TileDefinition } from '@/models/Tile';
import { getGroupId, getTileAtCell } from '@/utils/tileMapUtils';
import { CollapsibleSection } from './CollapsibleSection';
import { LevelPreview } from './LevelPreview';
import { TileUploadModal } from './TileUploadModal';
import { MovingPlatformPathEditor } from './MovingPlatformPathEditor';
import './PropertiesPanel.css';

/**
 * PropertiesPanel Component
 * 
 * Displays level information and selected platform properties in collapsible sections.
 */
export function PropertiesPanel() {
  const {
    currentLevel,
    selectedPlatform,
    selectedTileEntry,
    selectedTileGroup,
    selectedTileGroups,
    updatePlatformProperties,
    deletePlatform,
    placePlatform,
    setSelectedPlatform,
    updateLevel,
    updateLevelDimensions,
    gridEnabled,
    toggleGrid,
    removeTileAtCell,
    setTileAtCell,
    setTileDisplayName,
    setGroupDisplayName,
    setSelectedTileEntry,
    setSelectedTileGroup,
    zoom,
    setZoom,
    viewportState,
    setPendingBackgroundImageDataUrl,
    levelValidationWarnings,
    cleanupOrphanedPlatforms,
  } = useEditorStore();
  const [showTileUploadModal, setShowTileUploadModal] = useState(false);
  const [showPathEditor, setShowPathEditor] = useState(false);
  const [editingTileName, setEditingTileName] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [tileNameForm, setTileNameForm] = useState('');
  const [groupNameForm, setGroupNameForm] = useState('');
  const [editing, setEditing] = useState(false);
  const previousPlatformId = useRef<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleForm, setTitleForm] = useState('');
  const [dimensionForm, setDimensionForm] = useState({ width: 0, height: 0 }); // In tiles
  
  // Sync tile/group name forms when selection changes (do not overwrite while user is editing)
  useEffect(() => {
    if (!editingTileName && selectedTileEntry && currentLevel) {
      const grid = currentLevel.tileGrid || [];
      const cell = getTileAtCell(grid, selectedTileEntry.cellX, selectedTileEntry.cellY);
      const tileDef = selectedTileEntry.tileId ? getTileDefinition(selectedTileEntry.tileId) : undefined;
      setTileNameForm(cell?.displayName ?? tileDef?.name ?? '');
    }
    if (!editingGroupName && selectedTileGroup && selectedTileGroup.length > 1 && currentLevel) {
      const groupId = getGroupId(selectedTileGroup);
      setGroupNameForm(currentLevel.groupDisplayNames?.[groupId] ?? '');
    }
    if (!selectedTileEntry) {
      setEditingTileName(false);
    }
    if (!selectedTileGroup || selectedTileGroup.length <= 1) {
      setEditingGroupName(false);
    }
  }, [selectedTileEntry, selectedTileGroup, currentLevel, editingTileName, editingGroupName]);
  
  // Initialize form data from selected platform
  const getInitialFormData = () => {
    if (selectedPlatform) {
      return {
        x: selectedPlatform.bounds.x,
        y: selectedPlatform.bounds.y,
        width: selectedPlatform.bounds.width,
        height: selectedPlatform.bounds.height,
        type: selectedPlatform.type,
      };
    }
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      type: 'solid' as PlatformType,
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  // Sync selected platform properties to form data when platform changes
  // Using a ref to track platform ID changes avoids setState in effect
  useEffect(() => {
    if (selectedPlatform && selectedPlatform.id !== previousPlatformId.current) {
      previousPlatformId.current = selectedPlatform.id;
      setFormData({
        x: selectedPlatform.bounds.x,
        y: selectedPlatform.bounds.y,
        width: selectedPlatform.bounds.width,
        height: selectedPlatform.bounds.height,
        type: selectedPlatform.type,
      });
      // Auto-enter edit mode when platform is selected
      setEditing(true);
    } else if (!selectedPlatform) {
      previousPlatformId.current = null;
      setEditing(false);
    }
  }, [selectedPlatform]);

  // Sync level data to forms when level changes
  useEffect(() => {
    if (currentLevel) {
      setTitleForm(currentLevel.title);
      // Width and height are now in cells
      const widthCells = currentLevel.tileGrid?.[0]?.length || currentLevel.width;
      const heightCells = currentLevel.tileGrid?.length || currentLevel.height;
      setDimensionForm({
        width: widthCells,
        height: heightCells,
      });
    }
  }, [currentLevel]);

  const handleSave = () => {
    if (!selectedPlatform) return;

    const updates: Parameters<typeof updatePlatformProperties>[1] = {
      bounds: {
        x: formData.x,
        y: formData.y,
        width: formData.width,
        height: formData.height,
      },
      type: formData.type,
    };

    if (formData.type === 'moving' && (!selectedPlatform.movementPath || selectedPlatform.movementPath.length === 0) && currentLevel) {
      const gridSize = currentLevel.gridSize || 64;
      const cx = formData.x + formData.width / 2;
      const cy = formData.y + formData.height / 2;
      const defaultDistance = 3 * gridSize;
      updates.movementPath = [
        { x: cx, y: cy },
        { x: cx + defaultDistance, y: cy },
      ];
      updates.movementSpeed = 100;
    }

    updatePlatformProperties(selectedPlatform.id, updates);

    logger.info('Platform properties updated', {
      component: 'PropertiesPanel',
      operation: 'updateProperties',
      platformId: selectedPlatform.id,
    });

    setEditing(false);
  };

  const handleCancel = () => {
    if (selectedPlatform) {
      setFormData({
        x: selectedPlatform.bounds.x,
        y: selectedPlatform.bounds.y,
        width: selectedPlatform.bounds.width,
        height: selectedPlatform.bounds.height,
        type: selectedPlatform.type,
      });
    }
    setEditing(false);
  };

  const handleDelete = () => {
    if (!selectedPlatform) return;

    if (confirm('Are you sure you want to delete this platform?')) {
      deletePlatform(selectedPlatform.id);
      logger.info('Platform deleted', {
        component: 'PropertiesPanel',
        operation: 'deletePlatform',
        platformId: selectedPlatform.id,
      });
    }
  };

  const handleTitleSave = () => {
    if (!currentLevel) return;
    const trimmedTitle = titleForm.trim();
    if (trimmedTitle && trimmedTitle !== currentLevel.title) {
      updateLevel({ title: trimmedTitle });
      logger.info('Level title updated', {
        component: 'PropertiesPanel',
        operation: 'updateTitle',
        levelId: currentLevel.id,
        title: trimmedTitle,
      });
    }
    setEditingTitle(false);
  };

  const handleTitleCancel = () => {
    if (currentLevel) {
      setTitleForm(currentLevel.title);
    }
    setEditingTitle(false);
  };

  const handleDimensionsSave = () => {
    if (!currentLevel) return;
    const widthCells = Math.max(1, Math.min(10000, dimensionForm.width));
    const heightCells = Math.max(1, Math.min(10000, dimensionForm.height));
    
    // Width and height are now in cells
    if (
      widthCells !== (currentLevel.tileGrid?.[0]?.length || currentLevel.width) ||
      heightCells !== (currentLevel.tileGrid?.length || currentLevel.height)
    ) {
      updateLevelDimensions(widthCells, heightCells);
      logger.info('Level dimensions updated', {
        component: 'PropertiesPanel',
        operation: 'updateDimensions',
        levelId: currentLevel.id,
        widthCells,
        heightCells,
      });
    }
  };

  const handleDimensionsCancel = () => {
    if (currentLevel) {
      // Width and height are now in cells
      const widthCells = currentLevel.tileGrid?.[0]?.length || currentLevel.width;
      const heightCells = currentLevel.tileGrid?.length || currentLevel.height;
      setDimensionForm({
        width: widthCells,
        height: heightCells,
      });
    }
  };

  const handleCameraModeChange = (mode: CameraMode) => {
    if (!currentLevel) return;
    updateLevel({ cameraMode: mode });
    logger.info('Camera mode updated', {
      component: 'PropertiesPanel',
      operation: 'updateCameraMode',
      levelId: currentLevel.id,
      cameraMode: mode,
    });
  };

  const handleZoomChange = (nextZoom: number) => {
    // Zoom is handled by LevelCanvas component
    // Just update the zoom value in store
    setZoom(nextZoom);
  };

  const cameraModeDescriptions: Record<CameraMode, string> = {
    'free': 'Player can move freely, camera follows player',
    'auto-scroll-horizontal': 'Camera scrolls horizontally automatically, player must keep up',
    'auto-scroll-vertical': 'Camera scrolls vertically automatically, player must keep up',
  };

  return (
    <div className="properties-panel">
      {/* Level Preview Section */}
      <CollapsibleSection title="Level Preview" defaultExpanded={true}>
        {currentLevel ? (
          <LevelPreview
            level={currentLevel}
            zoom={zoom}
            scrollLeft={viewportState.scrollLeft}
            scrollTop={viewportState.scrollTop}
            canvasWidth={viewportState.canvasWidth}
            canvasHeight={viewportState.canvasHeight}
          />
        ) : (
          <div className="properties-empty">
            <p>No level loaded</p>
          </div>
        )}
      </CollapsibleSection>

      {/* Selected Object Details Section - Moved before Level Details */}
      <CollapsibleSection
        title="Selected Object Details"
        defaultExpanded={true}
        autoExpand={selectedPlatform !== null || selectedTileEntry !== null || (selectedTileGroup !== null && selectedTileGroup.length > 0)}
      >
        {selectedTileEntry && currentLevel ? (
          // Show selected tile and optionally tile group
          (() => {
            const grid = currentLevel.tileGrid || [];
            const cell = getTileAtCell(grid, selectedTileEntry.cellX, selectedTileEntry.cellY);
            const tileDef = selectedTileEntry.tileId ? getTileDefinition(selectedTileEntry.tileId) : undefined;
            const gridSize = currentLevel.gridSize || 64;
            const displayName = cell?.displayName ?? tileDef?.name ?? 'Unknown';
            const groupId = selectedTileGroup && selectedTileGroup.length > 0 ? getGroupId(selectedTileGroup) : '';
            const groupDisplayName = groupId && currentLevel.groupDisplayNames?.[groupId];
            const isGroup = (selectedTileGroup != null && selectedTileGroup.length > 1) || selectedTileGroups.length > 1;

            return (
              <div className="selected-tile-details">
                {/* Individual tile subsection */}
                <div className="details-subsection">
                  <h4 className="details-subsection-title">Selected tile</h4>
                  <table className="properties-table">
                    <tbody>
                      <tr>
                        <th scope="row">Name</th>
                        <td>
                          {editingTileName ? (
                            <div className="edit-inline">
                              <input
                                type="text"
                                value={tileNameForm}
                                onChange={(e) => setTileNameForm(e.target.value)}
                                className="editable-input"
                                maxLength={50}
                                autoFocus
                              />
                              <div className="edit-inline-actions">
                                <button
                                  className="save-inline-button"
                                  onClick={() => {
                                    setTileDisplayName(selectedTileEntry.cellX, selectedTileEntry.cellY, tileNameForm.trim() || undefined);
                                    setEditingTileName(false);
                                  }}
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  className="cancel-inline-button"
                                  onClick={() => {
                                    setTileNameForm(displayName);
                                    setEditingTileName(false);
                                  }}
                                  title="Cancel"
                                >
                                  ✗
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="property-value editable-display"
                              onClick={() => {
                                setTileNameForm(displayName);
                                setEditingTileName(true);
                              }}
                              title="Click to edit"
                            >
                              {displayName}
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Cell</th>
                        <td>({selectedTileEntry.cellX}, {selectedTileEntry.cellY})</td>
                      </tr>
                      <tr>
                        <th scope="row">Tile type</th>
                        <td>{tileDef?.type ?? 'unknown'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Passable</th>
                        <td>{selectedTileEntry.passable ? 'Yes' : 'No'}</td>
                      </tr>
                      <tr>
                        <th scope="row">Size</th>
                        <td>{gridSize} × {gridSize}px</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="properties-table-actions">
                          <button
                            type="button"
                            className="upload-texture-button"
                            onClick={() => setShowTileUploadModal(true)}
                            title="Upload a texture; it will be added to the library and assigned to this tile"
                          >
                            Upload texture for this tile
                          </button>
                          {isGroup && (
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => {
                                removeTileAtCell(selectedTileEntry.cellX, selectedTileEntry.cellY);
                                setSelectedTileEntry(null);
                                setSelectedTileGroup(null);
                              }}
                              title="Remove only this tile from the map (Shift+click with Delete tool removes the whole group)"
                              style={{ marginLeft: '0.5rem' }}
                            >
                              Delete tile
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tile group subsection (single tile or multi-tile group - for platform creation) */}
                {((selectedTileGroup && selectedTileGroup.length > 0) || selectedTileGroups.length > 0) && (
                  <div className="details-subsection">
                    <h4 className="details-subsection-title">
                      {isGroup ? `Tile group${selectedTileGroups.length > 1 ? 's' : ''}` : 'Platform from tile'}
                    </h4>
                    <table className="properties-table">
                      <tbody>
                        <tr>
                          <th scope="row">Group name</th>
                          <td>
                            {editingGroupName ? (
                              <div className="edit-inline">
                                <input
                                  type="text"
                                  value={groupNameForm}
                                  onChange={(e) => setGroupNameForm(e.target.value)}
                                  className="editable-input"
                                  maxLength={80}
                                  placeholder="e.g. Platform A"
                                  autoFocus
                                />
                                <div className="edit-inline-actions">
                                  <button
                                    className="save-inline-button"
                                    onClick={() => {
                                      setGroupDisplayName(groupId, groupNameForm.trim() || undefined);
                                      setEditingGroupName(false);
                                    }}
                                    title="Save"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    className="cancel-inline-button"
                                    onClick={() => {
                                      setGroupNameForm(groupDisplayName ?? '');
                                      setEditingGroupName(false);
                                    }}
                                    title="Cancel"
                                  >
                                    ✗
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="property-value editable-display"
                                onClick={() => {
                                  const totalTiles = selectedTileGroups.flatMap((g) => g).length;
                                  setGroupNameForm(groupDisplayName ?? `Group of ${totalTiles} tiles`);
                                  setEditingGroupName(true);
                                }}
                                title="Click to edit"
                              >
                                {groupDisplayName || (selectedTileGroups.length > 1
                                  ? `${selectedTileGroups.length} groups, ${selectedTileGroups.flatMap((g) => g).length} tiles`
                                  : `${selectedTileGroup?.length ?? 0} connected tiles`)}
                              </div>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">Cells</th>
                          <td>{selectedTileGroups.flatMap((g) => g).length} tiles{selectedTileGroups.length > 1 ? ` (${selectedTileGroups.length} groups)` : ''}</td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="properties-table-actions">
                            <button
                              type="button"
                              className="save-pattern-button"
                              onClick={async () => {
                                const allCells = selectedTileGroups.flatMap((g) => g);
                                if (allCells.length === 0 || !currentLevel?.tileGrid) return;
                                const grid = currentLevel.tileGrid;
                                const minX = Math.min(...allCells.map((t) => t.cellX));
                                const minY = Math.min(...allCells.map((t) => t.cellY));
                                const defaultName = `Pattern ${new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`;
                                const name = window.prompt('Name for this pattern', defaultName)?.trim() || defaultName;
                                const cells = allCells.map((t) => {
                                  const cell = grid[t.cellY]?.[t.cellX];
                                  return {
                                    relX: t.cellX - minX,
                                    relY: t.cellY - minY,
                                    tileId: t.tileId,
                                    passable: t.passable,
                                    layer: (cell?.layer ?? 'primary') as 'background' | 'primary' | 'foreground',
                                  };
                                });
                                const pattern: TilePattern = {
                                  id: `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
                                  name,
                                  cells,
                                  createdAt: Date.now(),
                                };
                                await storageService.savePattern(pattern);
                                window.dispatchEvent(new CustomEvent('tilePatternsChanged'));
                                logger.info('Pattern saved to library', {
                                  component: 'PropertiesPanel',
                                  operation: 'savePattern',
                                  patternId: pattern.id,
                                  cellCount: cells.length,
                                });
                              }}
                              title="Save this tile group as a reusable pattern in the Library"
                            >
                              Save to Library
                            </button>
                            {/* Create Moving Platform - for any tile(s), including a single tile */}
                            {(() => {
                              const allCells = selectedTileGroups.flatMap((g) => g);
                              const hasMovingPlatformTiles = allCells.some(
                                (t) => t.tileId === 'platform-moving-horizontal' || t.tileId === 'platform-moving-vertical'
                              );
                              const movementType = allCells.some(t => t.tileId === 'platform-moving-horizontal')
                                ? 'horizontal'
                                : allCells.some(t => t.tileId === 'platform-moving-vertical')
                                ? 'vertical'
                                : 'horizontal';
                              
                              return (
                                <button
                                  type="button"
                                  className="create-moving-platform-button"
                                  onClick={() => {
                                    if (allCells.length === 0 || !currentLevel) return;
                                    const gridSize = currentLevel.gridSize || 64;
                                    const minCellX = Math.min(...allCells.map((t) => t.cellX));
                                    const maxCellX = Math.max(...allCells.map((t) => t.cellX));
                                    const minCellY = Math.min(...allCells.map((t) => t.cellY));
                                    const maxCellY = Math.max(...allCells.map((t) => t.cellY));
                                    
                                    const platform = createPlatform({
                                      levelId: currentLevel.id,
                                      type: 'moving',
                                      bounds: {
                                        x: minCellX * gridSize,
                                        y: minCellY * gridSize,
                                        width: (maxCellX - minCellX + 1) * gridSize,
                                        height: (maxCellY - minCellY + 1) * gridSize,
                                      },
                                    });
                                    
                                    const centerX = platform.bounds.x + platform.bounds.width / 2;
                                    const centerY = platform.bounds.y + platform.bounds.height / 2;
                                    const defaultDistance = 3 * gridSize;
                                    
                                    if (movementType === 'horizontal') {
                                      platform.movementPath = [
                                        { x: centerX, y: centerY },
                                        { x: centerX + defaultDistance, y: centerY },
                                      ];
                                    } else {
                                      platform.movementPath = [
                                        { x: centerX, y: centerY },
                                        { x: centerX, y: centerY + defaultDistance },
                                      ];
                                    }
                                    platform.movementSpeed = 100;
                                    
                                    placePlatform(platform);
                                    setSelectedPlatform(platform);
                                    setSelectedTileEntry(null);
                                    setSelectedTileGroup(null);
                                    setShowPathEditor(true);
                                    
                                    logger.info('Moving platform created from tile selection', {
                                      component: 'PropertiesPanel',
                                      operation: 'createMovingPlatformFromGroup',
                                      platformId: platform.id,
                                      tileCount: allCells.length,
                                      movementType,
                                    });
                                  }}
                                  title={hasMovingPlatformTiles
                                    ? "Create a moving platform with path editor - the tiles indicate this should move!"
                                    : "Create a moving platform from this tile (opens path editor)"}
                                >
                                  Create Moving Platform
                                </button>
                              );
                            })()}
                            <button
                              type="button"
                              className="create-platform-button"
                              onClick={() => {
                                const allCells = selectedTileGroups.flatMap((g) => g);
                                if (allCells.length === 0 || !currentLevel) return;
                                const gridSize = currentLevel.gridSize || 64;
                                // Calculate bounding box in world coordinates
                                const minCellX = Math.min(...allCells.map((t) => t.cellX));
                                const maxCellX = Math.max(...allCells.map((t) => t.cellX));
                                const minCellY = Math.min(...allCells.map((t) => t.cellY));
                                const maxCellY = Math.max(...allCells.map((t) => t.cellY));
                                // Convert to world coordinates (bottom-left origin)
                                const platform = createPlatform({
                                  levelId: currentLevel.id,
                                  type: 'solid',
                                  bounds: {
                                    x: minCellX * gridSize,
                                    y: minCellY * gridSize,
                                    width: (maxCellX - minCellX + 1) * gridSize,
                                    height: (maxCellY - minCellY + 1) * gridSize,
                                  },
                                });
                                placePlatform(platform);
                                setSelectedPlatform(platform);
                                setSelectedTileEntry(null);
                                setSelectedTileGroup(null);
                                logger.info('Platform created from tile group', {
                                  component: 'PropertiesPanel',
                                  operation: 'createPlatformFromGroup',
                                  platformId: platform.id,
                                  tileCount: allCells.length,
                                });
                              }}
                              title="Create a Platform entity from this tile group (allows setting type, movement path, etc.)"
                            >
                              Create Platform
                            </button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => {
                                const allCells = selectedTileGroups.flatMap((g) => g);
                                for (const t of allCells) {
                                  removeTileAtCell(t.cellX, t.cellY);
                                }
                                setSelectedTileEntry(null);
                                setSelectedTileGroup(null);
                                logger.info('Tile group deleted from properties panel', {
                                  component: 'PropertiesPanel',
                                  operation: 'deleteTileGroup',
                                  count: allCells.length,
                                });
                              }}
                              title="Remove all selected groups. Or use Delete tool + Shift+click on canvas."
                            >
                              Delete {selectedTileGroups.length > 1 ? `${selectedTileGroups.length} groups` : 'group'} ({selectedTileGroups.flatMap((g) => g).length} tiles)
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Single delete when not showing group subsection */}
                {!isGroup && (
                  <div className="form-actions" style={{ marginTop: '0.75rem' }}>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => {
                        if (selectedTileEntry.tileId && currentLevel) {
                          removeTileAtCell(selectedTileEntry.cellX, selectedTileEntry.cellY);
                          setSelectedTileEntry(null);
                          setSelectedTileGroup(null);
                        }
                      }}
                      title="Remove this tile. When part of a group, use this to remove only this cell; use Delete group to remove all."
                    >
                      Delete tile
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        ) : selectedPlatform ? (
          editing ? (
            <div className="properties-form">
              <div className="form-group">
                <label htmlFor="platform-x">X Position</label>
                <input
                  id="platform-x"
                  type="number"
                  value={formData.x}
                  onChange={(e) => setFormData({ ...formData, x: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="platform-y">Y Position</label>
                <input
                  id="platform-y"
                  type="number"
                  value={formData.y}
                  onChange={(e) => setFormData({ ...formData, y: Number(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="platform-width">Width</label>
                <input
                  id="platform-width"
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: Number(e.target.value) })}
                  min={1}
                />
              </div>

              <div className="form-group">
                <label htmlFor="platform-height">Height</label>
                <input
                  id="platform-height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                  min={1}
                />
              </div>

              <div className="form-group">
                <label htmlFor="platform-type">Type</label>
                <select
                  id="platform-type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PlatformType })}
                >
                  <option value="solid">Solid</option>
                  <option value="moving">Moving</option>
                  <option value="destructible">Destructible</option>
                  <option value="one-way">One-Way</option>
                </select>
              </div>

              {formData.type === 'moving' && (
                <div className="moving-platform-properties">
                  <h4 className="moving-platform-header">Movement Properties</h4>
                  
                  <div className="form-group">
                    <label htmlFor="movement-speed">Speed (px/sec)</label>
                    <input
                      id="movement-speed"
                      type="number"
                      value={selectedPlatform.movementSpeed || 100}
                      onChange={(e) => {
                        updatePlatformProperties(selectedPlatform.id, {
                          movementSpeed: Math.max(10, Number(e.target.value)),
                        });
                      }}
                      min={10}
                      max={1000}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Path Points</label>
                    <div className="path-points-editor">
                      {selectedPlatform.movementPath && selectedPlatform.movementPath.length > 0 ? (
                        <>
                          {selectedPlatform.movementPath.map((point, idx) => (
                            <div key={idx} className="path-point-row">
                              <span className="path-point-label">Point {idx + 1}:</span>
                              <input
                                type="number"
                                value={Math.round(point.x)}
                                onChange={(e) => {
                                  const newPath = [...selectedPlatform.movementPath!];
                                  newPath[idx] = { ...newPath[idx], x: Number(e.target.value) };
                                  updatePlatformProperties(selectedPlatform.id, { movementPath: newPath });
                                }}
                                className="path-point-input"
                                title="X position"
                              />
                              <span className="path-point-separator">,</span>
                              <input
                                type="number"
                                value={Math.round(point.y)}
                                onChange={(e) => {
                                  const newPath = [...selectedPlatform.movementPath!];
                                  newPath[idx] = { ...newPath[idx], y: Number(e.target.value) };
                                  updatePlatformProperties(selectedPlatform.id, { movementPath: newPath });
                                }}
                                className="path-point-input"
                                title="Y position"
                              />
                              {selectedPlatform.movementPath!.length > 2 && (
                                <button
                                  type="button"
                                  className="path-point-delete"
                                  onClick={() => {
                                    const newPath = selectedPlatform.movementPath!.filter((_, i) => i !== idx);
                                    updatePlatformProperties(selectedPlatform.id, { movementPath: newPath });
                                  }}
                                  title="Remove this point"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            className="add-path-point-button"
                            onClick={() => {
                              const path = selectedPlatform.movementPath!;
                              const lastPoint = path[path.length - 1];
                              const secondLastPoint = path.length > 1 ? path[path.length - 2] : lastPoint;
                              // Extrapolate new point from last two points
                              const dx = lastPoint.x - secondLastPoint.x;
                              const dy = lastPoint.y - secondLastPoint.y;
                              const newPoint = {
                                x: lastPoint.x + (dx || 64),
                                y: lastPoint.y + (dy || 0),
                              };
                              updatePlatformProperties(selectedPlatform.id, {
                                movementPath: [...path, newPoint],
                              });
                            }}
                          >
                            + Add Point
                          </button>
                        </>
                      ) : (
                        <div className="path-points-empty">
                          No path defined. Click "Create Path" to add waypoints.
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="path-actions">
                    <button
                      type="button"
                      className="edit-path-button"
                      onClick={() => setShowPathEditor(true)}
                    >
                      {selectedPlatform.movementPath?.length ? 'Edit Path Visually' : 'Create Path'}
                    </button>
                  </div>
                  
                  <p className="moving-platform-hint">
                    Tip: Drag path points directly on the canvas to adjust positions visually.
                  </p>
                </div>
              )}

              <div className="form-actions">
                <button className="save-button" onClick={handleSave}>
                  Save
                </button>
                <button className="cancel-button" onClick={handleCancel}>
                  Cancel
                </button>
                <button className="delete-button" onClick={handleDelete}>
                  Delete Platform
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="details-subsection">
                <h4 className="details-subsection-title">Platform</h4>
              </div>
              <table className="properties-table">
                <tbody>
                  <tr>
                    <th scope="row">Position</th>
                    <td>({formData.x}, {formData.y})</td>
                  </tr>
                  <tr>
                    <th scope="row">Size</th>
                    <td>{formData.width} × {formData.height}</td>
                  </tr>
                  <tr>
                    <th scope="row">Type</th>
                    <td>{formData.type}</td>
                  </tr>
                  <tr>
                    <th scope="row">Platform ID</th>
                    <td className="property-id">{selectedPlatform.id}</td>
                  </tr>
                  {selectedPlatform.type === 'moving' && (
                    <>
                      <tr>
                        <th scope="row">Speed</th>
                        <td>
                          <input
                            type="number"
                            value={selectedPlatform.movementSpeed || 100}
                            onChange={(e) => {
                              updatePlatformProperties(selectedPlatform.id, {
                                movementSpeed: Math.max(10, Number(e.target.value)),
                              });
                            }}
                            min={10}
                            max={1000}
                            style={{ width: '80px', marginRight: '4px' }}
                            className="editable-input"
                          />
                          px/s
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Path</th>
                        <td>
                          {selectedPlatform.movementPath && selectedPlatform.movementPath.length > 0 ? (
                            <div className="compact-path-info">
                              <div className="path-point-summary">
                                {selectedPlatform.movementPath.map((p, i) => (
                                  <span key={i} className="path-point-badge">
                                    {i + 1}: ({Math.round(p.x)}, {Math.round(p.y)})
                                  </span>
                                ))}
                              </div>
                              <button
                                className="edit-path-button compact"
                                onClick={() => setShowPathEditor(true)}
                              >
                                Edit Path
                              </button>
                            </div>
                          ) : (
                            <button
                              className="edit-path-button"
                              onClick={() => setShowPathEditor(true)}
                            >
                              Create Path
                            </button>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="moving-platform-tip">
                          <em>Drag path points on canvas to move them</em>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
              <div className="platform-actions-readonly">
                {selectedPlatform.type !== 'moving' && currentLevel && (
                  <button
                    className="make-moving-platform-button"
                    onClick={() => {
                      const gridSize = currentLevel.gridSize || 64;
                      const cx = selectedPlatform.bounds.x + selectedPlatform.bounds.width / 2;
                      const cy = selectedPlatform.bounds.y + selectedPlatform.bounds.height / 2;
                      const defaultDistance = 3 * gridSize;
                      updatePlatformProperties(selectedPlatform.id, {
                        type: 'moving',
                        movementPath: [
                          { x: cx, y: cy },
                          { x: cx + defaultDistance, y: cy },
                        ],
                        movementSpeed: 100,
                      });
                      setShowPathEditor(true);
                    }}
                    title="Convert this platform to a moving platform and open the path editor"
                  >
                    Make Moving Platform
                  </button>
                )}
                <button
                  className="delete-platform-button"
                  onClick={handleDelete}
                  title="Delete this platform (removes the movement path and entity)"
                >
                  Delete Platform
                </button>
              </div>
            </>
          )
        ) : (
          <div className="properties-empty">
            <p>No object selected</p>
            <p className="properties-hint">Select a tile or platform to view its properties</p>
          </div>
        )}
      </CollapsibleSection>

      {showTileUploadModal && selectedTileEntry && (
        <TileUploadModal
          isOpen={showTileUploadModal}
          onClose={() => setShowTileUploadModal(false)}
          onTileCreated={(tile: TileDefinition) => {
            tileRegistry.register(tile);
            setTileAtCell(tile.id, selectedTileEntry.cellX, selectedTileEntry.cellY);
            setShowTileUploadModal(false);
            window.dispatchEvent(new CustomEvent('userTilesChanged'));
          }}
        />
      )}

      {showPathEditor && selectedPlatform && currentLevel && (
        <MovingPlatformPathEditor
          isOpen={showPathEditor}
          platform={selectedPlatform}
          onClose={() => setShowPathEditor(false)}
          onSave={(path, speed, pathType) => {
            updatePlatformProperties(selectedPlatform.id, {
              movementPath: path,
              movementSpeed: speed,
            });
            setShowPathEditor(false);
            logger.info('Moving platform path updated', {
              component: 'PropertiesPanel',
              operation: 'updatePath',
              platformId: selectedPlatform.id,
              pathType,
              pointCount: path.length,
              speed,
            });
          }}
          gridSize={currentLevel.gridSize || 64}
        />
      )}

      {/* Level Details Section */}
      <CollapsibleSection title="Level Details" defaultExpanded={true}>
        {currentLevel ? (
          <div className="level-details">
            {/* Title - Editable, no label */}
            <div className="detail-group">
              {editingTitle ? (
                <div className="edit-inline">
                  <input
                    id="level-title"
                    type="text"
                    value={titleForm}
                    onChange={(e) => setTitleForm(e.target.value)}
                    className="editable-input"
                    maxLength={100}
                    autoFocus
                  />
                  <div className="edit-inline-actions">
                    <button className="save-inline-button" onClick={handleTitleSave} title="Save">
                      ✓
                    </button>
                    <button className="cancel-inline-button" onClick={handleTitleCancel} title="Cancel">
                      ✗
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="editable-display"
                  onClick={() => setEditingTitle(true)}
                  title="Click to edit"
                >
                  {currentLevel.title}
                </div>
              )}
            </div>

            {/* Level Validation Warnings */}
            {(levelValidationWarnings.missingSpawn || levelValidationWarnings.missingWin) && (
              <div className="detail-group validation-warnings">
                <label>Validation</label>
                <div className="validation-warnings-list">
                  {levelValidationWarnings.missingSpawn && (
                    <div className="validation-warning">
                      <span className="validation-warning-icon">⚠</span>
                      <span className="validation-warning-text">Missing spawn point</span>
                    </div>
                  )}
                  {levelValidationWarnings.missingWin && (
                    <div className="validation-warning">
                      <span className="validation-warning-icon">⚠</span>
                      <span className="validation-warning-text">Missing win condition</span>
                    </div>
                  )}
                </div>
                <p className="validation-warning-note">
                  You can still save the level, but it may not be playable without these elements.
                </p>
              </div>
            )}

            {/* Dimensions - Always in expanded/editable state */}
            <div className="detail-group">
              <label>Dimensions (cells)</label>
              <div className="edit-inline">
                <div className="dimension-inputs">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={dimensionForm.width}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, width: Number(e.target.value) })}
                    className="editable-input dimension-input"
                    placeholder="Width"
                  />
                  <span>×</span>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={dimensionForm.height}
                    onChange={(e) => setDimensionForm({ ...dimensionForm, height: Number(e.target.value) })}
                    className="editable-input dimension-input"
                    placeholder="Height"
                  />
                </div>
                <div className="edit-inline-actions">
                  <button className="save-inline-button" onClick={handleDimensionsSave} title="Save">
                    ✓
                  </button>
                  <button className="cancel-inline-button" onClick={handleDimensionsCancel} title="Cancel">
                    ✗
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Settings - Toggle only */}
            <div className="detail-group">
              <label>Grid</label>
              <div className="grid-buttons-horizontal">
                <button
                  className={`grid-toggle-compact ${gridEnabled ? 'active' : ''}`}
                  onClick={() => {
                    toggleGrid();
                    logger.info('Grid toggled', {
                      component: 'PropertiesPanel',
                      operation: 'toggleGrid',
                      enabled: !gridEnabled,
                    });
                  }}
                  title={gridEnabled ? 'Hide Grid' : 'Show Grid'}
                >
                  {gridEnabled ? '☑' : '☐'} Show Grid
                </button>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="detail-group">
              <label>Zoom</label>
              <div className="zoom-control">
                {(() => {
                  // Zoom limits for slider display
                  // Use reasonable defaults for the slider range
                  const minZoom = 0.1;
                  const maxZoom = 5.0; // Reasonable max for slider
                  const clampedZoom = Math.max(minZoom, Math.min(maxZoom, zoom));

                  return (
                    <>
                      <input
                        type="range"
                        min={minZoom}
                        max={maxZoom}
                        step="0.05"
                        value={clampedZoom}
                        onChange={(e) => handleZoomChange(Number(e.target.value))}
                        className="zoom-slider"
                      />
                      <div className="zoom-value">{Math.round(clampedZoom * 100)}%</div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Camera Mode - Dropdown */}
            <div className="detail-group">
              <label htmlFor="camera-mode">Camera Mode</label>
              <select
                id="camera-mode"
                value={currentLevel.cameraMode}
                onChange={(e) => handleCameraModeChange(e.target.value as CameraMode)}
                className="editable-select"
              >
                <option value="free">Free</option>
                <option value="auto-scroll-horizontal">Auto-Scroll Horizontal</option>
                <option value="auto-scroll-vertical">Auto-Scroll Vertical</option>
              </select>
              <div className="camera-mode-description">
                {cameraModeDescriptions[currentLevel.cameraMode]}
              </div>
            </div>

            {/* Background Image */}
            <div className="detail-group">
              <label>Background Image</label>
              <div className="background-image-control">
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
                          component: 'PropertiesPanel',
                          operation: 'uploadBackgroundImage',
                          fileSize: file.size,
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                  }}
                  style={{ fontSize: '0.85rem' }}
                />
                {currentLevel.backgroundImage && (
                  <button
                    className="remove-background-button"
                    onClick={() => {
                      updateLevel({ backgroundImage: undefined });
                      logger.info('Background image removed', {
                        component: 'PropertiesPanel',
                        operation: 'removeBackgroundImage',
                      });
                    }}
                    title="Remove background image"
                  >
                    Remove
                  </button>
                )}
              </div>
              {currentLevel.backgroundImage && (
                <div className="background-preview">
                  <img 
                    src={currentLevel.backgroundImage} 
                    alt="Background preview" 
                    style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain' }}
                  />
                </div>
              )}
            </div>


            {currentLevel.playerSpawn && (
              <div className="detail-group">
                <label>Player Spawn</label>
                <div className="detail-value">
                  ({currentLevel.playerSpawn.x}, {currentLevel.playerSpawn.y})
                </div>
              </div>
            )}

            {/* Metadata Sub-section */}
            <CollapsibleSection title="Metadata" defaultExpanded={false} className="metadata-subsection">
              <div className="metadata-content">
                <table className="properties-table">
                  <tbody>
                    <tr>
                      <th scope="row">Created</th>
                      <td>{new Date(currentLevel.createdAt).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                      <th scope="row">Last Updated</th>
                      <td>{new Date(currentLevel.updatedAt).toLocaleDateString()}</td>
                    </tr>
                    <tr>
                      <th scope="row">Sharing Status</th>
                      <td>{currentLevel.isShared ? 'Shared' : 'Private'}</td>
                    </tr>
                    <tr>
                      <th scope="row">Sharing Scope</th>
                      <td>{currentLevel.sharingScope}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>

            {/* Level Utilities Sub-section */}
            <CollapsibleSection title="Utilities" defaultExpanded={false} className="utilities-subsection">
              <div className="utilities-content">
                <div className="utility-item">
                  <button
                    className="cleanup-button"
                    onClick={() => {
                      const count = cleanupOrphanedPlatforms();
                      if (count > 0) {
                        alert(`Removed ${count} orphaned platform${count > 1 ? 's' : ''} (platforms without tiles).`);
                      } else {
                        alert('No orphaned platforms found. All platforms have associated tiles.');
                      }
                    }}
                    title="Remove platform entities that don't have any tiles at their location"
                  >
                    Clean Up Orphaned Platforms
                  </button>
                  <p className="utility-description">
                    Removes moving platform paths and other platform entities that no longer have tiles at their location.
                  </p>
                </div>
                {currentLevel.platforms.length > 0 && (
                  <div className="utility-info">
                    <span className="platform-count">{currentLevel.platforms.length} platform{currentLevel.platforms.length !== 1 ? 's' : ''}</span>
                    <span className="moving-count">
                      ({currentLevel.platforms.filter(p => p.type === 'moving').length} moving)
                    </span>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        ) : (
          <div className="properties-empty">
            <p>No level loaded</p>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
