import React, { useState, useCallback } from 'react';
import { Sound } from '../../types/board';
import { api } from '../../services/api';

interface SoundCardProps {
  sound: Sound;
  onPlay: (soundId: string) => void;
  onEdit?: (sound: Sound) => void;
  onDelete?: (soundId: string) => void;
  isPlaying: boolean;
  canModify: boolean;
  isEditMode: boolean;
  userVolume?: number;
  isFavorite?: boolean;
  onVolumeChange?: (soundId: string, volume: number) => void;
  onFavoriteToggle?: (soundId: string, isFavorite: boolean) => void;
}

export const SoundCard: React.FC<SoundCardProps> = ({
  sound,
  onPlay,
  onEdit,
  onDelete,
  isPlaying,
  canModify,
  isEditMode,
  userVolume = 1.0,
  isFavorite = false,
  onVolumeChange,
  onFavoriteToggle,
}) => {
  const [localVolume, setLocalVolume] = useState(Math.round(userVolume * 100));

  const getImageUrl = () => {
    if (sound.imageFileId) {
      return api.getSoundImageUrl(sound._id);
    }
    return sound.imageUrl;
  };

  const getCombinedVolume = () => {
    const globalVol = sound.globalVolume !== undefined ? sound.globalVolume : 1.0;
    const userVol = localVolume / 100;
    return Math.round(globalVol * userVol * 100);
  };

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setLocalVolume(newVolume);
    if (onVolumeChange) {
      onVolumeChange(sound._id, newVolume / 100);
    }
  }, [sound._id, onVolumeChange]);

  const handleFavoriteClick = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle(sound._id, !isFavorite);
    }
  };

  const handleCardClick = () => {
    if (!isEditMode) {
      onPlay(sound._id);
    }
  };

  const imageUrl = getImageUrl();

  return (
    <div
      className={`sound-card ${isPlaying ? 'playing' : ''} ${isEditMode ? 'edit-mode' : ''}`}
      onClick={!isEditMode ? handleCardClick : undefined}
      style={{ cursor: !isEditMode ? 'pointer' : 'default' }}
    >
      <div className="sound-card-icon">
        {imageUrl ? (
          <img src={imageUrl} alt={sound.name} />
        ) : sound.emoji ? (
          <span className="sound-emoji">{sound.emoji}</span>
        ) : (
          <span className="sound-emoji">🔊</span>
        )}
      </div>

      <div className="sound-card-name">{sound.name}</div>

      {isEditMode && (
        <div className="sound-card-edit-controls" onClick={(e) => e.stopPropagation()}>
          <div className="control-row">
            <button
              className={`favorite-button ${isFavorite ? 'active' : ''}`}
              onClick={handleFavoriteClick}
              title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? '⭐' : '☆'}
            </button>

            {canModify && onEdit && (
              <button
                className="edit-button"
                onClick={() => onEdit(sound)}
                title="Edit sound"
              >
                ✏️
              </button>
            )}

            {canModify && onDelete && (
              <button
                className="delete-button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to delete "${sound.name}"?`
                    )
                  ) {
                    onDelete(sound._id);
                  }
                }}
                title="Delete sound"
              >
                🗑️
              </button>
            )}
          </div>

          <div className="volume-control">
            <label className="volume-label">
              Volume: {getCombinedVolume()}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={localVolume}
              onChange={handleVolumeChange}
              className="volume-slider"
              title="Personal volume adjustment"
            />
          </div>
        </div>
      )}
    </div>
  );
};
