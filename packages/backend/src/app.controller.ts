import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room } from './schemas/room.schema';

@Controller()
export class AppController {
  constructor(
    @InjectModel(Room.name) private roomModel: Model<Room>,
  ) {}
  @Get()
  getHello() {
    return {
      message: 'Hello from HypeBoard Backend!',
      version: '0.1.0',
    };
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: Date.now(),
      uptime: process.uptime(),
    };
  }

  @Get('db-test')
  async testDatabase() {
    try {
      const roomCount = await this.roomModel.countDocuments();
      return {
        message: 'Database connected!',
        roomCount,
      };
    } catch (error) {
      return {
        message: 'Database connection failed',
        error: error.message,
      };
    }
  }
}
