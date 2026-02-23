import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
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
}
