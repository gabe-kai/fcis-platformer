import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from './authStore';
import { authService } from '@/services/authService';
import type { User } from '@/models/User';

describe('AuthStore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear store and storage
    authService.reset();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  describe('Initial State', () => {
    it('should initialize with null user when not authenticated', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should update state when login succeeds', async () => {
      const user: User = {
        id: 'test-user',
        username: 'Test User',
        email: 'test@example.com',
        provider: 'google',
      };

      // Mock authService.login to succeed
      vi.spyOn(authService, 'login').mockResolvedValue(user);
      vi.spyOn(authService, 'getCurrentUser').mockReturnValue(user);

      await useAuthStore.getState().login(user);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error state when login fails', async () => {
      const user: User = {
        id: 'test-user',
        username: 'Test User',
        email: 'test@example.com',
        provider: 'google',
      };

      // Mock authService.login to fail
      vi.spyOn(authService, 'login').mockRejectedValue(new Error('Login failed'));

      await expect(useAuthStore.getState().login(user)).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe('logout', () => {
    it('should clear user state on logout', async () => {
      // First login
      const user: User = {
        id: 'test-user',
        username: 'Test User',
        email: 'test@example.com',
        provider: 'google',
      };
      vi.spyOn(authService, 'getCurrentUser').mockReturnValue(user);
      await useAuthStore.getState().login(user);

      // Then logout
      vi.spyOn(authService, 'logout').mockResolvedValue();
      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('checkAuth', () => {
    it('should update state based on authService', () => {
      const user: User = {
        id: 'test-user',
        username: 'Test User',
        email: 'test@example.com',
        provider: 'google',
      };

      vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
      vi.spyOn(authService, 'getCurrentUser').mockReturnValue(user);

      useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(user);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', () => {
      const user: User = {
        id: 'test-user',
        username: 'Test User',
        email: 'test@example.com',
        provider: 'google',
      };

      useAuthStore.setState({ user, isAuthenticated: true });

      useAuthStore.getState().updateProfile({ username: 'Updated Name' });

      const state = useAuthStore.getState();
      expect(state.user?.username).toBe('Updated Name');
      expect(state.user?.id).toBe('test-user'); // Other fields unchanged
    });

    it('should not update when no user is logged in', () => {
      useAuthStore.getState().updateProfile({ username: 'New Name' });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('loginLocal', () => {
    it('should update state when local login succeeds', async () => {
      const user: User = {
        id: 'test-user',
        username: 'Test User',
        email: 'test@example.com',
        provider: 'local',
      };

      // Mock authService.loginLocal to succeed
      vi.spyOn(authService, 'loginLocal').mockResolvedValue(user);
      vi.spyOn(authService, 'getCurrentUser').mockReturnValue(user);

      await useAuthStore.getState().loginLocal('testuser', 'password123');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error state when local login fails', async () => {
      // Mock authService.loginLocal to fail
      vi.spyOn(authService, 'loginLocal').mockRejectedValue(new Error('Invalid credentials'));

      await expect(useAuthStore.getState().loginLocal('testuser', 'wrongpass')).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe('changePassword', () => {
    it('should update user state after password change', async () => {
      const user: User = {
        id: 'test-user',
        username: 'Test User',
        email: 'test@example.com',
        provider: 'local',
        requiresPasswordChange: true,
      };

      useAuthStore.setState({ user, isAuthenticated: true });

      // Mock authService.changePassword to succeed
      vi.spyOn(authService, 'changePassword').mockResolvedValue(undefined);
      vi.spyOn(authService, 'getCurrentUser').mockReturnValue({
        ...user,
        requiresPasswordChange: false,
      });

      await useAuthStore.getState().changePassword('oldpass', 'newpass123');

      const state = useAuthStore.getState();
      expect(state.user?.requiresPasswordChange).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error state when password change fails', async () => {
      const user: User = {
        id: 'test-user',
        username: 'Test User',
        email: 'test@example.com',
        provider: 'local',
      };

      useAuthStore.setState({ user, isAuthenticated: true });

      // Mock authService.changePassword to fail
      vi.spyOn(authService, 'changePassword').mockRejectedValue(new Error('Invalid password'));

      await expect(
        useAuthStore.getState().changePassword('wrongpass', 'newpass123')
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.error).toBeTruthy();
      expect(state.isLoading).toBe(false);
    });
  });
});
