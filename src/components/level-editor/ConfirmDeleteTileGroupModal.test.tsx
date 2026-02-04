import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDeleteTileGroupModal } from './ConfirmDeleteTileGroupModal';

describe('ConfirmDeleteTileGroupModal', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <ConfirmDeleteTileGroupModal
        isOpen={false}
        tileCount={3}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and message when open', () => {
    render(
      <ConfirmDeleteTileGroupModal
        isOpen={true}
        tileCount={5}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /delete tile group\?/i })).toBeInTheDocument();
    const paragraph = screen.getByText((_content, el) => el?.tagName === 'P' && (el?.textContent ?? '').includes('This will remove') && (el?.textContent ?? '').includes('5') && (el?.textContent ?? '').includes('tiles from the map'));
    expect(paragraph).toBeInTheDocument();
  });

  it('uses singular "tile" when tileCount is 1', () => {
    render(
      <ConfirmDeleteTileGroupModal
        isOpen={true}
        tileCount={1}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const paragraph = screen.getByText((_content, el) => el?.tagName === 'P' && (el?.textContent ?? '').includes('This will remove') && (el?.textContent ?? '').includes('1 tile') && (el?.textContent ?? '').includes('from the map'));
    expect(paragraph).toBeInTheDocument();
  });

  it('calls onConfirm when Delete group is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDeleteTileGroupModal
        isOpen={true}
        tileCount={2}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /delete group/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDeleteTileGroupModal
        isOpen={true}
        tileCount={2}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when close button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmDeleteTileGroupModal
        isOpen={true}
        tileCount={2}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
