import type { PaginationData } from './admin';
export type { PaginationData };
/**
 * Permission data structure
 */
export interface Permission {
    id: string;
    name: string;
    description: string;
    resources: string[];
    actions: string[];
    createdAt: string;
    updatedAt: string;
}
/**
 * Role Group data structure
 */
export interface RoleGroup {
    id: string;
    name: string;
    displayName: string;
    description?: string;
    requiresOne: boolean;
    defaultRoleId?: string;
    defaultRole?: {
        id: string;
        name: string;
        displayName: string;
    };
    isSystemGroup: boolean;
    createdAt: string;
    updatedAt: string;
}
/**
 * Role data structure
 */
export interface Role {
    id: string;
    name: string;
    displayName: string;
    description?: string;
    permissions: Permission[];
    permissionsCount: number;
    group?: {
        id: string;
        name: string;
        displayName: string;
        isSystemGroup?: boolean;
    } | null;
    createdAt: string;
    updatedAt: string;
}
/**
 * Create role data structure
 */
export interface CreateRoleData {
    name: string;
    displayName: string;
    description?: string;
    permissions?: string[];
    group: string;
}
/**
 * Update role data structure
 */
export interface UpdateRoleData {
    displayName?: string;
    description?: string;
    permissions?: string[];
    group?: string;
}
/**
 * Roles list response
 */
export interface RolesListResponse {
    data: Role[];
    pagination: PaginationData;
}
/**
 * Role details response
 */
export interface RoleDetailsResponse {
    data: Role;
}
/**
 * User roles response
 */
export interface UserRolesResponse {
    data: Role[];
}
/**
 * Assign roles to user response
 */
export interface AssignRolesResponse {
    message: string;
    data: {
        id: string;
        email: string;
        name: string;
        roles: Role[];
    };
}
/**
 * Get all roles with pagination
 */
export declare function getRoles(page?: number, limit?: number): Promise<RolesListResponse>;
/**
 * Get role by ID
 */
export declare function getRole(id: string): Promise<RoleDetailsResponse>;
/**
 * Create new role
 */
export declare function createRole(data: CreateRoleData): Promise<RoleDetailsResponse>;
/**
 * Update role
 */
export declare function updateRole(id: string, data: UpdateRoleData): Promise<RoleDetailsResponse>;
/**
 * Delete role
 */
export declare function deleteRole(id: string): Promise<{
    message: string;
}>;
/**
 * Add permission to role
 */
export declare function addPermissionToRole(roleId: string, permissionId: string): Promise<RoleDetailsResponse>;
/**
 * Remove permission from role
 */
export declare function removePermissionFromRole(roleId: string, permissionId: string): Promise<RoleDetailsResponse>;
/**
 * Get user's roles
 */
export declare function getUserRoles(userId: string): Promise<UserRolesResponse>;
/**
 * Assign/update roles for user
 */
export declare function assignRolesToUser(userId: string, roleIds: string[]): Promise<AssignRolesResponse>;
/**
 * Add role to user
 */
export declare function addRoleToUser(userId: string, roleId: string): Promise<AssignRolesResponse>;
/**
 * Remove role from user
 */
export declare function removeRoleFromUser(userId: string, roleId: string): Promise<AssignRolesResponse>;
/**
 * Role Group interfaces
 */
export interface CreateRoleGroupData {
    name: string;
    displayName: string;
    description?: string;
    requiresOne?: boolean;
    defaultRoleId?: string;
}
export interface UpdateRoleGroupData {
    displayName?: string;
    description?: string;
    requiresOne?: boolean;
    defaultRoleId?: string;
}
export interface RoleGroupsListResponse {
    data: RoleGroup[];
}
export interface RoleGroupDetailsResponse {
    data: RoleGroup;
}
/**
 * Get all role groups
 */
export declare function getRoleGroups(): Promise<RoleGroupsListResponse>;
/**
 * Get role group by ID
 */
export declare function getRoleGroup(id: string): Promise<RoleGroupDetailsResponse>;
/**
 * Create new role group
 */
export declare function createRoleGroup(data: CreateRoleGroupData): Promise<RoleGroupDetailsResponse>;
/**
 * Update role group
 */
export declare function updateRoleGroup(id: string, data: UpdateRoleGroupData): Promise<RoleGroupDetailsResponse>;
/**
 * Delete role group
 */
export declare function deleteRoleGroup(id: string): Promise<{
    message: string;
}>;
