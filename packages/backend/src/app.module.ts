import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { Room, RoomSchema } from './schemas/room.schema';
import { Sound, SoundSchema } from './schemas/sound.schema';

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
    MongooseModule.forFeature([
      { name: Room.name, schema: RoomSchema },
      { name: Sound.name, schema: SoundSchema },
    ]),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
