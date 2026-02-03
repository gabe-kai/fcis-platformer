import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { drawGrid } from '@/utils/grid';
import { logger } from '@/utils/logger';
import { cellToCanvas, canvasToCell, getVisibleCells } from '@/utils/cellCoordinates';
import { findConnectedTiles } from '@/utils/tileGroupingUtils';
import { getTileDefinition, DEFAULT_SOLID_BLOCK, TILE_TYPE_COLORS, tileRegistry, type TileDefinition } from '@/models/Tile';
import { clampZoom, getScrollContainerSize } from '@/utils/viewportUtils';
import { getTileAtCell, getGroupId } from '@/utils/tileMapUtils';
import { SYSTEM_FILL_PATTERNS, generateFillPattern } from '@/utils/fillPatternGenerator';
import { TileUploadModal } from './TileUploadModal';
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
  const [hoverCell, setHoverCellState] = useState<{ cellX: number; cellY: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [backgroundImageElement, setBackgroundImageElement] = useState<HTMLImageElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cellX: number; cellY: number } | null>(null);
  const [showTileUploadModal, setShowTileUploadModal] = useState(false);
  const [tileUploadTarget, setTileUploadTarget] = useState<{ cellX: number; cellY: number } | null>(null);
  
  // Path point dragging state
  const [draggingPathPoint, setDraggingPathPoint] = useState<{
    platformId: string;
    pointIndex: number;
    startX: number;
    startY: number;
  } | null>(null);
  
  // Animation state for moving platforms
  const [platformAnimationProgress, setPlatformAnimationProgress] = useState<Map<string, number>>(new Map());
  const animationRef = useRef<number | null>(null);
  
  // Texture cache for tile textures
  const textureCache = useRef<Map<string, HTMLImageElement>>(new Map());
  // Fill pattern cache
  const fillPatternCache = useRef<Map<string, HTMLImageElement>>(new Map());
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
    selectedTileGroups,
    selectedLayer,
    selectedPlatform,
    setSelectedPlatform,
    targetScrollPosition,
    setSelectedTool,
    setSelectedTileEntry,
    setSelectedTileGroup,
    setSelectedTileGroups,
    setZoom,
    setTileAtCell,
    removeTileAtCell,
    setViewportState,
    setTargetScrollPosition,
    setPendingTileGroupDelete,
    pendingPlaceOverwrite,
    setPendingPlaceOverwrite,
    selectedPattern,
    setSelectedPattern,
    placePatternAt,
    selectedFillPattern,
    setSelectedFillPattern,
    setSelectedTile,
    setFillPatternAtCell,
    setFillPatternOnGroup,
    setHoverCell,
    clipboardTiles,
    pasteClipboardAt,
    copySelectionToClipboard,
    cutSelectionToClipboard,
    setTileDisplayName,
    setGroupDisplayName,
    setPendingTextureAssignment,
    updatePlatformProperties,
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
    // The background should scale with zoom and stay aligned to the level's world coordinates.
    if (viewMode === 'texture' && backgroundImageElement) {
      const imgWidth = backgroundImageElement.width;
      const imgHeight = backgroundImageElement.height;
      
      if (imgWidth > 0 && imgHeight > 0 && mapWidthCells > 0 && mapHeightCells > 0) {
        const mapWidthPixels = mapWidthCells * cellSizePixels;
        const mapHeightPixels = mapHeightCells * cellSizePixels;

        // Compute scale so the image "covers" the entire level area in world space
        const scaleX = mapWidthPixels / imgWidth;
        const scaleY = mapHeightPixels / imgHeight;
        const scale = Math.max(scaleX, scaleY);

        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;

        // Anchor the image to the bottom-left of the level, then apply scroll
        const imgX = -currentScrollLeft;
        const imgY = mapHeightPixels - currentScrollTop - scaledHeight;

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
        const isInGroup = selectedTileGroups?.some((g) =>
          g.some((t) => t.cellX === cellX && t.cellY === cellY)
        ) ?? false;
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

        // Determine which fill pattern to use: explicit cell pattern, or default tile pattern
        const fillPatternId = cell.fillPatternId || tileDef.defaultFillPatternId;
        
        // Draw fill pattern as background layer (if present) - BEFORE texture
        // Fill patterns are drawn in both grid and texture modes
        if (fillPatternId) {
          const fillPattern = SYSTEM_FILL_PATTERNS.find(p => p.id === fillPatternId);
          if (fillPattern) {
            const cacheKey = `${fillPattern.type}-${cellSizePixels}`;
            let patternImg = fillPatternCache.current.get(cacheKey);
            
            if (!patternImg) {
              // Generate and cache pattern
              const patternColor = viewMode === 'grid' ? '#ffffff' : '#ffffff';
              const patternBg = viewMode === 'grid' ? '#1a1a2e' : 'transparent';
              const patternImageUrl = generateFillPattern(fillPattern.type, cellSizePixels, patternColor, patternBg);
              patternImg = new Image();
              patternImg.onload = () => {
                setTexturesLoaded((c) => c + 1); // Trigger re-render
              };
              patternImg.src = patternImageUrl;
              fillPatternCache.current.set(cacheKey, patternImg);
            }
            
            // Draw pattern if loaded
            if (patternImg.complete && patternImg.width > 0) {
              ctx.drawImage(
                patternImg,
                canvasPos.x,
                canvasPos.y - cellSizePixels,
                cellSizePixels,
                cellSizePixels
              );
            }
          }
        }

        // Grid mode: always solid-color blocks (for printing/coloring/re-upload). Texture mode: use texture when available.
        const textureUrl = tileDef.texture?.url;
        const cachedTexture = textureUrl ? textureCache.current.get(textureUrl) : null;
        const useTexture = viewMode === 'texture' && cachedTexture && cachedTexture.width > 0;

        if (useTexture) {
          // Draw texture on top of fill pattern
          ctx.drawImage(
            cachedTexture,
            canvasPos.x,
            canvasPos.y - cellSizePixels,
            cellSizePixels,
            cellSizePixels
          );

          // In texture mode, apply semi-transparent tint overlay to all tiles
          // Selected tiles get colored tint, others get semi-transparent tint
          const tileColor = TILE_TYPE_COLORS[tileDef.type] || '#3498db';
          ctx.save();
          if (isPrimarySelected) {
            // Primary selected: bright yellow highlight
            ctx.fillStyle = 'rgba(241, 196, 15, 0.35)';
          } else if (isInGroup) {
            // Group selected: blue highlight
            ctx.fillStyle = 'rgba(52, 152, 219, 0.35)';
          } else {
            // Default: semi-transparent tinted overlay
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = tileColor;
          }
          ctx.fillRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
          ctx.restore();
        } else {
          // Grid mode or when no texture is available: draw solid-color representation
          const tileColor = TILE_TYPE_COLORS[tileDef.type] || '#3498db';

          if (viewMode === 'texture') {
            // Texture mode but no texture image yet: behave similar to textured tiles
            ctx.save();
            if (isPrimarySelected) {
              ctx.fillStyle = 'rgba(241, 196, 15, 0.35)';
            } else if (isInGroup) {
              ctx.fillStyle = 'rgba(52, 152, 219, 0.35)';
            } else {
              ctx.globalAlpha = 0.4;
              ctx.fillStyle = tileColor;
            }
            ctx.fillRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
            ctx.restore();
          } else {
            // Grid mode: keep old solid coloring semantics
            let fillColor = cell.passable ? `${tileColor}80` : tileColor;
            if (isPrimarySelected) fillColor = '#f1c40f';
            else if (isInGroup) fillColor = 'rgba(52, 152, 219, 0.6)';

            ctx.fillStyle = fillColor;
            ctx.fillRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
          }

          if (viewMode === 'texture' && textureUrl && !textureCache.current.has(textureUrl)) {
            const img = new Image();
            img.onload = () => {
              textureCache.current.set(textureUrl, img);
              setTexturesLoaded((c) => c + 1);
            };
            img.onerror = () => {
              // Texture failed to load - fill pattern will show as fallback
              // Remove from cache so it won't be used
              textureCache.current.delete(textureUrl);
              setTexturesLoaded((c) => c + 1);
            };
            img.src = textureUrl;
            textureCache.current.set(textureUrl, img);
          }
        }

        // Draw selection indicator (primary = yellow border, group = blue border)
        if (isPrimarySelected) {
          // Primary selected: bright yellow border, more prominent
          ctx.strokeStyle = '#f1c40f';
          ctx.lineWidth = viewMode === 'texture' ? 5 : 4;
          ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
          // Add inner highlight for extra visibility in texture mode
          if (viewMode === 'texture') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(canvasPos.x + 2, canvasPos.y - cellSizePixels + 2, cellSizePixels - 4, cellSizePixels - 4);
          }
        } else if (isInGroup) {
          // Group selected: blue border, more prominent
          ctx.strokeStyle = '#3498db';
          ctx.lineWidth = viewMode === 'texture' ? 4 : 2;
          ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
          // Add inner highlight for extra visibility in texture mode
          if (viewMode === 'texture') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(canvasPos.x + 2, canvasPos.y - cellSizePixels + 2, cellSizePixels - 4, cellSizePixels - 4);
          }
        } else if (!useTexture) {
          // Border for solid-block tiles (grid mode or no texture)
          ctx.strokeStyle = '#2980b9';
          ctx.lineWidth = 2;
          ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
        }
      }
    }

    // Draw platforms and their movement paths
    if (currentLevel.platforms && currentLevel.platforms.length > 0) {
      for (const platform of currentLevel.platforms) {
        const isSelected = selectedPlatform?.id === platform.id;
        const isMoving = platform.type === 'moving' && platform.movementPath && platform.movementPath.length >= 2;
        
        // Calculate animated position for moving platforms
        let animatedX = platform.bounds.x;
        let animatedY = platform.bounds.y;
        
        if (isMoving && platform.movementPath) {
          const progress = platformAnimationProgress.get(platform.id) || 0;
          const path = platform.movementPath;
          const totalSegments = path.length - 1;
          
          if (totalSegments > 0) {
            // Calculate which segment we're on and progress within that segment
            const segmentProgress = progress * totalSegments;
            const currentSegment = Math.floor(segmentProgress);
            const segmentT = segmentProgress - currentSegment;
            
            // Clamp to valid segment range
            const safeSegment = Math.min(currentSegment, totalSegments - 1);
            const startPoint = path[safeSegment];
            const endPoint = path[safeSegment + 1] || path[safeSegment];
            
            // Interpolate position - path points are center positions
            const centerX = startPoint.x + (endPoint.x - startPoint.x) * segmentT;
            const centerY = startPoint.y + (endPoint.y - startPoint.y) * segmentT;
            
            // Convert center to bounds position
            animatedX = centerX - platform.bounds.width / 2;
            animatedY = centerY - platform.bounds.height / 2;
          }
        }
        
        // Draw platform at animated position
        const platformCanvasX = animatedX * zoom - currentScrollLeft;
        const platformCanvasY = (mapHeightPixels - animatedY * zoom - platform.bounds.height * zoom) - currentScrollTop;
        
        // Only draw if platform is visible
        if (platformCanvasX + platform.bounds.width * zoom >= 0 &&
            platformCanvasX <= canvasWidth &&
            platformCanvasY + platform.bounds.height * zoom >= 0 &&
            platformCanvasY <= canvasHeight) {
          
          ctx.save();
          
          // Draw platform rectangle
          ctx.fillStyle = isSelected ? 'rgba(241, 196, 15, 0.4)' : 'rgba(52, 152, 219, 0.3)';
          ctx.strokeStyle = isSelected ? '#f1c40f' : '#3498db';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.fillRect(platformCanvasX, platformCanvasY, platform.bounds.width * zoom, platform.bounds.height * zoom);
          ctx.strokeRect(platformCanvasX, platformCanvasY, platform.bounds.width * zoom, platform.bounds.height * zoom);
          
          // Draw "Moving" label on platform
          if (isMoving) {
            ctx.font = `${Math.max(10, 12 * zoom)}px sans-serif`;
            ctx.fillStyle = isSelected ? '#f1c40f' : '#27ae60';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const labelX = platformCanvasX + platform.bounds.width * zoom / 2;
            const labelY = platformCanvasY + platform.bounds.height * zoom / 2;
            ctx.fillText('MOVING', labelX, labelY);
          }
          
          ctx.restore();
        }
        
        // Draw movement path if it's a moving platform (always visible, not just when selected)
        if (isMoving && platform.movementPath) {
          ctx.save();
          
          // Draw path line
          ctx.strokeStyle = isSelected ? '#27ae60' : 'rgba(39, 174, 96, 0.6)';
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          
          for (let i = 0; i < platform.movementPath.length; i++) {
            const point = platform.movementPath[i];
            const pointCanvasX = point.x * zoom - currentScrollLeft;
            const pointCanvasY = (mapHeightPixels - point.y * zoom) - currentScrollTop;
            
            if (i === 0) {
              ctx.moveTo(pointCanvasX, pointCanvasY);
            } else {
              ctx.lineTo(pointCanvasX, pointCanvasY);
            }
          }
          
          // Close circular paths (more than 2 points)
          if (platform.movementPath.length > 2) {
            const first = platform.movementPath[0];
            const firstCanvasX = first.x * zoom - currentScrollLeft;
            const firstCanvasY = (mapHeightPixels - first.y * zoom) - currentScrollTop;
            ctx.lineTo(firstCanvasX, firstCanvasY);
          }
          
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw path points (larger, draggable)
          const pathPointRadius = isSelected ? 10 : 6;
          for (let i = 0; i < platform.movementPath.length; i++) {
            const point = platform.movementPath[i];
            const pointCanvasX = point.x * zoom - currentScrollLeft;
            const pointCanvasY = (mapHeightPixels - point.y * zoom) - currentScrollTop;
            
            if (pointCanvasX >= -20 && pointCanvasX <= canvasWidth + 20 &&
                pointCanvasY >= -20 && pointCanvasY <= canvasHeight + 20) {
              
              // Check if this point is being dragged
              const isDraggingThisPoint = draggingPathPoint?.platformId === platform.id && 
                                          draggingPathPoint?.pointIndex === i;
              
              // Draw outer ring for selected platform's points
              if (isSelected) {
                ctx.strokeStyle = isDraggingThisPoint ? '#f1c40f' : '#27ae60';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(pointCanvasX, pointCanvasY, pathPointRadius + 2, 0, Math.PI * 2);
                ctx.stroke();
              }
              
              // Draw filled circle
              ctx.fillStyle = isDraggingThisPoint ? '#f1c40f' : '#27ae60';
              ctx.beginPath();
              ctx.arc(pointCanvasX, pointCanvasY, pathPointRadius, 0, Math.PI * 2);
              ctx.fill();
              
              // Draw point number label for selected platforms
              if (isSelected) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${i + 1}`, pointCanvasX, pointCanvasY);
              }
            }
          }
          
          // Draw arrows on path to show direction
          if (platform.movementPath.length >= 2) {
            const p1 = platform.movementPath[0];
            const p2 = platform.movementPath[1];
            const midX = (p1.x + p2.x) / 2 * zoom - currentScrollLeft;
            const midY = (mapHeightPixels - (p1.y + p2.y) / 2 * zoom) - currentScrollTop;
            const angle = Math.atan2(-(p2.y - p1.y), p2.x - p1.x); // Negative Y because canvas Y is inverted
            
            ctx.save();
            ctx.translate(midX, midY);
            ctx.rotate(angle);
            ctx.fillStyle = isSelected ? '#27ae60' : 'rgba(39, 174, 96, 0.8)';
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(-4, -5);
            ctx.lineTo(-4, 5);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
          
          ctx.restore();
        }
      }
    }

    // Draw hover highlight (when hovering with place tool)
    if (!isDragging && hoverCell && selectedTool === 'platform') {
      const { cellX, cellY } = hoverCell;
      
      // If a fill pattern is selected, show preview on hovered tile/group
      if (selectedFillPattern && cellX >= 0 && cellX < mapWidthCells && cellY >= 0 && cellY < mapHeightCells) {
        const fillPattern = SYSTEM_FILL_PATTERNS.find(p => p.id === selectedFillPattern);
        if (fillPattern) {
          // Determine which tiles to preview on
          const tilesToPreview: Array<{ cellX: number; cellY: number }> = [];
          
          // If a tile group is selected, preview on all tiles in the group
          if (selectedTileGroup && selectedTileGroup.length > 0) {
            for (const tile of selectedTileGroup) {
              tilesToPreview.push({ cellX: tile.cellX, cellY: tile.cellY });
            }
          } else if (selectedTileGroups && selectedTileGroups.length > 0) {
            // Multi-group selection
            for (const group of selectedTileGroups) {
              for (const tile of group) {
                tilesToPreview.push({ cellX: tile.cellX, cellY: tile.cellY });
              }
            }
          } else {
            // Single tile at hover position
            const cell = getTileAtCell(tileGrid, cellX, cellY);
            if (cell?.tileId) {
              tilesToPreview.push({ cellX, cellY });
            }
          }
          
          // Draw fill pattern preview on each tile
          if (tilesToPreview.length > 0) {
            const cacheKey = `${fillPattern.type}-${cellSizePixels}`;
            let patternImg = fillPatternCache.current.get(cacheKey);
            
            if (!patternImg) {
              const patternImageUrl = generateFillPattern(fillPattern.type, cellSizePixels, '#ffffff', 'transparent');
              patternImg = new Image();
              patternImg.onload = () => {
                setTexturesLoaded((c) => c + 1);
              };
              patternImg.src = patternImageUrl;
              fillPatternCache.current.set(cacheKey, patternImg);
            }
            
            // Draw preview if loaded
            if (patternImg.complete && patternImg.width > 0) {
              for (const { cellX: tx, cellY: ty } of tilesToPreview) {
                const canvasPos = cellToCanvas(
                  tx,
                  ty,
                  gridSize,
                  zoom,
                  currentScrollLeft,
                  currentScrollTop,
                  canvasHeight,
                  mapHeightCells
                );
                ctx.globalAlpha = 0.6;
                ctx.drawImage(
                  patternImg,
                  canvasPos.x,
                  canvasPos.y - cellSizePixels,
                  cellSizePixels,
                  cellSizePixels
                );
                ctx.globalAlpha = 1.0;
              }
            }
          }
        }
      }
      
      // If a tile group pattern is selected, show the pattern preview
      if (selectedPattern && selectedPattern.cells.length > 0) {
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        
        // Draw each cell in the pattern
        for (const patternCell of selectedPattern.cells) {
          // Calculate absolute cell position (pattern origin is bottom-left at hover cell)
          const absCellX = cellX + patternCell.relX;
          const absCellY = cellY + patternCell.relY;
          
          // Skip if outside map bounds
          if (absCellX < 0 || absCellX >= mapWidthCells || absCellY < 0 || absCellY >= mapHeightCells) {
            continue;
          }
          
          const canvasPos = cellToCanvas(
            absCellX,
            absCellY,
            gridSize,
            zoom,
            currentScrollLeft,
            currentScrollTop,
            canvasHeight,
            mapHeightCells
          );
          
          // Get tile color based on tile type
          const tileDef = patternCell.tileId ? tileRegistry.get(patternCell.tileId) : null;
          const tileColor = tileDef 
            ? (TILE_TYPE_COLORS[tileDef.type] || '#3498db')
            : '#3498db';
          
          // Draw preview cell with semi-transparent fill
          ctx.fillStyle = patternCell.passable ? `${tileColor}40` : `${tileColor}60`;
          ctx.fillRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
          ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
        }
        
        ctx.setLineDash([]);
      } else if (cellX >= 0 && cellX < mapWidthCells && cellY >= 0 && cellY < mapHeightCells) {
        // Single tile preview (original behavior)
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

    // Draw clipboard ghost preview (when clipboard has items and hovering)
    if (clipboardTiles.length > 0 && hoverCell && !isDragging) {
      const { cellX: originX, cellY: originY } = hoverCell;
      
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#f1c40f';
      ctx.fillStyle = 'rgba(241, 196, 15, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      
      for (const clip of clipboardTiles) {
        const targetX = originX + clip.relX;
        const targetY = originY + clip.relY;
        
        // Skip if outside map bounds
        if (targetX < 0 || targetX >= mapWidthCells || targetY < 0 || targetY >= mapHeightCells) {
          continue;
        }
        
        const canvasPos = cellToCanvas(
          targetX,
          targetY,
          gridSize,
          zoom,
          currentScrollLeft,
          currentScrollTop,
          canvasHeight,
          mapHeightCells
        );
        
        // Get tile definition for color
        const tileDef = clip.tileId ? tileRegistry.get(clip.tileId) : null;
        const tileColor = tileDef 
          ? (TILE_TYPE_COLORS[tileDef.type] || '#f1c40f')
          : '#f1c40f';
        
        // Draw ghost preview
        ctx.fillStyle = clip.passable ? `${tileColor}30` : `${tileColor}40`;
        ctx.strokeStyle = tileColor;
        ctx.fillRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
        ctx.strokeRect(canvasPos.x, canvasPos.y - cellSizePixels, cellSizePixels, cellSizePixels);
      }
      
      ctx.setLineDash([]);
      ctx.restore();
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

    // Red highlight for overlapping tiles when place-overwrite confirmation is pending
    if (pendingPlaceOverwrite?.overlappingCells?.length) {
      ctx.fillStyle = 'rgba(231, 76, 60, 0.4)';
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (const { cellX, cellY } of pendingPlaceOverwrite.overlappingCells) {
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
    selectedTileGroups,
    selectedLayer,
    isDragging,
    dragStart,
    dragEnd,
    hoverCell,
    selectedPattern,
    selectedFillPattern,
    selectedTileGroup,
    selectedTileGroups,
    backgroundImageElement,
    cellSizePixels,
    texturesLoaded,
    pendingPlaceOverwrite,
    selectedPattern,
    selectedFillPattern,
    selectedTileGroup,
    selectedTileGroups,
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

    // Update hover cell (local state for rendering and global state for keyboard paste origin)
    setHoverCellState(cell);
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

    // Handle dragging path point
    if (draggingPathPoint && currentLevel) {
      const platform = currentLevel.platforms.find(p => p.id === draggingPathPoint.platformId);
      if (platform?.movementPath) {
        // Convert canvas coordinates to world coordinates
        const mapHeightPixels = mapHeightCells * gridSize * zoom;
        const worldX = (coords.x + container.scrollLeft) / zoom;
        const worldY = (mapHeightPixels - coords.y - container.scrollTop) / zoom;
        
        // Update the path point
        const newPath = [...platform.movementPath];
        newPath[draggingPathPoint.pointIndex] = { x: worldX, y: worldY };
        
        // Update the platform
        updatePlatformProperties(platform.id, { movementPath: newPath });
      }
      return;
    }

    // Handle dragging (left mouse)
    if (isDragging && dragStart) {
      // When painting with a fill pattern, treat drag as a brush: apply pattern to tiles as we move
      if (selectedTool === 'platform' && selectedFillPattern) {
        const tile = getTileAtCell(tileGrid, cell.cellX, cell.cellY);
        if (tile?.tileId) {
          setFillPatternAtCell(selectedFillPattern, cell.cellX, cell.cellY);
        }
      } else {
        // Default behavior: update drag end for rectangle placement
        setDragEnd(cell);
      }
    }
  }, [
    currentLevel,
    gridSize,
    zoom,
    canvasSize,
    mapHeightCells,
    isPanning,
    panStart,
    isDragging,
    dragStart,
    draggingPathPoint,
    scheduleRender,
    selectedTool,
    selectedFillPattern,
    tileGrid,
    setFillPatternAtCell,
    updatePlatformProperties,
  ]);

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

    // Right mouse: handled by onContextMenu handler
    if (e.button === 2) {
      return;
    }

    // Left mouse: check for path point clicks first (for any tool)
    if (e.button === 0) {
      // Check if clicking on a path point of a moving platform
      const mapHeightPixels = mapHeightCells * gridSize * zoom;
      for (const platform of currentLevel.platforms || []) {
        if (platform.type !== 'moving' || !platform.movementPath) continue;
        
        for (let i = 0; i < platform.movementPath.length; i++) {
          const point = platform.movementPath[i];
          const pointCanvasX = point.x * zoom - container.scrollLeft;
          const pointCanvasY = (mapHeightPixels - point.y * zoom) - container.scrollTop;
          
          const dx = coords.x - pointCanvasX;
          const dy = coords.y - pointCanvasY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Hit radius for path points (larger for easier dragging)
          const hitRadius = selectedPlatform?.id === platform.id ? 14 : 10;
          
          if (distance <= hitRadius) {
            // Start dragging this path point
            setDraggingPathPoint({
              platformId: platform.id,
              pointIndex: i,
              startX: coords.x,
              startY: coords.y,
            });
            
            // Also select this platform if not already selected
            if (selectedPlatform?.id !== platform.id) {
              setSelectedPlatform(platform);
              setSelectedTileEntry(null);
              setSelectedTileGroup(null);
              setSelectedTileGroups([]);
            }
            
            logger.info('Started dragging path point', {
              component: 'LevelCanvas',
              operation: 'dragPathPoint',
              platformId: platform.id,
              pointIndex: i,
            });
            return;
          }
        }
      }
    }

    // Left mouse: tool-specific actions
    if (e.button === 0) {
      // Read tool directly from store to avoid stale closure
      const currentTool = useEditorStore.getState().selectedTool;
      const currentFillPattern = useEditorStore.getState().selectedFillPattern;
      
      if (currentTool === 'platform' && currentFillPattern) {
        // Apply fill pattern to clicked tile or connected group
        const tile = getTileAtCell(tileGrid, cell.cellX, cell.cellY);
        if (tile?.tileId) {
          if (e.shiftKey) {
            // Shift + click: flood fill the entire connected group with this pattern
            const connected = findConnectedTiles(tileGrid, cell.cellX, cell.cellY, tile.tileId);
            const cells = connected.map((t) => ({ cellX: t.cellX, cellY: t.cellY }));
            setFillPatternOnGroup(currentFillPattern, cells);
          } else {
            // Start brush painting: apply immediately on mousedown and then on drag in handleMouseMove
            setFillPatternAtCell(currentFillPattern, cell.cellX, cell.cellY);
            setIsDragging(true);
            setDragStart(cell);
            setDragEnd(cell);
          }
        }
        return;
      } else if (currentTool === 'platform') {
        // Start drag for placement
        setIsDragging(true);
        setDragStart(cell);
        setDragEnd(cell);
      } else if (currentTool === 'select') {
        // Select tile (Ctrl/Cmd+click toggles multi-group selection)
        const tile = getTileAtCell(tileGrid, cell.cellX, cell.cellY);
        if (tile?.tileId) {
          const connected = findConnectedTiles(tileGrid, cell.cellX, cell.cellY, tile.tileId);
          const groupId = getGroupId(connected);
          const ctrl = e.ctrlKey || e.metaKey;
          if (ctrl) {
            const current = useEditorStore.getState().selectedTileGroups || [];
            const already = current.some((g) => getGroupId(g) === groupId);
            const next = already ? current.filter((g) => getGroupId(g) !== groupId) : [...current, connected];
            setSelectedTileGroups(next.length > 0 ? next : []);
            // Update singular selectedTileGroup to the primary (last clicked) group
            setSelectedTileGroup(next.length > 0 ? connected : null);
            if (next.length > 0) {
              setSelectedTileEntry({ cellX: cell.cellX, cellY: cell.cellY, tileId: tile.tileId, passable: tile.passable });
            } else {
              setSelectedTileEntry(null);
            }
          } else {
            setSelectedTileGroups(connected.length > 0 ? [connected] : []);
            setSelectedTileGroup(connected.length > 0 ? connected : null);
            setSelectedTileEntry({
              cellX: cell.cellX,
              cellY: cell.cellY,
              tileId: tile.tileId,
              passable: tile.passable,
            });
          }
          // Note: setSelectedTileEntry already clears selectedPlatform, no need to call setSelectedPlatform(null)
        } else {
          // No tile at click location - check for platforms
          // Convert cell to world coordinates (center of the clicked cell)
          const worldX = cell.cellX * gridSize + gridSize / 2;
          const worldY = cell.cellY * gridSize + gridSize / 2;
          
          // Check if click is inside any platform's bounds
          const platforms = currentLevel.platforms || [];
          const clickedPlatform = platforms.find((p) => 
            worldX >= p.bounds.x && 
            worldX <= p.bounds.x + p.bounds.width &&
            worldY >= p.bounds.y && 
            worldY <= p.bounds.y + p.bounds.height
          );
          
          if (clickedPlatform) {
            setSelectedPlatform(clickedPlatform);
            setSelectedTileEntry(null);
            setSelectedTileGroup(null);
            setSelectedTileGroups([]);
          } else {
            setSelectedTileEntry(null);
            setSelectedTileGroup(null);
            setSelectedTileGroups([]);
            setSelectedPlatform(null);
          }
        }
      } else if (currentTool === 'delete') {
        const tile = getTileAtCell(tileGrid, cell.cellX, cell.cellY);
        if (tile?.tileId) {
          if (e.shiftKey) {
            // Shift + delete: remove entire group (confirmation if group has >1 tile)
            const connected = findConnectedTiles(tileGrid, cell.cellX, cell.cellY, tile.tileId);
            if (connected.length > 1) {
              setPendingTileGroupDelete(connected);
            } else {
              removeTileAtCell(cell.cellX, cell.cellY);
            }
          } else {
            // Normal delete: remove only this tile (splits group if needed); no confirmation
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
    selectedFillPattern,
    selectedPlatform,
    tileGrid,
    setSelectedTool,
    setSelectedTileEntry,
    setSelectedTileGroup,
    setSelectedTileGroups,
    setSelectedPlatform,
    removeTileAtCell,
    setPendingTileGroupDelete,
    selectedTileGroup,
    selectedTileGroups,
    setFillPatternAtCell,
    setFillPatternOnGroup,
  ]);

  // Handle mouse up
  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1) {
      // Middle mouse: stop panning
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    // End path point dragging
    if (e.button === 0 && draggingPathPoint) {
      logger.info('Finished dragging path point', {
        component: 'LevelCanvas',
        operation: 'dragPathPointEnd',
        platformId: draggingPathPoint.platformId,
        pointIndex: draggingPathPoint.pointIndex,
      });
      setDraggingPathPoint(null);
      return;
    }

    // When painting with fill patterns, mouse up simply ends the brush drag
    if (e.button === 0 && isDragging && selectedTool === 'platform' && selectedFillPattern) {
      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
      return;
    }

    if (e.button === 0 && isDragging && selectedTool === 'platform' && dragStart && dragEnd) {
      const minCellX = Math.max(0, Math.min(dragStart.cellX, dragEnd.cellX));
      const maxCellX = Math.min(mapWidthCells - 1, Math.max(dragStart.cellX, dragEnd.cellX));
      const minCellY = Math.max(0, Math.min(dragStart.cellY, dragEnd.cellY));
      const maxCellY = Math.min(mapHeightCells - 1, Math.max(dragStart.cellY, dragEnd.cellY));

      if (selectedPattern) {
        // Place pattern with bottom-left at (minCellX, minCellY)
        const originX = minCellX;
        const originY = minCellY;
        const overlappingGroups: Array<{ cellX: number; cellY: number; tileId: string }> = [];
        for (const cell of selectedPattern.cells) {
          const ax = originX + cell.relX;
          const ay = originY + cell.relY;
          const existingTile = getTileAtCell(tileGrid, ax, ay);
          if (existingTile?.tileId && existingTile.layer === cell.layer) {
            const connected = findConnectedTiles(tileGrid, ax, ay, existingTile.tileId);
            for (const t of connected) {
              if (!overlappingGroups.some((o) => o.cellX === t.cellX && o.cellY === t.cellY)) {
                overlappingGroups.push(t);
              }
            }
          }
        }
        if (overlappingGroups.length > 0) {
          const minOx = Math.min(...selectedPattern.cells.map((c) => originX + c.relX));
          const maxOx = Math.max(...selectedPattern.cells.map((c) => originX + c.relX));
          const minOy = Math.min(...selectedPattern.cells.map((c) => originY + c.relY));
          const maxOy = Math.max(...selectedPattern.cells.map((c) => originY + c.relY));
          setPendingPlaceOverwrite({
            minCellX: minOx,
            maxCellX: maxOx,
            minCellY: minOy,
            maxCellY: maxOy,
            tileId: selectedPattern.cells[0]?.tileId ?? 'solid',
            passable: selectedPattern.cells[0]?.passable ?? false,
            overlappingCells: overlappingGroups.map((t) => ({ cellX: t.cellX, cellY: t.cellY })),
            pattern: selectedPattern,
            patternOriginX: originX,
            patternOriginY: originY,
          });
        } else {
          placePatternAt(originX, originY, selectedPattern);
        }
      } else {
        // Single-tile or rect fill
        const tile = selectedTile || DEFAULT_SOLID_BLOCK;
        const overlappingGroups: Array<{ cellX: number; cellY: number; tileId: string }> = [];
        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
          for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
            const existingTile = getTileAtCell(tileGrid, cellX, cellY);
            if (existingTile?.tileId && existingTile.layer === selectedLayer) {
              const connected = findConnectedTiles(tileGrid, cellX, cellY, existingTile.tileId);
              for (const connectedTile of connected) {
                if (!overlappingGroups.some(t => t.cellX === connectedTile.cellX && t.cellY === connectedTile.cellY)) {
                  overlappingGroups.push(connectedTile);
                }
              }
            }
          }
        }
        if (overlappingGroups.length > 0) {
          logger.info('Overlap detected', {
            component: 'LevelCanvas',
            operation: 'placeTiles',
            overlappingCount: overlappingGroups.length,
          });
          setPendingPlaceOverwrite({
            minCellX,
            maxCellX,
            minCellY,
            maxCellY,
            tileId: tile.id,
            passable: !tile.properties?.isBumpable,
            overlappingCells: overlappingGroups.map((t) => ({ cellX: t.cellX, cellY: t.cellY })),
          });
          setIsDragging(false);
          setDragStart(null);
          setDragEnd(null);
          return;
        }
        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
          for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
            setTileAtCell(tile.id, cellX, cellY, !tile.properties?.isBumpable);
          }
        }
      }

      setIsDragging(false);
      setDragStart(null);
      setDragEnd(null);
    }
  }, [isDragging, draggingPathPoint, selectedTool, dragStart, dragEnd, selectedTile, selectedPattern, mapWidthCells, mapHeightCells, tileGrid, selectedLayer, setTileAtCell, setPendingPlaceOverwrite, placePatternAt]);

  // Handle context menu (right click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    
    // If a non-select tool is active, or a tile/pattern/fillPattern is selected, dismiss it first
    const hasActiveToolOrSelection = selectedTool !== 'select' || 
      selectedTile !== null || 
      selectedPattern !== null || 
      selectedFillPattern !== null;
    
    if (hasActiveToolOrSelection) {
      // Dismiss the current tool/selection and switch to select
      setSelectedTool('select');
      setSelectedTile(null);
      setSelectedPattern(null);
      setSelectedFillPattern(null);
      // Don't show context menu yet - just dismiss
      return;
    }
    
    const coords = getCanvasCoordinates(e);
    const container = scrollContainerRef.current;
    if (!container || !currentLevel) return;
    
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
    
    setContextMenu({ x: coords.x, y: coords.y, cellX: cell.cellX, cellY: cell.cellY });
  }, [gridSize, zoom, canvasSize, mapHeightCells, currentLevel, selectedTool, selectedTile, selectedPattern, selectedFillPattern, setSelectedTool, setSelectedTile, setSelectedPattern, setSelectedFillPattern]);

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

  // Animation loop for moving platforms
  useEffect(() => {
    if (!currentLevel?.platforms) return;
    
    // Check if there are any moving platforms
    const movingPlatforms = currentLevel.platforms.filter(
      p => p.type === 'moving' && p.movementPath && p.movementPath.length >= 2
    );
    
    if (movingPlatforms.length === 0) {
      // Clear animation state when no moving platforms
      if (platformAnimationProgress.size > 0) {
        setPlatformAnimationProgress(new Map());
      }
      return;
    }
    
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;
      
      setPlatformAnimationProgress(prev => {
        const next = new Map(prev);
        let changed = false;
        
        for (const platform of movingPlatforms) {
          if (!platform.movementPath || platform.movementPath.length < 2) continue;
          
          const currentProgress = prev.get(platform.id) || 0;
          const speed = platform.movementSpeed || 100;
          
          // Calculate total path length
          let totalLength = 0;
          for (let i = 0; i < platform.movementPath.length - 1; i++) {
            const p1 = platform.movementPath[i];
            const p2 = platform.movementPath[i + 1];
            totalLength += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
          }
          
          if (totalLength === 0) continue;
          
          // Progress increment based on speed and path length
          const progressIncrement = (speed * deltaTime) / totalLength;
          let newProgress = currentProgress + progressIncrement;
          
          // Ping-pong animation (0 to 1 to 0)
          if (newProgress >= 1) {
            newProgress = newProgress % 2;
            if (newProgress > 1) {
              newProgress = 2 - newProgress;
            }
          }
          
          if (Math.abs(newProgress - currentProgress) > 0.0001) {
            next.set(platform.id, newProgress);
            changed = true;
          }
        }
        
        return changed ? next : prev;
      });
      
      scheduleRender();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [currentLevel?.platforms, scheduleRender]);

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

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    
    const handleClick = (e: MouseEvent) => {
      // Don't close if clicking inside the context menu
      const target = e.target as HTMLElement;
      if (target.closest('.canvas-context-menu')) {
        return;
      }
      setContextMenu(null);
    };
    
    const handleContextMenu = (e: MouseEvent) => {
      // Don't close if right-clicking inside the context menu
      const target = e.target as HTMLElement;
      if (target.closest('.canvas-context-menu')) {
        return;
      }
      e.preventDefault();
      setContextMenu(null);
    };
    
    // Use capture phase to catch clicks before they bubble
    window.addEventListener('click', handleClick, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    
    return () => {
      window.removeEventListener('click', handleClick, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [contextMenu]);

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
      {/* Context menu */}
      {contextMenu && (() => {
        const clickedTile = getTileAtCell(tileGrid, contextMenu.cellX, contextMenu.cellY);
        const clickedTileGroup = clickedTile?.tileId 
          ? findConnectedTiles(tileGrid, contextMenu.cellX, contextMenu.cellY, clickedTile.tileId)
          : null;
        const isGroup = clickedTileGroup && clickedTileGroup.length > 1;
        const hasSelection = selectedTileGroups && selectedTileGroups.length > 0;
        const hasSelectedTile = selectedTileEntry?.tileId && 
          selectedTileEntry.cellX === contextMenu.cellX && 
          selectedTileEntry.cellY === contextMenu.cellY;
        const hasClipboard = clipboardTiles.length > 0;
        const hasTile = clickedTile?.tileId;
        // Show copy/cut if there's a selection OR if clicking on a tile (can copy/cut that tile)
        const canCopyCut = hasSelection || hasTile;

        // Estimate menu dimensions based on visible items
        const menuWidth = 200; // Fixed width from CSS
        // Estimate height: ~40px per button + separators
        let itemCount = 0;
        if (canCopyCut) itemCount += 2; // Copy, Cut
        if (hasClipboard) itemCount += 1; // Paste
        if (hasSelection) itemCount += 1; // Delete
        if (hasTile || canCopyCut) itemCount += 1; // Separator before tile actions
        if (hasTile) itemCount += 1; // Name Tile
        if (isGroup) itemCount += 1; // Name Tile Group
        if (hasTile) itemCount += 3; // Change Layer, Select Texture, Upload Texture
        const menuHeight = Math.max(100, itemCount * 40 + 8); // ~40px per item + padding
        
        // Calculate available space in each direction
        const spaceBelow = canvasSize.height - contextMenu.y;
        const spaceAbove = contextMenu.y;
        const spaceRight = canvasSize.width - contextMenu.x;
        const spaceLeft = contextMenu.x;
        
        // Determine vertical position (prefer below, but use above if not enough space)
        const menuTop = spaceBelow >= menuHeight || (spaceBelow >= 100 && spaceBelow >= spaceAbove)
          ? contextMenu.y
          : Math.max(0, contextMenu.y - menuHeight);
        
        // Determine horizontal position (prefer right, but use left if not enough space)
        const menuLeft = spaceRight >= menuWidth || (spaceRight >= 100 && spaceRight >= spaceLeft)
          ? contextMenu.x
          : Math.max(0, contextMenu.x - menuWidth);
        
        // Clamp to canvas bounds
        const finalLeft = Math.max(0, Math.min(menuLeft, canvasSize.width - menuWidth));
        const finalTop = Math.max(0, Math.min(menuTop, canvasSize.height - menuHeight));

        return (
          <div
            className="canvas-context-menu"
            style={{
              position: 'absolute',
              left: `${finalLeft}px`,
              top: `${finalTop}px`,
              zIndex: 1000,
            }}
          >
            {canCopyCut && (
              <>
                <button
                  onClick={() => {
                    // If clicking on a tile that's not selected, select it first then copy
                    if (hasTile && !hasSelectedTile && !hasSelection) {
                      if (isGroup && clickedTileGroup) {
                        // Select the entire group and copy
                        setSelectedTileGroups([clickedTileGroup]);
                        setSelectedTileGroup(clickedTileGroup);
                        setSelectedTileEntry({
                          cellX: contextMenu.cellX,
                          cellY: contextMenu.cellY,
                          tileId: clickedTile.tileId,
                          passable: clickedTile.passable,
                        });
                        // Use setTimeout to ensure state is updated before copy
                        setTimeout(() => copySelectionToClipboard(), 0);
                      } else {
                        // Select just this tile and copy
                        const singleTileGroup = [{
                          cellX: contextMenu.cellX,
                          cellY: contextMenu.cellY,
                          tileId: clickedTile.tileId!,
                          passable: clickedTile.passable,
                        }];
                        setSelectedTileGroups([singleTileGroup]);
                        setSelectedTileGroup(singleTileGroup);
                        setSelectedTileEntry({
                          cellX: contextMenu.cellX,
                          cellY: contextMenu.cellY,
                          tileId: clickedTile.tileId,
                          passable: clickedTile.passable,
                        });
                        setTimeout(() => copySelectionToClipboard(), 0);
                      }
                    } else {
                      copySelectionToClipboard();
                    }
                    setContextMenu(null);
                  }}
                >
                  Copy {hasSelection ? 'Selection' : isGroup ? 'Group' : hasTile ? 'Tile' : ''}
                </button>
                <button
                  onClick={() => {
                    // If clicking on a tile that's not selected, select it first then cut
                    if (hasTile && !hasSelectedTile && !hasSelection) {
                      if (isGroup && clickedTileGroup) {
                        // Select the entire group and cut
                        setSelectedTileGroups([clickedTileGroup]);
                        setSelectedTileGroup(clickedTileGroup);
                        setSelectedTileEntry({
                          cellX: contextMenu.cellX,
                          cellY: contextMenu.cellY,
                          tileId: clickedTile.tileId,
                          passable: clickedTile.passable,
                        });
                        setTimeout(() => cutSelectionToClipboard(), 0);
                      } else {
                        // Select just this tile and cut
                        const singleTileGroup = [{
                          cellX: contextMenu.cellX,
                          cellY: contextMenu.cellY,
                          tileId: clickedTile.tileId!,
                          passable: clickedTile.passable,
                        }];
                        setSelectedTileGroups([singleTileGroup]);
                        setSelectedTileGroup(singleTileGroup);
                        setSelectedTileEntry({
                          cellX: contextMenu.cellX,
                          cellY: contextMenu.cellY,
                          tileId: clickedTile.tileId,
                          passable: clickedTile.passable,
                        });
                        setTimeout(() => cutSelectionToClipboard(), 0);
                      }
                    } else {
                      cutSelectionToClipboard();
                    }
                    setContextMenu(null);
                  }}
                >
                  Cut {hasSelection ? 'Selection' : isGroup ? 'Group' : hasTile ? 'Tile' : ''}
                </button>
              </>
            )}
            {hasClipboard && (
              <button
                onClick={() => {
                  pasteClipboardAt(contextMenu.cellX, contextMenu.cellY);
                  setContextMenu(null);
                }}
              >
                Paste
              </button>
            )}
            {(hasSelection || hasTile) && (
              <button
                onClick={() => {
                  if (hasSelection) {
                    // Delete the entire selection
                    const allCells = selectedTileGroups.flatMap((g) => g);
                    for (const t of allCells) {
                      removeTileAtCell(t.cellX, t.cellY);
                    }
                    setSelectedTileEntry(null);
                    setSelectedTileGroup(null);
                    setSelectedTileGroups([]);
                  } else if (hasTile && clickedTileGroup) {
                    // Delete the clicked tile group
                    for (const t of clickedTileGroup) {
                      removeTileAtCell(t.cellX, t.cellY);
                    }
                  } else if (hasTile) {
                    // Delete just the clicked tile
                    removeTileAtCell(contextMenu.cellX, contextMenu.cellY);
                  }
                  setContextMenu(null);
                }}
              >
                Delete {hasSelection ? 'Selection' : isGroup ? 'Group' : 'Tile'}
              </button>
            )}
            {(hasSelection || hasTile) && (
              <>
                {hasSelection && (
                  <div className="context-menu-separator" />
                )}
                {hasTile && (
                  <button
                    onClick={() => {
                      const currentName = clickedTile?.displayName || '';
                      const name = window.prompt('Tile name (leave empty to remove)', currentName)?.trim();
                      if (name !== null) {
                        setTileDisplayName(contextMenu.cellX, contextMenu.cellY, name || undefined);
                      }
                      setContextMenu(null);
                    }}
                  >
                    Name Tile
                  </button>
                )}
                {isGroup && clickedTileGroup && (
                  <button
                    onClick={() => {
                      const groupId = getGroupId(clickedTileGroup);
                      const currentName = currentLevel?.groupDisplayNames?.[groupId] || '';
                      const name = window.prompt('Tile group name (leave empty to remove)', currentName)?.trim();
                      if (name !== null) {
                        setGroupDisplayName(groupId, name || undefined);
                      }
                      setContextMenu(null);
                    }}
                  >
                    Name Tile Group
                  </button>
                )}
                {hasTile && (
                  <>
                    <div className="context-menu-separator" />
                    <button
                      onClick={() => {
                        const currentLayer = clickedTile?.layer || selectedLayer;
                        const layers: Array<'background' | 'primary' | 'foreground'> = ['background', 'primary', 'foreground'];
                        const currentIndex = layers.indexOf(currentLayer);
                        const nextLayer = layers[(currentIndex + 1) % layers.length];
                        setTileAtCell(clickedTile.tileId!, contextMenu.cellX, contextMenu.cellY, clickedTile.passable, nextLayer);
                        logger.info('Layer changed via context menu', {
                          component: 'LevelCanvas',
                          operation: 'changeLayer',
                          cellX: contextMenu.cellX,
                          cellY: contextMenu.cellY,
                          fromLayer: currentLayer,
                          toLayer: nextLayer,
                        });
                        setContextMenu(null);
                      }}
                    >
                      Change Layer ({clickedTile?.layer || selectedLayer})
                    </button>
                    <button
                      onClick={() => {
                        setPendingTextureAssignment({ cellX: contextMenu.cellX, cellY: contextMenu.cellY });
                        logger.info('Select texture from library requested', {
                          component: 'LevelCanvas',
                          operation: 'contextMenuSelectTexture',
                          cellX: contextMenu.cellX,
                          cellY: contextMenu.cellY,
                        });
                        setContextMenu(null);
                        // User can now click any tile in the library to assign it to this cell
                      }}
                    >
                      Select Texture From Library
                    </button>
                    <button
                      onClick={() => {
                        setTileUploadTarget({ cellX: contextMenu.cellX, cellY: contextMenu.cellY });
                        setShowTileUploadModal(true);
                        setContextMenu(null);
                      }}
                    >
                      Upload Texture for Tile
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        );
      })()}
      {/* Tile upload modal */}
      {showTileUploadModal && tileUploadTarget && (
        <TileUploadModal
          isOpen={showTileUploadModal}
          onClose={() => {
            setShowTileUploadModal(false);
            setTileUploadTarget(null);
          }}
          onTileCreated={(tile: TileDefinition) => {
            setTileAtCell(tile.id, tileUploadTarget.cellX, tileUploadTarget.cellY);
            setShowTileUploadModal(false);
            setTileUploadTarget(null);
            window.dispatchEvent(new CustomEvent('userTilesChanged'));
            logger.info('Tile texture uploaded from context menu', {
              component: 'LevelCanvas',
              operation: 'uploadTextureFromContextMenu',
              cellX: tileUploadTarget.cellX,
              cellY: tileUploadTarget.cellY,
              tileId: tile.id,
            });
          }}
        />
      )}
    </div>
  );
}
