import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Activity log document interface
 */
export interface IActivityLog extends Document {
  userId: mongoose.Types.ObjectId;
  action: string; // e.g., "login", "update_profile", "delete_user", etc.
  method: string; // HTTP method
  path: string; // API endpoint
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, unknown>; // Additional context
  timestamp: Date;
}

/**
 * Activity log schema definition
 */
const activityLogSchema = new Schema<IActivityLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      index: true,
    },
    method: {
      type: String,
      required: [true, 'HTTP method is required'],
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    path: {
      type: String,
      required: [true, 'Path is required'],
      trim: true,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
    requestId: {
      type: String,
      trim: true,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // We're using timestamp manually
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

// Compound indexes for efficient queries
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 }); // For time-based queries

/**
 * Activity log model
 */
export const ActivityLog: Model<IActivityLog> = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);

