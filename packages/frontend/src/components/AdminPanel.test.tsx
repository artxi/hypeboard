import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminPanel } from './AdminPanel';
import * as api from '../services/api';
import type { Board } from '../types/board';

// Mock the API service
vi.mock('../services/api', () => ({
  api: {
    approveMember: vi.fn(),
    denyRequest: vi.fn(),
  },
}));

describe('AdminPanel', () => {
  const mockBoard: Board = {
    _id: 'board123',
    name: 'Test Board',
    slug: 'test-board',
    createdBy: 'admin',
    admins: ['admin'],
    members: ['admin', 'member1'],
    pendingRequests: [
      {
        username: 'pendinguser1',
        requestedAt: new Date('2024-01-01'),
        message: 'Please let me join',
      },
      {
        username: 'pendinguser2',
        requestedAt: new Date('2024-01-02'),
        message: 'I want to collaborate',
      },
    ],
    inviteCode: 'ABC123',
    settings: {},
    isPublic: false,
  };

  const mockCurrentUser = { username: 'admin' };
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:5173',
      },
      writable: true,
    });
  });

  it('should display pending requests for admin', () => {
    render(
      <AdminPanel
        board={mockBoard}
        currentUser={mockCurrentUser}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Manage Board')).toBeInTheDocument();
    expect(screen.getByText('pendinguser1')).toBeInTheDocument();
    expect(screen.getByText('Please let me join')).toBeInTheDocument();
    expect(screen.getByText('pendinguser2')).toBeInTheDocument();
    expect(screen.getByText('I want to collaborate')).toBeInTheDocument();
  });

  it('should approve member on approve button click', async () => {
    const user = userEvent.setup();

    vi.mocked(api.api.approveMember).mockResolvedValue({
      message: 'Member approved successfully',
    });

    render(
      <AdminPanel
        board={mockBoard}
        currentUser={mockCurrentUser}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    // Find all Approve buttons and click the first one
    const approveButtons = screen.getAllByRole('button', { name: 'Approve' });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(api.api.approveMember).toHaveBeenCalledWith(
        'test-board',
        'admin',
        'pendinguser1'
      );
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should deny request on deny button click', async () => {
    const user = userEvent.setup();

    vi.mocked(api.api.denyRequest).mockResolvedValue({
      message: 'Access request denied',
    });

    render(
      <AdminPanel
        board={mockBoard}
        currentUser={mockCurrentUser}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    // Find all Deny buttons and click the first one
    const denyButtons = screen.getAllByRole('button', { name: 'Deny' });
    await user.click(denyButtons[0]);

    await waitFor(() => {
      expect(api.api.denyRequest).toHaveBeenCalledWith(
        'test-board',
        'admin',
        'pendinguser1'
      );
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('should display invite link', () => {
    render(
      <AdminPanel
        board={mockBoard}
        currentUser={mockCurrentUser}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const inviteLink = 'http://localhost:5173/invite/ABC123';
    expect(screen.getByText(inviteLink)).toBeInTheDocument();
  });

  it('should display members list', async () => {
    const user = userEvent.setup();

    render(
      <AdminPanel
        board={mockBoard}
        currentUser={mockCurrentUser}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    // Members section is collapsed by default, so we need to click to expand
    const membersHeading = screen.getByText('Members');
    await user.click(membersHeading);

    await waitFor(() => {
      expect(screen.getByText('Admins')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('member1')).toBeInTheDocument();
    });
  });

  it('should close panel when close button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <AdminPanel
        board={mockBoard}
        currentUser={mockCurrentUser}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const closeButton = screen.getByLabelText('Close panel');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not render when isOpen is false', () => {
    const { container } = render(
      <AdminPanel
        board={mockBoard}
        currentUser={mockCurrentUser}
        isOpen={false}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should handle approve error', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    vi.mocked(api.api.approveMember).mockRejectedValue({
      message: 'Failed to approve member',
      statusCode: 403,
    });

    render(
      <AdminPanel
        board={mockBoard}
        currentUser={mockCurrentUser}
        isOpen={true}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );

    const approveButtons = screen.getAllByRole('button', { name: 'Approve' });
    await user.click(approveButtons[0]);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to approve member');
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });
});
