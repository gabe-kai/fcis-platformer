import { createPortal } from 'react-dom';
import './ConfirmPlaceOverwriteModal.css';

interface ConfirmPlaceOverwriteModalProps {
  isOpen: boolean;
  tileCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-editor confirmation modal when placing over existing tiles.
 * Design: "If placement would overwrite existing tiles, entire old group highlighted in red;
 * User confirmation required to delete old group and replace with new tile."
 */
export function ConfirmPlaceOverwriteModal({
  isOpen,
  tileCount,
  onConfirm,
  onCancel,
}: ConfirmPlaceOverwriteModalProps) {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const modalContent = (
    <div className="confirm-place-overwrite-overlay" onClick={handleOverlayClick}>
      <div className="confirm-place-overwrite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-place-overwrite-header">
          <h2>Replace existing tiles?</h2>
          <button
            className="confirm-place-overwrite-close"
            onClick={onCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="confirm-place-overwrite-body">
          <p>
            This will replace <strong>{tileCount} tile{tileCount !== 1 ? 's' : ''}</strong> with the selected tile.
            Continue?
          </p>
        </div>
        <div className="confirm-place-overwrite-actions">
          <button className="confirm-place-overwrite-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-place-overwrite-replace" onClick={onConfirm}>
            Replace
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
