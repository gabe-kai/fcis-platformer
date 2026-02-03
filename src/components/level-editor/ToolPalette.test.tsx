import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolPalette } from './ToolPalette';
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

describe('ToolPalette', () => {
  const mockSetSelectedTool = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      selectedTool: 'select',
      setSelectedTool: mockSetSelectedTool,
    });
  });

  it('should render tool palette with tools', () => {
    render(<ToolPalette />);
    
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('should highlight active tool', () => {
    (useEditorStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      selectedTool: 'platform',
      setSelectedTool: mockSetSelectedTool,
    });

    render(<ToolPalette />);
    
    const selectButton = screen.getByText('Select').closest('button');
    const platformButton = screen.getByText('Platform').closest('button');
    
    expect(selectButton).not.toHaveClass('active');
    expect(platformButton).toHaveClass('active');
  });

  it('should call setSelectedTool when select tool is clicked', async () => {
    const user = userEvent.setup();
    render(<ToolPalette />);
    
    const selectButton = screen.getByText('Select').closest('button');
    await user.click(selectButton!);
    
    expect(mockSetSelectedTool).toHaveBeenCalledWith('select');
  });

  it('should call setSelectedTool when platform tool is clicked', async () => {
    const user = userEvent.setup();
    render(<ToolPalette />);
    
    const platformButton = screen.getByText('Platform').closest('button');
    await user.click(platformButton!);
    
    expect(mockSetSelectedTool).toHaveBeenCalledWith('platform');
  });

  it('should call setSelectedTool when delete tool is clicked', async () => {
    const user = userEvent.setup();
    render(<ToolPalette />);
    
    const deleteButton = screen.getByText('Delete').closest('button');
    await user.click(deleteButton!);
    
    expect(mockSetSelectedTool).toHaveBeenCalledWith('delete');
  });

  it('should display tool icons', () => {
    render(<ToolPalette />);
    
    const selectIcon = screen.getByText('↖');
    const platformIcon = screen.getByText('▭');
    const deleteIcon = screen.getByText('🗑');
    
    expect(selectIcon).toBeInTheDocument();
    expect(platformIcon).toBeInTheDocument();
    expect(deleteIcon).toBeInTheDocument();
  });
});
