# World Map Path Drawing — Implementation Reference

**Purpose:** Detailed documentation of the path-drawing UX and state so the behavior can be re-implemented or extended without re-discovering the same pitfalls. Use this when re-doing path drawing, debugging “wheel changes wrong handle,” or adding features (e.g. tangent lock).

**Last updated:** January 31, 2026  
**Relevant code:** `src/stores/worldMapStore.ts`, `src/components/world-map-editor/WorldMapCanvas.tsx`, `src/utils/bezier.ts`

---

## Table of Contents

1. [Path data structure](#1-path-data-structure)
2. [Store state](#2-store-state)
3. [User flows](#3-user-flows)
4. [addPendingControlPoint logic](#4-addpendingcontrolpoint-logic)
5. [Canvas drawing](#5-canvas-drawing)
6. [Cursor and wheel](#6-cursor-and-wheel)
7. [When to clear state](#7-when-to-clear-state)
8. [Re-do checklist and gotchas](#8-re-do-checklist-and-gotchas)
9. [Later to-do](#9-later-to-do)

---

## 1. Path data structure

### Anchor + handle layout

Paths use **cubic Bezier segments** in “anchor + handles” form (Adobe/GIMP style):

- **Anchors** are points *on* the curve (start/end of each segment).
- Each anchor has an **in-handle** and **out-handle** (direction and “pull” of the curve).
- Array layout: **4 points per segment**, with shared endpoints between segments:

  `[ A0, H0_out, H1_in, A1, H1_out, H2_in, A2, ... ]`

  - Indices **0, 3, 6, …** = anchors.
  - Indices **1, 4, 7, …** = out-handles (for the previous anchor).
  - Indices **2, 5, 8, …** = in-handles (for the next anchor).

- **Segment count:** One cubic segment = 4 points; two segments = 7 points; three = 10; i.e. `(points.length - 1) / 3` segments.
- **Validity:** `(points.length - 1) % 3 === 0` and `points.length >= 4` for anchor-handle format.

### Bezier evaluation

- `src/utils/bezier.ts` — `evaluateCurve(controlPoints, t)` treats the array as poly-Bezier: each group of 4 points (with shared endpoints) is one cubic segment. So the same array works for both “raw” 4-point cubic and anchor-handle 4-point-per-segment layout.
- One segment: indices `0,1,2,3`; next segment: `3,4,5,6`; etc.

### Visual distinction

- **Anchors:** Larger dots (e.g. `ANCHOR_RADIUS_SCREEN`), often filled with a distinct color.
- **Handles:** Smaller dots (`HANDLE_RADIUS_SCREEN`), with a **line from handle to its anchor** so the user sees which handle belongs to which anchor.

---

## 2. Store state

All path-drawing state lives in `worldMapStore`. These four pieces must stay in sync:

| State | Type | Meaning |
|-------|------|--------|
| `pendingControlPoints` | `Point[]` | Control points for the path being drawn. Either `[A0]` (one anchor), or full anchor-handle array with length 4, 7, 10, … |
| `pendingHandleAngle` | `number` | Angle (radians) for the **next** segment’s in-handle. The **mouse wheel** only changes this. |
| `firstAnchorOutAngle` | `number \| null` | When **exactly one** anchor is placed, this is that anchor’s out-handle angle. Set on first click; **locked** (wheel does not change it). Cleared when we add the second point. |
| `lastAnchorCommittedOutAngle` | `number \| null` | Out-handle angle of the **last placed** anchor (2nd, 3rd, …). Set each time we add an anchor; used so the wheel does **not** change any previous anchor’s handles—only the next point’s direction. |

### Why two “committed” angles?

- **First anchor:** We don’t store its out-handle in the array until we place the second point. So we need a separate slot: `firstAnchorOutAngle`. After the second click, that handle is in the array and we clear `firstAnchorOutAngle`.
- **Second and later anchors:** The **in-handle** is stored when we add the next point. The **out-handle** is only fixed when we *place* that next point. So while waiting for the next click, the last anchor’s out-handle must not move with the wheel—we store it in `lastAnchorCommittedOutAngle` and use it for both drawing and for building the next segment when the user clicks.

**Rule of thumb:** The wheel must **only** affect the direction of the **next** point (ghost + arrow). Every *already placed* anchor’s in- and out-handles must be fixed; that’s what `firstAnchorOutAngle` and `lastAnchorCommittedOutAngle` enforce.

---

## 3. User flows

### First point

1. User clicks once → `addPendingControlPoint(point)`.
2. Store: `pendingControlPoints = [point]`, `firstAnchorOutAngle = pendingHandleAngle` (current wheel angle).
3. Canvas: Draw single anchor + its **out-handle** (from `firstAnchorOutAngle`). No curve yet.

### Waiting for second point

1. User moves mouse → ghost curve from first anchor to cursor; direction arrow at **cursor** (not at first anchor).
2. **Out-handle** of first anchor: from `firstAnchorOutAngle` (fixed).
3. **In-handle** of second (cursor) point: from `pendingHandleAngle` (wheel rotates this).
4. Wheel: only updates `pendingHandleAngle` (5° steps). Does **not** change first anchor’s out-handle.

### Second point placed

1. User clicks → `addPendingControlPoint(point)`.
2. Store: Build segment with H0_out from `firstAnchorOutAngle`, H1_in from `pendingHandleAngle`; append `[H0_out, H1_in, point]`. Set `firstAnchorOutAngle = null`, `lastAnchorCommittedOutAngle = pendingHandleAngle` (the new anchor’s out-handle).
3. We now have 4 points: `[A0, H0_out, H1_in, A1]`. Both handles for the first segment are in the array. The second anchor’s out-handle is “committed” in `lastAnchorCommittedOutAngle` (not in the array until we add a third anchor).

### Third and later points (4, 7, 10, … points)

1. Canvas shows **all** anchors and **both** handles for every *placed* anchor:
   - Handles that are already in the array are drawn from the array.
   - The **last** anchor’s **out-handle** is not in the array yet; draw it from `lastAnchorCommittedOutAngle`.
2. Ghost: from last anchor to cursor. H_out = `lastAnchorCommittedOutAngle`, H_in = `pendingHandleAngle`. Wheel only changes `pendingHandleAngle` (arrow + ghost in-handle).
3. On click: build H_out from `lastAnchorCommittedOutAngle`, H_in from `pendingHandleAngle`; append `[H_out, H_in, point]`; set `lastAnchorCommittedOutAngle = pendingHandleAngle`.

---

## 4. addPendingControlPoint logic

**File:** `src/stores/worldMapStore.ts`

```ts
// prev = current pendingControlPoints
// angle = pendingHandleAngle
// firstOut = firstAnchorOutAngle, lastOut = lastAnchorCommittedOutAngle
```

- **prev.length === 0:** First click.  
  - Set `pendingControlPoints = [point]`, `firstAnchorOutAngle = angle`.  
  - Do not set `lastAnchorCommittedOutAngle` (no “last” anchor yet).

- **prev.length === 1:** Second click.  
  - Out-handle for segment: use `firstOut` (first anchor’s locked out-handle).  
  - In-handle: use `angle`.  
  - Append `[H_out, H_in, point]`.  
  - Set `firstAnchorOutAngle = null`, `lastAnchorCommittedOutAngle = angle` (new anchor’s out-handle).

- **prev.length >= 4:** Third or later click.  
  - Out-handle for new segment: use `lastOut` (last anchor’s committed out-handle).  
  - In-handle: use `angle`.  
  - Append `[H_out, H_in, point]`.  
  - Set `lastAnchorCommittedOutAngle = angle`.

**Constant:** `DEFAULT_PENDING_HANDLE_LENGTH = 80` (world units) for handle length when building H_out / H_in.

---

## 5. Canvas drawing

**File:** `src/components/world-map-editor/WorldMapCanvas.tsx` — function `drawPaths(..., pendingHandleAngle?, firstAnchorOutAngle?, lastAnchorCommittedOutAngle?)`.

### Choosing “out” angle for last segment / ghost

Used for (a) the last anchor’s out-handle when waiting, and (b) the ghost segment’s H_out:

- If **exactly one point** and `firstAnchorOutAngle != null` → use `firstAnchorOutAngle`.
- Else if **4+ points** and `lastAnchorCommittedOutAngle != null` → use `lastAnchorCommittedOutAngle`.
- Else → use `pendingHandleAngle`.

So the wheel never changes the “out” side of the last placed anchor; it only changes the “in” side of the next point (and the arrow).

### What we draw when

- **One point:** First anchor dot + out-handle (line + handle dot) from `firstAnchorOutAngle`. If hovering, ghost curve (H0_out from `firstAnchorOutAngle`, H_in from `pendingHandleAngle`) and direction arrow at cursor.
- **4+ points, waiting for next:**  
  - Full path from array (curve + anchor/handle dots from `drawAnchorHandlePath`).  
  - **Last anchor’s out-handle** is *not* in the array: draw it explicitly from `lastAnchorCommittedOutAngle` (line + handle dot).  
  - Ghost from last anchor to cursor (H_out from `lastAnchorCommittedOutAngle`, H_in from `pendingHandleAngle`) and direction arrow at cursor.
- Curve: dashed stroke; anchors/handles: solid dots with connector lines (see `drawAnchorHandlePath`).

### Line segments per curve (how the path is drawn)

The curve is **approximated** by straight line segments. The number of segments is **fixed per curve segment** (between each pair of control points), not for the whole path:

- **Constant:** `SEGMENTS_PER_CURVE = 16` (hard-coded in `WorldMapCanvas.tsx`).
- **Helpers:** `getNumCurveSegments(pts)` returns the number of curve segments (1 for 2–4 points, 2 for 7 points, etc.). `strokeCurveWithSegmentsPerCurve(ctx, pts)` draws the path with 16 line segments between every two control points.
- **Formula:** For curve segment index `seg` (0 to numCurves−1), we sample at `t = (seg * 16 + i) / (numCurves * 16)` for `i = 1..16`, then `lineTo(evaluateCurve(pts, t))`. So 1 curve → 16 segments, 2 curves → 32 segments, N curves → 16×N segments.
- Not user-adjustable; change the constant to alter smoothness vs. performance.

### Right-click context menu (hit thresholds)

- **General path/handle hit:** `HIT_THRESHOLD_SCREEN = 12` (screen pixels) for selecting a path or hitting a handle.
- **“Add control point” on path segment:** Uses a larger threshold so right-click is easier: `PATH_SEGMENT_HIT_THRESHOLD_SCREEN = 48`. Right-click within 48 px of the curve (in screen space) shows the “Add control point” menu. Implemented by passing the larger threshold into `hitTestPath(worldPoint, PATH_SEGMENT_HIT_THRESHOLD_SCREEN)` in `handleContextMenu`.
- Path mode right-click (finish/cancel) is handled in `handlePointerDown`; `suppressNextContextMenuRef` prevents the context menu from opening immediately after finishing a path with right-click.

### Helpers

- `isWaitingForNextAnchor(pending)`: true when `pending.length === 1` or `pending.length >= 4 && (pending.length - 1) % 3 === 0`.
- `isAnchorHandleFormat(pts)`: true when `pts.length >= 4 && (pts.length - 1) % 3 === 0`.

---

## 6. Cursor and wheel

- **Path mode + waiting for next anchor:** Custom **directional arrow** cursor (SVG data URL), angle = `pendingHandleAngle`. Implemented in `getDirectionalArrowCursor(pendingHandleAngle)`; cursor style applied in canvas container.
- **Wheel in path mode:** In `handleWheel`, when `tool === 'drawPath'`, do **not** zoom. Instead: adjust `pendingHandleAngle` in **5° steps** (`(5 * Math.PI) / 180`). `e.deltaY > 0` → decrease angle; `e.deltaY < 0` → increase angle.
- **Wheel in other tools:** Zoom as usual (viewport scale).

---

## 7. When to clear state

All of these should clear or reset path-drawing state so no “committed” angle leaks into the next session:

- **clearPendingControlPoints:** Set `pendingControlPoints = []`, `pendingHandleAngle = 0`, `firstAnchorOutAngle = null`, `lastAnchorCommittedOutAngle = null`.
- **setTool(tool):** When switching away from `drawPath`, clear pending points and both angles; when switching to `drawPath`, keep current pending state (e.g. if user toggles tool).
- **setWorldMap(map):** Set `pendingControlPoints = []`, `firstAnchorOutAngle = null`, `lastAnchorCommittedOutAngle = null` (and selection) so loading another map doesn’t keep old path state.

---

## 8. Re-do checklist and gotchas

Use this when re-implementing or refactoring path drawing.

### Design decisions to preserve

1. **Wheel only affects “next” point.** Never let the wheel change an already-placed anchor’s in- or out-handle. That’s why we have `firstAnchorOutAngle` and `lastAnchorCommittedOutAngle`.
2. **Direction arrow at cursor,** not at the last anchor. The arrow shows where the *next* anchor’s in-handle will point.
3. **First anchor gets one visible handle** (out-handle) until the second point is placed; **second and later anchors** get **both** handles (in from array, out from `lastAnchorCommittedOutAngle` until the next point is added).
4. **Same handle length** for ghost and for committed segments (`PENDING_GHOST_HANDLE_LENGTH` in canvas, `DEFAULT_PENDING_HANDLE_LENGTH` in store) so the curve doesn’t “jump” when placing.

### Common bugs to avoid

- **Wheel changes previous handle:** Ensure when `pendingControlPoints.length >= 4` the ghost and last anchor’s out-handle use `lastAnchorCommittedOutAngle`, not `pendingHandleAngle`.
- **Last anchor missing out-handle:** When we have 4+ points and are waiting, the last anchor’s out-handle is not in the array; it must be drawn explicitly from `lastAnchorCommittedOutAngle`.
- **Wrong angle when placing 3rd point:** When `prev.length >= 4`, the segment’s H_out must come from `lastAnchorCommittedOutAngle` in `addPendingControlPoint`, not from `pendingHandleAngle`.
- **First anchor’s handle moves with wheel:** After first click, set `firstAnchorOutAngle = pendingHandleAngle` and use that for drawing and for building the segment on second click; never use `pendingHandleAngle` for the first anchor’s out-handle after it’s placed.

### Testing ideas

- Place 1 point → scroll wheel → place 2nd point: first segment direction should match the wheel at first click, not at second.
- Place 2 points → scroll wheel → place 3rd: second segment’s in-handle should follow wheel; first segment should be unchanged.
- Place 3+ points: every placed anchor should show two handles (in and out); wheel should only move the ghost and arrow.

### File map

| What | Where |
|------|--------|
| Pending state, addPendingControlPoint, angles | `src/stores/worldMapStore.ts` |
| drawPaths, ghost, arrow, last anchor out-handle, SEGMENTS_PER_CURVE, strokeCurveWithSegmentsPerCurve, hit thresholds | `src/components/world-map-editor/WorldMapCanvas.tsx` |
| evaluateCurve, distanceToCurve, getClosestT | `src/utils/bezier.ts` |
| Path data model (WorldMapPath.controlPoints) | `src/models/WorldMap.ts` |

---

## 9. Later to-do

- **Path smoothing:** When placing new anchors, make interior joins smooth (tangent-continuous) by keeping the previous anchor’s out-handle collinear with the new segment’s in-handle. An earlier attempt (setting `H_out = lastAnchor + len * normalize(H_in - lastAnchor)` in `addPendingControlPoint`) was reverted; revisit as a future improvement so multi-segment paths don’t look blocky at anchors.

---

**Document history**

- 2026-01-31: Initial version covering anchor+handle layout, store state, flows, addPendingControlPoint, canvas drawing, cursor/wheel, clearing, and re-do checklist.
- 2026-01-31: Added Later to-do (path smoothing).
- 2026-01-31: Documented line segments per curve (SEGMENTS_PER_CURVE = 16, formula, helpers) and right-click hit thresholds (PATH_SEGMENT_HIT_THRESHOLD_SCREEN = 48 for “Add control point”).
