# Level Editor Design Specification

## Current Progress & Diversions

**Last updated:** Jan 2026 (background image placement modal, Library sections, original-save-to-Library)

### Implemented
- **Core editor**: Tool palette (Select, Place, Delete), grid display, zoom (wheel + slider), panning (middle-click drag).
- **View mode (Grid/Texture)**: Header toggle to switch canvas display. **Grid mode** uses solid-color blocks only (no textures, no background image)—intended for printing, coloring, and re-upload workflows. **Texture mode** shows fully rendered tiles and background as in game. Stored in editor store as `viewMode: 'grid' | 'texture'`.
- **Coordinate system**: Bottom-left origin, cell-based dimensions, world/canvas conversion.
- **Layer system**: Background image layer + three tile layers (background, primary, foreground). Layer selector in Tool Palette.
- **Level model**: `Level` with `tileGrid`, `gridSize`, `width`/`height`, `backgroundImage`, camera metadata. `backgroundImage` is a single `string` (URL/data URL of the **cropped** image), not `{ url, parallaxSpeed }`.
- **Background image**: Upload in Level Details panel opens a **placement modal**. User sees the full image with a crop rectangle matching the level map aspect (no warp/squish; rectangle must fully cover the level). Pan and zoom to position, then approve; the cropped region is saved as `level.backgroundImage` and displayed in editor/game (cover, bottom-left anchor). The **original** full upload is saved to Library → Background Images for reuse.
- **Library** (formerly Tile Library): Left panel below Tool Palette. Three sections: **Tile Textures** (My Tiles + system categories Core, Platforms, Interactive, Hazards); **Tile Group Textures** (placeholder, coming soon); **Background Images** (saved originals from uploads; "Use" opens placement modal to apply again). Selecting a tile sets Place tool and layer.
- **User tile upload**: TileUploadModal for uploading custom tiles. Validates: square aspect ratio, 16–256px. Supports PNG, JPG, GIF, WebP. Tiles stored in localStorage (`fcis_user_tiles`), registered in a tile registry for fast lookup. User tiles render with their textures on the canvas.
- **Properties Panel**: Level Preview (minimap + viewport indicator), Level Details (name, dimensions, grid, zoom, background image upload), Selected Object details. Preview supports click-to-jump and drag-to-pan. Background image upload opens placement modal (crop rectangle, pan/zoom, approve).
- **Save/Load**: Manual save via header "Save Level" button; levels stored in `localStorage` (`fcis_levels`). **Autosave**: debounced 2s after level changes (first run after load skipped). **Last-saved**: timestamp shown in header next to Save button (e.g. "Last saved: 2:34 PM" or "Last saved: —"); updates on both manual save and autosave. No binary format; JSON in localStorage.
- **Level Browser**: "Design Levels" on dashboard opens Level Browser (not editor directly). Sections: Create New Level, My Levels, Shared with Me. Create/edit/delete levels. Delete uses a local confirmation modal with "Don't warn me again"; preference stored in user profile.
- **User preference**: "Don't confirm when deleting levels" toggle in User Details (Preferences). Persisted with user profile.

### Partial / Deferred
- **Tile textures**: User tile upload implemented (16–256px square, PNG/JPG/GIF/WebP). System tiles still use color-coded placeholder icons.
- **Multi-tile patterns & function sets**: No Patterns or Function Sets UI, creation, or placement. Tile Library is tiles-only.
- **Overlap detection / confirmation**: No in-canvas overlap detection or confirmation when placing over existing tiles. Design's "red highlight + confirm" not implemented.
- **Deletion confirmation (in-editor)**: Design's "group deletion: confirmation; single tile: no confirmation" applies to **tile** deletion in the canvas. We have **level** deletion confirmation in the Level Browser only. In-editor tile/group deletion has no confirmation.
- **Undo/Redo**: Not implemented.
- **Level validation**: No spawn/win checks or validation UI.
- **Search/filter, favorites, recent**: Not in Tile Library.

### Major Diversions
1. **Scrollbars**: Design specifies "Native browser scrollbars when map exceeds viewport." We use **no scrollbars**. Navigation is middle-click drag + Level Preview (click-to-jump, drag-to-pan). A hidden scroll container is used programmatically for viewport positioning.
2. **Scrollbar as source of truth**: Technical Notes say "Scrollbars control viewport position; offset derived from scroll position." We use a **hidden scroll container**; scrollbars are off. Viewport position is derived from that container's `scrollLeft`/`scrollTop`.
3. **Level Browser**: Not in original design. "Design Levels" opens a browser (create, my levels, shared) instead of creating a level and opening the editor directly.
4. **Level deletion UX**: Level delete uses a **local modal** (not `confirm`) with "Don't warn me again," persisted as a user preference in User Details. Applies to level deletion in Level Browser only.

---

## Overview

The Level Editor is a visual tool for creating platformer game levels. It uses a tile-based system where users can place, select, and edit tiles on a grid. The editor is designed with kids in mind - they'll print maps, color them with physical media, and re-upload them.

## Core Principles

1. **Uniform Tile Size**: All tiles are square and the same size (gridSize). Multi-size tiles are groups of standard tiles
2. **User-Facing Coordinates**: Tiles are numbered from bottom-left, right and up (like math graphs) for easy mapping to physical paper
3. **Smooth Scaling**: Grid scales smoothly with zoom, maintaining visual alignment
4. **Layer System**: Four distinct layers for visual organization and future parallax effects
5. **Color Coding**: Visual distinction for different tile types and functions
6. **Individual Tile Storage**: Each tile is stored separately in the grid, even when part of a visual group
7. **Grouping by Contiguity**: Contiguous/touching tiles form groups for selection, but each tile maintains independent texture and functionality

