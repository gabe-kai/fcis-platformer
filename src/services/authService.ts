import { logger } from '@/utils/logger';

// User interface - will be replaced with proper User model in Task 3
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  provider: 'google' | 'microsoft';
}

interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

class AuthService {
  private readonly TOKEN_KEY = 'fcis_auth_token';
  private readonly USER_KEY = 'fcis_user';
  private currentUser: User | null = null;

  /**
   * Reset service state (for testing)
   */
  reset(): void {
    this.currentUser = null;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Initialize auth service - load user from storage if available
   */
  init(): void {
    try {
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
