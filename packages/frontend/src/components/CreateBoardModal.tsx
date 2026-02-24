import { useState } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';
import { api } from '../services/api';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { username: string };
  onBoardCreated: (slug: string) => void;
}

export function CreateBoardModal({
  isOpen,
  onClose,
  currentUser,
  onBoardCreated,
}: CreateBoardModalProps) {
  const [boardName, setBoardName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName.trim()) return;

    try {
      setCreating(true);
      const response = await api.createBoard(boardName.trim(), currentUser.username);
      setBoardName('');
      onClose();
      onBoardCreated(response.board.slug);
    } catch (err: any) {
      console.error('Failed to create board:', err);
      alert(err.message || 'Failed to create board');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setBoardName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Board">
      <form onSubmit={handleSubmit} className="create-board-form">
        <Input
          label="Board Name"
          value={boardName}
          onChange={(e) => setBoardName(e.target.value)}
          placeholder="Enter board name"
          required
          autoFocus
        />
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={creating || !boardName.trim()}>
            {creating ? 'Creating...' : 'Create Board'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
