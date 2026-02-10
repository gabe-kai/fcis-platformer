import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { useWorldMapStore } from '@/stores/worldMapStore';
import type { WorldMap } from '@/models/WorldMap';
import type { Point } from '@/types';
import { evaluateCurve, distanceToCurve, getClosestT } from '@/utils/bezier';
import './WorldMapCanvas.css';

interface WorldMapCanvasProps {
  /** Optional fixed size; if omitted, canvas fills container and measures via ResizeObserver */
  width?: number;
  height?: number;
  /** When this changes, canvas re-measures its container (e.g. after toolbar visibility changes). */
  layoutKey?: string;
}

function screenToWorld(
  screenX: number,
  screenY: number,
  viewport: { x: number; y: number; scale: number },
  canvasWidth: number,
  canvasHeight: number
): Point {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  return {
    x: viewport.x + (screenX - centerX) / viewport.scale,
    y: viewport.y + (screenY - centerY) / viewport.scale,
  };
}

const HIT_THRESHOLD_SCREEN = 12;
/** Threshold for left-click to select a path (click anywhere on/near the curve). */
const PATH_SELECT_HIT_THRESHOLD_SCREEN = 36;
/** Larger threshold for right-click "Add control point" on path segment (easier to hit the curve). */
const PATH_SEGMENT_HIT_THRESHOLD_SCREEN = 48;
const ANCHOR_RADIUS_SCREEN = 8;
const HANDLE_RADIUS_SCREEN = 5;
const STOP_RADIUS_SCREEN = 8;
const HANDLE_LINE_SCREEN = 1;
/** Line segments drawn between every two control points (hard-coded). */
const SEGMENTS_PER_CURVE = 16;
const PENDING_ARROW_LENGTH = 24;
const PENDING_GHOST_HANDLE_LENGTH = 80;

const CURSOR_SIZE = 32;
const CURSOR_ARROW_LENGTH = 12;

/** Returns a cursor value for a directional arrow at the given angle (radians). 0 = right. */
function getDirectionalArrowCursor(angleRad: number): string {
  const deg = (angleRad * 180) / Math.PI;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CURSOR_SIZE}" height="${CURSOR_SIZE}" viewBox="0 0 ${CURSOR_SIZE} ${CURSOR_SIZE}"><g transform="rotate(${deg} 16 16)"><path d="M6 8 L6 24 L26 16 Z" fill="#6b9bd1" stroke="#fff" stroke-width="1.2"/></g></svg>`;
  const encoded = encodeURIComponent(svg);
  const hotX = Math.round(16 + CURSOR_ARROW_LENGTH * Math.cos(angleRad));
  const hotY = Math.round(16 + CURSOR_ARROW_LENGTH * Math.sin(angleRad));
  return `url("data:image/svg+xml,${encoded}") ${hotX} ${hotY}, default`;
}

function isAnchorHandleFormat(pts: Point[]): boolean {
  return pts.length >= 4 && (pts.length - 1) % 3 === 0;
}

/** True when in drawPath and we're waiting for the next anchor (1 point, or 4/7/10... points). */
function isWaitingForNextAnchor(pending: Point[]): boolean {
  if (pending.length === 1) return true;
  return pending.length >= 4 && (pending.length - 1) % 3 === 0;
}

/** Number of curve segments (between control points) in a poly-Bezier. 2–4 pts = 1, 7 pts = 2, etc. */
function getNumCurveSegments(pts: Point[]): number {
  if (pts.length < 2) return 0;
  if (pts.length <= 4) return 1;
  const n = pts.length - 1;
  return Math.floor(n / 3) + (n % 3 === 0 ? 0 : 1);
}

/** Draw a path with SEGMENTS_PER_CURVE line segments between each pair of control points. */
function strokeCurveWithSegmentsPerCurve(
  ctx: CanvasRenderingContext2D,
  pts: Point[]
) {
  if (pts.length < 2) return;
  const numCurves = getNumCurveSegments(pts);
  const first = evaluateCurve(pts, 0);
  ctx.moveTo(first.x, first.y);
  for (let seg = 0; seg < numCurves; seg++) {
    for (let i = 1; i <= SEGMENTS_PER_CURVE; i++) {
      const t = (seg * SEGMENTS_PER_CURVE + i) / (numCurves * SEGMENTS_PER_CURVE);
      const p = evaluateCurve(pts, t);
      ctx.lineTo(p.x, p.y);
    }
  }
}

