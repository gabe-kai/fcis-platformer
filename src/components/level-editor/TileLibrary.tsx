import { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { type TileDefinition, TILE_TYPE_COLORS, tileRegistry } from '@/models/Tile';
import { storageService, type BackgroundImageEntry } from '@/services/storageService';
import { logger } from '@/utils/logger';
import type { TilePattern } from '@/types';
import { initializeSystemPatterns } from '@/utils/patternInitializer';
import { getCategoryOrder, getCategoryDisplayName } from '@/utils/systemPatterns';
import {
  SYSTEM_FILL_PATTERNS,
  generateFillPattern,
  getFillCategoryDisplayName,
  type FillPattern,
} from '@/utils/fillPatternGenerator';
import { generatePatternPreview } from '@/utils/patternPreviewGenerator';
import { TileUploadModal } from './TileUploadModal';
import { CollapsibleSection } from './CollapsibleSection';
import './TileLibrary.css';

/**
 * Library Component (formerly TileLibrary)
 * 
 * Displays available tiles, tile group textures, and background images.
 * Located below the ToolPalette in the left sidebar.
 */
export function TileLibrary() {
  const { selectedTile, setSelectedTile, setSelectedTool, setPendingBackgroundImageDataUrl, setSelectedPattern, selectedPattern, setSelectedFillPattern, selectedFillPattern } = useEditorStore();
  const [userTiles, setUserTiles] = useState<TileDefinition[]>([]);
  const [backgroundImages, setBackgroundImages] = useState<BackgroundImageEntry[]>([]);
  const [patterns, setPatterns] = useState<TilePattern[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Load user tiles on mount and when notified (e.g. upload from Selected Object panel)
  useEffect(() => {
    loadUserTiles();
  }, []);

  useEffect(() => {
    const handler = () => loadUserTiles();
    window.addEventListener('userTilesChanged', handler);
    return () => window.removeEventListener('userTilesChanged', handler);
  }, []);

  // Load background images on mount and when notified
  useEffect(() => {
    loadBackgroundImages();
  }, []);

  useEffect(() => {
    const handler = () => loadBackgroundImages();
    window.addEventListener('backgroundImagesChanged', handler);
    return () => window.removeEventListener('backgroundImagesChanged', handler);
  }, []);

  const loadPatterns = async () => {
    try {
      const list = await storageService.listPatterns();
      setPatterns(list);
    } catch (err) {
      logger.error('Failed to load patterns', {
        component: 'TileLibrary',
        operation: 'loadPatterns',
      }, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  useEffect(() => {
    // Initialize system patterns on mount
    initializeSystemPatterns().then(() => {
      loadPatterns();
    });
  }, []);

  useEffect(() => {
    const handler = () => loadPatterns();
    window.addEventListener('tilePatternsChanged', handler);
    return () => window.removeEventListener('tilePatternsChanged', handler);
  }, []);

  const loadUserTiles = async () => {
    try {
      const tiles = await storageService.listUserTiles();
      setUserTiles(tiles);
      // Register all user tiles in the registry for lookup
      tileRegistry.loadUserTiles(tiles);
    } catch (err) {
      logger.error('Failed to load user tiles', {
        component: 'TileLibrary',
        operation: 'loadUserTiles',
      }, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const loadBackgroundImages = async () => {
    try {
      const images = await storageService.listBackgroundImages();
      setBackgroundImages(images);
    } catch (err) {
      logger.error('Failed to load background images', {
        component: 'TileLibrary',
        operation: 'loadBackgroundImages',
      }, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleEditUserTile = async (tile: TileDefinition, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentName = tile.name;
    const currentDesc = tile.description ?? '';
    const name = window.prompt('Tile name', currentName)?.trim();
    if (!name) {
      return;
    }
    const description = window.prompt('Description (optional)', currentDesc)?.trim() || tile.description;

    const updated: TileDefinition = {
      ...tile,
      name,
      description,
    };

    try {
      await storageService.saveUserTile(updated);
      setUserTiles((prev) => prev.map((t) => (t.id === tile.id ? updated : t)));
      // Keep selection in sync if this tile is currently selected
      if (selectedTile?.id === tile.id) {
        setSelectedTile(updated);
      }
      logger.info('User tile updated', {
        component: 'TileLibrary',
        operation: 'editUserTile',
        tileId: tile.id,
      });
    } catch (err) {
      logger.error('Failed to update user tile', {
        component: 'TileLibrary',
        operation: 'editUserTile',
        tileId: tile.id,
      }, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleEditPattern = async (pattern: TilePattern, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (pattern.source === 'system') {
      return; // System patterns are read-only
    }

    const currentName = pattern.name;
    const currentDesc = pattern.description ?? '';
    const name = window.prompt('Pattern name', currentName)?.trim();
    if (!name) {
      return;
    }
    const description = window.prompt('Description (optional)', currentDesc)?.trim() || undefined;

    const updated: TilePattern = {
      ...pattern,
      name,
      description,
    };

    try {
      await storageService.savePattern(updated);
      setPatterns((prev) => prev.map((p) => (p.id === pattern.id ? updated : p)));
      if (selectedPattern?.id === pattern.id) {
        setSelectedPattern(updated);
      }
      logger.info('Pattern updated', {
        component: 'TileLibrary',
        operation: 'editPattern',
        patternId: pattern.id,
      });
    } catch (err) {
      logger.error('Failed to update pattern', {
        component: 'TileLibrary',
        operation: 'editPattern',
        patternId: pattern.id,
      }, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleTileCreated = (tile: TileDefinition) => {
    setUserTiles((prev) => [...prev, tile]);
    // Register in the tile registry for lookup when rendering
    tileRegistry.register(tile);
  };

  const handleDeleteUserTile = async (tileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await storageService.deleteUserTile(tileId);
      setUserTiles((prev) => prev.filter((t) => t.id !== tileId));
      // Unregister from the tile registry
      tileRegistry.unregister(tileId);
      if (selectedTile?.id === tileId) {
        setSelectedTile(null);
      }
      logger.info('User tile deleted', {
        component: 'TileLibrary',
        operation: 'deleteUserTile',
        tileId,
      });
    } catch (err) {
      logger.error('Failed to delete user tile', {
        component: 'TileLibrary',
        operation: 'deleteUserTile',
        tileId,
      }, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleTileSelect = (tile: TileDefinition) => {
    setSelectedTile(tile);
    setSelectedPattern(null);
    setSelectedFillPattern(null); // Clear fill pattern selection
    setSelectedTool('platform');
    logger.info('Tile selected', {
      component: 'TileLibrary',
      operation: 'selectTile',
      tileId: tile.id,
    });
  };

  const handlePatternSelect = (pattern: TilePattern) => {
    setSelectedPattern(pattern);
    setSelectedTile(null);
    setSelectedFillPattern(null); // Clear fill pattern selection
    setSelectedTool('platform');
    logger.info('Pattern selected', {
      component: 'TileLibrary',
      operation: 'selectPattern',
      patternId: pattern.id,
    });
  };

  const handleDeletePattern = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await storageService.deletePattern(id);
      setPatterns((prev) => prev.filter((p) => p.id !== id));
      if (selectedPattern?.id === id) {
        setSelectedPattern(null);
      }
      logger.info('Pattern deleted', {
        component: 'TileLibrary',
        operation: 'deletePattern',
        patternId: id,
      });
    } catch (err) {
      logger.error('Failed to delete pattern', {
        component: 'TileLibrary',
        operation: 'deletePattern',
        patternId: id,
      }, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  const q = searchQuery.trim().toLowerCase();
  const matchesSearch = (name: string, description?: string, id?: string) =>
    !q || name.toLowerCase().includes(q) || (description?.toLowerCase().includes(q)) || (id?.toLowerCase().includes(q));
  const filteredUserTiles = q ? userTiles.filter((t) => matchesSearch(t.name, t.description, t.id)) : userTiles;
  const filteredPatterns = q ? patterns.filter((p) => matchesSearch(p.name, p.description, p.id)) : patterns;
  const filteredBackgroundImages = q ? backgroundImages.filter((img) => matchesSearch(img.name, undefined, img.id)) : backgroundImages;
  
  // Filter fill patterns by search
  const filteredFillPatterns = q
    ? SYSTEM_FILL_PATTERNS.filter((p) => matchesSearch(p.name, p.description, p.id))
    : SYSTEM_FILL_PATTERNS;
  
  // Group fill patterns by category
  const fillPatternsByCategory = filteredFillPatterns.reduce((acc, pattern) => {
    if (!acc[pattern.category]) {
      acc[pattern.category] = [];
    }
    acc[pattern.category].push(pattern);
    return acc;
  }, {} as Record<string, FillPattern[]>);

  // Group patterns by category
  const patternsByCategory = filteredPatterns.reduce((acc, pattern) => {
    const category = pattern.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(pattern);
    return acc;
  }, {} as Record<string, TilePattern[]>);

  // Sort patterns within each category by name
  Object.keys(patternsByCategory).forEach(category => {
    patternsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Render tile icon based on type (or texture if available)
  const renderTileIcon = (tile: TileDefinition) => {
    // If tile has a texture URL, display the image
    if (tile.texture.url) {
      return (
        <div className="tile-icon tile-icon-texture">
          <img src={tile.texture.url} alt={tile.name} />
        </div>
      );
    }

    const color = TILE_TYPE_COLORS[tile.type];
    
    switch (tile.type) {
      case 'solid':
        return <div className="tile-icon tile-icon-solid" style={{ backgroundColor: color }} />;
      
      case 'bumper':
        return (
          <div className="tile-icon tile-icon-bumper" style={{ backgroundColor: color }}>
            <span className="tile-icon-text">?</span>
          </div>
        );
      
      case 'spawn':
        return (
          <div className="tile-icon tile-icon-spawn" style={{ backgroundColor: color }}>
            <span className="tile-icon-text">▶</span>
          </div>
        );
      
      case 'goal':
        return (
          <div className="tile-icon tile-icon-goal" style={{ backgroundColor: color }}>
            <span className="tile-icon-text">★</span>
          </div>
        );
      
      case 'checkpoint':
        return (
          <div className="tile-icon tile-icon-checkpoint" style={{ backgroundColor: color }}>
            <span className="tile-icon-text">✓</span>
          </div>
        );
      
      case 'teleporter':
        return (
          <div className="tile-icon tile-icon-teleporter" style={{ backgroundColor: color }}>
            <span className="tile-icon-text">◉</span>
          </div>
        );
      
      case 'death':
        if (tile.id.includes('spikes')) {
          return (
            <div className="tile-icon tile-icon-death" style={{ backgroundColor: color }}>
              <span className="tile-icon-text">▲</span>
            </div>
          );
        } else if (tile.id.includes('lava')) {
          return (
            <div className="tile-icon tile-icon-death" style={{ backgroundColor: color }}>
              <span className="tile-icon-text">≋</span>
            </div>
          );
        } else {
          return (
            <div className="tile-icon tile-icon-death" style={{ backgroundColor: color }}>
              <span className="tile-icon-text">☠</span>
            </div>
          );
        }
      
      case 'collectible':
        return (
          <div className="tile-icon tile-icon-collectible" style={{ backgroundColor: color }}>
            <span className="tile-icon-text">◈</span>
          </div>
        );
      
      case 'platform':
        const isHorizontal = tile.id.includes('horizontal');
        return (
          <div className="tile-icon tile-icon-platform" style={{ backgroundColor: color }}>
            <span className="tile-icon-text">{isHorizontal ? '←→' : '↕'}</span>
          </div>
        );
      
      case 'path':
        return (
          <div className="tile-icon tile-icon-path" style={{ backgroundColor: color }}>
            <span className="tile-icon-text">□</span>
          </div>
        );
      
      default:
        return <div className="tile-icon" style={{ backgroundColor: color }} />;
    }
  };

  const handleUseBackgroundImage = (entry: BackgroundImageEntry) => {
    setPendingBackgroundImageDataUrl(entry.dataUrl);
    logger.info('Background image selected for placement from Library', {
      component: 'TileLibrary',
      operation: 'useBackgroundImage',
      imageId: entry.id,
    });
  };

  const handleEditBackgroundImage = async (entry: BackgroundImageEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentName = entry.name;
    const currentDesc = entry.description ?? '';
    const name = window.prompt('Background name', currentName)?.trim();
    if (!name) {
      return;
    }
    const description = window.prompt('Description (optional)', currentDesc)?.trim() || undefined;
    const updated: BackgroundImageEntry = {
      ...entry,
      name,
      description,
    };
    await storageService.saveBackgroundImage(updated);
    setBackgroundImages((prev) => prev.map((img) => (img.id === entry.id ? updated : img)));
    logger.info('Background image metadata updated', {
      component: 'TileLibrary',
      operation: 'editBackgroundImage',
      imageId: entry.id,
    });
  };

  const handleDeleteBackgroundImage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      'This will remove the background image from your library permanently. It will no longer be available in any level.\n\n' +
        'To remove it from only this level, use the "Remove" button in the Background Image section of Level Details (right panel).\n\n' +
        'Remove from library anyway?'
    );
    if (!confirmed) return;
    try {
      await storageService.deleteBackgroundImage(id);
      setBackgroundImages((prev) => prev.filter((img) => img.id !== id));
      logger.info('Background image deleted', {
        component: 'TileLibrary',
        operation: 'deleteBackgroundImage',
        imageId: id,
      });
    } catch (err) {
      logger.error('Failed to delete background image', {
        component: 'TileLibrary',
        operation: 'deleteBackgroundImage',
        imageId: id,
      }, { error: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <CollapsibleSection title="Library" defaultExpanded className="tile-library">
      <div className="tile-library-inner">
        <div className="library-search">
          <input
            type="text"
            className="library-search-input"
            placeholder="Search tiles, patterns…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            title="Filter by name or description"
          />
        </div>

        {/* Backgrounds Section */}
        <CollapsibleSection title="Backgrounds" defaultExpanded className="tile-category">
          {filteredBackgroundImages.length === 0 ? (
            <div className="tile-empty-message">
              {backgroundImages.length === 0 ? 'No background images yet.' : 'No images match search.'}
            </div>
          ) : (
            <div className="tile-list">
              {filteredBackgroundImages.map((img) => (
                <div
                  key={img.id}
                  className="tile-item background-image-item"
                  title={img.name}
                >
                  <div className="background-image-top">
                    <div className="tile-preview background-image-preview">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div className="background-image-actions">
                      <button
                        className="tile-use-button"
                        onClick={() => handleUseBackgroundImage(img)}
                        title="Use as background"
                      >
                        Use
                      </button>
                      <button
                        className="tile-edit-button"
                        onClick={(e) => handleEditBackgroundImage(img, e)}
                        title="Edit background name/description"
                      >
                        Edit
                      </button>
                      <button
                        className="tile-delete-button"
                        onClick={(e) => handleDeleteBackgroundImage(img.id, e)}
                        title="Delete background image"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="background-image-info">
                    <div className="tile-name">{img.name}</div>
                    {img.description && (
                      <div className="tile-size">{img.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Tile Patterns Section (per-tile fill patterns) */}
        <CollapsibleSection title="Tile Patterns" defaultExpanded={false} className="tile-category">
          {filteredFillPatterns.length === 0 ? (
            <div className="tile-empty-message">
              No patterns match search.
            </div>
          ) : (
            <div className="pattern-categories">
              {Object.keys(fillPatternsByCategory).map((category) => {
                const categoryPatterns = fillPatternsByCategory[category];
                if (categoryPatterns.length === 0) return null;

                return (
                  <CollapsibleSection
                    key={category}
                    title={getFillCategoryDisplayName(category)}
                    defaultExpanded={true}
                    className="pattern-category"
                  >
                    <div className="tile-list">
                      {categoryPatterns.map((pattern) => {
                        const patternPreview = generateFillPattern(pattern.type, 48, '#ffffff', '#2c3e50');
                        return (
                          <button
                            key={pattern.id}
                            className={`tile-item fill-pattern-item ${selectedFillPattern === pattern.id ? 'active' : ''}`}
                            onClick={() => {
                              setSelectedFillPattern(pattern.id);
                              setSelectedPattern(null); // Clear tile group pattern selection
                              setSelectedTile(null); // Clear tile selection
                              setSelectedTool('platform'); // Ensure platform tool is active
                              logger.info('Fill pattern selected', {
                                component: 'TileLibrary',
                                operation: 'selectFillPattern',
                                patternId: pattern.id,
                              });
                            }}
                            title={pattern.description ? `${pattern.name}: ${pattern.description}` : pattern.name}
                          >
                            <div className="tile-preview fill-pattern-preview">
                              <img src={patternPreview} alt={pattern.name} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />
                            </div>
                            <div className="tile-info">
                              <div className="tile-name">{pattern.name}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                );
              })}
            </div>
          )}
        </CollapsibleSection>

        {/* Tile Textures Section */}
        <CollapsibleSection title="Tile Textures" defaultExpanded className="tile-category">
          {/* User Tiles Subsection */}
          <div className="tile-category-header">
            <h4 className="tile-category-title">My Tiles</h4>
            <button
              className="tile-upload-button"
              onClick={() => setShowUploadModal(true)}
              title="Upload new tile"
            >
              +
            </button>
          </div>
          {filteredUserTiles.length === 0 ? (
            <div className="tile-empty-message">
              {userTiles.length === 0 ? 'No custom tiles yet.' : 'No tiles match search.'}
            </div>
          ) : (
            <div className="tile-list">
              {filteredUserTiles.map((tile) => (
                <button
                  key={tile.id}
                  className={`tile-item ${selectedTile?.id === tile.id ? 'active' : ''}`}
                  onClick={() => handleTileSelect(tile)}
                  onContextMenu={(e) => handleEditUserTile(tile, e)}
                  title={tile.description}
                >
                  <div className="tile-preview">
                    {renderTileIcon(tile)}
                  </div>
                  <div className="tile-info">
                    <div className="tile-name">{tile.name}</div>
                  </div>
                  <button
                    className="tile-delete-button"
                    onClick={(e) => handleDeleteUserTile(tile.id, e)}
                    title="Delete tile"
                  >
                    ×
                  </button>
                </button>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Tile Groups Section (saved from selected tile groups) */}
        <CollapsibleSection title="Tile Groups" defaultExpanded className="tile-category">
          {filteredPatterns.length === 0 ? (
            <div className="tile-empty-message">
              {patterns.length === 0
                ? 'No tile groups yet. Select tile group(s) on the canvas and use "Save to Library" in the Properties panel.'
                : 'No tile groups match search.'}
            </div>
          ) : (
            <div className="pattern-categories">
              {getCategoryOrder().map((category) => {
                const categoryPatterns = patternsByCategory[category] || [];
                if (categoryPatterns.length === 0) return null;

                return (
                  <CollapsibleSection
                    key={category}
                    title={getCategoryDisplayName(category)}
                    defaultExpanded={true}
                    className="pattern-category"
                  >
                                  <div className="tile-list">
                                    {categoryPatterns.map((pattern) => {
                                      const previewUrl = generatePatternPreview(pattern, 48);
                                      const isUserPattern = pattern.source !== 'system';
                                      // Check if pattern contains moving platform tiles
                                      const hasMovingPlatform = pattern.cells.some(
                                        (cell) => cell.tileId === 'platform-moving-horizontal' || cell.tileId === 'platform-moving-vertical'
                                      );
                                      const movementDirection = pattern.cells.some(c => c.tileId === 'platform-moving-horizontal')
                                        ? 'horizontal'
                                        : pattern.cells.some(c => c.tileId === 'platform-moving-vertical')
                                        ? 'vertical'
                                        : null;
                                      return (
                                        <button
                                          key={pattern.id}
                                          className={`tile-item pattern-item ${selectedPattern?.id === pattern.id ? 'active' : ''} ${hasMovingPlatform ? 'moving-platform-pattern' : ''}`}
                                          onClick={() => {
                                            handlePatternSelect(pattern);
                                            setSelectedFillPattern(null); // Clear fill pattern selection
                                          }}
                                          onContextMenu={(e) => {
                                            if (isUserPattern) {
                                              handleEditPattern(pattern, e);
                                            } else {
                                              e.preventDefault();
                                            }
                                          }}
                                          title={pattern.description ? `${pattern.name}: ${pattern.description} (${pattern.cells.length} tiles)${hasMovingPlatform ? ' - Place and use "Create Moving Platform" to add path' : ''}` : `${pattern.name} (${pattern.cells.length} tiles)${hasMovingPlatform ? ' - Place and use "Create Moving Platform" to add path' : ''}`}
                                        >
                                          <div className="tile-preview pattern-preview">
                                            {previewUrl ? (
                                              <img 
                                                src={previewUrl} 
                                                alt={pattern.name}
                                                style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                                              />
                                            ) : (
                                              <span className="pattern-cell-count">{pattern.cells.length}</span>
                                            )}
                                            {hasMovingPlatform && (
                                              <span className={`movement-indicator ${movementDirection}`} title={`Moving ${movementDirection}`}>
                                                {movementDirection === 'horizontal' ? '←→' : '↕'}
                                              </span>
                                            )}
                                          </div>
                                          <div className="tile-info">
                                            <div className="tile-name">{pattern.name}</div>
                                            {pattern.description && (
                                              <div className="tile-size">{pattern.description}</div>
                                            )}
                                          </div>
                                          {pattern.source !== 'system' && (
                                            <button
                                              className="tile-delete-button"
                                              onClick={(e) => handleDeletePattern(pattern.id, e)}
                                              title="Delete tile group"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                  </CollapsibleSection>
                );
              })}
              {/* Show uncategorized patterns if any */}
              {patternsByCategory['uncategorized'] && patternsByCategory['uncategorized'].length > 0 && (
                <CollapsibleSection
                  title="Uncategorized"
                  defaultExpanded={true}
                  className="pattern-category"
                >
                  <div className="tile-list">
                    {patternsByCategory['uncategorized'].map((pattern) => {
                      const previewUrl = generatePatternPreview(pattern, 48);
                      const isUserPattern = pattern.source !== 'system';
                      // Check if pattern contains moving platform tiles
                      const hasMovingPlatform = pattern.cells.some(
                        (cell) => cell.tileId === 'platform-moving-horizontal' || cell.tileId === 'platform-moving-vertical'
                      );
                      const movementDirection = pattern.cells.some(c => c.tileId === 'platform-moving-horizontal')
                        ? 'horizontal'
                        : pattern.cells.some(c => c.tileId === 'platform-moving-vertical')
                        ? 'vertical'
                        : null;
                      return (
                        <button
                          key={pattern.id}
                          className={`tile-item pattern-item ${selectedPattern?.id === pattern.id ? 'active' : ''} ${hasMovingPlatform ? 'moving-platform-pattern' : ''}`}
                          onClick={() => {
                            handlePatternSelect(pattern);
                            setSelectedFillPattern(null); // Clear fill pattern selection
                          }}
                          onContextMenu={(e) => {
                            if (isUserPattern) {
                              handleEditPattern(pattern, e);
                            } else {
                              e.preventDefault();
                            }
                          }}
                          title={pattern.description ? `${pattern.name}: ${pattern.description} (${pattern.cells.length} tiles)${hasMovingPlatform ? ' - Place and use "Create Moving Platform" to add path' : ''}` : `${pattern.name} (${pattern.cells.length} tiles)${hasMovingPlatform ? ' - Place and use "Create Moving Platform" to add path' : ''}`}
                        >
                          <div className="tile-preview pattern-preview">
                            {previewUrl ? (
                              <img 
                                src={previewUrl} 
                                alt={pattern.name}
                                style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }}
                              />
                            ) : (
                              <span className="pattern-cell-count">{pattern.cells.length}</span>
                            )}
                            {hasMovingPlatform && (
                              <span className={`movement-indicator ${movementDirection}`} title={`Moving ${movementDirection}`}>
                                {movementDirection === 'horizontal' ? '←→' : '↕'}
                              </span>
                            )}
                          </div>
                          <div className="tile-info">
                            <div className="tile-name">{pattern.name}</div>
                            {pattern.description && (
                              <div className="tile-size">{pattern.description}</div>
                            )}
                          </div>
                          {pattern.source !== 'system' && (
                            <button
                              className="tile-delete-button"
                              onClick={(e) => handleDeletePattern(pattern.id, e)}
                              title="Delete tile group"
                            >
                              ×
                            </button>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}
        </CollapsibleSection>

        <TileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onTileCreated={handleTileCreated}
        />
      </div>
    </CollapsibleSection>
  );
}
