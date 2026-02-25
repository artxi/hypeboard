import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserPreferencesDocument = UserPreferences & Document;

export class SoundPreference {
  @Prop({ default: 1.0, min: 0, max: 1 })
  volume: number;

  @Prop({ default: false })
  isFavorite: boolean;
}

@Schema({ timestamps: true })
export class UserPreferences {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Board', required: true, index: true })
  boardId: Types.ObjectId;

  @Prop({ type: Map, of: Object, default: {} })
  soundPreferences: Map<string, SoundPreference>;
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences);

// Create compound index on userId and boardId for efficient lookups
UserPreferencesSchema.index({ userId: 1, boardId: 1 }, { unique: true });
