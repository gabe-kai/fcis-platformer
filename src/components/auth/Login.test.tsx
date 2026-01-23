import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { Login } from './Login';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock authService
vi.mock('@/services/authService', () => ({
  authService: {
    shouldShowDefaultAdminCredentials: vi.fn(),
  },
}));

// Mock GoogleLogin component
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (response: any) => void; onError?: () => void }) => (
    <button
      data-testid="google-login-button"
      onClick={() => {
        onSuccess({ credential: 'mock-credential' });
      }}
    >
      Sign in with Google
    </button>
  ),
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useNavigate and useLocation
const mockNavigate = vi.fn();
let mockLocation: { state: { from?: { pathname: string } } | null; pathname: string } = { 
  state: null, 
  pathname: '/login' 
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

describe('Login', () => {
  const mockLoginLocal = vi.fn();
  const mockLogin = vi.fn();
  const mockSetError = vi.fn();
  const mockClearError = vi.fn();

  const mockUseAuthStore = vi.fn(() => ({
    login: mockLogin,
    loginLocal: mockLoginLocal,
    isLoading: false,
    error: null as string | null,
    setError: mockSetError,
    clearError: mockClearError,
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockUseAuthStore);
    (authService.shouldShowDefaultAdminCredentials as ReturnType<typeof vi.fn>).mockReturnValue(true);
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
  });

  const renderLogin = () => {
    return render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  };

  describe('Rendering', () => {
    it('should render login form', () => {
      renderLogin();
      expect(screen.getByText('First Cat In Space')).toBeInTheDocument();
      expect(screen.getByText('Platformer Game Editor')).toBeInTheDocument();
    });

    it('should show default admin credentials when appropriate', () => {
      (authService.shouldShowDefaultAdminCredentials as ReturnType<typeof vi.fn>).mockReturnValue(true);
      renderLogin();
      expect(screen.getByText(/Default admin:/i)).toBeInTheDocument();
    });

    it('should not show default admin credentials when password changed', () => {
      (authService.shouldShowDefaultAdminCredentials as ReturnType<typeof vi.fn>).mockReturnValue(false);
      renderLogin();
      expect(screen.queryByText(/Default admin:/i)).not.toBeInTheDocument();
    });
  });

  describe('Local Login', () => {
    it('should submit login form with username and password', async () => {
      const user = userEvent.setup();
      mockLoginLocal.mockResolvedValue(undefined);

      renderLogin();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByText('Sign In');

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLoginLocal).toHaveBeenCalledWith('admin', 'password123');
      });
    });

    it('should trim whitespace from inputs', async () => {
      const user = userEvent.setup();
      mockLoginLocal.mockResolvedValue(undefined);

      renderLogin();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByText('Sign In');

      await user.type(usernameInput, '  admin  ');
      await user.type(passwordInput, '  password123  ');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLoginLocal).toHaveBeenCalledWith('admin', 'password123');
      });
    });

    it('should show error when fields are empty', async () => {
      const user = userEvent.setup();
      renderLogin();

      const submitButton = screen.getByText('Sign In');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSetError).toHaveBeenCalledWith('Please enter both username and password');
      });
    });

    it('should navigate to dashboard after successful login', async () => {
      const user = userEvent.setup();
      mockLoginLocal.mockResolvedValue(undefined);

      renderLogin();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByText('Sign In');

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });

    it('should navigate to intended destination if provided', async () => {
      const user = userEvent.setup();
      mockLoginLocal.mockResolvedValue(undefined);
      mockLocation = { state: { from: { pathname: '/games' } }, pathname: '/login' };

      renderLogin();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByText('Sign In');

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/games', { replace: true });
      });
    });

    it('should display error message on login failure', async () => {
      const user = userEvent.setup();
      mockLoginLocal.mockRejectedValue(new Error('Invalid credentials'));
      mockUseAuthStore.mockReturnValue({
        login: mockLogin,
        loginLocal: mockLoginLocal,
        isLoading: false,
        error: 'Invalid credentials' as string | null,
        setError: mockSetError,
        clearError: mockClearError,
      });

      renderLogin();

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByText('Sign In');

      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLoginLocal).toHaveBeenCalled();
      });
    });
  });

  describe('OAuth Login', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
      mockLocation = { state: null, pathname: '/login' };
    });

    it('should show OAuth toggle when OAuth is configured', () => {
      renderLogin();
      expect(screen.getByText(/Sign in with Google instead/i)).toBeInTheDocument();
    });

    it('should switch to OAuth mode', async () => {
      const user = userEvent.setup();
      renderLogin();

      const oauthToggle = screen.getByText(/Sign in with Google instead/i);
      await user.click(oauthToggle);

      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    });

    it('should not show OAuth toggle when OAuth is not configured', () => {
      vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
      renderLogin();
      expect(screen.queryByText(/Sign in with Google instead/i)).not.toBeInTheDocument();
    });
  });

  describe('Auth Mode Toggle', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id');
      mockLocation = { state: null, pathname: '/login' };
    });

    it('should show alternative auth method toggle', () => {
      renderLogin();
      expect(screen.getByText(/Sign in with Google instead/i)).toBeInTheDocument();
    });

    it('should switch between local and OAuth modes', async () => {
      const user = userEvent.setup();
      renderLogin();

      // Start in local mode, switch to OAuth
      const oauthToggle = screen.getByText(/Sign in with Google instead/i);
      await user.click(oauthToggle);

      expect(screen.getByTestId('google-login-button')).toBeInTheDocument();

      // Switch back to local
      const localToggle = screen.getByText(/Sign in with username\/password instead/i);
      await user.click(localToggle);

      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    });
  });
});
