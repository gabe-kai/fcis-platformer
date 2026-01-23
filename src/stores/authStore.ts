import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService, User } from '@/services/authService';
import { logger } from '@/utils/logger';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (user: User) => Promise<void>;
  loginLocal: (username: string, password: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
  updateProfile: (updates: Partial<User>) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: authService.getCurrentUser(),
      isAuthenticated: authService.isAuthenticated(),
      isLoading: false,
      error: null,

      login: async (user: User) => {
        set({ isLoading: true, error: null });
        try {
          // Only call authService.login for OAuth providers
          if (user.provider === 'google' || user.provider === 'microsoft') {
            await authService.login(user.provider, '', user);
          }
          // For local auth, user is already set by loginLocal
          const currentUser = authService.getCurrentUser();
          set({
            user: currentUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          logger.info('User logged in via store', {
            component: 'AuthStore',
            operation: 'login',
            userId: currentUser?.id,
          });
        } catch (error) {
          logger.error('Login failed in store', {
            component: 'AuthStore',
            operation: 'login',
          }, { error: error instanceof Error ? error.message : 'Unknown error' });
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      loginLocal: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const user = await authService.loginLocal(username, password);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          logger.info('User logged in via local auth', {
            component: 'AuthStore',
            operation: 'loginLocal',
            userId: user.id,
          });
        } catch (error) {
          logger.error('Local login failed in store', {
            component: 'AuthStore',
            operation: 'loginLocal',
          }, { error: error instanceof Error ? error.message : 'Unknown error' });
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          await authService.changePassword(oldPassword, newPassword);
          const currentUser = authService.getCurrentUser();
          set({
            user: currentUser,
            isLoading: false,
            error: null,
          });
          logger.info('Password changed successfully', {
            component: 'AuthStore',
            operation: 'changePassword',
            userId: currentUser?.id,
          });
        } catch (error) {
          logger.error('Password change failed in store', {
            component: 'AuthStore',
            operation: 'changePassword',
          }, { error: error instanceof Error ? error.message : 'Unknown error' });
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Password change failed',
          });
          throw error;
        }
      },

      logout: async () => {
        const userId = useAuthStore.getState().user?.id;
        set({ isLoading: true });
        try {
          await authService.logout();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          logger.info('User logged out via store', {
            component: 'AuthStore',
            operation: 'logout',
            userId,
          });
        } catch (error) {
          logger.error('Logout failed in store', {
            component: 'AuthStore',
            operation: 'logout',
          }, { error: error instanceof Error ? error.message : 'Unknown error' });
          set({ isLoading: false });
        }
      },

      checkAuth: () => {
        const isAuth = authService.isAuthenticated();
        const user = authService.getCurrentUser();
        set({
          isAuthenticated: isAuth,
          user: isAuth ? user : null,
        });
      },

      updateProfile: (updates: Partial<User>) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          return;
        }

        const updatedUser = { ...currentUser, ...updates };
        set({ user: updatedUser });
        
        // Update in storage
        localStorage.setItem('fcis_user', JSON.stringify(updatedUser));
        
        logger.info('User profile updated', {
          component: 'AuthStore',
          operation: 'updateProfile',
          userId: updatedUser.id,
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'fcis-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize auth state on store creation
useAuthStore.getState().checkAuth();
