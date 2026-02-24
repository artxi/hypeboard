import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { AdminPanel } from './AdminPanel';
import type { Board, ApiError, Sound } from '../types/board';

interface BoardDetailViewProps {
  slug: string;
  currentUser: { username: string };
  onBack: () => void;
}

export interface BoardDetailViewHandle {
  openAdminPanel: () => void;
}

export const BoardDetailView = forwardRef<BoardDetailViewHandle, BoardDetailViewProps>(
  function BoardDetailView({ slug, currentUser, onBack }, ref) {
  const [board, setBoard] = useState<Board | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member' | 'none'>('none');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sounds] = useState<Sound[]>([]);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

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

  // Close admin panel when changing boards
  useEffect(() => {
    setAdminPanelOpen(false);
  }, [slug]);

  // Expose imperative handle for opening admin panel
  useImperativeHandle(ref, () => ({
    openAdminPanel: () => setAdminPanelOpen(true),
  }));


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

  return (
    <div className="board-detail">
      <div className="sounds-section">
        <div className="section-header">
          <h3 className="section-title">Sounds</h3>
          <span className="text-muted">({sounds.length})</span>
        </div>

        {sounds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔊</div>
            <h2>No sounds yet</h2>
            <p>
              {userRole === 'admin'
                ? "Start building your soundboard by adding your first sound"
                : "No sounds have been added to this board yet"}
            </p>
            <Button
              onClick={() => {
                // TODO: Open upload modal in future implementation
                console.log('Add sound clicked');
              }}
              variant="primary"
              disabled={true}
            >
              {userRole === 'admin' ? 'Add your first sound' : 'No sounds available'}
            </Button>
          </div>
        ) : (
          <div className="sounds-grid">
            {/* TODO: Sound cards will go here in future implementation */}
          </div>
        )}
      </div>

      {userRole === 'admin' && (
        <AdminPanel
          board={board}
          currentUser={currentUser}
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          onUpdate={fetchBoard}
        />
      )}
    </div>
  );
});
