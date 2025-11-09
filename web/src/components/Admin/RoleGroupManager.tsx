import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  getRoleGroups,
  createRoleGroup,
  updateRoleGroup,
  deleteRoleGroup,
  getRoles,
  type RoleGroup,
  type CreateRoleGroupData,
  type UpdateRoleGroupData,
  type Role,
} from '@/lib/roles';

export function RoleGroupManager() {
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RoleGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<RoleGroup | null>(null);
  const [allRoles, setAllRoles] = useState<Role[]>([]);

  useEffect(() => {
    loadGroups();
    loadRoles();
  }, [refreshKey]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getRoleGroups();
      setGroups(response.data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('403')) {
          setError('Admin endpoints only available in development environment');
        } else {
          setError(err.message || 'Failed to load role groups');
        }
      } else {
        setError('Failed to load role groups');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await getRoles(1, 1000);
      setAllRoles(response.data);
    } catch (err) {
      console.error('Failed to load roles:', err);
    }
  };

  const handleCreate = () => {
    setShowCreateModal(true);
    setEditingGroup(null);
  };

  const handleEdit = (group: RoleGroup) => {
    setEditingGroup(group);
    setShowCreateModal(true);
  };

  const handleDelete = (group: RoleGroup) => {
    setDeletingGroup(group);
  };

  const handleSave = async (data: CreateRoleGroupData | UpdateRoleGroupData) => {
    try {
      if (editingGroup) {
        await updateRoleGroup(editingGroup.id, data as UpdateRoleGroupData);
      } else {
        await createRoleGroup(data as CreateRoleGroupData);
      }
      setShowCreateModal(false);
      setEditingGroup(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save role group');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingGroup) return;

    try {
      await deleteRoleGroup(deletingGroup.id);
      setDeletingGroup(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role group');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Role Groups</h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        >
          Create Group
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Display Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Requires One
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Default Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                System Group
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {groups.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No role groups found. Create your first group to get started.
                </td>
              </tr>
            ) : (
              groups.map((group) => (
                <motion.tr
                  key={group.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {group.displayName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {group.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {group.requiresOne ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {group.defaultRole ? (
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{group.defaultRole.displayName}</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {group.isSystemGroup ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">Yes</span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">No</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(group)}
                        disabled={group.isSystemGroup}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={group.isSystemGroup ? 'System groups cannot be edited' : 'Edit group'}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
                        disabled={group.isSystemGroup}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={group.isSystemGroup ? 'System groups cannot be deleted' : 'Delete group'}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <RoleGroupFormModal
          group={editingGroup}
          allRoles={allRoles}
          onClose={() => {
            setShowCreateModal(false);
            setEditingGroup(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Role Group
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete the group "{deletingGroup.displayName}"? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setDeletingGroup(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

interface RoleGroupFormModalProps {
  group?: RoleGroup | null;
  allRoles: Role[];
  onClose: () => void;
  onSave: (data: CreateRoleGroupData | UpdateRoleGroupData) => Promise<void>;
}

function RoleGroupFormModal({ group, allRoles, onClose, onSave }: RoleGroupFormModalProps) {
  const [name, setName] = useState(group?.name || '');
  const [displayName, setDisplayName] = useState(group?.displayName || '');
  const [description, setDescription] = useState(group?.description || '');
  const [requiresOne, setRequiresOne] = useState(group?.requiresOne || false);
  const [defaultRoleId, setDefaultRoleId] = useState(group?.defaultRoleId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateName = (value: string): boolean => {
    return /^[a-z0-9-]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!group && !name.trim()) {
      setError('Group name is required');
      return;
    }

    if (!group && !validateName(name.trim())) {
      setError('Group name must be lowercase alphanumeric with dashes only (e.g., "system", "custom-group")');
      return;
    }

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    if (requiresOne && !defaultRoleId) {
      setError('Default role is required when "Requires One" is enabled');
      return;
    }

    try {
      setLoading(true);
      if (group) {
        await onSave({
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          requiresOne,
          defaultRoleId: defaultRoleId || undefined,
        });
      } else {
        await onSave({
          name: name.trim().toLowerCase(),
          displayName: displayName.trim(),
          description: description.trim() || undefined,
          requiresOne,
          defaultRoleId: defaultRoleId || undefined,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role group');
      setLoading(false);
    }
  };

  // Filter roles that belong to this group (for default role selection)
  // When editing, only show roles in this group. When creating, show all roles.
  const availableRolesForDefault = group
    ? allRoles.filter((r) => r.group?.id === group.id)
    : allRoles;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {group ? 'Edit Role Group' : 'Create Role Group'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!group && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., system, custom-group"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Lowercase alphanumeric with dashes only
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g., System"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Describe what this group is for..."
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresOne}
                onChange={(e) => {
                  setRequiresOne(e.target.checked);
                  if (!e.target.checked) {
                    setDefaultRoleId('');
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Force all users to have exactly one role from this group
              </span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
              If enabled, every user must have exactly one role from this group. A default role must be set.
            </p>
          </div>

          {requiresOne && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Role *
              </label>
              <select
                value={defaultRoleId}
                onChange={(e) => setDefaultRoleId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a default role</option>
                {availableRolesForDefault.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.displayName} {!group && role.group && `(${role.group.displayName})`}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This role will be automatically assigned to users who don't have a role from this group.
              </p>
            </div>
          )}

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
              {loading ? 'Saving...' : group ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

