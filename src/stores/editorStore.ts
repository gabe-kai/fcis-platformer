import { create } from 'zustand';
import type { Level, UpdateLevelData } from '@/models/Level';
import { createEmptyTileGrid } from '@/models/Level';
import type { Platform } from '@/models/Platform';
// Note: Point type removed - no longer using viewport state
import { logger } from '@/utils/logger';
import { wouldOverlap } from '@/utils/platformUtils';
import { updateLevel as updateLevelModel } from '@/models/Level';
import { setTileAtCell, removeTileAtCell, removeTilesInRange, resizeTileGrid, updateCellDisplayName, getGroupId } from '@/utils/tileMapUtils';

import type { TileDefinition } from '@/models/Tile';
import { getTileDefinition } from '@/models/Tile';

interface EditorState {
  currentLevel: Level | null;
  selectedTool: 'select' | 'platform' | 'delete';
  selectedPlatform: Platform | null;
  selectedTile: TileDefinition | null;
  selectedTileEntry: { cellX: number; cellY: number; tileId?: string; passable: boolean } | null;
  selectedTileGroup: Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }> | null;
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
  // Actions
  setCurrentLevel: (level: Level | null) => void;
  setSelectedTool: (tool: 'select' | 'platform' | 'delete') => void;
  setSelectedPlatform: (platform: Platform | null) => void;
  setSelectedTile: (tile: TileDefinition | null) => void;
  setSelectedTileEntry: (tileEntry: { cellX: number; cellY: number; tileId?: string; passable: boolean } | null) => void;
  setSelectedTileGroup: (tileGroup: Array<{ cellX: number; cellY: number; tileId: string; passable: boolean }> | null) => void;
  toggleGrid: () => void;
  setViewMode: (mode: 'grid' | 'texture') => void;
  setGridSize: (size: number) => void;
  setZoom: (zoom: number) => void;
  setSelectedLayer: (layer: 'background' | 'primary' | 'foreground') => void;
  setViewportState: (state: Partial<EditorState['viewportState']>) => void;
  setTargetScrollPosition: (position: { scrollLeft: number; scrollTop: number } | null) => void;
  setPendingBackgroundImageDataUrl: (url: string | null) => void;
  // Platform management actions (legacy - for backward compatibility)
  placePlatform: (platform: Platform) => void;
  deletePlatform: (platformId: string) => void;
  updatePlatformProperties: (platformId: string, updates: Partial<Platform>) => void;
  // Tile map management actions
  setTileAtCell: (tileId: string, cellX: number, cellY: number, passable?: boolean) => void;
  removeTileAtCell: (cellX: number, cellY: number) => void;
  removeTilesInRange: (minCellX: number, minCellY: number, maxCellX: number, maxCellY: number) => void;
  setTileDisplayName: (cellX: number, cellY: number, displayName: string | undefined) => void;
  setGroupDisplayName: (groupId: string, displayName: string | undefined) => void;
  // Level management actions
  updateLevelDimensions: (widthTiles: number, heightTiles: number) => void;
  updateLevel: (updates: UpdateLevelData) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentLevel: null,
  selectedTool: 'select',
  selectedPlatform: null,
  selectedTile: null,
  selectedTileEntry: null,
  selectedTileGroup: null,
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

  setCurrentLevel: (level) => {
    logger.debug('Setting current level', {
      component: 'EditorStore',
      operation: 'setCurrentLevel',
      levelId: level?.id,
    });
    if (!level) {
      set({ currentLevel: null, selectedPlatform: null });
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
    
    set({ currentLevel: updatedLevel, selectedPlatform: null });
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
    set({ selectedTileGroup: tileGroup, selectedPlatform: null });
    if (!tileGroup || tileGroup.length === 0) set((s) => ({ ...s, selectedTileEntry: null }));
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
    logger.debug('Setting selected tile', {
      component: 'EditorStore',
      operation: 'setSelectedTile',
      tileId: tile?.id,
    });
    set({ selectedTile: tile });
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

  placePlatform: (platform) => {
    const { currentLevel } = get();
    if (!currentLevel) {
      logger.warn('Cannot place platform: no current level', {
        component: 'EditorStore',
        operation: 'placePlatform',
      });
      return;
    }
    
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
    const { currentLevel } = get();
    if (!currentLevel) {
      logger.warn('Cannot delete platform: no current level', {
        component: 'EditorStore',
        operation: 'deletePlatform',
      });
      return;
    }
    
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
    const { currentLevel } = get();
    if (!currentLevel) {
      logger.warn('Cannot update platform: no current level', {
        component: 'EditorStore',
        operation: 'updatePlatformProperties',
      });
      return;
    }
    
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
  
  // Tile map management actions
  setTileAtCell: (tileId, cellX, cellY, passable = false) => {
    const { currentLevel } = get();
    if (!currentLevel) {
      logger.warn('Cannot set tile: no current level', {
        component: 'EditorStore',
        operation: 'setTileAtCell',
      });
      return;
    }

    logger.info('Setting tile at cell', {
      component: 'EditorStore',
      operation: 'setTileAtCell',
      levelId: currentLevel.id,
      tileId,
      cellX,
      cellY,
    });

    const updatedTileGrid = setTileAtCell(currentLevel.tileGrid || [], tileId, cellX, cellY, passable);
    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };

    set({ currentLevel: updatedLevel });
  },

  removeTileAtCell: (cellX, cellY) => {
    const { currentLevel } = get();
    if (!currentLevel) {
      logger.warn('Cannot remove tile: no current level', {
        component: 'EditorStore',
        operation: 'removeTileAtCell',
      });
      return;
    }

    logger.info('Removing tile at cell', {
      component: 'EditorStore',
      operation: 'removeTileAtCell',
      levelId: currentLevel.id,
      cellX,
      cellY,
    });

    const updatedTileGrid = removeTileAtCell(currentLevel.tileGrid || [], cellX, cellY);
    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };

    set({ currentLevel: updatedLevel });
  },

  setTileDisplayName: (cellX, cellY, displayName) => {
    const { currentLevel } = get();
    if (!currentLevel?.tileGrid) return;
    const updatedTileGrid = updateCellDisplayName(currentLevel.tileGrid, cellX, cellY, displayName);
    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };
    set({ currentLevel: updatedLevel });
  },

  setGroupDisplayName: (groupId, displayName) => {
    const { currentLevel } = get();
    if (!currentLevel) return;
    const next = { ...(currentLevel.groupDisplayNames || {}), [groupId]: displayName || undefined };
    if (!displayName || displayName.trim() === '') delete next[groupId];
    const updatedLevel: Level = {
      ...currentLevel,
      groupDisplayNames: Object.keys(next).length ? next : undefined,
      updatedAt: Date.now(),
    };
    set({ currentLevel: updatedLevel });
  },

  removeTilesInRange: (minCellX, minCellY, maxCellX, maxCellY) => {
    const { currentLevel } = get();
    if (!currentLevel) {
      logger.warn('Cannot remove tiles: no current level', {
        component: 'EditorStore',
        operation: 'removeTilesInRange',
      });
      return;
    }

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
    const updatedLevel: Level = {
      ...currentLevel,
      tileGrid: updatedTileGrid,
      updatedAt: Date.now(),
    };

    set({ currentLevel: updatedLevel });
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
    
    set({ currentLevel: updatedLevel });
  },
  
  updateLevel: (updates) => {
    const { currentLevel } = get();
    if (!currentLevel) {
      logger.warn('Cannot update level: no current level', {
        component: 'EditorStore',
        operation: 'updateLevel',
      });
      return;
    }
    
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
      
      set({ currentLevel: updatedLevel });
    } catch (error) {
      logger.error('Failed to update level', {
        component: 'EditorStore',
        operation: 'updateLevel',
        levelId: currentLevel.id,
      }, { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
}));
