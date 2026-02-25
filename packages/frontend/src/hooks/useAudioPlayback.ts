import { useState, useEffect, useCallback, useRef } from 'react';
import socketService from '../services/socket.service';
import { api } from '../services/api';

export const useAudioPlayback = (
  username: string,
  getVolume?: (soundId: string) => number
) => {
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback(
    async (soundId: string) => {
      try {
        // Stop any currently playing sound
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // Emit socket event to synchronize with other clients
        socketService.playSound(soundId, username);

        // The actual playback will be handled by the socket event listener
      } catch (error) {
        console.error('Error playing sound:', error);
        setPlayingSound(null);
      }
    },
    [username]
  );

  useEffect(() => {
    const handleSoundPlaying = async (data: {
      soundId: string;
      playedBy: string;
      timestamp: number;
    }) => {
      const { soundId, timestamp } = data;

      try {
        // Set playing state
        setPlayingSound(soundId);

        // Calculate time offset for synchronization
        const offset = (Date.now() - timestamp) / 1000;

        // Create and play audio
        const audio = new Audio(api.getSoundStreamUrl(soundId, username));
        audioRef.current = audio;

        // Set volume if getVolume callback is provided
        if (getVolume) {
          const volume = getVolume(soundId);
          audio.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        }

        // Set current time to offset for sync (with safety check)
        audio.addEventListener('loadedmetadata', () => {
          if (offset > 0 && offset < audio.duration) {
            audio.currentTime = offset;
          }
          audio.play().catch((error) => {
            console.error('Error playing audio:', error);
            setPlayingSound(null);
          });
        });

        // Clear playing state when audio ends
        audio.addEventListener('ended', () => {
          setPlayingSound(null);
          audioRef.current = null;
        });

        audio.addEventListener('error', (error) => {
          console.error('Audio playback error:', error);
          setPlayingSound(null);
          audioRef.current = null;
        });
      } catch (error) {
        console.error('Error handling sound-playing event:', error);
        setPlayingSound(null);
      }
    };

    socketService.onSoundPlaying(handleSoundPlaying);

    return () => {
      socketService.offSoundPlaying();
      // Clean up audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [username, getVolume]);

  return {
    playingSound,
    playSound,
  };
};
