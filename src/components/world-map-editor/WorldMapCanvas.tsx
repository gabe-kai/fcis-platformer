import { useRef, useEffect, useCallback, useState } from 'react';
import { useWorldMapStore } from '@/stores/worldMapStore';
import type { WorldMap } from '@/models/WorldMap';
import './WorldMapCanvas.css';

interface WorldMapCanvasProps {
  width: number;
  height: number;
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

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, worldMap.width, worldMap.height);

  if (backgroundImage && worldMap.backgroundImageUrl) {
    ctx.drawImage(backgroundImage, 0, 0, worldMap.width, worldMap.height);
  }

  ctx.restore();
}

export function WorldMapCanvas({ width, height }: WorldMapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const worldMap = useWorldMapStore((s) => s.worldMap);
  const viewport = useWorldMapStore((s) => s.viewport);
  const panViewport = useWorldMapStore((s) => s.panViewport);
  const zoomViewport = useWorldMapStore((s) => s.zoomViewport);

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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return;
      dragRef.current = { x: e.clientX, y: e.clientY };
      (e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY };
      panViewport(dx, dy);
    },
    [panViewport]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    dragRef.current = null;
    (e.target as HTMLCanvasElement).releasePointerCapture?.(e.pointerId);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
      const centerX = e.clientX - rect.left;
      const centerY = e.clientY - rect.top;
      const worldCenterX = viewport.x + (centerX - width / 2) / viewport.scale;
      const worldCenterY = viewport.y + (centerY - height / 2) / viewport.scale;
      const delta = -e.deltaY * 0.002;
      zoomViewport(worldCenterX, worldCenterY, delta);
    },
    [viewport, width, height, zoomViewport]
  );

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
  }, [worldMap, viewport, width, height, bgImage]);

  if (!worldMap) {
    return (
      <div className="world-map-canvas-wrap" style={{ width, height }}>
        <p style={{ color: '#888', padding: 16 }}>No world map loaded.</p>
      </div>
    );
  }

  return (
    <div className="world-map-canvas-wrap" style={{ width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width, height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        role="img"
        aria-label="World map canvas"
      />
    </div>
  );
}
