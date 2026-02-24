import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SoundDocument = Sound & Document;

@Schema({ timestamps: true })
export class Sound {
  @Prop({ type: Types.ObjectId, ref: 'Room', required: true, index: true })
  roomId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId })
  fileId: Types.ObjectId;

  @Prop()
  filename: string;

  @Prop({ default: 'audio/mpeg' })
  mimeType: string;

  @Prop()
  fileSize: number;

  @Prop()
  duration: number;

  @Prop()
  uploadedBy: string;

  @Prop({ default: 0 })
  playCount: number;
}

export const SoundSchema = SchemaFactory.createForClass(Sound);
