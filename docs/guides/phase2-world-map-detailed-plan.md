# Phase 2: World Map System — Detailed Implementation Plan

**Last Updated:** February 10, 2026  
**Status:** In progress — Commit 1, 2 & 3 done; Commit 4 (layers, integration, polish) next.  
**Goal:** Enable world map creation and level organization in a platformer-style overworld (Mario, Sonic, Metroid): paths first, then level stops along paths. Designed for kids to draw maps on paper (9.5×11 in), scan them, and overlay paths and levels.

**Current status & next steps:** Editor shell (route, store, canvas, pan/zoom, save/load, 9.5×11), path drawing (Bezier, draw path, edit control points, anchor+handle UX, right-click add/remove point, color/thickness, delete path), **Commit 1.6** background image upload/crop/place (BackgroundImagePlacementModal), and **Commit 3** stops along paths are implemented. Stops: add at path end, select/drag to move t, remove stop, assign level from game’s levels (dropdown), “Open in Level Editor” when a stop has a level. **Recent UX:** Edit path / Place stop toggle; click-anywhere-on-path (36px); Deselect; selected path shadow/glow; new stops 50% then midpoint of largest gap (getNextStopT); Position t 0.5% steps; Levels panel; path+stop toolbars one row with wrap; canvas resize on toolbar change. **Next:** Commit 4 — layers, integration & polish; see Suggested next steps below.

