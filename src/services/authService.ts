import { logger } from '@/utils/logger';
import type { User, CreateUserData } from '@/models/User';
import { createUser } from '@/models/User';

// Re-export User type for backward compatibility during migration
export type { User } from '@/models/User';

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

interface LocalUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // In production, this would be properly hashed
  requiresPasswordChange: boolean;
  createdAt: number;
  lastLogin?: number;
}

class AuthService {
  private readonly TOKEN_KEY = 'fcis_auth_token';
  private readonly USER_KEY = 'fcis_user';
  private readonly LOCAL_USERS_KEY = 'fcis_local_users';
  private currentUser: User | null = null;

  /**
   * Initialize default admin user if it doesn't exist
   */
  private initializeDefaultUsers(): void {
    const users = this.getLocalUsers();
    
    // Check if admin user exists
    const adminUser = users.find(u => u.username === 'admin');
    if (!adminUser) {
      const newAdminUser: LocalUser = {
        id: 'admin',
        username: 'admin',
        email: 'admin@fcis.local',
        passwordHash: this.hashPassword('ChangeMe'), // Default password
        requiresPasswordChange: true, // Must change on first login
        createdAt: Date.now(),
      };
      users.push(newAdminUser);
      this.saveLocalUsers(users);
      logger.info('Default admin user created', {
        component: 'AuthService',
        operation: 'initializeDefaultUsers',
      });
    }
  }

  /**
   * Reset admin password to default (for development/debugging only)
   * This should be removed or secured in production
   */
  resetAdminPassword(): void {
    const users = this.getLocalUsers();
    const adminUser = users.find(u => u.username === 'admin');
    
    if (adminUser) {
      adminUser.passwordHash = this.hashPassword('ChangeMe');
      adminUser.requiresPasswordChange = true;
      this.saveLocalUsers(users);
      logger.info('Admin password reset to default', {
        component: 'AuthService',
        operation: 'resetAdminPassword',
      });
    }
  }

  /**
   * Check if default admin credentials should be shown
   * Returns true if admin user doesn't exist or still requires password change
   */
  shouldShowDefaultAdminCredentials(): boolean {
    const users = this.getLocalUsers();
    const adminUser = users.find(u => u.username === 'admin');
    
    // Show if admin doesn't exist (shouldn't happen after init, but just in case)
    if (!adminUser) {
      return true;
    }
    
    // Show if admin still requires password change (first run scenario)
    return adminUser.requiresPasswordChange === true;
  }

