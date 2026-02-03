import { createPortal } from 'react-dom';
import './ConfirmDeleteTileGroupModal.css';

export type TileGroupMember = { cellX: number; cellY: number; tileId: string; passable: boolean };

interface ConfirmDeleteTileGroupModalProps {
  isOpen: boolean;
  tileCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-editor confirmation modal when deleting a tile group (Shift+click Delete).
 * Design: "group deletion: confirmation; single tile: no confirmation."
 */
export function ConfirmDeleteTileGroupModal({
  isOpen,
  tileCount,
  onConfirm,
  onCancel,
}: ConfirmDeleteTileGroupModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const modalContent = (
    <div className="confirm-delete-tile-group-overlay" onClick={handleOverlayClick}>
      <div className="confirm-delete-tile-group-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-delete-tile-group-header">
          <h2>Delete tile group?</h2>
          <button
            className="confirm-delete-tile-group-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="confirm-delete-tile-group-body">
          <p>
            This will remove <strong>{tileCount} tile{tileCount !== 1 ? 's' : ''}</strong> from the map.
            This cannot be undone.
          </p>
        </div>
        <div className="confirm-delete-tile-group-actions">
          <button className="confirm-delete-tile-group-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-delete-tile-group-delete" onClick={onConfirm}>
            Delete group
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
