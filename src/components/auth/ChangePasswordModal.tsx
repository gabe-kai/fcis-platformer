import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import './ChangePasswordModal.css';

interface ChangePasswordModalProps {
  onClose: () => void;
  required?: boolean;
}

export function ChangePasswordModal({ onClose, required = false }: ChangePasswordModalProps) {
  const { changePassword, isLoading, error, setError, clearError } = useAuthStore();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (oldPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      await changePassword(oldPassword, newPassword);
      logger.info('Password changed successfully', {
        component: 'ChangePasswordModal',
        operation: 'changePassword',
      });
      // Clear form
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Close modal after a brief delay to show success
      setTimeout(() => {
        onClose();
      }, 500);
    } catch {
      // Error is already set by the store
      logger.error('Password change failed', {
        component: 'ChangePasswordModal',
        operation: 'changePassword',
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={required ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{required ? 'Password Change Required' : 'Change Password'}</h2>
          {!required && (
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          )}
        </div>

        {required && (
          <div className="modal-warning">
            <p>You must change your password before continuing.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="change-password-form">
          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="oldPassword">Current Password</label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={isLoading}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              disabled={isLoading}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={isLoading}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>

          <div className="form-actions">
            {!required && (
              <button type="button" className="cancel-button" onClick={onClose} disabled={isLoading}>
                Cancel
              </button>
            )}
            <button type="submit" className="submit-button" disabled={isLoading}>
              {isLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
