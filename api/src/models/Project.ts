import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Project document interface
 */
export interface IProject extends Document {
  user_id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Project schema definition
 */
const projectSchema = new Schema<IProject>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [1, 'Project name must be at least 1 character'],
      maxlength: [200, 'Project name must be less than 200 characters'],
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: [2000, 'Description must be less than 2000 characters'],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (tags: string[]) => {
          // Each tag must be a non-empty string
          return tags.every((tag) => typeof tag === 'string' && tag.trim().length > 0);
        },
        message: 'All tags must be non-empty strings',
      },
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We're using created_at and updated_at manually
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        // Transform _id to id
        if ('_id' in ret && ret._id) {
          ret.id = (ret._id as { toString: () => string }).toString();
          delete ret._id;
        }
        // Transform user_id to user_id (keep as string)
        if ('user_id' in ret && ret.user_id) {
          ret.user_id = (ret.user_id as { toString: () => string }).toString();
        }
        if ('__v' in ret) {
          delete ret.__v;
        }
        return ret;
      },
    },
  }
);

/**
 * Update updated_at before saving
 */
projectSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

/**
 * Project model
 */
export const Project: Model<IProject> = mongoose.model<IProject>('Project', projectSchema);

