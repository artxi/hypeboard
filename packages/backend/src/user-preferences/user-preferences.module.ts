import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserPreferencesController } from './user-preferences.controller';
import { UserPreferencesService } from './user-preferences.service';
import { UserPreferences, UserPreferencesSchema } from '../schemas/user-preferences.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPreferences.name, schema: UserPreferencesSchema },
    ]),
  ],
  controllers: [UserPreferencesController],
  providers: [UserPreferencesService],
  exports: [UserPreferencesService],
})
export class UserPreferencesModule {}
