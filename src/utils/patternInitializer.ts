import { storageService } from '@/services/storageService';
import { SYSTEM_PATTERNS } from './systemPatterns';
import { logger } from './logger';
import type { TilePattern } from '@/types';

/**
 * Initialize system patterns into storage if they don't already exist
 * This should be called on app startup or when patterns are first needed
 */
export async function initializeSystemPatterns(): Promise<void> {
  try {
    const existingPatterns = await storageService.listPatterns();
    const existingIds = new Set(existingPatterns.map(p => p.id));
    
    let addedCount = 0;
    for (const systemPattern of SYSTEM_PATTERNS) {
      // Only add if it doesn't already exist
      if (!existingIds.has(systemPattern.id)) {
        // Convert SystemPattern to TilePattern (they're compatible)
        const pattern: TilePattern = {
          id: systemPattern.id,
          name: systemPattern.name,
          cells: systemPattern.cells,
          createdAt: Date.now(), // Use current time for initialization
          category: systemPattern.category,
          description: systemPattern.description,
          source: 'system',
        };
        
        await storageService.savePattern(pattern);
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      logger.info('System patterns initialized', {
        component: 'PatternInitializer',
        operation: 'initializeSystemPatterns',
        count: addedCount,
      });
      
      // Notify that patterns have changed
      window.dispatchEvent(new CustomEvent('tilePatternsChanged'));
    }
  } catch (error) {
    logger.error('Failed to initialize system patterns', {
      component: 'PatternInitializer',
      operation: 'initializeSystemPatterns',
    }, { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Check if system patterns need initialization
 */
export async function needsSystemPatternInitialization(): Promise<boolean> {
  try {
    const existingPatterns = await storageService.listPatterns();
    const systemPatternIds = new Set(SYSTEM_PATTERNS.map(p => p.id));
    const existingSystemPatterns = existingPatterns.filter(p => systemPatternIds.has(p.id));
    
    // If we have fewer system patterns than expected, we need initialization
    return existingSystemPatterns.length < SYSTEM_PATTERNS.length;
  } catch (error) {
    logger.error('Failed to check system pattern initialization status', {
      component: 'PatternInitializer',
      operation: 'needsSystemPatternInitialization',
    }, { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}
