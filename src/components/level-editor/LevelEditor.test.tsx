import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  beforeEach(() => {
    vi.clearAllMocks();
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentLevel: null,
      setCurrentLevel: mockSetCurrentLevel,
      updateLevelDimensions: vi.fn(),
      viewMode: 'texture',
      setViewMode: mockSetViewMode,
    });
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
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentLevel: level,
      setCurrentLevel: mockSetCurrentLevel,
      updateLevelDimensions: vi.fn(),
      viewMode: 'texture',
      setViewMode: mockSetViewMode,
    });

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
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentLevel: level,
      setCurrentLevel: mockSetCurrentLevel,
      updateLevelDimensions: vi.fn(),
      viewMode: 'texture',
      setViewMode: mockSetViewMode,
    });

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
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentLevel: level,
      setCurrentLevel: mockSetCurrentLevel,
      updateLevelDimensions: vi.fn(),
      viewMode: 'texture',
      setViewMode: mockSetViewMode,
    });

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
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      currentLevel: level,
      setCurrentLevel: mockSetCurrentLevel,
      updateLevelDimensions: vi.fn(),
      viewMode: 'texture',
      setViewMode: mockSetViewMode,
    });

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
});
