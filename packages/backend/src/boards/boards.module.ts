import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Board, BoardSchema } from '../schemas/board.schema';
import { Sound, SoundSchema } from '../schemas/sound.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { BoardsController } from './boards.controller';
import { BoardsService } from './boards.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Board.name, schema: BoardSchema },
      { name: Sound.name, schema: SoundSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BoardsController],
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
