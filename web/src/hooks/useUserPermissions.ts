import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getUserEffectivePermissions } from '@/lib/admin';
import type { User } from '@/types/api';
import type { Permission } from '@/lib/admin';

/**
 * Hook for checking user permissions
 * Gets current user and provides permission checking utilities
 */
export function useUserPermissions() {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Array<Permission & { source: 'role' | 'direct'; roleName?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const loadUserAndPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser?.id) {
        try {
          // Pass current user ID so it uses the non-admin endpoint
          const effectivePermissions = await getUserEffectivePermissions(currentUser.id, currentUser.id);
          setPermissions(effectivePermissions);
        } catch (err) {
          // If fetching permissions fails (e.g., not in dev mode), just use empty array
          console.error('Failed to fetch user permissions:', {
            userId: currentUser.id,
            error: err,
            errorMessage: err instanceof Error ? err.message : String(err),
            errorResponse: (err as any)?.response?.data,
          });
          setPermissions([]);
        }
      }
    } catch (err) {
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserAndPermissions();
  }, [loadUserAndPermissions]);

  /**
   * Check if user has a specific permission
   * @param resource - Resource name (e.g., 'account')
   * @param action - Action name (e.g., 'write')
   * @returns boolean - True if user has permission
   */
  const hasPermission = useCallback((resource: string, action: string): boolean => {
    if (!permissions || permissions.length === 0) return false;
    return permissions.some(
      (permission) =>
        permission.resources.includes(resource) && permission.actions.includes(action)
    );
  }, [permissions]);

  /**
   * Check if user has any of the specified permissions
   * @param permissionChecks - Array of permission objects with resource and action
   * @returns boolean - True if user has at least one permission
   */
  const hasAnyPermission = (permissionChecks: Array<{ resource: string; action: string }>): boolean => {
    if (!permissions || permissions.length === 0) return false;
    return permissionChecks.some((check) => hasPermission(check.resource, check.action));
  };

  /**
   * Check if user has a specific permission by name
   * @param permissionName - Permission name (e.g., 'edit-name')
   * @returns boolean - True if user has permission
   */
  const hasPermissionByName = (permissionName: string): boolean => {
    if (!permissions || permissions.length === 0) return false;
    return permissions.some((permission) => permission.name === permissionName);
  };

  return {
    user,
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasPermissionByName,
    refresh: loadUserAndPermissions,
  };
}

