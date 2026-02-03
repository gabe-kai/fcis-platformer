import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GridSelector } from './GridSelector';
import { useEditorStore } from '@/stores/editorStore';

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

describe('GridSelector', () => {
  const mockToggleGrid = vi.fn();
  const mockSetGridSize = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      gridEnabled: true,
      gridSize: 32,
      toggleGrid: mockToggleGrid,
      setGridSize: mockSetGridSize,
    });
  });

  it('should render grid selector', () => {
    render(<GridSelector />);
    
    expect(screen.getByText('Grid')).toBeInTheDocument();
    expect(screen.getByText(/Show Grid/)).toBeInTheDocument();
  });

  it('should show grid as enabled when gridEnabled is true', () => {
    render(<GridSelector />);
    
    const toggleButton = screen.getByText(/Show Grid/).closest('button');
    expect(toggleButton).toHaveClass('active');
    expect(toggleButton?.textContent).toContain('☑');
  });

  it('should show grid as disabled when gridEnabled is false', () => {
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      gridEnabled: false,
      gridSize: 32,
      toggleGrid: mockToggleGrid,
      setGridSize: mockSetGridSize,
    });

    render(<GridSelector />);
    
    const toggleButton = screen.getByText(/Show Grid/).closest('button');
    expect(toggleButton).not.toHaveClass('active');
    expect(toggleButton?.textContent).toContain('☐');
  });

  it('should call toggleGrid when toggle button is clicked', async () => {
    const user = userEvent.setup();
    render(<GridSelector />);
    
    const toggleButton = screen.getByText(/Show Grid/).closest('button');
    await user.click(toggleButton!);
    
    expect(mockToggleGrid).toHaveBeenCalledTimes(1);
  });

  it('should display all grid size options', () => {
    render(<GridSelector />);
    
    expect(screen.getByText('16px')).toBeInTheDocument();
    expect(screen.getByText('32px')).toBeInTheDocument();
    expect(screen.getByText('64px')).toBeInTheDocument();
  });

  it('should highlight active grid size', () => {
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      gridEnabled: true,
      gridSize: 64,
      toggleGrid: mockToggleGrid,
      setGridSize: mockSetGridSize,
    });

    render(<GridSelector />);
    
    const size16 = screen.getByText('16px').closest('button');
    const size32 = screen.getByText('32px').closest('button');
    const size64 = screen.getByText('64px').closest('button');
    
    expect(size16).not.toHaveClass('active');
    expect(size32).not.toHaveClass('active');
    expect(size64).toHaveClass('active');
  });

  it('should call setGridSize when a grid size button is clicked', async () => {
    const user = userEvent.setup();
    render(<GridSelector />);
    
    const size16Button = screen.getByText('16px').closest('button');
    await user.click(size16Button!);
    
    expect(mockSetGridSize).toHaveBeenCalledWith(16);
  });
});
