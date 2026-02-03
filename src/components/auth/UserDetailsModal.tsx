import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import { logger } from '@/utils/logger';
import type { User } from '@/models/User';
import { ChangePasswordModal } from './ChangePasswordModal';
import './UserDetailsModal.css';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'profile' | 'admin';

export function UserDetailsModal({ isOpen, onClose }: UserDetailsModalProps) {
  const { user, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Profile form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  
  // Admin tab state
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const isAdmin = user?.id === 'admin' || user?.username === 'admin';

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username);
      setEmail(user.email);
      setAvatar(user.avatar || '');
      setIsEditing(false);
      setError(null);
      
      // Load all users if admin
      if (isAdmin) {
        loadAllUsers();
      }
    }
  }, [isOpen, user, isAdmin]);

  const loadAllUsers = async () => {
    setAdminLoading(true);
    try {
      const users = authService.getAllUsers();
      setAllUsers(users);
    } catch (err) {
      logger.error('Failed to load users', {
        component: 'UserDetailsModal',
        operation: 'loadAllUsers',
      }, { error: err instanceof Error ? err.message : 'Unknown error' });
      setError('Failed to load users');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setError(null);
    setIsLoading(true);

    try {
      // Validate
      if (!username.trim()) {
        setError('Username is required');
        setIsLoading(false);
        return;
      }

      if (!email.trim()) {
        setError('Email is required');
        setIsLoading(false);
        return;
      }

      // Update via authService
      await authService.updateProfile({
        username: username.trim(),
        email: email.trim(),
        avatar: avatar.trim() || undefined,
      });

      // Update store
      updateProfile({
        username: username.trim(),
        email: email.trim(),
        avatar: avatar.trim() || undefined,
      });

      setIsEditing(false);
      logger.info('Profile updated successfully', {
        component: 'UserDetailsModal',
        operation: 'updateProfile',
        userId: user.id,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMsg);
      logger.error('Profile update failed', {
        component: 'UserDetailsModal',
        operation: 'updateProfile',
      }, { error: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setAvatar(user.avatar || '');
    }
    setIsEditing(false);
    setError(null);
  };

  const handlePreferenceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (!user) return;
    try {
      await authService.updateProfile({ skipDeleteConfirmation: checked });
      updateProfile({ skipDeleteConfirmation: checked });
      logger.info('Preference updated', {
        component: 'UserDetailsModal',
        operation: 'handlePreferenceChange',
        skipDeleteConfirmation: checked,
      });
    } catch (err) {
      logger.error('Failed to update preference', {
        component: 'UserDetailsModal',
        operation: 'handlePreferenceChange',
      }, { error: err instanceof Error ? err.message : 'Unknown error' });
      setError('Failed to save preference. Please try again.');
    }
  };

  const handleResetUserPassword = async (targetUserId: string) => {
    if (!isAdmin) return;

    try {
      await authService.resetUserPassword(targetUserId);
      logger.info('User password reset', {
        component: 'UserDetailsModal',
        operation: 'resetUserPassword',
        targetUserId,
      });
      // Reload users
      await loadAllUsers();
    } catch (err) {
      logger.error('Failed to reset user password', {
        component: 'UserDetailsModal',
        operation: 'resetUserPassword',
      }, { error: err instanceof Error ? err.message : 'Unknown error' });
      setError('Failed to reset user password');
    }
  };

  if (!isOpen || !user) return null;

  const modalContent = (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="user-details-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>User Details</h2>
            <button className="modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="modal-tabs">
            <button
              className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Profile
            </button>
            {isAdmin && (
              <button
                className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                User Management
              </button>
            )}
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="modal-content">
              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}

              {!isEditing ? (
                <div className="profile-view">
                  <div className="profile-section">
                    <label>Avatar</label>
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.username} className="profile-avatar" />
                    ) : (
                      <div className="profile-avatar-placeholder">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="profile-section">
                    <label>Username</label>
                    <div className="profile-value">{user.username}</div>
                  </div>

                  <div className="profile-section">
                    <label>Email</label>
                    <div className="profile-value">{user.email}</div>
                  </div>

                  <div className="profile-section">
                    <label>Provider</label>
                    <div className="profile-value">{user.provider}</div>
                  </div>

                  {user.createdAt && (
                    <div className="profile-section">
                      <label>Member Since</label>
                      <div className="profile-value">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  <div className="profile-actions">
                    <button
                      className="edit-button"
                      onClick={() => setIsEditing(true)}
                    >
                      Edit Profile
                    </button>
                    {user.provider === 'local' && (
                      <button
                        className="password-button"
                        onClick={() => setShowPasswordModal(true)}
                      >
                        Change Password
                      </button>
                    )}
                  </div>

                  <div className="preferences-section">
                    <h3>Preferences</h3>
                    <label className="preference-checkbox">
                      <input
                        type="checkbox"
                        checked={user.skipDeleteConfirmation ?? false}
                        onChange={handlePreferenceChange}
                      />
                      <span>Don&apos;t confirm when deleting levels</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="profile-edit">
                  <div className="form-group">
                    <label htmlFor="edit-username">Username</label>
                    <input
                      id="edit-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-email">Email</label>
                    <input
                      id="edit-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-avatar">Avatar URL (optional)</label>
                    <input
                      id="edit-avatar"
                      type="url"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      className="cancel-button"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      className="save-button"
                      onClick={handleSaveProfile}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>

                  <div className="preferences-section">
                    <h3>Preferences</h3>
                    <label className="preference-checkbox">
                      <input
                        type="checkbox"
                        checked={user.skipDeleteConfirmation ?? false}
                        onChange={handlePreferenceChange}
                      />
                      <span>Don&apos;t confirm when deleting levels</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Tab */}
          {activeTab === 'admin' && isAdmin && (
            <div className="modal-content">
              <div className="admin-section">
                <h3>All Users</h3>
                {adminLoading ? (
                  <div className="loading">Loading users...</div>
                ) : allUsers.length === 0 ? (
                  <div className="empty-state">No users found</div>
                ) : (
                  <div className="users-list">
                    {allUsers.map((u) => (
                      <div key={u.id} className="user-item">
                        <div className="user-item-info">
                          {u.avatar && (
                            <img src={u.avatar} alt={u.username} className="user-item-avatar" />
                          )}
                          <div>
                            <div className="user-item-name">
                              {u.username}
                              {u.id === 'admin' && <span className="admin-badge">Admin</span>}
                            </div>
                            <div className="user-item-email">{u.email}</div>
                            <div className="user-item-meta">
                              {u.provider} • {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}
                            </div>
                          </div>
                        </div>
                        {u.id !== 'admin' && u.provider === 'local' && (
                          <button
                            className="reset-password-button"
                            onClick={() => handleResetUserPassword(u.id)}
                            title="Reset user password to default"
                          >
                            Reset Password
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          required={false}
        />
      )}
    </>
  );

  return createPortal(modalContent, document.body);
}