function drawAnchorHandlePath(
  ctx: CanvasRenderingContext2D,
  pts: Point[],
  scale: number,
  anchorColor: string,
  handleColor: string,
  lineColor: string
) {
  const anchorR = ANCHOR_RADIUS_SCREEN / scale;
  const handleR = HANDLE_RADIUS_SCREEN / scale;
  const lineW = Math.max(0.5, HANDLE_LINE_SCREEN / scale);

  for (let k = 0; k * 3 < pts.length; k++) {
    const anchorIdx = k * 3;
    const anchor = pts[anchorIdx];
    if (!anchor) continue;

    const outIdx = anchorIdx + 1;
    const inIdx = anchorIdx - 1;

    if (outIdx < pts.length) {
      const out = pts[outIdx]!;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(out.x, out.y);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineW;
      ctx.stroke();
    }
    if (inIdx >= 0) {
      const inPt = pts[inIdx]!;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(inPt.x, inPt.y);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineW;
      ctx.stroke();
    }
  }

  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i]!;
    const isAnchor = i % 3 === 0;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, isAnchor ? anchorR : handleR, 0, Math.PI * 2);
    ctx.fillStyle = isAnchor ? anchorColor : handleColor;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = (isAnchor ? 1.5 : 1) / scale;
    ctx.stroke();
  }
}

const CHECKER_SIZE = 12;
const CHECKER_LIGHT = '#e8e8e8';
const CHECKER_DARK = '#c4c4c4';
const FRAME_STROKE = '#5a6a8a';
const FRAME_WIDTH = 2;

function makeCheckerboardPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const size = CHECKER_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const c = canvas.getContext('2d');
  if (!c) return null;
  c.fillStyle = CHECKER_LIGHT;
  c.fillRect(0, 0, size * 2, size * 2);
  c.fillStyle = CHECKER_DARK;
  c.fillRect(0, 0, size, size);
  c.fillRect(size, size, size, size);
  return ctx.createPattern(canvas, 'repeat');
}

function drawMap(
  ctx: CanvasRenderingContext2D,
  worldMap: WorldMap,
  viewport: { x: number; y: number; scale: number },
  canvasWidth: number,
  canvasHeight: number,
  backgroundImage: HTMLImageElement | null
) {
  const { x: vx, y: vy, scale } = viewport;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  ctx.save();

  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-vx, -vy);

  const hasBgImage = !!(backgroundImage && worldMap.backgroundImageUrl);
  const pattern = makeCheckerboardPattern(ctx);
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, worldMap.width, worldMap.height);
  } else {
    ctx.fillStyle = CHECKER_LIGHT;
    ctx.fillRect(0, 0, worldMap.width, worldMap.height);
  }

  if (hasBgImage) {
    ctx.drawImage(backgroundImage, 0, 0, worldMap.width, worldMap.height);
  }

  ctx.strokeStyle = FRAME_STROKE;
  ctx.lineWidth = FRAME_WIDTH / scale;
  ctx.strokeRect(0, 0, worldMap.width, worldMap.height);

  ctx.restore();
}

