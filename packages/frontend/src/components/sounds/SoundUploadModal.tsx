import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { AudioEditor } from './AudioEditor';
import { EmojiPicker } from '../shared/EmojiPicker';
import { api } from '../../services/api';
import { Sound } from '../../types/board';

interface SoundUploadModalProps {
  boardId: string;
  maxFileSize: number;
  onClose: () => void;
  onSuccess: () => void;
  existingSound?: Sound; // Optional: if provided, modal is in edit mode
  onDelete?: (soundId: string) => void; // Optional: for deleting in edit mode
  username?: string; // Optional: for loading existing sound audio
}

type IconMode = 'emoji' | 'uploadImage';

export const SoundUploadModal: React.FC<SoundUploadModalProps> = ({
  boardId,
  maxFileSize,
  onClose,
  onSuccess,
  existingSound,
  onDelete,
  username,
}) => {
  const isEditMode = !!existingSound;
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [iconMode, setIconMode] = useState<IconMode>('emoji');
  const [emoji, setEmoji] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(100);
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);
  const [originalDuration, setOriginalDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-populate fields when editing
  useEffect(() => {
    if (existingSound) {
      setName(existingSound.name);
      if (existingSound.emoji) {
        setIconMode('emoji');
        setEmoji(existingSound.emoji);
      } else if (existingSound.imageUrl) {
        setIconMode('uploadImage');
      }
      setGlobalVolume(Math.round((existingSound.globalVolume || 1) * 100));
      setOriginalDuration(existingSound.duration || 0);
    }
  }, [existingSound]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/ogg': ['.ogg', '.oga'],
      'audio/wav': ['.wav'],
      'audio/webm': ['.webm'],
      'audio/mp4': ['.m4a', '.mp4'],
      'audio/aac': ['.aac'],
      'audio/flac': ['.flac'],
    },
    maxSize: maxFileSize,
    multiple: false,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError(
            `File is too large. Maximum size is ${
              maxFileSize / (1024 * 1024)
            }MB`
          );
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('Invalid file type. Allowed formats: MP3, OGG, WAV, WEBM, M4A, AAC, FLAC.');
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        const uploadedFile = acceptedFiles[0];
        setFile(uploadedFile);
        setName(uploadedFile.name.replace(/\.(mp3|ogg|oga|wav|webm|m4a|mp4|aac|flac)$/i, ''));
        setError(null);
      }
    },
  });

  const imageDropzone = useDropzone({
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
    },
    maxSize: 5 * 1024 * 1024, // 5MB recommended
    multiple: false,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        setError('Invalid image file. Max size 5MB. Formats: PNG, JPEG, GIF, WebP');
        return;
      }
      if (acceptedFiles.length > 0) {
        setImageFile(acceptedFiles[0]);
        setIconMode('uploadImage');
        setError(null);
      }
    },
  });

  const handleUpload = async () => {
    // Validation
    if (isEditMode) {
      if (!name.trim()) {
        setError('Please enter a name');
        return;
      }
    } else {
      if (!file || !name.trim()) {
        setError('Please select a file and enter a name');
        return;
      }
    }

    try {
      setUploading(true);
      setError(null);

      if (isEditMode && existingSound) {
        // Edit mode: update existing sound
        const updateData: any = {
          name: name.trim(),
        };

        // Update icon if changed
        if (iconMode === 'emoji' && emoji) {
          updateData.emoji = emoji;
        } else if (iconMode === 'uploadImage' && imageFile) {
          updateData.imageFile = imageFile;
        }

        // Update metadata
        await api.updateSound(existingSound._id, updateData);

        // If trimming is requested, call trim endpoint separately
        if (startTime !== undefined && endTime !== undefined && originalDuration > 0 && username) {
          const isTrimmed = startTime > 0.01 || endTime < (originalDuration - 0.01);
          if (isTrimmed) {
            await api.trimSound(existingSound._id, startTime, endTime, username);
          }
        }
      } else {
        // Create mode: upload new sound
        const metadata: any = {
          name: name.trim(),
          globalVolume: globalVolume / 100,
        };

        // Add icon based on mode (both are optional)
        if (iconMode === 'emoji' && emoji) {
          metadata.emoji = emoji;
        } else if (iconMode === 'uploadImage' && imageFile) {
          metadata.imageFile = imageFile;
        }

        // Add trim parameters only if actual trimming is needed (not full duration)
        if (startTime !== undefined && endTime !== undefined && originalDuration > 0) {
          const isTrimmed = startTime > 0.01 || endTime < (originalDuration - 0.01);
          if (isTrimmed) {
            metadata.startTime = startTime;
            metadata.endTime = endTime;
          }
        }

        await api.uploadSound(boardId, file!, metadata);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'upload'} sound`);
    } finally {
      setUploading(false);
    }
  };

  const handleTrimChange = (start: number, end: number, duration: number) => {
    setStartTime(start);
    setEndTime(end);
    setOriginalDuration(duration);
  };

  const handleDelete = async () => {
    if (!existingSound || !onDelete) return;

    if (!confirm(`Are you sure you want to delete "${existingSound.name}"?`)) {
      return;
    }

    try {
      setUploading(true);
      onDelete(existingSound._id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete sound');
      setUploading(false);
    }
  };

  // Get audio URL for existing sound
  const audioUrl = existingSound && username
    ? api.getSoundStreamUrl(existingSound._id, username)
    : undefined;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? 'Edit Sound' : 'Upload Sound'}</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {!file && !isEditMode ? (
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''}`}
            >
              <input {...getInputProps()} />
              <p className="dropzone-icon">📁</p>
              {isDragActive ? (
                <p>Drop the audio file here...</p>
              ) : (
                <>
                  <p>Drag and drop an audio file here</p>
                  <p className="dropzone-hint">or click to select</p>
                  <p className="dropzone-hint">Supported: MP3, OGG, WAV, WEBM, M4A, AAC, FLAC</p>
                  <p className="dropzone-limit">
                    Max size: {maxFileSize / (1024 * 1024)}MB
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="file-selected">
              {file && (
                <div className="file-info">
                  <p className="file-name">📎 {file.name}</p>
                  <button
                    className="change-file-button"
                    onClick={() => {
                      setFile(null);
                      setName('');
                      setStartTime(undefined);
                      setEndTime(undefined);
                    }}
                    type="button"
                  >
                    Change File
                  </button>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="sound-name">
                  Name <span className="required">*</span>
                </label>
                <input
                  id="sound-name"
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
                <label>Icon / Image (optional)</label>
                <div className="icon-mode-selector">
                  <button
                    type="button"
                    className={`mode-option ${iconMode === 'emoji' ? 'active' : ''}`}
                    onClick={() => {
                      setIconMode('emoji');
                      setShowEmojiPicker(true);
                    }}
                  >
                    {emoji || '😀 Pick Emoji'}
                  </button>
                  <div
                    {...imageDropzone.getRootProps()}
                    className={`mode-option mode-option-dropzone ${iconMode === 'uploadImage' ? 'active' : ''}`}
                  >
                    <input {...imageDropzone.getInputProps()} />
                    {imageFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img
                          src={URL.createObjectURL(imageFile)}
                          alt="Preview"
                          style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <span>{imageFile.name.substring(0, 15)}{imageFile.name.length > 15 ? '...' : ''}</span>
                      </div>
                    ) : (
                      '📁 Upload/Drop Image'
                    )}
                  </div>
                </div>

                {iconMode === 'emoji' && showEmojiPicker && (
                  <div className="emoji-input-section">
                    <EmojiPicker
                      value={emoji}
                      onChange={(e) => {
                        setEmoji(e);
                        setShowEmojiPicker(false);
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="global-volume">Default Volume (for everyone)</label>
                <div className="volume-control">
                  <input
                    id="global-volume"
                    type="range"
                    min="0"
                    max="100"
                    value={globalVolume}
                    onChange={(e) => setGlobalVolume(Number(e.target.value))}
                    className="volume-slider"
                  />
                  <span className="volume-label">{globalVolume}%</span>
                </div>
              </div>

              <div className="form-group">
                <label>Audio Preview & Trim</label>
                <AudioEditor
                  audioFile={file || undefined}
                  audioUrl={audioUrl}
                  onTrimChange={handleTrimChange}
                />
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            {isEditMode && onDelete && (
              <button
                className="delete-button"
                onClick={handleDelete}
                disabled={uploading}
                type="button"
              >
                Delete Sound
              </button>
            )}
          </div>
          <div className="button-group">
            <button className="cancel-button" onClick={onClose} type="button">
              Cancel
            </button>
            <button
              className="submit-button"
              onClick={handleUpload}
              disabled={(!file && !isEditMode) || !name.trim() || uploading}
              type="button"
            >
              {uploading
                ? (startTime !== undefined && endTime !== undefined
                    ? `Trimming & ${isEditMode ? 'Updating' : 'Uploading'}...`
                    : `${isEditMode ? 'Updating' : 'Uploading'}...`)
                : `${isEditMode ? 'Save Changes' : 'Upload Sound'}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
