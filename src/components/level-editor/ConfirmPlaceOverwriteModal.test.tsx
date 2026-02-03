import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmPlaceOverwriteModal } from './ConfirmPlaceOverwriteModal';

describe('ConfirmPlaceOverwriteModal', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <ConfirmPlaceOverwriteModal
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
      <ConfirmPlaceOverwriteModal
        isOpen={true}
        tileCount={5}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('heading', { name: /replace existing tiles\?/i })).toBeInTheDocument();
    expect(
      screen.getByText((_, el) =>
        (el?.textContent ?? '').includes('This will replace') &&
        (el?.textContent ?? '').includes('5') &&
        (el?.textContent ?? '').includes('tiles with the selected tile')
      )
    ).toBeInTheDocument();
  });

  it('uses singular "tile" when tileCount is 1', () => {
    render(
      <ConfirmPlaceOverwriteModal
        isOpen={true}
        tileCount={1}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(
      screen.getByText((_, el) =>
        (el?.textContent ?? '').includes('This will replace') &&
        (el?.textContent ?? '').includes('1 tile') &&
        (el?.textContent ?? '').includes('with the selected tile')
      )
    ).toBeInTheDocument();
  });

  it('calls onConfirm when Replace is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmPlaceOverwriteModal
        isOpen={true}
        tileCount={2}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: /^replace$/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmPlaceOverwriteModal
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
      <ConfirmPlaceOverwriteModal
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
