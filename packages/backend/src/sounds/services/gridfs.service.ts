import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, mongo } from 'mongoose';
import { Readable } from 'stream';

@Injectable()
export class GridFSService {
  private bucket: mongo.GridFSBucket;

  constructor(@InjectConnection() private connection: Connection) {
    // Access the native MongoDB database from Mongoose connection
    // Use mongo.GridFSBucket from mongoose's bundled mongodb driver
    this.bucket = new mongo.GridFSBucket(this.connection.db, {
      bucketName: 'sounds',
    });
  }

  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<mongo.ObjectId> {
    return new Promise((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(filename, {
        metadata: { contentType: mimeType },
      });

      const readableStream = Readable.from(buffer);

      readableStream
        .pipe(uploadStream)
        .on('error', (error) => {
          reject(
            new InternalServerErrorException(
              `Failed to upload file: ${error.message}`,
            ),
          );
        })
        .on('finish', () => {
          resolve(uploadStream.id as mongo.ObjectId);
        });
    });
  }

  async downloadFile(fileId: mongo.ObjectId): Promise<Buffer> {
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
              `Failed to download file: ${error.message}`,
            ),
          );
        })
        .on('end', () => {
          resolve(Buffer.concat(chunks));
        });
    });
  }

  async deleteFile(fileId: mongo.ObjectId): Promise<void> {
    try {
      await this.bucket.delete(fileId);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to delete file: ${error.message}`,
      );
    }
  }

  streamFile(
    fileId: mongo.ObjectId,
    options?: { start?: number; end?: number },
  ): Readable {
    return this.bucket.openDownloadStream(fileId, options);
  }

  async getFileInfo(fileId: mongo.ObjectId): Promise<any> {
    const files = await this.bucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      throw new InternalServerErrorException('File not found');
    }
    return files[0];
  }
}
