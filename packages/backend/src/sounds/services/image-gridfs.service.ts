import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, mongo } from 'mongoose';
import { Readable } from 'stream';
import sharp from 'sharp';

@Injectable()
export class ImageGridFSService {
  private bucket: mongo.GridFSBucket;

  constructor(@InjectConnection() private connection: Connection) {
    // Separate bucket for images
    this.bucket = new mongo.GridFSBucket(this.connection.db, {
      bucketName: 'images',
    });
  }

  async uploadImage(
    buffer: Buffer,
    filename: string,
  ): Promise<mongo.ObjectId> {
    try {
      // Optimize image with sharp: resize to 512x512, convert to WebP
      const optimizedBuffer = await sharp(buffer)
        .resize(512, 512, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toBuffer();

      return new Promise((resolve, reject) => {
        const uploadStream = this.bucket.openUploadStream(filename, {
          metadata: { contentType: 'image/webp' },
        });

        const readableStream = Readable.from(optimizedBuffer);

        readableStream
          .pipe(uploadStream)
          .on('error', (error) => {
            reject(
              new InternalServerErrorException(
                `Failed to upload image: ${error.message}`,
              ),
            );
          })
          .on('finish', () => {
            resolve(uploadStream.id as mongo.ObjectId);
          });
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to process image: ${error.message}`,
      );
    }
  }

  async downloadImage(fileId: mongo.ObjectId): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const downloadStream = this.bucket.openDownloadStream(fileId);

      downloadStream
        .on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        })
        .on('error', (error) => {
          reject(
            new InternalServerErrorException(
              `Failed to download image: ${error.message}`,
            ),
          );
        })
        .on('end', () => {
          resolve(Buffer.concat(chunks));
        });
    });
  }

  async deleteImage(fileId: mongo.ObjectId): Promise<void> {
    try {
      await this.bucket.delete(fileId);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete image: ${error.message}`,
      );
    }
  }

  streamImage(fileId: mongo.ObjectId): Readable {
    return this.bucket.openDownloadStream(fileId);
  }
}
