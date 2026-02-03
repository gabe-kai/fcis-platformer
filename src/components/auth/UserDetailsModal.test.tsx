import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserDetailsModal } from './UserDetailsModal';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import type { User } from '@/models/User';

// Mock React Portal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

// Mock authService
vi.mock('@/services/authService', () => ({
  authService: {
    getAllUsers: vi.fn(),
    updateProfile: vi.fn(),
    resetUserPassword: vi.fn(),
    isAdmin: vi.fn(),
  },
}));

// Mock ChangePasswordModal
vi.mock('./ChangePasswordModal', () => ({
  ChangePasswordModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="change-password-modal">
      <button onClick={onClose}>Close Password Modal</button>
    </div>
  ),
}));

describe('UserDetailsModal', () => {
  const mockUser: User = {
    id: 'admin',
    username: 'admin',
    email: 'admin@fcis.local',
    provider: 'local',
    createdAt: Date.now(),
  };

  const mockUpdateProfile = vi.fn();
  const mockUseAuthStore = vi.fn(() => ({
    user: mockUser as User | null,
    updateProfile: mockUpdateProfile,
  }));

  beforeEach(() => {
    // `clearAllMocks` does not reset mocked return values; tests in this file
    // override `mockUseAuthStore` in places (e.g. user=null), so we must reset.
    vi.clearAllMocks();
    mockUseAuthStore.mockReset();
    mockUseAuthStore.mockReturnValue({
      user: mockUser as User | null,
      updateProfile: mockUpdateProfile,
    });
    (useAuthStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(mockUseAuthStore);
    document.body.innerHTML = '';
  });

  describe('Modal Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<UserDetailsModal isOpen={false} onClose={vi.fn()} />);
      expect(screen.queryByText('User Details')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('User Details')).toBeInTheDocument();
    });

    it('should not render when user is null', () => {
      mockUseAuthStore.mockReturnValue({
        user: null as User | null,
        updateProfile: mockUpdateProfile,
      });
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.queryByText('User Details')).not.toBeInTheDocument();
    });
  });

  describe('Profile Tab', () => {
    it('should display user information', () => {
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('admin@fcis.local')).toBeInTheDocument();
      expect(screen.getByText('local')).toBeInTheDocument();
    });

    it('should show edit button', () => {
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    });

    it('should show change password button for local users', () => {
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });

    it('should not show change password button for OAuth users', () => {
      const oauthUser: User = {
        ...mockUser,
        provider: 'google',
      };
      mockUseAuthStore.mockReturnValue({
        user: oauthUser,
        updateProfile: mockUpdateProfile,
      });
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.queryByText('Change Password')).not.toBeInTheDocument();
    });

    it('should switch to edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      const editButton = screen.getByText('Edit Profile');
      await user.click(editButton);
      
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should save profile changes', async () => {
      const user = userEvent.setup();
      const mockUpdateProfileService = vi.fn().mockResolvedValue(undefined);
      (authService.updateProfile as ReturnType<typeof vi.fn>).mockImplementation(mockUpdateProfileService);

      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      // Enter edit mode
      await user.click(screen.getByText('Edit Profile'));
      
      // Update fields
      const usernameInput = screen.getByLabelText(/username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'NewUsername');
      
      const emailInput = screen.getByLabelText(/email/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@example.com');
      
      // Save
      await user.click(screen.getByText('Save Changes'));
      
      await waitFor(() => {
        expect(mockUpdateProfileService).toHaveBeenCalledWith({
          username: 'NewUsername',
          email: 'newemail@example.com',
          avatar: undefined,
        });
      });
    });

    it('should cancel editing and revert changes', async () => {
      const user = userEvent.setup();
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      // Enter edit mode
      await user.click(screen.getByText('Edit Profile'));
      
      // Change username
      const usernameInput = screen.getByLabelText(/username/i);
      await user.clear(usernameInput);
      await user.type(usernameInput, 'ChangedName');
      
      // Cancel
      await user.click(screen.getByText('Cancel'));
      
      // Should be back to view mode with original values
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.queryByLabelText(/username/i)).not.toBeInTheDocument();
    });

    it('should show error message on validation failure', async () => {
      const user = userEvent.setup();
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      // Enter edit mode
      await user.click(screen.getByText('Edit Profile'));
      
      // Clear username (invalid)
      const usernameInput = screen.getByLabelText(/username/i);
      await user.clear(usernameInput);
      
      // Try to save
      await user.click(screen.getByText('Save Changes'));
      
      await waitFor(() => {
        expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Admin Tab', () => {
    beforeEach(() => {
      (authService.isAdmin as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (authService.getAllUsers as ReturnType<typeof vi.fn>).mockReturnValue([
        mockUser,
        {
          id: 'user-2',
          username: 'testuser',
          email: 'test@example.com',
          provider: 'local',
          createdAt: Date.now(),
        },
      ]);
    });

    it('should show admin tab for admin users', () => {
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.getByText('User Management')).toBeInTheDocument();
    });

    it('should not show admin tab for non-admin users', () => {
      const regularUser: User = {
        id: 'regular-user',
        username: 'Regular User',
        email: 'user@example.com',
        provider: 'local',
      };
      mockUseAuthStore.mockReturnValue({
        user: regularUser,
        updateProfile: mockUpdateProfile,
      });
      (authService.isAdmin as ReturnType<typeof vi.fn>).mockReturnValue(false);

      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      expect(screen.queryByText('User Management')).not.toBeInTheDocument();
    });

    it('should display all users in admin tab', async () => {
      const user = userEvent.setup();
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      // Switch to admin tab
      await user.click(screen.getByText('User Management'));
      
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should show reset password button for non-admin local users', async () => {
      const user = userEvent.setup();
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      // Switch to admin tab
      await user.click(screen.getByText('User Management'));
      
      // Should show reset button for testuser (not admin)
      const resetButtons = screen.getAllByText('Reset Password');
      expect(resetButtons.length).toBeGreaterThan(0);
    });

    it('should not show reset password button for admin user', async () => {
      const user = userEvent.setup();
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      // Switch to admin tab
      await user.click(screen.getByText('User Management'));
      
      // Admin user should not have reset button
      const adminItem = screen.getByText('admin').closest('.user-item');
      if (adminItem) {
        expect(adminItem.querySelector('.reset-password-button')).not.toBeInTheDocument();
      }
    });

    it('should reset user password when button is clicked', async () => {
      const user = userEvent.setup();
      const mockResetPassword = vi.fn().mockResolvedValue(undefined);
      (authService.resetUserPassword as ReturnType<typeof vi.fn>).mockImplementation(mockResetPassword);
      const mockGetAllUsers = vi.fn().mockReturnValue([
        mockUser,
        {
          id: 'user-2',
          username: 'testuser',
          email: 'test@example.com',
          provider: 'local',
          createdAt: Date.now(),
        },
      ]);
      (authService.getAllUsers as ReturnType<typeof vi.fn>).mockImplementation(mockGetAllUsers);

      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      // Switch to admin tab
      await user.click(screen.getByText('User Management'));
      
      // Click reset password button
      const resetButtons = screen.getAllByText('Reset Password');
      await user.click(resetButtons[0]);
      
      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalled();
      });
    });
  });

  describe('Change Password Modal', () => {
    it('should open change password modal when button is clicked', async () => {
      const user = userEvent.setup();
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      await user.click(screen.getByText('Change Password'));
      
      expect(screen.getByTestId('change-password-modal')).toBeInTheDocument();
    });

    it('should close change password modal', async () => {
      const user = userEvent.setup();
      render(<UserDetailsModal isOpen={true} onClose={vi.fn()} />);
      
      await user.click(screen.getByText('Change Password'));
      await user.click(screen.getByText('Close Password Modal'));
      
      expect(screen.queryByTestId('change-password-modal')).not.toBeInTheDocument();
    });
  });

  describe('Modal Close', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<UserDetailsModal isOpen={true} onClose={onClose} />);
      
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when overlay is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<UserDetailsModal isOpen={true} onClose={onClose} />);
      
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) {
        await user.click(overlay);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });
});
