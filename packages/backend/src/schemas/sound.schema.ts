import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SoundDocument = Sound & Document;

@Schema({ timestamps: true })
export class Sound {
  @Prop({ type: Types.ObjectId, ref: 'Board', required: true, index: true })
  boardId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId })
  fileId: Types.ObjectId;

  @Prop()
  filename: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop()
  fileSize: number;

  @Prop()
  duration: number;

  @Prop()
  uploadedBy: string;

  @Prop({ default: 0 })
  playCount: number;

  @Prop()
  emoji?: string;

  @Prop()
  imageUrl?: string;

  @Prop({ type: Types.ObjectId })
  imageFileId?: Types.ObjectId;

  @Prop({ default: 1.0, min: 0, max: 1 })
  globalVolume: number;

  @Prop()
  startTime?: number;

  @Prop()
  endTime?: number;
}

export const SoundSchema = SchemaFactory.createForClass(Sound);
