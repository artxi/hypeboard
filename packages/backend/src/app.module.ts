import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { BoardsModule } from './boards/boards.module';
import { AuthModule } from './auth/auth.module';
import { Board, BoardSchema } from './schemas/board.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || '', {
      onConnectionCreate: (connection) => {
        connection.on('connected', () => {
          console.log('✅ MongoDB connected successfully');
        });
        connection.on('error', (error) => {
          console.error('❌ MongoDB connection error:', error);
        });
        connection.on('disconnected', () => {
          console.log('⚠️  MongoDB disconnected');
        });
        return connection;
      },
    }),
    MongooseModule.forFeature([{ name: Board.name, schema: BoardSchema }]),
    AuthModule,
    BoardsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
