import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * FeatureFlag document interface
 */
export interface IFeatureFlag extends Document {
  name: string;
  description: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * FeatureFlag schema definition
 */
const featureFlagSchema = new Schema<IFeatureFlag>(
  {
    name: {
      type: String,
      required: [true, 'Feature flag name is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Feature flag description is required'],
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We're using createdAt/updatedAt manually
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        if ('_id' in ret && ret._id) {
          ret.id = (ret._id as { toString: () => string }).toString();
          delete ret._id;
        }
        if ('__v' in ret) {
          delete ret.__v;
        }
        // Remove old fields if they exist
        delete ret.enabledForUsers;
        delete ret.enabledForRoles;
        delete ret.rolloutPercentage;
        return ret;
      },
    },
  }
);

// Update updatedAt on save
featureFlagSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

/**
 * FeatureFlag model
 */
export const FeatureFlag: Model<IFeatureFlag> = mongoose.model<IFeatureFlag>('FeatureFlag', featureFlagSchema);

