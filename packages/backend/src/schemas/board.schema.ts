import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BoardDocument = Board & Document;

export interface AccessRequest {
  userId: MongooseSchema.Types.ObjectId;
  requestedAt: Date;
  message?: string;
}

@Schema({ timestamps: true })
export class Board {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  admins: MongooseSchema.Types.ObjectId[];

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  members: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [
      {
        userId: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
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
