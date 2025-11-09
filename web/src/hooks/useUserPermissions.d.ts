import type { User } from '@/types/api';
import type { Permission } from '@/lib/admin';
/**
 * Hook for checking user permissions
 * Gets current user and provides permission checking utilities
 */
export declare function useUserPermissions(): {
    user: User | null;
    permissions: (Permission & {
        source: "role" | "direct";
        roleName?: string;
    })[];
    loading: boolean;
    hasPermission: (resource: string, action: string) => boolean;
    hasAnyPermission: (permissionChecks: Array<{
        resource: string;
        action: string;
    }>) => boolean;
    hasPermissionByName: (permissionName: string) => boolean;
    refresh: () => Promise<void>;
};
