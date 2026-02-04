import { create } from 'zustand';
import type { Level, UpdateLevelData } from '@/models/Level';
import { createEmptyTileGrid } from '@/models/Level';
import type { Platform } from '@/models/Platform';
// Note: Point type removed - no longer using viewport state
import { logger } from '@/utils/logger';
import { wouldOverlap } from '@/utils/platformUtils';
import { updateLevel as updateLevelModel } from '@/models/Level';
import { setTileAtCell, removeTileAtCell, removeTilesInRange, resizeTileGrid, updateCellDisplayName, setFillPatternAtCell } from '@/utils/tileMapUtils';
import { validateLevel, type LevelValidationWarnings } from '@/utils/levelValidation';

import type { TileDefinition } from '@/models/Tile';
import { getTileDefinition } from '@/models/Tile';
import type { TilePattern } from '@/types';

/** Returns platforms that still have at least one tile within their bounds (used after tile removal). */
function filterPlatformsWithTiles(
  tileGrid: Level['tileGrid'],
  platforms: Platform[],
  gridSize: number
): Platform[] {
  const grid = tileGrid || [];
  return platforms.filter((platform) => {
    const minCellX = Math.floor(platform.bounds.x / gridSize);
    const maxCellX = Math.floor((platform.bounds.x + platform.bounds.width - 1) / gridSize);
    const minCellY = Math.floor(platform.bounds.y / gridSize);
    const maxCellY = Math.floor((platform.bounds.y + platform.bounds.height - 1) / gridSize);
    for (let cellY = minCellY; cellY <= maxCellY; cellY++) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
        const row = grid[cellY];
        if (row) {
          const cell = row[cellX];
          if (cell && cell.tileId) return true;
        }
      }
    }
    return false;
  });
}

