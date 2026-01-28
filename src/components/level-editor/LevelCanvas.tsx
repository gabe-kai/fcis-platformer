import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { drawGrid } from '@/utils/grid';
import { logger } from '@/utils/logger';
import { cellToCanvas, canvasToCell, getVisibleCells } from '@/utils/cellCoordinates';
import { findConnectedTiles } from '@/utils/tileGroupingUtils';
import { getTileDefinition, DEFAULT_SOLID_BLOCK, TILE_TYPE_COLORS } from '@/models/Tile';
import { clampZoom, getScrollContainerSize } from '@/utils/viewportUtils';
import { getTileAtCell } from '@/utils/tileMapUtils';
import './LevelCanvas.css';

/**
 * LevelCanvas Component
 * 
 * Complete rewrite with cell-based coordinates and native scrollbars.
 * Scrollbars are the single source of truth for viewport position.
 */
export function LevelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Local state (minimal)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ cellX: number; cellY: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ cellX: number; cellY: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ cellX: number; cellY: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [backgroundImageElement, setBackgroundImageElement] = useState<HTMLImageElement | null>(null);
  
  // Texture cache for tile textures
  const textureCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [texturesLoaded, setTexturesLoaded] = useState(0); // Counter to trigger re-render when textures load
  const renderRef = useRef<() => void>(() => {});
  const rafRef = useRef<number | null>(null);
  
  // Debounced render using requestAnimationFrame
  const scheduleRender = useCallback(() => {
    if (rafRef.current !== null) return; // Already scheduled
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      renderRef.current();
    });
  }, []);

  // Store (read-only for rendering)
  const {
    currentLevel,
    selectedTool,
    gridEnabled,
    viewMode,
    gridSize: storeGridSize,
    zoom,
    selectedTile,
    selectedTileEntry,
    selectedTileGroup,
    selectedLayer,
    targetScrollPosition,
    setSelectedTool,
    setSelectedTileEntry,
    setSelectedTileGroup,
    setZoom,
    setTileAtCell,
    removeTileAtCell,
    setViewportState,
    setTargetScrollPosition,
  } = useEditorStore();

  // Use level's gridSize if available, otherwise fall back to store gridSize
  const gridSize = currentLevel?.gridSize || storeGridSize;
  const tileGrid = currentLevel?.tileGrid || [];
  const mapWidthCells = tileGrid[0]?.length || 0;
  const mapHeightCells = tileGrid.length || 0;
  const mapWidthPixels = mapWidthCells * gridSize * zoom;
  const mapHeightPixels = mapHeightCells * gridSize * zoom;
  const cellSizePixels = gridSize * zoom;

  // Get canvas coordinates from mouse event
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Render function (pure, reads scroll position from DOM)
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = scrollContainerRef.current;
    if (!canvas || !container || !currentLevel) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Read current scroll position (single source of truth)
    const currentScrollLeft = container.scrollLeft;
    const currentScrollTop = container.scrollTop;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw solid background color
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw background image if available (texture mode only; grid mode is for printing/coloring)
    if (viewMode === 'texture' && backgroundImageElement) {
      const imgWidth = backgroundImageElement.width;
      const imgHeight = backgroundImageElement.height;
      
      if (imgWidth > 0 && imgHeight > 0) {
        // Calculate scale to fill viewport while maintaining aspect ratio
        const scaleX = canvasWidth / imgWidth;
        const scaleY = canvasHeight / imgHeight;
        const scale = Math.max(scaleX, scaleY); // Fill (cover) instead of fit (contain)
        
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        // Position image to bottom-left (accounting for scroll)
        const mapHeightPixels = mapHeightCells * cellSizePixels;
        const imgX = -currentScrollLeft;
        const imgY = (mapHeightPixels - currentScrollTop) - scaledHeight;
        
        ctx.drawImage(
          backgroundImageElement,
          imgX,
          imgY,
          scaledWidth,
          scaledHeight
        );
      }
    }

    // Draw grid if enabled
    if (gridEnabled) {
      drawGrid(
        ctx,
        gridSize,
        zoom,
        currentScrollLeft,
        currentScrollTop,
        canvasWidth,
        canvasHeight,
        mapWidthCells,
        mapHeightCells
      );
    }

    // Get visible cell range (viewport culling)
    const visible = getVisibleCells(
      currentScrollLeft,
      currentScrollTop,
      canvasWidth,
      canvasHeight,
      mapWidthCells,
      mapHeightCells,
      gridSize,
      zoom
    );

    // Draw tiles (only visible cells)
    for (let cellY = visible.minY; cellY <= visible.maxY; cellY++) {
      if (cellY < 0 || cellY >= mapHeightCells) continue;
      const row = tileGrid[cellY];
      if (!row) continue;

      for (let cellX = visible.minX; cellX <= visible.maxX; cellX++) {
        if (cellX < 0 || cellX >= mapWidthCells) continue;
        const cell = row[cellX];
        if (!cell?.tileId) continue;

        // Only draw tiles on the selected layer
        if (cell.layer !== selectedLayer) continue;

        const tileDef = getTileDefinition(cell.tileId);
        if (!tileDef) continue;

        const isPrimarySelected =
          selectedTileEntry != null &&
          selectedTileEntry.cellX === cellX &&
          selectedTileEntry.cellY === cellY;
        const isInGroup =
          selectedTileGroup != null &&
          selectedTileGroup.some((t) => t.cellX === cellX && t.cellY === cellY);
        const isSelected = isPrimarySelected || isInGroup;

        // Convert cell to canvas coordinates
        const canvasPos = cellToCanvas(
          cellX,
          cellY,
          gridSize,
          zoom,
          currentScrollLeft,
          currentScrollTop,
          canvasHeight,
          mapHeightCells
        );

        // Grid mode: always solid-color blocks (for printing/coloring/re-upload). Texture mode: use texture when available.
        const textureUrl = tileDef.texture?.url;
        const cachedTexture = textureUrl ? textureCache.current.get(textureUrl) : null;
        const useTexture = viewMode === 'texture' && cachedTexture;

        if (useTexture) {
          ctx.drawImage(
            cachedTexture,
            canvasPos.x,
            canvasPos.y - cellSizePixels,
            cellSizePixels,
            cellSizePixels
          );
        } else {
          const tileColor = TILE_TYPE_COLORS[tileDef.type] || '#3498db';
          let fillColor = cell.passable ? `${tileColor}80` : tileColor;
          if (isPrimarySelected) fillColor = '#f1c40f';
          else if (isInGroup) fillColor = 'rgba(52, 152, 219, 0.6)';
          ctx.fillStyle = fillColor;
          ctx.fillRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);

          if (viewMode === 'texture' && textureUrl && !textureCache.current.has(textureUrl)) {
            const img = new Image();
            img.onload = () => {
              textureCache.current.set(textureUrl, img);
              setTexturesLoaded((c) => c + 1);
            };
            img.src = textureUrl;
            textureCache.current.set(textureUrl, img);
          }
        }

        // Draw selection indicator (primary = yellow border, group = blue border)
        if (isPrimarySelected) {
          ctx.strokeStyle = '#f1c40f';
          ctx.lineWidth = 4;
          ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
        } else if (isInGroup) {
          ctx.strokeStyle = '#3498db';
          ctx.lineWidth = 2;
          ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
        } else if (!useTexture) {
          // Border for solid-block tiles (grid mode or no texture)
          ctx.strokeStyle = '#2980b9';
          ctx.lineWidth = 2;
          ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
        }
      }
    }

    // Draw hover highlight (when hovering with place tool)
    if (!isDragging && hoverCell && selectedTool === 'platform') {
      const { cellX, cellY } = hoverCell;
      if (cellX >= 0 && cellX < mapWidthCells && cellY >= 0 && cellY < mapHeightCells) {
        const canvasPos = cellToCanvas(
          cellX,
          cellY,
          gridSize,
          zoom,
          currentScrollLeft,
          currentScrollTop,
          canvasHeight,
          mapHeightCells
        );

        ctx.fillStyle = 'rgba(52, 152, 219, 0.2)';
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.fillRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
        ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
        ctx.setLineDash([]);
      }
    }

    // Draw drag preview (when placing tiles)
    if (isDragging && dragStart && dragEnd && selectedTool === 'platform') {
      const minCellX = Math.max(0, Math.min(dragStart.cellX, dragEnd.cellX));
      const maxCellX = Math.min(mapWidthCells - 1, Math.max(dragStart.cellX, dragEnd.cellX));
      const minCellY = Math.max(0, Math.min(dragStart.cellY, dragEnd.cellY));
      const maxCellY = Math.min(mapHeightCells - 1, Math.max(dragStart.cellY, dragEnd.cellY));

      ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
          const canvasPos = cellToCanvas(
            cellX,
            cellY,
            gridSize,
            zoom,
            currentScrollLeft,
            currentScrollTop,
            canvasHeight,
            mapHeightCells
          );
          ctx.fillRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
          ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
        }
      }
      ctx.setLineDash([]);
    }
  }, [
    currentLevel,
    tileGrid,
    mapWidthCells,
    mapHeightCells,
    gridSize,
    zoom,
    gridEnabled,
    viewMode,
    selectedTool,
    selectedTile,
    selectedTileEntry,
    selectedTileGroup,
    selectedLayer,
    isDragging,
    dragStart,
    dragEnd,
    hoverCell,
    backgroundImageElement,
    cellSizePixels,
    texturesLoaded,
  ]);

  // Store render function in ref so effects can call it without dependency issues
  useEffect(() => {
    renderRef.current = render;
  }, [render]);

  // Handle scroll event - trigger re-render and update viewport state
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (container) {
      // Update viewport state in store for preview indicator
      setViewportState({
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      });
    }
    // Schedule render which reads fresh scroll position from DOM
    scheduleRender();
  }, [setViewportState, scheduleRender]);

  // Handle wheel (zoom)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!currentLevel) return;
    e.preventDefault();

    const container = scrollContainerRef.current;
    if (!container) return;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = clampZoom(
      zoom * zoomFactor,
      mapWidthCells,
      mapHeightCells,
      gridSize,
      canvasSize.width,
      canvasSize.height
    );
    if (nextZoom === zoom) return;

    // Update zoom
    setZoom(nextZoom);

    // After zoom, recalculate scroll to keep cursor over same cell
    // This happens in the useEffect that watches zoom
  }, [currentLevel, zoom, mapWidthCells, mapHeightCells, gridSize, canvasSize, setZoom]);

  // Set up wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = scrollContainerRef.current;
    if (!container || !currentLevel) return;

    const coords = getCanvasCoordinates(e);
    const cell = canvasToCell(
      coords.x,
      coords.y,
      gridSize,
      zoom,
      container.scrollLeft,
      container.scrollTop,
      canvasSize.height,
      mapHeightCells
    );

    // Update hover cell
    setHoverCell(cell);

    // Handle panning (middle mouse)
    if (isPanning && panStart) {
      const deltaX = coords.x - panStart.x;
      const deltaY = coords.y - panStart.y;
      
      container.scrollLeft -= deltaX;
      container.scrollTop -= deltaY;
      
      setPanStart(coords);
      scheduleRender();
    }

    // Handle dragging (left mouse for placement)
    if (isDragging && dragStart) {
      setDragEnd(cell);
    }
  }, [currentLevel, gridSize, zoom, canvasSize, mapHeightCells, isPanning, panStart, isDragging, dragStart, scheduleRender]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const container = scrollContainerRef.current;
    if (!container || !currentLevel) return;

    const coords = getCanvasCoordinates(e);
    const cell = canvasToCell(
      coords.x,
      coords.y,
      gridSize,
      zoom,
      container.scrollLeft,
      container.scrollTop,
      canvasSize.height,
      mapHeightCells
    );

    // Middle mouse: start panning
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart(coords);
      return;
    }

    // Right mouse: switch to select tool, unselect
    if (e.button === 2) {
      e.preventDefault();
      setSelectedTool('select');
      setSelectedTileEntry(null);
      setSelectedTileGroup(null);
      return;
    }

    // Left mouse: tool-specific actions
    if (e.button === 0) {
      if (selectedTool === 'platform') {
        // Start drag for placement
        setIsDragging(true);
        setDragStart(cell);
        setDragEnd(cell);
      } else if (selectedTool === 'select') {
        // Select tile
        const tile = getTileAtCell(tileGrid, cell.cellX, cell.cellY);
        if (tile?.tileId) {
          const connected = findConnectedTiles(tileGrid, cell.cellX, cell.cellY, tile.tileId);
          setSelectedTileEntry({
            cellX: cell.cellX,
            cellY: cell.cellY,
            tileId: tile.tileId,
            passable: tile.passable,
          });
          setSelectedTileGroup(connected.length > 0 ? connected : null);
        } else {
          setSelectedTileEntry(null);
          setSelectedTileGroup(null);
        }
      } else if (selectedTool === 'delete') {
        const tile = getTileAtCell(tileGrid, cell.cellX, cell.cellY);
        if (tile?.tileId) {
          if (e.shiftKey) {
            // Shift + delete: remove entire group
            const connected = findConnectedTiles(tileGrid, cell.cellX, cell.cellY, tile.tileId);
            for (const connectedTile of connected) {
              removeTileAtCell(connectedTile.cellX, connectedTile.cellY);
            }
          } else {
            // Normal delete: remove only this tile (splits group if needed)
            removeTileAtCell(cell.cellX, cell.cellY);
          }
        }
      }
    }
  }, [
    currentLevel,
    gridSize,
    zoom,
    canvasSize,
    mapHeightCells,
    selectedTool,
    tileGrid,
    setSelectedTool,
    setSelectedTileEntry,
    setSelectedTileGroup,
    removeTileAtCell,
  ]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      // Middle mouse: stop panning
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (e.button === 0 && isDragging && selectedTool === 'platform' && dragStart && dragEnd) {
      // Complete tile placement
      const minCellX = Math.max(0, Math.min(dragStart.cellX, dragEnd.cellX));
      const maxCellX = Math.min(mapWidthCells - 1, Math.max(dragStart.cellX, dragEnd.cellX));
      const minCellY = Math.max(0, Math.min(dragStart.cellY, dragEnd.cellY));
      const maxCellY = Math.min(mapHeightCells - 1, Math.max(dragStart.cellY, dragEnd.cellY));

      const tile = selectedTile || DEFAULT_SOLID_BLOCK;

      // Check for overlaps before placing
      const overlappingGroups: Array<{ cellX: number; cellY: number; tileId: string }> = [];
      for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
          const existingTile = getTileAtCell(tileGrid, cellX, cellY);
          if (existingTile?.tileId && existingTile.layer === selectedLayer) {
            // Find connected group
            const connected = findConnectedTiles(tileGrid, cellX, cellY, existingTile.tileId);
            for (const connectedTile of connected) {
              if (!overlappingGroups.some(t => t.cellX === connectedTile.cellX && t.cellY === connectedTile.cellY)) {
                overlappingGroups.push(connectedTile);
              }
            }
          }
        }
      }

      // If there are overlaps, show confirmation (for now, just log)
      if (overlappingGroups.length > 0) {
        logger.info('Overlap detected', {
          component: 'LevelCanvas',
          operation: 'placeTiles',
          overlappingCount: overlappingGroups.length,
        });
        // TODO: Show confirmation dialog and highlight overlapping groups in red
        // For now, proceed with placement (will overwrite)
      }

      // Place tiles in range
      for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
        for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
          setTileAtCell(tile.id, cellX, cellY, !tile.properties?.isBumpable);
        }
      }

      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragging, selectedTool, dragStart, dragEnd, selectedTile, mapWidthCells, mapHeightCells, tileGrid, selectedLayer, setTileAtCell]);

  // Handle context menu (right click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Initialize scroll position (bottom-left)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !currentLevel || mapHeightPixels === 0) return;

    // Set initial scroll to bottom
    container.scrollTop = container.scrollHeight - container.clientHeight;
  }, [currentLevel?.id, mapHeightPixels]);

  // Update scroll content size when map size changes
  // This creates the scrollable area even though scrollbars are hidden
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !currentLevel) return;

    const size = getScrollContainerSize(mapWidthCells, mapHeightCells, gridSize, zoom);
    
    const contentDiv = container.querySelector('.scroll-content') as HTMLElement;
    if (contentDiv) {
      contentDiv.style.width = `${size.width}px`;
      contentDiv.style.height = `${size.height}px`;
    }
  }, [currentLevel, mapWidthCells, mapHeightCells, gridSize, zoom]);

  // Update canvas size to match scroll container
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateCanvasSize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      setCanvasSize({ width, height });

      // Update viewport state in store for preview indicator
      setViewportState({
        canvasWidth: width,
        canvasHeight: height,
      });

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [setViewportState]);

  // Recalculate scroll position after zoom to maintain cursor over same cell
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !currentLevel || !hoverCell) return;

    // This effect runs after zoom changes
    // We want to maintain the hover cell position
    // The scroll position will be adjusted automatically by the browser
    // We just need to trigger a render
    scheduleRender();
  }, [zoom, hoverCell, currentLevel, scheduleRender]);

  // Render on changes and initial mount
  useEffect(() => {
    scheduleRender();
    return () => {
      // Cleanup: cancel any pending animation frame
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [render, scheduleRender]);

  // Also trigger render when canvas size changes
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      scheduleRender();
    }
  }, [canvasSize, scheduleRender]);

  // Watch for target scroll position changes (from preview click)
  useEffect(() => {
    if (targetScrollPosition && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollLeft = targetScrollPosition.scrollLeft;
      container.scrollTop = targetScrollPosition.scrollTop;
      // Clear the target after applying it
      setTargetScrollPosition(null);
    }
  }, [targetScrollPosition, setTargetScrollPosition]);

  // Load background image when it changes
  useEffect(() => {
    if (currentLevel?.backgroundImage) {
      const img = new Image();
      img.onload = () => {
        setBackgroundImageElement(img);
        // State update will trigger re-render automatically
      };
      img.onerror = () => {
        logger.error('Failed to load background image', {
          component: 'LevelCanvas',
          operation: 'loadBackgroundImage',
        });
        setBackgroundImageElement(null);
      };
      img.src = currentLevel.backgroundImage;
    } else {
      setBackgroundImageElement(null);
    }
    // Only depend on backgroundImage URL, not render function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLevel?.backgroundImage]);

  if (!currentLevel) {
    return (
      <div className="level-canvas-empty">
        <p>No level loaded</p>
      </div>
    );
  }

  return (
    <div className="level-canvas-container">
      {/* Scroll container - functional but scrollbars hidden with CSS */}
      <div
        ref={scrollContainerRef}
        className="level-canvas-scroll"
        onScroll={handleScroll}
      >
        {/* Invisible content that defines scrollable area */}
        <div className="scroll-content" />
      </div>
      {/* Canvas layer - layered over scroll container */}
      <canvas
        ref={canvasRef}
        className="level-canvas"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
      {/* Navigation hint */}
      {currentLevel && (
        <div className="navigation-hint">
          Middle-click + drag to pan • Drag preview minimap to navigate
        </div>
      )}
    </div>
  );
}
