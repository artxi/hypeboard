import React, { useState } from 'react';
import type { Board } from '../types/board';
import { BoardCard } from '../components/BoardCard';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { api } from '../services/api';

interface BoardListViewProps {
  boards: Board[];
  currentUser: { username: string };
  onBoardSelect: (slug: string) => void;
  onBoardsUpdate: () => void;
}

export function BoardListView({
  boards,
  currentUser,
  onBoardSelect,
  onBoardsUpdate,
}: BoardListViewProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !boardName.trim()) return;

    try {
      setCreating(true);
      const response = await api.createBoard(boardName.trim(), currentUser.username);
      setBoardName('');
      setShowCreateModal(false);
      onBoardsUpdate();
      // Navigate to the new board
      onBoardSelect(response.board.slug);
    } catch (err: any) {
      console.error('Failed to create board:', err);
      alert(err.message || 'Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="boards-header">
        <h1>Your Boards</h1>
        <p>Manage and access your collaborative soundboards</p>
      </div>

      {boards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h2>No boards yet</h2>
          <p>Create your first board to get started</p>
          <Button onClick={() => setShowCreateModal(true)} variant="primary">
            Create your first board
          </Button>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map((board) => {
            const isAdmin = board.admins?.includes(currentUser?.username || '');
            return (
              <BoardCard
                key={board.slug}
                board={board}
                userRole={isAdmin ? 'admin' : 'member'}
                onClick={() => onBoardSelect(board.slug)}
              />
            );
          })}
        </div>
      )}

      {/* Create Board Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setBoardName('');
        }}
        title="Create New Board"
      >
        <form onSubmit={handleCreateBoard} className="create-board-form">
          <Input
            label="Board Name"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            placeholder="Enter board name"
            required
            autoFocus
          />
          <div className="modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setBoardName('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={creating || !boardName.trim()}>
              {creating ? 'Creating...' : 'Create Board'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