  /**
   * Get all local users from storage
   */
  private getLocalUsers(): LocalUser[] {
    try {
      const usersStr = localStorage.getItem(this.LOCAL_USERS_KEY);
      return usersStr ? JSON.parse(usersStr) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save local users to storage
   */
  private saveLocalUsers(users: LocalUser[]): void {
    localStorage.setItem(this.LOCAL_USERS_KEY, JSON.stringify(users));
  }

  /**
   * Simple password hashing (for development only - not secure for production)
   */
  private hashPassword(password: string): string {
    // Simple hash for development - in production use bcrypt or similar
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Verify password against hash
   */
  private verifyPassword(password: string, hash: string): boolean {
    return this.hashPassword(password) === hash;
  }

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.currentUser = null;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    // Note: We don't reset local users to preserve the admin account
  }

  /**
   * Initialize auth service - load user from storage if available
   */
  init(): void {
    try {
      // Initialize default users
      this.initializeDefaultUsers();
      
      const storedUser = localStorage.getItem(this.USER_KEY);
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        logger.info('User loaded from storage', {
          component: 'AuthService',
          operation: 'init',
          userId: this.currentUser?.id,
        });
      }
    } catch (error) {
      logger.error('Failed to load user from storage', {
        component: 'AuthService',
        operation: 'init',
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Login with username and password (local authentication)
   */
  async loginLocal(username: string, password: string): Promise<User> {
    // Trim whitespace from inputs
    username = username.trim();
    password = password.trim();

    logger.info('Local login attempt', {
      component: 'AuthService',
      operation: 'loginLocal',
      username,
    });

    try {
      const users = this.getLocalUsers();
      const localUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (!localUser) {
        logger.warn('User not found', {
          component: 'AuthService',
          operation: 'loginLocal',
          username,
        });
        throw new Error('Invalid username or password');
      }

      const passwordMatches = this.verifyPassword(password, localUser.passwordHash);
      if (!passwordMatches) {
        logger.warn('Invalid password', {
          component: 'AuthService',
          operation: 'loginLocal',
          username,
          userId: localUser.id,
        });
        throw new Error('Invalid username or password');
      }

      // Update last login
      localUser.lastLogin = Date.now();
      this.saveLocalUsers(users);

      // Create user object
      const userData: CreateUserData = {
        id: localUser.id,
        username: localUser.username,
        email: localUser.email,
        provider: 'local',
        requiresPasswordChange: localUser.requiresPasswordChange,
      };
      const user = createUser(userData);

      // Store token (simple token for local auth)
      const tokenData: TokenData = {
        accessToken: `local_${localUser.id}_${Date.now()}`,
        expiresAt: Date.now() + 3600000, // 1 hour
      };
      localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));

      this.currentUser = user;

      logger.info('User authenticated successfully (local)', {
        component: 'AuthService',
        operation: 'loginLocal',
        userId: user.id,
      });

      return user;
    } catch (error) {
      logger.error('Local authentication failed', {
        component: 'AuthService',
        operation: 'loginLocal',
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Change password for local user
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!this.currentUser || this.currentUser.provider !== 'local') {
      throw new Error('Password change only available for local users');
    }

    // Trim whitespace from inputs
    oldPassword = oldPassword.trim();
    newPassword = newPassword.trim();

    logger.info('Password change attempt', {
      component: 'AuthService',
      operation: 'changePassword',
      userId: this.currentUser.id,
    });

    try {
      const users = this.getLocalUsers();
      const localUser = users.find(u => u.id === this.currentUser!.id);

      if (!localUser) {
        throw new Error('User not found');
      }

      // Verify old password
      if (!this.verifyPassword(oldPassword, localUser.passwordHash)) {
        logger.warn('Invalid old password', {
          component: 'AuthService',
          operation: 'changePassword',
          userId: this.currentUser.id,
        });
        throw new Error('Invalid current password');
      }

      // Validate new password
      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }

      // Update password
      const newPasswordHash = this.hashPassword(newPassword);
      localUser.passwordHash = newPasswordHash;
      localUser.requiresPasswordChange = false;
      this.saveLocalUsers(users);

      // Verify the password was saved correctly
      const savedUsers = this.getLocalUsers();
      const savedUser = savedUsers.find(u => u.id === this.currentUser!.id);
      if (!savedUser || savedUser.passwordHash !== newPasswordHash) {
        logger.error('Password save verification failed', {
          component: 'AuthService',
          operation: 'changePassword',
          userId: this.currentUser.id,
        });
        throw new Error('Failed to save password. Please try again.');
      }

      // Update current user
      if (this.currentUser) {
        this.currentUser.requiresPasswordChange = false;
        localStorage.setItem(this.USER_KEY, JSON.stringify(this.currentUser));
      }

      logger.info('Password changed successfully', {
        component: 'AuthService',
        operation: 'changePassword',
        userId: this.currentUser.id,
      });
    } catch (error) {
      logger.error('Password change failed', {
        component: 'AuthService',
        operation: 'changePassword',
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Login with OAuth provider
   */
  async login(
    provider: 'google' | 'microsoft',
    token: string,
    userInfo: {
      id?: string;
      sub?: string;
      name?: string;
      displayName?: string;
      email?: string;
      picture?: string;
      avatar?: string;
    }
  ): Promise<User> {
    logger.info('User login attempt', {
      component: 'AuthService',
      operation: 'login',
      provider,
    });

    try {
      // Create user object from OAuth response
      const userData: CreateUserData = {
        id: userInfo.id || userInfo.sub || `user_${Date.now()}`,
        username: userInfo.name || userInfo.displayName || 'User',
        email: userInfo.email || '',
        avatar: userInfo.picture || userInfo.avatar || undefined,
        provider,
      };
      const user = createUser(userData);

      // Store token
      const tokenData: TokenData = {
        accessToken: token,
        expiresAt: Date.now() + 3600000, // 1 hour default
      };
      localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));

      this.currentUser = user;

      logger.info('User authenticated successfully', {
        component: 'AuthService',
        operation: 'login',
        userId: user.id,
        provider,
      });

      return user;
    } catch (error) {
      logger.error('Authentication failed', {
        component: 'AuthService',
        operation: 'login',
        provider,
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    if (!this.currentUser) {
      return;
    }

    const userId = this.currentUser.id;
    logger.info('User logged out', {
      component: 'AuthService',
      operation: 'logout',
      userId,
    });

    // Clear storage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser = null;
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.currentUser) {
      return false;
    }

    // Check if token is still valid
    try {
      const tokenDataStr = localStorage.getItem(this.TOKEN_KEY);
      if (!tokenDataStr) {
        return false;
      }

      const tokenData: TokenData = JSON.parse(tokenDataStr);
      if (tokenData.expiresAt && tokenData.expiresAt < Date.now()) {
        logger.warn('Token expired', {
          component: 'AuthService',
          operation: 'isAuthenticated',
          userId: this.currentUser.id,
        });
        this.logout();
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check token validity', {
        component: 'AuthService',
        operation: 'isAuthenticated',
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<string> {
    logger.debug('Refreshing token', {
      component: 'AuthService',
      operation: 'refreshToken',
      userId: this.currentUser?.id,
    });

    // For now, return current token
    // In production, this would make an API call to refresh
    const tokenDataStr = localStorage.getItem(this.TOKEN_KEY);
    if (!tokenDataStr) {
      throw new Error('No token to refresh');
    }

    const tokenData: TokenData = JSON.parse(tokenDataStr);
    
    // Update expiration
    tokenData.expiresAt = Date.now() + 3600000; // 1 hour
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(tokenData));

    logger.info('Token refreshed', {
      component: 'AuthService',
      operation: 'refreshToken',
      userId: this.currentUser?.id,
    });

    return tokenData.accessToken;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    try {
      const tokenDataStr = localStorage.getItem(this.TOKEN_KEY);
      if (!tokenDataStr) {
        return null;
      }

      const tokenData: TokenData = JSON.parse(tokenDataStr);
      return tokenData.accessToken;
    } catch {
      return null;
    }
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.currentUser?.id === 'admin' || this.currentUser?.username === 'admin';
  }

  /**
   * Get all users (admin only)
   */
  getAllUsers(): User[] {
    if (!this.isAdmin()) {
      throw new Error('Only admins can view all users');
    }

    const localUsers = this.getLocalUsers();
    const users: User[] = localUsers.map((localUser) => {
      const userData: CreateUserData = {
        id: localUser.id,
        username: localUser.username,
        email: localUser.email,
        provider: 'local',
        requiresPasswordChange: localUser.requiresPasswordChange,
      };
      return createUser(userData);
    });

    logger.debug('Retrieved all users', {
      component: 'AuthService',
      operation: 'getAllUsers',
      count: users.length,
    });

    return users;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: {
    username?: string;
    email?: string;
    avatar?: string;
    skipDeleteConfirmation?: boolean;
  }): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    logger.info('Updating user profile', {
      component: 'AuthService',
      operation: 'updateProfile',
      userId: this.currentUser.id,
    });

    try {
      // Update local user if provider is local
      if (this.currentUser.provider === 'local') {
        const users = this.getLocalUsers();
        const localUser = users.find(u => u.id === this.currentUser!.id);

        if (localUser) {
          if (updates.username !== undefined) {
            localUser.username = updates.username;
          }
          if (updates.email !== undefined) {
            localUser.email = updates.email;
          }
          this.saveLocalUsers(users);
        }
      }

      // Update current user object
      const updatedUser = { ...this.currentUser };
      if (updates.username !== undefined) {
        updatedUser.username = updates.username;
      }
      if (updates.email !== undefined) {
        updatedUser.email = updates.email;
      }
      if (updates.avatar !== undefined) {
        updatedUser.avatar = updates.avatar;
      }
      if (updates.skipDeleteConfirmation !== undefined) {
        updatedUser.skipDeleteConfirmation = updates.skipDeleteConfirmation;
      }

      this.currentUser = updatedUser;
      localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));

      logger.info('User profile updated successfully', {
        component: 'AuthService',
        operation: 'updateProfile',
        userId: this.currentUser.id,
      });
    } catch (error) {
      logger.error('Profile update failed', {
        component: 'AuthService',
        operation: 'updateProfile',
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Reset a user's password (admin only)
   */
  async resetUserPassword(userId: string): Promise<void> {
    if (!this.isAdmin()) {
      throw new Error('Only admins can reset user passwords');
    }

    if (userId === 'admin') {
      throw new Error('Cannot reset admin password using this method');
    }

    logger.info('Resetting user password', {
      component: 'AuthService',
      operation: 'resetUserPassword',
      targetUserId: userId,
    });

    try {
      const users = this.getLocalUsers();
      const targetUser = users.find(u => u.id === userId);

      if (!targetUser) {
        throw new Error('User not found');
      }

      // All LocalUser entries are local users by definition

      // Reset to default password
      targetUser.passwordHash = this.hashPassword('ChangeMe');
      targetUser.requiresPasswordChange = true;
      this.saveLocalUsers(users);

      logger.info('User password reset successfully', {
        component: 'AuthService',
        operation: 'resetUserPassword',
        targetUserId: userId,
      });
    } catch (error) {
      logger.error('Password reset failed', {
        component: 'AuthService',
        operation: 'resetUserPassword',
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Initialize on module load
authService.init();

// Expose resetAdminPassword to window for debugging (development only)
if (import.meta.env.DEV) {
  (window as any).resetAdminPassword = () => {
    authService.resetAdminPassword();
    console.log('Admin password reset to "ChangeMe". You can now log in with admin/ChangeMe');
  };
}
