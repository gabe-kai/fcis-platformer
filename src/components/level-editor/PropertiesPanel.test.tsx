import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropertiesPanel } from './PropertiesPanel';
import { useEditorStore } from '@/stores/editorStore';
import { createPlatform } from '@/models/Platform';

// Mock the editor store
vi.mock('@/stores/editorStore', () => ({
  useEditorStore: vi.fn(),
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

// Mock window.confirm
const mockConfirm = vi.fn();
window.confirm = mockConfirm;

describe('PropertiesPanel', () => {
  const mockUpdatePlatformProperties = vi.fn();
  const mockDeletePlatform = vi.fn();
  const mockUpdateLevel = vi.fn();
  const mockUpdateLevelDimensions = vi.fn();
  const mockToggleGrid = vi.fn();
  const mockRemoveTileAtCell = vi.fn();
  const makeTileGrid = (widthTiles: number, heightTiles: number) =>
    Array.from({ length: heightTiles }, () =>
      Array.from({ length: widthTiles }, () => ({ passable: true }))
    );
  const baseStore = {
    currentLevel: null,
    selectedPlatform: null,
    selectedTileEntry: null,
    selectedTileGroup: null,
    selectedTileGroups: [],
    updatePlatformProperties: mockUpdatePlatformProperties,
    deletePlatform: mockDeletePlatform,
    placePlatform: vi.fn(),
    setSelectedPlatform: vi.fn(),
    updateLevel: mockUpdateLevel,
    updateLevelDimensions: mockUpdateLevelDimensions,
    gridEnabled: true,
    toggleGrid: mockToggleGrid,
    removeTileAtCell: mockRemoveTileAtCell,
    zoom: 1,
    viewportState: { scrollLeft: 0, scrollTop: 0, canvasWidth: 800, canvasHeight: 600 },
    levelValidationWarnings: { missingSpawn: false, missingWin: false },
    setPendingBackgroundImageDataUrl: vi.fn(),
    setTileAtCell: vi.fn(),
    setTileDisplayName: vi.fn(),
    setGroupDisplayName: vi.fn(),
    setSelectedTileEntry: vi.fn(),
    setSelectedTileGroup: vi.fn(),
    setZoom: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseStore,
    });
  });

  it('should show empty state when no platform is selected', async () => {
    userEvent.setup();
    const mockLevel = {
      id: 'level-1',
      gameId: 'game-1',
      title: 'Test Level',
      width: 800,
      height: 600,
      gridSize: 64,
      tileGrid: makeTileGrid(12, 9),
      platforms: [],
      cameraMode: 'free' as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isShared: false,
      sharingScope: 'private' as const,
      isTemplate: false,
    };

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseStore,
      currentLevel: mockLevel,
    });

    render(<PropertiesPanel />);
    
    expect(screen.getByText('Selected Object Details')).toBeInTheDocument();
    // Section is now expanded by default (defaultExpanded={true})
    // So we should see the empty state content directly
    expect(screen.getByText('No object selected')).toBeInTheDocument();
    expect(screen.getByText(/Select a tile or platform to view its properties/)).toBeInTheDocument();
  });

  it('should display platform properties when platform is selected', () => {
    const platform = createPlatform({
      id: 'platform-1',
      levelId: 'level-1',
      type: 'solid',
      bounds: { x: 100, y: 200, width: 50, height: 20 },
    });

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseStore,
      currentLevel: {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [platform],
        cameraMode: 'free',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private',
        isTemplate: false,
      },
      selectedPlatform: platform,
    });

    render(<PropertiesPanel />);
    
    expect(screen.getByText('Selected Object Details')).toBeInTheDocument();
    // Should automatically be in edit mode, so check for form inputs
    expect(screen.getByLabelText(/X Position/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Y Position/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Width/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Height/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
    // Check that values are populated
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
  });

  it('should automatically enter edit mode when platform is selected', () => {
    const platform = createPlatform({
      id: 'platform-1',
      levelId: 'level-1',
      bounds: { x: 100, y: 200, width: 50, height: 20 },
    });

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseStore,
      currentLevel: {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [platform],
        cameraMode: 'free',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private',
        isTemplate: false,
      },
      selectedPlatform: platform,
    });

    render(<PropertiesPanel />);
    
    // Should automatically be in edit mode (no Edit button)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/X Position/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Y Position/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Width/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Height/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
  });

  it('should update platform properties when save is clicked', async () => {
    const user = userEvent.setup();
    const platform = createPlatform({
      id: 'platform-1',
      levelId: 'level-1',
      type: 'solid',
      bounds: { x: 100, y: 200, width: 50, height: 20 },
    });

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseStore,
      currentLevel: {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [platform],
        cameraMode: 'free',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private',
        isTemplate: false,
      },
      selectedPlatform: platform,
    });

    render(<PropertiesPanel />);
    
    // Should already be in edit mode (auto-enters when platform selected)
    // Update values
    const xInput = screen.getByLabelText(/X Position/i);
    await user.clear(xInput);
    await user.type(xInput, '150');
    
    const saveButton = screen.getByText('Save');
    await user.click(saveButton);
    
    expect(mockUpdatePlatformProperties).toHaveBeenCalledWith('platform-1', {
      bounds: {
        x: 150,
        y: 200,
        width: 50,
        height: 20,
      },
      type: 'solid',
    });
  });

  it('should cancel edit mode when cancel is clicked', async () => {
    const user = userEvent.setup();
    const platform = createPlatform({
      id: 'platform-1',
      levelId: 'level-1',
      bounds: { x: 100, y: 200, width: 50, height: 20 },
    });

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseStore,
      currentLevel: {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [platform],
        cameraMode: 'free',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private',
        isTemplate: false,
      },
      selectedPlatform: platform,
    });

    render(<PropertiesPanel />);
    
    // Should automatically be in edit mode
    expect(screen.getByLabelText(/X Position/i)).toBeInTheDocument();
    
    await user.click(screen.getByText('Cancel'));
    
    // Should be back to view mode (no edit form)
    expect(screen.queryByLabelText(/X Position/i)).not.toBeInTheDocument();
    expect(screen.getByText(/\(100, 200\)/)).toBeInTheDocument();
  });

  it('should delete platform when delete button is clicked', async () => {
    const user = userEvent.setup();
    const platform = createPlatform({
      id: 'platform-1',
      levelId: 'level-1',
      bounds: { x: 100, y: 200, width: 50, height: 20 },
    });

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseStore,
      currentLevel: {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [platform],
        cameraMode: 'free',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private',
        isTemplate: false,
      },
      selectedPlatform: platform,
    });

    render(<PropertiesPanel />);
    
    const deleteButton = screen.getByText('Delete Platform');
    await user.click(deleteButton);
    
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockDeletePlatform).toHaveBeenCalledWith('platform-1');
  });

  it('should not delete platform if user cancels confirmation', async () => {
    const user = userEvent.setup();
    mockConfirm.mockReturnValue(false);
    
    const platform = createPlatform({
      id: 'platform-1',
      levelId: 'level-1',
      bounds: { x: 100, y: 200, width: 50, height: 20 },
    });

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...baseStore,
      currentLevel: {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [platform],
        cameraMode: 'free',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private',
        isTemplate: false,
      },
      selectedPlatform: platform,
    });

    render(<PropertiesPanel />);
    
    const deleteButton = screen.getByText('Delete Platform');
    await user.click(deleteButton);
    
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockDeletePlatform).not.toHaveBeenCalled();
  });

  describe('Level Validation Warnings', () => {
    it('should display validation warnings when spawn is missing', () => {
      const mockLevel = {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [],
        cameraMode: 'free' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private' as const,
        isTemplate: false,
      };

      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...baseStore,
        currentLevel: mockLevel,
        levelValidationWarnings: { missingSpawn: true, missingWin: false },
      });

      render(<PropertiesPanel />);

      expect(screen.getByText('Validation')).toBeInTheDocument();
      expect(screen.getByText('Missing spawn point')).toBeInTheDocument();
      expect(screen.queryByText('Missing win condition')).not.toBeInTheDocument();
    });

    it('should display validation warnings when win is missing', () => {
      const mockLevel = {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [],
        cameraMode: 'free' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private' as const,
        isTemplate: false,
      };

      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...baseStore,
        currentLevel: mockLevel,
        levelValidationWarnings: { missingSpawn: false, missingWin: true },
      });

      render(<PropertiesPanel />);

      expect(screen.getByText('Validation')).toBeInTheDocument();
      expect(screen.getByText('Missing win condition')).toBeInTheDocument();
      expect(screen.queryByText('Missing spawn point')).not.toBeInTheDocument();
    });

    it('should display both warnings when spawn and win are missing', () => {
      const mockLevel = {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [],
        cameraMode: 'free' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private' as const,
        isTemplate: false,
      };

      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...baseStore,
        currentLevel: mockLevel,
        levelValidationWarnings: { missingSpawn: true, missingWin: true },
      });

      render(<PropertiesPanel />);

      expect(screen.getByText('Validation')).toBeInTheDocument();
      expect(screen.getByText('Missing spawn point')).toBeInTheDocument();
      expect(screen.getByText('Missing win condition')).toBeInTheDocument();
      expect(screen.getByText(/You can still save the level, but it may not be playable without these elements/)).toBeInTheDocument();
    });

    it('should not display validation warnings when none are present', () => {
      const mockLevel = {
        id: 'level-1',
        gameId: 'game-1',
        title: 'Test Level',
        width: 800,
        height: 600,
        gridSize: 64,
        tileGrid: makeTileGrid(12, 9),
        platforms: [],
        cameraMode: 'free' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isShared: false,
        sharingScope: 'private' as const,
        isTemplate: false,
      };

      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...baseStore,
        currentLevel: mockLevel,
        levelValidationWarnings: { missingSpawn: false, missingWin: false },
      });

      render(<PropertiesPanel />);

      expect(screen.queryByText('Validation')).not.toBeInTheDocument();
      expect(screen.queryByText('Missing spawn point')).not.toBeInTheDocument();
      expect(screen.queryByText('Missing win condition')).not.toBeInTheDocument();
    });

    it('should not display validation warnings when no level is loaded', () => {
      (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        ...baseStore,
        currentLevel: null,
        levelValidationWarnings: { missingSpawn: true, missingWin: true },
      });

      render(<PropertiesPanel />);

      expect(screen.queryByText('Validation')).not.toBeInTheDocument();
    });
  });
});
