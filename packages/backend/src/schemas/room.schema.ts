import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  admins: string[];

  @Prop({
    type: {
      maxSounds: { type: Number, default: 50 },
      maxFileSize: { type: Number, default: 5242880 }, // 5MB
      allowUploads: { type: Boolean, default: true },
    },
    default: {},
  })
  settings: {
    maxSounds: number;
    maxFileSize: number;
    allowUploads: boolean;
  };

  @Prop({ default: Date.now })
  lastActivity: Date;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