interface EditorState {
  currentLevel: Level | null;
  selectedTool: 'select' | 'platform' | 'delete';
  selectedPlatform: Platform | null;
  selectedTile: TileDefinition | null;
  selectedTileEntry: { cellX: number; cellY: number; tileId?: string; passable: boolean } | null;
  selectedTileGroup: Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }> | null;
  /** All selected groups (multi-select via Ctrl/Cmd+click). selectedTileGroup is the primary (last clicked). */
  selectedTileGroups: Array<Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }>>;
  gridEnabled: boolean;
  /** 'grid' = solid-color blocks for printing/coloring; 'texture' = full tiles as in game */
  viewMode: 'grid' | 'texture';
  gridSize: number; // This should match currentLevel.gridSize, but kept for backward compatibility
  zoom: number;
  selectedLayer: 'background' | 'primary' | 'foreground';
  // Viewport state for preview indicator
  viewportState: {
    scrollLeft: number;
    scrollTop: number;
    canvasWidth: number;
    canvasHeight: number;
  };
  // Target scroll position (set by preview click, read by canvas)
  targetScrollPosition: { scrollLeft: number; scrollTop: number } | null;
  /** When set, background placement modal is shown (PropertiesPanel upload or Library "Use as background") */
  pendingBackgroundImageDataUrl: string | null;
  /** When set, in-editor "delete tile group" confirmation modal is shown */
  pendingTileGroupDelete: Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }> | null;
  /** When set, next tile selection from library assigns to this cell (texture assignment flow) */
  pendingTextureAssignment: { cellX: number; cellY: number } | null;
  /** When set, in-editor "place over existing tiles" confirmation modal is shown (red highlight + confirm) */
  pendingPlaceOverwrite: {
    minCellX: number;
    maxCellX: number;
    minCellY: number;
    maxCellY: number;
    tileId: string;
    passable: boolean;
    overlappingCells: Array<{ cellX: number; cellY: number }>;
    /** When set, confirm places this pattern at origin instead of rect fill */
    pattern?: TilePattern;
    patternOriginX?: number;
    patternOriginY?: number;
  } | null;
  /** Selected pattern for placement (from Library). When set, Place tool places this pattern. */
  selectedPattern: TilePattern | null;
  /** Selected fill pattern (from Tile Patterns). When set, can be applied to tiles as background layer. */
  selectedFillPattern: string | null; // Fill pattern ID
  /** Level validation warnings (non-blocking) - computed when level changes */
  levelValidationWarnings: LevelValidationWarnings;
  /** Undo stack: level snapshots before each mutation (max length maxUndoSteps) */
  undoStack: Level[];
  /** Redo stack: level snapshots after undo, for redo */
  redoStack: Level[];
  /** Max number of undo steps (default 16). */
  maxUndoSteps: number;
  /** Clipboard of copied tiles (relative coordinates) for copy/paste operations */
  clipboardTiles: Array<{ relX: number; relY: number; tileId: string; passable: boolean; layer: 'background' | 'primary' | 'foreground' }>;
  /** Last hovered cell in the canvas (for paste origin, previews, etc.) */
  hoverCell: { cellX: number; cellY: number } | null;
  // Actions
  setCurrentLevel: (level: Level | null) => void;
  setSelectedTool: (tool: 'select' | 'platform' | 'delete') => void;
  setSelectedPlatform: (platform: Platform | null) => void;
  setSelectedTile: (tile: TileDefinition | null) => void;
  setSelectedTileEntry: (tileEntry: { cellX: number; cellY: number; tileId?: string; passable: boolean } | null) => void;
  setSelectedTileGroup: (tileGroup: Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }> | null) => void;
  /** Set all selected groups (for multi-select). Use [] to clear. */
  setSelectedTileGroups: (groups: Array<Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }>>) => void;
  toggleGrid: () => void;
  setViewMode: (mode: 'grid' | 'texture') => void;
  setGridSize: (size: number) => void;
  setZoom: (zoom: number) => void;
  setSelectedLayer: (layer: 'background' | 'primary' | 'foreground') => void;
  setViewportState: (state: Partial<EditorState['viewportState']>) => void;
  setTargetScrollPosition: (position: { scrollLeft: number; scrollTop: number } | null) => void;
  setPendingBackgroundImageDataUrl: (url: string | null) => void;
  setPendingTileGroupDelete: (group: Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }> | null) => void;
  setPendingTextureAssignment: (target: { cellX: number; cellY: number } | null) => void;
  setPendingPlaceOverwrite: (payload: EditorState['pendingPlaceOverwrite']) => void;
  setHoverCell: (cell: { cellX: number; cellY: number } | null) => void;
  // Platform management actions (legacy - for backward compatibility)
  placePlatform: (platform: Platform) => void;
  deletePlatform: (platformId: string) => void;
  updatePlatformProperties: (platformId: string, updates: Partial<Platform>) => void;
  cleanupOrphanedPlatforms: () => number; // Returns count of removed platforms
  // Tile map management actions
  setTileAtCell: (tileId: string, cellX: number, cellY: number, passable?: boolean, layer?: 'background' | 'primary' | 'foreground') => void;
  removeTileAtCell: (cellX: number, cellY: number) => void;
  placePatternAt: (originCellX: number, originCellY: number, pattern: TilePattern) => void;
  setSelectedPattern: (pattern: TilePattern | null) => void;
  setSelectedFillPattern: (fillPatternId: string | null) => void;
  setFillPatternAtCell: (fillPatternId: string | null, cellX: number, cellY: number) => void;
  setFillPatternOnGroup: (fillPatternId: string | null, group: Array<{ cellX: number; cellY: number }>) => void;
  removeTilesInRange: (minCellX: number, minCellY: number, maxCellX: number, maxCellY: number) => void;
  setTileDisplayName: (cellX: number, cellY: number, displayName: string | undefined) => void;
  setGroupDisplayName: (groupId: string, displayName: string | undefined) => void;
  copySelectionToClipboard: () => void;
  cutSelectionToClipboard: () => void;
  pasteClipboardAt: (originCellX: number, originCellY: number) => void;
  // Level management actions
  updateLevelDimensions: (widthTiles: number, heightTiles: number) => void;
  updateLevel: (updates: UpdateLevelData) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentLevel: null,
  selectedTool: 'select',
  selectedPlatform: null,
  selectedTile: null,
  selectedTileEntry: null,
  selectedTileGroup: null,
  selectedTileGroups: [],
  gridEnabled: true,
  viewMode: 'texture',
  gridSize: 64,
  zoom: 1,
  selectedLayer: 'primary',
  viewportState: {
    scrollLeft: 0,
    scrollTop: 0,
    canvasWidth: 0,
    canvasHeight: 0,
  },
  targetScrollPosition: null,
  pendingBackgroundImageDataUrl: null,
  pendingTileGroupDelete: null,
  pendingTextureAssignment: null,
  pendingPlaceOverwrite: null,
  levelValidationWarnings: { missingSpawn: false, missingWin: false },
  undoStack: [],
  redoStack: [],
  maxUndoSteps: 16,
  selectedPattern: null,
  selectedFillPattern: null,
  clipboardTiles: [],
  hoverCell: null,

  setCurrentLevel: (level) => {
    logger.debug('Setting current level', {
      component: 'EditorStore',
      operation: 'setCurrentLevel',
      levelId: level?.id,
    });
    if (!level) {
      set({ 
        currentLevel: null, 
        selectedPlatform: null, 
        pendingTileGroupDelete: null, 
        pendingPlaceOverwrite: null,
        levelValidationWarnings: { missingSpawn: true, missingWin: true },
        undoStack: [],
        redoStack: [],
        selectedPattern: null,
        selectedFillPattern: null,
        selectedTileGroups: [],
        pendingTextureAssignment: null,
      });
      return;
    }

    const gridSize = level.gridSize || 64;
    // Width and height are now in cells
    // Use tileGrid dimensions if available, otherwise use width/height directly
    let widthCells = level.tileGrid?.[0]?.length || 0;
    let heightCells = level.tileGrid?.length || 0;
    
    // If tileGrid is empty or missing, use width/height (which are in cells)
    if (widthCells === 0 || heightCells === 0) {
      widthCells = Math.max(1, level.width);
      heightCells = Math.max(1, level.height);
    }

    // Ensure tileGrid matches level dimensions
    let tileGrid = level.tileGrid?.length
      ? resizeTileGrid(level.tileGrid, widthCells, heightCells)
      : createEmptyTileGrid(widthCells, heightCells);
    
    // Update level width/height to match tileGrid (in cells)
    const updatedWidth = tileGrid[0]?.length || widthCells;
    const updatedHeight = tileGrid.length || heightCells;

    // Migrate legacy tileMap to tileGrid if needed
    const legacyTileMap = (level as unknown as { tileMap?: Array<{ tileId: string; cellX: number; cellY: number }> }).tileMap;
    if ((!level.tileGrid || level.tileGrid.length === 0) && legacyTileMap?.length) {
      // Migrate legacy tileMap to tileGrid
      // All tiles are now 1×1 cells
      let migratedGrid = createEmptyTileGrid(updatedWidth, updatedHeight);
      for (const entry of legacyTileMap) {
        const tileDef = getTileDefinition(entry.tileId);
        if (!tileDef) continue;
        // Each tile is 1×1 cell
        if (
          entry.cellX >= 0 &&
          entry.cellY >= 0 &&
          entry.cellX < updatedWidth &&
          entry.cellY < updatedHeight
        ) {
          migratedGrid = setTileAtCell(
            migratedGrid, 
            tileDef.id, 
            entry.cellX, 
            entry.cellY, 
            false // Default to non-passable
          );
        }
      }
      tileGrid = migratedGrid;
    }
    
    const updatedLevel: Level = {
      ...level,
      width: updatedWidth, // In cells
      height: updatedHeight, // In cells
      tileGrid,
      gridSize,
    };
    
    // Compute validation warnings for the level; clear undo/redo when loading a level
    const warnings = validateLevel(updatedLevel);
    set({ 
      currentLevel: updatedLevel, 
      selectedPlatform: null, 
      pendingTileGroupDelete: null, 
      pendingPlaceOverwrite: null,
      levelValidationWarnings: warnings,
      undoStack: [],
      redoStack: [],
      selectedPattern: null,
      selectedFillPattern: null,
      selectedTileGroups: [],
    });
  },

  setSelectedTool: (tool) => {
    logger.debug('Setting selected tool', {
      component: 'EditorStore',
      operation: 'setSelectedTool',
      tool,
    });
    set({ selectedTool: tool, selectedPlatform: null, selectedTileEntry: null, selectedTileGroup: null });
  },
  
  setSelectedTileEntry: (tileEntry) => {
    logger.debug('Setting selected tile entry', {
      component: 'EditorStore',
      operation: 'setSelectedTileEntry',
      cellX: tileEntry?.cellX,
      cellY: tileEntry?.cellY,
      tileId: tileEntry?.tileId,
    });
    set({ selectedTileEntry: tileEntry, selectedPlatform: null });
    if (!tileEntry) set((s) => ({ ...s, selectedTileGroup: null }));
  },

  setSelectedTileGroup: (tileGroup) => {
    logger.debug('Setting selected tile group', {
      component: 'EditorStore',
      operation: 'setSelectedTileGroup',
      groupSize: tileGroup?.length || 0,
    });
    const groups = tileGroup ? [tileGroup] : [];
    set({ selectedTileGroup: tileGroup, selectedTileGroups: groups, selectedPlatform: null });
    if (!tileGroup || tileGroup.length === 0) set((s) => ({ ...s, selectedTileEntry: null }));
  },

  setSelectedTileGroups: (groups) => {
    const primary = groups.length > 0 ? groups[groups.length - 1] : null;
    set({ selectedTileGroups: groups, selectedTileGroup: primary, selectedPlatform: null });
    if (!primary || primary.length === 0) set((s) => ({ ...s, selectedTileEntry: null }));
  },

  setSelectedPlatform: (platform) => {
    logger.debug('Setting selected platform', {
      component: 'EditorStore',
      operation: 'setSelectedPlatform',
      platformId: platform?.id,
    });
    set({ selectedPlatform: platform, selectedTileEntry: null, selectedTileGroup: null });
  },
  
  setSelectedTile: (tile) => {
    const { pendingTextureAssignment, setTileAtCell, selectedLayer } = get();
    logger.debug('Setting selected tile', {
      component: 'EditorStore',
      operation: 'setSelectedTile',
      tileId: tile?.id,
    });
    
    // If there's a pending texture assignment, assign the tile to that cell
    if (tile && pendingTextureAssignment) {
      setTileAtCell(tile.id, pendingTextureAssignment.cellX, pendingTextureAssignment.cellY, undefined, selectedLayer);
      set({ pendingTextureAssignment: null });
      logger.info('Texture assigned from library', {
        component: 'EditorStore',
        operation: 'assignTextureFromLibrary',
        tileId: tile.id,
        cellX: pendingTextureAssignment.cellX,
        cellY: pendingTextureAssignment.cellY,
      });
    }
    
    set({ selectedTile: tile, selectedPattern: tile ? null : get().selectedPattern });
    // When a tile is selected, automatically switch to platform tool
    if (tile) {
      set({ selectedTool: 'platform' });
    }
  },
  
  toggleGrid: () => {
    const { gridEnabled } = get();
    logger.debug('Toggling grid', {
      component: 'EditorStore',
      operation: 'toggleGrid',
      enabled: !gridEnabled,
    });
    set({ gridEnabled: !gridEnabled });
  },

  setViewMode: (mode) => {
    logger.debug('Setting view mode', {
      component: 'EditorStore',
      operation: 'setViewMode',
      mode,
    });
    set({ viewMode: mode });
  },

  setGridSize: (size) => {
    logger.debug('Setting grid size', {
      component: 'EditorStore',
      operation: 'setGridSize',
      size,
    });
    set({ gridSize: size });
  },

  setZoom: (zoom) => {
    set({ zoom });
  },

  setSelectedLayer: (layer) => {
    logger.debug('Setting selected layer', {
      component: 'EditorStore',
      operation: 'setSelectedLayer',
      layer,
    });
    set({ selectedLayer: layer });
  },

  setViewportState: (state) => {
    set((prev) => ({
      viewportState: { ...prev.viewportState, ...state },
    }));
  },

  setTargetScrollPosition: (position) => {
    set({ targetScrollPosition: position });
  },

  setPendingBackgroundImageDataUrl: (url) => {
    set({ pendingBackgroundImageDataUrl: url });
  },

  setPendingTileGroupDelete: (group) => {
    set({ pendingTileGroupDelete: group });
  },

  setPendingTextureAssignment: (target) => {
    set({ pendingTextureAssignment: target });
  },

  setPendingPlaceOverwrite: (payload) => {
    set({ pendingPlaceOverwrite: payload });
  },
  setHoverCell: (cell) => {
    set({ hoverCell: cell });
  },

  copySelectionToClipboard: () => {
    const { currentLevel, selectedTileGroups, selectedTileEntry } = get();
    if (!currentLevel?.tileGrid) return;

    const grid = currentLevel.tileGrid;
    let allCells: Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }> = [];

    // First, try to use selected tile groups
    if (selectedTileGroups && selectedTileGroups.length > 0) {
      allCells = selectedTileGroups.flatMap((g) => g);
    } 
    // Otherwise, try to use selected tile entry (single tile)
    else if (selectedTileEntry?.tileId) {
      allCells = [{
        cellX: selectedTileEntry.cellX,
        cellY: selectedTileEntry.cellY,
        tileId: selectedTileEntry.tileId,
        passable: selectedTileEntry.passable,
      }];
    }

    if (allCells.length === 0) return;

    const withMeta = allCells
      .map((t) => {
        const cell = grid[t.cellY]?.[t.cellX];
        if (!cell || !t.tileId) return null;
        return {
          cellX: t.cellX,
          cellY: t.cellY,
          tileId: t.tileId,
          passable: t.passable,
          layer: (cell.layer ?? 'primary') as 'background' | 'primary' | 'foreground',
        };
      })
      .filter((v): v is { cellX: number; cellY: number; tileId: string; passable: boolean; layer: 'background' | 'primary' | 'foreground' } => v !== null);

    if (withMeta.length === 0) return;

    const minX = Math.min(...withMeta.map((c) => c.cellX));
    const minY = Math.min(...withMeta.map((c) => c.cellY));

    const clipboardTiles = withMeta.map((c) => ({
      relX: c.cellX - minX,
      relY: c.cellY - minY,
      tileId: c.tileId,
      passable: c.passable,
      layer: c.layer,
    }));

    set({ clipboardTiles });

    logger.info('Selection copied to clipboard', {
      component: 'EditorStore',
      operation: 'copySelectionToClipboard',
      tileCount: clipboardTiles.length,
    });
  },

  cutSelectionToClipboard: () => {
    const { currentLevel, undoStack, maxUndoSteps, selectedTileGroups, selectedTileEntry } = get();
    if (!currentLevel?.tileGrid) return;

    const grid = currentLevel.tileGrid;
    let allCells: Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }> = [];

    // First, try to use selected tile groups
    if (selectedTileGroups && selectedTileGroups.length > 0) {
      allCells = selectedTileGroups.flatMap((g) => g);
    } 
    // Otherwise, try to use selected tile entry (single tile)
    else if (selectedTileEntry?.tileId) {
      allCells = [{
        cellX: selectedTileEntry.cellX,
        cellY: selectedTileEntry.cellY,
        tileId: selectedTileEntry.tileId,
        passable: selectedTileEntry.passable,
      }];
    }

    if (allCells.length === 0) return;

    const withMeta = allCells
      .map((t) => {
        const cell = grid[t.cellY]?.[t.cellX];
        if (!cell || !t.tileId) return null;
        return {
          cellX: t.cellX,
          cellY: t.cellY,
          tileId: t.tileId,
          passable: t.passable,
          layer: (cell.layer ?? 'primary') as 'background' | 'primary' | 'foreground',
        };
      })
      .filter((v): v is { cellX: number; cellY: number; tileId: string; passable: boolean; layer: 'background' | 'primary' | 'foreground' } => v !== null);

    if (withMeta.length === 0) return;

    const minX = Math.min(...withMeta.map((c) => c.cellX));
    const minY = Math.min(...withMeta.map((c) => c.cellY));

    const clipboardTiles = withMeta.map((c) => ({
      relX: c.cellX - minX,
      relY: c.cellY - minY,
      tileId: c.tileId,
      passable: c.passable,
      layer: c.layer,
    }));

    // Snapshot for undo
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    // Remove selected tiles in a single pass
    const keySet = new Set(withMeta.map((c) => `${c.cellX},${c.cellY}`));
    const updatedTileGrid = currentLevel.tileGrid.map((row, y) =>
      row.map((cell, x) => {
        if (!cell) return cell;
        if (!keySet.has(`${x},${y}`)) return cell;
        // Mirror removeTileAtCell semantics: clear tile but keep metadata where sensible
        return {
          ...cell,
          tileId: undefined,
          passable: true,
          groupId: undefined,
          displayName: undefined,
          fillPatternId: undefined,
        };
      })
    );

    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };

    // Clear selection after cutting
    set({
      currentLevel: updatedLevel,
      clipboardTiles,
      selectedTileEntry: null,
      selectedTileGroup: null,
      selectedTileGroups: [],
    });

    logger.info('Selection cut to clipboard', {
      component: 'EditorStore',
      operation: 'cutSelectionToClipboard',
      tileCount: clipboardTiles.length,
    });
  },

  pasteClipboardAt: (originCellX, originCellY) => {
    const { currentLevel, clipboardTiles, undoStack, maxUndoSteps } = get();
    if (!currentLevel?.tileGrid) return;
    if (!clipboardTiles.length) return;

    const widthCells = currentLevel.tileGrid[0]?.length ?? 0;
    const heightCells = currentLevel.tileGrid.length;
    if (widthCells === 0 || heightCells === 0) return;

    // Snapshot for undo
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    let updatedTileGrid = currentLevel.tileGrid;

    for (const clip of clipboardTiles) {
      const targetX = originCellX + clip.relX;
      const targetY = originCellY + clip.relY;

      if (targetX < 0 || targetY < 0 || targetX >= widthCells || targetY >= heightCells) continue;

      updatedTileGrid = setTileAtCell(
        updatedTileGrid,
        clip.tileId,
        targetX,
        targetY,
        clip.passable,
        clip.layer
      );
    }

    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };

    set({ currentLevel: updatedLevel });

    logger.info('Clipboard pasted', {
      component: 'EditorStore',
      operation: 'pasteClipboardAt',
      tileCount: clipboardTiles.length,
      originCellX,
      originCellY,
    });
  },

  placePlatform: (platform) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) {
      logger.warn('Cannot place platform: no current level', {
        component: 'EditorStore',
        operation: 'placePlatform',
      });
      return;
    }
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    // Check for overlaps
    if (wouldOverlap(platform, currentLevel.platforms)) {
      logger.warn('Cannot place platform: overlaps with existing platform', {
        component: 'EditorStore',
        operation: 'placePlatform',
        levelId: currentLevel.id,
        platformId: platform.id,
      });
      // Could show a user-friendly error message here
      return;
    }
    
    logger.info('Placing platform', {
      component: 'EditorStore',
      operation: 'placePlatform',
      levelId: currentLevel.id,
      platformId: platform.id,
    });
    
    const updatedLevel: Level = {
      ...currentLevel,
      platforms: [...currentLevel.platforms, platform],
      updatedAt: Date.now(),
    };
    
    set({ currentLevel: updatedLevel });
  },
  
  deletePlatform: (platformId) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) {
      logger.warn('Cannot delete platform: no current level', {
        component: 'EditorStore',
        operation: 'deletePlatform',
      });
      return;
    }
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    logger.info('Deleting platform', {
      component: 'EditorStore',
      operation: 'deletePlatform',
      levelId: currentLevel.id,
      platformId,
    });
    
    const updatedLevel: Level = {
      ...currentLevel,
      platforms: currentLevel.platforms.filter(p => p.id !== platformId),
      updatedAt: Date.now(),
    };
    
    set({ 
      currentLevel: updatedLevel,
      selectedPlatform: get().selectedPlatform?.id === platformId ? null : get().selectedPlatform,
    });
  },
  
  updatePlatformProperties: (platformId, updates) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) {
      logger.warn('Cannot update platform: no current level', {
        component: 'EditorStore',
        operation: 'updatePlatformProperties',
      });
      return;
    }
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    // Get the platform being updated
    const platformToUpdate = currentLevel.platforms.find(p => p.id === platformId);
    if (!platformToUpdate) {
      logger.warn('Platform not found for update', {
        component: 'EditorStore',
        operation: 'updatePlatformProperties',
        platformId,
      });
      return;
    }
    
    // Create updated platform
    const updatedPlatform: Platform = {
      ...platformToUpdate,
      ...updates,
      updatedAt: Date.now(),
    };
    
    // Check for overlaps (excluding the platform being updated)
    const otherPlatforms = currentLevel.platforms.filter(p => p.id !== platformId);
    if (wouldOverlap(updatedPlatform, otherPlatforms)) {
      logger.warn('Cannot update platform: would overlap with existing platform', {
        component: 'EditorStore',
        operation: 'updatePlatformProperties',
        levelId: currentLevel.id,
        platformId,
      });
      // Could show a user-friendly error message here
      return;
    }
    
    logger.info('Updating platform properties', {
      component: 'EditorStore',
      operation: 'updatePlatformProperties',
      levelId: currentLevel.id,
      platformId,
    });
    
    const updatedLevel: Level = {
      ...currentLevel,
      platforms: currentLevel.platforms.map(p => 
        p.id === platformId ? updatedPlatform : p
      ),
      updatedAt: Date.now(),
    };
    
    set({ 
      currentLevel: updatedLevel,
      selectedPlatform: get().selectedPlatform?.id === platformId 
        ? updatedPlatform
        : get().selectedPlatform,
    });
  },
  
  cleanupOrphanedPlatforms: () => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) {
      logger.warn('Cannot cleanup platforms: no current level', {
        component: 'EditorStore',
        operation: 'cleanupOrphanedPlatforms',
      });
      return 0;
    }
    
    const gridSize = currentLevel.gridSize || 64;
    const tileGrid = currentLevel.tileGrid || [];
    
    // Find platforms that have no tiles within their bounds
    const orphanedPlatformIds: string[] = [];
    
    for (const platform of currentLevel.platforms) {
      // Convert platform bounds to cell coordinates
      const minCellX = Math.floor(platform.bounds.x / gridSize);
      const maxCellX = Math.floor((platform.bounds.x + platform.bounds.width - 1) / gridSize);
      const minCellY = Math.floor(platform.bounds.y / gridSize);
      const maxCellY = Math.floor((platform.bounds.y + platform.bounds.height - 1) / gridSize);
      
      // Check if any tiles exist within the platform bounds
      let hasTiles = false;
      for (let cellY = minCellY; cellY <= maxCellY && !hasTiles; cellY++) {
        for (let cellX = minCellX; cellX <= maxCellX && !hasTiles; cellX++) {
          const row = tileGrid[cellY];
          if (row) {
            const cell = row[cellX];
            if (cell && cell.tileId) {
              hasTiles = true;
            }
          }
        }
      }
      
      if (!hasTiles) {
        orphanedPlatformIds.push(platform.id);
      }
    }
    
    if (orphanedPlatformIds.length === 0) {
      logger.info('No orphaned platforms found', {
        component: 'EditorStore',
        operation: 'cleanupOrphanedPlatforms',
      });
      return 0;
    }
    
    // Create undo snapshot before cleanup
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });
    
    logger.info('Cleaning up orphaned platforms', {
      component: 'EditorStore',
      operation: 'cleanupOrphanedPlatforms',
      count: orphanedPlatformIds.length,
      platformIds: orphanedPlatformIds.join(','),
    });
    
    const updatedLevel: Level = {
      ...currentLevel,
      platforms: currentLevel.platforms.filter(p => !orphanedPlatformIds.includes(p.id)),
      updatedAt: Date.now(),
    };
    
    // Clear selected platform if it was removed
    const selectedPlatform = get().selectedPlatform;
    const newSelectedPlatform = selectedPlatform && orphanedPlatformIds.includes(selectedPlatform.id) 
      ? null 
      : selectedPlatform;
    
    set({ 
      currentLevel: updatedLevel,
      selectedPlatform: newSelectedPlatform,
    });
    
    return orphanedPlatformIds.length;
  },
  
  // Tile map management actions
  setTileAtCell: (tileId, cellX, cellY, passable = false, layer) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) {
      logger.warn('Cannot set tile: no current level', {
        component: 'EditorStore',
        operation: 'setTileAtCell',
      });
      return;
    }
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    logger.info('Setting tile at cell', {
      component: 'EditorStore',
      operation: 'setTileAtCell',
      levelId: currentLevel.id,
      tileId,
      cellX,
      cellY,
    });

    const updatedTileGrid = setTileAtCell(currentLevel.tileGrid || [], tileId, cellX, cellY, passable, layer);
    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };

    // Recompute validation warnings
    const warnings = validateLevel(updatedLevel);
    set({ currentLevel: updatedLevel, levelValidationWarnings: warnings });
  },

  removeTileAtCell: (cellX, cellY) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) {
      logger.warn('Cannot remove tile: no current level', {
        component: 'EditorStore',
        operation: 'removeTileAtCell',
      });
      return;
    }
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    logger.info('Removing tile at cell', {
      component: 'EditorStore',
      operation: 'removeTileAtCell',
      levelId: currentLevel.id,
      cellX,
      cellY,
    });

    const updatedTileGrid = removeTileAtCell(currentLevel.tileGrid || [], cellX, cellY);
    const gridSize = currentLevel.gridSize || 64;
    const updatedPlatforms = filterPlatformsWithTiles(updatedTileGrid, currentLevel.platforms, gridSize);
    const removedPlatformIds = currentLevel.platforms
      .filter((p) => !updatedPlatforms.some((q) => q.id === p.id))
      .map((p) => p.id);

    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      platforms: updatedPlatforms,
      updatedAt: Date.now(),
    };

    const selectedPlatform = get().selectedPlatform;
    const newSelectedPlatform =
      selectedPlatform && removedPlatformIds.includes(selectedPlatform.id) ? null : selectedPlatform;

    const warnings = validateLevel(updatedLevel);
    set({ currentLevel: updatedLevel, levelValidationWarnings: warnings, selectedPlatform: newSelectedPlatform });
  },

  setTileDisplayName: (cellX, cellY, displayName) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel?.tileGrid) return;
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });
    const updatedTileGrid = updateCellDisplayName(currentLevel.tileGrid, cellX, cellY, displayName);
    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };
    set({ currentLevel: updatedLevel });
  },

  setGroupDisplayName: (groupId, displayName) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) return;
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });
    const next: Record<string, string> = { ...(currentLevel.groupDisplayNames || {}) };
    if (displayName?.trim()) next[groupId] = displayName.trim();
    else delete next[groupId];
    const updatedLevel: Level = {
      ...currentLevel,
      groupDisplayNames: Object.keys(next).length ? next : undefined,
      updatedAt: Date.now(),
    };
    set({ currentLevel: updatedLevel });
  },

  removeTilesInRange: (minCellX, minCellY, maxCellX, maxCellY) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) {
      logger.warn('Cannot remove tiles: no current level', {
        component: 'EditorStore',
        operation: 'removeTilesInRange',
      });
      return;
    }
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    logger.info('Removing tiles in range', {
      component: 'EditorStore',
      operation: 'removeTilesInRange',
      levelId: currentLevel.id,
      minCellX,
      minCellY,
      maxCellX,
      maxCellY,
    });

    const updatedTileGrid = removeTilesInRange(
      currentLevel.tileGrid || [],
      minCellX,
      minCellY,
      maxCellX,
      maxCellY
    );
    const gridSize = currentLevel.gridSize || 64;
    const updatedPlatforms = filterPlatformsWithTiles(updatedTileGrid, currentLevel.platforms, gridSize);
    const removedPlatformIds = currentLevel.platforms
      .filter((p) => !updatedPlatforms.some((q) => q.id === p.id))
      .map((p) => p.id);

    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      platforms: updatedPlatforms,
      updatedAt: Date.now(),
    };

    const selectedPlatform = get().selectedPlatform;
    const newSelectedPlatform =
      selectedPlatform && removedPlatformIds.includes(selectedPlatform.id) ? null : selectedPlatform;

    const warnings = validateLevel(updatedLevel);
    set({ currentLevel: updatedLevel, levelValidationWarnings: warnings, selectedPlatform: newSelectedPlatform });
  },

  updateLevelDimensions: (widthCells, heightCells) => {
    const { currentLevel } = get();
    if (!currentLevel) {
      logger.warn('Cannot update level dimensions: no current level', {
        component: 'EditorStore',
        operation: 'updateLevelDimensions',
      });
      return;
    }
    
    logger.info('Updating level dimensions', {
      component: 'EditorStore',
      operation: 'updateLevelDimensions',
      levelId: currentLevel.id,
      widthCells,
      heightCells,
    });
    // Width and height are now in cells, not pixels
    const width = Math.max(1, Math.min(10000, widthCells));
    const height = Math.max(1, Math.min(10000, heightCells));
    const nextGrid = resizeTileGrid(currentLevel.tileGrid || [], width, height);

    const updatedLevel: Level = {
      ...currentLevel,
      width, // In cells
      height, // In cells
      tileGrid: nextGrid,
      updatedAt: Date.now(),
    };
    
    // Recompute validation warnings (grid may have changed)
    const warnings = validateLevel(updatedLevel);
    set({ currentLevel: updatedLevel, levelValidationWarnings: warnings });
  },
  
  updateLevel: (updates) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) {
      logger.warn('Cannot update level: no current level', {
        component: 'EditorStore',
        operation: 'updateLevel',
      });
      return;
    }
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    try {
      let updatedLevel = updateLevelModel(currentLevel, updates);

      if (updates.width !== undefined || updates.height !== undefined) {
        // Width and height are in cells, resize grid to match
        const widthCells = Math.max(1, Math.min(10000, updatedLevel.width));
        const heightCells = Math.max(1, Math.min(10000, updatedLevel.height));
        updatedLevel = {
          ...updatedLevel,
          tileGrid: resizeTileGrid(updatedLevel.tileGrid || [], widthCells, heightCells),
        };
      }
      if (updates.gridSize !== undefined) {
        // Grid size changed, but dimensions stay the same (in cells)
        // No need to resize grid
      }
      logger.info('Updating level', {
        component: 'EditorStore',
        operation: 'updateLevel',
        levelId: currentLevel.id,
        updatedFields: Object.keys(updates).join(', '),
      });
      
      // Recompute validation warnings if tileGrid might have changed
      const warnings = validateLevel(updatedLevel);
      set({ currentLevel: updatedLevel, levelValidationWarnings: warnings });
    } catch (error) {
      logger.error('Failed to update level', {
        component: 'EditorStore',
        operation: 'updateLevel',
        levelId: currentLevel.id,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },

  undo: () => {
    const { currentLevel, undoStack, redoStack } = get();
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const nextUndo = undoStack.slice(0, -1);
    const nextRedo = currentLevel ? [...redoStack, structuredClone(currentLevel)] : redoStack;
    const warnings = validateLevel(prev);
    set({
      currentLevel: prev,
      undoStack: nextUndo,
      redoStack: nextRedo,
      levelValidationWarnings: warnings,
      selectedTileEntry: null,
      selectedTileGroup: null,
    });
  },

  redo: () => {
    const { currentLevel, undoStack, redoStack } = get();
    if (redoStack.length === 0) return;
    const nextLevel = redoStack[redoStack.length - 1];
    const nextRedo = redoStack.slice(0, -1);
    const nextUndo = currentLevel ? [...undoStack, structuredClone(currentLevel)] : undoStack;
    const warnings = validateLevel(nextLevel);
    set({
      currentLevel: nextLevel,
      undoStack: nextUndo,
      redoStack: nextRedo,
      levelValidationWarnings: warnings,
      selectedTileEntry: null,
      selectedTileGroup: null,
    });
  },

  setSelectedPattern: (pattern) => {
    set({ selectedPattern: pattern });
    if (pattern) {
      set({ selectedTile: null, selectedTool: 'platform' });
    }
  },

  setSelectedFillPattern: (fillPatternId) => {
    set({ selectedFillPattern: fillPatternId });
  },

  setFillPatternAtCell: (fillPatternId, cellX, cellY) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel?.tileGrid) {
      logger.warn('Cannot set fill pattern: no current level', {
        component: 'EditorStore',
        operation: 'setFillPatternAtCell',
      });
      return;
    }
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    logger.info('Setting fill pattern at cell', {
      component: 'EditorStore',
      operation: 'setFillPatternAtCell',
      levelId: currentLevel.id,
      fillPatternId: fillPatternId ?? '',
      cellX,
      cellY,
    });

    const updatedTileGrid = setFillPatternAtCell(currentLevel.tileGrid, fillPatternId, cellX, cellY);
    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };

    set({ currentLevel: updatedLevel });
  },

  setFillPatternOnGroup: (fillPatternId, group) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel?.tileGrid) {
      logger.warn('Cannot set fill pattern on group: no current level', {
        component: 'EditorStore',
        operation: 'setFillPatternOnGroup',
      });
      return;
    }
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    logger.info('Setting fill pattern on group', {
      component: 'EditorStore',
      operation: 'setFillPatternOnGroup',
      levelId: currentLevel.id,
      fillPatternId: fillPatternId ?? '',
      cellCount: group.length,
    });

    let updatedTileGrid = currentLevel.tileGrid;
    for (const { cellX, cellY } of group) {
      updatedTileGrid = setFillPatternAtCell(updatedTileGrid, fillPatternId, cellX, cellY);
    }

    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };

    set({ currentLevel: updatedLevel });
  },

  placePatternAt: (originCellX, originCellY, pattern) => {
    const { currentLevel, undoStack, maxUndoSteps } = get();
    if (!currentLevel) return;
    const snapshot = structuredClone(currentLevel);
    set({ undoStack: [...undoStack, snapshot].slice(-maxUndoSteps), redoStack: [] });

    let grid = currentLevel.tileGrid || [];
    for (const cell of pattern.cells) {
      const ax = originCellX + cell.relX;
      const ay = originCellY + cell.relY;
      if (ay >= 0 && ay < grid.length && ax >= 0 && ax < (grid[ay]?.length ?? 0)) {
        grid = setTileAtCell(grid, cell.tileId, ax, ay, cell.passable, cell.layer);
      }
    }
    
    // Check if pattern contains moving platform tiles - auto-create Platform entity
    const hasMovingPlatformTiles = pattern.cells.some(
      (cell) => cell.tileId === 'platform-moving-horizontal' || cell.tileId === 'platform-moving-vertical'
    );
    
    let updatedPlatforms = currentLevel.platforms;
    
    if (hasMovingPlatformTiles) {
      const gridSize = currentLevel.gridSize || 64;
      
      // Calculate bounds from pattern cells
      const minRelX = Math.min(...pattern.cells.map(c => c.relX));
      const maxRelX = Math.max(...pattern.cells.map(c => c.relX));
      const minRelY = Math.min(...pattern.cells.map(c => c.relY));
      const maxRelY = Math.max(...pattern.cells.map(c => c.relY));
      
      const minCellX = originCellX + minRelX;
      const maxCellX = originCellX + maxRelX;
      const minCellY = originCellY + minRelY;
      const maxCellY = originCellY + maxRelY;
      
      // Determine movement direction from tile types
      const isHorizontal = pattern.cells.some(c => c.tileId === 'platform-moving-horizontal');
      
      // Calculate platform center for path
      const centerX = (minCellX + maxCellX + 1) * gridSize / 2;
      const centerY = (minCellY + maxCellY + 1) * gridSize / 2;
      const defaultDistance = 3 * gridSize;
      
      // Create movement path based on direction
      const movementPath = isHorizontal
        ? [
            { x: centerX, y: centerY },
            { x: centerX + defaultDistance, y: centerY },
          ]
        : [
            { x: centerX, y: centerY },
            { x: centerX, y: centerY + defaultDistance },
          ];
      
      // Create the platform entity
      const platform = {
        id: `platform_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        levelId: currentLevel.id,
        type: 'moving' as const,
        bounds: {
          x: minCellX * gridSize,
          y: minCellY * gridSize,
          width: (maxCellX - minCellX + 1) * gridSize,
          height: (maxCellY - minCellY + 1) * gridSize,
        },
        movementPath,
        movementSpeed: 100,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      updatedPlatforms = [...currentLevel.platforms, platform];
      
      logger.info('Auto-created moving platform from pattern', {
        component: 'EditorStore',
        operation: 'placePatternAt',
        platformId: platform.id,
        patternName: pattern.name,
        isHorizontal,
      });
    }
    
    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: grid,
      platforms: updatedPlatforms,
      updatedAt: Date.now(),
    };
    const warnings = validateLevel(updatedLevel);
    set({ currentLevel: updatedLevel, levelValidationWarnings: warnings });
  },
}));
