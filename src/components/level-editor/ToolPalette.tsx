import { useEditorStore } from '@/stores/editorStore';
import { logger } from '@/utils/logger';
import { getAllTileDefinitions, type TileDefinition, TILE_TYPE_COLORS } from '@/models/Tile';
import { CollapsibleSection } from './CollapsibleSection';
import './ToolPalette.css';

/**
 * ToolPalette Component
 * 
 * Provides tool selection UI for the level editor.
 * Tools: Select, Platform, Delete
 */
export function ToolPalette() {
  const { selectedTool, setSelectedTool, selectedLayer, setSelectedLayer, selectedTile, setSelectedTile } = useEditorStore();

  const allTiles = getAllTileDefinitions();
  const functionCategories: Record<string, TileDefinition[]> = {
    Core: allTiles.filter((t) => t.type === 'spawn' || t.type === 'goal' || t.type === 'checkpoint'),
    Platforms: allTiles.filter((t) => t.type === 'solid' || t.type === 'platform'),
    Interactive: allTiles.filter((t) => t.type === 'bumper' || t.type === 'teleporter' || t.type === 'collectible'),
    Hazards: allTiles.filter((t) => t.type === 'death'),
  };

  const handleToolSelect = (tool: 'select' | 'platform' | 'delete') => {
    setSelectedTool(tool);
    logger.info('Tool selected', {
      component: 'ToolPalette',
      operation: 'selectTool',
      tool,
    });
  };

  const handleLayerSelect = (layer: 'background' | 'primary' | 'foreground') => {
    setSelectedLayer(layer);
    logger.info('Layer selected', {
      component: 'ToolPalette',
      operation: 'selectLayer',
      layer,
    });
  };

  const handleFunctionTileSelect = (tile: TileDefinition) => {
    setSelectedTile(tile);
    setSelectedTool('platform');
    logger.info('Function tile selected', {
      component: 'ToolPalette',
      operation: 'selectFunctionTile',
      tileId: tile.id,
    });
  };

  return (
    <div className="tool-palette">
      <h3>Layer</h3>
      <div className="layer-buttons">
        <button
          className={`layer-button ${selectedLayer === 'background' ? 'active' : ''}`}
          onClick={() => handleLayerSelect('background')}
          title="Background Layer"
        >
          <span className="layer-label">Background</span>
          {selectedLayer === 'background' && <span className="layer-indicator">●</span>}
        </button>
        <button
          className={`layer-button ${selectedLayer === 'primary' ? 'active' : ''}`}
          onClick={() => handleLayerSelect('primary')}
          title="Primary Layer (Physics)"
        >
          <span className="layer-label">Primary</span>
          {selectedLayer === 'primary' && <span className="layer-indicator">●</span>}
        </button>
        <button
          className={`layer-button ${selectedLayer === 'foreground' ? 'active' : ''}`}
          onClick={() => handleLayerSelect('foreground')}
          title="Foreground Layer"
        >
          <span className="layer-label">Foreground</span>
          {selectedLayer === 'foreground' && <span className="layer-indicator">●</span>}
        </button>
      </div>

      <h3>Tools</h3>
      <div className="tool-buttons">
        <button
          className={`tool-button ${selectedTool === 'select' ? 'active' : ''}`}
          onClick={() => handleToolSelect('select')}
          title="Select Tool (S)"
        >
          <span className="tool-icon">↖</span>
          <span className="tool-label">Select</span>
        </button>
        <button
          className={`tool-button ${selectedTool === 'platform' ? 'active' : ''}`}
          onClick={() => handleToolSelect('platform')}
          title="Platform Tool (P)"
        >
          <span className="tool-icon">▭</span>
          <span className="tool-label">Platform</span>
        </button>
        <button
          className={`tool-button ${selectedTool === 'delete' ? 'active' : ''}`}
          onClick={() => handleToolSelect('delete')}
          title="Delete Tool (D). Click = one tile, Shift+click = whole group"
        >
          <span className="tool-icon">🗑</span>
          <span className="tool-label">Delete</span>
        </button>
      </div>

      <CollapsibleSection title="Functions" defaultExpanded className="functions-section">
        {Object.entries(functionCategories).map(([category, tiles]) =>
          tiles.length > 0 ? (
            <div key={category} className="functions-category">
              <h4 className="functions-category-title">{category}</h4>
              <div className="functions-tile-list">
                {tiles.map((tile) => (
                  <button
                    key={tile.id}
                    className={`functions-tile ${selectedTile?.id === tile.id ? 'active' : ''}`}
                    onClick={() => handleFunctionTileSelect(tile)}
                    title={tile.description}
                  >
                    <span
                      className="functions-tile-swatch"
                      style={{ backgroundColor: TILE_TYPE_COLORS[tile.type] }}
                    />
                    <span className="functions-tile-name">{tile.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null
        )}
      </CollapsibleSection>
    </div>
  );
}
