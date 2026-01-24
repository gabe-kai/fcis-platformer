import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/stores/editorStore';
import { storageService } from '@/services/storageService';
import { logger } from '@/utils/logger';
import './LevelEditor.css';

/**
 * Level Editor Component
 * 
 * This is a placeholder component for Task 4.
 * The full implementation will include:
 * - Canvas-based editor view
 * - Grid system
 * - Platform placement tool
 * - Properties panel
 * - Tool palette
 */
export function LevelEditor() {
  const { levelId } = useParams<{ levelId?: string }>();
  const navigate = useNavigate();
  const { currentLevel, setCurrentLevel } = useEditorStore();

  useEffect(() => {
    const loadLevel = async () => {
      if (!levelId) {
        logger.warn('No level ID provided', {
          component: 'LevelEditor',
          operation: 'load',
        });
        // TODO: In Task 4, allow creating new levels
        navigate('/');
        return;
      }

      try {
        logger.info('Loading level for editor', {
          component: 'LevelEditor',
          operation: 'load',
          levelId,
        });

        const level = await storageService.loadLevel(levelId);
        if (!level) {
          logger.warn('Level not found', {
            component: 'LevelEditor',
            operation: 'load',
            levelId,
          });
          navigate('/');
          return;
        }

        setCurrentLevel(level);
        logger.info('Level loaded successfully', {
          component: 'LevelEditor',
          operation: 'load',
          levelId,
        });
      } catch (error) {
        logger.error('Failed to load level', {
          component: 'LevelEditor',
          operation: 'load',
          levelId,
        }, { error: error instanceof Error ? error.message : String(error) });
        navigate('/');
      }
    };

    loadLevel();
  }, [levelId, setCurrentLevel, navigate]);

  if (!currentLevel) {
    return (
      <div className="level-editor">
        <div className="level-editor-loading">Loading level...</div>
      </div>
    );
  }

  return (
    <div className="level-editor">
      <header className="level-editor-header">
        <h1>Level Editor: {currentLevel.title}</h1>
        <button onClick={() => navigate('/')}>Back to Dashboard</button>
      </header>
      <main className="level-editor-content">
        <div className="level-editor-placeholder">
          <p>Level Editor will be implemented in Task 4</p>
          <p>Level: {currentLevel.title}</p>
          <p>Size: {currentLevel.width} x {currentLevel.height}</p>
          <p>Platforms: {currentLevel.platforms.length}</p>
        </div>
      </main>
    </div>
  );
}
