import { useEditorStore } from '@/stores/editorStore';
import { logger } from '@/utils/logger';
import './ToolPalette.css';

/**
 * ToolPalette Component
 * 
 * Provides tool selection UI for the level editor.
 * Tools: Select, Platform, Delete
 */
export function ToolPalette() {
  const { selectedTool, setSelectedTool, selectedLayer, setSelectedLayer } = useEditorStore();

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

  return (
    <div className="tool-palette">
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
    </div>
  );
}