---

## Coordinate System

### World Coordinates (Internal)
- **Origin**: Bottom-left corner (0, 0)
- **X-axis**: Increases rightward
- **Y-axis**: Increases upward
- **Units**: Grid cells (not pixels). Map dimensions are in cell counts.

### User-Facing Coordinates
- **Display**: Cell coordinates shown as (X, Y) starting from bottom-left
- **Example**: Bottom-left tile = (0, 0), tile to its right = (1, 0), tile above it = (0, 1)
- **Purpose**: Matches physical paper mapping where kids draw from bottom-left

### Canvas Coordinates (Rendering)
- **Origin**: Top-left corner (standard HTML canvas)
- **Conversion**: `canvasY = canvasHeight - worldY * zoom + offset.y`
- **Offset**: `offset.y` = world Y (scaled) visible at canvas bottom

---

## Map Structure

### Map Dimensions
- **Default**: 150 tiles wide × 30 tiles tall
- **Units**: Grid cells (not pixels)
- **Flexible**: User can resize in tile units
- **Limits**: Minimum 1 cell, maximum 10000 cells (per dimension)
- **Grid Size**: User-configurable per level
  - **Default**: 64px
  - **Limits**: Minimum 16px, maximum 256px
  - All tiles are square and match gridSize

### Tile Grid
- **Structure**: `tileGrid: TileCell[][]` - 2D array of cells
- **Storage**: Each cell stores one tile independently, even if visually grouped
- **Cell Definition**:
  ```typescript
  interface TileCell {
    passable: boolean;
    tileId?: string;        // Reference to tile definition
    layer: 'background' | 'primary' | 'foreground';
    properties?: TileProperties;
  }
  ```
- **Grouping**: Contiguous/touching tiles form groups for selection, but each cell maintains independent data

### Tile Definitions
- **Texture-Based**: Each tile uses uploaded texture/image
- **Size**: All tiles are square and match gridSize (e.g., 64×64px, 128×128px)
- **Aspect Ratio**: Only square textures allowed (1:1 aspect ratio)
- **Multi-Tile Groups**: Large visual elements are groups of standard-sized tiles
- **Reusable**: Tile definitions stored separately, referenced by ID
- **Texture Size**: 16×16px to 256×256px (square only)

---

## Layer System

### Layer 1: Background Image
- **Purpose**: Full-map background (e.g., colored-in photo upload)
- **Type**: Single image covering entire map (cropped to level aspect; no warp/squish)
- **Implementation**:
  - **Upload**: Level Details → Background Image file picker, or Library → Background Images → "Use".
  - **Placement modal**: After upload or "Use", a modal shows the image with a fixed-aspect crop rectangle (level map proportion). User can pan and zoom; rectangle must fully cover the level (no gaps). Approve crops that region; it becomes `level.backgroundImage`.
  - **Display**: Cropped image anchors bottom-left, scales to **cover** viewport (aspect preserved). Rendered behind grid and tiles (texture mode only).
  - **Library**: The **original** full image is saved to Library → Background Images (localStorage `fcis_background_images`) for reuse without re-uploading.
- **Properties** (future):
  - Static or parallax
  - Scroll speed multiplier (for parallax)
  - Z-index: -3

### Layer 2: Background Tiles
- **Purpose**: Decorative tiles behind player
- **Type**: Grid-based tiles
- **Properties**:
  - No physics/collision
  - Parallax support (future)
  - Z-index: -2

### Layer 3: Primary Tiles (Physics Layer)
- **Purpose**: Main gameplay tiles with collision
- **Type**: Grid-based tiles
- **Properties**:
  - Physics/collision enabled
  - Tile type determines behavior
  - Z-index: -1

### Layer 4: Foreground Tiles
- **Purpose**: Decorative tiles in front of player
- **Type**: Grid-based tiles
- **Properties**:
  - No physics/collision
  - Parallax support (future)
  - Z-index: 0

### Future: Parallax Motion
- **Planned**: Different scroll speeds per layer
- **Not Implemented**: Save for playtime phase
- **Design**: Each layer has scroll speed multiplier (0.0 to 2.0)

---

## Tile Types & Color Coding

### Standard Tile Types

