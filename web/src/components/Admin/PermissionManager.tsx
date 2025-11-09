import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  getPermissions,
  getUsers,
  bulkSetUserPermissions,
  getUserEffectivePermissions,
  getUserDirectPermissions,
  type Permission,
  type PaginationData,
  type AdminUser,
} from '@/lib/admin';
import { getRoles, addPermissionToRole, removePermissionFromRole, type Role } from '@/lib/roles';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorDisplay } from '@/components/common/ErrorDisplay';
import { handleApiError } from '@/lib/errorHandling';

export function PermissionManager() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedRoleGroups, setCollapsedRoleGroups] = useState<Set<string>>(new Set());
  const [showUserSelector, setShowUserSelector] = useState<string | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [allRoles, setAllRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [assigningPermission, setAssigningPermission] = useState<string | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [roleSearchTerm, setRoleSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [initialSelectedUsers, setInitialSelectedUsers] = useState<Set<string>>(new Set()); // Track users who originally had the permission
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [userPermissions, setUserPermissions] = useState<Record<string, Array<Permission & { source: 'role' | 'direct'; roleName?: string }>>>({});
  const [userDirectPermissions, setUserDirectPermissions] = useState<Record<string, Permission[]>>({});
  const [rolePermissions, setRolePermissions] = useState<Record<string, Permission[]>>({});
  const [loadingUserPermissions, setLoadingUserPermissions] = useState<Record<string, boolean>>({});
  const [permissionUserCounts, setPermissionUserCounts] = useState<Record<string, number>>({});
  const [permissionRoleCounts, setPermissionRoleCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadPermissions();
  }, [page]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPermissions(page, limit);
      setPermissions(response.data);
      setPagination(response.pagination);
      // Load counts for all permissions
      loadPermissionCounts(response.data);
    } catch (err) {
      setError(handleApiError(err, 'Failed to load permissions'));
    } finally {
      setLoading(false);
    }
  };

  // Load user and role counts for each permission
  const loadPermissionCounts = async (permissions: Permission[]) => {
    try {
      // Load all users and roles
      const [usersResponse, rolesResponse] = await Promise.all([
        getUsers(1, 1000).catch(() => ({ data: [], pagination: null })),
        getRoles(1, 1000).catch(() => ({ data: [] })),
      ]);

      const userCounts: Record<string, number> = {};
      const roleCounts: Record<string, number> = {};

      // Count users with direct permissions
      await Promise.all(
        permissions.map(async (permission) => {
          let userCount = 0;
          await Promise.all(
            usersResponse.data.map(async (user) => {
              try {
                const directPerms = await getUserDirectPermissions(user.id);
                if (directPerms.some((p) => p.id === permission.id)) {
                  userCount++;
                }
              } catch (err) {
                // Ignore errors for individual users
              }
            })
          );
          userCounts[permission.id] = userCount;
        })
      );

      // Count roles with this permission
      permissions.forEach((permission) => {
        let roleCount = 0;
        rolesResponse.data.forEach((role) => {
          if (role.permissions && role.permissions.length > 0) {
            const hasPermission = role.permissions.some((p: any) => {
              const permId = typeof p === 'string' ? p : (p.id || p._id || p.toString());
              return permId === permission.id;
            });
            if (hasPermission) {
              roleCount++;
            }
          }
        });
        roleCounts[permission.id] = roleCount;
      });

      setPermissionUserCounts(userCounts);
      setPermissionRoleCounts(roleCounts);
    } catch (err) {
      console.error('Failed to load permission counts:', err);
    }
  };


  const filteredPermissions = permissions.filter((permission) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      permission.name.toLowerCase().includes(search) ||
      permission.description.toLowerCase().includes(search) ||
      permission.resources.some((r) => r.toLowerCase().includes(search)) ||
      permission.actions.some((a) => a.toLowerCase().includes(search)) ||
      (permission.category && permission.category.toLowerCase().includes(search))
    );
  });

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    const uncategorized: Permission[] = [];

    filteredPermissions.forEach((permission) => {
      if (permission.category) {
        if (!groups[permission.category]) {
          groups[permission.category] = [];
        }
        groups[permission.category].push(permission);
      } else {
        uncategorized.push(permission);
      }
    });

    return { groups, uncategorized };
  }, [filteredPermissions]);

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleRoleGroup = (groupName: string) => {
    setCollapsedRoleGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleOpenUserSelector = async (permissionId: string) => {
    setShowUserSelector(permissionId);
    setSelectedUsers(new Set());
    // Don't clear permissions state immediately - keep old data until new data loads
    // This prevents cards from showing gray while loading
    
    // Always reload users to ensure we have the latest data
    // This ensures we have fresh user data after permissions are assigned
    setLoadingUsers(true);
    let usersToCheck = allUsers;
    try {
      const response = await getUsers(1, 1000);
      usersToCheck = response.data;
      setAllUsers(usersToCheck);
    } catch (err) {
      console.error('Failed to load users:', err);
      // Fallback to existing users if reload fails
      if (allUsers.length === 0) {
        usersToCheck = [];
      }
    } finally {
      setLoadingUsers(false);
    }
    
    // Load effective permissions and direct permissions for all users
    // Always fetch fresh data from the backend
    if (usersToCheck.length > 0) {
      setLoadingUserPermissions({});
      // Create new state objects to replace old ones after all permissions are loaded
      const newUserPermissions: Record<string, Array<Permission & { source: 'role' | 'direct'; roleName?: string }>> = {};
      const newUserDirectPermissions: Record<string, Permission[]> = {};
      const usersWithDirectPermission = new Set<string>();
      
      const permissionChecks = usersToCheck.map(async (user) => {
        try {
          setLoadingUserPermissions(prev => ({ ...prev, [user.id]: true }));
          // Always fetch fresh permissions from the backend
          const [effectivePerms, directPerms] = await Promise.all([
            getUserEffectivePermissions(user.id),
            getUserDirectPermissions(user.id).catch(() => []),
          ]);
          // Store in temporary objects
          newUserPermissions[user.id] = effectivePerms;
          newUserDirectPermissions[user.id] = directPerms;
          
          // Update state immediately for this user so colors show correctly
          setUserPermissions(prev => ({ ...prev, [user.id]: effectivePerms }));
          setUserDirectPermissions(prev => ({ ...prev, [user.id]: directPerms }));
          
          // Track users who have this permission directly (not via role)
          // Compare permission IDs as strings to ensure correct matching
          const hasDirectPermission = directPerms.some(p => {
            const permId = String(p.id || '').trim();
            const targetId = String(permissionId || '').trim();
            return permId === targetId && permId !== '';
          });
          console.log(`User ${user.id} (${user.email}):`, {
            permissionId,
            permissionIdType: typeof permissionId,
            directPerms: directPerms.map(p => ({ 
              id: p.id, 
              idType: typeof p.id,
              idString: String(p.id),
              name: p.name 
            })),
            hasDirectPermission,
            directPermIds: directPerms.map(p => String(p.id)),
            comparison: directPerms.map(p => ({
              permId: String(p.id),
              targetId: String(permissionId),
              match: String(p.id) === String(permissionId)
            })),
          });
          if (hasDirectPermission) {
            usersWithDirectPermission.add(user.id);
            console.log(`Added user ${user.id} to selected users`);
          }
        } catch (err) {
          console.error(`Failed to load permissions for user ${user.id}:`, err);
        } finally {
          setLoadingUserPermissions(prev => ({ ...prev, [user.id]: false }));
        }
      });
      await Promise.all(permissionChecks);
      
      // After all permissions are loaded, update state with all new data
      // This ensures consistency even if some users failed to load
      setUserPermissions(newUserPermissions);
      setUserDirectPermissions(newUserDirectPermissions);
      
      // Set selected users once after all permissions are loaded
      // This ensures all users with direct permissions are selected
      console.log('Setting selected users:', {
        permissionId,
        usersWithDirectPermission: Array.from(usersWithDirectPermission),
        allUsers: usersToCheck.map(u => ({ id: u.id, email: u.email })),
      });
      setSelectedUsers(usersWithDirectPermission);
      setInitialSelectedUsers(new Set(usersWithDirectPermission)); // Track initial state
    }
  };

  const handleOpenRoleSelector = async (permissionId: string) => {
    setShowRoleSelector(permissionId);
    setSelectedRoles(new Set());
    
    // Load roles if not loaded
    let rolesToCheck = allRoles;
    if (allRoles.length === 0) {
      setLoadingRoles(true);
      try {
        const response = await getRoles(1, 1000);
        rolesToCheck = response.data;
        setAllRoles(rolesToCheck);
      } catch (err) {
        console.error('Failed to load roles:', err);
      } finally {
        setLoadingRoles(false);
      }
    }
    
    // Check which roles already have this permission (after roles are loaded)
    // Handle both populated permissions (with id) and ObjectIds
    const rolesWithPermission = rolesToCheck.filter(role => {
      if (!role.permissions || role.permissions.length === 0) return false;
      return role.permissions.some((p: any) => {
        // Handle both populated permission objects and ObjectIds
        const permId = typeof p === 'string' ? p : (p.id || p._id || p.toString());
        return permId === permissionId;
      });
    });
    setSelectedRoles(new Set(rolesWithPermission.map(r => r.id)));
    
    // Load role permissions for display
    // Normalize permissions to have consistent id format
    rolesToCheck.forEach(role => {
      if (role.permissions && role.permissions.length > 0) {
        const normalizedPermissions = role.permissions.map((p: any) => {
          // Normalize to have id field
          if (typeof p === 'string') {
            return { id: p };
          }
          return {
            id: p.id || p._id || p.toString(),
            ...p
          };
        });
        setRolePermissions(prev => ({ ...prev, [role.id]: normalizedPermissions }));
      }
    });
  };

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleAssignToUsers = async (permissionId: string) => {
    // Validate permissionId
    if (!permissionId || permissionId.trim() === '') {
      alert('Invalid permission ID');
      return;
    }
    
    // Check if there are any changes (users to add or remove)
    const usersToAdd = Array.from(selectedUsers).filter(userId => !initialSelectedUsers.has(userId));
    const usersToRemove = Array.from(initialSelectedUsers).filter(userId => !selectedUsers.has(userId));
    
    if (usersToAdd.length === 0 && usersToRemove.length === 0) {
      alert('No changes to apply');
      return;
    }
    
    try {
      setAssigningPermission(permissionId);
      
      // Handle users to add
      const addAssignments = usersToAdd.map(async (userId) => {
        try {
          let currentPermissionIds: string[] = [];
          
          try {
            const directPerms = await getUserDirectPermissions(userId);
            currentPermissionIds = directPerms.map(p => p.id).filter(id => id && typeof id === 'string' && id.trim() !== ''); // Filter out any undefined/null/empty IDs
          } catch (err) {
            // If we can't get current permissions, start with empty array
            console.warn(`Could not get current permissions for user ${userId}, starting with empty array:`, err);
            currentPermissionIds = [];
          }
          
          // Add this permission if not already present
          const newPermissionIds = currentPermissionIds.includes(permissionId)
            ? currentPermissionIds
            : [...currentPermissionIds, permissionId];
          
          // Validate all IDs are non-empty strings
          const validPermissionIds = newPermissionIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
          
          // Ensure the permissionId we're adding is in the array
          if (!validPermissionIds.includes(permissionId)) {
            validPermissionIds.push(permissionId);
          }
          
          // Use bulk endpoint which allows empty array and is more appropriate for setting permissions
          await bulkSetUserPermissions(userId, validPermissionIds);
        } catch (err) {
          console.error(`Failed to assign permission to user ${userId}:`, {
            error: err,
            errorMessage: err instanceof Error ? err.message : String(err),
            errorResponse: (err as any)?.response?.data,
            errorStatus: (err as any)?.response?.status,
            permissionId,
          });
          throw err;
        }
      });
      
      // Handle users to remove
      const removeAssignments = usersToRemove.map(async (userId) => {
        try {
          let currentPermissionIds: string[] = [];
          
          try {
            const directPerms = await getUserDirectPermissions(userId);
            currentPermissionIds = directPerms.map(p => p.id).filter(id => id && typeof id === 'string' && id.trim() !== ''); // Filter out any undefined/null/empty IDs
          } catch (err) {
            // If we can't get current permissions, start with empty array
            console.warn(`Could not get current permissions for user ${userId}, starting with empty array:`, err);
            currentPermissionIds = [];
          }
          
          // Remove this permission
          const newPermissionIds = currentPermissionIds.filter(id => id !== permissionId);
          
          // Validate all IDs are non-empty strings
          const validPermissionIds = newPermissionIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
          
          // Use bulk endpoint to set permissions (can be empty array)
          await bulkSetUserPermissions(userId, validPermissionIds);
        } catch (err) {
          console.error(`Failed to remove permission from user ${userId}:`, {
            error: err,
            errorMessage: err instanceof Error ? err.message : String(err),
            errorResponse: (err as any)?.response?.data,
            errorStatus: (err as any)?.response?.status,
            permissionId,
          });
          throw err;
        }
      });
      
      await Promise.all([...addAssignments, ...removeAssignments]);
      
      // Refresh user permissions data to show updated permissions
      // We need to refresh ALL users, not just the ones that were modified,
      // because other users might have had permissions changed via roles
      try {
        // Ensure we have the latest user list
        const usersResponse = await getUsers(1, 1000);
        const usersToRefresh = usersResponse.data;
        setAllUsers(usersToRefresh);
        
        // Refresh permissions for all users to ensure consistency
        const permissionChecks = usersToRefresh.map(async (user) => {
          try {
            const [effectivePerms, directPerms] = await Promise.all([
              getUserEffectivePermissions(user.id),
              getUserDirectPermissions(user.id).catch(() => []),
            ]);
            setUserPermissions(prev => ({ ...prev, [user.id]: effectivePerms }));
            setUserDirectPermissions(prev => ({ ...prev, [user.id]: directPerms }));
          } catch (err) {
            console.error(`Failed to refresh permissions for user ${user.id}:`, err);
          }
        });
        await Promise.all(permissionChecks);
      } catch (err) {
        console.error('Failed to refresh user permissions:', err);
      }
      
      setShowUserSelector(null);
      setSelectedUsers(new Set());
      setInitialSelectedUsers(new Set());
      
      // Notify UserList to refresh permission counts for affected users
      const allAffectedUserIds = [...new Set([...usersToAdd, ...usersToRemove])];
      if (allAffectedUserIds.length > 0) {
        window.dispatchEvent(new CustomEvent('permissionsChanged', {
          detail: { userIds: allAffectedUserIds }
        }));
      }
      
      // Refresh permission counts for this permission
      await loadPermissionCounts([permissions.find(p => p.id === permissionId)].filter(Boolean) as Permission[]);
      
      const addCount = usersToAdd.length;
      const removeCount = usersToRemove.length;
      let message = '';
      if (addCount > 0 && removeCount > 0) {
        message = `Permission assigned to ${addCount} user(s) and removed from ${removeCount} user(s) successfully`;
      } else if (addCount > 0) {
        message = `Permission assigned to ${addCount} user(s) successfully`;
      } else if (removeCount > 0) {
        message = `Permission removed from ${removeCount} user(s) successfully`;
      }
      alert(message);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign permission to users';
      const errorResponse = (err as any)?.response?.data;
      const errorDetails = errorResponse?.details || errorResponse?.message || errorResponse?.error;
      const errorIssues = errorResponse?.issues || [];
      
      // Build detailed error message
      let fullErrorMessage = errorMessage;
      if (errorDetails) {
        fullErrorMessage += `: ${errorDetails}`;
      }
      if (errorIssues.length > 0) {
        const issuesText = errorIssues.map((issue: any) => 
          `${issue.path?.join('.') || 'field'}: ${issue.message}`
        ).join(', ');
        fullErrorMessage += ` (${issuesText})`;
      }
      
      console.error('Error assigning permissions to users:', {
        error: err,
        errorResponse,
        errorDetails,
        errorIssues,
        permissionId,
      });
      
      alert(fullErrorMessage);
    } finally {
      setAssigningPermission(null);
    }
  };

  const handleToggleRoleSelection = (roleId: string) => {
    setSelectedRoles(prev => {
      const next = new Set(prev);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return next;
    });
  };

  const handleAssignToRoles = async (permissionId: string) => {
    try {
      setAssigningPermission(permissionId);
      
      // Get all roles that currently have this permission
      const rolesWithPermission = allRoles.filter(role => {
        const rolePerms = rolePermissions[role.id] || role.permissions || [];
        return rolePerms.some((p: any) => {
          const permId = typeof p === 'string' ? p : (p.id || p._id || p.toString());
          return permId === permissionId;
        });
      });
      
      const rolesWithPermissionIds = new Set(rolesWithPermission.map(r => r.id));
      const selectedRoleIds = new Set(selectedRoles);
      
      // Roles to add permission to: selected but don't have it
      const rolesToAdd = Array.from(selectedRoleIds).filter(roleId => !rolesWithPermissionIds.has(roleId));
      
      // Roles to remove permission from: have it but not selected
      const rolesToRemove = Array.from(rolesWithPermissionIds).filter(roleId => !selectedRoleIds.has(roleId));
      
      // Process additions
      const addAssignments = rolesToAdd.map(async (roleId) => {
        try {
          await addPermissionToRole(roleId, permissionId);
        } catch (err) {
          console.error(`Failed to add permission to role ${roleId}:`, err);
          throw err;
        }
      });
      
      // Process removals
      const removeAssignments = rolesToRemove.map(async (roleId) => {
        try {
          await removePermissionFromRole(roleId, permissionId);
        } catch (err) {
          console.error(`Failed to remove permission from role ${roleId}:`, err);
          throw err;
        }
      });
      
      // Execute all operations in parallel
      await Promise.all([...addAssignments, ...removeAssignments]);
      
      // Build success message
      const changes: string[] = [];
      if (rolesToAdd.length > 0) {
        changes.push(`added to ${rolesToAdd.length} role(s)`);
      }
      if (rolesToRemove.length > 0) {
        changes.push(`removed from ${rolesToRemove.length} role(s)`);
      }
      
      if (changes.length === 0) {
        alert('No changes made');
      } else {
        alert(`Permission ${changes.join(' and ')} successfully`);
      }
      
      // Refresh role data to show updated permissions
      try {
        const response = await getRoles(1, 1000);
        const updatedRoles = response.data;
        setAllRoles(updatedRoles);
        
        // Update role permissions state
        updatedRoles.forEach(role => {
          if (role.permissions && role.permissions.length > 0) {
            const normalizedPermissions = role.permissions.map((p: any) => {
              if (typeof p === 'string') {
                return { id: p };
              }
              return {
                id: p.id || p._id || p.toString(),
                ...p
              };
            });
            setRolePermissions(prev => ({ ...prev, [role.id]: normalizedPermissions }));
          } else {
            // Clear permissions for roles that no longer have any
            setRolePermissions(prev => {
              const next = { ...prev };
              delete next[role.id];
              return next;
            });
          }
        });
      } catch (err) {
        console.error('Failed to refresh role data:', err);
      }
      
      // Notify UserList to refresh permission counts for all users
      // (since role permission changes affect inherited permissions for all users with those roles)
      window.dispatchEvent(new CustomEvent('permissionsChanged', {
        detail: { userIds: undefined } // undefined means refresh all users
      }));
      
      // Refresh permission counts for this permission
      await loadPermissionCounts([permissions.find(p => p.id === permissionId)].filter(Boolean) as Permission[]);
      
      setShowRoleSelector(null);
      setSelectedRoles(new Set());
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to assign permission to roles');
    } finally {
      setAssigningPermission(null);
    }
  };

  if (loading && permissions.length === 0) {
    return <LoadingSpinner message="Loading permissions..." />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permissions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Permissions are hard-coded by developers. Use this panel to assign permissions to users or roles.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && <ErrorDisplay error={error} />}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search permissions by name, description, resources, or actions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Permissions Grouped by Category */}
      <div className="space-y-4">
        {Object.keys(groupedPermissions.groups).length === 0 && groupedPermissions.uncategorized.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No permissions match your search.' : 'No permissions found.'}
          </div>
        ) : (
          <>
            {/* Categorized Permissions */}
            {Object.entries(groupedPermissions.groups).map(([category, categoryPermissions]) => (
              <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                        collapsedCategories.has(category) ? '' : 'rotate-90'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{category}</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({categoryPermissions.length})</span>
                  </div>
                </button>
                {!collapsedCategories.has(category) && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Resources
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Count
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Assign
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {categoryPermissions.map((permission) => (
                          <motion.tr
                            key={permission.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {permission.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                              {permission.description}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              <div className="flex flex-wrap gap-1">
                                {permission.resources.map((resource, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs"
                                  >
                                    {resource}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              <div className="flex flex-wrap gap-1">
                                {permission.actions.map((action, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs"
                                  >
                                    {action}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex items-center justify-center space-x-1">
                                {permissionUserCounts[permission.id] !== undefined && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                    {permissionUserCounts[permission.id] || 0}
                                  </span>
                                )}
                                {permissionRoleCounts[permission.id] !== undefined && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                    {permissionRoleCounts[permission.id] || 0}
                                  </span>
                                )}
                                {permissionUserCounts[permission.id] === undefined && permissionRoleCounts[permission.id] === undefined && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">...</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleOpenUserSelector(permission.id)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                  title="Assign to users"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleOpenRoleSelector(permission.id)}
                                  className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                                  title="Assign to roles"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            {/* Uncategorized Permissions */}
            {groupedPermissions.uncategorized.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => toggleCategory('uncategorized')}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <svg
                      className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                        collapsedCategories.has('uncategorized') ? '' : 'rotate-90'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Uncategorized</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({groupedPermissions.uncategorized.length})</span>
                  </div>
                </button>
                {!collapsedCategories.has('uncategorized') && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Resources
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Count
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Assign
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {groupedPermissions.uncategorized.map((permission) => (
                          <motion.tr
                            key={permission.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {permission.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                              {permission.description}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              <div className="flex flex-wrap gap-1">
                                {permission.resources.map((resource, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs"
                                  >
                                    {resource}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              <div className="flex flex-wrap gap-1">
                                {permission.actions.map((action, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs"
                                  >
                                    {action}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                              <div className="flex items-center justify-center space-x-1">
                                {permissionUserCounts[permission.id] !== undefined && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                                    {permissionUserCounts[permission.id] || 0}
                                  </span>
                                )}
                                {permissionRoleCounts[permission.id] !== undefined && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                    {permissionRoleCounts[permission.id] || 0}
                                  </span>
                                )}
                                {permissionUserCounts[permission.id] === undefined && permissionRoleCounts[permission.id] === undefined && (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">...</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleOpenUserSelector(permission.id)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                  title="Assign to users"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleOpenRoleSelector(permission.id)}
                                  className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                                  title="Assign to roles"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* User Selector Modal */}
      {showUserSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowUserSelector(null);
          setUserSearchTerm('');
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Permission to Users</h3>
              <button
                onClick={() => {
                  setShowUserSelector(null);
                  setUserSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Search */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Selected Users Count */}
            <div className="mb-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{selectedUsers.size}</span> user(s) selected
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto">
              {loadingUsers || Object.values(loadingUserPermissions).some(loading => loading) ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="space-y-2">
                  {allUsers
                    .filter((user) => {
                      if (!userSearchTerm) return true;
                      const search = userSearchTerm.toLowerCase();
                      return (
                        (user.name || '').toLowerCase().includes(search) ||
                        user.email.toLowerCase().includes(search)
                      );
                    })
                    .map((user) => {
                      const isSelected = selectedUsers.has(user.id);
                      const userPerms = userPermissions[user.id] || [];
                      const userDirectPerms = userDirectPermissions[user.id] || [];
                      const hasDirect = userDirectPerms.some(p => p.id === showUserSelector);
                      const hasViaRole = userPerms.some(p => p.id === showUserSelector && p.source === 'role');
                      const roleName = userPerms.find(p => p.id === showUserSelector && p.source === 'role')?.roleName;
                      
                      // Checkbox should reflect selection state (for assignment), not current permission state
                      const isChecked = isSelected;
                      
                      // Determine card background color based on permission state AND selection state
                      const wasInitiallySelected = initialSelectedUsers.has(user.id);
                      const isBeingRemoved = wasInitiallySelected && !isSelected;
                      
                      let cardClassName = '';
                      if (isBeingRemoved) {
                        // User was originally selected but is now deselected - show red
                        cardClassName = 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700';
                      } else if (isSelected) {
                        // Selected items: green (selected) + existing color = new color
                        // green + purple = blue, green + green = green, green + gray = green
                        if (hasDirect && hasViaRole) {
                          // Already has both: blue
                          cardClassName = 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
                        } else if (hasDirect && !hasViaRole) {
                          // Has direct only: green
                          cardClassName = 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700';
                        } else if (!hasDirect && hasViaRole) {
                          // Has via role only: purple + green (selected) = blue
                          cardClassName = 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700';
                        } else {
                          // No permission: green (selected)
                          cardClassName = 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700';
                        }
                      } else {
                        // Not selected - show permission state
                        if (hasDirect && hasViaRole) {
                          cardClassName = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
                        } else if (hasDirect && !hasViaRole) {
                          cardClassName = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
                        } else if (!hasDirect && hasViaRole) {
                          cardClassName = 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
                        } else {
                          cardClassName = 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
                        }
                      }
                      
                      return (
                        <label
                          key={user.id}
                          className={`w-full px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 cursor-pointer border ${cardClassName} ${
                            !isSelected && !hasDirect && !hasViaRole ? 'hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleUserSelection(user.id)}
                            disabled={assigningPermission === showUserSelector}
                            className="w-5 h-5 text-green-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:ring-offset-0 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-green-600 dark:checked:border-green-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all checked:bg-green-600 checked:border-green-600"
                          />
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white font-medium">
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <div className="font-medium text-gray-900 dark:text-white truncate">{user.name || user.email}</div>
                              {hasViaRole && (
                                <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded text-xs font-medium">
                                  Via {roleName || 'Role'}
                                </span>
                              )}
                            </div>
                            {user.name && <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</div>}
                          </div>
                        </label>
                      );
                    })}
                  {allUsers.filter((user) => {
                    if (!userSearchTerm) return true;
                    const search = userSearchTerm.toLowerCase();
                    return (
                      (user.name || '').toLowerCase().includes(search) ||
                      user.email.toLowerCase().includes(search)
                    );
                  }).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {userSearchTerm ? 'No users found' : 'No users available'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowUserSelector(null);
                  setUserSearchTerm('');
                  setSelectedUsers(new Set());
                  setInitialSelectedUsers(new Set());
                }}
                disabled={assigningPermission === showUserSelector}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => showUserSelector && handleAssignToUsers(showUserSelector)}
                disabled={assigningPermission === showUserSelector || (selectedUsers.size === 0 && initialSelectedUsers.size === 0)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningPermission === showUserSelector ? 'Applying...' : (() => {
                  const usersToAdd = Array.from(selectedUsers).filter(userId => !initialSelectedUsers.has(userId)).length;
                  const usersToRemove = Array.from(initialSelectedUsers).filter(userId => !selectedUsers.has(userId)).length;
                  if (usersToAdd > 0 && usersToRemove > 0) {
                    return `Apply Changes (${usersToAdd} add, ${usersToRemove} remove)`;
                  } else if (usersToAdd > 0) {
                    return `Assign to ${usersToAdd} User(s)`;
                  } else if (usersToRemove > 0) {
                    return `Remove from ${usersToRemove} User(s)`;
                  } else {
                    return 'Apply Changes';
                  }
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Selector Modal */}
      {showRoleSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => {
          setShowRoleSelector(null);
          setRoleSearchTerm('');
        }}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Permission to Roles</h3>
              <button
                onClick={() => {
                  setShowRoleSelector(null);
                  setRoleSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Search */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search roles by name or display name..."
                value={roleSearchTerm}
                onChange={(e) => setRoleSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Selected Roles Count */}
            <div className="mb-4 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{selectedRoles.size}</span> role(s) selected
              </div>
            </div>

            {/* Role List */}
            <div className="flex-1 overflow-y-auto">
              {loadingRoles ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Group roles by their group
                    const filteredRoles = allRoles.filter((role) => {
                      if (!roleSearchTerm) return true;
                      const search = roleSearchTerm.toLowerCase();
                      return (
                        role.name.toLowerCase().includes(search) ||
                        (role.displayName || '').toLowerCase().includes(search) ||
                        (role.group?.displayName || role.group?.name || '').toLowerCase().includes(search)
                      );
                    });

                    const groupedRoles = filteredRoles.reduce((acc, role) => {
                      const groupName = role.group?.displayName || role.group?.name || 'Uncategorized';
                      if (!acc[groupName]) {
                        acc[groupName] = [];
                      }
                      acc[groupName].push(role);
                      return acc;
                    }, {} as Record<string, typeof filteredRoles>);

                    const groupNames = Object.keys(groupedRoles).sort();

                    return groupNames.map((groupName) => {
                      const rolesInGroup = groupedRoles[groupName];
                      const isCollapsed = collapsedRoleGroups.has(groupName);

                      return (
                        <div key={groupName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          <button
                            onClick={() => toggleRoleGroup(groupName)}
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <svg
                                className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-medium text-gray-900 dark:text-white">{groupName}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">({rolesInGroup.length})</span>
                            </div>
                          </button>
                          {!isCollapsed && (
                            <div className="p-2 space-y-2">
                              {rolesInGroup.map((role) => {
                      const isSelected = selectedRoles.has(role.id);
                      const rolePerms = rolePermissions[role.id] || role.permissions || [];
                      // Handle both populated permission objects and ObjectIds
                      const hasPermission = rolePerms.some((p: any) => {
                        const permId = typeof p === 'string' ? p : (p.id || p._id || p.toString());
                        return permId === showRoleSelector;
                      });
                      
                      // Checkbox should reflect selection state (for assignment)
                      const isChecked = isSelected;
                      
                      // Determine card background color based on permission state AND selection state
                      let cardClassName = '';
                      if (isSelected) {
                        // Selected items get green background (will add or keep permission)
                        cardClassName = 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700';
                      } else if (hasPermission) {
                        // Not selected but has permission - show red (will remove permission)
                        cardClassName = 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700';
                      } else {
                        // No permission and not selected
                        cardClassName = 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
                      }
                      
                                return (
                                  <label
                                    key={role.id}
                                    className={`w-full px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 cursor-pointer border ${cardClassName} ${
                                      !hasPermission ? 'hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => handleToggleRoleSelection(role.id)}
                                      disabled={assigningPermission === showRoleSelector}
                                      className="w-5 h-5 text-green-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:ring-offset-0 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-green-600 dark:checked:border-green-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition-all checked:bg-green-600 checked:border-green-600"
                                    />
                                    <div className="flex-shrink-0">
                                      <div className="w-10 h-10 rounded-full bg-purple-500 dark:bg-purple-600 flex items-center justify-center text-white font-medium">
                                        {(role.displayName || role.name).charAt(0).toUpperCase()}
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <div className="font-medium text-gray-900 dark:text-white truncate">{role.displayName || role.name}</div>
                                        {hasPermission && (
                                          <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded text-xs font-medium">
                                            Has Permission
                                          </span>
                                        )}
                                      </div>
                                      {role.displayName && <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{role.name}</div>}
                                      {role.description && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{role.description}</div>
                                      )}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                  {allRoles.filter((role) => {
                    if (!roleSearchTerm) return true;
                    const search = roleSearchTerm.toLowerCase();
                    return (
                      role.name.toLowerCase().includes(search) ||
                      (role.displayName || '').toLowerCase().includes(search) ||
                      (role.group?.displayName || role.group?.name || '').toLowerCase().includes(search)
                    );
                  }).length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {roleSearchTerm ? 'No roles found' : 'No roles available'}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowRoleSelector(null);
                  setRoleSearchTerm('');
                  setSelectedRoles(new Set());
                }}
                disabled={assigningPermission === showRoleSelector}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => showRoleSelector && handleAssignToRoles(showRoleSelector)}
                disabled={assigningPermission === showRoleSelector || selectedRoles.size === 0}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigningPermission === showRoleSelector ? 'Assigning...' : `Assign to ${selectedRoles.size} Role(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} permissions
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={!pagination.hasPrevPage}
              className={`px-4 py-2 rounded-md ${
                pagination.hasPrevPage
                  ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!pagination.hasNextPage}
              className={`px-4 py-2 rounded-md ${
                pagination.hasNextPage
                  ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

