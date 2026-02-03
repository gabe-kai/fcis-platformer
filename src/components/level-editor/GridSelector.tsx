import { useEditorStore } from '@/stores/editorStore';
import { logger } from '@/utils/logger';
import './GridSelector.css';

/**
 * GridSelector Component
 * 
 * Provides grid toggle and size selection for the level editor.
 */
export function GridSelector() {
  const { gridEnabled, gridSize, toggleGrid, setGridSize } = useEditorStore();

  const gridSizes = [16, 32, 64];

  const handleGridToggle = () => {
    toggleGrid();
    logger.info('Grid toggled', {
      component: 'GridSelector',
      operation: 'toggleGrid',
      enabled: !gridEnabled,
    });
  };

  const handleGridSizeChange = (size: number) => {
    setGridSize(size);
    logger.info('Grid size changed', {
      component: 'GridSelector',
      operation: 'setGridSize',
      size,
    });
  };

  return (
    <div className="grid-selector">
      <h3>Grid</h3>
      <div className="grid-controls">
        <button
          className={`grid-toggle ${gridEnabled ? 'active' : ''}`}
          onClick={handleGridToggle}
          title={gridEnabled ? 'Hide Grid' : 'Show Grid'}
        >
          {gridEnabled ? '☑' : '☐'} Show Grid
        </button>
        <div className="grid-size-selector">
          <label>Size:</label>
          <div className="grid-size-buttons">
            {gridSizes.map((size) => (
              <button
                key={size}
                className={`grid-size-button ${gridSize === size ? 'active' : ''}`}
                onClick={() => handleGridSizeChange(size)}
                title={`${size}px grid`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
