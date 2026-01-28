import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { storageService } from '@/services/storageService';
import { logger } from '@/utils/logger';
import { TILE_TYPE_COLORS, type TileDefinition, type TileType } from '@/models/Tile';
import './TileUploadModal.css';

interface TileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTileCreated: (tile: TileDefinition) => void;
}

const TILE_TYPES: { value: TileType; label: string }[] = [
  { value: 'solid', label: 'Solid Platform' },
  { value: 'path', label: 'Decoration (Background)' },
  { value: 'spawn', label: 'Spawn Point' },
  { value: 'goal', label: 'Goal / Win' },
  { value: 'checkpoint', label: 'Checkpoint' },
  { value: 'teleporter', label: 'Teleporter' },
  { value: 'death', label: 'Hazard / Death' },
  { value: 'collectible', label: 'Collectible' },
  { value: 'bumper', label: 'Bumper Block' },
  { value: 'platform', label: 'Moving Platform' },
];

export function TileUploadModal({ isOpen, onClose, onTileCreated }: TileUploadModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tileType, setTileType] = useState<TileType>('solid');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setTileType('solid');
    setImageData(null);
    setImageSize(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (PNG, JPG, GIF, or WebP)');
      return;
    }

    // Read and validate image
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;

        // Validate square aspect ratio
        if (width !== height) {
          setError(`Image must be square. Got ${width}×${height}px`);
          setImageData(null);
          setImageSize(null);
          return;
        }

        // Validate size range (16-256px)
        if (width < 16 || width > 256) {
          setError(`Image must be between 16×16 and 256×256 pixels. Got ${width}×${height}px`);
          setImageData(null);
          setImageSize(null);
          return;
        }

        setImageData(dataUrl);
        setImageSize({ width, height });
        
        // Auto-fill name from filename if empty
        if (!name) {
          const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
          setName(fileName);
        }
      };
      img.onerror = () => {
        setError('Failed to load image');
        setImageData(null);
        setImageSize(null);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter a tile name');
      return;
    }

    if (!imageData || !imageSize) {
      setError('Please select an image');
      return;
    }

    setIsLoading(true);

    try {
      const tile: TileDefinition = {
        id: `user_tile_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: name.trim(),
        description: description.trim() || `Custom ${tileType} tile`,
        type: tileType,
        texture: {
          url: imageData,
          width: imageSize.width,
          height: imageSize.height,
        },
        platformType: tileType === 'path' ? 'oneWay' : 'solid',
        properties: {},
        source: 'user',
      };

      await storageService.saveUserTile(tile);

      logger.info('User tile created', {
        component: 'TileUploadModal',
        operation: 'createTile',
        tileId: tile.id,
      });

      onTileCreated(tile);
      handleClose();
    } catch (err) {
      logger.error('Failed to create tile', {
        component: 'TileUploadModal',
        operation: 'createTile',
      }, { error: err instanceof Error ? err.message : String(err) });
      setError('Failed to save tile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="tile-upload-modal-overlay" onClick={handleClose}>
      <div className="tile-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tile-upload-modal-header">
          <h2>Upload Tile</h2>
          <button className="tile-upload-modal-close" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="tile-upload-modal-body">
          {error && <div className="tile-upload-error">{error}</div>}

          {/* Image Upload */}
          <div className="tile-upload-field">
            <label>Tile Image</label>
            <div className="tile-upload-image-area">
              {imageData ? (
                <div className="tile-upload-preview">
                  <img src={imageData} alt="Preview" />
                  <div className="tile-upload-preview-info">
                    {imageSize?.width}×{imageSize?.height}px
                  </div>
                </div>
              ) : (
                <div className="tile-upload-placeholder">
                  <span className="tile-upload-placeholder-icon">+</span>
                  <span>Click to select image</span>
                  <span className="tile-upload-hint">Square, 16–256px</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleFileSelect}
                className="tile-upload-file-input"
              />
            </div>
          </div>

          {/* Name */}
          <div className="tile-upload-field">
            <label htmlFor="tile-name">Name</label>
            <input
              id="tile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Tile"
              maxLength={50}
            />
          </div>

          {/* Description */}
          <div className="tile-upload-field">
            <label htmlFor="tile-description">Description (optional)</label>
            <input
              id="tile-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description"
              maxLength={100}
            />
          </div>

          {/* Type */}
          <div className="tile-upload-field">
            <label htmlFor="tile-type">Tile Type</label>
            <select
              id="tile-type"
              value={tileType}
              onChange={(e) => setTileType(e.target.value as TileType)}
            >
              {TILE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <div
              className="tile-type-indicator"
              style={{ backgroundColor: TILE_TYPE_COLORS[tileType] }}
              title={`Type color: ${tileType}`}
            />
          </div>

          <div className="tile-upload-modal-actions">
            <button
              type="button"
              className="tile-upload-cancel"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tile-upload-submit"
              disabled={isLoading || !imageData}
            >
              {isLoading ? 'Saving...' : 'Add Tile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
