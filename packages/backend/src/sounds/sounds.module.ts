import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Sound, SoundSchema } from '../schemas/sound.schema';
import { Board, BoardSchema } from '../schemas/board.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { SoundsService } from './sounds.service';
import { SoundsController } from './sounds.controller';
import { SoundsGateway } from './sounds.gateway';
import { GridFSService } from './services/gridfs.service';
import { ImageGridFSService } from './services/image-gridfs.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sound.name, schema: SoundSchema },
      { name: Board.name, schema: BoardSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [SoundsService, GridFSService, ImageGridFSService, SoundsGateway],
  controllers: [SoundsController],
  exports: [SoundsService],
})
export class SoundsModule {}
