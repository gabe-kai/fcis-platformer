import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LevelCanvas } from './LevelCanvas';
import { useEditorStore } from '@/stores/editorStore';
import { createLevel } from '@/models/Level';

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

// Mock grid utilities
vi.mock('@/utils/grid', () => ({
  drawGrid: vi.fn(),
  calculateGridPosition: vi.fn((x, y) => ({ x, y })),
}));

// Mock createPlatform
vi.mock('@/models/Platform', () => ({
  createPlatform: vi.fn((data) => ({
    id: data.id || 'platform-1',
    levelId: data.levelId,
    type: data.type || 'solid',
    bounds: data.bounds,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })),
}));

describe('LevelCanvas', () => {
  const mockSetSelectedPlatform = vi.fn();
  const mockPlacePlatform = vi.fn();
  const mockSetSelectedTool = vi.fn();
  const mockSetSelectedTileEntry = vi.fn();
  const mockSetSelectedTileGroup = vi.fn();
  const mockSetTileAtCell = vi.fn();
  const mockRemoveTileAtCell = vi.fn();
  const mockSetZoom = vi.fn();
  const mockSetViewportState = vi.fn();
  const mockSetTargetScrollPosition = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock canvas getContext - return null since we're not actually using it in these tests
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentLevel: null,
      selectedTool: 'select',
      gridEnabled: true,
      viewMode: 'texture',
      gridSize: 32,
      zoom: 1,
      selectedPlatform: null,
      selectedTile: null,
      selectedTileEntry: null,
      selectedTileGroup: null,
      selectedLayer: 'primary',
      setSelectedTool: mockSetSelectedTool,
      setSelectedTileEntry: mockSetSelectedTileEntry,
      setSelectedTileGroup: mockSetSelectedTileGroup,
      setSelectedPlatform: mockSetSelectedPlatform,
      setTileAtCell: mockSetTileAtCell,
      removeTileAtCell: mockRemoveTileAtCell,
      setZoom: mockSetZoom,
      setViewportState: mockSetViewportState,
      setTargetScrollPosition: mockSetTargetScrollPosition,
      placePlatform: mockPlacePlatform,
    });
  });

  it('should not render canvas element when no level is loaded', () => {
    const { container } = render(<LevelCanvas />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeNull();
  });

  it('should show empty message when no level is loaded', () => {
    render(<LevelCanvas />);
    expect(document.querySelector('.level-canvas-empty')).toBeInTheDocument();
  });

  it('should render canvas when level is loaded', () => {
    const level = createLevel({
      id: 'level-1',
      gameId: 'game-1',
      title: 'Test Level',
      width: 800,
      height: 600,
    });

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentLevel: level,
      selectedTool: 'select',
      gridEnabled: true,
      viewMode: 'texture',
      gridSize: 32,
      zoom: 1,
      selectedPlatform: null,
      selectedTile: null,
      selectedTileEntry: null,
      selectedTileGroup: null,
      selectedLayer: 'primary',
      setSelectedTool: mockSetSelectedTool,
      setSelectedTileEntry: mockSetSelectedTileEntry,
      setSelectedTileGroup: mockSetSelectedTileGroup,
      setSelectedPlatform: mockSetSelectedPlatform,
      setTileAtCell: mockSetTileAtCell,
      removeTileAtCell: mockRemoveTileAtCell,
      setZoom: mockSetZoom,
      setViewportState: mockSetViewportState,
      setTargetScrollPosition: mockSetTargetScrollPosition,
      placePlatform: mockPlacePlatform,
    });

    const { container } = render(<LevelCanvas />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(document.querySelector('.level-canvas-empty')).not.toBeInTheDocument();
  });

  it('should handle canvas resize', () => {
    const level = createLevel({
      id: 'level-1',
      gameId: 'game-1',
      title: 'Test Level',
      width: 800,
      height: 600,
    });

    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentLevel: level,
      selectedTool: 'select',
      gridEnabled: true,
      viewMode: 'texture',
      gridSize: 32,
      zoom: 1,
      selectedPlatform: null,
      selectedTile: null,
      selectedTileEntry: null,
      selectedTileGroup: null,
      selectedLayer: 'primary',
      setSelectedTool: mockSetSelectedTool,
      setSelectedTileEntry: mockSetSelectedTileEntry,
      setSelectedTileGroup: mockSetSelectedTileGroup,
      setSelectedPlatform: mockSetSelectedPlatform,
      setTileAtCell: mockSetTileAtCell,
      removeTileAtCell: mockRemoveTileAtCell,
      setZoom: mockSetZoom,
      setViewportState: mockSetViewportState,
      setTargetScrollPosition: mockSetTargetScrollPosition,
      placePlatform: mockPlacePlatform,
    });

    const { container } = render(<LevelCanvas />);
    const canvas = container.querySelector('canvas');
    
    // Simulate resize
    if (canvas) {
      Object.defineProperty(canvas, 'parentElement', {
        value: { clientWidth: 1000, clientHeight: 800 },
        writable: true,
      });
      
      // Trigger resize event
      window.dispatchEvent(new Event('resize'));
    }

    expect(canvas).toBeInTheDocument();
  });
});