| Type | Color | Description | Physics | Layer |
|------|-------|-------------|---------|-------|
| **Solid Platform** | Blue (#3498db) | Standard walkable surface | Collision | Primary |
| **Spawn Point** | Green (#27ae60) | Player starting position | None | Primary |
| **Level Win** | Gold (#f39c12) | Level completion trigger | None | Primary |
| **Teleporter/Portal** | Purple (#9b59b6) | Warps player to target | None | Primary |
| **Death Tile** | Red (#e74c3c) | Kills player on contact | Collision | Primary |
| **Hazard Zone** | Dark Red (#c0392b) | Fall-to-die area (spikes, lava, etc.) | Collision | Primary |
| **One-Way Platform** | Cyan (#1abc9c) | Jump up through, can't fall through | One-way | Primary |
| **Breakable Block** | Orange (#e67e22) | Can be destroyed (Mario-style) | Collision | Primary |
| **Moving Platform** | Yellow (#f1c40f) | Moves along path | Collision | Primary |
| **Spring/Jump Pad** | Pink (#ec4899) | Boosts player upward/jump | Trigger | Primary |
| **Key** | Bronze (#cd7f32) | Collectible key item | None | Primary |
| **Locked Door** | Brown (#8b4513) | Requires key to open | Collision (when locked) | Primary |
| **Enemy Spawner** | Magenta (#e91e63) | Spawns enemies | None | Primary |
| **Collectible** | Light Blue (#3498db, lighter) | Coins/power-ups | None | Primary |
| **Background Decoration** | Gray (#95a5a6) | Visual only | None | Background |
| **Foreground Decoration** | Dark Gray (#7f8c8d) | Visual only | None | Foreground |

### Tile Type Properties

```typescript
interface TileProperties {
  // Basic
  type: TileType;
  passable: boolean;
  layer: 'background' | 'primary' | 'foreground';
  
  // Teleporter
  targetLevelId?: string;
  targetX?: number;
  targetY?: number;
  
  // Moving Platform
  pathType?: 'horizontal' | 'vertical' | 'circular' | 'custom';
  pathSpeed?: number;
  pathPoints?: Array<{ x: number; y: number }>;
  
  // Breakable
  breakable?: boolean;
  breakSound?: string;
  
  // One-Way
  oneWayDirection?: 'up' | 'down' | 'left' | 'right';
  
  // Enemy Spawner
  enemyType?: string;
  spawnInterval?: number;
  maxEnemies?: number;
  
  // Collectible
  collectibleType?: 'coin' | 'powerup' | 'custom';
  value?: number;
  
  // Spring/Jump Pad
  springForce?: number;  // Upward boost strength
  springDirection?: 'up' | 'down' | 'left' | 'right' | 'diagonal';
  springAngle?: number;  // For diagonal springs
  
  // Key
  keyId?: string;  // Unique key identifier
  keyColor?: string;  // Visual distinction
  
  // Locked Door
  requiredKeyId?: string;  // Key ID needed to unlock
  locked?: boolean;  // Current lock state
  targetLevelId?: string;  // Optional: level to transition to when unlocked
  
  // Hazard Zone
  hazardType?: 'spikes' | 'lava' | 'poison' | 'void' | 'custom';
  damage?: number;  // Damage per contact/frame
}
```

---

## Viewport & Navigation

### Viewport
- **Fixed Size**: Matches container dimensions
- **Canvas**: HTML5 canvas element for rendering
- **Background**: Dark blue (#1a1a2e)

### Zoom
- **Min Zoom**: Longest map dimension fits viewport
  - `minZoom = max(canvasWidth / mapWidth, canvasHeight / mapHeight)`
- **Max Zoom**: At least 8×8 tiles visible
  - `maxZoom = min(canvasWidth / (gridSize * 8), canvasHeight / (gridSize * 8))`
- **Controls**:
  - Mouse wheel (anchors to cursor position)
  - Zoom slider in Properties Panel
- **Smooth Scaling**: Grid and tiles scale proportionally

### Panning
- **Middle-Click Drag**: Pan the viewport
- **Scrollbars**: ~~Native browser scrollbars when map exceeds viewport~~ **Diversion:** Scrollbars removed. Navigation is middle-click drag + Level Preview (click-to-jump, drag-to-pan). A hidden scroll container provides programmatic viewport positioning; scrollbars are hidden.
- **Scroll Content**: Exactly `mapWidthScaled × mapHeightScaled` pixels

### Grid Display
- **Visibility**: Toggle on/off
- **Alignment**: Grid lines align with tile boundaries
- **Bounds**: Only drawn within map bounds (0 to mapWidth, 0 to mapHeight)
- **Scaling**: Grid cell size = `gridSize * zoom`
- **Hover Info**: Shows cell coordinates (X, Y) in Properties Panel

---

## User Interactions

### Tool Palette
1. **Select Tool**: Click tiles to view/edit properties
2. **Place Tool**: Click/drag to place tiles
3. **Delete Tool**: Click to remove tiles (removes connected group)

### Tile Placement
- **Click**: Place single tile
- **Drag**: Place multiple tiles in rectangle
- **Hover Highlight**: Shows where tiles will be placed
- **Layer Selection**: Choose which layer to place on (visual indicator shows active layer)
- **Overlap Detection**: 
  - If placement would overwrite existing tiles, entire old group highlighted in red
  - User confirmation required to delete old group and replace with new tile
  - If placement extends beyond map boundaries, parts beyond edge are cut off
- **No Overlap Rule**: Tiles cannot overlap on the same layer
- **Functionality Independence**: Functionality tiles can use any texture
- **Pattern/Set Placement**: Patterns and function sets placed with bottom-left corner as origin

### Tile Selection
- **Single Click**: Select individual tile
- **Group Selection**: Contiguous/touching tiles auto-group (all tiles that touch each other)
- **Multi-Group Selection**: Can select multiple groups simultaneously (Ctrl/Cmd + click)
- **Properties Panel**: Shows tile details, coordinates, type, properties
- **Individual Control**: Each tile in a group can have different texture and functionality

### Context Actions
- **Right-Click**: Switch to select tool, unselect tiles
- **Middle-Click Drag**: Pan viewport

---

## Data Model

### Level Structure
```typescript
interface Level {
  id: string;
  gameId: string;
  title: string;
  description?: string;
  
  // Dimensions (in grid cells, not pixels)
  width: number;  // Width in grid cells
  height: number;  // Height in grid cells
  
  // Tile Grid (2D array)
  tileGrid: TileCell[][];
  
  // Background Image (design)
  backgroundImage?: {
    url: string;
    parallaxSpeed?: number;  // Future
  };
  // Implementation uses `backgroundImage?: string` (URL/data URL); parallax not used.
  
  // Grid Configuration
  gridSize: number;  // Grid cell size in pixels (user-configurable per level, e.g., 64, 128). All tiles are square and match this size.
  
  // Camera
  cameraMode: 'free' | 'auto-scroll-horizontal' | 'auto-scroll-vertical';
  scrollSpeed?: number;
  
  // Player
  playerSpawn?: { x: number; y: number };
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  isShared: boolean;
  sharingScope: 'private' | 'game' | 'user' | 'public';
  isTemplate: boolean;
}
```

### Tile Cell
```typescript
interface TileCell {
  passable: boolean;
  tileId?: string;
  layer: 'background' | 'primary' | 'foreground';
  properties?: TileProperties;
}
```

### Tile Definition
```typescript
interface TileDefinition {
  id: string;
  name: string;
  type: TileType;
  texture: {
    url: string;
    width: number;   // Texture width (must equal height, square only)
    height: number;  // Texture height (must equal width, square only)
  };
  // Note: All tiles are 1×1 grid cells. Multi-tile visuals are groups of standard tiles.
  properties: TileProperties;
  reusable: boolean;  // Can be used multiple times
  source: 'system' | 'user';  // System-provided or user-created
  userId?: string;  // Creator ID (for user tiles)
}
```

### Multi-Tile Pattern
```typescript
interface TilePattern {
  id: string;
  name: string;
  description?: string;
  tiles: Array<{
    cellX: number;  // Relative X position in pattern (from pattern origin)
    cellY: number;  // Relative Y position in pattern (from pattern origin)
    tileId: string;  // Reference to TileDefinition
    layer: 'background' | 'primary' | 'foreground';
    properties?: TileProperties;  // Individual tile properties within pattern
  }>;
  source: 'system' | 'user';
  userId?: string;
  previewImage?: string;  // Optional preview thumbnail
}
```

### Function Set
```typescript
interface FunctionSet {
  id: string;
  name: string;
  description?: string;
  tiles: Array<{
    cellX: number;
    cellY: number;
    tileId: string;
    layer: 'background' | 'primary' | 'foreground';
    properties?: TileProperties;  // Pre-configured properties
  }>;
  startTile?: { cellX: number; cellY: number };  // Distinct start tile (e.g., teleporter entrance)
  endTile?: { cellX: number; cellY: number };   // Distinct end tile (e.g., teleporter exit)
  connections?: Array<{
    fromTile: { cellX: number; cellY: number };
    toTile: { cellX: number; cellY: number };
    connectionType: 'trigger' | 'dependency' | 'sequence';
  }>;
  // Note: End tile moves with its group, but if separated, that becomes the new teleport destination
  source: 'system' | 'user';
  userId?: string;
  previewImage?: string;
  example: string;  // e.g., "Springboard + Landing Platform"
}
```

---

## Rendering Pipeline

### View Mode (Grid vs Texture)
- **Grid mode**: Tiles drawn as solid-color blocks (`TILE_TYPE_COLORS`); background image hidden. For printing, coloring, and re-upload workflows.
- **Texture mode**: Tiles use textures when available; background image shown. Matches in-game look.

### Render Order (Back to Front)
1. Background image (if present; texture mode only)
2. Background layer tiles
3. Primary layer tiles (with physics)
4. Foreground layer tiles
5. Grid overlay (if enabled)
6. Hover highlights
7. Selection indicators

### Coordinate Conversion
- **World → Canvas**: `canvasY = canvasHeight - worldY * zoom + offset.y`
- **Canvas → World**: `worldY = (canvasHeight - canvasY + offset.y) / zoom`
- **Cell → World**: `worldX = cellX * gridSize`, `worldY = cellY * gridSize`
- **World → Cell**: `cellX = floor(worldX / gridSize)`, `cellY = floor(worldY / gridSize)`
- **Note**: All coordinates are in grid cells. Map dimensions are cell counts, not pixels.

---

## Editor UI Components

### Main Layout
- **Left Panel**: Tool Palette + Library (Tile Textures, Tile Group Textures, Background Images)
- **Center**: Level Canvas (viewport)
- **Right Panel**: Properties Panel

### Editor Header
- **Left**: Level title; level dimensions (editable inline when in edit mode).
- **Right**: **View mode** toggle (Grid | Texture), **Last saved** timestamp (e.g. "Last saved: 2:34 PM" or "—"), **Save Level** button, **Back to Dashboard**. Grid mode shows solid-color blocks for printing/coloring/re-upload; Texture mode shows full tiles and background.

### Level Browser (Addition)
- **Entry**: "Design Levels" on dashboard opens Level Browser (not editor directly).
- **Sections**: Create New Level; My Levels (grid with edit/delete); Shared with Me.
- **Create**: Creates level, saves to storage, navigates to editor.
- **Delete**: Local confirmation modal with "Don't warn me again"; preference in User Details. **Scope:** Level deletion only (not in-editor tile/group deletion).

### Properties Panel Sections
1. **Level Preview**: Mini-map with viewport indicator; click-to-jump, drag-to-pan. **Implemented.**
2. **Selected Object Details**: Tile properties, coordinates, type
3. **Level Details**: Name, dimensions, grid settings, zoom control, background image upload (opens placement modal for crop/pan/zoom). **Implemented.**
4. **Metadata**: Creator, dates, sharing

### Tool Palette
- Select Tool
- Place Tool
- Delete Tool
  - **Deletion Confirmation (in-editor):** Design: single tile no confirmation, group confirmation. **Not yet implemented** for tile/group deletion in canvas.
  - **Level deletion (Level Browser):** Uses local modal with "Don't warn me again"; user preference in User Details. **Implemented.**
- Layer Selector (Background/Primary/Foreground)
  - Visual indicator shows active layer
  - Can be dropdown, buttons, or tabs (implementation detail)

### Library (formerly Tile Library)
- **Location**: Left panel, below Tool Palette. **Implemented.** Title in UI: "Library".
- **Sections** (implementation):
  1. **Tile Textures**: My Tiles (user-uploaded, 16–256px square) + system categories (Core, Platforms, Interactive, Hazards). **Implemented.** Click to select for placement; delete on user tiles.
  2. **Tile Group Textures**: Placeholder — "Coming soon". **Not implemented.**
  3. **Background Images**: Saved original full images from background uploads. **Implemented.** Thumbnails, "Use" opens placement modal to apply as level background, delete to remove from library. Stored in `fcis_background_images` (localStorage).
- **Design sections** (not yet implemented):
  - **Multi-Tile Patterns**: Reusable tile arrangements.
  - **Function Sets**: Pre-configured tile combinations.
- **Features**:
  - Search/filter tiles — **Not implemented.**
  - Preview on hover — **Minimal** (tooltip/name)
  - Click-to-select for placement (no drag-and-drop yet)
  - Right-click to edit (user tiles only) — **Not implemented.**

---

## Future Features (Planned, Not Implemented)

### Parallax Scrolling
- Each layer has independent scroll speed multiplier
- Background layers scroll slower (depth effect)
- Foreground layers scroll faster (close-up effect)

### Moving Platforms
- Path editor for platform movement
- Horizontal, vertical, circular, custom paths
- Speed and timing controls

### Enemy System
- Enemy spawner tiles
- Enemy type definitions
- Spawn intervals and limits

### Advanced Tile Types
- Keys and locked doors
- Checkpoints/respawn points
- Secret areas/hidden passages
- Wind/gravity zones
- Springs/jump pads

---

## Technical Implementation Notes

### Scrollbar as Source of Truth
- **Diversion:** Scrollbars are not used. A hidden scroll container (overflow scroll, scrollbars hidden via CSS) holds the scrollable content. Viewport position is derived from that container's `scrollLeft`/`scrollTop`. Level Preview click/drag sets a target scroll position that the canvas applies. Middle-click drag updates scroll via the same container.
- Offset derived from scroll position: `offset.y = mapHeightScaled - canvasHeight - scrollTop` (conceptually; implementation uses the hidden container)
- No native scrollbar UI; programmatic scroll only

### Grid Drawing
- Only draw lines within map bounds (0 to mapWidth, 0 to mapHeight)
- Clip lines to visible map area
- Scale with zoom: `gridLineSpacing = gridSize * zoom`

### Texture Handling
- **Storage**: localStorage for now (plan for cloud/DB migration later)
- **Formats**: PNG, JPG, WebP, GIF, BMP, TIFF, SVG (all standard formats)
- **Size Limit**: 16×16px to 256×256px per tile texture (square only)
- **Aspect Ratio**: Square only (1:1)
- **Upload Options**: Both single upload and bulk upload supported
- **Scaling**: If uploaded texture doesn't match gridSize exactly, scale to fit gridSize (maintains aspect ratio)
- **Storage Pattern**: Per-user storage in localStorage, plan for server/cloud later
- Store tile textures separately (reusable)
- Reference by ID in tile cells
- Cache loaded textures

### Background Image Placement
- **Trigger**: Level Details → Background Image file picker, or Library → Background Images → "Use".
- **Modal**: `BackgroundImagePlacementModal` shows the full image with a fixed-aspect crop rectangle (level map proportion). User can pan (drag) and zoom (wheel); rectangle cannot warp/squish the image and must fully cover the level.
- **Approve**: Crops the image to the rectangle in image space, outputs a data URL; that becomes `level.backgroundImage`. The **original** full image is saved to Library (storage key `fcis_background_images`) for reuse.
- **Display**: LevelCanvas draws `level.backgroundImage` with cover semantics (bottom-left anchor, aspect preserved). Shown only in texture mode.

### Performance
- Only render visible tiles (viewport culling)
- Batch tile rendering by layer
- Use texture atlases for common tiles
- Lazy load background images

### Undo/Redo System
- **Memory-Based Limit**: User-configurable RAM limit (e.g., 50MB default)
- **Default Steps**: Approximately 16 steps (varies based on action size)
- **Storage**: Undo states stored in memory (RAM)
- **Actions**: All tile operations (place, delete, move, property changes)
- **Implementation**: Command pattern with state snapshots

### Save/Load System
- **Auto-Save**: Debounced save after level changes — **Implemented.** 2s delay after last change; first run after load skipped to avoid redundant save. Writes same JSON to localStorage as manual save.
- **Last-Saved Indicator**: Timestamp in header next to Save button — **Implemented.** Shows "Last saved: \<time\>" or "Last saved: —"; updates on manual save and autosave; tooltip shows full date/time.
- **Format**: Binary format for auto-saves (compact, fast) — **N/A** (autosave uses same JSON format as manual save).
- **Manual Save-Points**: User can create named save points — **Partial:** Manual save via header "Save Level" button; no named save points.
- **Format**: JSON format for manual saves (human-readable, debuggable) — **Implemented** (levels stored as JSON in localStorage).
- **Storage**: localStorage for now (plan for cloud/DB migration later) — **Implemented** (`fcis_levels`).
- **Per-User**: Each user's levels stored separately — **Partial:** Levels keyed by level ID; full per-user isolation TBD.

### Level Validation
- **Warning System**: Invalid levels show warnings but can still be saved
- **Validation Checks**:
  - Spawn point present (warning if missing)
  - Level win condition present (warning if missing)
  - Map dimensions within bounds (1 to 10000 cells per dimension)
  - Grid size within bounds (16px to 256px)
  - Tile references valid
- **Error Handling**: Graceful degradation for invalid states

---

## Color Key Legend

The editor should display a color key showing:
- **Blue**: Solid platforms
- **Green**: Spawn points
- **Gold**: Level win triggers
- **Purple**: Teleporters/portals
- **Red**: Death tiles
- **Dark Red**: Hazard zones (fall-to-die)
- **Cyan**: One-way platforms
- **Orange**: Breakable blocks
- **Yellow**: Moving platforms
- **Pink**: Springs/jump pads
- **Bronze**: Keys
- **Brown**: Locked doors
- **Magenta**: Enemy spawners
- **Light Blue**: Collectibles
- **Gray**: Background decorations
- **Dark Gray**: Foreground decorations

---

## Export/Import Workflow

### Print & Color Workflow
1. User creates level in editor
2. Export as printable PDF/image (coloring page)
3. Kids print and color with physical media
4. Scan/photograph colored version (at angle, warped)
5. Re-import as background image
6. System unwarps/distorts image to align with grid
7. Tiles align with colored background

### Coordinate Mapping
- Physical paper uses same bottom-left coordinate system
- Grid lines visible on export for alignment
- Re-import maintains coordinate alignment after unwarping

### Image Unwarping System
- **Purpose**: Correct perspective distortion from photographed/scanned coloring pages
- **Corner Markers**: Required 4 corner markers (detected automatically)
  - Top-left, top-right, bottom-left, bottom-right
  - Visual markers printed on export (e.g., black squares with white borders)
- **Grid Markers**: Optional grid intersection markers for better accuracy
  - Markers at top/bottom of each column
  - Markers at left/right of each row
  - Enables handling of complex warping (non-rectangular distortion)
- **Detection**: Computer vision techniques (OpenCV.js, TensorFlow.js)
- **Unwarping**: Perspective transformation to align with grid
- **Fallback**: If grid markers not detected, use corner markers only
- **Export Format**: High-resolution PDF/image with visible markers
- **Resolution**: Sufficient DPI for clear marker detection (e.g., 300 DPI)

---

## Testing Considerations

### Coordinate System
- Verify bottom-left origin in all conversions
- Test hover coordinates match actual tile positions
- Ensure grid alignment at all zoom levels

### Layer System
- Verify rendering order (back to front)
- Test layer selection and placement
- Ensure physics only applies to primary layer

### Zoom & Pan
- Test zoom limits (min/max)
- Verify cursor anchoring during zoom
- ~~Test scrollbar behavior at all zoom levels~~ **Diversion:** No scrollbars; test middle-click pan and Level Preview click/drag at all zoom levels.
- Ensure no empty space beyond map bounds

### Tile Placement
- Test single tile placement
- Test drag-to-place multiple tiles
- Verify layer assignment
- Test tile type color coding
- Ensure hover highlights align correctly
- Test overlap detection (red highlighting)
- Test overlap confirmation dialog
- Test boundary cutoff (placement beyond map edges)
- Verify no same-layer overlap allowed

### Tile Grouping
- Test contiguous tile grouping
- Test multi-group selection (Ctrl/Cmd + click)
- Verify individual tile properties within groups
- Test group deletion (entire group removed)

### Pattern/Set Placement
- Test pattern placement
- Test function set placement
- Verify start/end tile behavior
- Test connection maintenance after placement
- Test boundary cutoff for patterns/sets

### Undo/Redo
- Test undo/redo for all tile operations
- Verify memory limit enforcement
- Test undo state persistence

### Save/Load
- Test autosave (debounced 2s after changes; first run after load skipped)
- Test last-saved timestamp updates on manual save and autosave
- Test manual save and save-status feedback
- Verify JSON format (localStorage)
- Test per-user storage isolation

### Image Unwarping
- Test corner marker detection
- Test grid marker detection (optional)
- Test perspective transformation
- Test alignment with grid after unwarping
- Test fallback to corner-only detection

---

## Library (Tile Library System)

### Overview
The Library (UI title: "Library") provides organized access to tile textures, tile group textures, and background images. It supports system-provided tiles, user-uploaded tiles, and saved background images for reuse.

### Library Structure

#### 1. Tile Textures Section
- **Purpose**: Individual tile textures/images for placement on the map
- **Content**:
  - **My Tiles**: User-uploaded custom textures (16–256px square; PNG/JPG/GIF/WebP). Stored in `fcis_user_tiles` (localStorage). **Implemented.**
  - **System categories**: Core, Platforms, Interactive, Hazards (solid, spawn, goal, checkpoint, collectible, death, moving platforms, etc.). **Implemented.**
- **Display**: List of tile thumbnails with names
- **Actions**: Click to select for placement; delete on user tiles. **Implemented.**

#### 2. Tile Group Textures Section
- **Purpose**: Textures for multi-tile groups (future)
- **Status**: Placeholder — "Coming soon". **Not implemented.**

#### 3. Background Images Section
- **Purpose**: Reusable full images for level backgrounds (originals from uploads)
- **Content**: Saved originals when user approves a background placement. Stored in `fcis_background_images` (localStorage). **Implemented.**
- **Display**: Thumbnails with names (e.g. "Background 1/28/2026, 2:45:30 PM")
- **Actions**:
  - **Use**: Opens placement modal with that image so user can crop/pan/zoom and apply to current level. **Implemented.**
  - **Delete**: Removes from library. **Implemented.**
- **Flow**: Upload in Level Details (or "Use" from Library) → placement modal → crop rectangle, pan/zoom → approve → cropped image becomes level background; original is stored in this section if from upload.

#### 4. Multi-Tile Patterns Section (design, not implemented)
- **Purpose**: Reusable arrangements of multiple tiles
- **Content**:
  - System patterns: Common arrangements (stairs, platforms, etc.)
  - User patterns: Saved tile arrangements
- **Display**: Grid of pattern thumbnails with names
- **Actions**:
  - Click to select pattern
  - Preview shows tile arrangement
  - Place entire pattern at once
  - Right-click user patterns to edit/delete

#### 5. Function Sets Section (design, not implemented)
- **Purpose**: Pre-configured tile combinations with gameplay functionality
- **Content**:
  - System sets: Common functional combinations
    - Springboard + Landing Platform
    - Key + Locked Door (linked)
    - Moving Platform + Trigger Zone
    - Enemy Spawner + Patrol Area
  - User sets: Custom functional combinations
- **Display**: Grid of set thumbnails with descriptions
- **Actions**:
  - Click to select set
  - Preview shows functional relationship
  - Place entire set with connections intact
  - Right-click user sets to edit/delete

### Library Features

#### Search & Filter
- **Search**: By name, type, or description
- **Filters**:
  - Source: System / User / All
  - Type: Tile / Pattern / Set
  - Category: Platform / Hazard / Collectible / Decoration / etc.
  - Layer: Background / Primary / Foreground

#### Organization
- **Categories**: Group tiles by function/type
- **Tags**: User-assignable tags for custom organization
- **Favorites**: Star frequently-used items
- **Recent**: Show recently used items

#### User Library Management
- **Upload Tiles**: Single or bulk upload of textures
- **Create Patterns**: Select tiles on canvas, save as pattern
- **Create Sets**: Select tiles with properties, define connections, save as set
- **Edit**: Modify user-created items (name, properties, connections)
- **Delete**: Remove user-created items
- **Share**: Share user-created items with other users (future)

### System Library Defaults

#### Tile Pictures (System)
- Solid Platform (Blue)
- Spawn Point (Green)
- Level Win (Gold)
- Teleporter (Purple)
- Death Tile (Red)
- Hazard Zone (Dark Red)
- One-Way Platform (Cyan)
- Breakable Block (Orange)
- Moving Platform (Yellow)
- Spring/Jump Pad (Pink)
- Key (Bronze)
- Locked Door (Brown)
- Enemy Spawner (Magenta)
- Collectible (Light Blue)
- Background Decoration (Gray)
- Foreground Decoration (Dark Gray)

#### Multi-Tile Patterns (System)
- **Staircase**: Ascending/descending steps
- **Platform Bridge**: Horizontal platform section
- **Wall Section**: Vertical wall
- **Corner Pieces**: Inner/outer corners
- **Platform with Decoration**: Platform with background/foreground tiles

#### Function Sets (System)
- **Springboard Set**: Spring pad + safe landing platform
- **Key & Door Set**: Key + matching locked door (pre-linked)
- **Moving Platform Set**: Moving platform + start/end markers
- **Enemy Patrol Set**: Enemy spawner + patrol boundaries
- **Collectible Path**: Series of collectibles in safe path
- **Hazard Crossing**: Hazard zone with safe crossing points

### User Library Workflow

#### Creating Tile Pictures
1. Upload texture/image file (square aspect ratio, max 256×256px)
   - Single upload or bulk upload supported
2. System validates: square aspect ratio, size within limits
3. If texture doesn't match gridSize exactly, scales to fit (maintains aspect ratio)
4. Define tile properties (type, physics, layer)
5. Save to user library (localStorage, per-user)

#### Creating Multi-Tile Patterns
1. Place tiles on canvas in desired arrangement (contiguous/touching tiles form groups)
2. Select one or more tile groups (multi-select with Ctrl/Cmd + click)
3. Click "Save to Library" button in Selected Object Details panel
4. Choose: Personal Library or System Library (admin only)
5. Name pattern and add description
6. Pattern saved - can be placed as single unit
7. **Note**: Patterns are simply shapes of grouped (touching) tiles or multi-selects of groups

#### Creating Function Sets
1. Place tiles with desired properties (contiguous/touching tiles form groups)
2. Select one or more tile groups (multi-select with Ctrl/Cmd + click)
3. Define start tile and end tile (for teleporters, etc.)
4. Configure functional properties (e.g., spring force, key ID)
5. Click "Save to Library" button in Selected Object Details panel
6. Choose: Personal Library or System Library (admin only)
7. Name set and add description
8. Set saved - maintains connections when placed
9. **Connection Behavior**: End tile moves with its group, but if left behind, that becomes the new teleport destination
10. **Placement Origin**: Patterns and sets placed with bottom-left corner as origin (matches coordinate system)
11. **Visualization**: Connections shown with lines/arrows and highlight colors in editor

### Library UI Components

#### Library Panel Layout
```
┌─────────────────────────┐
│  Tile Library           │
├─────────────────────────┤
│  [Search] [Filter ▼]    │
├─────────────────────────┤
│  [Pictures] [Patterns]  │
│  [Function Sets]        │
├─────────────────────────┤
│  [System] [User]        │
├─────────────────────────┤
│  ┌───┐ ┌───┐ ┌───┐     │
│  │   │ │   │ │   │     │
│  └───┘ └───┘ └───┘     │
│  Tile  Tile  Tile       │
│  ┌───┐ ┌───┐ ┌───┐     │
│  │   │ │   │ │   │     │
│  └───┘ └───┘ └───┘     │
│  Tile  Tile  Tile       │
└─────────────────────────┘
```

#### Tile Preview Modal
- Shows tile texture at full size
- Displays properties and metadata
- Edit button (for user tiles)
- Use button (select for placement)

#### Pattern Preview Modal
- Shows pattern layout
- Lists included tiles
- Edit button (for user patterns)
- Use button (select for placement)

#### Function Set Preview Modal
- Shows set layout
- Highlights start tile and end tile
- Shows connections between tiles
- Lists functional relationships
- Edit button (for user sets)
- Use button (select for placement)

#### Selected Object Details Panel Enhancements
- **Save to Library Button**: Appears when one or more tile groups are selected
- **Admin Option**: If user is admin, shows option to save to Personal or System library
  - **Admin Detection**: User with `id === 'admin'` or `username === 'admin'` (hardcoded admin user)
- **Multi-Group Support**: Can save multiple selected groups as a single pattern/set

---

## Open Questions

1. **Background Image**: Should background image be required or optional?
2. **Parallax Preview**: Should editor show parallax effect preview (even if not implemented)?
3. **Moving Platform Editor**: How should users define platform paths? Visual editor or coordinate list?
4. **Library Sharing**: Should users be able to share their custom tiles/patterns/sets with others? (Planned for Phase 9)
5. **Marker Design**: What should the corner/grid markers look like visually? (e.g., black squares with white borders, QR-code-like patterns)
6. **Layer Selector UI**: What form should the layer selector take? (dropdown, buttons, tabs - implementation detail)

---

## Implementation Phases

### Phase 1: Core Editor — **Done**
- Basic tile placement/selection/deletion ✅
- Grid display ✅
- Zoom and pan ✅
- Single layer (primary) — **Overtaken:** multi-layer (background, primary, foreground) + background image implemented

### Phase 2: Layer System — **Mostly done**
- Add background image layer ✅ (upload in Level Details or Library → Background Images; placement modal for crop/pan/zoom; cropped image as level background, cover; original saved to Library)
- Add background tile layer ✅
- Add foreground tile layer ✅
- Layer selection UI ✅

### Phase 3: Tile Types & Library — **Partial**
- Color coding system ✅
- Tile type definitions ✅ (DEFAULT_TILES, TILE_TYPE_COLORS)
- Properties panel for tile editing ✅
- System tile library (default tiles) ✅ (TileLibrary with Core/Platforms/Interactive/Hazards)
- User tile upload (localStorage, formats, 16–256px square) ✅ — TileUploadModal, texture rendering on canvas
- Tile library UI (pictures section) ✅ (categorized tiles; no Patterns/Function Sets)
- Layer selector with visual indicator ✅
- Individual tile storage (each cell independent) ✅
- Contiguous tile grouping for selection — **Partial** (grouping exists; multi-group unclear)
- Multi-group selection support — **Unverified**

### Phase 3.5: Level Browser & UX (Addition)
- Level Browser (Design Levels → browse/create/edit/delete) ✅
- Level delete confirmation modal with "Don't warn me again" ✅
- User preference "Don't confirm when deleting levels" in User Details ✅

### Phase 4: Patterns & Function Sets — **Not started**
- Multi-tile patterns system
- Pattern creation from selected groups (Save to Library button)
- Pattern library UI
- Function sets system
- Function set creation with start/end tiles
- Function set library UI
- System default patterns and sets
- Admin system library save option
- Overlap detection and confirmation system

### Phase 5: Advanced Features
- Moving platforms
- Enemy spawners
- Breakable blocks
- One-way platforms
- Springs/jump pads
- Keys and locked doors
- Hazard zones

### Phase 7: Export/Import & Unwarping
- Export coloring page (PDF/image with markers)
- Corner marker detection system
- Grid marker detection system (optional)
- Image unwarping/perspective correction
- Re-import unwarped background image
- Alignment with grid after unwarping

### Phase 8: Parallax (Future)
- Parallax scrolling implementation
- Layer scroll speed controls
- Preview in editor

### Phase 9: Library Sharing (Future)
- Share user-created tiles/patterns/sets
- Browse community library
- Import shared content

### Phase 10: Cloud/DB Migration (Future)
- Migrate texture storage from localStorage to cloud/DB
- Migrate level storage from localStorage to cloud/DB
- Migrate library storage from localStorage to cloud/DB
