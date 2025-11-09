import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Role Group document interface
 */
export interface IRoleGroup extends Document {
  name: string;
  displayName: string;
  description?: string;
  requiresOne: boolean; // Force all users to have exactly one role from this group
  defaultRoleId?: mongoose.Types.ObjectId; // Required if requiresOne is true
  isSystemGroup: boolean; // System groups cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Role Group schema definition
 */
const roleGroupSchema = new Schema<IRoleGroup>(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Group name must be lowercase alphanumeric with dashes only'],
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [1, 'Display name must be at least 1 character'],
      maxlength: [100, 'Display name must be less than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must be less than 500 characters'],
    },
    requiresOne: {
      type: Boolean,
      default: false,
    },
    defaultRoleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: false,
    },
    isSystemGroup: {
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
        return ret;
      },
    },
  }
);

// Note: name field already has unique: true in schema, which creates the index automatically
// No need for explicit index definition

// Validation: if requiresOne is true, defaultRoleId must be set
roleGroupSchema.pre('save', function (next) {
  if (this.requiresOne && !this.defaultRoleId) {
    next(new Error('Default role is required when requiresOne is true'));
  } else {
    next();
  }
});

// Update updatedAt on save
roleGroupSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

/**
 * Role Group model
 */
export const RoleGroup: Model<IRoleGroup> = mongoose.model<IRoleGroup>('RoleGroup', roleGroupSchema);

