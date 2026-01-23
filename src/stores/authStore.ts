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
  logout: () => Promise<void>;
  checkAuth: () => void;
  updateProfile: (updates: Partial<User>) => void;
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
          await authService.login(user.provider, '', user);
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
