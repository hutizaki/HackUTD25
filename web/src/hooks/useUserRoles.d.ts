import type { User } from '@/types/api';
import type { Role } from '@/lib/roles';
/**
 * Hook for checking user roles
 * Gets current user and provides role checking utilities
 */
export declare function useUserRoles(): {
    user: User | null;
    userRoles: Role[];
    hasRole: (roleName: string) => boolean;
    hasAnyRole: (roleNames: string[]) => boolean;
    loading: boolean;
};
