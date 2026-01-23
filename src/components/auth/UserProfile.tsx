import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import './UserProfile.css';

export function UserProfile() {
  const { user, logout, isLoading } = useAuthStore();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    logger.info('Logout initiated by user', {
      component: 'UserProfile',
      operation: 'logout',
      userId: user.id,
    });
    await logout();
  };

  return (
    <div className="user-profile">
      <div className="user-info">
        {user.avatar && (
          <img
            src={user.avatar}
            alt={user.username}
            className="user-avatar"
          />
        )}
        <div className="user-details">
          <div className="user-name">{user.username}</div>
          {user.email && <div className="user-email">{user.email}</div>}
        </div>
      </div>
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="logout-button"
        aria-label="Logout"
      >
        {isLoading ? 'Logging out...' : 'Logout'}
      </button>
    </div>
  );
}
