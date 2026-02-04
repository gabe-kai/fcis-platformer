import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useGameStore } from '@/stores/gameStore';
import { storageService } from '@/services/storageService';
import { authService } from '@/services/authService';
import { createLevel } from '@/models/Level';
import { logger } from '@/utils/logger';
import type { Level } from '@/models/Level';
import { DeleteLevelModal } from './DeleteLevelModal';
import './LevelBrowser.css';

/**
 * LevelBrowser Component
 * 
 * Displays user's levels, shared levels, and option to create new levels.
 */
const FALLBACK_GAME_ID = 'test-game';

export function LevelBrowser() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuthStore();
  const { currentGame } = useGameStore();
  const gameId = currentGame?.id ?? FALLBACK_GAME_ID;
  const [myLevels, setMyLevels] = useState<Level[]>([]);
  const [sharedLevels, setSharedLevels] = useState<Level[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ levelId: string; levelTitle: string } | null>(null);

  useEffect(() => {
    loadLevels();
  }, [user, gameId]);

  const loadLevels = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const allLevels = await storageService.listLevels(gameId);
      
      // Separate into my levels and shared levels
      // For now, all levels are "my levels" since we don't have multi-user yet
      setMyLevels(allLevels);
      setSharedLevels([]);

      logger.info('Levels loaded', {
        component: 'LevelBrowser',
        operation: 'loadLevels',
        myLevelsCount: allLevels.length,
        sharedLevelsCount: 0,
      });
    } catch (error) {
      logger.error('Failed to load levels', {
        component: 'LevelBrowser',
        operation: 'loadLevels',
      }, { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLevel = async () => {
    setIsCreating(true);
    try {
      const newLevel = createLevel({
        gameId,
        title: `New Level ${myLevels.length + 1}`,
        description: 'A new level',
      });

      await storageService.saveLevel(newLevel);
      
      logger.info('Level created', {
        component: 'LevelBrowser',
        operation: 'createLevel',
        levelId: newLevel.id,
      });

      // Navigate to editor
      navigate(`/editor/${newLevel.id}`);
    } catch (error) {
      logger.error('Failed to create level', {
        component: 'LevelBrowser',
        operation: 'createLevel',
      }, { error: error instanceof Error ? error.message : String(error) });
      alert('Failed to create level. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenLevel = (levelId: string) => {
    navigate(`/editor/${levelId}`);
  };

  const performDelete = async (levelId: string) => {
    try {
      await storageService.deleteLevel(levelId);
      logger.info('Level deleted', {
        component: 'LevelBrowser',
        operation: 'deleteLevel',
        levelId,
      });
      loadLevels();
    } catch (error) {
      logger.error('Failed to delete level', {
        component: 'LevelBrowser',
        operation: 'deleteLevel',
        levelId,
      }, { error: error instanceof Error ? error.message : String(error) });
      alert('Failed to delete level. Please try again.');
    }
  };

  const handleDeleteClick = (level: Level) => {
    if (user?.skipDeleteConfirmation) {
      performDelete(level.id);
      return;
    }
    setPendingDelete({ levelId: level.id, levelTitle: level.title });
  };

  const handleDeleteConfirm = async (dontWarnAgain: boolean) => {
    if (!pendingDelete) return;
    const { levelId } = pendingDelete;

    if (dontWarnAgain) {
      try {
        await authService.updateProfile({ skipDeleteConfirmation: true });
        updateProfile({ skipDeleteConfirmation: true });
      } catch (err) {
        logger.error('Failed to save preference', {
          component: 'LevelBrowser',
          operation: 'handleDeleteConfirm',
        }, { error: err instanceof Error ? err.message : String(err) });
      }
    }

    setPendingDelete(null);
    await performDelete(levelId);
  };

  const handleDeleteCancel = () => {
    setPendingDelete(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="level-browser">
        <header className="level-browser-header">
          <h1>Level Browser</h1>
          <button className="back-button" onClick={() => navigate('/')}>
            Back to Dashboard
          </button>
        </header>
        <div className="level-browser-content">
          <div className="loading-message">Loading levels...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="level-browser">
      <header className="level-browser-header">
        <h1>Level Browser</h1>
        <button className="back-button" onClick={() => navigate('/')}>
          Back to Dashboard
        </button>
      </header>

      <div className="level-browser-content">
        {currentGame && (
          <p className="level-browser-game-context" role="status">
            Levels for game: <strong>{currentGame.title}</strong>
          </p>
        )}
        {/* Create New Level Section */}
        <section className="level-section create-section">
          <div className="section-header">
            <h2>Create New Level</h2>
          </div>
          <div className="create-level-card">
            <button
              className="create-level-button"
              onClick={handleCreateLevel}
              disabled={isCreating}
            >
              <span className="create-icon">+</span>
              <span className="create-text">
                {isCreating ? 'Creating...' : 'Create New Level'}
              </span>
            </button>
          </div>
        </section>

        {/* My Levels Section */}
        <section className="level-section">
          <div className="section-header">
            <h2>My Levels</h2>
            <span className="level-count">{myLevels.length} level{myLevels.length !== 1 ? 's' : ''}</span>
          </div>
          {myLevels.length === 0 ? (
            <div className="empty-message">
              <p>You haven't created any levels yet.</p>
              <p className="empty-hint">Click "Create New Level" above to get started!</p>
            </div>
          ) : (
            <div className="level-grid">
              {myLevels.map((level) => (
                <div key={level.id} className="level-card">
                  <div className="level-card-header">
                    <h3 className="level-title">{level.title}</h3>
                    <div className="level-actions">
                      <button
                        className="action-button edit-button"
                        onClick={() => handleOpenLevel(level.id)}
                        title="Edit level"
                      >
                        ✎
                      </button>
                      <button
                        className="action-button delete-button"
                        onClick={() => handleDeleteClick(level)}
                        title="Delete level"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  {level.description && (
                    <p className="level-description">{level.description}</p>
                  )}
                  <div className="level-meta">
                    <div className="meta-item">
                      <span className="meta-label">Size:</span>
                      <span className="meta-value">{level.width} × {level.height} cells</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Updated:</span>
                      <span className="meta-value">{formatDate(level.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Shared Levels Section */}
        <section className="level-section">
          <div className="section-header">
            <h2>Shared with Me</h2>
            <span className="level-count">{sharedLevels.length} level{sharedLevels.length !== 1 ? 's' : ''}</span>
          </div>
          {sharedLevels.length === 0 ? (
            <div className="empty-message">
              <p>No levels have been shared with you yet.</p>
            </div>
          ) : (
            <div className="level-grid">
              {sharedLevels.map((level) => (
                <div key={level.id} className="level-card shared-card">
                  <div className="level-card-header">
                    <h3 className="level-title">{level.title}</h3>
                    <div className="level-actions">
                      <button
                        className="action-button view-button"
                        onClick={() => handleOpenLevel(level.id)}
                        title="View level"
                      >
                        👁
                      </button>
                    </div>
                  </div>
                  {level.description && (
                    <p className="level-description">{level.description}</p>
                  )}
                  <div className="level-meta">
                    <div className="meta-item">
                      <span className="meta-label">Size:</span>
                      <span className="meta-value">{level.width} × {level.height} cells</span>
                    </div>
                    <div className="meta-item shared-badge">
                      <span className="meta-label">Shared</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <DeleteLevelModal
        isOpen={pendingDelete !== null}
        levelTitle={pendingDelete?.levelTitle ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
}
