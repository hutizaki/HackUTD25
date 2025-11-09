import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcrypt';

/**
 * User document interface
 */
export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash: string;
  permissions: mongoose.Types.ObjectId[];
  roles: mongoose.Types.ObjectId[];
  themePreference?: 'light' | 'dark' | 'system';
  createdAt: Date;
  comparePassword(password: string): Promise<boolean>;
  hasPermission(resource: string, action: string): Promise<boolean>;
  hasAnyPermission(permissions: Array<{ resource: string; action: string }>): Promise<boolean>;
  getEffectivePermissions(): Promise<Array<{ resources: string[]; actions: string[] }>>;
  hasRole(roleName: string): Promise<boolean>;
  hasAnyRole(roleNames: string[]): Promise<boolean>;
}

/**
 * User schema definition
 */
const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [1, 'Name must be at least 1 character'],
      maxlength: [100, 'Name must be less than 100 characters'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    permissions: {
      type: [Schema.Types.ObjectId],
      ref: 'Permission',
      default: [],
    },
    roles: {
      type: [Schema.Types.ObjectId],
      ref: 'Role',
      default: [],
    },
    themePreference: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system',
      required: false,
    },
  },
  {
    timestamps: false, // We're using createdAt manually
    toJSON: {
      transform: (doc, ret: Record<string, unknown>) => {
        // Remove passwordHash from JSON output
        if ('passwordHash' in ret) {
          delete ret.passwordHash;
        }
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

/**
 * Pre-save hook to hash password if it's been modified
 * Note: This assumes password is set as a virtual field before save
 * For this implementation, we'll hash in the route handler before creating the user
 */
userSchema.pre('save', async function (next) {
  // Only hash if passwordHash is new or has been modified
  // In our implementation, we'll hash before saving, so this is a safety check
  if (!this.isModified('passwordHash')) {
    return next();
  }

  // If passwordHash looks like it's already hashed (starts with $2b$), skip
  if (this.passwordHash.startsWith('$2b$')) {
    return next();
  }

  // Hash the passwordHash (this shouldn't happen in normal flow)
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Method to compare password with stored hash
 * @param password - Plain text password to compare
 * @returns Promise<boolean> - True if password matches
 */
userSchema.methods.comparePassword = async function (
  password: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, this.passwordHash);
  } catch {
    return false;
  }
};

/**
 * Method to get effective permissions (from all roles + direct permissions)
 * @returns Promise<Array<{ resources: string[]; actions: string[] }>> - All effective permissions
 */
userSchema.methods.getEffectivePermissions = async function (): Promise<
  Array<{ resources: string[]; actions: string[] }>
> {
  const effectivePermissions: Array<{ resources: string[]; actions: string[] }> = [];

  // Get permissions from roles
  if (this.roles && this.roles.length > 0) {
    await this.populate('roles');
    const userRoles = this.roles as Array<{ permissions: mongoose.Types.ObjectId[] }>;

    // Collect all permission IDs from roles
    const rolePermissionIds: mongoose.Types.ObjectId[] = [];
    for (const role of userRoles) {
      if (role.permissions && Array.isArray(role.permissions)) {
        rolePermissionIds.push(...role.permissions);
      }
    }

    // Get unique permission IDs
    const uniqueRolePermissionIds = Array.from(
      new Set(rolePermissionIds.map((id) => id.toString()))
    ).map((id) => new mongoose.Types.ObjectId(id));

    // Populate and add role permissions
    if (uniqueRolePermissionIds.length > 0) {
      const { Permission } = await import('./Permission');
      const rolePermissions = await Permission.find({ _id: { $in: uniqueRolePermissionIds } });
      effectivePermissions.push(
        ...rolePermissions.map((p) => ({
          resources: p.resources,
          actions: p.actions,
        }))
      );
    }
  }

  // Get direct permissions
  if (this.permissions && this.permissions.length > 0) {
    await this.populate('permissions');
    const directPermissions = this.permissions as Array<{
      resources: string[];
      actions: string[];
    }>;
    effectivePermissions.push(...directPermissions);
  }

  return effectivePermissions;
};

/**
 * Method to check if user has a specific permission
 * Checks both role permissions and direct permissions
 * @param resource - Resource name (e.g., 'users', 'admin')
 * @param action - Action name (e.g., 'read', 'write', 'delete')
 * @returns Promise<boolean> - True if user has permission
 */
userSchema.methods.hasPermission = async function (
  resource: string,
  action: string
): Promise<boolean> {
  const effectivePermissions = await this.getEffectivePermissions();

  return effectivePermissions.some(
    (permission: { resources: string[]; actions: string[] }) =>
      permission.resources.includes(resource) && permission.actions.includes(action)
  );
};

/**
 * Method to check if user has any of the specified permissions
 * @param permissions - Array of permission objects with resource and action
 * @returns Promise<boolean> - True if user has at least one permission
 */
userSchema.methods.hasAnyPermission = async function (
  permissions: Array<{ resource: string; action: string }>
): Promise<boolean> {
  for (const perm of permissions) {
    if (await this.hasPermission(perm.resource, perm.action)) {
      return true;
    }
  }
  return false;
};

/**
 * Method to check if user has a specific role
 * @param roleName - Role name to check (case-insensitive)
 * @returns Promise<boolean> - True if user has the role
 */
userSchema.methods.hasRole = async function (roleName: string): Promise<boolean> {
  if (!this.roles || this.roles.length === 0) {
    return false;
  }

  await this.populate('roles');
  const userRoles = this.roles as Array<{ name: string }>;

  return userRoles.some((role) => role.name.toLowerCase() === roleName.toLowerCase());
};

/**
 * Method to check if user has any of the specified roles
 * @param roleNames - Array of role names to check (case-insensitive)
 * @returns Promise<boolean> - True if user has at least one role
 */
userSchema.methods.hasAnyRole = async function (roleNames: string[]): Promise<boolean> {
  if (!this.roles || this.roles.length === 0) {
    return false;
  }

  await this.populate('roles');
  const userRoles = this.roles as Array<{ name: string }>;
  const normalizedRoleNames = roleNames.map((name) => name.toLowerCase());

  return userRoles.some((role) => normalizedRoleNames.includes(role.name.toLowerCase()));
};

/**
 * User model
 */
export const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

