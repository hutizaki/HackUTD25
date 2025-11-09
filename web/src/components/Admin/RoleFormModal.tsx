import { useState, useEffect } from 'react';
import { createRole, updateRole, getRoleGroups, type Role, type RoleGroup, type CreateRoleData, type UpdateRoleData } from '@/lib/roles';
import { getPermissions, type Permission } from '@/lib/admin';
import { BaseModal } from '@/components/common/BaseModal';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';

interface RoleFormModalProps {
  role?: Role | null;
  defaultGroupId?: string;
  onClose: () => void;
}

export function RoleFormModal({ role, defaultGroupId, onClose }: RoleFormModalProps) {
  const [name, setName] = useState(role?.name || '');
  const [displayName, setDisplayName] = useState(role?.displayName || '');
  const [description, setDescription] = useState(role?.description || '');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(
    role?.group?.id || defaultGroupId || ''
  );
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [allGroups, setAllGroups] = useState<RoleGroup[]>([]);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);

  // Load all permissions and groups on mount, and reload role if editing
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingPermissions(true);
        setLoadingGroups(true);
        const [permissionsResponse, groupsResponse] = await Promise.all([
          getPermissions(1, 1000),
          getRoleGroups(),
        ]);
        setAllPermissions(permissionsResponse.data);
        setAllGroups(groupsResponse.data);
        
        // If editing a role, reload it to get fresh permission data
        if (role?.id) {
          try {
            const { getRole } = await import('@/lib/roles');
            const roleResponse = await getRole(role.id);
            const roleData = roleResponse.data;
            // Extract permission IDs - handle both populated and unpopulated permissions
            const permissionIds = (roleData.permissions || []).map((p: any) => {
              if (typeof p === 'string') return p; // ObjectId string
              if (p && typeof p === 'object') {
                return p.id || p._id || String(p); // Populated permission object or ObjectId
              }
              return String(p); // Fallback
            }).filter((id: string | null | undefined) => id && id !== 'null' && id !== 'undefined');
            setSelectedPermissions(permissionIds);
          } catch (err) {
            console.error('Failed to reload role:', err);
            // Fallback to using the passed role's permissions
            const permissionIds = (role.permissions || []).map((p: any) => {
              if (typeof p === 'string') return p;
              if (p && typeof p === 'object') {
                return p.id || p._id || String(p);
              }
              return String(p);
            }).filter((id: string | null | undefined) => id && id !== 'null' && id !== 'undefined');
            setSelectedPermissions(permissionIds);
          }
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoadingPermissions(false);
        setLoadingGroups(false);
      }
    };
    loadData();
  }, [role?.id]);


  // Validate name format (lowercase alphanumeric with dashes)
  const validateName = (value: string): boolean => {
    return /^[a-z0-9-]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!role && !name.trim()) {
      setError('Role name is required');
      return;
    }

    if (!role && !validateName(name.trim())) {
      setError('Role name must be lowercase alphanumeric with dashes only (e.g., "moderator", "staff-member")');
      return;
    }

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (!selectedGroup) {
      setError('Group is required');
      return;
    }

    try {
      setLoading(true);
      if (role) {
        // Update
        const updateData: UpdateRoleData = {
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          permissions: selectedPermissions,
          group: selectedGroup,
        };
        await updateRole(role.id, updateData);
      } else {
        // Create
        const createData: CreateRoleData = {
          name: name.trim().toLowerCase(),
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          permissions: selectedPermissions.length > 0 ? selectedPermissions : undefined,
          group: selectedGroup,
        };
        await createRole(createData);
      }
      onClose();
    } catch (err) {
      setError(handleApiError(err, 'Failed to save role'));
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // Filter permissions based on search
  const filteredPermissions = allPermissions.filter((permission) =>
    permission.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
    permission.description.toLowerCase().includes(permissionSearch.toLowerCase())
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title={role ? 'Edit Role' : 'Create Role'}
      maxWidth="3xl"
      zIndex={10003}
    >
      {error && <ErrorDisplay error={error} className="mb-4" />}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name (only for create, disabled for system roles) */}
          {!role && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role Name * <span className="text-xs text-gray-500">(lowercase, alphanumeric, dashes only)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase();
                  setName(value);
                  if (value && !validateName(value)) {
                    setError('Role name must be lowercase alphanumeric with dashes only');
                  } else {
                    setError(null);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., moderator, staff-member"
                required
                pattern="[a-z0-9-]+"
              />
            </div>
          )}

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Moderator"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe what this role allows..."
            />
          </div>

          {/* Group Selection - Only show if editing or if no defaultGroupId provided */}
          {(!defaultGroupId || role) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Group *
              </label>
              {loadingGroups ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading groups...</div>
              ) : (
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  required
                  disabled={!!(role?.group?.id && allGroups.find((g) => g.id === role.group?.id)?.isSystemGroup || (defaultGroupId && !role))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select a group</option>
                  {allGroups
                    .filter((group) => {
                      // When creating, exclude system groups
                      if (!role) {
                        return !group.isSystemGroup;
                      }
                      // When editing, show all groups (but disable if it's a system group)
                      return true;
                    })
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.displayName} {group.isSystemGroup && '(System)'}
                      </option>
                    ))}
                </select>
              )}
              {role?.group?.id && allGroups.find((g) => g.id === role.group?.id)?.isSystemGroup && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Roles in system groups cannot be moved to other groups.
                </p>
              )}
              {defaultGroupId && !role && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Role will be created in the selected group.
                </p>
              )}
            </div>
          )}

          {/* Permissions Multi-Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Permissions
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-64 overflow-y-auto bg-white dark:bg-gray-700">
              {/* Search */}
              <input
                type="text"
                value={permissionSearch}
                onChange={(e) => setPermissionSearch(e.target.value)}
                placeholder="Search permissions..."
                className="w-full px-3 py-2 mb-3 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />

              {loadingPermissions ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  Loading permissions...
                </div>
              ) : filteredPermissions.length === 0 ? (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No permissions found
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPermissions.map((permission) => (
                    <label
                      key={permission.id}
                      className="flex items-start space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {permission.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {permission.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedPermissions.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {selectedPermissions.length} permission(s) selected
              </div>
            )}
          </div>


          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : role ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
    </BaseModal>
  );
}

