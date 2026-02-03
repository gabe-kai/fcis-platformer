/**
 * Central export point for all model types and functions
 */

// User model
export type { User, CreateUserData, UpdateUserData, UserProvider, UserValidationErrors } from './User';
export { createUser, updateUser, validateUser, isUser } from './User';

// Game model
export type { Game, CreateGameData, UpdateGameData, GameValidationErrors } from './Game';
export { createGame, updateGame, validateGame, isGame } from './Game';

// Level model
export type { Level, CreateLevelData, UpdateLevelData, LevelValidationErrors, TileCell } from './Level';
export { createLevel, updateLevel, validateLevel, isLevel } from './Level';

// WorldMap model
export type { WorldMap, CreateWorldMapData, UpdateWorldMapData, WorldMapValidationErrors, WorldMapLevelNode, WorldMapPath } from './WorldMap';
export { createWorldMap, updateWorldMap, validateWorldMap, isWorldMap } from './WorldMap';

// Platform model
export type { Platform, CreatePlatformData, UpdatePlatformData, PlatformValidationErrors, PlatformType } from './Platform';
export { createPlatform, updatePlatform, validatePlatform, isPlatform } from './Platform';

// Graphic model
export type { Graphic, CreateGraphicData, UpdateGraphicData, GraphicValidationErrors, GraphicCategory } from './Graphic';
export { createGraphic, updateGraphic, validateGraphic, isGraphic } from './Graphic';

// Tile model
export type { TileDefinition, TileType } from './Tile';
export { DEFAULT_TILES, DEFAULT_SOLID_BLOCK, getTileDefinition, getAllTileDefinitions, createTileDefinition } from './Tile';
