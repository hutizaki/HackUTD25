import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Permission document interface
 */
export interface IPermission extends Document {
  name: string;
  description: string;
  resources: string[];
  actions: string[];
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Permission schema definition
 */
const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'Permission description is required'],
      trim: true,
    },
    resources: {
      type: [String],
      required: [true, 'Resources are required'],
      default: [],
    },
    actions: {
      type: [String],
      required: [true, 'Actions are required'],
      default: [],
    },
    category: {
      type: String,
      trim: true,
      required: false,
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
        return ret;
      },
    },
  }
);

// Update updatedAt on save
permissionSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

/**
 * Permission model
 */
export const Permission: Model<IPermission> = mongoose.model<IPermission>('Permission', permissionSchema);

