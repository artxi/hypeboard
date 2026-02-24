import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BoardDocument = Board & Document;

export interface AccessRequest {
  username: string;
  requestedAt: Date;
  message?: string;
}

@Schema({ timestamps: true })
export class Board {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ type: [String], default: [] })
  admins: string[];

  @Prop({ type: [String], default: [] })
  members: string[];

  @Prop({
    type: [
      {
        username: { type: String, required: true },
        requestedAt: { type: Date, default: Date.now },
        message: { type: String },
      },
    ],
    default: [],
  })
  pendingRequests: AccessRequest[];

  @Prop({ required: true, unique: true, index: true })
  inviteCode: string;

  @Prop({ default: false })
  isPublic: boolean;

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

export const BoardSchema = SchemaFactory.createForClass(Board);
