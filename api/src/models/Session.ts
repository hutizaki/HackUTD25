import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Session document interface
 */
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  token: string; // JWT token identifier or session ID
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivity: Date;
  revoked: boolean;
}

/**
 * Session schema definition
 */
const sessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    token: {
      type: String,
      required: [true, 'Token is required'],
      index: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration date is required'],
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    revoked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: false, // We're using createdAt manually
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        if ('_id' in ret && ret._id) {
          ret.id = (ret._id as { toString: () => string }).toString();
          delete ret._id;
        }
        if ('__v' in ret) {
          delete ret.__v;
        }
        return ret;
      },
    },
  }
);

// Compound index for efficient queries
sessionSchema.index({ userId: 1, revoked: 1 });
sessionSchema.index({ expiresAt: 1, revoked: 1 });

/**
 * Session model
 */
export const Session: Model<ISession> = mongoose.model<ISession>('Session', sessionSchema);

