import { GoogleLogin } from '@react-oauth/google';
import { useAuthStore } from '@/stores/authStore';
import { authService, User } from '@/services/authService';
import { logger } from '@/utils/logger';
import './Login.css';

export function Login() {
  const { login, isLoading, error } = useAuthStore();

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    try {
      if (!credentialResponse.credential) {
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

      // Create user object
      const user: User = {
        id: userInfo.sub,
        username: userInfo.name || 'User',
        email: userInfo.email || '',
        avatar: userInfo.picture,
        provider: 'google',
      };

      // Login via service and store
      await authService.login('google', credentialResponse.credential, userInfo);
      await login(user);
    } catch (error) {
      logger.error('Google login failed', {
        component: 'Login',
        operation: 'google_oauth',
      }, { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  const handleGoogleError = () => {
    logger.error('Google OAuth error', {
      component: 'Login',
      operation: 'google_oauth',
    });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>First Cat In Space</h1>
        <h2>Platformer Game Editor</h2>
        <p>Sign in to create and play your own games!</p>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="oauth-buttons">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        {isLoading && (
          <div className="loading-indicator">
            <p>Signing in...</p>
          </div>
        )}
      </div>
    </div>
  );
}
