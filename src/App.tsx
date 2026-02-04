import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { createGame } from '@/models/Game';
import { logger } from '@/utils/logger';
import { Login } from '@/components/auth/Login';
import { UserProfile } from '@/components/auth/UserProfile';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';
import { LevelEditor } from '@/components/level-editor/LevelEditor';
import { LevelBrowser } from '@/components/level-editor/LevelBrowser';
import { storageService, isQuotaExceededError } from '@/services/storageService';
import type { StorageBreakdown } from '@/services/storageService';
import './App.css';

const BYTES_PER_MB = 1024 * 1024;
function formatMB(bytes: number): string {
  return (bytes / BYTES_PER_MB).toFixed(2);
}

function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const {
    games,
    currentGame,
    gamesLoadError,
    loadGames,
    saveGameToStorage,
    setCurrentGame,
    updateGame,
    deleteGameFromStorage,
  } = useGameStore();
  const [gameSaveMessage, setGameSaveMessage] = useState<'saved' | 'error' | null>(null);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [pendingDeleteGameId, setPendingDeleteGameId] = useState<string | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number; usageRatio: number } | null>(null);
  const [storageBreakdown, setStorageBreakdown] = useState<StorageBreakdown | null>(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [storageCleanupInProgress, setStorageCleanupInProgress] = useState<string | null>(null);
  const showPasswordChange = user?.provider === 'local' && user?.requiresPasswordChange === true;

  useEffect(() => {
    if (user?.id) {
      loadGames(user.id);
    }
  }, [user?.id, loadGames]);

  const loadStorageInfo = useCallback(async () => {
    setStorageLoading(true);
    try {
      const [estimate, breakdown] = await Promise.all([
        storageService.getStorageEstimate(),
        storageService.getStorageBreakdown(),
      ]);
      setStorageEstimate(estimate ?? null);
      setStorageBreakdown(breakdown);
    } catch {
      setStorageEstimate(null);
      setStorageBreakdown(null);
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStorageInfo();
  }, [loadStorageInfo]);

  useEffect(() => {
    if (gameSaveMessage) {
      const t = setTimeout(() => setGameSaveMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [gameSaveMessage]);

  const handlePasswordChangeClose = () => {};

  const handleOpenLevelBrowser = () => {
    navigate('/levels');
  };

  const handleCreateGame = async () => {
    if (!user?.id || isCreatingGame) return;
    setIsCreatingGame(true);
    setGameSaveMessage(null);
    try {
      const game = createGame({
        title: `My Game ${games.length + 1}`,
        userId: user.id,
      });
      await saveGameToStorage(game);
      setCurrentGame(game);
      setGameSaveMessage('saved');
      logger.info('Game created and saved', { component: 'Dashboard', operation: 'createGame', gameId: game.id });
    } catch (error) {
      logger.error('Failed to create game', { component: 'Dashboard', operation: 'createGame' }, { error: error instanceof Error ? error.message : String(error) });
      setGameSaveMessage('error');
      if (isQuotaExceededError(error)) {
        alert('Storage is full. Free up space in the Storage section below (e.g. clear background images or patterns), then try again.');
      }
    } finally {
      setIsCreatingGame(false);
    }
  };

  const handleSelectGame = (gameId: string) => {
    const game = games.find((g) => g.id === gameId);
    if (game) setCurrentGame(game);
  };

  const handleRenameGame = async (gameId: string, currentTitle: string) => {
    const newTitle = window.prompt('Game name', currentTitle)?.trim();
    if (newTitle == null || newTitle === '' || newTitle === currentTitle) return;
    const game = games.find((g) => g.id === gameId);
    if (!game) return;
    updateGame(gameId, { title: newTitle });
    const updated = useGameStore.getState().games.find((g) => g.id === gameId);
    if (updated) {
      try {
        await saveGameToStorage(updated);
        setGameSaveMessage('saved');
      } catch (error) {
        logger.error('Failed to save game title', { component: 'Dashboard', operation: 'renameGame', gameId }, { error: error instanceof Error ? error.message : String(error) });
        setGameSaveMessage('error');
      }
    }
  };

  const handleConfirmDeleteGame = async (gameId: string) => {
    try {
      await deleteGameFromStorage(gameId);
      setPendingDeleteGameId(null);
    } catch (error) {
      logger.error('Failed to delete game', { component: 'Dashboard', operation: 'deleteGame' }, { error: error instanceof Error ? error.message : String(error) });
      alert('Failed to delete game. Please try again.');
    }
  };

  const handleClearBackgroundImages = async () => {
    if (!confirm('Remove all background images from the library? This cannot be undone.')) return;
    setStorageCleanupInProgress('backgroundImages');
    try {
      await storageService.clearBackgroundImages();
      await loadStorageInfo();
      window.dispatchEvent(new CustomEvent('backgroundImagesChanged'));
    } catch (error) {
      logger.error('Failed to clear background images', { component: 'Dashboard', operation: 'clearBackgroundImages' }, { error: error instanceof Error ? error.message : String(error) });
      alert('Failed to clear background images. Please try again.');
    } finally {
      setStorageCleanupInProgress(null);
    }
  };

  const handleClearPatterns = async () => {
    if (!confirm('Remove all saved patterns from the library? This cannot be undone.')) return;
    setStorageCleanupInProgress('patterns');
    try {
      await storageService.clearPatterns();
      await loadStorageInfo();
    } catch (error) {
      logger.error('Failed to clear patterns', { component: 'Dashboard', operation: 'clearPatterns' }, { error: error instanceof Error ? error.message : String(error) });
      alert('Failed to clear patterns. Please try again.');
    } finally {
      setStorageCleanupInProgress(null);
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

            <section className="my-games-section" aria-label="My Games">
              <h3>My Games</h3>
              {gamesLoadError && (
                <p className="games-load-error" role="alert">
                  Could not load games: {gamesLoadError}
                </p>
              )}
              <div className="my-games-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleCreateGame}
                  disabled={!user?.id || isCreatingGame}
                >
                  {isCreatingGame ? 'Creating…' : 'Create game'}
                </button>
                {gameSaveMessage === 'saved' && (
                  <span className="game-save-confirmation" role="status">Game saved.</span>
                )}
                {gameSaveMessage === 'error' && (
                  <span className="game-save-error" role="alert">Save failed. Please try again.</span>
                )}
              </div>
              {games.length > 0 && (
                <ul className="my-games-list">
                  {games.map((game) => (
                    <li key={game.id} className="my-games-item">
                      <button
                        type="button"
                        className={`my-games-select ${currentGame?.id === game.id ? 'active' : ''}`}
                        onClick={() => handleSelectGame(game.id)}
                      >
                        {game.title}
                      </button>
                      <button
                        type="button"
                        className="my-games-edit"
                        onClick={() => handleRenameGame(game.id, game.title)}
                        aria-label={`Rename ${game.title}`}
                        title="Rename game"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="my-games-delete"
                        onClick={() => setPendingDeleteGameId(pendingDeleteGameId === game.id ? null : game.id)}
                        aria-label={`Delete ${game.title}`}
                      >
                        Delete
                      </button>
                      {pendingDeleteGameId === game.id && (
                        <span className="my-games-delete-confirm">
                          <button type="button" onClick={() => handleConfirmDeleteGame(game.id)}>Confirm</button>
                          <button type="button" onClick={() => setPendingDeleteGameId(null)}>Cancel</button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {games.length === 0 && !gamesLoadError && (
                <p className="my-games-empty">No games yet. Create one to get started.</p>
              )}
            </section>

            <section className="storage-section" aria-label="Storage">
              <h3>Storage</h3>
              {storageLoading ? (
                <p className="storage-loading">Checking storage…</p>
              ) : (
                <>
                  {storageEstimate != null ? (
                    <div className="storage-estimate">
                      <p>
                        <strong>Usage:</strong> {formatMB(storageEstimate.usage)} MB / {formatMB(storageEstimate.quota)} MB
                        {' '}({Math.round(storageEstimate.usageRatio * 100)}%)
                      </p>
                      {storageEstimate.usageRatio >= 0.8 && (
                        <p className="storage-warning" role="alert">
                          Storage is getting full. Consider clearing unused background images or patterns below.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="storage-unavailable">Storage usage is not available in this browser.</p>
                  )}
                  {storageBreakdown != null && (
                    <div className="storage-breakdown">
                      <span>Games: {storageBreakdown.games}</span>
                      <span>Levels: {storageBreakdown.levels}</span>
                      <span>Background images: {storageBreakdown.backgroundImages}</span>
                      <span>Patterns: {storageBreakdown.patterns}</span>
                    </div>
                  )}
                  <div className="storage-cleanup">
                    <button
                      type="button"
                      className="storage-cleanup-button"
                      onClick={handleClearBackgroundImages}
                      disabled={storageCleanupInProgress !== null}
                    >
                      {storageCleanupInProgress === 'backgroundImages' ? 'Clearing…' : 'Clear all background images'}
                    </button>
                    <button
                      type="button"
                      className="storage-cleanup-button"
                      onClick={handleClearPatterns}
                      disabled={storageCleanupInProgress !== null}
                    >
                      {storageCleanupInProgress === 'patterns' ? 'Clearing…' : 'Clear all patterns'}
                    </button>
                  </div>
                </>
              )}
            </section>

            <div className="feature-cards">
              <div className="feature-card clickable" onClick={handleOpenLevelBrowser}>
                <h3>Design Levels</h3>
                <p>Use the level editor to create amazing platformer levels</p>
                <p className="feature-action">Click to browse levels!</p>
              </div>
              <div className="feature-card">
                <h3>Share & Play</h3>
                <p>Share your games with friends and play together</p>
                <p className="feature-note">Coming soon</p>
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
          <Route
            path="/levels"
            element={
              <ProtectedRoute>
                <LevelBrowser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:levelId"
            element={
              <ProtectedRoute>
                <LevelEditor />
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