**Estimated Duration:** 3–4 weeks

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles & Platformer Theme](#design-principles--platformer-theme)
3. [Current Status & Prerequisites](#current-status--prerequisites)
4. [Architecture & Data Model](#architecture--data-model)
5. [File Structure](#file-structure)
6. [Single Branch & Commit Plan](#single-branch--commit-plan)
7. [Commit 1: Editor Shell](#commit-1-editor-shell)
8. [Commit 2: Path Drawing](#commit-2-path-drawing)
9. [Commit 3: Stops Along Paths](#commit-3-stops-along-paths)
10. [Commit 4: Layers, Integration & Polish](#commit-4-layers-integration--polish)
11. [Testing Strategy](#testing-strategy)
12. [Gaps & Edge Cases](#gaps--edge-cases)
13. [Document History](#document-history)

**Path drawing implementation detail:** See [World Map Path Drawing — Implementation Reference](./world-map-path-drawing-implementation.md) for full documentation of anchor+handle state, wheel behavior, line segments per curve (16 hard-coded), right-click hit thresholds, and re-do checklist.

---

## Overview

Phase 2 adds a **world map editor** with a **path-first workflow**: the user draws one or more **Bezier paths** (like roads or tracks on an overworld), then adds **stops** along each path and assigns **levels** to those stops. This matches classic platformer world maps (e.g. Super Mario Bros. overworld, Sonic zone maps, Metroid area maps) where the path defines the journey and levels are stops along the way.

The map is **not tile-based** (unlike the level editor). Coordinates are continuous; the canvas is a free-form drawing surface. Default map size is **9.5×11 inch proportions** so kids can draw their map on standard paper, scan it, and use it as the background; paths and level stops are then drawn on top.

### In Scope

- World map editor: canvas with 9.5×11 default aspect ratio, pan/zoom, load/save.
- **Path-first:** Draw Bezier path(s), then add stops along the path; assign a level (from the game’s levels) to any stop. Multiple paths supported (e.g. branching routes).
- Stops: add, remove, move along path (change `t`); assign or unassign level; “Open in Level Editor” from a stop.
- Background image: optional (e.g. scanned hand-drawn map); upload/crop/place like level editor.
- Layers: draw order (background → paths → stops); visibility toggles.
- Navigation: dashboard entry; open level editor from a stop; back to dashboard.

### Out of Scope for Phase 2

- Playing the game from the world map (WorldMapView / play mode).
- Multiple world maps per game (single world map per game for Phase 2).
- Tile-based grid on the world map.

---

## Design Principles & Platformer Theme

- **Path-first, levels as stops:** The path is the primary object; levels are optional attachments at stops. Order of stops along the path defines progression (start → end).
- **9.5×11 for drawing and scanning:** Default dimensions match standard paper so hand-drawn maps scan 1:1; logical units (e.g. 100 per inch) keep aspect ratio and allow precise overlay.
- **Continuous space:** No grid; free-form placement. Optional grid overlay for alignment only (Phase 2 can omit).
- **Multiple paths:** Support more than one path (e.g. main route + branch to secret level). Each path has its own control points and ordered stops.
- **Visual clarity:** Paths read like roads/tracks; stops read as nodes/dots; level-assigned stops can show icon or label. Color/thickness per path for variety.
- **Future play mode:** Data model should support “start” stop and path order so that later we can implement “player moves along path and enters level at stop.”

---

## Current Status & Prerequisites

- **Phase 1 complete:** Games, levels, IndexedDB; `storageService.saveWorldMap`, `loadWorldMap`, `deleteWorldMap` exist.
- **Models:** `WorldMap`, `WorldMapLevelNode`, `WorldMapPath` exist in `src/models/WorldMap.ts`. Phase 2 will **extend** the path model (add stops) and **change default dimensions** to 9.5×11. Level nodes may be deprecated in favor of path stops, or kept for “floating” levels off-path (optional).
- **Routing:** React Router in `App.tsx`; add route(s) for world map editor.
- **Logging:** Use `src/utils/logger` per `docs/guides/logging-guide.md`.

---

## Architecture & Data Model

### Coordinate System

- **World space (map):** Origin top-left. `x` right, `y` down. Units: logical (e.g. 100 per inch). Default map size 950×1100 (9.5×11 at 100 units/inch). **Not tile-based** — floating-point coordinates.
- **Viewport:** Visible rectangle in world space; pan and zoom move/scale the viewport.
- **Canvas (screen):** Origin top-left. Transform: world → screen with `(worldX - viewportX) * scale`, `(worldY - viewportY) * scale`; inverse for hit-testing.

### Map Dimensions (9.5×11)

- **Default:** `width = 950`, `height = 1100` (aspect ratio 9.5 : 11). Interpret as 9.5×11 inches at 100 logical units per inch. When a scanned background is used, 1 inch on paper = 100 units.
- **Creation:** `createWorldMap` default in `WorldMap.ts` will use `width: 950`, `height: 1100` (update from current 5000). Validation max can stay 50000 or scale proportionally.
- **Resize (optional):** User may resize map (e.g. for different paper); preserve aspect ratio option.

### Data Model Changes (Phase 2)

Existing `WorldMap` and `WorldMapPath` are extended as follows. **Implement in Commit 1 (model) or when paths are added.**

**WorldMap** (existing; change defaults)

| Field                | Type                  | Notes                                  |
|----------------------|-----------------------|----------------------------------------|
| `id`, `gameId`, `title` | string             | As now                                 |
| `backgroundImageUrl` | string?               | Optional (e.g. scanned drawing)        |
| `width`              | number                | **Default 950** (9.5 in at 100/in)     |
| `height`             | number                | **Default 1100** (11 in at 100/in)     |
| `levelNodes`         | WorldMapLevelNode[]   | Optional; use for “floating” levels or deprecate |
| `paths`              | WorldMapPath[]        | Paths with stops (see below)           |
| `createdAt`, `updatedAt` | number             | As now                                 |

**WorldMapPath** (extend with stops)

| Field           | Type                  | Notes                                    |
|-----------------|-----------------------|------------------------------------------|
| `id`            | string                | Unique path ID                           |
| `controlPoints` | Point[]               | Bezier control points (2 = line, 3 = quadratic, 4 = cubic) |
| `stops`         | WorldMapPathStop[]    | **New.** Ordered stops along the path   |
| `color`         | string?               | Stroke color (default e.g. #333)         |
| `thickness`     | number?               | Stroke width (default 2)                 |

**WorldMapPathStop** (new)

| Field      | Type   | Notes                                          |
|------------|--------|------------------------------------------------|
| `id`       | string | Unique stop ID                                 |
| `t`        | number | Position along path curve, 0 ≤ t ≤ 1            |
| `levelId`  | string?| If set, this stop is a level; otherwise waypoint|

- **Order:** Stops are ordered by `t` (or by array index). Defines progression along the path (start → end). For play mode later: player advances along path by visiting stops; entering a level at a stop with `levelId`.
- **Backward compatibility:** Existing `fromLevelId` / `toLevelId` on `WorldMapPath` can be removed or ignored; progression is defined by `stops[]` only.

**WorldMapLevelNode** (existing)

- Keep for now. Use either (a) only path stops for levels, or (b) path stops + level nodes for “levels not on a path” (e.g. secret area). Phase 2 can use **only path stops** and leave `levelNodes` empty or for a future “floating level” feature.

### Storage

- Existing: `saveWorldMap`, `loadWorldMap`, `deleteWorldMap`. Add `listWorldMapsByGameId(gameId)` if multiple maps per game later.

---

## File Structure

```
src/
├── components/
│   └── world-map-editor/
│       ├── WorldMapEditor.tsx           # Container, toolbar, header (Save, Back)
│       ├── WorldMapCanvas.tsx          # Canvas, pan/zoom, draw paths & stops
│       ├── PathEditor.tsx              # Inline or panel: path creation/editing
│       ├── WorldMapPropertiesPanel.tsx  # Map details; selected path or stop props
│       └── *.css
├── stores/
│   └── worldMapStore.ts                 # worldMap, viewport, selection, tool
├── utils/
│   └── bezier.ts                       # Evaluate Bezier, arc length, t from position, hit-test
```

Routes: e.g. `/game/:gameId/worldmap` or `/worldmap/:worldMapId`.

---

## Single Branch & Commit Plan

**Branch:** `feature/phase2-world-map` (one branch for all Phase 2 work).

**Commits (each a logical, shippable slice):**

1. **Commit 1: Editor shell** — Route, dashboard entry, worldMapStore, canvas, pan/zoom, 9.5×11 default, load/save, optional background image (for scan).
2. **Commit 2: Path drawing** — Bezier utils, draw path (control points), edit control points, path color/thickness, delete path. No stops yet.
3. **Commit 3: Stops along paths** — Add/remove/move stop along path; assign level to stop; draw stops on path; “Open in Level Editor” from stop; validation (levelId from same game).
4. **Commit 4: Layers, integration & polish** — Layer visibility toggles, dashboard entry check, performance (cull/throttle), keyboard shortcuts (e.g. Save), any missing UX.

Workflow after Phase 2: open world map → draw path(s) → add stops along path(s) → assign levels to stops → save. Optionally upload scanned drawing as background.

---

## Commit 1: Editor Shell

### Objective

Route, empty canvas, pan/zoom, load/save, default 9.5×11, optional background. No paths or stops yet.

### Development Steps

#### 1.1 Model and default dimensions

- [x] In `src/models/WorldMap.ts`: set default `width` to **950** and `height` to **1100** in `createWorldMap`. Ensure validation allows these (and optionally preserves max 50000). Add short comment: “Default 9.5×11 inch proportion (100 units per inch).”
- [x] (Optional) Add `WorldMapPathStop` interface and `stops?: WorldMapPathStop[]` to `WorldMapPath` in the same file so Commit 2/3 don’t need a separate model commit. If `WorldMapPath` currently has `fromLevelId`/`toLevelId`, add `stops` and treat `fromLevelId`/`toLevelId` as deprecated for new code.

#### 1.2 Routing and entry

- [x] Add route in `App.tsx`: e.g. `/game/:gameId/worldmap` — resolve or create world map for that game, then show editor.
- [x] Dashboard: when a game is selected, show “World map” (or “Edit world map”). Click → create map if none exists (`createWorldMap({ gameId, title: 'World Map 1' })`, save), then navigate to editor.
- [x] Create `WorldMapEditor` component: header (title, Save, Back to Dashboard), content area for canvas. Load map in `useEffect` from route params.

#### 1.3 World map store

- [x] Create `src/stores/worldMapStore.ts`: state `worldMap`, `viewport: { x, y, scale }`, `saveStatus`, `selectedPathId`, `selectedStopId` (for later). Actions: `setWorldMap`, `setViewport`, `panViewport`, `zoomViewport`, `setSaveStatus`. Log at INFO/DEBUG per logging guide.

#### 1.4 Canvas and viewport

- [x] Create `WorldMapCanvas`: single canvas, world→screen transform using viewport. Map bounds = worldMap.width × worldMap.height. Draw background (color or `backgroundImageUrl` if set). Pan (e.g. drag), zoom (wheel or buttons), min/max scale (e.g. 0.1–4).

#### 1.5 Save / load

- [x] Load: when entering editor, `storageService.loadWorldMap(worldMapId)` (or create new and save). Set in store; on error show message and “Back to Dashboard”.
- [x] Save: “Save” button (and optional Ctrl+S) → `storageService.saveWorldMap(worldMap)`; set saveStatus 'saving' then 'saved' or 'error'. Debounced auto-save optional.

#### 1.6 Background image (scan)

- [x] Allow upload/crop/place for background (canvas already draws backgroundImageUrl when set). (reuse level-editor pattern). Store in `worldMap.backgroundImageUrl`. Draw under everything. Supports “draw on paper, scan, then overlay paths” workflow. Implemented via BackgroundImagePlacementModal in WorldMapEditor.

### Testing

- [x] Unit: worldMapStore (setWorldMap, viewport actions). Model: createWorldMap with default 950×1100.
- [x] Integration: storageService listWorldMapsByGameId, save/load world map; new map gets 950×1100.
- [ ] Manual: open from dashboard, pan/zoom, save, reload; optional background upload.

### Commit message

```
feat(world-map): editor shell with 9.5×11 default and pan/zoom

- Default map size 950×1100 (9.5×11 inch proportion) for drawing/scanning
- Route and dashboard entry; worldMapStore; WorldMapCanvas pan/zoom
- Load/save; optional background image for scanned hand-drawn maps
- Not tile-based; continuous coordinates
```

---

## Commit 2: Path Drawing

### Objective

Draw one or more Bezier paths: create path (place control points), edit control points, color/thickness, delete path. No stops yet.

**Implementation reference:** The path-drawing UX (anchor+handle layout, wheel-only-affects-next-point, first vs last committed angles, 16 line segments per curve segment, 48 px right-click threshold for “Add control point”) is documented in **[World Map Path Drawing — Implementation Reference](./world-map-path-drawing-implementation.md)**. Use that doc when re-doing or extending path drawing.

### Development Steps

#### 2.1 Bezier utilities

- [x] Create `src/utils/bezier.ts`:
  - `evaluateQuadratic(p0, p1, p2, t): Point`, `evaluateCubic(p0, p1, p2, p3, t): Point`, `evaluateCurve(controlPoints, t)`.
  - `distanceToCurve(point, controlPoints): number` (sample curve, min distance) for hit-test.
- [x] Support 2 points (line), 3 (quadratic), 4 (cubic). More points = poly-Bezier (cubic segments).

#### 2.2 Path creation

- [x] Tool: “Add path” or “Draw path”. User clicks to place control points (e.g. 2 for line, 4 for cubic). On “finish” (double-click or button), create `WorldMapPath`: unique id, `controlPoints`, `stops: []`, default color/thickness. Append to `worldMap.paths`, save.
- [x] Draw path on canvas (world→screen). Below stops (when added in Commit 3).

#### 2.3 Path editing

- [x] Select path: click on curve (hit-test). Show control points as draggable handles. Drag handle → update `controlPoints` in store, re-render. Optional: add control point (insert midpoint), remove control point.
- [x] Properties panel when path selected: color picker, thickness; “Delete path” button. Log add/edit/delete at INFO.

#### 2.4 Multiple paths

- [x] User can create several paths (e.g. main route + branch). Each path independent. Draw order: by array index.

### Testing

- [x] Unit: bezier.ts (evaluate, distanceToCurve). Store: addPath, updatePathControlPoints, updatePathStyle, removePath.
- [ ] Integration: create path, edit, change color/thickness, save and reload.
- [ ] Manual: draw multiple paths, edit curves, delete one.

### Commit message

```
feat(world-map): Bezier path drawing and editing

- bezier.ts: quadratic/cubic evaluate, distanceToCurve for hit-test
- Draw path tool: place control points; create path with empty stops
- Select path, drag control points; color/thickness; delete path
- Multiple paths supported
```

---

## Commit 3: Stops Along Paths

### Objective

Add, remove, and move stops along a path; assign a level to a stop; draw stops on canvas; “Open in Level Editor” from a stop. Ensure levelId is from current game.

### Development Steps

#### 3.1 Path stop model

- [x] Ensure `WorldMapPathStop` exists: `id`, `t` (0–1), `levelId?`. Path has `stops: WorldMapPathStop[]` (ordered by `t`). Update `WorldMap.ts` and `createWorldMap`/`updateWorldMap` if not done in Commit 1.

#### 3.2 Add stop along path

- [ ] “Add stop” on selected path: choose `t` (e.g. click on path to pick position, or “add at end” t=1). Create stop with unique id, `t`, `levelId: undefined`. Insert into path.stops, sort by `t`, save.
- [x] Draw stop as dot/circle at position = evaluateBezier(path.controlPoints, stop.t). Draw stops above path stroke.

#### 3.3 Move and remove stop

- [x] Select stop (click on dot). Drag along path: change `t` (project mouse move onto curve, or slider in panel). Remove stop: button in panel; remove from path.stops, save. When removing stop, if it had levelId, paths referencing that level are unchanged (level still exists; only stop is removed).

#### 3.4 Assign level to stop

- [x] When stop selected, show “Assign level” or level dropdown: list levels from `storageService.listLevels(gameId)`. On select, set stop.levelId. Validate: level must belong to current game. Optional: allow “Unassign” (clear levelId). Display level title on stop (label or tooltip).

#### 3.5 Open in level editor

- [x] When stop has levelId, show “Open in Level Editor” (or double-click stop). Navigate to `/editor/:levelId`. User can edit level and return to world map.

#### 3.6 Path with no stops

- [x] Path may have 0 stops (just a decorative or future path). No validation error. Stops can be added later.

### Testing

- [x] Unit: store addStopToPath, updateStopT, removeStop, assignLevelToStop (worldMapStore.test.ts). Level dropdown in UI uses listLevels(gameId) so levelId is from current game.
- [ ] Integration: add stops, assign levels, move stop, remove stop, save and reload; open level from stop.
- [ ] Manual: draw path, add several stops, assign levels, reorder by moving t, open level.

### Commit message

```
feat(world-map): stops along paths and level assignment

- Add/remove/move stop along path (t 0–1); assign level to stop
- Draw stops on path; level label/tooltip; Open in Level Editor
- Validate levelId from current game; path may have zero stops
```

---

## Commit 4: Layers, Integration & Polish

### Objective

Layer visibility toggles, confirm dashboard entry and navigation, performance, keyboard shortcuts, and any missing UX.

### Development Steps

#### 4.1 Layer visibility

- [ ] Draw order: background → paths → stops. Store: `layersVisible: { background, paths, stops }`. Toolbar or panel toggles; skip drawing when layer hidden.

#### 4.2 Dashboard and navigation

- [ ] Verify “World map” entry when game selected; create map if none; open editor. From editor, “Back to Dashboard” and “Open in Level Editor” from stop both work.

#### 4.3 Performance

- [ ] RequestAnimationFrame for draw; cull off-screen paths/stops if needed; throttle pan/zoom. Target 60fps for typical map size.

#### 4.4 Keyboard and UX

- [ ] Ctrl+S / Cmd+S save; Escape clear selection. Optional: Delete key to delete selected path or selected stop.

#### 4.5 Edge cases and polish

- [ ] Empty map: no paths; “Draw your first path” or similar hint. Resize map (optional): preserve 9.5×11 or free aspect. Undo/redo (optional for Phase 2): can be listed as future improvement.

### Testing

- [ ] Manual: full flow — dashboard → world map → draw path → add stops → assign levels → save → reload; open level from stop; toggle layers; keyboard save.

### Commit message

```
feat(world-map): layers, integration, and polish

- Layer visibility toggles (background, paths, stops)
- Dashboard entry and navigation verified; performance pass
- Keyboard: Ctrl+S save, Escape clear selection
```

---

## Testing Strategy

- **Unit:** worldMapStore (viewport, selection, path/stop CRUD); bezier.ts; WorldMap model (defaults, validation).
- **Integration:** Load/save world map; add path, add stops, assign levels; persist and reload.
- **Manual:** Path-first workflow: draw path → add stops → assign levels; scan background; open level from stop; multiple paths; layer toggles.

**Acceptance:** User can create a world map (9.5×11 default), draw one or more Bezier paths, add stops along paths, assign game levels to stops, open levels from stops, optionally use a scanned drawing as background, and state persists across reloads.

---

## Gaps & Edge Cases

- **Duplicate level on two stops:** Allowed (e.g. same level reachable from two branches). No validation preventing it.
- **Path with 0 control points or 1 point:** Validate minimum 2 points for a path (line segment). Optional: reject empty controlPoints on save.
- **Stop t outside 0–1:** Clamp to [0, 1] or validate on add/update.
- **Level deleted from game:** If a stop’s levelId references a level that was deleted, show “Level not found” in UI and offer to unassign. Don’t break load; optional cleanup job or on-load fix.
- **Existing paths (fromLevelId/toLevelId):** If loading maps that already have paths with the old shape (no `stops`), either migrate on load (e.g. create two stops at t=0 and t=1 with those levelIds) or support both: if `path.stops` is empty and fromLevelId/toLevelId exist, treat as legacy and show/edit as path with two implicit stops until user edits (then write back as stops).
- **Start stop for play mode:** Optional `isStart?: boolean` on one stop per path (or per map) for future play mode. Phase 2 can omit; add when implementing WorldMapView.
- **Path direction:** Stops are ordered by `t`; direction is implicit (start = low t, end = high t). Enough for Phase 2.
- **Undo/redo:** Not required for Phase 2; document as future improvement.
- **Touch/trackpad:** Pan/zoom should work with touch; hit-test and drag for paths/stops should work with touch events.

### Later to-do (post–Commit 2)

- **Path smoothing:** When drawing paths, make the curve smooth (tangent-continuous) at each interior anchor by keeping the previous anchor’s out-handle collinear with the new segment’s in-handle. See [World Map Path Drawing — Implementation Reference](./world-map-path-drawing-implementation.md) §9 Later to-do.

---

## Document History

| Version | Date       | Changes                                                                 |
|---------|------------|-------------------------------------------------------------------------|
| 1.0     | 2026-01-31 | Initial detailed plan                                                   |
| 1.1     | 2026-01-31 | 9.5×11 default; path-first workflow; stops along path; single branch with 4 commits; platformer theme; gaps and edge cases |
| 1.2     | 2026-01-31 | Added later to-do: path smoothing (see path-drawing implementation doc §9). |
| 1.3     | 2026-01-31 | Implementation reference note: segment count (16) and right-click threshold (48 px). |
| 1.4     | 2026-01-31 | Status and next steps summary; marked Commit 1.2, 2.2, 2.3 done. |
| 1.5     | 2026-02-10 | Documented recent UX: Edit/Place stop mode, path selection threshold, deselect, shadow/glow, stop placement (getNextStopT), Levels panel, toolbar row layout, canvas resize. Added Suggested next steps. |

**Document version:** 1.5  
**Phase:** 2 (World Map System)

---

## Suggested next steps

1. **Commit 4 (layers, integration, polish)** — From the plan above: layer visibility toggles (background, paths, stops); verify dashboard and navigation; performance (e.g. RequestAnimationFrame, cull/throttle); keyboard (Ctrl+S save, Escape clear selection, optional Delete for path/stop); empty-map hint; manual full-flow test.
2. **Manual testing** — Run through the [Manual Testing Plan](./manual-testing-plan.md) Section 9 (World Map): open from dashboard, draw path, add stops (confirm 50% then midpoint-of-gap), assign levels, Position t buttons, Edit path vs Place stop, Deselect, Levels panel, save and reload, open level from stop.
3. **Integration test** — Add an integration test that loads a world map, adds a path, adds stops, assigns levels, saves, reloads, and asserts persisted state (optional; can follow `storageService.test.ts` or level-editor integration pattern).
4. **Edge cases** — Level deleted but still referenced by a stop (show “Level not found” / unassign); optional legacy migration for `fromLevelId`/`toLevelId` on load.
5. **Future** — Path smoothing (see path-drawing implementation doc §9); undo/redo; touch/trackpad; WorldMapView (play mode).
