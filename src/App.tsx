import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import { Login } from '@/components/auth/Login';
import { UserProfile } from '@/components/auth/UserProfile';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import './App.css';

function Dashboard() {
  const { user } = useAuthStore();
  // Show password change modal if required (derived state)
  const showPasswordChange = user?.provider === 'local' && user?.requiresPasswordChange === true;

  const handlePasswordChangeClose = () => {
    // Only allow closing if password change is not required
    if (!user?.requiresPasswordChange) {
      setShowPasswordChange(false);
    }
  };

  return (
    <>
      <div className="dashboard">
        <header className="dashboard-header">
          <h1>First Cat In Space Platformer</h1>
          <UserProfile />
        </header>
        <main className="dashboard-content">
          <div className="welcome-section">
            <h2>Welcome, {user?.username || 'User'}!</h2>
            <p>Your game editor is ready. Start creating your platformer game!</p>
            <div className="feature-cards">
              <div className="feature-card">
                <h3>Create Games</h3>
                <p>Build your own platformer games with custom graphics</p>
              </div>
              <div className="feature-card">
                <h3>Design Levels</h3>
                <p>Use the level editor to create amazing platformer levels</p>
              </div>
              <div className="feature-card">
                <h3>Share & Play</h3>
                <p>Share your games with friends and play together</p>
              </div>
            </div>
          </div>
        </main>
      </div>
      {showPasswordChange && (
        <ChangePasswordModal
          onClose={handlePasswordChangeClose}
          required={user?.requiresPasswordChange || false}
        />
      )}
    </>
  );
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    logger.info('Application starting', {
      component: 'App',
      environment: import.meta.env.MODE,
    });

    // Check authentication status on app load
    checkAuth();
  }, [checkAuth]);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    logger.warn('Google OAuth client ID not configured', {
      component: 'App',
      operation: 'init',
    });
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
