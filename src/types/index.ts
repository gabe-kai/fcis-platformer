// Common geometric type definitions
export type Point = {
  x: number;
  y: number;
};

export type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Size = {
  width: number;
  height: number;
};

/**
 * Camera movement modes for levels
 */
export type CameraMode = 'free' | 'auto-scroll-horizontal' | 'auto-scroll-vertical';

/**
 * Scroll direction for auto-scroll camera modes
 */
export type ScrollDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Sharing scope for graphics and levels
 */
export type SharingScope = 'private' | 'game' | 'user' | 'public';

/**
 * Export all model types
 */
export type { User, CreateUserData, UpdateUserData, UserProvider } from '@/models/User';
export type { Game, CreateGameData, UpdateGameData } from '@/models/Game';
export type { Level, CreateLevelData, UpdateLevelData } from '@/models/Level';
export type { WorldMap, CreateWorldMapData, UpdateWorldMapData } from '@/models/WorldMap';
export type { Platform, CreatePlatformData, UpdatePlatformData, PlatformType } from '@/models/Platform';
export type { Graphic, CreateGraphicData, UpdateGraphicData, GraphicCategory } from '@/models/Graphic';
