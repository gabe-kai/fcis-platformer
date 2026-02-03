import type { Platform } from '@/models/Platform';
import { logger } from '@/utils/logger';

/**
 * Checks if two platforms overlap (including touching edges)
 * @param platform1 First platform
 * @param platform2 Second platform
 * @returns true if platforms overlap or touch
 */
export function platformsOverlap(platform1: Platform, platform2: Platform): boolean {
  const p1 = platform1.bounds;
  const p2 = platform2.bounds;
  
  // Check if rectangles overlap or touch
  // Two rectangles overlap if they share any area (including edges)
  return !(
    p1.x + p1.width < p2.x ||
    p2.x + p2.width < p1.x ||
    p1.y + p1.height < p2.y ||
    p2.y + p2.height < p1.y
  );
}

/**
 * Checks if a new platform would overlap with any existing platforms
 * @param newPlatform The platform to check
 * @param existingPlatforms Array of existing platforms
 * @returns true if the new platform overlaps with any existing platform
 */
export function wouldOverlap(newPlatform: Platform, existingPlatforms: Platform[]): boolean {
  return existingPlatforms.some(existing => {
    // Don't check overlap with itself (for updates)
    if (existing.id === newPlatform.id) {
      return false;
    }
    return platformsOverlap(newPlatform, existing);
  });
}

/**
 * Checks if a platform overlaps with any existing platforms in a level
 * @param platform The platform to check
 * @param allPlatforms All platforms in the level
 * @returns The overlapping platform if found, null otherwise
 */
export function findOverlappingPlatform(
  platform: Platform,
  allPlatforms: Platform[]
): Platform | null {
  const overlapping = allPlatforms.find(existing => {
    if (existing.id === platform.id) {
      return false; // Don't check overlap with itself
    }
    return platformsOverlap(platform, existing);
  });
  
  if (overlapping) {
    logger.warn('Platform overlap detected', {
      component: 'PlatformUtils',
      operation: 'findOverlappingPlatform',
      platformId: platform.id,
      overlappingPlatformId: overlapping.id,
    });
  }
  
  return overlapping || null;
}
