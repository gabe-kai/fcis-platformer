import { useCallback, useEffect, useRef, useState } from 'react';
import './BackgroundImagePlacementModal.css';

export interface BackgroundImagePlacementModalProps {
  isOpen: boolean;
  imageDataUrl: string;
  levelWidthCells: number;
  levelHeightCells: number;
  gridSize: number;
  onApprove: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

/**
 * Modal for placing/cropping a background image to match the level map.
 * Shows the image with a fixed-aspect-ratio rectangle (level proportions).
 * User can pan and zoom the image to position the crop; no warp/squish.
 * On approve, crops the image to the rectangle and returns the result (cover-fit in editor/game).
 */
export function BackgroundImagePlacementModal({
  isOpen,
  imageDataUrl,
  levelWidthCells,
  levelHeightCells,
  gridSize,
  onApprove,
  onCancel,
}: BackgroundImagePlacementModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 400, h: 300 });

  const levelAspect = levelWidthCells / levelHeightCells;

  // Measure container when open
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const el = containerRef.current;
    const onResize = () => {
      if (el) setContainerSize({ w: el.clientWidth, h: el.clientHeight });
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  const onImgLoad = useCallback(() => {
    const el = imgRef.current;
    if (el) setImgSize({ w: el.naturalWidth, h: el.naturalHeight });
  }, []);

  // Initial scale: fit image in container, then crop rect fits level aspect
  useEffect(() => {
    if (containerSize.w <= 0 || containerSize.h <= 0 || imgSize.w <= 0 || imgSize.h <= 0) return;
    const pad = 40;
    const aw = containerSize.w - pad * 2;
    const ah = containerSize.h - pad * 2;
    const cropW = levelAspect >= 1 ? aw : ah * levelAspect;
    const cropH = levelAspect >= 1 ? aw / levelAspect : ah;
    const needScale = Math.max(cropW / imgSize.w, cropH / imgSize.h);
    setScale(needScale);
    setPan({
      x: (containerSize.w - imgSize.w * needScale) / 2,
      y: (containerSize.h - imgSize.h * needScale) / 2,
    });
  }, [containerSize.w, containerSize.h, imgSize.w, imgSize.h, levelAspect]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((s) => Math.max(0.2, Math.min(5, s * (1 + delta))));
    },
    []
  );

  const dragRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      dragRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
    },
    [pan]
  );
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPan({
        x: dragRef.current.startPan.x + dx,
        y: dragRef.current.startPan.y + dy,
      });
    },
    []
  );
  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const handleApprove = useCallback(() => {
    const img = imgRef.current;
    if (!img || img.naturalWidth === 0 || img.naturalHeight === 0) return;
    const cw = containerSize.w;
    const ch = containerSize.h;
    const cropW = levelAspect >= 1 ? cw : ch * levelAspect;
    const cropH = levelAspect >= 1 ? cw / levelAspect : ch;
    const left = (cw - cropW) / 2;
    const top = (ch - cropH) / 2;
    // View rect (left, top, cropW, cropH) → image coords
    const ix0 = (left - pan.x) / scale;
    const iy0 = (top - pan.y) / scale;
    const iw = cropW / scale;
    const ih = cropH / scale;
    // Clamp to image
    const sx0 = Math.max(0, Math.min(img.naturalWidth, ix0));
    const sy0 = Math.max(0, Math.min(img.naturalHeight, iy0));
    const sw = Math.max(1, Math.min(img.naturalWidth - sx0, iw));
    const sh = Math.max(1, Math.min(img.naturalHeight - sy0, ih));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx0, sy0, sw, sh, 0, 0, canvas.width, canvas.height);
    onApprove(canvas.toDataURL('image/png'));
  }, [containerSize, levelAspect, pan, scale, onApprove]);

  if (!isOpen) return null;

  const cropW = levelAspect >= 1 ? containerSize.w : containerSize.h * levelAspect;
  const cropH = levelAspect >= 1 ? containerSize.w / levelAspect : containerSize.h;
  const cropLeft = (containerSize.w - cropW) / 2;
  const cropTop = (containerSize.h - cropH) / 2;

  return (
    <div className="background-placement-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="background-placement-modal">
        <h2>Place background image</h2>
        <p className="background-placement-hint">
          Drag the image to position it. Use the wheel to zoom. The rectangle shows the area that will become the
          level background (cover-fit, no squish).
        </p>
        <div
          ref={containerRef}
          className="background-placement-viewport"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imgRef}
            src={imageDataUrl}
            alt="Background"
            draggable={false}
            onLoad={onImgLoad}
            style={{
              position: 'absolute',
              left: pan.x,
              top: pan.y,
              width: imgSize.w * scale,
              height: imgSize.h * scale,
              pointerEvents: 'none',
            }}
          />
          <div
            className="background-placement-crop-frame"
            style={{
              left: cropLeft,
              top: cropTop,
              width: cropW,
              height: cropH,
            }}
          />
        </div>
        <div className="background-placement-actions">
          <button type="button" className="background-placement-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="background-placement-approve" onClick={handleApprove}>
            Use this area as background
          </button>
        </div>
      </div>
    </div>
  );
}
