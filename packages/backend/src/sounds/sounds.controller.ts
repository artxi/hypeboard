import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Res,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { SoundsService } from './sounds.service';
import { SoundsGateway } from './sounds.gateway';
import { GridFSService } from './services/gridfs.service';
import { ImageGridFSService } from './services/image-gridfs.service';
import { UploadSoundDto } from './dto/upload-sound.dto';
import { UpdateSoundDto } from './dto/update-sound.dto';
import { TrimSoundDto } from './dto/trim-sound.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class SoundsController {
  constructor(
    private readonly soundsService: SoundsService,
    private readonly soundsGateway: SoundsGateway,
    private readonly gridFSService: GridFSService,
    private readonly imageGridFSService: ImageGridFSService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * POST /boards/:boardId/sounds - Upload a sound
   */
  @Post('boards/:boardId/sounds')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'imageFile', maxCount: 1 },
    ], {
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB absolute hard limit
      },
      fileFilter: (req, file, cb) => {
        if (file.fieldname === 'file') {
          // Audio file validation
          const allowedMimeTypes = [
            'audio/mpeg',        // .mp3
            'audio/ogg',         // .ogg, .oga
            'audio/wav',         // .wav
            'audio/x-wav',       // .wav (alternative)
            'audio/wave',        // .wav (alternative)
            'audio/webm',        // .webm
            'audio/mp4',         // .m4a, .mp4
            'audio/x-m4a',       // .m4a (alternative)
            'audio/aac',         // .aac
            'audio/flac',        // .flac
            'audio/x-flac',      // .flac (alternative)
          ];

          if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new BadRequestException(
                'Invalid file type. Allowed formats: MP3, OGG, WAV, WEBM, M4A, AAC, FLAC.',
              ),
              false,
            );
          }
        } else if (file.fieldname === 'imageFile') {
          // Image file validation
          const allowedImageTypes = [
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/gif',
            'image/webp',
          ];

          if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new BadRequestException(
                'Invalid image type. Allowed formats: PNG, JPEG, GIF, WEBP.',
              ),
              false,
            );
          }
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async uploadSound(
    @Param('boardId') boardId: string,
    @UploadedFiles() files: { file?: Express.Multer.File[], imageFile?: Express.Multer.File[] },
    @Body() dto: UploadSoundDto,
    @Request() req,
  ) {
    if (!files?.file || files.file.length === 0) {
      throw new BadRequestException('No audio file uploaded');
    }

    const audioFile = files.file[0];
    const imageFile = files.imageFile?.[0];

    // Use username from JWT token
    dto.uploadedBy = req.user.username;

    const sound = await this.soundsService.create(boardId, audioFile, imageFile, dto);

    // Broadcast the sound upload to all users in the board
    this.soundsGateway.broadcastSoundUploaded(boardId, sound);

    return sound;
  }

  /**
   * GET /boards/:boardId/sounds - List sounds for a board
   */
  @Get('boards/:boardId/sounds')
  async getSounds(
    @Param('boardId') boardId: string,
    @Query('username') username?: string,
  ) {
    return await this.soundsService.findByBoardId(boardId, username);
  }

  /**
   * GET /sounds/:soundId/image - Stream image file
   */
  @Get('sounds/:soundId/image')
  async streamImage(
    @Param('soundId') soundId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sound = await this.soundsService.findById(soundId);

    if (!sound.imageFileId) {
      throw new NotFoundException('No image found for this sound');
    }

    res.set({
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
    });

    const stream = this.imageGridFSService.streamImage(sound.imageFileId);
    return new StreamableFile(stream);
  }

  /**
   * GET /sounds/:soundId/stream - Stream audio file
   */
  @Get('sounds/:soundId/stream')
  async streamSound(
    @Param('soundId') soundId: string,
    @Query('username') username: string,
    @Res({ passthrough: true }) res: Response,
    @Request() req,
  ) {
    if (!username) {
      throw new BadRequestException('Username required');
    }

    const sound = await this.soundsService.findById(soundId);

    // Check board membership
    const isMember = await this.soundsService.checkBoardMembership(
      sound.boardId.toString(),
      username,
    );
    if (!isMember) {
      throw new BadRequestException('You are not a member of this board');
    }

    // Get file info for size
    const fileInfo = await this.gridFSService.getFileInfo(sound.fileId);

    // Handle range requests for seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileInfo.length - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileInfo.length}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': sound.mimeType,
      });

      const stream = this.gridFSService.streamFile(sound.fileId, {
        start,
        end: end + 1,
      });
      return new StreamableFile(stream);
    } else {
      res.set({
        'Content-Length': fileInfo.length,
        'Content-Type': sound.mimeType,
        'Accept-Ranges': 'bytes',
      });

      const stream = this.gridFSService.streamFile(sound.fileId);
      return new StreamableFile(stream);
    }
  }

  /**
   * PUT /sounds/:soundId - Update sound metadata
   */
  @Put('sounds/:soundId')
  @UseGuards(JwtAuthGuard)
  async updateSound(
    @Param('soundId') soundId: string,
    @Body() dto: UpdateSoundDto,
    @Request() req,
  ) {
    return await this.soundsService.update(soundId, req.user.username, dto);
  }

  /**
   * PUT /sounds/:soundId/trim - Trim audio
   */
  @Put('sounds/:soundId/trim')
  @UseGuards(JwtAuthGuard)
  async trimSound(
    @Param('soundId') soundId: string,
    @Body() dto: TrimSoundDto,
    @Request() req,
  ) {
    return await this.soundsService.trim(
      soundId,
      req.user.username,
      dto.startTime,
      dto.endTime,
    );
  }

  /**
   * DELETE /sounds/:soundId - Delete sound
   */
  @Delete('sounds/:soundId')
  @UseGuards(JwtAuthGuard)
  async deleteSound(@Param('soundId') soundId: string, @Request() req) {
    // Get sound details before deleting for broadcasting
    const sound = await this.soundsService.findById(soundId);
    const boardId = sound.boardId.toString();

    await this.soundsService.delete(soundId, req.user.username);

    // Broadcast the sound deletion to all users in the board
    this.soundsGateway.broadcastSoundDeleted(boardId, soundId);

    return { message: 'Sound deleted successfully' };
  }
}
