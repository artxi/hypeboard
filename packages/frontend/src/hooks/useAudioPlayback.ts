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

        // Create and play audio
        const audio = new Audio(api.getSoundStreamUrl(soundId, username));
        audioRef.current = audio;

        // Set volume if getVolume callback is provided
        if (getVolume) {
          const volume = getVolume(soundId);
          audio.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        }

        // Preload audio for faster playback
        audio.preload = 'auto';

        // Start playback as soon as possible
        const startPlayback = async () => {
          // Calculate time offset RIGHT before playing
          const offset = (Date.now() - timestamp) / 1000;

          // Don't seek for small offsets - some platforms (Windows) need more time to start
          // Only seek if offset is significant (>0.5s) to avoid cutting off the beginning
          if (offset > 0.5 && audio.duration && offset < audio.duration) {
            audio.currentTime = offset;
          }

          // Start playing
          try {
            await audio.play();
          } catch (error) {
            console.error('Error playing audio:', error);
            setPlayingSound(null);
          }
        };

        // Try to play as soon as we have minimal data
        audio.addEventListener('canplay', startPlayback, { once: true });

        // Fallback: if canplay doesn't fire quickly, try after a short delay
        const fallbackTimer = setTimeout(() => {
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
            audio.removeEventListener('canplay', startPlayback);
            startPlayback();
          }
        }, 150); // 150ms fallback timeout

        // Clear playing state when audio ends
        audio.addEventListener('ended', () => {
          clearTimeout(fallbackTimer);
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
