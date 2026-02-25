import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SoundsService } from './sounds.service';
import { Logger } from '@nestjs/common';

interface PlaySoundPayload {
  soundId: string;
  playedBy: string;
}

interface JoinBoardPayload {
  boardId: string;
  username: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/sounds',
})
export class SoundsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SoundsGateway.name);

  constructor(private readonly soundsService: SoundsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-board')
  async handleJoinBoard(
    @MessageBody() data: JoinBoardPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { boardId, username } = data;

    try {
      // Verify user is a member of the board
      const isMember = await this.soundsService.checkBoardMembership(
        boardId,
        username,
      );

      if (!isMember) {
        client.emit('error', { message: 'Not authorized to join this board' });
        return;
      }

      // Join the board room
      const room = `board:${boardId}`;
      await client.join(room);

      this.logger.log(`User ${username} joined board ${boardId}`);

      // Notify others in the room
      client.to(room).emit('user-joined', {
        username,
        timestamp: Date.now(),
      });

      // Confirm to the client
      client.emit('joined-board', { boardId });
    } catch (error) {
      this.logger.error(
        `Error joining board: ${error.message}`,
        error.stack,
      );
      client.emit('error', { message: 'Failed to join board' });
    }
  }

  @SubscribeMessage('leave-board')
  async handleLeaveBoard(
    @MessageBody() data: JoinBoardPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { boardId, username } = data;
    const room = `board:${boardId}`;

    await client.leave(room);

    this.logger.log(`User ${username} left board ${boardId}`);

    // Notify others in the room
    client.to(room).emit('user-left', {
      username,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('play-sound')
  async handlePlaySound(
    @MessageBody() data: PlaySoundPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { soundId, playedBy } = data;

    try {
      // Get sound to verify it exists and get board ID
      const sound = await this.soundsService.findById(soundId);

      // Increment play count
      await this.soundsService.incrementPlayCount(soundId);

      const room = `board:${sound.boardId}`;

      // Broadcast to all clients in the room (including sender for sync)
      this.server.to(room).emit('sound-playing', {
        soundId,
        playedBy,
        timestamp: Date.now(),
      });

      this.logger.log(`Sound ${soundId} played by ${playedBy}`);
    } catch (error) {
      this.logger.error(
        `Error playing sound: ${error.message}`,
        error.stack,
      );
      client.emit('error', { message: 'Failed to play sound' });
    }
  }

  /**
   * Broadcast sound upload to all users in a board
   */
  broadcastSoundUploaded(boardId: string, sound: any) {
    const room = `board:${boardId}`;
    this.server.to(room).emit('sound-uploaded', {
      sound,
      timestamp: Date.now(),
    });
    this.logger.log(`Broadcast sound uploaded to board ${boardId}`);
  }

  /**
   * Broadcast sound deletion to all users in a board
   */
  broadcastSoundDeleted(boardId: string, soundId: string) {
    const room = `board:${boardId}`;
    this.server.to(room).emit('sound-deleted', {
      soundId,
      timestamp: Date.now(),
    });
    this.logger.log(`Broadcast sound deleted from board ${boardId}`);
  }
}
