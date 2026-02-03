import { useState } from 'react';
import { createPortal } from 'react-dom';
import './DeleteLevelModal.css';

interface DeleteLevelModalProps {
  isOpen: boolean;
  levelTitle: string;
  onConfirm: (dontWarnAgain: boolean) => void;
  onCancel: () => void;
}

export function DeleteLevelModal({
  isOpen,
  levelTitle,
  onConfirm,
  onCancel,
}: DeleteLevelModalProps) {
  const [dontWarnAgain, setDontWarnAgain] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(dontWarnAgain);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const modalContent = (
    <div className="delete-level-modal-overlay" onClick={handleOverlayClick}>
      <div className="delete-level-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-level-modal-header">
          <h2>Delete level?</h2>
          <button
            className="delete-level-modal-close"
            onClick={onCancel}
            aria-label="Cancel"
          >
            ×
          </button>
        </div>
        <div className="delete-level-modal-body">
          <p>
            Are you sure you want to delete <strong>"{levelTitle}"</strong>? This cannot be undone.
          </p>
          <label className="delete-level-modal-checkbox">
            <input
              type="checkbox"
              checked={dontWarnAgain}
              onChange={(e) => setDontWarnAgain(e.target.checked)}
            />
            <span>Don&apos;t warn me again</span>
          </label>
        </div>
        <div className="delete-level-modal-actions">
          <button className="delete-level-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="delete-level-modal-delete" onClick={handleConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
