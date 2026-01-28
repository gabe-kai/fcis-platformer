import { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { logger } from '@/utils/logger';
import type { PlatformType } from '@/models/Platform';
import type { CameraMode } from '@/types';
import { getTileDefinition, tileRegistry } from '@/models/Tile';
import type { TileDefinition } from '@/models/Tile';
import { findConnectedTiles } from '@/utils/tileGroupingUtils';
import { getGroupId, getTileAtCell } from '@/utils/tileMapUtils';
import { CollapsibleSection } from './CollapsibleSection';
import { LevelPreview } from './LevelPreview';
import { TileUploadModal } from './TileUploadModal';
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
    updatePlatformProperties,
    deletePlatform,
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
  } = useEditorStore();
  const [showTileUploadModal, setShowTileUploadModal] = useState(false);
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

    updatePlatformProperties(selectedPlatform.id, {
      bounds: {
        x: formData.x,
        y: formData.y,
        width: formData.width,
        height: formData.height,
      },
      type: formData.type,
    });

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
        defaultExpanded={selectedPlatform !== null || selectedTileEntry !== null || (selectedTileGroup !== null && selectedTileGroup.length > 0)}
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
            const isGroup = selectedTileGroup != null && selectedTileGroup.length > 1;

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

                {/* Tile group subsection (only when part of a multi-tile group) */}
                {isGroup && selectedTileGroup && (
                  <div className="details-subsection">
                    <h4 className="details-subsection-title">Tile group</h4>
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
                                  setGroupNameForm(groupDisplayName ?? `Group of ${selectedTileGroup.length} tiles`);
                                  setEditingGroupName(true);
                                }}
                                title="Click to edit"
                              >
                                {groupDisplayName || `${selectedTileGroup.length} connected tiles`}
                              </div>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th scope="row">Cells</th>
                          <td>{selectedTileGroup.length} tiles</td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="properties-table-actions">
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => {
                                for (const t of selectedTileGroup) {
                                  removeTileAtCell(t.cellX, t.cellY);
                                }
                                setSelectedTileEntry(null);
                                setSelectedTileGroup(null);
                                logger.info('Tile group deleted from properties panel', {
                                  component: 'PropertiesPanel',
                                  operation: 'deleteTileGroup',
                                  count: selectedTileGroup.length,
                                });
                              }}
                              title="Remove entire group. Or use Delete tool + Shift+click on canvas."
                            >
                              Delete group ({selectedTileGroup.length} tiles)
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
              </tbody>
            </table>
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

            {/* Dimensions - Always in expanded/editable state */}
            <div className="detail-group">
              <label>Dimensions</label>
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
                  <span>cells</span>
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
                  const gridSize = currentLevel.gridSize || 64;
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
