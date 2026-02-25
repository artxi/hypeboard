import React, { useState } from 'react';
import { Sound } from '../../types/board';
import { AudioEditor } from './AudioEditor';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface SoundEditModalProps {
  sound: Sound;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (soundId: string) => void;
}

export const SoundEditModal: React.FC<SoundEditModalProps> = ({
  sound,
  onClose,
  onSuccess,
  onDelete,
}) => {
  const { user } = useAuth();
  const [name, setName] = useState(sound.name);
  const [emoji, setEmoji] = useState(sound.emoji || '');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState<number | null>(sound.duration || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTrimEditor, setShowTrimEditor] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Update metadata
      await api.updateSound(sound._id, {
        name: name.trim(),
        emoji: emoji || undefined,
      });

      // If trim was modified, apply trim
      if (
        showTrimEditor &&
        trimEnd !== null &&
        user &&
        (trimStart !== 0 || trimEnd !== sound.duration)
      ) {
        await api.trimSound(sound._id, trimStart, trimEnd, user.username);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update sound');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete "${sound.name}"? This action cannot be undone.`
      )
    ) {
      onDelete(sound._id);
      onClose();
    }
  };

  const handleTrimChange = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Sound</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="edit-sound-name">
              Name <span className="required">*</span>
            </label>
            <input
              id="edit-sound-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="Enter sound name"
              required
            />
            <span className="char-count">{name.length}/50</span>
          </div>

          <div className="form-group">
            <label htmlFor="edit-sound-emoji">Emoji (optional)</label>
            <input
              id="edit-sound-emoji"
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              maxLength={2}
              placeholder="🔊"
            />
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={showTrimEditor}
                onChange={(e) => setShowTrimEditor(e.target.checked)}
              />
              Re-trim audio
            </label>
          </div>

          {showTrimEditor && user && (
            <div className="form-group">
              <AudioEditor
                audioUrl={api.getSoundStreamUrl(sound._id, user.username)}
                initialStartTime={0}
                initialEndTime={sound.duration}
                onTrimChange={handleTrimChange}
              />
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button
            className="delete-button danger"
            onClick={handleDelete}
            type="button"
          >
            Delete Sound
          </button>

          <div className="button-group">
            <button className="cancel-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="submit-button"
              onClick={handleSave}
              disabled={!name.trim() || saving}
              type="button"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
