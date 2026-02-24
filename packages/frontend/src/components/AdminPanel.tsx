import { useState } from 'react';
import { Button } from './Button';
import { CopyButton } from './CopyButton';
import { CollapsibleSection } from './CollapsibleSection';
import type { Board, ApiError } from '../types/board';
import { api } from '../services/api';

interface AdminPanelProps {
  board: Board;
  currentUser: { username: string };
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function AdminPanel({ board, currentUser, isOpen, onClose, onUpdate }: AdminPanelProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (usernameToApprove: string) => {
    setActionLoading(usernameToApprove);
    try {
      await api.approveMember(board.slug, currentUser.username, usernameToApprove);
      await onUpdate();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to approve member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (usernameToDeny: string) => {
    setActionLoading(usernameToDeny);
    try {
      await api.denyRequest(board.slug, currentUser.username, usernameToDeny);
      await onUpdate();
    } catch (err) {
      const apiError = err as ApiError;
      alert(apiError.message || 'Failed to deny request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const inviteLink = board.inviteCode
    ? `${window.location.origin}/invite/${board.inviteCode}`
    : '';

  if (!isOpen) return null;

  return (
    <>
      <div className="admin-panel-overlay" onClick={onClose} />
      <aside
        className={`admin-panel ${isOpen ? 'open' : ''}`}
        onKeyDown={handleKeyDown}
      >
        <div className="admin-panel-header">
          <h2>Manage Board</h2>
          <button
            className="admin-panel-close"
            onClick={onClose}
            aria-label="Close panel"
          >
            ✕
          </button>
        </div>

        <div className="admin-panel-content">
          <CollapsibleSection title="Invite Link" defaultOpen={true}>
            {inviteLink && (
              <div className="invite-link-container">
                <code className="invite-link">{inviteLink}</code>
                <CopyButton text={inviteLink} label="Copy" />
              </div>
            )}
          </CollapsibleSection>

          {board.pendingRequests && board.pendingRequests.length > 0 && (
            <CollapsibleSection
              title="Pending Requests"
              defaultOpen={true}
              badge={board.pendingRequests.length}
            >
              <div className="requests-list">
                {board.pendingRequests.map((request) => (
                  <div key={request.username} className="request-item">
                    <div className="request-info">
                      <strong>{request.username}</strong>
                      {request.message && (
                        <p className="request-message">{request.message}</p>
                      )}
                      <span className="text-muted">
                        {new Date(request.requestedAt).toLocaleDateString()}
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
            </CollapsibleSection>
          )}

          {(board.admins || board.members) && (
            <CollapsibleSection title="Members" defaultOpen={false}>
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
            </CollapsibleSection>
          )}
        </div>
      </aside>
    </>
  );
}
