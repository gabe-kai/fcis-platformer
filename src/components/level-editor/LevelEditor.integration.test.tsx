import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LevelEditor } from './LevelEditor';
import { useEditorStore } from '@/stores/editorStore';
import { storageService } from '@/services/storageService';
import { createLevel } from '@/models/Level';
import { DEFAULT_SOLID_BLOCK } from '@/models/Tile';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ levelId: 'test-level-1' }),
  };
});

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

// Mock canvas getContext (return plain object to avoid recursion from document.createElement('canvas').getContext)
HTMLCanvasElement.prototype.getContext = vi.fn(function (_contextId: string) {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    setLineDash: vi.fn(),
    strokeRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    setTransform: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    canvas: { width: 800, height: 600 },
  } as unknown as CanvasRenderingContext2D;
});

describe('LevelEditor Integration Tests', () => {
  const mockSetCurrentLevel = vi.fn();
  const mockUpdateLevelDimensions = vi.fn();
  const mockSetTileAtCell = vi.fn();
  const mockRemoveTileAtCell = vi.fn();
  const mockSetSelectedTool = vi.fn();
  const mockSetSelectedTileEntry = vi.fn();
  const mockSetSelectedTileGroup = vi.fn();
  const mockSetZoom = vi.fn();
  const mockSetSelectedLayer = vi.fn();
  const mockSetViewMode = vi.fn();
  const mockSetViewportState = vi.fn();
  const mockSetTargetScrollPosition = vi.fn();

  const makeStore = (overrides = {}) => ({
    currentLevel: null,
    selectedTool: 'select',
    selectedPlatform: null,
    selectedTile: null,
    selectedTileEntry: null,
    selectedTileGroup: null,
    selectedTileGroups: [],
    gridEnabled: true,
    viewMode: 'texture' as const,
    gridSize: 64,
    zoom: 1,
    selectedLayer: 'primary',
    viewportState: { scrollLeft: 0, scrollTop: 0, canvasWidth: 800, canvasHeight: 600 },
    targetScrollPosition: null,
    pendingTileGroupDelete: null,
    pendingPlaceOverwrite: null,
    pendingBackgroundImageDataUrl: null,
    levelValidationWarnings: { missingSpawn: false, missingWin: false },
    selectedPattern: null,
    hoverCell: null,
    undoStack: [],
    redoStack: [],
    setCurrentLevel: mockSetCurrentLevel,
    updateLevelDimensions: mockUpdateLevelDimensions,
    setViewMode: mockSetViewMode,
    setViewportState: mockSetViewportState,
    setTargetScrollPosition: mockSetTargetScrollPosition,
    setTileAtCell: mockSetTileAtCell,
    removeTileAtCell: mockRemoveTileAtCell,
    setSelectedTool: mockSetSelectedTool,
    setSelectedTileEntry: mockSetSelectedTileEntry,
    setSelectedTileGroup: mockSetSelectedTileGroup,
    setSelectedTileGroups: vi.fn(),
    setZoom: mockSetZoom,
    setSelectedLayer: mockSetSelectedLayer,
    setPendingTileGroupDelete: vi.fn(),
    setPendingPlaceOverwrite: vi.fn(),
    setPendingBackgroundImageDataUrl: vi.fn(),
    updateLevel: vi.fn(),
    placePatternAt: vi.fn(),
    copySelectionToClipboard: vi.fn(),
    cutSelectionToClipboard: vi.fn(),
    pasteClipboardAt: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(makeStore());
  });

  describe('Level Loading and Display', () => {
    it('should load and display a level successfully', async () => {
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'test-game-1',
        title: 'Test Level',
        width: 20, // cells
        height: 15, // cells
        gridSize: 64,
      });

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStore({ currentLevel: level })
      );

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Level Editor: Test Level/i)).toBeInTheDocument();
      });

      expect(storageService.loadLevel).toHaveBeenCalledWith('test-level-1');
      expect(mockSetCurrentLevel).toHaveBeenCalledWith(level);
    });

    it('should handle level load failure gracefully', async () => {
      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Level not found')
      );

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(storageService.loadLevel).toHaveBeenCalled();
      });
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      });
    });
  });

  describe('Level Save Functionality', () => {
    it('should save level successfully', async () => {
      const user = userEvent.setup();
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'test-game-1',
        title: 'Test Level',
        width: 20,
        height: 15,
      });

      (storageService.saveLevel as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStore({ currentLevel: level })
      );

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      const saveButton = screen.getByText('Save Level');
      await user.click(saveButton);

      await waitFor(() => {
        expect(storageService.saveLevel).toHaveBeenCalledWith(level);
        expect(screen.getByText('✓ Saved')).toBeInTheDocument();
      });
    });

    it('should handle save failure gracefully', async () => {
      const user = userEvent.setup();
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'test-game-1',
        title: 'Test Level',
        width: 20,
        height: 15,
      });

      (storageService.saveLevel as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Save failed')
      );
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStore({ currentLevel: level })
      );

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      const saveButton = screen.getByText('Save Level');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('✗ Error')).toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('should render all editor components together', async () => {
      const level = createLevel({
        id: 'test-level-1',
        gameId: 'test-game-1',
        title: 'Test Level',
        width: 20,
        height: 15,
      });

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStore({ currentLevel: level })
      );

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        // Check that all main components are present (use role/heading to avoid matching multiple "Select" etc.)
        const heading = screen.getByRole('heading', { level: 1, name: /Level Editor: Test Level/i });
        expect(heading).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save Level' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Back to Dashboard' })).toBeInTheDocument();
      });

      // ToolPalette, LevelCanvas, PropertiesPanel should be mounted
      expect(document.querySelector('.tool-palette')).toBeInTheDocument();
      expect(document.querySelector('.level-canvas')).toBeInTheDocument();
      expect(document.querySelector('.properties-panel')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small level (1x1 cells)', async () => {
      const level = createLevel({
        id: 'test-level-small',
        gameId: 'test-game-1',
        title: 'Small Level',
        width: 1,
        height: 1,
        gridSize: 64,
      });

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStore({ currentLevel: level })
      );

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1, name: /Level Editor: Small Level/i });
        expect(heading).toBeInTheDocument();
      });
    });

    it('should handle large level (1000x1000 cells)', async () => {
      const level = createLevel({
        id: 'test-level-large',
        gameId: 'test-game-1',
        title: 'Large Level',
        width: 1000,
        height: 1000,
        gridSize: 64,
      });

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStore({ currentLevel: level })
      );

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1, name: /Level Editor: Large Level/i });
        expect(heading).toBeInTheDocument();
      });
    });

    it('should handle level with existing tiles', async () => {
      const level = createLevel({
        id: 'test-level-tiles',
        gameId: 'test-game-1',
        title: 'Level With Tiles',
        width: 10,
        height: 10,
        gridSize: 64,
      });

      // Add some tiles
      level.tileGrid[0][0] = { tileId: DEFAULT_SOLID_BLOCK.id, passable: false, layer: 'primary' };
      level.tileGrid[1][1] = { tileId: DEFAULT_SOLID_BLOCK.id, passable: false, layer: 'primary' };

      (storageService.loadLevel as ReturnType<typeof vi.fn>).mockResolvedValue(level);
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
        makeStore({ currentLevel: level })
      );

      render(
        <BrowserRouter>
          <LevelEditor />
        </BrowserRouter>
      );

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1, name: /Level Editor: Level With Tiles/i });
        expect(heading).toBeInTheDocument();
      });
    });
  });
});
