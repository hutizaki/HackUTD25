import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/auth';
import { getUserRoles } from '@/lib/roles';
import type { User } from '@/types/api';
import type { Role } from '@/lib/roles';

/**
 * Hook for checking user roles
 * Gets current user and provides role checking utilities
 */
export function useUserRoles() {
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserAndRoles = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // If user has roles in the response, use them
        if (currentUser && currentUser.roles) {
          setUserRoles(currentUser.roles as Role[]);
        } else if (currentUser?.id) {
          // Otherwise, fetch roles separately
          try {
            const rolesResponse = await getUserRoles(currentUser.id);
            setUserRoles(rolesResponse.data);
          } catch (err) {
            // If fetching roles fails (e.g., not in dev mode), just use empty array
            console.warn('Failed to fetch user roles:', err);
            setUserRoles([]);
          }
        }
      } catch (err) {
        setUser(null);
        setUserRoles([]);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndRoles();
  }, []);

  /**
   * Check if user has a specific role
   */
  const hasRole = (roleName: string): boolean => {
    if (!userRoles || userRoles.length === 0) return false;
    return userRoles.some((role) => role.name.toLowerCase() === roleName.toLowerCase());
  };

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roleNames: string[]): boolean => {
    if (!userRoles || userRoles.length === 0) return false;
    const normalizedRoleNames = roleNames.map((name) => name.toLowerCase());
    return userRoles.some((role) => normalizedRoleNames.includes(role.name.toLowerCase()));
  };

  return {
    user,
    userRoles,
    hasRole,
    hasAnyRole,
    loading,
  };
}

