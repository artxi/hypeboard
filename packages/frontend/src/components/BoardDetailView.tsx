import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { CopyButton } from '../components/CopyButton';
import type { Board, ApiError } from '../types/board';

interface BoardDetailViewProps {
  slug: string;
  currentUser: { username: string };
  onBack: () => void;
}

export function BoardDetailView({ slug, currentUser, onBack }: BoardDetailViewProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'none'>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBoard = async () => {
    if (!slug || !currentUser?.username) {
      setError('Missing board or username');
      setLoading(false);
      return;
    }

    try {
      const board = await api.getBoardBySlug(slug, currentUser.username);
      setBoard(board);

      // Determine user role
      if (board.admins && board.admins.includes(currentUser.username)) {
        setUserRole('admin');
      } else if (board.members && board.members.includes(currentUser.username)) {
        setUserRole('member');
      } else {
        // If arrays don't exist, user must be a regular member (non-admin)
        setUserRole('member');
      }
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, [slug, currentUser?.username]);

  const handleApprove = async (usernameToApprove: string) => {
    if (!board || !currentUser?.username) return;

    setActionLoading(usernameToApprove);

    try {
      await api.approveMember(board.slug, currentUser.username, usernameToApprove);
      await fetchBoard();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to approve member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (usernameToDeny: string) => {
    if (!board || !currentUser?.username) return;

    setActionLoading(usernameToDeny);

    try {
      await api.denyRequest(board.slug, currentUser.username, usernameToDeny);
      await fetchBoard();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to deny request');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="board-detail">
        <div className="loading">Loading board...</div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="board-detail">
        <div className="error-message">{error || 'Board not found'}</div>
        <Button onClick={onBack}>Back to Boards</Button>
      </div>
    );
  }

  if (userRole === 'none') {
    return (
      <div className="board-detail">
        <h2>Access Denied</h2>
        <p>You don't have permission to view this board.</p>
        <Button onClick={onBack}>Back to Boards</Button>
      </div>
    );
  }

  const inviteLink = board.inviteCode
    ? `${window.location.origin}/invite/${board.inviteCode}`
    : '';
  const totalMembers = (board.admins?.length || 0) + (board.members?.length || 0);

  return (
    <div className="board-detail">
      <div className="board-detail-header">
        <Button onClick={onBack} variant="secondary">← Back to Boards</Button>
        <h1>{board.name}</h1>
        <p className="text-muted">
          {totalMembers > 0 ? `${totalMembers} members · ` : ''}
          Last activity: {new Date(board.lastActivity).toLocaleDateString()}
        </p>
      </div>

      {userRole === 'admin' && inviteLink && (
        <div className="section">
          <h3 className="section-title">Invite Link</h3>
          <div className="invite-link-container">
            <code className="invite-link">{inviteLink}</code>
            <CopyButton text={inviteLink} label="Copy Link" />
          </div>
        </div>
      )}

      {userRole === 'admin' && board.pendingRequests && board.pendingRequests.length > 0 && (
        <div className="section">
          <div className="section-header">
            <h3 className="section-title">Pending Access Requests</h3>
            <span className="text-muted">({board.pendingRequests.length})</span>
          </div>
          <div className="requests-list">
            {board.pendingRequests.map((request) => (
              <div key={request.username} className="request-item">
                <div className="request-info">
                  <strong>{request.username}</strong>
                  {request.message && <p className="request-message">{request.message}</p>}
                  <span className="text-muted">
                    Requested {new Date(request.requestedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="request-actions">
                  <Button
                    onClick={() => handleApprove(request.username)}
                    disabled={actionLoading === request.username}
                    variant="primary"
                    size="sm"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleDeny(request.username)}
                    disabled={actionLoading === request.username}
                    variant="danger"
                    size="sm"
                  >
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {userRole === 'admin' && (board.admins || board.members) && (
        <div className="section">
          <h3 className="section-title">Members</h3>
          <div className="members-list">
            {board.admins && board.admins.length > 0 && (
              <div className="member-section">
                <h4>Admins</h4>
                <ul>
                  {board.admins.map((admin) => (
                    <li key={admin}>{admin}</li>
                  ))}
                </ul>
              </div>
            )}
            {board.members && board.members.length > 0 && (
              <div className="member-section">
                <h4>Members</h4>
                <ul>
                  {board.members.map((member) => (
                    <li key={member}>{member}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="section">
        <h3 className="section-title">Sounds</h3>
        <p className="text-muted">Sound management coming soon...</p>
      </div>
    </div>
  );
}