function drawDirectionArrow(
  ctx: CanvasRenderingContext2D,
  from: Point,
  angleRad: number,
  length: number,
  scale: number,
  color: string
) {
  const tipX = from.x + length * Math.cos(angleRad);
  const tipY = from.y + length * Math.sin(angleRad);
  const headLen = Math.max(4, length * 0.35);
  const headAngle = Math.PI / 6;
  const x1 = tipX - headLen * Math.cos(angleRad - headAngle);
  const y1 = tipY - headLen * Math.sin(angleRad - headAngle);
  const x2 = tipX - headLen * Math.cos(angleRad + headAngle);
  const y2 = tipY - headLen * Math.sin(angleRad + headAngle);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(tipX, tipY);
  ctx.moveTo(x1, y1);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, 2 / scale);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawPaths(
  ctx: CanvasRenderingContext2D,
  worldMap: WorldMap,
  viewport: { x: number; y: number; scale: number },
  canvasWidth: number,
  canvasHeight: number,
  selectedPathId: string | null,
  selectedStopId: string | null,
  /** When true, draw control points/handles for the selected path; when false, only paths and stops. */
  showSelectedPathHandles: boolean,
  /** When false, do not draw stops for the selected path (e.g. in edit path mode). */
  showSelectedPathStops: boolean,
  pendingControlPoints: Point[],
  pendingHoverWorld?: Point | null,
  pendingHandleAngle?: number,
  firstAnchorOutAngle?: number | null,
  lastAnchorCommittedOutAngle?: number | null
) {
  const { x: vx, y: vy, scale } = viewport;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-vx, -vy);

  for (const path of worldMap.paths) {
    const pts = path.controlPoints ?? [];
    if (pts.length < 2) continue;
    const color = path.color ?? '#888';
    const thickness = (path.thickness ?? 2) / scale;
    const isSelected = selectedPathId === path.id;

    if (isSelected) {
      // Very close drop shadow
      ctx.shadowOffsetX = 2 / scale;
      ctx.shadowOffsetY = 2 / scale;
      ctx.shadowBlur = 4 / scale;
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      strokeCurveWithSegmentsPerCurve(ctx, pts);
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.stroke();
      // Glow (no offset)
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.shadowBlur = 14 / scale;
      ctx.shadowColor = color;
      ctx.beginPath();
      strokeCurveWithSegmentsPerCurve(ctx, pts);
      ctx.stroke();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    ctx.beginPath();
    strokeCurveWithSegmentsPerCurve(ctx, pts);
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke();
  }

  for (const path of worldMap.paths) {
    const pts = path.controlPoints ?? [];
    const stops = path.stops ?? [];
    if (pts.length < 2) continue;
    if (path.id === selectedPathId && !showSelectedPathStops) continue;
    for (const stop of stops) {
      const p = evaluateCurve(pts, stop.t);
      const isSelected =
        selectedPathId === path.id && selectedStopId === stop.id;
      ctx.beginPath();
      ctx.arc(p.x, p.y, STOP_RADIUS_SCREEN / scale, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? '#f59e0b' : '#22c55e';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke();
    }
  }

  if (pendingControlPoints.length >= 1) {
    const waiting = isWaitingForNextAnchor(pendingControlPoints);
    const lastAnchor =
      pendingControlPoints.length === 1
        ? pendingControlPoints[0]!
        : pendingControlPoints[pendingControlPoints.length - 1]!;
    const outAngle =
      pendingControlPoints.length === 1 && firstAnchorOutAngle != null
        ? firstAnchorOutAngle
        : pendingControlPoints.length >= 4 && lastAnchorCommittedOutAngle != null
          ? lastAnchorCommittedOutAngle
          : pendingHandleAngle;
    if (pendingControlPoints.length === 1) {
      const A0 = pendingControlPoints[0]!;
      const angleForFirst = outAngle;
      if (typeof angleForFirst === 'number') {
        const len = PENDING_GHOST_HANDLE_LENGTH;
        const cos = Math.cos(angleForFirst);
        const sin = Math.sin(angleForFirst);
        const H0_out = { x: A0.x + len * cos, y: A0.y + len * sin };
        ctx.beginPath();
        ctx.moveTo(A0.x, A0.y);
        ctx.lineTo(H0_out.x, H0_out.y);
        ctx.strokeStyle = 'rgba(107, 155, 209, 0.8)';
        ctx.lineWidth = Math.max(0.5, HANDLE_LINE_SCREEN / scale);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(H0_out.x, H0_out.y, HANDLE_RADIUS_SCREEN / scale, 0, Math.PI * 2);
        ctx.fillStyle = '#9bb8e8';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1 / scale;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(A0.x, A0.y, ANCHOR_RADIUS_SCREEN / scale, 0, Math.PI * 2);
      ctx.fillStyle = '#6b9bd1';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke();
    }
    if (waiting && typeof pendingHandleAngle === 'number') {
      if (pendingHoverWorld) {
        const len = PENDING_GHOST_HANDLE_LENGTH;
        const angleOut = typeof outAngle === 'number' ? outAngle : pendingHandleAngle;
        const cosOut = Math.cos(angleOut);
        const sinOut = Math.sin(angleOut);
        const cosIn = Math.cos(pendingHandleAngle);
        const sinIn = Math.sin(pendingHandleAngle);
        const H_out = { x: lastAnchor.x + len * cosOut, y: lastAnchor.y + len * sinOut };
        const H_in = {
          x: pendingHoverWorld.x - len * cosIn,
          y: pendingHoverWorld.y - len * sinIn,
        };
        const ghostPts = [lastAnchor, H_out, H_in, pendingHoverWorld];
        ctx.beginPath();
        strokeCurveWithSegmentsPerCurve(ctx, ghostPts);
        ctx.setLineDash([8 / scale, 6 / scale]);
        ctx.strokeStyle = 'rgba(107, 155, 209, 0.6)';
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
        ctx.setLineDash([]);
        drawDirectionArrow(
          ctx,
          pendingHoverWorld,
          pendingHandleAngle,
          PENDING_ARROW_LENGTH / scale,
          scale,
          '#6b9bd1'
        );
      }
    }
    if (
      pendingControlPoints.length >= 4 &&
      waiting &&
      typeof lastAnchorCommittedOutAngle === 'number'
    ) {
      const len = PENDING_GHOST_HANDLE_LENGTH;
      const cos = Math.cos(lastAnchorCommittedOutAngle);
      const sin = Math.sin(lastAnchorCommittedOutAngle);
      const H_out = {
        x: lastAnchor.x + len * cos,
        y: lastAnchor.y + len * sin,
      };
      ctx.beginPath();
      ctx.moveTo(lastAnchor.x, lastAnchor.y);
      ctx.lineTo(H_out.x, H_out.y);
      ctx.strokeStyle = 'rgba(107, 155, 209, 0.8)';
      ctx.lineWidth = Math.max(0.5, HANDLE_LINE_SCREEN / scale);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(H_out.x, H_out.y, HANDLE_RADIUS_SCREEN / scale, 0, Math.PI * 2);
      ctx.fillStyle = '#9bb8e8';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1 / scale;
      ctx.stroke();
    }
    if (!(waiting && pendingControlPoints.length === 1)) {
      ctx.strokeStyle = '#6b9bd1';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([6 / scale, 4 / scale]);
      if (pendingControlPoints.length >= 4) {
        ctx.beginPath();
        strokeCurveWithSegmentsPerCurve(ctx, pendingControlPoints);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      if (isAnchorHandleFormat(pendingControlPoints)) {
        drawAnchorHandlePath(
          ctx,
          pendingControlPoints,
          scale,
          '#6b9bd1',
          '#9bb8e8',
          'rgba(107, 155, 209, 0.8)'
        );
      } else {
        const r = pendingControlPoints.length === 1
          ? ANCHOR_RADIUS_SCREEN / scale
          : HANDLE_RADIUS_SCREEN / scale;
        ctx.fillStyle = '#6b9bd1';
        for (const pt of pendingControlPoints) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  const selectedPath = selectedPathId
    ? worldMap.paths.find((p) => p.id === selectedPathId)
    : null;
  if (showSelectedPathHandles && selectedPath?.controlPoints && selectedPath.controlPoints.length >= 2) {
    if (isAnchorHandleFormat(selectedPath.controlPoints)) {
      drawAnchorHandlePath(
        ctx,
        selectedPath.controlPoints,
        scale,
        '#f59e0b',
        '#fbbf24',
        'rgba(245, 158, 11, 0.7)'
      );
    } else {
      const r = HANDLE_RADIUS_SCREEN / scale;
      for (const pt of selectedPath.controlPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5 / scale;
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

export function WorldMapCanvas({ width: widthProp, height: heightProp, layoutKey }: WorldMapCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const draggingHandleRef = useRef<{ pathId: string; pointIndex: number } | null>(null);
  const draggingStopRef = useRef<{ pathId: string; stopId: string } | null>(null);
  const suppressNextContextMenuRef = useRef(false);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const width = widthProp ?? size.width;
  const height = heightProp ?? size.height;
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [contextMenu, setContextMenu] = useState<
    | { x: number; y: number; pathId: string; type: 'add'; t: number }
    | { x: number; y: number; pathId: string; type: 'remove'; pointIndex: number }
    | null
  >(null);
  const worldMap = useWorldMapStore((s) => s.worldMap);
  const viewport = useWorldMapStore((s) => s.viewport);
  const tool = useWorldMapStore((s) => s.tool);
  const pendingControlPoints = useWorldMapStore((s) => s.pendingControlPoints);
  const selectedPathId = useWorldMapStore((s) => s.selectedPathId);
  const selectedStopId = useWorldMapStore((s) => s.selectedStopId);
  const selectedPathEditMode = useWorldMapStore((s) => s.selectedPathEditMode);
  const setSelectedStopId = useWorldMapStore((s) => s.setSelectedStopId);
  const updateStopT = useWorldMapStore((s) => s.updateStopT);
  const panViewport = useWorldMapStore((s) => s.panViewport);
  const zoomViewport = useWorldMapStore((s) => s.zoomViewport);
  const setViewport = useWorldMapStore((s) => s.setViewport);
  const addPendingControlPoint = useWorldMapStore((s) => s.addPendingControlPoint);
  const addPath = useWorldMapStore((s) => s.addPath);
  const clearPendingControlPoints = useWorldMapStore((s) => s.clearPendingControlPoints);
  const setTool = useWorldMapStore((s) => s.setTool);
  const setSelectedPathId = useWorldMapStore((s) => s.setSelectedPathId);
  const updatePathControlPoints = useWorldMapStore((s) => s.updatePathControlPoints);
  const addPathControlPointAtT = useWorldMapStore((s) => s.addPathControlPointAtT);
  const removePathControlPoint = useWorldMapStore((s) => s.removePathControlPoint);
  const pendingHandleAngle = useWorldMapStore((s) => s.pendingHandleAngle);
  const setPendingHandleAngle = useWorldMapStore((s) => s.setPendingHandleAngle);
  const firstAnchorOutAngle = useWorldMapStore((s) => s.firstAnchorOutAngle);
  const lastAnchorCommittedOutAngle = useWorldMapStore(
    (s) => s.lastAnchorCommittedOutAngle
  );
  const [pendingHoverWorld, setPendingHoverWorld] = useState<Point | null>(null);
  const fittedMapIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!worldMap || width <= 0 || height <= 0) return;
    if (fittedMapIdRef.current === worldMap.id) return;
    fittedMapIdRef.current = worldMap.id;
    const scaleW = width / worldMap.width;
    const scaleH = height / worldMap.height;
    const scaleFit = Math.min(scaleW, scaleH);
    const scaleClamped = Math.min(4, Math.max(0.1, scaleFit));
    setViewport({
      x: worldMap.width / 2,
      y: worldMap.height / 2,
      scale: scaleClamped,
    });
  }, [worldMap, width, height, setViewport]);

  useEffect(() => {
    if (!worldMap?.backgroundImageUrl) {
      setBgImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setBgImage(img);
    img.onerror = () => setBgImage(null);
    img.src = worldMap.backgroundImageUrl;
  }, [worldMap?.backgroundImageUrl]);

  const getWorldPoint = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      return screenToWorld(screenX, screenY, viewport, rect.width, rect.height);
    },
    [viewport]
  );

  const hitTestPath = useCallback(
    (worldPoint: Point, thresholdScreen?: number): string | null => {
      if (!worldMap) return null;
      const screen = thresholdScreen ?? HIT_THRESHOLD_SCREEN;
      const thresholdWorld = screen / viewport.scale;
      let bestId: string | null = null;
      let bestD = Infinity;
      for (const path of worldMap.paths) {
        const pts = path.controlPoints ?? [];
        if (pts.length < 2) continue;
        const d = distanceToCurve(worldPoint, pts, 32);
        if (d < thresholdWorld && d < bestD) {
          bestD = d;
          bestId = path.id;
        }
      }
      return bestId;
    },
    [worldMap, viewport.scale]
  );

  const hitTestHandle = useCallback(
    (worldPoint: Point): { pathId: string; pointIndex: number } | null => {
      if (!worldMap || !selectedPathId || selectedPathEditMode !== 'editPath') return null;
      const path = worldMap.paths.find((p) => p.id === selectedPathId);
      if (!path?.controlPoints?.length) return null;
      const pts = path.controlPoints;
      const useAnchorHandle = isAnchorHandleFormat(pts);
      let best: { pathId: string; pointIndex: number } | null = null;
      let bestDist = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i]!;
        const d = Math.hypot(worldPoint.x - pt.x, worldPoint.y - pt.y);
        const rWorld = useAnchorHandle && i % 3 === 0
          ? ANCHOR_RADIUS_SCREEN / viewport.scale
          : HANDLE_RADIUS_SCREEN / viewport.scale;
        if (d <= rWorld && d < bestDist) {
          bestDist = d;
          best = { pathId: path.id, pointIndex: i };
        }
      }
      return best;
    },
    [worldMap, selectedPathId, selectedPathEditMode, viewport.scale]
  );

  const hitTestStop = useCallback(
    (worldPoint: Point): { pathId: string; stopId: string } | null => {
      if (!worldMap) return null;
      const thresholdWorld = STOP_RADIUS_SCREEN / viewport.scale;
      let best: { pathId: string; stopId: string } | null = null;
      let bestD = Infinity;
      for (const path of worldMap.paths) {
        const pts = path.controlPoints ?? [];
        const stops = path.stops ?? [];
        if (pts.length < 2) continue;
        for (const stop of stops) {
          const p = evaluateCurve(pts, stop.t);
          const d = Math.hypot(worldPoint.x - p.x, worldPoint.y - p.y);
          if (d < thresholdWorld && d < bestD) {
            bestD = d;
            best = { pathId: path.id, stopId: stop.id };
          }
        }
      }
      return best;
    },
    [worldMap, viewport.scale]
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (suppressNextContextMenuRef.current) {
        suppressNextContextMenuRef.current = false;
        setContextMenu(null);
        return;
      }
      const canvas = canvasRef.current;
      if (!canvas || !worldMap || tool !== 'select') {
        setContextMenu(null);
        return;
      }
      const worldPoint = getWorldPoint(e.clientX, e.clientY);
      if (selectedPathEditMode === 'editPath') {
        const handle = hitTestHandle(worldPoint);
        if (handle) {
          const path = worldMap.paths.find((p) => p.id === handle.pathId);
          const pts = path?.controlPoints ?? [];
          const isAnchor = handle.pointIndex % 3 === 0;
          const canRemoveAnchor = isAnchor && pts.length >= 7;
          if (canRemoveAnchor) {
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              pathId: handle.pathId,
              type: 'remove',
              pointIndex: handle.pointIndex,
            });
          }
          return;
        }
      }
      if (selectedPathEditMode === 'editPath') {
        const pathId = hitTestPath(worldPoint, PATH_SEGMENT_HIT_THRESHOLD_SCREEN);
        if (pathId) {
          const path = worldMap.paths.find((p) => p.id === pathId);
          const closest = path?.controlPoints
            ? getClosestT(worldPoint, path.controlPoints, 32)
            : null;
          if (closest) {
            setSelectedPathId(pathId);
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              pathId,
              type: 'add',
              t: closest.t,
            });
          } else {
            setContextMenu(null);
          }
        } else {
          setContextMenu(null);
        }
      } else {
        setContextMenu(null);
      }
    },
    [worldMap, tool, getWorldPoint, selectedPathEditMode, hitTestHandle, hitTestPath, setSelectedPathId]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !worldMap) return;
      closeContextMenu();
      const worldPoint = getWorldPoint(e.clientX, e.clientY);

      if (tool === 'drawPath') {
        e.preventDefault();
        if (e.button === 2) {
          suppressNextContextMenuRef.current = true;
          if (pendingControlPoints.length >= 4) {
            addPath({
              id: `path_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              controlPoints: [...pendingControlPoints],
              stops: [],
              color: '#888',
              thickness: 2,
            });
            clearPendingControlPoints();
          } else {
            clearPendingControlPoints();
          }
          setTool('select');
          return;
        }
        if (e.button === 0) {
          addPendingControlPoint(worldPoint);
          (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
        }
        return;
      }

      if (e.button === 1 || (e.button === 0 && tool === 'select')) {
        const handle = hitTestHandle(worldPoint);
        if (handle) {
          e.preventDefault();
          draggingHandleRef.current = handle;
          (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
          return;
        }
        const stopHit =
          selectedPathEditMode === 'placeStop' ? hitTestStop(worldPoint) : null;
        if (stopHit && e.button === 0) {
          e.preventDefault();
          setSelectedPathId(stopHit.pathId);
          setSelectedStopId(stopHit.stopId);
          draggingStopRef.current = stopHit;
          (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
          return;
        }
        const pathId = hitTestPath(worldPoint, PATH_SELECT_HIT_THRESHOLD_SCREEN);
        if (pathId && e.button === 0) {
          e.preventDefault();
          setSelectedPathId(pathId);
          setSelectedStopId(null);
          (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
          return;
        }
      }

      if (e.button === 0 || e.button === 1) {
        dragRef.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
      }
    },
    [
      worldMap,
      tool,
      pendingControlPoints,
      closeContextMenu,
      getWorldPoint,
      selectedPathEditMode,
      hitTestHandle,
      hitTestStop,
      hitTestPath,
      addPendingControlPoint,
      addPath,
      clearPendingControlPoints,
      setTool,
      setSelectedPathId,
      setSelectedStopId,
    ]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (tool === 'drawPath' && isWaitingForNextAnchor(pendingControlPoints)) {
        setPendingHoverWorld(getWorldPoint(e.clientX, e.clientY));
      }
      if (draggingStopRef.current && worldMap) {
        const { pathId, stopId } = draggingStopRef.current;
        const path = worldMap.paths.find((p) => p.id === pathId);
        if (path?.controlPoints && path.controlPoints.length >= 2) {
          const worldPoint = getWorldPoint(e.clientX, e.clientY);
          const result = getClosestT(worldPoint, path.controlPoints, 32);
          if (result) {
            updateStopT(pathId, stopId, result.t);
          }
        }
        return;
      }
      if (draggingHandleRef.current && worldMap) {
        const { pathId, pointIndex } = draggingHandleRef.current;
        const path = worldMap.paths.find((p) => p.id === pathId);
        if (!path?.controlPoints) return;
        const worldPoint = getWorldPoint(e.clientX, e.clientY);
        const next = [...path.controlPoints];
        const pts = path.controlPoints;
        const isAnchor = isAnchorHandleFormat(pts) && pointIndex % 3 === 0;
        if (isAnchor) {
          const anchorIdx = pointIndex;
          const outIdx = anchorIdx + 1;
          const inIdx = anchorIdx - 1;
          const delta = {
            x: worldPoint.x - pts[anchorIdx]!.x,
            y: worldPoint.y - pts[anchorIdx]!.y,
          };
          next[anchorIdx] = worldPoint;
          if (outIdx < next.length) {
            next[outIdx] = {
              x: pts[outIdx]!.x + delta.x,
              y: pts[outIdx]!.y + delta.y,
            };
          }
          if (inIdx >= 0) {
            next[inIdx] = {
              x: pts[inIdx]!.x + delta.x,
              y: pts[inIdx]!.y + delta.y,
            };
          }
        } else {
          next[pointIndex] = worldPoint;
        }
        updatePathControlPoints(pathId, next);
        return;
      }
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.x;
        const dy = e.clientY - dragRef.current.y;
        dragRef.current = { x: e.clientX, y: e.clientY };
        panViewport(dx, dy);
      }
    },
    [tool, pendingControlPoints.length, worldMap, getWorldPoint, updatePathControlPoints, updateStopT, panViewport]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    draggingHandleRef.current = null;
    draggingStopRef.current = null;
    (e.target as HTMLCanvasElement).releasePointerCapture?.(e.pointerId);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (tool === 'drawPath') {
        const stepRad = (5 * Math.PI) / 180;
        const delta = e.deltaY > 0 ? -stepRad : stepRad;
        const current = useWorldMapStore.getState().pendingHandleAngle;
        setPendingHandleAngle(current + delta);
        return;
      }
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      const worldCenterX = viewport.x + (centerX - width / 2) / viewport.scale;
      const worldCenterY = viewport.y + (centerY - height / 2) / viewport.scale;
      const delta = -e.deltaY * 0.002;
      zoomViewport(worldCenterX, worldCenterY, delta);
    },
    [tool, viewport, width, height, zoomViewport, setPendingHandleAngle]
  );

  useEffect(() => {
    if (!contextMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (document.querySelector('.world-map-canvas-context-menu')?.contains(target)) return;
      closeContextMenu();
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [contextMenu, closeContextMenu]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || (widthProp !== undefined && heightProp !== undefined)) return;
    const ro = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0]?.contentRect ?? { width: 800, height: 600 };
      setSize({ width: Math.max(100, Math.round(w)), height: Math.max(100, Math.round(h)) });
    });
    ro.observe(wrap);
    const { width: w, height: h } = wrap.getBoundingClientRect();
    setSize({
      width: Math.max(100, Math.round(w)),
      height: Math.max(100, Math.round(h)),
    });
    return () => ro.disconnect();
  }, [widthProp, heightProp]);

  useEffect(() => {
    if (widthProp !== undefined && heightProp !== undefined) return;
    if (layoutKey === undefined) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const { width: w, height: h } = wrap.getBoundingClientRect();
        setSize({
          width: Math.max(100, Math.round(w)),
          height: Math.max(100, Math.round(h)),
        });
      });
    });
    return () => cancelAnimationFrame(id);
  }, [layoutKey, widthProp, heightProp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !worldMap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    drawMap(ctx, worldMap, viewport, width, height, bgImage);
    const showSelectedPathHandles =
      selectedPathId != null && selectedPathEditMode === 'editPath';
    const showSelectedPathStops =
      selectedPathId == null || selectedPathEditMode !== 'editPath';
    drawPaths(
      ctx,
      worldMap,
      viewport,
      width,
      height,
      selectedPathId,
      selectedStopId,
      showSelectedPathHandles,
      showSelectedPathStops,
      pendingControlPoints,
      isWaitingForNextAnchor(pendingControlPoints) ? pendingHoverWorld : null,
      isWaitingForNextAnchor(pendingControlPoints) ? pendingHandleAngle : undefined,
      firstAnchorOutAngle,
      lastAnchorCommittedOutAngle
    );
  }, [
    worldMap,
    viewport,
    width,
    height,
    bgImage,
    selectedPathId,
    selectedStopId,
    selectedPathEditMode,
    pendingControlPoints,
    pendingHoverWorld,
    pendingHandleAngle,
    firstAnchorOutAngle,
    lastAnchorCommittedOutAngle,
  ]);

  if (!worldMap) {
    return (
      <div ref={wrapRef} className="world-map-canvas-wrap">
        <p style={{ color: '#888', padding: 16 }}>No world map loaded.</p>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="world-map-canvas-wrap">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor:
            tool === 'drawPath'
              ? getDirectionalArrowCursor(pendingHandleAngle)
              : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={(e) => {
          handlePointerUp(e);
          setPendingHoverWorld(null);
        }}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        role="img"
        aria-label="World map canvas"
      />
      {contextMenu && (
        <div
          className="world-map-canvas-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          role="menu"
        >
          {contextMenu.type === 'add' ? (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                addPathControlPointAtT(contextMenu.pathId, contextMenu.t);
                closeContextMenu();
              }}
            >
              Add control point
            </button>
          ) : (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                removePathControlPoint(contextMenu.pathId, contextMenu.pointIndex);
                closeContextMenu();
              }}
            >
              Remove point
            </button>
          )}
        </div>
      )}
    </div>
  );
}
