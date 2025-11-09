import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  getRoles,
  getRoleGroups,
  createRoleGroup,
  updateRoleGroup,
  deleteRoleGroup,
  deleteRole,
  type Role,
  type RoleGroup,
  type CreateRoleGroupData,
  type UpdateRoleGroupData,
} from '@/lib/roles';
import { RoleFormModal } from './RoleFormModal';
import { DeleteRoleConfirm } from './DeleteRoleConfirm';
import { RoleUsersModal } from './RoleUsersModal';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';

export function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<RoleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page] = useState(1);
  const [limit] = useState(1000); // Load all roles to group them
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [creatingRoleForGroup, setCreatingRoleForGroup] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [managingUsersRole, setManagingUsersRole] = useState<Role | null>(null);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RoleGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<RoleGroup | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, [page, refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [rolesResponse, groupsResponse] = await Promise.all([
        getRoles(page, limit),
        getRoleGroups(),
      ]);
      setRoles(rolesResponse.data);
      setGroups(groupsResponse.data);
    } catch (err) {
      setError(handleApiError(err, 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  // Calculate maximum permissions count across all roles
  const maxPermissionsCount = useMemo(() => {
    if (roles.length === 0) return 1;
    return Math.max(...roles.map(role => role.permissionsCount || 0), 1);
  }, [roles]);

  // Function to get green shade based on permissions count relative to max
  const getPermissionCountColor = (count: number) => {
    // 0 permissions should be grey
    if (count === 0) {
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
    
    if (maxPermissionsCount === 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    
    const ratio = count / maxPermissionsCount;
    
    // Create a gradient from light green (low) to dark green (high)
    // Using Tailwind's green color scale
    if (ratio >= 0.9) {
      return 'bg-green-600 dark:bg-green-700 text-white';
    } else if (ratio >= 0.75) {
      return 'bg-green-500 dark:bg-green-600 text-white';
    } else if (ratio >= 0.6) {
      return 'bg-green-400 dark:bg-green-500 text-white';
    } else if (ratio >= 0.45) {
      return 'bg-green-300 dark:bg-green-400 text-green-900 dark:text-white';
    } else if (ratio >= 0.3) {
      return 'bg-green-200 dark:bg-green-300 text-green-800 dark:text-green-900';
    } else if (ratio >= 0.15) {
      return 'bg-green-100 dark:bg-green-200 text-green-700 dark:text-green-800';
    } else {
      return 'bg-green-50 dark:bg-green-100 text-green-600 dark:text-green-700';
    }
  };

  // Group roles by their group
  const groupedRoles = groups.map((group) => ({
    group,
    roles: roles.filter((role) => role.group?.id === group.id),
  }));

  const handleCreateRole = (groupId?: string) => {
    setEditingRole(null);
    setCreatingRoleForGroup(groupId || null);
    setShowCreateModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setShowCreateModal(true);
  };

  const handleDeleteRole = (role: Role) => {
    setDeletingRole(role);
  };

  const handleDeleteRoleConfirm = async () => {
    if (!deletingRole) return;

    try {
      await deleteRole(deletingRole.id);
      setDeletingRole(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role');
    }
  };

  const handleRoleModalClose = () => {
    setShowCreateModal(false);
    setEditingRole(null);
    setRefreshKey((prev) => prev + 1);
  };

  const handleCreateGroup = () => {
    setShowCreateGroupModal(true);
    setEditingGroup(null);
  };

  const handleEditGroup = (group: RoleGroup) => {
    setEditingGroup(group);
    setShowCreateGroupModal(true);
  };

  const handleDeleteGroup = (group: RoleGroup) => {
    setDeletingGroup(group);
  };

  const handleSaveGroup = async (data: CreateRoleGroupData | UpdateRoleGroupData) => {
    try {
      if (editingGroup) {
        await updateRoleGroup(editingGroup.id, data as UpdateRoleGroupData);
      } else {
        await createRoleGroup(data as CreateRoleGroupData);
      }
      setShowCreateGroupModal(false);
      setEditingGroup(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save role group');
    }
  };

  const handleConfirmDeleteGroup = async () => {
    if (!deletingGroup) return;

    try {
      await deleteRoleGroup(deletingGroup.id);
      setDeletingGroup(null);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete role group');
    }
  };

  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  if (loading && roles.length === 0) {
    return <LoadingSpinner message="Loading roles..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Roles</h3>
        <button
          onClick={handleCreateGroup}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Create Group
        </button>
      </div>

      {/* Grouped Roles */}
      {groupedRoles.map(({ group, roles: groupRoles }) => (
        <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {/* Group Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => toggleGroupCollapse(group.id)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                title={collapsedGroups.has(group.id) ? 'Expand group' : 'Collapse group'}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${collapsedGroups.has(group.id) ? '' : 'rotate-90'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <h4 className="text-base font-semibold text-gray-900 dark:text-white">{group.displayName}</h4>
              {group.isSystemGroup && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                  System
                </span>
              )}
              {group.requiresOne && (
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium">
                  Requires One
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleEditGroup(group)}
                disabled={group.isSystemGroup}
                className={`text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  group.isSystemGroup ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={group.isSystemGroup ? 'System groups cannot be edited' : 'Edit group'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => handleDeleteGroup(group)}
                disabled={group.isSystemGroup}
                className={`text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 ${
                  group.isSystemGroup ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={group.isSystemGroup ? 'System groups cannot be deleted' : 'Delete group'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => handleCreateRole(group.id)}
                disabled={group.isSystemGroup}
                className={`text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                  group.isSystemGroup ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={group.isSystemGroup ? 'Cannot create roles in system groups' : 'Create role'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* Roles Table */}
          {!collapsedGroups.has(group.id) && (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Display Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {groupRoles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {group.isSystemGroup
                      ? 'No roles in this system group.'
                      : 'No roles in this group. Create a role to get started.'}
                  </td>
                </tr>
              ) : (
                groupRoles.map((role) => (
                  <motion.tr
                    key={role.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {role.name}
                        </span>
                        {role.group?.isSystemGroup && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                            System
                          </span>
                        )}
                        {group.defaultRole?.id === role.id && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                            Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {role.displayName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPermissionCountColor(role.permissionsCount || 0)}`}>
                        {role.permissionsCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setManagingUsersRole(role)}
                          className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors p-1.5 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                          title="Manage Users"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditRole(role)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Edit Role"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role)}
                          disabled={role.group?.isSystemGroup}
                          className={`transition-colors p-1.5 rounded ${
                            role.group?.isSystemGroup
                              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50'
                              : 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                          title={role.group?.isSystemGroup ? 'System roles cannot be deleted' : 'Delete role'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
          )}
        </div>
      ))}

      {/* Create/Edit Role Modal */}
      {showCreateModal && (
        <RoleFormModal 
          role={editingRole} 
          defaultGroupId={creatingRoleForGroup || undefined}
          onClose={handleRoleModalClose} 
        />
      )}

      {/* Delete Role Confirmation Modal */}
      {deletingRole && (
        <DeleteRoleConfirm
          role={deletingRole}
          onConfirm={handleDeleteRoleConfirm}
          onCancel={() => setDeletingRole(null)}
        />
      )}

      {/* Manage Users Modal */}
      {managingUsersRole && (
        <RoleUsersModal
          role={managingUsersRole}
          onClose={() => setManagingUsersRole(null)}
        />
      )}

      {/* Create/Edit Group Modal */}
      {showCreateGroupModal && (
        <RoleGroupFormModal
          group={editingGroup}
          allRoles={roles}
          onClose={() => {
            setShowCreateGroupModal(false);
            setEditingGroup(null);
          }}
          onSave={handleSaveGroup}
        />
      )}

      {/* Delete Group Confirmation Modal */}
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
                onClick={handleConfirmDeleteGroup}
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
