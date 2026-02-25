import { useState, useEffect } from 'react';
import { Sound } from '../types/board';
import { api } from '../services/api';
import socketService from '../services/socket.service';

export const useSounds = (boardId: string, username?: string) => {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSounds = async () => {
    if (!boardId) {
      console.log('[useSounds] skipping fetch, no boardId');
      setLoading(false);
      return;
    }

    try {
      console.log('[useSounds] fetching sounds for boardId:', boardId, 'username:', username);
      setLoading(true);
      setError(null);
      const data = await api.getSounds(boardId, username);
      console.log('[useSounds] received sounds count:', data.length, 'sounds:', data);
      setSounds(data);
    } catch (err: any) {
      console.error('[useSounds] Error fetching sounds:', err);
      setError(err.message || 'Failed to load sounds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[useSounds] useEffect triggered - boardId:', boardId, 'username:', username);
    fetchSounds();
  }, [boardId, username]);

  useEffect(() => {
    // Listen for real-time sound updates
    const handleSoundUploaded = (data: { sound: Sound }) => {
      setSounds((prev) => [data.sound, ...prev]);
    };

    const handleSoundDeleted = (data: { soundId: string }) => {
      setSounds((prev) => prev.filter((s) => s._id !== data.soundId));
    };

    socketService.onSoundUploaded(handleSoundUploaded);
    socketService.onSoundDeleted(handleSoundDeleted);

    return () => {
      socketService.offSoundUploaded();
      socketService.offSoundDeleted();
    };
  }, []);

  return {
    sounds,
    loading,
    error,
    refetch: fetchSounds,
  };
};
