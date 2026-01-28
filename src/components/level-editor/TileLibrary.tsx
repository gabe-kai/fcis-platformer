import { useEffect, useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { getAllTileDefinitions, type TileDefinition, TILE_TYPE_COLORS, tileRegistry } from '@/models/Tile';
import { storageService, type BackgroundImageEntry } from '@/services/storageService';
import { logger } from '@/utils/logger';
import { TileUploadModal } from './TileUploadModal';
import './TileLibrary.css';

/**
 * Library Component (formerly TileLibrary)
 * 
 * Displays available tiles, tile group textures, and background images.
 * Located below the ToolPalette in the left sidebar.
 */
export function TileLibrary() {
  const { selectedTile, setSelectedTile, setSelectedTool, setPendingBackgroundImageDataUrl } = useEditorStore();
  const [userTiles, setUserTiles] = useState<TileDefinition[]>([]);
  const [backgroundImages, setBackgroundImages] = useState<BackgroundImageEntry[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const allTiles = getAllTileDefinitions();

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

  // Organize system tiles by category
  const tileCategories = {
    'Core': allTiles.filter(t => t.type === 'spawn' || t.type === 'goal' || t.type === 'checkpoint'),
    'Platforms': allTiles.filter(t => t.type === 'solid' || t.type === 'platform'),
    'Interactive': allTiles.filter(t => t.type === 'bumper' || t.type === 'teleporter' || t.type === 'collectible'),
    'Hazards': allTiles.filter(t => t.type === 'death'),
  };

  const handleTileSelect = (tile: TileDefinition) => {
    setSelectedTile(tile);
    setSelectedTool('platform'); // Switch to platform tool when selecting a tile
    logger.info('Tile selected', {
      component: 'TileLibrary',
      operation: 'selectTile',
      tileId: tile.id,
    });
  };

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

  const handleDeleteBackgroundImage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div className="tile-library">
      <h3>Library</h3>

      {/* Tile Textures Section */}
      <div className="tile-category">
        <h4 className="tile-category-title">Tile Textures</h4>
        
        {/* User Tiles Subsection */}
        <div className="tile-category user-tiles-category">
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
        {userTiles.length === 0 ? (
          <div className="tile-empty-message">
            No custom tiles yet.
            <button
              className="tile-upload-link"
              onClick={() => setShowUploadModal(true)}
            >
              Upload one
            </button>
          </div>
        ) : (
          <div className="tile-list">
            {userTiles.map((tile) => (
              <button
                key={tile.id}
                className={`tile-item ${selectedTile?.id === tile.id ? 'active' : ''}`}
                onClick={() => handleTileSelect(tile)}
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
        </div>

        {/* System Tiles by Category */}
        {Object.entries(tileCategories).map(([category, tiles]) => (
          tiles.length > 0 && (
            <div key={category} className="tile-category">
              <h4 className="tile-category-title">{category}</h4>
              <div className="tile-list">
                {tiles.map((tile) => (
                  <button
                    key={tile.id}
                    className={`tile-item ${selectedTile?.id === tile.id ? 'active' : ''}`}
                    onClick={() => handleTileSelect(tile)}
                    title={tile.description}
                  >
                    <div className="tile-preview">
                      {renderTileIcon(tile)}
                    </div>
                    <div className="tile-info">
                      <div className="tile-name">{tile.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Tile Group Textures Section */}
      <div className="tile-category">
        <h4 className="tile-category-title">Tile Group Textures</h4>
        <div className="tile-empty-message">
          Coming soon
        </div>
      </div>

      {/* Background Images Section */}
      <div className="tile-category">
        <h4 className="tile-category-title">Background Images</h4>
        {backgroundImages.length === 0 ? (
          <div className="tile-empty-message">
            No background images yet.
          </div>
        ) : (
          <div className="tile-list">
            {backgroundImages.map((img) => (
              <div
                key={img.id}
                className="tile-item background-image-item"
                title={img.name}
              >
                <div className="tile-preview background-image-preview">
                  <img src={img.dataUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="tile-info">
                  <div className="tile-name">{img.name}</div>
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
                    className="tile-delete-button"
                    onClick={(e) => handleDeleteBackgroundImage(img.id, e)}
                    title="Delete background image"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onTileCreated={handleTileCreated}
      />
    </div>
  );
}
