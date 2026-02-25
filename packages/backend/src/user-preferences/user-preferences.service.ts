import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserPreferences, UserPreferencesDocument } from '../schemas/user-preferences.schema';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

@Injectable()
export class UserPreferencesService {
  constructor(
    @InjectModel(UserPreferences.name)
    private userPreferencesModel: Model<UserPreferencesDocument>,
  ) {}

  async getPreferences(userId: string, boardId: string): Promise<UserPreferences> {
    const userObjectId = new Types.ObjectId(userId);
    const boardObjectId = new Types.ObjectId(boardId);

    let preferences = await this.userPreferencesModel.findOne({
      userId: userObjectId,
      boardId: boardObjectId,
    });

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await this.userPreferencesModel.create({
        userId: userObjectId,
        boardId: boardObjectId,
        soundPreferences: new Map(),
      });
    }

    return preferences;
  }

  async updateSoundPreference(
    userId: string,
    soundId: string,
    boardId: string,
    updateDto: UpdatePreferenceDto,
  ): Promise<UserPreferences> {
    const userObjectId = new Types.ObjectId(userId);
    const boardObjectId = new Types.ObjectId(boardId);

    // Get or create preferences
    let preferences = await this.userPreferencesModel.findOne({
      userId: userObjectId,
      boardId: boardObjectId,
    });

    if (!preferences) {
      preferences = new this.userPreferencesModel({
        userId: userObjectId,
        boardId: boardObjectId,
        soundPreferences: new Map(),
      });
    }

    // Update the specific sound preference
    const currentPref = preferences.soundPreferences.get(soundId) || {
      volume: 1.0,
      isFavorite: false,
    };

    const updatedPref = {
      volume: updateDto.volume !== undefined ? updateDto.volume : currentPref.volume,
      isFavorite: updateDto.isFavorite !== undefined ? updateDto.isFavorite : currentPref.isFavorite,
    };

    preferences.soundPreferences.set(soundId, updatedPref);

    await preferences.save();
    return preferences;
  }

  async getFavorites(userId: string, boardId: string): Promise<string[]> {
    const preferences = await this.getPreferences(userId, boardId);

    const favorites: string[] = [];
    preferences.soundPreferences.forEach((pref, soundId) => {
      if (pref.isFavorite) {
        favorites.push(soundId);
      }
    });

    return favorites;
  }
}
