import { Controller, Get } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Board } from './schemas/board.schema';

@Controller()
export class AppController {
  constructor(
    @InjectModel(Board.name) private boardModel: Model<Board>,
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
      const boardCount = await this.boardModel.countDocuments();
      return {
        message: 'Database connected!',
        boardCount,
      };
    } catch (error) {
      return {
        message: 'Database connection failed',
        error: error.message,
      };
    }
  }
}
