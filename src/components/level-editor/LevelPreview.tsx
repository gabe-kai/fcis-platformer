import { useEffect, useRef, useState } from 'react';
import type { Level } from '@/models/Level';
import { getTileDefinition } from '@/models/Tile';
import { useEditorStore } from '@/stores/editorStore';
import './LevelPreview.css';

interface LevelPreviewProps {
  level: Level;
  zoom: number;
  scrollLeft?: number;
  scrollTop?: number;
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * LevelPreview Component
 * 
 * Displays a miniature preview of the level.
 * Viewport indicator can be shown if scroll position is provided.
 */
export function LevelPreview({ level, zoom, scrollLeft, scrollTop, canvasWidth, canvasHeight }: LevelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setTargetScrollPosition } = useEditorStore();
  const [isDragging, setIsDragging] = useState(false);

  // Convert preview coordinates to scroll position
  const previewToScrollPosition = (previewX: number, previewY: number) => {
    const gridSize = level.gridSize || 64;
    const tileGrid = level.tileGrid || [];
    const mapWidthCells = tileGrid[0]?.length || 0;
    const mapHeightCells = tileGrid.length || 0;

    if (mapWidthCells === 0 || mapHeightCells === 0 || !canvasWidth || !canvasHeight) return null;

    // Calculate preview dimensions (same as in useEffect)
    const maxPreviewSize = 200;
    const levelAspect = mapWidthCells / mapHeightCells;
    let previewWidth: number;
    let previewHeight: number;
    if (levelAspect > 1) {
      previewWidth = maxPreviewSize;
      previewHeight = maxPreviewSize / levelAspect;
    } else {
      previewHeight = maxPreviewSize;
      previewWidth = maxPreviewSize * levelAspect;
    }

    const scaleX = previewWidth / mapWidthCells;
    const scaleY = previewHeight / mapHeightCells;

    // Convert preview coordinates to cell coordinates
    const clickCellX = Math.floor(previewX / scaleX);
    const clickCellY = mapHeightCells - 1 - Math.floor(previewY / scaleY); // Convert from top-left to bottom-left

    // Calculate scroll position to center this cell in viewport
    const cellSizePixels = gridSize * zoom;
    const mapHeightPixels = mapHeightCells * cellSizePixels;
    
    // Calculate target scroll position (center the clicked cell)
    const targetScrollLeft = (clickCellX * cellSizePixels) - (canvasWidth / 2);
    const targetScrollTop = (mapHeightPixels - (clickCellY * cellSizePixels)) - (canvasHeight / 2);

    // Clamp to valid scroll range
    const maxScrollLeft = (mapWidthCells * cellSizePixels) - canvasWidth;
    const maxScrollTop = mapHeightPixels - canvasHeight;

    const clampedScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));
    const clampedScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));

    return {
      scrollLeft: clampedScrollLeft,
      scrollTop: clampedScrollTop,
    };
  };

  // Handle mouse down on preview
  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragging(true);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const position = previewToScrollPosition(x, y);
    if (position) {
      setTargetScrollPosition(position);
    }
  };

  // Handle mouse move on preview (for dragging)
  const handlePreviewMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const position = previewToScrollPosition(x, y);
    if (position) {
      setTargetScrollPosition(position);
    }
  };

  // Handle mouse up anywhere
  const handlePreviewMouseUp = () => {
    setIsDragging(false);
  };

  // Clean up on unmount
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = level.gridSize || 64;
    const tileGrid = level.tileGrid || [];
    const mapWidthCells = tileGrid[0]?.length || 0;
    const mapHeightCells = tileGrid.length || 0;

    if (mapWidthCells === 0 || mapHeightCells === 0) {
      return;
    }

    // Calculate preview size maintaining aspect ratio
    const maxPreviewSize = 200; // Maximum dimension for preview
    const levelAspect = mapWidthCells / mapHeightCells;
    
    let previewWidth: number;
    let previewHeight: number;
    
    if (levelAspect > 1) {
      // Level is wider than tall
      previewWidth = maxPreviewSize;
      previewHeight = maxPreviewSize / levelAspect;
    } else {
      // Level is taller than wide
      previewHeight = maxPreviewSize;
      previewWidth = maxPreviewSize * levelAspect;
    }

    // Only resize if needed
    if (canvas.width !== previewWidth || canvas.height !== previewHeight) {
      canvas.width = previewWidth;
      canvas.height = previewHeight;
    }

    const scaleX = previewWidth / mapWidthCells;
    const scaleY = previewHeight / mapHeightCells;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw tiles from tile grid
    for (let cellY = 0; cellY < tileGrid.length; cellY++) {
      const row = tileGrid[cellY];
      for (let cellX = 0; cellX < row.length; cellX++) {
        const cell = row[cellX];
        if (!cell?.tileId) continue;
        const tileDef = getTileDefinition(cell.tileId);
        if (!tileDef) continue;

        // Convert cell to preview coordinates
        // Preview uses top-left origin, cells use bottom-left
        const x = cellX * scaleX;
        const y = (mapHeightCells - cellY - 1) * scaleY;
        const width = scaleX;
        const height = scaleY;

        ctx.fillStyle = cell.passable ? 'rgba(52, 152, 219, 0.5)' : '#3498db';
        ctx.fillRect(x, y, width, height);
      }
    }

    // Draw viewport indicator if scroll position is provided
    if (scrollLeft !== undefined && scrollTop !== undefined && canvasWidth && canvasHeight) {
      const cellSizePixels = gridSize * zoom;
      const mapHeightPixels = mapHeightCells * cellSizePixels;
      
      // Calculate visible cell range
      const visibleMinX = Math.max(0, Math.floor(scrollLeft / cellSizePixels));
      const visibleMaxX = Math.min(mapWidthCells - 1, Math.floor((scrollLeft + canvasWidth) / cellSizePixels));
      const visibleMinY = Math.max(0, Math.floor((mapHeightPixels - scrollTop - canvasHeight) / cellSizePixels));
      const visibleMaxY = Math.min(mapHeightCells - 1, Math.floor((mapHeightPixels - scrollTop) / cellSizePixels));

      const viewportX = visibleMinX * scaleX;
      const viewportY = (mapHeightCells - visibleMaxY - 1) * scaleY;
      const viewportWidth = (visibleMaxX - visibleMinX + 1) * scaleX;
      const viewportHeight = (visibleMaxY - visibleMinY + 1) * scaleY;

      // Only draw viewport if it's within or partially within the level bounds
      if (
        viewportX < previewWidth &&
        viewportY < previewHeight &&
        viewportX + viewportWidth > 0 &&
        viewportY + viewportHeight > 0
      ) {
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
          Math.max(0, viewportX),
          Math.max(0, viewportY),
          Math.min(viewportWidth, previewWidth - Math.max(0, viewportX)),
          Math.min(viewportHeight, previewHeight - Math.max(0, viewportY))
        );
        ctx.setLineDash([]);
      }
    }
  }, [level, level.tileGrid, level.gridSize, zoom, scrollLeft, scrollTop, canvasWidth, canvasHeight]);

  const tileGrid = level.tileGrid || [];
  const mapWidthCells = tileGrid[0]?.length || 0;
  const mapHeightCells = tileGrid.length || 0;
  const levelAspect = mapWidthCells > 0 && mapHeightCells > 0 ? mapWidthCells / mapHeightCells : 1;
  const maxPreviewSize = 200;
  
  let previewWidth: number;
  let previewHeight: number;
  
  if (levelAspect > 1) {
    previewWidth = maxPreviewSize;
    previewHeight = maxPreviewSize / levelAspect;
  } else {
    previewHeight = maxPreviewSize;
    previewWidth = maxPreviewSize * levelAspect;
  }

  return (
    <div className="level-preview-container">
      <canvas
        ref={canvasRef}
        className="level-preview-canvas"
        onMouseDown={handlePreviewMouseDown}
        onMouseMove={handlePreviewMouseMove}
        onMouseUp={handlePreviewMouseUp}
        style={{
          width: `${previewWidth}px`,
          height: `${previewHeight}px`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        title="Click or drag to navigate"
      />
      <div className="preview-info">
        <div className="preview-item">
          <label>Size:</label>
          <span>{mapWidthCells} × {mapHeightCells} tiles</span>
        </div>
        <div className="preview-item">
          <label>Tiles:</label>
          <span>{(level.tileGrid || []).flat().filter(cell => cell.tileId).length}</span>
        </div>
        {level.description && (
          <div className="preview-item">
            <label>Description:</label>
            <span className="preview-description">{level.description}</span>
          </div>
        )}
      </div>
    </div>
  );
}
