# Level Editor Design & Implementation Guide

**Last Updated:** January 31, 2026  
**Status:** Active Development - Phase 5 (Advanced Features - Moving Platforms Complete)

---

## Table of Contents

1. [Overview & Design Principles](#overview--design-principles)
2. [Architecture & Data Model](#architecture--data-model)
3. [Feature Catalog](#feature-catalog)
4. [User Guide](#user-guide)
5. [Implementation Details](#implementation-details)
6. [Testing Status](#testing-status)
7. [Next Steps](#next-steps)
8. [Lessons Learned](#lessons-learned)
9. [Future Roadmap](#future-roadmap)

---

## Overview & Design Principles

### Purpose

The Level Editor is a visual tool for creating platformer game levels. It uses a tile-based system where users can place, select, and edit tiles on a grid. The editor is designed with kids in mind - they'll print maps, color them with physical media, and re-upload them.

### Core Design Principles

1. **Uniform Tile Size**: All tiles are square and the same size (gridSize). Multi-size tiles are groups of standard tiles
2. **User-Facing Coordinates**: Tiles are numbered from bottom-left, right and up (like math graphs) for easy mapping to physical paper
3. **Smooth Scaling**: Grid scales smoothly with zoom, maintaining visual alignment
4. **Layer System**: Four distinct layers for visual organization and future parallax effects
5. **Color Coding**: Visual distinction for different tile types and functions
6. **Individual Tile Storage**: Each tile is stored separately in the grid, even when part of a visual group
7. **Grouping by Contiguity**: Contiguous/touching tiles form groups for selection, but each tile maintains independent texture and functionality

### Key User Workflows

- **Create**: Place tiles, organize into groups, save patterns
- **Edit**: Select, modify properties, rename, change layers
- **Organize**: Use layers, name groups, apply fill patterns
- **Reuse**: Save patterns to library, copy/paste groups
- **Print**: Export grid mode for coloring, re-import colored images

---

## Architecture & Data Model

### Coordinate System

#### World Coordinates (Internal)
- **Origin**: Bottom-left corner (0, 0)
- **X-axis**: Increases rightward
- **Y-axis**: Increases upward
- **Units**: Grid cells (not pixels). Map dimensions are in cell counts.

#### User-Facing Coordinates
- **Display**: Cell coordinates shown as (X, Y) starting from bottom-left
- **Example**: Bottom-left tile = (0, 0), tile to its right = (1, 0), tile above it = (0, 1)
- **Purpose**: Matches physical paper mapping where kids draw from bottom-left

#### Canvas Coordinates (Rendering)
- **Origin**: Top-left corner (standard HTML canvas)
- **Conversion**: Uses `cellToCanvas()` and `canvasToCell()` utilities
- **Implementation**: See `src/utils/cellCoordinates.ts`

### Level Data Structure

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
  
  // Background Image (cropped data URL)
  backgroundImage?: string;  // URL/data URL of cropped image
  
  // Grid Configuration
  gridSize: number;  // Grid cell size in pixels (user-configurable per level, e.g., 64, 128)
  
  // Camera
  cameraMode: 'free' | 'auto-scroll-horizontal' | 'auto-scroll-vertical';
  scrollSpeed?: number;
  
  // Player
  playerSpawn?: { x: number; y: number };
  
  // Display Names (for tiles and groups)
  tileDisplayNames?: Record<string, string>;  // Key: "cellX,cellY"
  groupDisplayNames?: Record<string, string>;  // Key: groupId
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  isShared: boolean;
  sharingScope: 'private' | 'game' | 'user' | 'public';
  isTemplate: boolean;
}
```

### Tile Cell Structure

```typescript
interface TileCell {
  passable: boolean;
  tileId?: string;        // Reference to tile definition
  layer: 'background' | 'primary' | 'foreground';
  groupId?: string;       // For grouping contiguous tiles
  displayName?: string;   // Custom name for this cell
  fillPatternId?: string; // Fill pattern ID (e.g., 'fill-bricks', 'fill-symbol-spawn')
  properties?: TileProperties;
}
```

### Tile Definition

```typescript
interface TileDefinition {
  id: string;
  name: string;
  type: TileType;
  texture?: {
    url: string;
    width: number;   // Must equal height (square only)
    height: number;  // Must equal width (square only)
  };
  defaultFillPatternId?: string;  // Default pattern for this tile type
  properties: TileProperties;
  reusable: boolean;
  source: 'system' | 'user';
  userId?: string;
  description?: string;
}
```

### Tile Pattern (Multi-Tile Groups)

```typescript
interface TilePattern {
  id: string;
  name: string;
  description?: string;
  cells: Array<{
    relX: number;  // Relative X position from pattern origin
    relY: number;  // Relative Y position from pattern origin
    tileId: string;
    passable: boolean;
    layer: 'background' | 'primary' | 'foreground';
  }>;
  source: 'system' | 'user';
  userId?: string;
  createdAt: number;
}
```

### Layer System

1. **Background Image Layer** (Z-index: -3)
   - Full-map background image
   - Cropped to level aspect ratio
   - Scales with zoom, anchors bottom-left
   - Texture mode only

2. **Background Tile Layer** (Z-index: -2)
   - Decorative tiles behind player
   - No physics/collision
   - Future: Parallax support

3. **Primary Tile Layer** (Z-index: -1)
   - Main gameplay tiles with collision
   - Physics enabled
   - Tile type determines behavior

4. **Foreground Tile Layer** (Z-index: 0)
   - Decorative tiles in front of player
   - No physics/collision
   - Future: Parallax support

---

## Feature Catalog

### ✅ Fully Implemented Features

#### Core Editor
- ✅ Tool palette (Select, Place, Delete)
- ✅ Grid display with toggle
- ✅ Zoom (mouse wheel + slider) with cursor anchoring
- ✅ Panning (middle-click drag)
- ✅ View mode toggle (Grid/Texture)
- ✅ Layer selector (Background/Primary/Foreground)
- ✅ Coordinate system (bottom-left origin)

#### Tile Management
- ✅ Single tile placement (click)
- ✅ Multi-tile placement (drag rectangle)
- ✅ Tile selection (single click)
- ✅ Group selection (contiguous tiles auto-group)
- ✅ Multi-group selection (Ctrl/Cmd + click)
- ✅ Tile deletion (single tile, no confirmation)
- ✅ Group deletion (Shift+click, confirmation modal)
- ✅ Overlap detection (red highlight + confirmation modal)
- ✅ Boundary cutoff (placement beyond edges)

#### Visual System
- ✅ Fill patterns (stripes, dots, grids, bricks, hexes, symbols)
- ✅ Pattern application (click, drag, Shift+click flood-fill)
- ✅ Texture rendering (user-uploaded tiles)
- ✅ System tile visuals (fill patterns + optional textures)
- ✅ Texture mode tinting (semi-transparent type-colored overlay)
- ✅ Selection highlighting (prominent borders, colored tints)
- ✅ Hover previews (pattern placement, clipboard ghost)

#### Background Images
- ✅ Upload via Level Details panel
- ✅ Placement modal (crop rectangle, pan/zoom)
- ✅ Library storage (original images saved)
- ✅ Reuse from library ("Use" button)
- ✅ Zoom-aware scaling (world-space, anchors bottom-left)

#### Library System
- ✅ Tile Textures section (My Tiles + system categories)
- ✅ Patterns section (saved tile groups)
- ✅ Background Images section
- ✅ Search functionality (name, description, id)
- ✅ Right-click edit (user tiles and patterns)
- ✅ Delete user items

#### Clipboard Operations
- ✅ Copy (Ctrl/Cmd + C) - works on selected groups or single tiles
- ✅ Cut (Ctrl/Cmd + X) - works on selected groups or single tiles
- ✅ Paste (Ctrl/Cmd + V) - at hovered cell
- ✅ Clipboard ghost preview (yellow/gold semi-transparent)
- ✅ Relative coordinate preservation

#### Context Menu (Right-Click)
- ✅ Position-aware (flips above/below, left/right to stay in bounds)
- ✅ Copy/Cut (individual tiles or groups)
- ✅ Paste (when clipboard has items)
- ✅ Delete (selected groups)
- ✅ Name Tile (prompt for custom name)
- ✅ Name Tile Group (prompt for group name)
- ✅ Change Layer (cycle through layers)
- ✅ Select Texture From Library (pending assignment)
- ✅ Upload Texture for Tile (opens upload modal)

#### Properties Panel
- ✅ Level Preview (minimap with viewport indicator)
- ✅ Click-to-jump navigation
- ✅ Drag-to-pan navigation
- ✅ Level Details (name, dimensions, grid toggle, zoom slider)
- ✅ Background image upload
- ✅ Selected Object Details (tile/group properties)
- ✅ Save to Library button (for patterns)
- ✅ Delete group button

#### Save/Load System
- ✅ Manual save (header button)
- ✅ Autosave (debounced 2s after changes)
- ✅ Last-saved timestamp (header indicator)
- ✅ localStorage storage (`fcis_levels`)
- ✅ JSON format (human-readable)

#### Undo/Redo System
- ✅ Undo (Ctrl/Cmd + Z)
- ✅ Redo (Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z)
- ✅ Level snapshot before each mutation
- ✅ Step limit (maxUndoSteps: 16)
- ✅ Memory-based (RAM storage)

#### Level Browser
- ✅ Create New Level
- ✅ My Levels (grid view)
- ✅ Edit/Delete levels
- ✅ Delete confirmation modal ("Don't warn me again")
- ✅ User preference persistence

#### Level Validation
- ✅ Spawn point check (warning if missing)
- ✅ Win condition check (warning if missing)
- ✅ Non-blocking warnings (can save anyway)
- ✅ Auto-update on tile changes

#### User Tile Upload
- ✅ TileUploadModal component
- ✅ Square aspect validation (16-256px)
- ✅ Format support (PNG, JPG, GIF, WebP)
- ✅ localStorage storage (`fcis_user_tiles`)
- ✅ Tile registry integration

### 🟡 Partially Implemented Features

#### Library Features
- 🟡 **Search**: Implemented for name/description/id; filters (Source/Type/Category/Layer) not yet
- 🟡 **Favorites/Recent**: Not implemented
- 🟡 **Tags**: Not implemented

#### Tile Patterns
- 🟡 **System Patterns**: Some system patterns exist; more needed
- 🟡 **Pattern Categories**: Basic categorization; could be improved
- 🟡 **Pattern Preview**: Hover preview works; could show more detail

#### Function Sets
- 🟡 **Placeholder**: "Coming soon" section in Library
- 🟡 **Design**: Interface defined; implementation not started

#### Moving Platforms
- ✅ Platform entity system (separate from tiles)
- ✅ Create Platform from tile group or single-tile selection
- ✅ Create Moving Platform from any tile(s) (single or group); opens path editor
- ✅ Make Moving Platform: convert existing platform entity to moving (Selected Object Details → Platform)
- ✅ Auto-create moving platform when placing moving platform pattern from Library
- ✅ Platform type selector (Solid, Moving, Destructible, One-Way)
- ✅ Movement path editor modal (horizontal, vertical, circular, custom)
- ✅ Path preview on canvas (dashed line, numbered points, direction arrow)
- ✅ Draggable path points on canvas (click-and-drag waypoints when platform selected)
- ✅ Animated movement preview on canvas (ping-pong along path)
- ✅ Moving Platform properties sub-panel (speed, path points, add/remove points, edit path visually)
- ✅ Speed configuration
- ✅ Platform selection (click platform or path on canvas)
- ✅ Delete Platform: button in panel + Delete/Backspace key; deleting all tiles under a platform removes the platform entity
- ✅ Clean Up Orphaned Platforms: Level Details → Utilities (removes platform entities with no tiles)

### ❌ Not Implemented (Planned)

#### Advanced Tile Types
- ❌ Enemy spawners
- ❌ Breakable blocks
- ❌ One-way platforms (visual indicator)
- ❌ Springs/jump pads
- ❌ Keys and locked doors
- ❌ Hazard zones (special behavior)
- ❌ Secret areas/hidden passages

#### Parallax System
- ❌ Layer scroll speed multipliers
- ❌ Parallax preview in editor
- ❌ Parallax controls in Properties Panel

#### Export/Import Workflow
- ❌ Export coloring page (PDF/image with markers)
- ❌ Corner marker detection
- ❌ Grid marker detection
- ❌ Image unwarping/perspective correction
- ❌ Re-import unwarped background

#### Library Sharing
- ❌ Share user-created tiles/patterns
- ❌ Browse community library
- ❌ Import shared content

#### Cloud/DB Migration
- ❌ Migrate from localStorage to cloud/DB
- ❌ Per-user storage isolation
- ❌ Backup/sync functionality

---

## User Guide

### Getting Started

1. **Open Level Browser**: Click "Design Levels" on dashboard
2. **Create Level**: Click "Create New Level" button
3. **Editor Opens**: Level editor loads with default dimensions (150×30 cells)

### Basic Operations

#### Placing Tiles
1. Select **Place Tool** (or click a tile in Library)
2. Choose **Layer** (Background/Primary/Foreground)
3. **Click** to place single tile
4. **Drag** to place rectangle of tiles
5. Selected tile/pattern shows hover preview

#### Selecting Tiles
1. Select **Select Tool**
2. **Click** a tile to select it (shows in Properties Panel)
3. Contiguous tiles auto-group
4. **Ctrl/Cmd + Click** to toggle additional groups
5. Selected groups highlighted with colored borders

#### Deleting Tiles
1. Select **Delete Tool**
2. **Click** a tile to delete it (single tile, no confirmation)
3. **Shift + Click** to delete entire group (confirmation modal)

#### Copy/Cut/Paste
1. **Select** tiles or groups (Select tool + click/Ctrl+click)
2. **Copy**: Ctrl/Cmd + C (or right-click → Copy)
3. **Cut**: Ctrl/Cmd + X (or right-click → Cut)
4. **Paste**: Hover where you want it, then Ctrl/Cmd + V (or right-click → Paste)
5. Clipboard ghost preview shows placement location

#### Right-Click Context Menu
- Right-click on canvas to open context menu
- Menu shows relevant actions based on what's clicked:
  - **Copy/Cut**: For selected items or clicked tile/group
  - **Paste**: When clipboard has items
  - **Delete**: For selected groups
  - **Name Tile/Group**: Set custom names
  - **Change Layer**: Cycle tile through layers
  - **Select Texture**: Choose texture from library
  - **Upload Texture**: Upload new texture for tile

#### Applying Fill Patterns
1. Open **Library** → **Tile Patterns** section
2. **Click** a pattern to select it
3. Ensure **Place Tool** is active
4. **Click** on tile to apply pattern
5. **Drag** to paint pattern across multiple tiles
6. **Shift + Click** to flood-fill entire connected group

#### Saving Patterns
1. **Select** one or more tile groups (Ctrl/Cmd + click for multiple)
2. Properties Panel shows "Save to Library" button
3. **Click** button, enter name
4. Pattern saved to Library → Patterns section

#### Background Images
1. **Upload**: Level Details → Background Image → Choose file
2. **Placement Modal**: Pan and zoom to position crop rectangle
3. **Approve**: Cropped image becomes level background
4. **Reuse**: Library → Background Images → "Use" → Placement modal

#### Moving Platforms
1. **From tiles (single or group):** Select tile(s) with Select tool → Properties Panel shows "Platform from tile" or "Tile group" → **Create Moving Platform** (creates entity with default path, opens path editor).
2. **From pattern:** Library → Platform tile groups → choose "Moving Platform (H)" or "(V)" → Place on canvas; a moving platform entity is created automatically with default path.
3. **Convert existing platform:** Click platform on canvas to select it → Selected Object Details → **Platform** section → **Make Moving Platform** (sets type + default path, opens path editor).
4. **Edit path:** Select moving platform → use **Edit Path** / **Edit Path Visually** in panel, or drag the numbered path points on the canvas.
5. **Speed & waypoints:** In Selected Object Details → Movement Properties (or table view), edit speed and path point coordinates; use **+ Add Point** or delete points (×) as needed.
6. **Delete:** Select platform → **Delete Platform** in panel, or press **Delete** / **Backspace**. Deleting all tiles under a platform also removes the platform entity.
7. **Cleanup:** Level Details → **Utilities** → **Clean Up Orphaned Platforms** to remove platform entities that no longer have tiles.

#### Naming Tiles/Groups
- **Via Context Menu**: Right-click → Name Tile / Name Tile Group
- **Via Properties Panel**: Click on name field, edit inline
- Names stored per-cell or per-group
- Displayed in Properties Panel and tooltips

#### Changing Layers
- **Via Context Menu**: Right-click → Change Layer (cycles through)
- **Via Tool Palette**: Select layer before placing
- **Via Properties Panel**: Edit selected tile's layer property

### Keyboard Shortcuts

- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Y**: Redo
- **Ctrl/Cmd + Shift + Z**: Redo (alternative)
- **Ctrl/Cmd + C**: Copy selection
- **Ctrl/Cmd + X**: Cut selection
- **Ctrl/Cmd + V**: Paste at hover location
- **Delete / Backspace**: Delete selected platform (when a platform is selected)
- **Middle-Click + Drag**: Pan viewport
- **Mouse Wheel**: Zoom (anchors to cursor)

### View Modes

- **Grid Mode**: Solid-color blocks only (for printing/coloring)
- **Texture Mode**: Full textures and background (in-game preview)
- Toggle via header button

---

## Implementation Details

### Viewport & Navigation

#### Zoom System
- **Min Zoom**: Longest map dimension fits viewport
- **Max Zoom**: At least 8×8 tiles visible
- **Controls**: Mouse wheel (anchors to cursor) + slider in Properties Panel
- **Implementation**: `clampZoom()` utility, `setZoom()` action

#### Panning System
- **Method**: Middle-click drag
- **Alternative**: Level Preview click-to-jump, drag-to-pan
- **Implementation**: Hidden scroll container (scrollbars hidden via CSS)
- **Source of Truth**: Container's `scrollLeft`/`scrollTop`

#### Grid Display
- **Toggle**: Tool Palette checkbox
- **Bounds**: Only drawn within map bounds
- **Scaling**: Grid cell size = `gridSize * zoom`
- **Implementation**: `drawGrid()` utility

### Rendering Pipeline

#### Render Order (Back to Front)
1. Background image (texture mode only, world-space scaled)
2. Background layer tiles
3. Primary layer tiles
4. Foreground layer tiles
5. Grid overlay (if enabled)
6. Hover highlights
7. Selection indicators
8. Clipboard ghost preview

#### View Mode Rendering
- **Grid Mode**: Solid-color blocks (`TILE_TYPE_COLORS`), no textures, no background
- **Texture Mode**: Full textures, fill patterns, background image, tint overlays

#### Fill Pattern System
- **Storage**: `TileCell.fillPatternId` (string ID)
- **Generation**: Procedural patterns via `generateFillPattern()`
- **Categories**: Stripes, Dots, Grids, Shapes, Textures, Symbols
- **Rendering**: Background layer (before texture), cached per size
- **Application**: Click, drag (brush), Shift+click (flood-fill)

#### Texture System
- **Storage**: localStorage (`fcis_user_tiles`)
- **Formats**: PNG, JPG, GIF, WebP
- **Size**: 16×16px to 256×256px (square only)
- **Validation**: Square aspect ratio enforced
- **Caching**: Texture cache in LevelCanvas component
- **Rendering**: Above fill pattern, with tint overlay in texture mode

### Clipboard System

#### Data Structure
```typescript
clipboardTiles: Array<{
  relX: number;      // Relative X from top-left origin
  relY: number;      // Relative Y from top-left origin
  tileId: string;
  passable: boolean;
  layer: 'background' | 'primary' | 'foreground';
}>
```

#### Operations
- **Copy**: Normalizes selection to top-left origin, stores relative positions
- **Cut**: Same as copy + removes tiles from map (undoable)
- **Paste**: Places at hovered cell, computes absolute positions
- **Ghost Preview**: Semi-transparent yellow/gold preview on hover

### Undo/Redo System

#### Implementation
- **Snapshots**: `structuredClone()` of entire level before each mutation
- **Storage**: `undoStack` and `redoStack` arrays (max 16 steps)
- **Actions**: All tile operations create snapshots
- **Memory**: RAM-based (no disk persistence)

#### Supported Actions
- `setTileAtCell()` - Place tile
- `removeTileAtCell()` - Delete tile (also removes platform entities that no longer have tiles)
- `removeTilesInRange()` - Delete rectangle (also removes orphaned platforms)
- `placePatternAt()` - Place pattern (auto-creates moving platform when pattern contains moving-platform tiles)
- `setTileDisplayName()` - Name tile
- `setGroupDisplayName()` - Name group
- `updateLevelDimensions()` - Resize level
- `updateLevel()` - Update level metadata
- `cutSelectionToClipboard()` - Cut operation
- `pasteClipboardAt()` - Paste operation
- `deletePlatform()` - Remove platform entity
- `cleanupOrphanedPlatforms()` - Remove all platform entities that have no tiles in their bounds

### Platform & Orphan Cleanup
- **Orphan detection**: After `removeTileAtCell()` or `removeTilesInRange()`, platforms whose bounds contain no tiles are removed in the same undo step.
- **Manual cleanup**: Level Details → Utilities → "Clean Up Orphaned Platforms" runs the same filter and reports count removed.
- **Implementation**: `filterPlatformsWithTiles()` helper in editor store; used by tile removal and by `cleanupOrphanedPlatforms()`.

### Storage System

#### localStorage Keys
- `fcis_levels`: Level data (JSON)
- `fcis_user_tiles`: User-uploaded tiles (JSON)
- `fcis_tile_patterns`: User-created patterns (JSON)
- `fcis_background_images`: Background image originals (JSON)

#### Data Format
- **Levels**: Full Level objects (JSON)
- **Tiles**: Array of TileDefinition objects (JSON)
- **Patterns**: Array of TilePattern objects (JSON)
- **Background Images**: Array of `{ id, name, url, createdAt }` (JSON)

### Context Menu System

#### Position Calculation
- Estimates menu size based on visible items
- Checks available space (above/below, left/right)
- Flips position to stay within canvas bounds
- Clamps final position to canvas edges

#### Action Availability
- **Copy/Cut**: When selection exists OR tile clicked
- **Paste**: When clipboard has items
- **Delete**: When groups selected
- **Name Tile**: When tile exists at click location
- **Name Group**: When tile is part of multi-tile group
- **Change Layer**: When tile exists
- **Texture Actions**: When tile exists

### Tile Grouping System

#### Group Detection
- **Algorithm**: `findConnectedTiles()` - flood-fill from seed tile
- **Criteria**: Same `tileId`, touching (4-directional)
- **Group ID**: Hash of sorted cell coordinates
- **Storage**: `TileCell.groupId` (optional, for display names)

#### Multi-Group Selection
- **Method**: Ctrl/Cmd + click toggles groups
- **Storage**: `selectedTileGroups` array (array of groups)
- **Primary**: Last clicked group (`selectedTileGroup`)
- **Operations**: Copy/cut/paste work on all selected groups

### Background Image System

#### Upload Flow
1. User selects file (Level Details or Library)
2. Image loaded into `BackgroundImagePlacementModal`
3. Crop rectangle shown (fixed aspect = level aspect)
4. User pans/zooms to position
5. On approve: Crop to rectangle, save as data URL
6. Original saved to Library if from upload

#### Display
- **Storage**: `level.backgroundImage` (data URL string)
- **Rendering**: World-space scaling (scales with zoom)
- **Anchor**: Bottom-left of level
- **Mode**: Texture mode only
- **Cover**: Aspect-preserved cover (no squish)

---

## Testing Status

### ✅ Tested Features

#### Unit Tests
- ✅ Editor store (initial state, actions, deletePlatform, updatePlatformProperties, cleanupOrphanedPlatforms, placePatternAt moving platform, removeTileAtCell/removeTilesInRange platform cleanup)
- ✅ Fill pattern generator (pattern generation, categories)
- ✅ Tile map utilities (setTileAtCell, removeTileAtCell)
- ✅ Level validation (spawn/win checks)
- ✅ Grid utilities (coordinate conversion)
- ✅ Logger utility
- ✅ Platform model (create, update, validate)

#### Integration Tests
- ✅ Level editor (basic operations)
- ✅ Level canvas (rendering, interactions)
- ✅ Properties panel (display, editing)
- ✅ Tool palette (tool selection)

### 🟡 Partially Tested

- 🟡 Context menu (manual testing only)
- 🟡 Clipboard operations (manual testing only)
- 🟡 Background image placement (manual testing only)
- 🟡 Pattern placement (manual testing only)

### ❌ Needs Testing

- ❌ Undo/redo edge cases (empty stacks, max steps)
- ❌ Multi-group selection edge cases
- ❌ Fill pattern flood-fill edge cases
- ❌ Context menu position calculation edge cases
- ❌ Clipboard paste boundary handling
- ❌ Level browser (create/edit/delete flows)
- ❌ User tile upload validation
- ❌ Pattern save/load from library

---

## Next Steps

### Immediate Priorities

1. **Function Sets**
   - Define interface and data model
   - Create system function sets (springboard, key+door, etc.)
   - Library UI for function sets
   - Placement with connection preservation

2. **Library Filters**
   - Source filter (System/User/All)
   - Type filter (Tile/Pattern/Set)
   - Category filter
   - Layer filter

3. **Test Coverage**
   - Add tests for context menu
   - Add tests for clipboard operations
   - Add tests for fill pattern flood-fill
   - Add edge case tests for undo/redo

### Short-Term (Next Sprint)

4. **Pattern Improvements**
   - Better pattern previews
   - Pattern categories/grouping
   - More system patterns
   - Pattern search/filter

5. **User Experience**
   - Favorites system
   - Recent items
   - Better tooltips
   - Keyboard shortcut hints

6. **Performance**
   - Optimize large level rendering
   - Texture cache improvements
   - Pattern cache optimization

### Medium-Term (Next Month)

7. **Advanced Tile Types**
   - Enemy spawners
   - Breakable blocks
   - One-way platforms
   - Springs/jump pads
   - Keys and locked doors

8. **Export/Import**
   - Export coloring page (PDF/image)
   - Corner marker system
   - Image unwarping (basic)

9. **Documentation**
    - User tutorial
    - Video walkthrough
    - API documentation

---

## Lessons Learned

### Major Struggles & Solutions

#### 1. Background Image Scaling with Zoom
**Problem**: Background image appeared "disconnected" from tiles when zooming - it didn't scale with the viewport.

**Root Cause**: Background was being scaled to canvas viewport size instead of world-space size.

**Solution**: Changed scaling calculation to use world-space dimensions (`mapWidthPixels`, `mapHeightPixels`) instead of canvas dimensions. Background now scales with zoom and stays aligned with tiles.

**Files Changed**: `src/components/level-editor/LevelCanvas.tsx` (render function)

#### 2. Fill Pattern Seamless Tiling
**Problem**: Brick and hexagon patterns had gaps and didn't tile seamlessly.

**Root Cause**: Patterns were drawn only within canvas bounds, causing edge artifacts.

**Solution**: Extended drawing loops to draw extra rows/columns beyond canvas edges, ensuring seamless wrapping. Changed brick pattern to solid fills with thin mortar lines, hexagons to filled shapes with outlines.

**Files Changed**: `src/utils/fillPatternGenerator.ts` (`generateBricks`, `generateHexagons`)

#### 3. Texture Mode Tinting Leakage
**Problem**: Semi-transparent tints were leaking between tiles, causing incorrect colors.

**Root Cause**: `globalAlpha` wasn't being reset between tile draws.

**Solution**: Wrapped each tile draw in `ctx.save()` / `ctx.restore()` to isolate alpha state.

**Files Changed**: `src/components/level-editor/LevelCanvas.tsx` (render function)

#### 4. Clipboard Copy/Cut for Individual Tiles
**Problem**: Copy/cut only worked for selected groups, not individual tiles.

**Root Cause**: `copySelectionToClipboard()` and `cutSelectionToClipboard()` only checked `selectedTileGroups`, not `selectedTileEntry`.

**Solution**: Updated both functions to check `selectedTileEntry` as fallback, creating single-tile selection array when no groups selected.

**Files Changed**: `src/stores/editorStore.ts` (clipboard functions)

#### 5. Context Menu Position Awareness
**Problem**: Context menu could appear off-screen when right-clicking near edges.

**Root Cause**: Menu was positioned at click coordinates without checking available space.

**Solution**: Calculate available space in all directions, flip menu position (above/below, left/right) to stay in bounds, clamp final position to canvas edges.

**Files Changed**: `src/components/level-editor/LevelCanvas.tsx` (context menu rendering)

#### 6. Duplicate Variable Declarations
**Problem**: Multiple instances of `selectedLayer` and `clipboardTiles` declared in store interface.

**Root Cause**: Accidental duplicate declarations during rapid development.

**Solution**: Removed duplicates, ensured single source of truth.

**Files Changed**: `src/stores/editorStore.ts` (interface definitions)

#### 7. Selection State Being Cleared
**Problem**: Selecting a tile would briefly set the selection, then immediately clear it. Properties Panel always showed "No object selected".

**Root Cause**: After `setSelectedTileEntry()` was called, we called `setSelectedPlatform(null)`. But `setSelectedPlatform` has a side effect: it clears `selectedTileEntry` to null (designed to ensure only one type of object is selected). This was immediately wiping out the selection we just made.

**Solution**: Removed the redundant `setSelectedPlatform(null)` call from the select tool handler. `setSelectedTileEntry()` already sets `selectedPlatform: null` internally, so the extra call was unnecessary and destructive.

**Files Changed**: `src/components/level-editor/LevelCanvas.tsx` (handleMouseDown select tool logic)

#### 8. Context Menu Click Handlers Not Firing
**Problem**: Clicking buttons in the context menu (Delete, Copy, etc.) did nothing - no action occurred.

**Root Cause**: A window-level click listener that closes the context menu was using capture phase (`addEventListener('click', handler, true)`), which fires BEFORE the button's onClick handlers. It was closing the menu before the button click could be processed.

**Solution**: Added check in the window click handler to ignore clicks inside the context menu: `if (target.closest('.canvas-context-menu')) return;`

**Files Changed**: `src/components/level-editor/LevelCanvas.tsx` (context menu close handler)

#### 9. CollapsibleSection Not Auto-Expanding on Selection
**Problem**: Selected Object Details section stayed collapsed when selecting a tile, even though it should auto-expand.

**Root Cause**: `CollapsibleSection` used `useState(defaultExpanded)` which only sets the initial state. When selection changed after mount, the section wouldn't expand.

**Solution**: Added `autoExpand` prop to `CollapsibleSection` that uses `useEffect` to expand when the prop becomes true.

**Files Changed**: `src/components/level-editor/CollapsibleSection.tsx`, `src/components/level-editor/PropertiesPanel.tsx`

#### 10. Right-Click Not Dismissing Tool Before Context Menu
**Problem**: Right-clicking while using Platform or Delete tool would open the context menu immediately instead of first switching to Select tool.

**Root Cause**: Two separate handlers existed: `handleMouseDown` had dismiss logic for `e.button === 2`, but `handleContextMenu` (bound to `onContextMenu`) bypassed it and opened the menu directly. `onContextMenu` fires AFTER `onMouseDown`.

**Solution**: Moved the dismiss-tool logic into `handleContextMenu` and simplified `handleMouseDown` to just return for right-clicks.

**Files Changed**: `src/components/level-editor/LevelCanvas.tsx` (handleContextMenu)

### Design Decisions

#### No Scrollbars
**Decision**: Hidden scroll container instead of visible scrollbars.

**Rationale**: Cleaner UI, more space for canvas. Navigation via middle-click drag and Level Preview is more intuitive.

**Trade-offs**: Less discoverable, but navigation hint helps.

#### Fill Patterns as Primary Visuals
**Decision**: System tiles use fill patterns as primary visuals, textures as optional overlay.

**Rationale**: Consistent visual language, works without texture uploads, symbol-based patterns are clear and recognizable.

**Trade-offs**: Less "realistic" but more game-like and consistent.

#### Relative Clipboard Coordinates
**Decision**: Clipboard stores relative coordinates (top-left origin) instead of absolute.

**Rationale**: Allows pasting anywhere, preserves relative layout, easier to reason about.

**Trade-offs**: Slightly more complex paste logic, but much more flexible.

#### Undo Snapshots (Not Command Pattern)
**Decision**: Full level snapshots instead of command objects.

**Rationale**: Simpler implementation, handles all mutations uniformly, easier to debug.

**Trade-offs**: More memory usage, but acceptable for 16-step limit.

---

## Future Roadmap

### Phase 5: Advanced Features (In Progress)
- ✅ Moving platforms (completed)
- Enemy spawners ⭐ (Next)
- Breakable blocks
- One-way platforms
- Springs/jump pads
- Keys and locked doors
- Hazard zones

### Phase 6: Function Sets
- Function set data model
- System function sets
- Function set editor
- Connection visualization
- Placement with connections

### Phase 7: Export/Import
- Export coloring page (PDF/image)
- Corner marker detection
- Grid marker detection (optional)
- Image unwarping/perspective correction
- Re-import workflow

### Phase 8: Parallax
- Layer scroll speed multipliers
- Parallax preview in editor
- Parallax controls in Properties Panel

### Phase 9: Library Sharing
- Share user-created content
- Community library browser
- Import shared content
- Rating/favorites system

### Phase 10: Cloud/DB Migration
- Migrate from localStorage
- Per-user storage isolation
- Backup/sync functionality
- Offline support

---

## Appendix: Design Diversions

### Implemented Differently Than Original Design

1. **Scrollbars**: Design specified visible scrollbars; we use hidden scroll container with middle-click drag navigation.

2. **Level Browser**: Not in original design; added as separate screen before editor.

3. **Level Deletion UX**: Uses local modal with "Don't warn me again" preference instead of simple `confirm()`.

4. **Background Image Format**: Design specified `{ url, parallaxSpeed }` object; implementation uses `string` (data URL) for simplicity.

5. **Fill Patterns**: Not in original design; added as enhancement for visual consistency and symbol-based tile identification.

6. **Context Menu**: Not in original design; added for better UX and discoverability of actions.

7. **Clipboard Operations**: Original design didn't specify; added for productivity and pattern reuse.

---

## Appendix: Open Questions

1. **Background Image**: Should background image be required or optional? (Currently optional)

2. **Parallax Preview**: Should editor show parallax effect preview even if not implemented? (Currently no)

3. **Moving Platform Editor**: Visual editor or coordinate list? (Resolved: Visual editor with path type presets + custom drawing)

4. **Library Sharing**: Timeline for sharing features? (Phase 9)

5. **Marker Design**: What should corner/grid markers look like? (TBD for export/import)

6. **Layer Selector UI**: Dropdown, buttons, or tabs? (Currently buttons in Tool Palette)

---

**Document Maintained By**: Development Team  
**Last Review**: January 2026  
**Next Review**: After Phase 5 completion
