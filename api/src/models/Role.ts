import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * Role document interface
 */
export interface IRole extends Document {
  name: string;
  displayName: string;
  description?: string;
  permissions: mongoose.Types.ObjectId[];
  group: mongoose.Types.ObjectId; // Required - every role must belong to a group
  createdAt: Date;
  updatedAt: Date;
  hasPermission(resource: string, action: string): Promise<boolean>;
  addPermission(permissionId: mongoose.Types.ObjectId): Promise<void>;
  removePermission(permissionId: mongoose.Types.ObjectId): Promise<void>;
}

/**
 * Role schema definition
 */
const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Role name must be lowercase alphanumeric with dashes only'],
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
    permissions: {
      type: [Schema.Types.ObjectId],
      ref: 'Permission',
      default: [],
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'RoleGroup',
      required: [true, 'Role must belong to a group'],
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

// Update updatedAt on save
roleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

/**
 * Method to check if role has a specific permission
 * @param resource - Resource name (e.g., 'users', 'admin')
 * @param action - Action name (e.g., 'read', 'write', 'delete')
 * @returns Promise<boolean> - True if role has permission
 */
roleSchema.methods.hasPermission = async function (
  resource: string,
  action: string
): Promise<boolean> {
  if (!this.permissions || this.permissions.length === 0) {
    return false;
  }

  // Populate permissions if not already populated
  await this.populate('permissions');

  const rolePermissions = this.permissions as Array<{
    resources: string[];
    actions: string[];
  }>;

  return rolePermissions.some(
    (permission) =>
      permission.resources.includes(resource) && permission.actions.includes(action)
  );
};

/**
 * Method to add a permission to the role
 * @param permissionId - Permission ID to add
 */
roleSchema.methods.addPermission = async function (
  permissionId: mongoose.Types.ObjectId
): Promise<void> {
  if (!this.permissions.some((p: mongoose.Types.ObjectId) => p.toString() === permissionId.toString())) {
    this.permissions.push(permissionId);
    await this.save();
  }
};

/**
 * Method to remove a permission from the role
 * @param permissionId - Permission ID to remove
 */
roleSchema.methods.removePermission = async function (
  permissionId: mongoose.Types.ObjectId
): Promise<void> {
  this.permissions = this.permissions.filter(
    (p: mongoose.Types.ObjectId) => p.toString() !== permissionId.toString()
  );
  await this.save();
};

/**
 * Role model
 */
export const Role: Model<IRole> = mongoose.model<IRole>('Role', roleSchema);

