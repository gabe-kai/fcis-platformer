import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import { logger } from '@/utils/logger';
import './Login.css';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginLocal, isLoading, error, setError, clearError } = useAuthStore();
  const [authMode, setAuthMode] = useState<'oauth' | 'local'>('local'); // Default to local for development
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Check if Google OAuth is configured
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isOAuthConfigured = Boolean(googleClientId && googleClientId.trim() !== '');

  // Check if default admin credentials should be shown
  const showDefaultAdminCredentials = authService.shouldShowDefaultAdminCredentials();

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    try {
      clearError();
      
      if (!credentialResponse.credential) {
        const errorMsg = 'Google sign-in failed: No credential received. Please try again.';
        setError(errorMsg);
        logger.error('Google OAuth response missing credential', {
          component: 'Login',
          operation: 'google_oauth',
        });
        return;
      }

      logger.info('Google OAuth response received', {
        component: 'Login',
        operation: 'google_oauth',
      });

      // Decode JWT token to get user info
      // In production, you'd verify this on the backend
      const base64Url = credentialResponse.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
          .join('')
      );
      const userInfo = JSON.parse(jsonPayload);

      // Login via service (creates user object internally)
      const user = await authService.login('google', credentialResponse.credential, userInfo);
      await login(user);
      
      // Navigate to dashboard or intended destination
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (error) {
      const errorMsg = error instanceof Error 
        ? `Sign-in failed: ${error.message}` 
        : 'Sign-in failed. Please check your Google OAuth configuration and try again.';
      setError(errorMsg);
      logger.error('Google login failed', {
        component: 'Login',
        operation: 'google_oauth',
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleGoogleError = () => {
    const errorMsg = 'Google sign-in error. Please check your OAuth configuration. See README.md for setup instructions.';
    setError(errorMsg);
    logger.error('Google OAuth error', {
      component: 'Login',
      operation: 'google_oauth',
    });
  };

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    try {
      await loginLocal(username.trim(), password);
      // Navigate to dashboard or intended destination
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch {
      // Error is already set by the store
      logger.error('Local login failed', {
        component: 'Login',
        operation: 'local_login',
      });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>First Cat In Space</h1>
        <h2>Platformer Game Editor</h2>
        <p>Sign in to create and play your own games!</p>

        {/* Auth Mode Toggle - Only show if OAuth is configured */}
        {isOAuthConfigured && (
          <div className="auth-mode-toggle">
            {authMode === 'local' ? (
              <button
                type="button"
                className="auth-mode-switch"
                onClick={() => {
                  setAuthMode('oauth');
                  clearError();
                }}
              >
                Sign in with Google instead
              </button>
            ) : (
              <button
                type="button"
                className="auth-mode-switch"
                onClick={() => {
                  setAuthMode('local');
                  clearError();
                }}
              >
                Sign in with username/password instead
              </button>
            )}
          </div>
        )}

        {!isOAuthConfigured && authMode === 'oauth' && (
          <div className="config-warning" role="alert">
            <strong>⚠️ OAuth Not Configured</strong>
            <p>Google OAuth client ID is missing. Please set up your <code>VITE_GOOGLE_CLIENT_ID</code> in a <code>.env</code> file.</p>
            <p>See <code>README.md</code> for detailed setup instructions.</p>
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {/* Local Login Form */}
        {authMode === 'local' && (
          <form onSubmit={handleLocalLogin} className="local-login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                disabled={isLoading}
                autoComplete="username"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
            </div>
            {showDefaultAdminCredentials && (
              <div className="form-help">
                <p>Default admin: <code>admin</code> / <code>ChangeMe</code></p>
              </div>
            )}
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* OAuth Login */}
        {authMode === 'oauth' && (
          <div className="oauth-buttons">
            {isOAuthConfigured ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
              />
            ) : (
              <div className="oauth-disabled">
                <p>Sign-in button disabled until OAuth is configured.</p>
              </div>
            )}
          </div>
        )}

        {isLoading && (
          <div className="loading-indicator">
            <p>Signing in...</p>
          </div>
        )}
      </div>
    </div>
  );
}
