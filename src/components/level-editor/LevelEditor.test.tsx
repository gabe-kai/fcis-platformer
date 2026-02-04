import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LevelEditor } from './LevelEditor';
import { useEditorStore } from '@/stores/editorStore';
import { storageService } from '@/services/storageService';
import { createLevel } from '@/models/Level';

// Mock the editor store
vi.mock('@/stores/editorStore', () => ({
  useEditorStore: vi.fn(),
}));

// Mock storage service
vi.mock('@/services/storageService', () => ({
  storageService: {
    loadLevel: vi.fn(),
    saveLevel: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child components
vi.mock('./LevelCanvas', () => ({
  LevelCanvas: () => <div data-testid="level-canvas">Canvas</div>,
}));

vi.mock('./ToolPalette', () => ({
  ToolPalette: () => <div data-testid="tool-palette">Tools</div>,
}));

vi.mock('./PropertiesPanel', () => ({
  PropertiesPanel: () => <div data-testid="properties-panel">Properties</div>,
}));

vi.mock('./ConfirmDeleteTileGroupModal', () => ({
  ConfirmDeleteTileGroupModal: ({ isOpen, tileCount, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="confirm-delete-modal">
        <div>Delete {tileCount} tiles?</div>
        <button onClick={onConfirm}>Delete group</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock('./ConfirmPlaceOverwriteModal', () => ({
  ConfirmPlaceOverwriteModal: ({ isOpen, tileCount, onConfirm, onCancel }: any) =>
    isOpen ? (
      <div data-testid="confirm-place-overwrite-modal">
        <div>Replace {tileCount} tiles?</div>
        <button onClick={onConfirm}>Replace</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

// Mock useParams and useNavigate
const mockNavigate = vi.fn();
const mockParams = { levelId: 'test-level-1' };

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  };
});

describe('LevelEditor', () => {
  const mockSetCurrentLevel = vi.fn();
  const mockSetViewMode = vi.fn();
  const mockRemoveTileAtCell = vi.fn();
  const mockSetTileAtCell = vi.fn();
  const mockSetPendingTileGroupDelete = vi.fn();
  const mockSetPendingPlaceOverwrite = vi.fn();
  const mockSetSelectedTileEntry = vi.fn();
  const mockSetSelectedTileGroup = vi.fn();

  // Base store with all required properties
  const getBaseStore = (overrides = {}) => ({
    currentLevel: null,
    setCurrentLevel: mockSetCurrentLevel,
    updateLevelDimensions: vi.fn(),
    viewMode: 'texture',
    setViewMode: mockSetViewMode,
    pendingTileGroupDelete: null,
    pendingPlaceOverwrite: null,
    pendingBackgroundImageDataUrl: null,
    removeTileAtCell: mockRemoveTileAtCell,
    setTileAtCell: mockSetTileAtCell,
    setPendingTileGroupDelete: mockSetPendingTileGroupDelete,
    setPendingPlaceOverwrite: mockSetPendingPlaceOverwrite,
    setSelectedTileEntry: mockSetSelectedTileEntry,
    setSelectedTileGroup: mockSetSelectedTileGroup,
    setPendingBackgroundImageDataUrl: vi.fn(),
    updateLevel: vi.fn(),
    placePatternAt: vi.fn(),
    selectedPattern: null,
    hoverCell: null,
    copySelectionToClipboard: vi.fn(),
    cutSelectionToClipboard: vi.fn(),
    pasteClipboardAt: vi.fn(),
    undoStack: [],
    redoStack: [],
    undo: vi.fn(),
    redo: vi.fn(),
    selectedTileGroups: [],
    setSelectedTileGroups: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getBaseStore());
  });

  it('should show loading state when level is not loaded', () => {
    render(
      <BrowserRouter>
        <LevelEditor />
      </BrowserRouter>
    );
    
    expect(screen.getByText('Loading level...')).toBeInTheDocument();
  });

  it('should load level on mount', async () => {
    const level = createLevel({
      id: 'test-level-1',
      gameId: 'game-1',
      title: 'Test Level',
      width: 800,
      height: 600,
    });

    (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);

    render(
      <BrowserRouter>
        <LevelEditor />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(storageService.loadLevel).toHaveBeenCalledWith('test-level-1');
      expect(mockSetCurrentLevel).toHaveBeenCalledWith(level);
    });
  });

  it('should navigate to dashboard if level not found', async () => {
    (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    render(
      <BrowserRouter>
        <LevelEditor />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('should render editor when level is loaded', async () => {
    const level = createLevel({
      id: 'test-level-1',
      gameId: 'game-1',
      title: 'Test Level',
      width: 800,
      height: 600,
    });

    (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getBaseStore({
      currentLevel: level,
    }));

    render(
      <BrowserRouter>
        <LevelEditor />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Level Editor: Test Level/)).toBeInTheDocument();
    });

    // Check that components are rendered
    expect(screen.getByTestId('level-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('tool-palette')).toBeInTheDocument();
    expect(screen.getByTestId('properties-panel')).toBeInTheDocument();
  });

  it('should save level when save button is clicked', async () => {
    const user = userEvent.setup();
    const level = createLevel({
      id: 'test-level-1',
      gameId: 'game-1',
      title: 'Test Level',
      width: 800,
      height: 600,
    });

    (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
    (storageService.saveLevel as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const state = getBaseStore({ currentLevel: level });
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(state);
    (useEditorStore as unknown as { getState: () => typeof state }).getState = () => state;

    render(
      <BrowserRouter>
        <LevelEditor />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Save Level')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Level');
    await user.click(saveButton);

    await waitFor(() => {
      expect(storageService.saveLevel).toHaveBeenCalledWith(level);
    });
  });

  it('should save level when Ctrl+S is pressed', async () => {
    const level = createLevel({
      id: 'test-level-1',
      gameId: 'game-1',
      title: 'Test Level',
      width: 800,
      height: 600,
    });

    (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
    (storageService.saveLevel as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const state = getBaseStore({ currentLevel: level });
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(state);
    (useEditorStore as unknown as { getState: () => typeof state }).getState = () => state;

    render(
      <BrowserRouter>
        <LevelEditor />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Save Level')).toBeInTheDocument();
    });

    fireEvent.keyDown(window, { key: 's', ctrlKey: true, preventDefault: vi.fn() });

    await waitFor(() => {
      expect(storageService.saveLevel).toHaveBeenCalledWith(level);
    });
  });

  it('should show save status after saving', async () => {
    const user = userEvent.setup();
    const level = createLevel({
      id: 'test-level-1',
      gameId: 'game-1',
      title: 'Test Level',
      width: 800,
      height: 600,
    });

    (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
    (storageService.saveLevel as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const state = getBaseStore({ currentLevel: level });
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(state);
    (useEditorStore as unknown as { getState: () => typeof state }).getState = () => state;

    render(
      <BrowserRouter>
        <LevelEditor />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Save Level')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save Level');
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('✓ Saved')).toBeInTheDocument();
    });
  });

  it('should navigate to dashboard when back button is clicked', async () => {
    const user = userEvent.setup();
    const level = createLevel({
      id: 'test-level-1',
      gameId: 'game-1',
      title: 'Test Level',
      width: 800,
      height: 600,
    });

    (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getBaseStore({
      currentLevel: level,
    }));

    render(
      <BrowserRouter>
        <LevelEditor />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
    });

    const backButton = screen.getByText('Back to Dashboard');
    await user.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  describe('ConfirmDeleteTileGroupModal', () => {
    it('should render modal when pendingTileGroupDelete is set', async () => {
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const pendingGroup = [
        { cellX: 0, cellY: 0, tileId: 't1', passable: false },
        { cellX: 1, cellY: 0, tileId: 't1', passable: false },
      ];

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getBaseStore({
        currentLevel: level,
        pendingTileGroupDelete: pendingGroup,
      }));

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-modal')).toBeInTheDocument();
        expect(screen.getByText('Delete 2 tiles?')).toBeInTheDocument();
      });
    });

    it('should call removeTileAtCell for each tile when confirmed', async () => {
      const user = userEvent.setup();
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const pendingGroup = [
        { cellX: 0, cellY: 0, tileId: 't1', passable: false },
        { cellX: 1, cellY: 0, tileId: 't1', passable: false },
      ];

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getBaseStore({
        currentLevel: level,
        pendingTileGroupDelete: pendingGroup,
      }));

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-modal')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Delete group');
      await user.click(confirmButton);

      expect(mockRemoveTileAtCell).toHaveBeenCalledTimes(2);
      expect(mockRemoveTileAtCell).toHaveBeenCalledWith(0, 0);
      expect(mockRemoveTileAtCell).toHaveBeenCalledWith(1, 0);
      expect(mockSetPendingTileGroupDelete).toHaveBeenCalledWith(null);
      expect(mockSetSelectedTileEntry).toHaveBeenCalledWith(null);
      expect(mockSetSelectedTileGroup).toHaveBeenCalledWith(null);
    });

    it('should clear pendingTileGroupDelete when cancelled', async () => {
      const user = userEvent.setup();
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const pendingGroup = [
        { cellX: 0, cellY: 0, tileId: 't1', passable: false },
      ];

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getBaseStore({
        currentLevel: level,
        pendingTileGroupDelete: pendingGroup,
      }));

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('confirm-delete-modal')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockSetPendingTileGroupDelete).toHaveBeenCalledWith(null);
      expect(mockRemoveTileAtCell).not.toHaveBeenCalled();
    });
  });

  describe('ConfirmPlaceOverwriteModal', () => {
    it('should render modal when pendingPlaceOverwrite is set', async () => {
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const pendingOverwrite = {
        minCellX: 0,
        maxCellX: 1,
        minCellY: 0,
        maxCellY: 1,
        tileId: 'solid',
        passable: false,
        overlappingCells: [{ cellX: 0, cellY: 0 }, { cellX: 1, cellY: 0 }],
      };

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getBaseStore({
        currentLevel: level,
        pendingPlaceOverwrite: pendingOverwrite,
      }));

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('confirm-place-overwrite-modal')).toBeInTheDocument();
        expect(screen.getByText('Replace 2 tiles?')).toBeInTheDocument();
      });
    });

    it('should call setTileAtCell for each cell in placement rect when confirmed', async () => {
      const user = userEvent.setup();
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const pendingOverwrite = {
        minCellX: 0,
        maxCellX: 1,
        minCellY: 0,
        maxCellY: 1,
        tileId: 'solid',
        passable: false,
        overlappingCells: [{ cellX: 0, cellY: 0 }],
      };

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getBaseStore({
        currentLevel: level,
        pendingPlaceOverwrite: pendingOverwrite,
      }));

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('confirm-place-overwrite-modal')).toBeInTheDocument();
      });

      const replaceButton = screen.getByText('Replace');
      await user.click(replaceButton);

      // Should place tiles in 2x2 rect: (0,0), (1,0), (0,1), (1,1)
      expect(mockSetTileAtCell).toHaveBeenCalledTimes(4);
      expect(mockSetTileAtCell).toHaveBeenCalledWith('solid', 0, 0, false);
      expect(mockSetTileAtCell).toHaveBeenCalledWith('solid', 1, 0, false);
      expect(mockSetTileAtCell).toHaveBeenCalledWith('solid', 0, 1, false);
      expect(mockSetTileAtCell).toHaveBeenCalledWith('solid', 1, 1, false);
      expect(mockSetPendingPlaceOverwrite).toHaveBeenCalledWith(null);
    });

    it('should clear pendingPlaceOverwrite when cancelled', async () => {
      const user = userEvent.setup();
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
      });

      const pendingOverwrite = {
        minCellX: 0,
        maxCellX: 0,
        minCellY: 0,
        maxCellY: 0,
        tileId: 'solid',
        passable: false,
        overlappingCells: [{ cellX: 0, cellY: 0 }],
      };

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(getBaseStore({
        currentLevel: level,
        pendingPlaceOverwrite: pendingOverwrite,
      }));

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('confirm-place-overwrite-modal')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(mockSetPendingPlaceOverwrite).toHaveBeenCalledWith(null);
      expect(mockSetTileAtCell).not.toHaveBeenCalled();
    });
  });
});
