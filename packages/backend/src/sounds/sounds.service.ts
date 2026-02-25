import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Sound, SoundDocument } from '../schemas/sound.schema';
import { Board, BoardDocument } from '../schemas/board.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { GridFSService } from './services/gridfs.service';
import { ImageGridFSService } from './services/image-gridfs.service';
import { UploadSoundDto } from './dto/upload-sound.dto';
import { UpdateSoundDto } from './dto/update-sound.dto';
import * as musicMetadata from 'music-metadata';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
export class SoundsService {
  constructor(
    @InjectModel(Sound.name) private soundModel: Model<SoundDocument>,
    @InjectModel(Board.name) private boardModel: Model<BoardDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private gridFSService: GridFSService,
    private imageGridFSService: ImageGridFSService,
    private configService: ConfigService,
  ) {}

  /**
   * Helper method to convert username to ObjectId
   */
  private async getUserIdByUsername(username: string): Promise<any> {
    const user = await this.userModel.findOne({ username });
    if (!user) {
      throw new NotFoundException(`User '${username}' not found`);
    }
    return user._id;
  }

  /**
   * Check if a user can modify a sound (owner or admin)
   */
  async canModifySound(
    soundId: string,
    username: string,
  ): Promise<{ sound: SoundDocument; board: BoardDocument }> {
    const sound = await this.soundModel.findById(soundId);
    if (!sound) {
      throw new NotFoundException('Sound not found');
    }

    const board = await this.boardModel.findById(sound.boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const userId = await this.getUserIdByUsername(username);

    // Check if user is the uploader or an admin
    const userIdStr = userId.toString();
    if (
      sound.uploadedBy !== username &&
      !board.admins.some((adminId) => adminId.toString() === userIdStr)
    ) {
      throw new ForbiddenException(
        'You do not have permission to modify this sound',
      );
    }

    return { sound, board };
  }

  /**
   * Create a new sound with metadata extraction
   */
  async create(
    boardId: string,
    file: Express.Multer.File,
    imageFile: Express.Multer.File | undefined,
    dto: UploadSoundDto,
  ): Promise<SoundDocument> {
    // Validate board exists and user is a member
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const userId = await this.getUserIdByUsername(dto.uploadedBy);
    const userIdStr = userId.toString();

    // Check if user is a member
    if (!board.members.some((memberId) => memberId.toString() === userIdStr)) {
      throw new ForbiddenException('You are not a member of this board');
    }

    // Check if uploads are allowed
    if (!board.settings.allowUploads) {
      throw new ForbiddenException('Uploads are not allowed on this board');
    }

    // Check file size limit
    const envMaxFileSize = this.configService.get<string>('MAX_FILE_SIZE');
    const defaultMaxFileSize = envMaxFileSize ? parseInt(envMaxFileSize, 10) : 5 * 1024 * 1024;
    const maxFileSize = board.settings.maxFileSize || defaultMaxFileSize;

    console.log('ENV MAX_FILE_SIZE:', envMaxFileSize);
    console.log('Parsed defaultMaxFileSize:', defaultMaxFileSize, `(${defaultMaxFileSize / (1024 * 1024)}MB)`);
    console.log('Board maxFileSize:', board.settings.maxFileSize);
    console.log('Final maxFileSize:', maxFileSize, `(${maxFileSize / (1024 * 1024)}MB)`);
    console.log('File size:', file.size, `(${file.size / (1024 * 1024)}MB)`);

    if (file.size > maxFileSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Check sound count limit
    const currentSoundCount = await this.soundModel.countDocuments({
      boardId: new Types.ObjectId(boardId)
    });
    const maxSounds = board.settings.maxSounds || 50;
    if (currentSoundCount >= maxSounds) {
      throw new BadRequestException(
        `Board has reached the maximum of ${maxSounds} sounds`,
      );
    }

    // Extract audio metadata
    let duration = 0;
    try {
      const metadata = await musicMetadata.parseBuffer(
        file.buffer,
        file.mimetype,
      );
      duration = metadata.format.duration || 0;
    } catch (error) {
      throw new BadRequestException('Failed to extract audio metadata');
    }

    // Process the audio buffer - apply trimming if requested
    let processedBuffer = file.buffer;
    let processedDuration = duration;
    let processedFileSize = file.size;

    // If trim parameters are provided, trim the audio BEFORE uploading
    if (dto.startTime !== undefined && dto.endTime !== undefined) {
      console.log('Trimming audio - startTime:', dto.startTime, 'endTime:', dto.endTime, 'duration:', duration);

      // Validate trim parameters
      if (dto.startTime >= dto.endTime) {
        throw new BadRequestException('Start time must be less than end time');
      }
      if (dto.startTime < 0 || dto.endTime > duration) {
        throw new BadRequestException('Invalid trim range');
      }

      // Only trim if it's not the full duration (with small tolerance for rounding)
      const isTrimmed = dto.startTime > 0.01 || dto.endTime < (duration - 0.01);
      if (isTrimmed) {
        const trimResult = await this.trimAudioBuffer(
          file.buffer,
          file.mimetype,
          dto.startTime,
          dto.endTime,
        );
        processedBuffer = trimResult.buffer;
        processedDuration = trimResult.duration;
        processedFileSize = trimResult.buffer.length;

        console.log('Trimming complete - new duration:', processedDuration, 'new size:', processedFileSize);
      } else {
        console.log('Skipping trim - full duration selected');
      }
    }

    // Upload processed file to GridFS
    const fileId = await this.gridFSService.uploadFile(
      processedBuffer,
      file.originalname,
      file.mimetype,
    );

    // Upload image file if provided
    let imageFileId: Types.ObjectId | undefined;
    if (imageFile) {
      imageFileId = await this.imageGridFSService.uploadImage(
        imageFile.buffer,
        imageFile.originalname,
      );
    }

    // Create sound document
    const sound = new this.soundModel({
      boardId: new Types.ObjectId(boardId),
      name: dto.name,
      fileId,
      filename: file.originalname,
      mimeType: file.mimetype,
      fileSize: processedFileSize,
      duration: processedDuration,
      uploadedBy: dto.uploadedBy,
      emoji: dto.emoji,
      imageUrl: dto.imageUrl,
      imageFileId,
      globalVolume: dto.globalVolume !== undefined ? dto.globalVolume : 1.0,
      // Don't store startTime/endTime since we've already applied the trim
      playCount: 0,
    });

    return await sound.save();
  }

  /**
   * Get all sounds for a board
   */
  async findByBoardId(
    boardId: string,
    username?: string,
  ): Promise<SoundDocument[]> {
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // If username is provided, check membership
    if (username) {
      const userId = await this.getUserIdByUsername(username);
      const userIdStr = userId.toString();
      if (!board.members.some((memberId) => memberId.toString() === userIdStr)) {
        throw new ForbiddenException('You are not a member of this board');
      }
    }

    return await this.soundModel.find({ boardId: new Types.ObjectId(boardId) }).sort({ createdAt: -1 });
  }

  /**
   * Get a single sound by ID
   */
  async findById(soundId: string): Promise<SoundDocument> {
    const sound = await this.soundModel.findById(soundId);
    if (!sound) {
      throw new NotFoundException('Sound not found');
    }
    return sound;
  }

  /**
   * Update sound metadata
   */
  async update(
    soundId: string,
    username: string,
    dto: UpdateSoundDto,
  ): Promise<SoundDocument> {
    const { sound } = await this.canModifySound(soundId, username);

    if (dto.name !== undefined) {
      sound.name = dto.name;
    }
    if (dto.emoji !== undefined) {
      sound.emoji = dto.emoji;
    }
    if (dto.imageUrl !== undefined) {
      sound.imageUrl = dto.imageUrl;
    }

    return await sound.save();
  }

  /**
   * Trim audio file
   */
  async trim(
    soundId: string,
    username: string,
    startTime: number,
    endTime: number,
  ): Promise<SoundDocument> {
    const { sound } = await this.canModifySound(soundId, username);

    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be less than end time');
    }

    if (startTime < 0 || endTime > sound.duration) {
      throw new BadRequestException('Invalid trim range');
    }

    // Create temporary directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-trim-'));
    const inputPath = path.join(tempDir, `input-${soundId}`);
    const outputPath = path.join(tempDir, `output-${soundId}.mp3`);

    try {
      // Download file from GridFS
      const fileBuffer = await this.gridFSService.downloadFile(sound.fileId);
      fs.writeFileSync(inputPath, fileBuffer);

      // Trim audio using ffmpeg
      console.log('Trimming existing sound - input:', inputPath, 'output:', outputPath);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .output(outputPath)
          .on('end', () => {
            console.log('FFmpeg trim completed successfully');
            resolve();
          })
          .on('error', (err) => {
            console.error('FFmpeg trim error:', err);
            reject(err);
          })
          .run();
      });

      // Read trimmed file
      const trimmedBuffer = fs.readFileSync(outputPath);

      // Extract new duration
      const metadata = await musicMetadata.parseBuffer(
        trimmedBuffer,
        sound.mimeType,
      );
      const newDuration = metadata.format.duration || 0;

      // Upload trimmed file to GridFS
      const newFileId = await this.gridFSService.uploadFile(
        trimmedBuffer,
        sound.filename,
        sound.mimeType,
      );

      // Delete old file from GridFS
      await this.gridFSService.deleteFile(sound.fileId);

      // Update sound document
      sound.fileId = newFileId;
      sound.duration = newDuration;
      sound.fileSize = trimmedBuffer.length;

      return await sound.save();
    } catch (error) {
      throw new BadRequestException(`Failed to trim audio: ${error.message}`);
    } finally {
      // Clean up temporary files
      try {
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);
        fs.rmdirSync(tempDir);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Delete a sound
   */
  async delete(soundId: string, username: string): Promise<void> {
    const { sound } = await this.canModifySound(soundId, username);

    // Delete file from GridFS
    await this.gridFSService.deleteFile(sound.fileId);

    // Delete sound document
    await this.soundModel.findByIdAndDelete(soundId);
  }

  /**
   * Increment play count
   */
  async incrementPlayCount(soundId: string): Promise<SoundDocument> {
    const sound = await this.soundModel.findById(soundId);
    if (!sound) {
      throw new NotFoundException('Sound not found');
    }

    sound.playCount += 1;
    return await sound.save();
  }

  /**
   * Check if user is a member of the board
   */
  async checkBoardMembership(
    boardId: string,
    username: string,
  ): Promise<boolean> {
    const board = await this.boardModel.findById(boardId);
    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const userId = await this.getUserIdByUsername(username);
    const userIdStr = userId.toString();
    return board.members.some((memberId) => memberId.toString() === userIdStr);
  }

  /**
   * Trim an audio buffer using FFmpeg
   * Returns trimmed buffer and new duration
   */
  private async trimAudioBuffer(
    buffer: Buffer,
    mimeType: string,
    startTime: number,
    endTime: number,
  ): Promise<{ buffer: Buffer; duration: number }> {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sound-upload-trim-'));
    const inputPath = path.join(tempDir, `input-${Date.now()}`);
    const outputPath = path.join(tempDir, `output-${Date.now()}.mp3`);

    try {
      // Write buffer to temp file
      fs.writeFileSync(inputPath, buffer);

      // Trim using ffmpeg
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(startTime)
          .setDuration(endTime - startTime)
          .output(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Read trimmed file
      const trimmedBuffer = fs.readFileSync(outputPath);

      // Extract new duration
      const metadata = await musicMetadata.parseBuffer(trimmedBuffer, mimeType);
      const newDuration = metadata.format.duration || 0;

      return { buffer: trimmedBuffer, duration: newDuration };
    } catch (error) {
      throw new BadRequestException(`Failed to trim audio: ${error.message}`);
    } finally {
      // Clean up temp files
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        fs.rmdirSync(tempDir);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
  }
}
