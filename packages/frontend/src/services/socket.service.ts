import { io, Socket } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) {
      return;
    }
    this.socket = io(`${API_URL}/sounds`, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinBoard(boardId: string, username: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('join-board', { boardId, username });
  }

  leaveBoard(boardId: string, username: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('leave-board', { boardId, username });
  }

  playSound(soundId: string, playedBy: string): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.emit('play-sound', { soundId, playedBy });
  }

  onSoundPlaying(
    callback: (data: {
      soundId: string;
      playedBy: string;
      timestamp: number;
    }) => void,
  ): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('sound-playing', callback);
  }

  onSoundUploaded(
    callback: (data: { sound: any; timestamp: number }) => void,
  ): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('sound-uploaded', callback);
  }

  onSoundDeleted(
    callback: (data: { soundId: string; timestamp: number }) => void,
  ): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('sound-deleted', callback);
  }

  onUserJoined(
    callback: (data: { username: string; timestamp: number }) => void,
  ): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('user-joined', callback);
  }

  onUserLeft(
    callback: (data: { username: string; timestamp: number }) => void,
  ): void {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }

    this.socket.on('user-left', callback);
  }

  offSoundPlaying(): void {
    this.socket?.off('sound-playing');
  }

  offSoundUploaded(): void {
    this.socket?.off('sound-uploaded');
  }

  offSoundDeleted(): void {
    this.socket?.off('sound-deleted');
  }

  offUserJoined(): void {
    this.socket?.off('user-joined');
  }

  offUserLeft(): void {
    this.socket?.off('user-left');
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
