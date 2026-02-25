import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { AdminPanel } from './AdminPanel';
import { SoundCard } from './sounds/SoundCard';
import { SoundUploadModal } from './sounds/SoundUploadModal';
import { UploadPlaceholderCard } from './sounds/UploadPlaceholderCard';
import { useSounds } from '../hooks/useSounds';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import socketService from '../services/socket.service';
import type { Board, ApiError, Sound } from '../types/board';
import type { UserPreferences } from '../types/preferences';

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
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [editingSound, setEditingSound] = useState<Sound | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [volumeUpdateTimeouts, setVolumeUpdateTimeouts] = useState<Record<string, number>>({});

  // Use custom hooks for sounds and audio playback
  const {
    sounds,
    error: soundsError,
    refetch: refetchSounds,
  } = useSounds(board?._id || '', currentUser?.username);

  // Get volume callback for audio playback
  const getVolume = useCallback((soundId: string) => {
    const sound = sounds.find(s => s._id === soundId);
    const globalVolume = sound?.globalVolume !== undefined ? sound.globalVolume : 1.0;
    const userVolume = userPreferences?.soundPreferences[soundId]?.volume || 1.0;
    return globalVolume * userVolume;
  }, [sounds, userPreferences]);

  const { playingSound, playSound } = useAudioPlayback(currentUser?.username || '', getVolume);

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

  // Load user preferences
  const loadUserPreferences = async () => {
    if (!board?._id) return;
    try {
      const prefs = await api.getUserPreferences(board._id);
      setUserPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  useEffect(() => {
    if (board?._id && currentUser?.username) {
      loadUserPreferences();
    }
  }, [board?._id, currentUser?.username]);

  // Join board room via socket
  useEffect(() => {
    if (board?._id && currentUser?.username) {
      const boardId = board._id;
      const username = currentUser.username;
      socketService.joinBoard(boardId, username);

      return () => {
        socketService.leaveBoard(boardId, username);
      };
    }
  }, [board?._id, currentUser?.username]);

  // Close admin panel when changing boards
  useEffect(() => {
    setAdminPanelOpen(false);
  }, [slug]);

  // Expose imperative handle for opening admin panel
  useImperativeHandle(ref, () => ({
    openAdminPanel: () => setAdminPanelOpen(true),
  }));

  const handleDeleteSound = async (soundId: string) => {
    try {
      await api.deleteSound(soundId);
      refetchSounds();
    } catch (err: any) {
      alert(err.message || 'Failed to delete sound');
    }
  };

  const canModifySound = (sound: Sound): boolean => {
    return (
      userRole === 'admin' || sound.uploadedBy === currentUser.username
    );
  };

  const canUpload = (): boolean => {
    return board?.settings.allowUploads ?? true;
  };

  const handleVolumeChange = useCallback((soundId: string, volume: number) => {
    if (!board?._id) return;

    // Clear existing timeout for this sound
    if (volumeUpdateTimeouts[soundId]) {
      clearTimeout(volumeUpdateTimeouts[soundId]);
    }

    // Update local state immediately
    setUserPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        soundPreferences: {
          ...prev.soundPreferences,
          [soundId]: {
            ...prev.soundPreferences[soundId],
            volume,
          },
        },
      };
    });

    // Debounce API call
    const timeout = setTimeout(async () => {
      try {
        await api.updateSoundPreference(soundId, board._id!, { volume });
      } catch (error) {
        console.error('Failed to update volume:', error);
      }
    }, 500);

    setVolumeUpdateTimeouts(prev => ({
      ...prev,
      [soundId]: timeout,
    }));
  }, [board?._id, volumeUpdateTimeouts]);

  const handleFavoriteToggle = useCallback(async (soundId: string, isFavorite: boolean) => {
    if (!board?._id) return;

    // Optimistic update
    setUserPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        soundPreferences: {
          ...prev.soundPreferences,
          [soundId]: {
            volume: prev.soundPreferences[soundId]?.volume || 1.0,
            isFavorite,
          },
        },
      };
    });

    // API call
    try {
      await api.updateSoundPreference(soundId, board._id!, { isFavorite });
    } catch (error) {
      console.error('Failed to update favorite:', error);
      // Revert on error
      setUserPreferences(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          soundPreferences: {
            ...prev.soundPreferences,
            [soundId]: {
              ...prev.soundPreferences[soundId],
              isFavorite: !isFavorite,
            },
          },
        };
      });
    }
  }, [board?._id]);


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
        {sounds.length > 0 && (
          <div className="section-header">
            <h3 className="section-title">Sounds</h3>
            <span className="text-muted">
              ({sounds.length}/{board?.settings.maxSounds || 50})
            </span>
            <div className="section-header-actions">
              <Button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                variant="secondary"
                className="favorites-filter-button"
              >
                {showFavoritesOnly ? '⭐ Favorites' : 'All Sounds'}
              </Button>
              <Button
                onClick={() => setEditMode(!editMode)}
                variant="secondary"
                className="toggle-edit-button"
              >
                {editMode ? '✓ Done' : '⚙️ Edit'}
              </Button>
            </div>
          </div>
        )}

        {soundsError ? (
          <div className="error-message">{soundsError}</div>
        ) : sounds.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔊</div>
            <h2>No sounds yet</h2>
            <p>
              {userRole === 'admin'
                ? "Start building your soundboard by adding your first sound"
                : "No sounds have been added to this board yet"}
            </p>
            <Button
              onClick={() => setUploadModalOpen(true)}
              variant="primary"
              disabled={!canUpload()}
            >
              {userRole === 'admin' ? 'Add your first sound' : 'No sounds available'}
            </Button>
          </div>
        ) : (
          <div className="sounds-grid">
            {sounds
              .filter((sound) => {
                if (!showFavoritesOnly) return true;
                return userPreferences?.soundPreferences[sound._id]?.isFavorite || false;
              })
              .map((sound) => (
                <SoundCard
                  key={sound._id}
                  sound={sound}
                  onPlay={playSound}
                  onEdit={
                    canModifySound(sound)
                      ? (s) => setEditingSound(s)
                      : undefined
                  }
                  onDelete={
                    canModifySound(sound) ? handleDeleteSound : undefined
                  }
                  isPlaying={playingSound === sound._id}
                  canModify={canModifySound(sound)}
                  isEditMode={editMode}
                  userVolume={userPreferences?.soundPreferences[sound._id]?.volume}
                  isFavorite={userPreferences?.soundPreferences[sound._id]?.isFavorite}
                  onVolumeChange={handleVolumeChange}
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            {sounds.length > 0 && canUpload() && (
              <UploadPlaceholderCard onClick={() => setUploadModalOpen(true)} />
            )}
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

      {uploadModalOpen && board && (
        <SoundUploadModal
          boardId={board._id!}
          maxFileSize={board.settings.maxFileSize || 5 * 1024 * 1024}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => {
            refetchSounds();
          }}
        />
      )}

      {editingSound && (
        <SoundUploadModal
          boardId={board._id!}
          maxFileSize={board.settings.maxFileSize}
          existingSound={editingSound}
          onClose={() => setEditingSound(null)}
          onSuccess={() => {
            refetchSounds();
          }}
          onDelete={handleDeleteSound}
          username={currentUser.username}
        />
      )}
    </div>
  );
});
