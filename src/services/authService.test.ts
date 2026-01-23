import { describe, it, expect, beforeEach } from 'vitest';
import { authService, User } from './authService';

describe('AuthService', () => {
  beforeEach(() => {
    // Clear localStorage and reset authService state
    authService.reset();
  });

  describe('init', () => {
    it('should load user from storage if available', () => {
      const user: User = {
        id: 'test-user-1',
        username: 'Test User',
        email: 'test@example.com',
        provider: 'google',
      };
      localStorage.setItem('fcis_user', JSON.stringify(user));

      authService.init();
      const loadedUser = authService.getCurrentUser();

      expect(loadedUser).toEqual(user);
    });

    it('should handle missing storage gracefully', () => {
      localStorage.clear();
      authService.init();
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('login', () => {
    it('should login user and store in localStorage', async () => {
      const userInfo = {
        sub: 'google-user-123',
        name: 'Test User',
        email: 'test@example.com',
        picture: 'https://example.com/avatar.jpg',
      };

      const user = await authService.login('google', 'test-token', userInfo);

      expect(user.id).toBe('google-user-123');
      expect(user.username).toBe('Test User');
      expect(user.email).toBe('test@example.com');
      expect(user.provider).toBe('google');

      // Check storage
      const storedUser = JSON.parse(localStorage.getItem('fcis_user') || '{}');
      expect(storedUser.id).toBe(user.id);
    });

    it('should throw error on login failure', async () => {
      // Mock a failure scenario - missing required fields
      const invalidUserInfo = {};

      await expect(
        authService.login('google', 'token', invalidUserInfo)
      ).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should clear user and tokens from storage', async () => {
      // First login
      const userInfo = {
        sub: 'test-user',
        name: 'Test',
        email: 'test@example.com',
      };
      await authService.login('google', 'token', userInfo);

      // Then logout
      await authService.logout();

      expect(authService.getCurrentUser()).toBeNull();
      expect(localStorage.getItem('fcis_user')).toBeNull();
      expect(localStorage.getItem('fcis_auth_token')).toBeNull();
    });

    it('should handle logout when not logged in', async () => {
      await expect(authService.logout()).resolves.not.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when logged in', async () => {
      const userInfo = {
        sub: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
      };
      await authService.login('google', 'token', userInfo);

      const user = authService.getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.id).toBe('test-user');
    });

    it('should return null when not logged in', () => {
      const user = authService.getCurrentUser();
      expect(user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is logged in with valid token', async () => {
      const userInfo = {
        sub: 'test-user',
        name: 'Test',
        email: 'test@example.com',
      };
      await authService.login('google', 'token', userInfo);

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when not logged in', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when token is expired', async () => {
      const userInfo = {
        sub: 'test-user',
        name: 'Test',
        email: 'test@example.com',
      };
      await authService.login('google', 'token', userInfo);

      // Manually expire the token
      const tokenData = {
        accessToken: 'token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };
      localStorage.setItem('fcis_auth_token', JSON.stringify(tokenData));

      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token and update expiration', async () => {
      const userInfo = {
        sub: 'test-user',
        name: 'Test',
        email: 'test@example.com',
      };
      await authService.login('google', 'original-token', userInfo);

      const newToken = await authService.refreshToken();

      expect(newToken).toBe('original-token');
      
      // Check that expiration was updated
      const tokenData = JSON.parse(localStorage.getItem('fcis_auth_token') || '{}');
      expect(tokenData.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should throw error when no token exists', async () => {
      await expect(authService.refreshToken()).rejects.toThrow('No token to refresh');
    });
  });

  describe('getAccessToken', () => {
    it('should return access token when available', async () => {
      const userInfo = {
        sub: 'test-user',
        name: 'Test',
        email: 'test@example.com',
      };
      await authService.login('google', 'test-token', userInfo);

      const token = authService.getAccessToken();
      expect(token).toBe('test-token');
    });

    it('should return null when no token exists', () => {
      const token = authService.getAccessToken();
      expect(token).toBeNull();
    });
  });
});
