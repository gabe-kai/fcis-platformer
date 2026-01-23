import { logger } from '@/utils/logger';

// User interface - will be replaced with proper User model in Task 3
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  provider: 'google' | 'microsoft' | 'local';
  requiresPasswordChange?: boolean;
}

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
    if (!users.find(u => u.username === 'admin')) {
      const adminUser: LocalUser = {
        id: 'admin',
        username: 'admin',
        email: 'admin@fcis.local',
        passwordHash: this.hashPassword('ChangeMe'), // Default password
        requiresPasswordChange: true, // Must change on first login
        createdAt: Date.now(),
      };
      users.push(adminUser);
      this.saveLocalUsers(users);
      logger.info('Default admin user created', {
        component: 'AuthService',
        operation: 'initializeDefaultUsers',
      });
    }
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
    logger.info('Local login attempt', {
      component: 'AuthService',
      operation: 'loginLocal',
      username,
    });

    try {
      const users = this.getLocalUsers();
      const localUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

      if (!localUser || !this.verifyPassword(password, localUser.passwordHash)) {
        logger.warn('Invalid credentials', {
          component: 'AuthService',
          operation: 'loginLocal',
          username,
        });
        throw new Error('Invalid username or password');
      }

      // Update last login
      localUser.lastLogin = Date.now();
      this.saveLocalUsers(users);

      // Create user object
      const user: User = {
        id: localUser.id,
        username: localUser.username,
        email: localUser.email,
        provider: 'local',
        requiresPasswordChange: localUser.requiresPasswordChange,
      };

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
      localUser.passwordHash = this.hashPassword(newPassword);
      localUser.requiresPasswordChange = false;
      this.saveLocalUsers(users);

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
      const user: User = {
        id: userInfo.id || userInfo.sub || `user_${Date.now()}`,
        username: userInfo.name || userInfo.displayName || 'User',
        email: userInfo.email || '',
        avatar: userInfo.picture || userInfo.avatar || undefined,
        provider,
      };

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
}

// Export singleton instance
export const authService = new AuthService();

// Initialize on module load
authService.init();
