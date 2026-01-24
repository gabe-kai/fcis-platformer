import { create } from 'zustand';
import type { Level } from '@/models/Level';
import type { Platform } from '@/models/Platform';
import { logger } from '@/utils/logger';

interface EditorState {
  currentLevel: Level | null;
  selectedTool: 'select' | 'platform';
  selectedPlatform: Platform | null;
  gridEnabled: boolean;
  gridSize: number;
  // Actions
  setCurrentLevel: (level: Level | null) => void;
  setSelectedTool: (tool: 'select' | 'platform') => void;
  setSelectedPlatform: (platform: Platform | null) => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;
  // Platform management actions
  placePlatform: (platform: Platform) => void;
  deletePlatform: (platformId: string) => void;
  updatePlatformProperties: (platformId: string, updates: Partial<Platform>) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentLevel: null,
  selectedTool: 'select',
  selectedPlatform: null,
  gridEnabled: true,
  gridSize: 32,
  
  setCurrentLevel: (level) => {
    logger.debug('Setting current level', {
      component: 'EditorStore',
      operation: 'setCurrentLevel',
      levelId: level?.id,
    });
    set({ currentLevel: level, selectedPlatform: null });
  },
  
  setSelectedTool: (tool) => {
    logger.debug('Setting selected tool', {
      component: 'EditorStore',
      operation: 'setSelectedTool',
      tool,
    });
    set({ selectedTool: tool, selectedPlatform: null });
  },
  
  setSelectedPlatform: (platform) => {
    logger.debug('Setting selected platform', {
      component: 'EditorStore',
      operation: 'setSelectedPlatform',
      platformId: platform?.id,
    });
    set({ selectedPlatform: platform });
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
  
  setGridSize: (size) => {
    logger.debug('Setting grid size', {
      component: 'EditorStore',
      operation: 'setGridSize',
      size,
    });
    set({ gridSize: size });
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
    
    logger.info('Updating platform properties', {
      component: 'EditorStore',
      operation: 'updatePlatformProperties',
      levelId: currentLevel.id,
      platformId,
    });
    
    const updatedLevel: Level = {
      ...currentLevel,
      platforms: currentLevel.platforms.map(p => 
        p.id === platformId 
          ? { ...p, ...updates, updatedAt: Date.now() }
          : p
      ),
      updatedAt: Date.now(),
    };
    
    set({ 
      currentLevel: updatedLevel,
      selectedPlatform: get().selectedPlatform?.id === platformId 
        ? updatedLevel.platforms.find(p => p.id === platformId) || null
        : get().selectedPlatform,
    });
  },
}));
