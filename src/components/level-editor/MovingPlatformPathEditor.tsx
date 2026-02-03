import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { logger } from '@/utils/logger';
import type { Platform } from '@/models/Platform';
import './MovingPlatformPathEditor.css';

export type PathType = 'horizontal' | 'vertical' | 'circular' | 'custom';

interface MovingPlatformPathEditorProps {
  isOpen: boolean;
  platform: Platform;
  onClose: () => void;
  onSave: (path: Array<{ x: number; y: number }>, speed: number, pathType: PathType) => void;
  gridSize: number;
}

export function MovingPlatformPathEditor({
  isOpen,
  platform,
  onClose,
  onSave,
  gridSize,
}: MovingPlatformPathEditorProps) {
  const [pathType, setPathType] = useState<PathType>(
    platform.movementPath && platform.movementPath.length > 0
      ? determinePathType(platform.movementPath)
      : 'horizontal'
  );
  const [customPath, setCustomPath] = useState<Array<{ x: number; y: number }>>(
    platform.movementPath && platform.movementPath.length > 0
      ? platform.movementPath
      : []
  );
  const [speed, setSpeed] = useState(platform.movementSpeed || 100);
  const [distance, setDistance] = useState(5); // For horizontal/vertical/circular
  const [radius, setRadius] = useState(3); // For circular
  const [centerX, setCenterX] = useState(platform.bounds.x + platform.bounds.width / 2);
  const [centerY, setCenterY] = useState(platform.bounds.y + platform.bounds.height / 2);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Generate path based on type
  useEffect(() => {
    if (pathType === 'custom') {
      // Custom path is edited manually
      return;
    }

    const startX = platform.bounds.x + platform.bounds.width / 2;
    const startY = platform.bounds.y + platform.bounds.height / 2;
    let newPath: Array<{ x: number; y: number }> = [];

    if (pathType === 'horizontal') {
      newPath = [
        { x: startX, y: startY },
        { x: startX + distance * gridSize, y: startY },
      ];
    } else if (pathType === 'vertical') {
      newPath = [
        { x: startX, y: startY },
        { x: startX, y: startY + distance * gridSize },
      ];
    } else if (pathType === 'circular') {
      // Generate circular path with 8 points
      const points: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        points.push({
          x: centerX + Math.cos(angle) * radius * gridSize,
          y: centerY + Math.sin(angle) * radius * gridSize,
        });
      }
      newPath = points;
    }

    setCustomPath(newPath);
  }, [pathType, distance, radius, centerX, centerY, platform.bounds, gridSize]);

  // Draw path preview
  useEffect(() => {
    if (!canvasRef.current || !isOpen) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 300;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (customPath.length === 0) return;

    // Scale to fit
    const allX = customPath.map((p) => p.x);
    const allY = customPath.map((p) => p.y);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(canvas.width / rangeX, canvas.height / rangeY) * 0.8;
    const offsetX = (canvas.width - rangeX * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - rangeY * scale) / 2 - minY * scale;

    // Draw path
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i < customPath.length; i++) {
      const p = customPath[i];
      const x = p.x * scale + offsetX;
      const y = p.y * scale + offsetY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    if (pathType === 'circular' && customPath.length > 0) {
      // Close the circle
      const first = customPath[0];
      const x = first.x * scale + offsetX;
      const y = first.y * scale + offsetY;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw points
    ctx.fillStyle = '#f1c40f';
    for (const p of customPath) {
      const x = p.x * scale + offsetX;
      const y = p.y * scale + offsetY;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw platform at start position
    const start = customPath[0];
    const platformX = start.x * scale + offsetX;
    const platformY = start.y * scale + offsetY;
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(
      platformX - (platform.bounds.width * scale) / 2,
      platformY - (platform.bounds.height * scale) / 2,
      platform.bounds.width * scale,
      platform.bounds.height * scale
    );
  }, [customPath, pathType, platform.bounds, isOpen]);

  const handleSave = () => {
    if (customPath.length < 2) {
      logger.warn('Path must have at least 2 points', {
        component: 'MovingPlatformPathEditor',
        operation: 'save',
      });
      return;
    }

    onSave(customPath, speed, pathType);
    logger.info('Moving platform path saved', {
      component: 'MovingPlatformPathEditor',
      operation: 'save',
      platformId: platform.id,
      pathType,
      pointCount: customPath.length,
      speed,
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (pathType !== 'custom') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert canvas click to world coordinates
    // Use the same scaling logic as the preview drawing
    if (customPath.length === 0) {
      // First point: use platform center
      const startX = platform.bounds.x + platform.bounds.width / 2;
      const startY = platform.bounds.y + platform.bounds.height / 2;
      setCustomPath([{ x: startX, y: startY }]);
      return;
    }

    // Calculate scale from existing path
    const allX = customPath.map((p) => p.x);
    const allY = customPath.map((p) => p.y);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(canvas.width / rangeX, canvas.height / rangeY) * 0.8;
    const offsetX = (canvas.width - rangeX * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - rangeY * scale) / 2 - minY * scale;

    // Convert click coordinates back to world space
    const worldX = (clickX - offsetX) / scale;
    const worldY = (clickY - offsetY) / scale;

    setCustomPath([...customPath, { x: worldX, y: worldY }]);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="moving-platform-path-editor-overlay" onClick={onClose}>
      <div className="moving-platform-path-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="moving-platform-path-editor-header">
          <h2>Edit Moving Platform Path</h2>
          <button className="close-button" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="moving-platform-path-editor-content">
          <div className="path-type-selector">
            <label>Path Type:</label>
            <select
              value={pathType}
              onChange={(e) => setPathType(e.target.value as PathType)}
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
              <option value="circular">Circular</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {pathType === 'horizontal' && (
            <div className="path-parameter">
              <label>Distance (cells):</label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                min={1}
                max={50}
              />
            </div>
          )}

          {pathType === 'vertical' && (
            <div className="path-parameter">
              <label>Distance (cells):</label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value))}
                min={1}
                max={50}
              />
            </div>
          )}

          {pathType === 'circular' && (
            <>
              <div className="path-parameter">
                <label>Radius (cells):</label>
                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  min={1}
                  max={20}
                />
              </div>
              <div className="path-parameter">
                <label>Center X:</label>
                <input
                  type="number"
                  value={centerX}
                  onChange={(e) => setCenterX(Number(e.target.value))}
                />
              </div>
              <div className="path-parameter">
                <label>Center Y:</label>
                <input
                  type="number"
                  value={centerY}
                  onChange={(e) => setCenterY(Number(e.target.value))}
                />
              </div>
            </>
          )}

          {pathType === 'custom' && (
            <div className="custom-path-info">
              <p>Click on the canvas to add path points. Path will connect points in order.</p>
              <button
                onClick={() => setCustomPath([])}
                className="clear-path-button"
              >
                Clear Path
              </button>
            </div>
          )}

          <div className="path-parameter">
            <label>Speed (pixels/second):</label>
            <input
              type="number"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              min={10}
              max={500}
            />
          </div>

          <div className="path-preview">
            <label>Path Preview:</label>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{ cursor: pathType === 'custom' ? 'crosshair' : 'default' }}
            />
          </div>

          <div className="path-info">
            <p>Path Points: {customPath.length}</p>
            {customPath.length > 0 && (
              <div className="path-points-list">
                {customPath.map((p, i) => (
                  <div key={i} className="path-point">
                    Point {i + 1}: ({Math.round(p.x)}, {Math.round(p.y)})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="moving-platform-path-editor-actions">
          <button className="save-button" onClick={handleSave}>
            Save Path
          </button>
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function determinePathType(path: Array<{ x: number; y: number }>): PathType {
  if (path.length < 2) return 'horizontal';

  // Check if all X are same (vertical)
  const allXSame = path.every((p) => p.x === path[0].x);
  if (allXSame) return 'vertical';

  // Check if all Y are same (horizontal)
  const allYSame = path.every((p) => p.y === path[0].y);
  if (allYSame) return 'horizontal';

  // Check if circular (8 points, roughly circular)
  if (path.length === 8) {
    // Simple heuristic: check if points form a rough circle
    const centerX = path.reduce((sum, p) => sum + p.x, 0) / path.length;
    const centerY = path.reduce((sum, p) => sum + p.y, 0) / path.length;
    const distances = path.map((p) => {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      return Math.sqrt(dx * dx + dy * dy);
    });
    const avgDist = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDist, 2), 0) / distances.length;
    if (variance / avgDist < 0.2) {
      // Low variance relative to average = roughly circular
      return 'circular';
    }
  }

  return 'custom';
}
